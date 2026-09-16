export function setupSpecialLoot(gameState) {
    const terminology = [
        "FEATURE ENGINEERING",
        "EPOCH",
        "INFERENCE",
        "TENSOR",
        "GPU",
        "VALIDATION SET",
        "TENSORFLOW",
        "TFLITE"
    ];

    function isPositionSafe(x, y, pattern = null) {
        const obstacles = get("obstacle");
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;

        if (pattern && pattern.type === "bob") {
            minY = y - pattern.amp;
            maxY = y + pattern.amp;
        }

        for (const obs of obstacles) {
            const padding = 100; // Larger padding for special loot
            const obsLeft = obs.pos.x - padding;
            const obsRight = obs.pos.x + obs.width + padding;
            const obsTop = obs.pos.y - obs.height - padding;
            const obsBottom = obs.pos.y + padding;

            if (maxX >= obsLeft && minX <= obsRight && maxY >= obsTop && minY <= obsBottom) {
                return false;
            }
        }
        return true;
    }

    function getDifficultyPattern() {
        const diff = gameState.difficulty;
        let moveChance = 0;
        
        if (diff === "LEARNING") moveChance = 0;
        else if (diff === "MEDIUM") moveChance = 0.30;
        else if (diff === "HARD") moveChance = 0.60;
        else if (diff === "MAX") moveChance = 0.75;

        if (chance(moveChance)) {
            return { type: "bob", amp: rand(40, 70), freq: rand(1.5, 2.5) };
        }
        return null;
    }

    function spawnSpecialLoot() {
        const x = width() + 50;
        const isHigh = chance(0.5);
        const y = isHigh ? height() - 150 : height() - 50;
        
        let pattern = getDifficultyPattern();
        
        // Fallback to static if the requested pattern overlaps an obstacle
        if (pattern) {
            if (!isPositionSafe(x, y, pattern)) {
                pattern = null;
            }
        }

        // Final safety check for static position
        if (!isPositionSafe(x, y)) return;

        const term = choose(terminology);

        const loot = add([
            polygon([vec2(0, -25), vec2(25, 0), vec2(0, 25), vec2(-25, 0)]), // Diamond shape
            color(0, 255, 255), // Cyan glowing
            area(),
            pos(x, y),
            anchor("center"),
            "special_loot",
            {
                term: term,
                baseY: y,
                pattern: pattern,
                phaseOffset: rand(0, Math.PI * 2),
                draw() {
                    drawPolygon({
                        pts: [vec2(0, -30), vec2(30, 0), vec2(0, 30), vec2(-30, 0)],
                        color: rgb(0, 200, 255),
                        opacity: 0.4 + Math.sin(time() * 5) * 0.2,
                        pos: vec2(0, 0)
                    });
                    drawPolygon({
                        pts: [vec2(0, -25), vec2(25, 0), vec2(0, 25), vec2(-25, 0)],
                        color: rgb(0, 255, 255),
                        pos: vec2(0, 0)
                    });
                }
            }
        ]);

        loot.add([
            text(term, { size: 14, font: "monospace" }),
            color(255, 255, 255),
            pos(0, -35),
            anchor("center")
        ]);
    }

    function spawnRecoveryCore() {
        const x = width() + 50;
        const y = height() - 120; // Needs a jump usually

        if (!isPositionSafe(x, y)) return;

        add([
            rect(30, 30, { radius: 15 }), // Base hitbox
            opacity(0), // Hide the base pink ball
            area(),
            pos(x, y),
            anchor("center"),
            "recovery_core",
            {
                draw() {
                    const t = time();
                    const pulse = 1 + Math.sin(t * 4) * 0.15;
                    const glowCol = rgb(255, 50, 100);
                    const coreCol = rgb(255, 100, 150);
                    
                    // 8-point heart shape
                    const hPts = [
                        vec2(0, -6), vec2(12, -16), vec2(22, -8),
                        vec2(22, 6), vec2(0, 26), vec2(-22, 6),
                        vec2(-22, -8), vec2(-12, -16)
                    ];
                    
                    pushTransform();
                    // Offset slightly up because the points dip down
                    pushTranslate(0, -5);
                    pushScale(pulse, pulse);
                    
                    // Glow
                    drawPolygon({
                        pts: hPts,
                        color: glowCol,
                        opacity: 0.5 + Math.sin(t * 4) * 0.3,
                        pos: vec2(0, 0)
                    });
                    
                    // Inner core
                    pushTransform();
                    pushScale(0.7, 0.7);
                    drawPolygon({
                        pts: hPts,
                        color: coreCol,
                        opacity: 1,
                        pos: vec2(0, 0)
                    });
                    popTransform();
                    
                    popTransform();
                }
            }
        ]);
    }

    onUpdate("special_loot", (l) => {
        if (l.pattern && l.pattern.type === "bob") {
            l.pos.y = l.baseY + Math.sin(time() * l.pattern.freq + l.phaseOffset) * l.pattern.amp;
        }
        l.move(-gameState.speed, 0);
        if (l.pos.x < -100) destroy(l);
    });

    onUpdate("recovery_core", (c) => {
        c.move(-gameState.speed, 0);
        if (c.pos.x < -100) destroy(c);
    });

    return { spawnSpecialLoot, spawnRecoveryCore };
}
