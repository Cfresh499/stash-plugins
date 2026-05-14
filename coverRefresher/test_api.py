import json
import sys
import urllib.request

print("Testing StashDB connection...", file=sys.stderr)

# Try a simple public query (no API key needed)
query = """
query {
    findScene(id: "a3e9f8e9-8b3a-4b9a-9b3a-4b9a9b3a4b9a") {
        id
        title
    }
}
"""

url = "https://stashdb.org/graphql"
data = json.dumps({"query": query}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req, timeout=10) as response:
        result = response.read().decode()
        print(f"Response: {result}", file=sys.stderr)
        print(json.dumps({"success": True, "result": result}))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    print(json.dumps({"success": False, "error": str(e)}))