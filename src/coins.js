export function setupCoins(gameState) {
    
    function isPositionSafe(x, y, pattern = null) {
        const obstacles = get("obstacle");
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        // If the coin moves, calculate its full sweeping bounding box
        if (pattern && pattern.type === "bob") {
            minY = y - pattern.amp;
            maxY = y + pattern.amp;
        }

        for (const obs of obstacles) {
            const padding = 80;
            const obsLeft = obs.pos.x - padding;
            const obsRight = obs.pos.x + obs.width + padding;
            const obsTop = obs.pos.y - obs.height - padding;
            const obsBottom = obs.pos.y + padding;

            if (maxX >= obsLeft && minX <= obsRight && maxY >= obsTop && minY <= obsBottom) {
                return false; // Collision detected in movement range
            }
        }
        return true;
    }

    function createCoin(x, y, force = false, pattern = null) {
        // If a pattern is requested but the movement range is unsafe, fallback to static
        if (!force && pattern) {
            if (!isPositionSafe(x, y, pattern)) {
                pattern = null;
            }
        }

        // Final safety check for static position
        if (!force && !isPositionSafe(x, y)) return;

        add([
            circle(12),
            color(255, 215, 0), // Gold
            area(),
            pos(x, y),
            anchor("center"),
            "coin",
            {
                baseY: y,
                pattern: pattern,
                phaseOffset: x * 0.02, // Creates a nice wave effect for lines of coins
                draw() {
                    drawCircle({
                        radius: 14,
                        color: rgb(255, 255, 0),
                        opacity: 0.5,
                        pos: vec2(0, 0),
                    });
                    drawCircle({
                        radius: 12,
                        color: rgb(255, 215, 0),
                        pos: vec2(0, 0),
                    });
                }
            }
        ]);
    }

    function getDifficultyPattern() {
        const diff = gameState.difficulty;
        let moveChance = 0;
        
        if (diff === "LEARNING") moveChance = 0;
        else if (diff === "MEDIUM") moveChance = 0.50;
        else if (diff === "HARD") moveChance = 0.70;
        else if (diff === "MAX") moveChance = 0.80;

        if (chance(moveChance)) {
            // Clearly visible amplitude and frequency
            return { type: "bob", amp: rand(50, 80), freq: rand(2, 3) };
        }
        return null;
    }

    function spawnLowMedHigh() {
        const startY = height() - 70;
        const pat = getDifficultyPattern();
        createCoin(width(), startY, false, pat);
        createCoin(width() + 60, startY - 80, false, pat);
        createCoin(width() + 120, startY - 160, false, pat);
    }

    function spawnMedLowMed() {
        const startY = height() - 150;
        const pat = getDifficultyPattern();
        createCoin(width(), startY, false, pat);
        createCoin(width() + 60, startY + 80, false, pat); // down to ground
        createCoin(width() + 120, startY, false, pat);
    }

    function spawnStaggeredHeights() {
        const ground = height() - 70;
        const pat = getDifficultyPattern();
        createCoin(width(), ground, false, pat);
        createCoin(width() + 80, ground - 120, false, pat);
        createCoin(width() + 160, ground, false, pat);
        createCoin(width() + 240, ground - 120, false, pat);
    }

    function spawnShortAscending() {
        const ground = height() - 70;
        const pat = getDifficultyPattern();
        createCoin(width(), ground, false, pat);
        createCoin(width() + 60, ground - 60, false, pat);
        createCoin(width() + 120, ground - 120, false, pat);
        createCoin(width() + 180, ground - 180, false, pat);
    }

    function spawnCoins() {
        const r = randi(0, 4);
        if (r === 0) spawnLowMedHigh();
        else if (r === 1) spawnMedLowMed();
        else if (r === 2) spawnStaggeredHeights();
        else spawnShortAscending();
    }

    function spawnSlideCoins(xPos, obsWidth) {
        // Slide coins explicitly bypass patterns and stay static
        const ground = height() - 70;
        const count = Math.floor(obsWidth / 40) + 1;
        for (let i = 0; i < count; i++) {
            createCoin(xPos + i * 40, ground, true, null);
        }
    }

    // Move coins
    onUpdate("coin", (c) => {
        // 1. Local deterministic movement
        if (c.pattern && c.pattern.type === "bob") {
            c.pos.y = c.baseY + Math.sin(time() * c.pattern.freq + c.phaseOffset) * c.pattern.amp;
        }

        // 2. World movement
        c.move(-gameState.speed, 0);

        if (c.pos.x < -50) {
            destroy(c);
        }
    });

    return { spawnCoins, spawnSlideCoins };
}
