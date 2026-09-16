export function setupMessages() {
    let currentMsgObj = null;

    // ── Educational pause card (used for FIRST-TIME obstacle hit) ─────────────
    // Pauses the game for ~3-4 seconds, then resumes automatically.
    function showEducationalPause(termName, termDesc, onResume) {
        // Pause the kaplay engine
        getTreeRoot().paused = true;

        // We still need to draw the card even while paused.
        // Use a DOM overlay so it renders independently of the game loop.
        const existing = document.getElementById('edu-pause-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'edu-pause-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            pointer-events: none;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: linear-gradient(135deg, #0a0320 0%, #100840 100%);
            border: 2px solid #c040ff;
            border-radius: 16px;
            padding: 32px 48px;
            max-width: 600px;
            text-align: center;
            box-shadow: 0 0 40px rgba(192, 64, 255, 0.5), 0 0 80px rgba(80, 0, 200, 0.3);
            animation: eduFadeIn 0.3s ease;
            font-family: monospace;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes eduFadeIn {
                from { opacity: 0; transform: scale(0.85); }
                to   { opacity: 1; transform: scale(1); }
            }
            @keyframes eduPulse {
                0%,100% { box-shadow: 0 0 40px rgba(192,64,255,0.5); }
                50%      { box-shadow: 0 0 60px rgba(192,64,255,0.8); }
            }
        `;
        document.head.appendChild(style);

        const icon = document.createElement('div');
        icon.style.cssText = 'font-size: 36px; margin-bottom: 12px; color: #ff5050;';
        icon.textContent = '⚠ OBSTACLE HIT';

        const name = document.createElement('div');
        name.style.cssText = 'font-size: 32px; font-weight: bold; color: #ff8080; margin-bottom: 16px; letter-spacing: 2px;';
        name.textContent = termName;

        const desc = document.createElement('div');
        desc.style.cssText = 'font-size: 20px; color: #d0d0ff; line-height: 1.5; margin-bottom: 24px;';
        desc.textContent = '"' + termDesc + '"';

        const timer = document.createElement('div');
        timer.style.cssText = 'font-size: 14px; color: #8080c0; letter-spacing: 1px;';
        timer.textContent = 'RESUMING IN 3...';

        card.appendChild(icon);
        card.appendChild(name);
        card.appendChild(desc);
        card.appendChild(timer);
        overlay.appendChild(card);
        document.body.appendChild(overlay);

        let remaining = 3;
        const tick = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                timer.textContent = `RESUMING IN ${remaining}...`;
            } else {
                clearInterval(tick);
                overlay.remove();
                style.remove();
                // Resume the game
                getTreeRoot().paused = false;
                if (onResume) onResume();
            }
        }, 1000);
    }

    function showEducationalMessage(textMsg, subText = "") {
        if (currentMsgObj && currentMsgObj.exists()) destroy(currentMsgObj);

        currentMsgObj = add([
            rect(820, subText ? 110 : 82, { radius: 12 }),
            color(15, 6, 38),
            opacity(0),
            pos(width() / 2, 95),
            anchor("center"),
            fixed(),
            z(200),
            "edu_message",
            { targetOpacity: 0.92, animating: true }
        ]);

        // Border glow ring
        currentMsgObj.add([
            rect(824, subText ? 114 : 86, { radius: 13 }),
            color(255, 80, 80),
            opacity(0.35),
            pos(0, 0),
            anchor("center"),
        ]);

        currentMsgObj.add([
            text(textMsg, { size: 26, font: "monospace", width: 780, align: "center" }),
            color(255, 100, 100),
            pos(0, subText ? -18 : 0),
            anchor("center"),
        ]);

        if (subText) {
            currentMsgObj.add([
                text(subText, { size: 18, font: "monospace", width: 780, align: "center" }),
                color(210, 210, 210),
                pos(0, 22),
                anchor("center"),
            ]);
        }

        // Slide in from above
        currentMsgObj.pos.y = 55;
        currentMsgObj.onUpdate(() => {
            if (currentMsgObj.animating) {
                currentMsgObj.opacity = Math.min(currentMsgObj.opacity + dt() * 5, 0.92);
                currentMsgObj.pos.y += (115 - currentMsgObj.pos.y) * dt() * 12;
                if (Math.abs(currentMsgObj.pos.y - 115) < 1) {
                    currentMsgObj.pos.y = 115;
                    currentMsgObj.animating = false;
                }
            }
        });

        wait(2.8, () => {
            if (currentMsgObj && currentMsgObj.exists()) {
                destroy(currentMsgObj);
                currentMsgObj = null;
            }
        });
    }

    function showCheckpointMessage(title, subText) {
        if (currentMsgObj && currentMsgObj.exists()) destroy(currentMsgObj);

        currentMsgObj = add([
            rect(860, 130, { radius: 14 }),
            color(8, 35, 18),
            opacity(0),
            pos(width() / 2, 55),
            anchor("center"),
            fixed(),
            z(200),
            "cp_message",
            { animating: true }
        ]);

        // Green border glow
        currentMsgObj.add([
            rect(864, 134, { radius: 15 }),
            color(50, 255, 100),
            opacity(0.3),
            pos(0, 0),
            anchor("center"),
        ]);

        currentMsgObj.add([
            text("✓  CHECKPOINT REACHED!", { size: 22, font: "monospace" }),
            color(50, 255, 100),
            pos(0, -34),
            anchor("center"),
        ]);

        currentMsgObj.add([
            text(title, { size: 30, font: "monospace" }),
            color(200, 255, 200),
            pos(0, 0),
            anchor("center"),
        ]);

        if (subText) {
            currentMsgObj.add([
                text(subText, { size: 16, font: "monospace" }),
                color(120, 220, 140),
                pos(0, 36),
                anchor("center"),
            ]);
        }

        currentMsgObj.onUpdate(() => {
            if (currentMsgObj.animating) {
                currentMsgObj.opacity = Math.min(currentMsgObj.opacity + dt() * 5, 0.92);
                currentMsgObj.pos.y += (125 - currentMsgObj.pos.y) * dt() * 12;
                if (Math.abs(currentMsgObj.pos.y - 125) < 1) {
                    currentMsgObj.pos.y = 125;
                    currentMsgObj.animating = false;
                }
            }
        });

        wait(3.2, () => {
            if (currentMsgObj && currentMsgObj.exists()) {
                destroy(currentMsgObj);
                currentMsgObj = null;
            }
        });
    }

    function showPopup(msg, colorRgb) {
        const popup = add([
            text(msg, { size: 26, font: "monospace" }),
            color(colorRgb),
            opacity(1),
            pos(width() / 2, 190),
            anchor("center"),
            fixed(),
            z(201),
            { vy: -80, life: 1.2 }
        ]);

        // subtle glow ring under the text
        popup.onUpdate(() => {
            popup.life -= dt();
            popup.pos.y += popup.vy * dt();
            popup.vy *= 0.95; // decelerate
            popup.opacity = Math.max(0, popup.life / 1.2);
            if (popup.opacity <= 0) destroy(popup);
        });
    }

    function showZoneAnnouncement(zoneName, zoneColor) {
        const banner = add([
            rect(500, 70, { radius: 10 }),
            color(10, 5, 30),
            opacity(0),
            pos(width() / 2, height() / 2),
            anchor("center"),
            fixed(),
            z(300),
            { life: 2.5 }
        ]);
        banner.add([
            text(zoneName, { size: 32, font: "monospace" }),
            color(zoneColor[0], zoneColor[1], zoneColor[2]),
            anchor("center"),
        ]);
        banner.onUpdate(() => {
            banner.life -= dt();
            if (banner.life > 2.0) {
                banner.opacity = Math.min(banner.opacity + dt() * 4, 0.9);
            } else {
                banner.opacity = Math.max(0, banner.opacity - dt() * 2);
            }
            if (banner.opacity <= 0 && banner.life <= 0) destroy(banner);
        });
    }

    return { showEducationalMessage, showEducationalPause, showCheckpointMessage, showPopup, showZoneAnnouncement };
}
