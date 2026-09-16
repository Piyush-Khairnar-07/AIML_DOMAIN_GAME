export function setupObstacles(gameState, spawnSlideCoins) {

    // ─── Spawn helpers ─────────────────────────────────────────────────────────
    function spawnGroundObstacle(tag, widthSize, heightSize, drawFn) {
        return add([
            rect(widthSize, heightSize),
            opacity(0),               // invisible rect — visual is drawn via draw()
            area(),
            pos(width(), height() - 50),
            anchor("botleft"),
            "obstacle",
            tag,
            { customDraw: drawFn, obsW: widthSize, obsH: heightSize, phase: rand(0, Math.PI * 2) }
        ]);
    }

    function spawnFloatingObstacle(tag, widthSize, heightSize, yOffset, drawFn) {
        return add([
            rect(widthSize, heightSize),
            opacity(0),
            area(),
            pos(width(), height() - 50 - yOffset),
            anchor("botleft"),
            "obstacle",
            tag,
            { customDraw: drawFn, obsW: widthSize, obsH: heightSize, phase: rand(0, Math.PI * 2) }
        ]);
    }

    function spawnFallingObstacle(tag, widthSize, heightSize, drawFn) {
        return add([
            rect(widthSize, heightSize),
            opacity(0),
            area(),
            pos(width(), -100),
            anchor("botleft"),
            "obstacle",
            "falling_obstacle",
            tag,
            // Falling speed is locked exactly to Phase 2 behavior across all phases
            // Phase 2 speed average is ~800. We remove the 7% reduction (0.93) but keep the original 10% (0.90).
            { fallSpeed: (Math.max(600, 800 * 0.9) + rand(0, 300)) * 0.90, customDraw: drawFn, obsW: widthSize, obsH: heightSize, phase: rand(0, Math.PI * 2) }
        ]);
    }

    function addLabel(parentObs, textMsg, colorRgb, yOffset = -20) {
        const labelBox = add([
            rect(textMsg.length * 11 + 20, 30, { radius: 6 }),
            color(10, 5, 20),
            opacity(0.85),
            pos(parentObs.pos.x + parentObs.width / 2, parentObs.pos.y + yOffset),
            anchor("center"),
            "obstacle_label",
            { parentObs, yOff: yOffset }
        ]);
        labelBox.add([
            text(textMsg, { size: 18, font: "monospace" }),
            color(colorRgb),
            anchor("center"),
        ]);
    }

    // ─── Custom draw functions ─────────────────────────────────────────────────
    // All draw functions receive (w, h, t, phase) where t=time(), phase=per-instance offset

    function drawNoisyData(w, h, t, ph) {
        // Corrupted red block with glitch particles
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(220, 40, 40), radius: 4 });
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(255, 60, 60), opacity: 0.5, radius: 4 });
        // Glitch offset lines
        const glitchY = Math.floor(Math.sin(t * 30 + ph) * 8);
        drawRect({ width: w * 0.7, height: 6, pos: vec2(w * 0.15, -h + glitchY + 10), color: rgb(255, 200, 0), opacity: 0.7 });
        drawRect({ width: w * 0.5, height: 4, pos: vec2(0, -h + glitchY + 20), color: rgb(0, 255, 200), opacity: 0.5 });
        drawRect({ width: w * 0.8, height: 3, pos: vec2(w * 0.1, -h + glitchY + 35), color: rgb(255, 100, 100), opacity: 0.6 });
        // Noise particles
        for (let i = 0; i < 5; i++) {
            const px = (Math.sin(t * 7 + i * 2.1 + ph) * 0.5 + 0.5) * w;
            const py = (Math.cos(t * 5 + i * 1.7 + ph) * 0.5 + 0.5) * h;
            drawCircle({ radius: 2, pos: vec2(px, -py), color: rgb(255, 255, 50), opacity: 0.8 });
        }
        // Flicker border
        drawRect({ width: w + 2, height: h + 2, pos: vec2(-1, -h - 1), color: rgb(255, 80, 80), opacity: 0.3 + Math.abs(Math.sin(t * 15 + ph)) * 0.7, radius: 5 });
    }

    function drawInsufficientData(w, h, t, ph) {
        // Sparse, mostly-empty container
        drawRect({ width: w, height: h, color: rgb(180, 60, 100), opacity: 0.3, pos: vec2(0, -h), radius: 4 });
        drawRect({ width: w, height: 3, color: rgb(255, 100, 150), pos: vec2(0, -h), opacity: 0.9 });
        drawRect({ width: w, height: 3, color: rgb(255, 100, 150), pos: vec2(0, -3), opacity: 0.9 });
        drawRect({ width: 3, height: h, color: rgb(255, 100, 150), pos: vec2(0, -h), opacity: 0.9 });
        drawRect({ width: 3, height: h, color: rgb(255, 100, 150), pos: vec2(w - 3, -h), opacity: 0.9 });
        // Sparse dots inside — some blinking to show "missing"
        const dotPositions = [[0.2, 0.3], [0.7, 0.5], [0.4, 0.75]];
        for (let i = 0; i < dotPositions.length; i++) {
            const [dx, dy] = dotPositions[i];
            const visible = Math.sin(t * 3 + i * 1.8 + ph) > -0.3;
            if (visible) {
                drawCircle({ radius: 4, pos: vec2(dx * w, -(dy * h)), color: rgb(255, 150, 200), opacity: 0.9 });
            }
        }
        // Warning pulse ring
        const pulse = Math.abs(Math.sin(t * 2 + ph));
        drawRect({ width: w + 4, height: h + 4, pos: vec2(-2, -h - 2), color: rgb(255, 100, 150), opacity: pulse * 0.4, radius: 6 });
    }

    function drawComputeBlock(w, h, t, ph) {
        // GPU block — dark purple with processing grid
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(70, 30, 180), radius: 6 });
        // Internal grid lines
        const cols = 3, rows = 3;
        for (let c = 1; c < cols; c++) {
            drawRect({ width: 2, height: h - 8, pos: vec2(c * w / cols - 1, -h + 4), color: rgb(120, 80, 255), opacity: 0.5 });
        }
        for (let r = 1; r < rows; r++) {
            drawRect({ width: w - 8, height: 2, pos: vec2(4, -(r * h / rows + 1)), color: rgb(120, 80, 255), opacity: 0.5 });
        }
        // Processing dots
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const active = Math.sin(t * 6 + (c + r * cols) * 0.8 + ph) > 0;
                const cx = (c + 0.5) * w / cols;
                const cy = -((r + 0.5) * h / rows);
                drawCircle({ radius: 4, pos: vec2(cx, cy), color: active ? rgb(0, 255, 200) : rgb(50, 20, 120), opacity: active ? 0.9 : 0.4 });
            }
        }
        // Glow border
        drawRect({ width: w + 2, height: h + 2, pos: vec2(-1, -h - 1), color: rgb(100, 60, 255), opacity: 0.3 + Math.sin(t * 4 + ph) * 0.2, radius: 7 });
    }

    function drawOverfitting(w, h, t, ph) {
        // Tall sliding obstacle — a pulsing constrictive wall
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(200, 100, 0), opacity: 0.85, radius: 4 });
        // Data curve wrapping too tight — overlapping arcs on the face
        for (let i = 0; i < 5; i++) {
            const yo = -((i + 0.5) * h / 5);
            const xo = Math.sin(t * 4 + i * 0.8 + ph) * 8;
            drawRect({ width: w - 10 + xo, height: 6, pos: vec2(5 - xo / 2, yo), color: rgb(255, 200, 50), opacity: 0.6 });
        }
        // Unstable pulse glow
        const pulse = 0.2 + Math.abs(Math.sin(t * 5 + ph)) * 0.5;
        drawRect({ width: w + 4, height: h + 4, pos: vec2(-2, -h - 2), color: rgb(255, 150, 0), opacity: pulse, radius: 5 });
        // Label strip at bottom
        drawRect({ width: w, height: 12, pos: vec2(0, -12), color: rgb(255, 120, 0), opacity: 0.9 });
    }

    function drawBiasedDataset(w, h, t, ph) {
        // Full-height falling wall — dark purple, uneven data clusters
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(150, 30, 150), opacity: 0.8, radius: 4 });
        // Heavy cluster on one side (left)
        for (let i = 0; i < 8; i++) {
            const cx = 10 + Math.sin(i * 1.2 + ph) * 12;
            const cy = -((i + 0.5) * h * 0.1 + 20);
            drawCircle({ radius: 5, pos: vec2(cx, cy), color: rgb(255, 100, 255), opacity: 0.8 });
        }
        // Sparse side (right)
        for (let i = 0; i < 3; i++) {
            const cx = w - 15 + Math.sin(i * 0.9 + t * 2 + ph) * 4;
            const cy = -((i + 1) * h * 0.25 + 10);
            drawCircle({ radius: 4, pos: vec2(cx, cy), color: rgb(200, 80, 200), opacity: 0.5 });
        }
        // Drift animation — shift line
        const shiftX = Math.sin(t * 2 + ph) * 5;
        drawRect({ width: w * 0.6, height: 2, pos: vec2(w * 0.2 + shiftX, -h / 2), color: rgb(255, 200, 255), opacity: 0.6 });
    }

    function drawTrainingLoop(w, h, t, ph) {
        // Falling block with looping arrow animation
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(30, 180, 30), opacity: 0.85, radius: 6 });
        // Circular arrow paths — animate angle
        const a = t * 3 + ph;
        const cx = w / 2, cy = -h / 2;
        const r = Math.min(w, h) * 0.35;
        for (let i = 0; i < 6; i++) {
            const angle = a + (i / 6) * Math.PI * 2;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            drawCircle({ radius: 3, pos: vec2(px, py), color: rgb(100, 255, 100), opacity: 0.7 });
        }
        // Data packet moving along the orbit
        const px2 = cx + Math.cos(a) * r;
        const py2 = cy + Math.sin(a) * r;
        drawCircle({ radius: 5, pos: vec2(px2, py2), color: rgb(255, 255, 100), opacity: 0.9 });
    }

    function drawUnderfitting(w, h, t, ph) {
        // Too-simple model — plain grey block with a very flat line through it
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(110, 110, 110), radius: 4 });
        // Overly simple line (just one straight line across everything)
        drawRect({ width: w, height: 4, pos: vec2(0, -h / 2 - 2), color: rgb(200, 200, 200), opacity: 0.8 });
        // Warning pulse
        const p = Math.abs(Math.sin(t * 2.5 + ph));
        drawRect({ width: w + 4, height: h + 4, pos: vec2(-2, -h - 2), color: rgb(180, 180, 180), opacity: p * 0.3, radius: 5 });
    }

    function drawMissingFeatures(w, h, t, ph) {
        // Falling block — incomplete node graph
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(180, 180, 0), opacity: 0.8, radius: 6 });
        // Node positions — some blink "missing"
        const nodes = [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75], [0.5, 0.5]];
        const filled = [true, false, true, false, true];
        for (let i = 0; i < nodes.length; i++) {
            const [nx, ny] = nodes[i];
            const visible = filled[i] || Math.sin(t * 4 + i * 1.5 + ph) > 0.2;
            const col = filled[i] ? rgb(255, 255, 50) : rgb(255, 100, 0);
            if (visible) {
                drawCircle({ radius: 5, pos: vec2(nx * w, -(ny * h)), color: col, opacity: 0.9 });
            }
        }
        // Disconnected lines — dashed effect
        const dash = Math.floor(t * 4 + ph) % 2 === 0;
        if (dash) {
            drawRect({ width: w * 0.4, height: 2, pos: vec2(w * 0.2, -(h * 0.25)), color: rgb(255, 255, 0), opacity: 0.5 });
        }
    }

    function drawDataDrift(w, h, t, ph) {
        // Tall sliding obstacle — moving/drifting particles
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(30, 150, 200), opacity: 0.8, radius: 4 });
        // Original cluster (left, static-ish)
        for (let i = 0; i < 5; i++) {
            drawCircle({ radius: 3, pos: vec2(15, -((i + 0.5) * h * 0.18 + 10)), color: rgb(100, 230, 255), opacity: 0.7 });
        }
        // Drifted cluster (right, moving over time)
        const drift = Math.sin(t * 1.5 + ph) * 20;
        for (let i = 0; i < 5; i++) {
            drawCircle({ radius: 3, pos: vec2(60 + drift, -((i + 0.5) * h * 0.18 + 10)), color: rgb(255, 200, 50), opacity: 0.7 });
        }
        // Drift arrow
        drawRect({ width: 20 + Math.abs(drift), height: 2, pos: vec2(20, -h / 2), color: rgb(255, 255, 200), opacity: 0.5 });
    }

    function drawInferenceBottleneck(w, h, t, ph) {
        // Full-height falling wall — red, packets queuing up
        drawRect({ width: w, height: h, pos: vec2(0, -h), color: rgb(200, 30, 70), opacity: 0.85, radius: 4 });
        // Bottleneck visual — many packets trying to go through a narrow gap
        const bottleY = -h * 0.5;
        drawRect({ width: w * 0.3, height: 8, pos: vec2(w * 0.35, bottleY), color: rgb(255, 100, 130), opacity: 0.9 });
        // Packets queuing
        for (let i = 0; i < 6; i++) {
            const pOffset = Math.sin(t * 5 + i * 0.9 + ph) * 3;
            drawRect({ width: 12, height: 8, pos: vec2(4 + i * 16, bottleY - 18 + pOffset), color: rgb(255, 150, 180), opacity: 0.8, radius: 2 });
        }
        // Pulse on bottleneck
        const pp = Math.abs(Math.sin(t * 4 + ph));
        drawRect({ width: w * 0.3 + 4, height: 12, pos: vec2(w * 0.35 - 2, bottleY - 2), color: rgb(255, 50, 100), opacity: pp * 0.6, radius: 3 });
    }

    // ─── Spawn functions ───────────────────────────────────────────────────────
    function spawnNoisyData() {
        const obs = spawnGroundObstacle("noisy_data", 40, 70, drawNoisyData);
        addLabel(obs, "NOISY DATA", rgb(255, 100, 100), -80);
    }

    function spawnOverfittingTrap() {
        const obs = spawnFloatingObstacle("overfitting", 80, 300, 50, drawOverfitting);
        addLabel(obs, "OVERFITTING", rgb(255, 200, 100), -50);
        if (spawnSlideCoins) spawnSlideCoins(width(), 80);
    }

    function spawnInsufficientData() {
        const obs = spawnGroundObstacle("insufficient", 50, 60, drawInsufficientData);
        addLabel(obs, "INSUFFICIENT DATA", rgb(255, 150, 200), -70);
    }

    function spawnComputeBlock() {
        const obs = spawnGroundObstacle("compute_block", 60, 80, drawComputeBlock);
        addLabel(obs, "GPU BLOCK", rgb(150, 100, 255), -90);
    }

    function spawnBiasedDataset() {
        const obs = spawnFallingObstacle("bias", 100, 720, drawBiasedDataset);
        addLabel(obs, "BIASED DATASET", rgb(250, 100, 250), 0);
    }

    function spawnTrainingLoop() {
        const obs = spawnFallingObstacle("training_loop", 80, 80, drawTrainingLoop);
        addLabel(obs, "TRAINING LOOP", rgb(100, 255, 100), 0);
    }

    function spawnUnderfittingWall() {
        const obs = spawnGroundObstacle("underfitting", 80, 65, drawUnderfitting);
        addLabel(obs, "UNDERFITTING", rgb(200, 200, 200), -75);
    }

    function spawnMissingFeatures() {
        const obs = spawnFallingObstacle("missing_features", 70, 70, drawMissingFeatures);
        addLabel(obs, "MISSING FEATURES", rgb(255, 255, 150), 0);
    }

    function spawnDataDrift() {
        const obs = spawnFloatingObstacle("data_drift", 100, 300, 50, drawDataDrift);
        addLabel(obs, "DATA DRIFT", rgb(100, 255, 255), -50);
        if (spawnSlideCoins) spawnSlideCoins(width(), 100);
    }

    function spawnInferenceBottleneck() {
        const obs = spawnFallingObstacle("inference_bottle", 120, 720, drawInferenceBottleneck);
        addLabel(obs, "INFERENCE BOTTLENECK", rgb(255, 100, 150), 0);
    }

    // ─── Zone-aware obstacle pools ─────────────────────────────────────────────
    // Each zone has a different obstacle pool matching the narrative of that zone.
    // Zone 4 uses a hand-authored curated sequence for fairness.

    // ZONE 1 (0–15s) — DATA PIPELINE: easy, jump/slide/dodge obstacles
    const zone1Pool = [
        spawnNoisyData,         // JUMP (Ground)
        spawnInsufficientData,  // JUMP (Ground)
        spawnMissingFeatures,   // LEFT/RIGHT
        spawnComputeBlock,      // JUMP (Ground)
        spawnDataDrift,         // SLIDE
        // Heavily weight ground obstacles
        spawnNoisyData,         
        spawnNoisyData,         
        spawnInsufficientData,  
        spawnInsufficientData,  
        spawnComputeBlock,      
        spawnComputeBlock,      
    ];

    // ZONE 2 (15–35s) — MODEL TRAINING: medium, adds bias/overfitting/underfitting
    const zone2Pool = [
        spawnBiasedDataset,     // LEFT/RIGHT (falling)
        spawnTrainingLoop,      // LEFT/RIGHT (falling)
        spawnUnderfittingWall,  // JUMP (Ground)
        spawnOverfittingTrap,   // SLIDE
        spawnNoisyData,         // JUMP (Ground)
        spawnComputeBlock,      // JUMP (Ground)
        spawnMissingFeatures,   // LEFT/RIGHT
        spawnInsufficientData,  // JUMP (Ground)
        // Add more ground weights
        spawnUnderfittingWall,
        spawnUnderfittingWall,
        spawnNoisyData,
        spawnComputeBlock,
        spawnInsufficientData,
        spawnInsufficientData,
        spawnBiasedDataset,     // weight bias higher in training zone
        spawnOverfittingTrap,   // weight overfitting higher
    ];

    // ZONE 3 (35–55s) — DEPLOYMENT: hard, adds inference/drift
    const zone3Pool = [
        spawnDataDrift,         // SLIDE
        spawnInferenceBottleneck, // LEFT/RIGHT
        spawnOverfittingTrap,   // SLIDE
        spawnMissingFeatures,   // LEFT/RIGHT
        spawnBiasedDataset,     // LEFT/RIGHT
        spawnComputeBlock,      // JUMP (Ground)
        spawnTrainingLoop,      // LEFT/RIGHT
        spawnUnderfittingWall,  // JUMP (Ground)
        spawnNoisyData,         // JUMP (Ground)
        // Add more ground weights
        spawnComputeBlock,
        spawnComputeBlock,
        spawnUnderfittingWall,
        spawnUnderfittingWall,
        spawnNoisyData,
        spawnInsufficientData,
        spawnDataDrift,         // weight drift higher (deployment = real-world)
        spawnInferenceBottleneck, // weight bottleneck
    ];

    // ZONE 4 (55–70s) — FINAL/MAX: curated sequences, all 10 obstacle types
    // Each entry: { fn, delay } where delay is minimum seconds before next spawn.
    // Sequences are hand-authored for fairness — always have a clear safe path.
    let zone4Index = 0;
    const zone4Sequence = [
        // 0.0s - Opening burst (Simultaneous Ground + Falling)
        { fn: () => { spawnNoisyData(); spawnBiasedDataset(); }, delay: 0.75 },
        { fn: () => { spawnComputeBlock(); spawnMissingFeatures(); }, delay: 0.75 },
        { fn: () => { spawnUnderfittingWall(); spawnTrainingLoop(); }, delay: 0.75 },
        
        // 2.25s - Slide combos
        { fn: () => { spawnOverfittingTrap(); spawnMissingFeatures(); }, delay: 0.8 },
        { fn: () => { spawnDataDrift(); spawnBiasedDataset(); }, delay: 0.8 },
        
        // 3.85s - Spaced rapid-fire
        { fn: spawnInsufficientData, delay: 0.75 },
        { fn: () => { spawnTrainingLoop(); wait(0.35, spawnDataDrift); }, delay: 1.1 },
        { fn: () => { spawnNoisyData(); spawnBiasedDataset(); }, delay: 0.75 },
        
        // 6.45s - Wall and mixed jumps
        { fn: spawnInferenceBottleneck, delay: 1.1 }, 
        { fn: () => { spawnUnderfittingWall(); spawnMissingFeatures(); }, delay: 0.75 },
        { fn: () => { spawnComputeBlock(); spawnBiasedDataset(); }, delay: 0.75 },
        { fn: () => { spawnDataDrift(); wait(0.4, spawnInsufficientData); }, delay: 1.1 },
        
        // 10.15s - Intense layered combos
        { fn: () => { spawnOverfittingTrap(); wait(0.4, spawnNoisyData); }, delay: 1.1 },
        { fn: () => { spawnBiasedDataset(); spawnUnderfittingWall(); }, delay: 0.75 },
        { fn: () => { spawnMissingFeatures(); spawnComputeBlock(); }, delay: 0.75 },
        { fn: () => { spawnDataDrift(); spawnTrainingLoop(); }, delay: 0.75 },
        
        // 13.5s - Final bottleneck
        { fn: spawnInferenceBottleneck, delay: 1.1 },
        { fn: () => { spawnInsufficientData(); spawnBiasedDataset(); }, delay: 0.65 },
        
        // 15.25s - Safe gap before portal
        { fn: () => { /* safe gap */ }, delay: 4.0 },
    ];

    function spawnObstacle() {
        const t = gameState.timeAlive;

        // ZONE 4: use hand-authored curated sequence
        if (gameState.difficulty === "MAX") {
            if (zone4Index < zone4Sequence.length) {
                const step = zone4Sequence[zone4Index];
                zone4Index++;
                step.fn();
                return step.delay;
            } else {
                return 5.0; // safe gap after sequence ends, portal approaches
            }
        }

        let pool;
        if      (t < 15) pool = zone1Pool;
        else if (t < 35) pool = zone2Pool;
        else             pool = zone3Pool;

        choose(pool)();
        return null; // use auto-calculated timer from main.js
    }

    // ─── Update loops ──────────────────────────────────────────────────────────
    // Drives custom draw each frame via the obs.customDraw function
    onUpdate("obstacle", (obs) => {
        obs.move(-gameState.speed, 0);
        if (obs.pos.x < -300) destroy(obs);
    });

    onUpdate("falling_obstacle", (obs) => {
        if (obs.pos.y < height() - 50) {
            obs.pos.y += obs.fallSpeed * dt();
            if (obs.pos.y > height() - 50) obs.pos.y = height() - 50;
        }
    });

    onUpdate("obstacle_label", (lbl) => {
        if (lbl.parentObs && lbl.parentObs.exists()) {
            lbl.pos.x = lbl.parentObs.pos.x + lbl.parentObs.width / 2;
            lbl.pos.y = lbl.parentObs.is("falling_obstacle")
                ? lbl.parentObs.pos.y - 40
                : lbl.parentObs.pos.y + lbl.yOff;
        } else {
            destroy(lbl);
        }
    });

    // Custom draw dispatcher
    onDraw("obstacle", (obs) => {
        if (obs.customDraw) {
            obs.customDraw(obs.obsW, obs.obsH, time(), obs.phase || 0);
        }
    });

    // ── Obstacle educational info database ─────────────────────────────────────
    const obstacleInfoMap = {
        "noisy_data":       { type: "noisy_data",       term: "NOISY DATA",           desc: "Data containing unwanted errors or random variations." },
        "overfitting":      { type: "overfitting",      term: "OVERFITTING",          desc: "A model learns training data too closely and performs poorly on new data." },
        "insufficient":     { type: "insufficient",     term: "INSUFFICIENT DATA",    desc: "Too little training data can prevent a model from learning useful patterns." },
        "compute_block":    { type: "compute_block",    term: "COMPUTE / GPU BLOCK",  desc: "Machine-learning training can require significant computational resources." },
        "bias":             { type: "bias",             term: "BIASED DATASET",       desc: "Biased data can cause a model to produce unfair or inaccurate results." },
        "training_loop":    { type: "training_loop",   term: "TRAINING LOOP",        desc: "The repeated process of training a model and improving its parameters." },
        "underfitting":     { type: "underfitting",    term: "UNDERFITTING WALL",    desc: "A model is too simple to learn important patterns from the data." },
        "missing_features": { type: "missing_features",term: "MISSING FEATURES",     desc: "Important input information is unavailable to the model." },
        "data_drift":       { type: "data_drift",      term: "DATA DRIFT",           desc: "Real-world input data changes over time, which can reduce model accuracy." },
        "inference_bottle": { type: "inference_bottle",term: "INFERENCE BOTTLENECK", desc: "When a trained model takes too long to produce predictions." },
    };

    // Returns { type, term, desc } for the obstacle, or null if unknown
    function getObstacleInfo(obstacle) {
        for (const tag in obstacleInfoMap) {
            if (obstacle.is && obstacle.is(tag)) return obstacleInfoMap[tag];
        }
        return null;
    }

    // Legacy compat
    function getEducationalMessage(obstacle) {
        const info = getObstacleInfo(obstacle);
        return info ? `${info.term} — ${info.desc}` : "AI/ML OBSTACLE — Avoid hazards to maintain model health!";
    }

    return { spawnObstacle, getObstacleInfo, getEducationalMessage };
}
