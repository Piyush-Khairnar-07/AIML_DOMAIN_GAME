export function setupCheckpoints(messages) {
    const checkpoints = [
        {
            time: 15,
            id: 1,
            title: "DATA PIPELINE",
            subText: "COLLECT → CLEAN → PREPARE → TRAIN",
            reached: false
        },
        {
            time: 35,
            id: 2,
            title: "MODEL TRAINING ZONE",
            subText: "DATA → TRAINING → VALIDATION → MODEL",
            reached: false
        },
        {
            time: 55,
            id: 3,
            title: "DEPLOYMENT ZONE",
            subText: "MODEL → INFERENCE → PREDICTION",
            reached: false
        }
    ];

    let latestCheckpoint = null;

    function updateCheckpoints(timeAlive) {
        let newlyReached = null;
        for (const cp of checkpoints) {
            if (!cp.reached && timeAlive >= cp.time) {
                cp.reached = true;
                latestCheckpoint = cp;
                messages.showCheckpointMessage(`CHECKPOINT ${cp.id}`, cp.title + "\n" + cp.subText);
                newlyReached = cp;
            }
        }
        return newlyReached;
    }

    function getLatestCheckpoint() {
        return latestCheckpoint;
    }

    function respawnPlayer(gameState, player, ui) {
        if (!latestCheckpoint) return false;

        // Restore 3 hearts in FINAL/MAX (maxLives=5), 2 hearts otherwise
        gameState.lives = (gameState.maxLives >= 5) ? 3 : 2;
        // Rollback time
        gameState.timeAlive = latestCheckpoint.time;
        // Wipe unbanked scores to prevent exploit
        gameState.segmentScore = 0;
        gameState.segmentCoins = 0;
        
        // Reset odometer so they can re-earn score for the segment portion they just lost
        gameState.maxSegmentX = player.pos.x;
        
        ui.update();

        // Show banner again on respawn
        messages.showCheckpointMessage(`CHECKPOINT ${latestCheckpoint.id}`, latestCheckpoint.title);

        // Clear hazards on screen to prevent instant death upon respawn
        const obstacles = get("obstacle");
        for (const o of obstacles) destroy(o);
        const labels = get("obstacle_label");
        for (const l of labels) destroy(l);

        // Respawn protection (invulnerability)
        player.isHit = true; 
        player.isRespawning = true;
        player.opacity = 0.5;
        
        let blinkCount = 0;
        const blinkInterval = loop(0.1, () => {
            player.opacity = player.opacity === 1 ? 0.5 : 1;
            blinkCount++;
            if (blinkCount > 20) { // 2 seconds total
                blinkInterval.cancel();
                player.opacity = 1;
                player.isHit = false;
                player.isRespawning = false;
            }
        });

        messages.showPopup("RESPAWNED AT CHECKPOINT", rgb(50, 255, 100));

        return true;
    }

    return { updateCheckpoints, getLatestCheckpoint, respawnPlayer };
}
