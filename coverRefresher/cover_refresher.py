import json
import sys
import urllib.request
import urllib.error
import base64

# Read input from Stash
input_data = json.loads(sys.stdin.read())
mode = input_data.get("args", {}).get("mode", "refresh_covers")

STASH_GRAPHQL = "http://localhost:9999/graphql"

def run_graphql(url, query, variables=None, api_key=None):
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    
    headers = {'Content-Type': 'application/json'}
    if api_key:
        headers['Api-Key'] = api_key
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {"error": str(e)}

def get_stashdb_api_key():
    query = """
    query {
        configuration {
            general {
                stashBoxes {
                    endpoint
                    api_key
                }
            }
        }
    }
    """
    result = run_graphql(STASH_GRAPHQL, query)
    try:
        for box in result["data"]["configuration"]["general"]["stashBoxes"]:
            if "stashdb" in box["endpoint"].lower():
                return box["api_key"]
    except:
        pass
    return None

def get_scene_stash_id(scene):
    if "stash_ids" in scene:
        for stash_id in scene["stash_ids"]:
            endpoint = stash_id.get("endpoint", "").lower()
            if "stashdb" in endpoint or "stashdb.org" in endpoint:
                return stash_id["stash_id"]
    return None

def get_scene_cover_from_stashdb(scene_id, api_key):
    query = """
    query FindScene($id: ID!) {
        findScene(id: $id) {
            images {
                url
            }
        }
    }
    """
    result = run_graphql("https://stashdb.org/graphql", query, {"id": scene_id}, api_key)
    try:
        return result["data"]["findScene"]["images"][0]["url"]
    except:
        return None

def download_image(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Stash-Cover-Refresher'})
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.read()
    except Exception as e:
        return None

def update_scene_cover(scene_id, image_url):
    img_data = download_image(image_url)
    if not img_data:
        return False
    
    img_base64 = base64.b64encode(img_data).decode('utf-8')
    
    mutation = """
    mutation UpdateSceneCover($input: SceneUpdateInput!) {
        sceneUpdate(input: $input) {
            id
        }
    }
    """
    variables = {
        "input": {
            "id": scene_id,
            "cover_image": img_base64
        }
    }
    
    result = run_graphql(STASH_GRAPHQL, mutation, variables)
    return "errors" not in result

def refresh_covers():
    results = {"total": 0, "updated": 0, "failed": 0, "skipped": 0, "details": []}
    
    print("Getting StashDB API key...", file=sys.stderr)
    api_key = get_stashdb_api_key()
    if not api_key:
        results["details"].append("ERROR: No StashDB API key found")
        results["details"].append("Please configure StashDB in Settings -> Metadata -> StashBoxes")
        return results
    
    print("Querying all scenes (including organized)...", file=sys.stderr)
    
    # Query ALL scenes - no filter on organized status
    query = """
    query FindScenes($filter: FindFilterType) {
        findScenes(filter: $filter) {
            scenes {
                id
                title
                stash_ids {
                    endpoint
                    stash_id
                }
            }
        }
    }
    """
    
    result = run_graphql(STASH_GRAPHQL, query)
    if "error" in result:
        results["details"].append(f"ERROR: {result['error']}")
        return results
    
    scenes = result.get("data", {}).get("findScenes", {}).get("scenes", [])
    results["total"] = len(scenes)
    
    print(f"Found {results['total']} total scenes", file=sys.stderr)
    
    for i, scene in enumerate(scenes):
        scene_id = scene["id"]
        scene_title = scene.get("title", "Untitled")
        
        # Get StashDB ID
        stashdb_id = get_scene_stash_id(scene)
        if not stashdb_id:
            results["skipped"] += 1
            results["details"].append(f"SKIP: {scene_title} - No StashDB ID")
            continue
        
        # Get cover URL from StashDB
        cover_url = get_scene_cover_from_stashdb(stashdb_id, api_key)
        if not cover_url:
            results["failed"] += 1
            results["details"].append(f"FAIL: {scene_title} - No cover found on StashDB")
            continue
        
        # Update scene cover
        if update_scene_cover(scene_id, cover_url):
            results["updated"] += 1
            results["details"].append(f"UPDATED: {scene_title}")
        else:
            results["failed"] += 1
            results["details"].append(f"FAIL: {scene_title} - Update failed")
        
        # Progress update every 10 scenes
        if (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{results['total']}", file=sys.stderr)
    
    return results

if mode == "refresh_covers":
    output = refresh_covers()
else:
    output = {"error": f"Unknown mode: {mode}"}

print(json.dumps(output))