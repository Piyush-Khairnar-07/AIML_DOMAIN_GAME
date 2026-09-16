export function setupUI(gameState) {

    // ── Score ───────────────────────────────────────
    const scoreText = add([
        text("SCORE: 0", { size: 22, font: "monospace" }),
        pos(20, 18),
        color(255, 255, 255),
        fixed(),
        z(100),
    ]);

    // ── Coins ───────────────────────────────────────
    const coinsText = add([
        text("⬡ 0", { size: 22, font: "monospace" }),
        pos(20, 46),
        color(255, 215, 0),
        fixed(),
        z(100),
    ]);

    // ── Timer ───────────────────────────────────────
    const timeText = add([
        text("TIME: 0s", { size: 20, font: "monospace" }),
        pos(20, 74),
        color(160, 160, 200),
        fixed(),
        z(100),
    ]);

    // ── Domain Label (centered top) ─────────────────
    add([
        text("◈  AI / ML  ◈", { size: 22, font: "monospace" }),
        pos(width() / 2, 18),
        anchor("top"),
        color(80, 190, 255),
        fixed(),
        z(100),
    ]);

    // ── Difficulty ──────────────────────────────────
    const difficultyText = add([
        text("LEARNING", { size: 18, font: "monospace" }),
        pos(width() / 2, 46),
        anchor("top"),
        color(255, 220, 50),
        fixed(),
        z(100),
    ]);

    // ── Zone/Phase label ────────────────────────────
    const phaseText = add([
        text("DATA PIPELINE", { size: 15, font: "monospace" }),
        pos(width() / 2, 70),
        anchor("top"),
        color(120, 220, 140),
        fixed(),
        z(100),
    ]);

    // ── Hearts (top-right) ──────────────────────────
    const heartsContainer = add([
        fixed(),
        z(100),
    ]);

    let heartSymbols = [];

    function rebuildHearts() {
        for (const h of heartSymbols) if (h.exists()) destroy(h);
        heartSymbols = [];

        const maxLives = gameState.maxLives || 3;
        const lives = gameState.lives;

        for (let i = 0; i < maxLives; i++) {
            const filled = i < lives;
            const hx = width() - 24 - (maxLives - 1 - i) * 28;
            const sym = add([
                text(filled ? "♥" : "♡", { size: 24, font: "monospace" }),
                pos(hx, 18),
                anchor("topright"),
                color(filled ? rgb(255, 60, 100) : rgb(80, 30, 40)),
                opacity(filled ? 1 : 0.5),
                fixed(),
                z(101),
            ]);
            heartSymbols.push(sym);
        }
    }

    rebuildHearts();

    // ── Boss HP Bar (hidden until boss phase) ───────
    let bossBarBg = null;
    let bossBarFill = null;
    let bossBarLabel = null;
    let bossHPShown = false;

    function showBossHP(maxHP) {
        if (bossHPShown) return;
        bossHPShown = true;

        bossBarBg = add([
            rect(500, 24, { radius: 4 }),
            pos(width() / 2, height() - 40),
            anchor("center"),
            color(30, 10, 60),
            opacity(0.85),
            fixed(),
            z(150),
        ]);
        bossBarFill = add([
            rect(496, 20, { radius: 3 }),
            pos(width() / 2 - 248, height() - 40 - 10),
            color(255, 40, 80),
            opacity(0.9),
            fixed(),
            z(151),
            { maxHP, currentHP: maxHP }
        ]);
        bossBarLabel = add([
            text("TECHNICAL DEBT", { size: 16, font: "monospace" }),
            pos(width() / 2, height() - 68),
            anchor("center"),
            color(255, 100, 130),
            fixed(),
            z(152),
        ]);
    }

    function updateBossHP(hp, maxHP) {
        if (!bossBarFill || !bossBarFill.exists()) return;
        const ratio = Math.max(0, hp / maxHP);
        bossBarFill.width = Math.max(0, 496 * ratio);
        // Color shift: green → yellow → red
        if (ratio > 0.5) {
            bossBarFill.color = lerp(rgb(255, 200, 0), rgb(100, 255, 80), (ratio - 0.5) * 2);
        } else {
            bossBarFill.color = lerp(rgb(255, 40, 80), rgb(255, 200, 0), ratio * 2);
        }
    }

    function hideBossHP() {
        if (bossBarBg && bossBarBg.exists()) destroy(bossBarBg);
        if (bossBarFill && bossBarFill.exists()) destroy(bossBarFill);
        if (bossBarLabel && bossBarLabel.exists()) destroy(bossBarLabel);
        bossHPShown = false;
    }

    // ── Update Loop ─────────────────────────────────
    let lastLives = gameState.lives;
    let lastMaxLives = gameState.maxLives || 3;

    function update() {
        const totalScore = gameState.bankedScore + gameState.segmentScore;
        const totalCoins = gameState.bankedCoins + gameState.segmentCoins;
        const maxLives = gameState.maxLives || 3;

        scoreText.text = `SCORE: ${Math.floor(totalScore)}`;
        coinsText.text = `⬡ ${totalCoins}`;
        timeText.text  = `TIME: ${Math.floor(gameState.timeAlive)}s`;

        // Difficulty badge color
        const diffColors = {
            LEARNING: rgb(100, 220, 100),
            MEDIUM:   rgb(255, 200, 50),
            HARD:     rgb(255, 120, 50),
            MAX:      rgb(255, 50,  80),
            BOSS:     rgb(255, 0,   100),
        };
        difficultyText.text  = gameState.difficulty;
        difficultyText.color = diffColors[gameState.difficulty] || rgb(255, 255, 255);

        if (gameState.currentPhaseName) {
            phaseText.text = gameState.currentPhaseName;
        }

        // Rebuild hearts if capacity or count changed
        if (gameState.lives !== lastLives || maxLives !== lastMaxLives) {
            rebuildHearts();
            lastLives    = gameState.lives;
            lastMaxLives = maxLives;
        }
    }

    return { update, showBossHP, updateBossHP, hideBossHP };
}

// ── Mobile Controls ────────────────────────────────────────────────────────────
export function setupMobileControls(player) {
    const btnSize = 80;
    const pad     = 20;
    const bottomY = height() - btnSize - pad;

    function makeBtn(label, bx, by, col) {
        const btn = add([
            rect(btnSize, btnSize, { radius: 12 }),
            pos(bx, by),
            color(col[0], col[1], col[2]),
            opacity(0.5),
            area(),
            fixed(),
            z(100),
            "ui_btn",
        ]);
        add([
            text(label, { size: 36, font: "monospace" }),
            pos(bx + btnSize / 2, by + btnSize / 2),
            anchor("center"),
            color(255, 255, 255),
            fixed(),
            z(101),
        ]);
        return btn;
    }

    const leftBtn  = makeBtn("←", pad,                         bottomY, [40, 40, 140]);
    const rightBtn = makeBtn("→", pad * 2 + btnSize,           bottomY, [40, 40, 140]);
    const jumpBtn  = makeBtn("↑", width() - pad * 2 - btnSize * 2, bottomY, [40, 130, 40]);
    const slideBtn = makeBtn("↓", width() - pad - btnSize,     bottomY, [130, 120, 30]);

    let slidingByTouch = false;

    onUpdate(() => {
        if (isMouseDown()) {
            const mp = mousePos();

            leftBtn.opacity  = leftBtn.hasPoint(mp)  ? 0.85 : 0.5;
            rightBtn.opacity = rightBtn.hasPoint(mp) ? 0.85 : 0.5;
            slideBtn.opacity = slideBtn.hasPoint(mp) ? 0.85 : 0.5;

            if (leftBtn.hasPoint(mp))  player.moveLeft();
            if (rightBtn.hasPoint(mp)) player.moveRight();

            if (slideBtn.hasPoint(mp)) {
                if (!slidingByTouch) { slidingByTouch = true; player.setSlideInput(true); }
            } else if (slidingByTouch) {
                slidingByTouch = false;
                player.setSlideInput(false);
            }
        } else {
            leftBtn.opacity = rightBtn.opacity = slideBtn.opacity = 0.5;
            if (slidingByTouch) { slidingByTouch = false; player.setSlideInput(false); }
        }
    });

    onClick("jump_btn", () => {
        player.doJump();
        jumpBtn.opacity = 0.9;
        wait(0.12, () => jumpBtn.opacity = 0.5);
    });

    // Expose a method to add a Shoot button (called during boss phase by main.js)
    function addShootButton(onShoot) {
        const shootBtn = add([
            rect(btnSize, btnSize, { radius: 12 }),
            pos(width() - pad - btnSize, bottomY - btnSize - pad),
            color(180, 30, 30),
            opacity(0.6),
            area(),
            fixed(),
            z(100),
            "ui_btn",
            "shoot_btn",
        ]);
        add([
            text("⚡", { size: 36, font: "monospace" }),
            pos(width() - pad - btnSize + btnSize / 2, bottomY - btnSize - pad + btnSize / 2),
            anchor("center"),
            color(255, 255, 255),
            fixed(),
            z(101),
        ]);
        onClick("shoot_btn", () => {
            onShoot();
            shootBtn.opacity = 0.9;
            wait(0.1, () => shootBtn.opacity = 0.6);
        });
        return shootBtn;
    }

    return { addShootButton };
}
