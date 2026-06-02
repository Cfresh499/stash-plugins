(function() {
    var hook = input.args.hookContext;
    
    // Check if this is a Scene.Create.Post hook
    if (hook.type !== "Scene.Create.Post") {
        return { Output: "Hook not applicable" };
    }
    
    log.Info("Scene created: " + hook.id);
    log.Progress(0.1);
    
    // Check if auto-tagging is enabled
    var enableAutoTag = input.args.enableAutoTag;
    if (!enableAutoTag) {
        log.Info("Auto-tagging disabled");
        return { Output: "Auto-tagging disabled" };
    }
    
    var tagId = input.args.defaultTagId;
    if (!tagId || tagId === "") {
        log.Error("No default tag ID configured");
        return { error: "No default tag ID configured" };
    }
    
    log.Progress(0.3);
    
    // Update scene with tag
    var mutation = `mutation sceneUpdate($input: SceneUpdateInput!) {
      sceneUpdate(input: $input) { id title }
    }`;
    
    try {
        log.Info("Applying tag " + tagId + " to scene " + hook.id);
        var result = gql.Do(mutation, {
            input: {
                id: hook.id,
                tag_ids: [tagId]
            }
        });
        
        log.Progress(0.9);
        log.Info("Successfully tagged scene: " + hook.id);
        log.Progress(1.0);
        
        return { 
            Output: "Scene tagged successfully",
            data: result
        };
    } catch (e) {
        log.Error("Failed to tag scene: " + e);
        return { error: "Failed to tag scene: " + e };
    }
})();
