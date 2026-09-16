export function setupEnvironment() {

    // =============================================
    // FAR BACKGROUND — Deep space / AI void
    // =============================================
    add([
        rect(width(), height()),
        pos(0, 0),
        color(8, 4, 22),
        z(-20),
    ]);

    // Animated star field
    for (let i = 0; i < 60; i++) {
        const sx = rand(0, width());
        const sy = rand(0, height() * 0.75);
        const sr = rand(1, 2.5);
        const starBase = { x: sx, y: sy, r: sr, twinkle: rand(0, Math.PI * 2), speed: rand(0.2, 0.5) };
        const star = add([
            circle(sr),
            pos(sx, sy),
            color(180, 180, 255),
            opacity(rand(0.4, 0.9)),
            z(-19),
            starBase,
        ]);
        star.onUpdate(() => {
            star.twinkle += dt() * star.speed * 3;
            star.opacity = 0.3 + Math.abs(Math.sin(star.twinkle)) * 0.6;
        });
    }

    // Far horizon neural-network grid (perspective lines)
    for (let i = 0; i < 12; i++) {
        const lx = (i / 11) * width();
        add([
            rect(1, height() * 0.6),
            pos(lx, height() * 0.1),
            color(50, 20, 120),
            opacity(0.18),
            z(-18),
            { baseX: lx },
        ]);
    }
    for (let i = 0; i < 7; i++) {
        const ly = height() * 0.1 + (i / 6) * height() * 0.5;
        add([
            rect(width(), 1),
            pos(0, ly),
            color(50, 20, 120),
            opacity(0.18),
            z(-18),
        ]);
    }

    // =============================================
    // DISTANT LAYER — Glowing AI City Skyline (slowest parallax)
    // =============================================
    const cityBuildings = [];
    const buildingColors = [
        [15, 8, 45],
        [20, 10, 55],
        [12, 6, 38],
        [18, 9, 50],
    ];
    for (let i = 0; i < 10; i++) {
        const bw = rand(60, 130);
        const bh = rand(100, 320);
        const bx = i * 150 + rand(-20, 20);
        const col = choose(buildingColors);
        const b = add([
            rect(bw, bh),
            pos(bx, height() - 50),
            color(col[0], col[1], col[2]),
            anchor("bot"),
            z(-8),
            "bg_building",
            { baseX: bx, speed: 18 }
        ]);

        // Glowing windows on buildings
        const windowRows = Math.floor(bh / 30);
        for (let wr = 1; wr <= windowRows; wr++) {
            if (chance(0.6)) {
                const wx = bx + rand(8, bw - 16);
                const wy = height() - 50 - wr * 28;
                const winCol = choose([[0, 200, 255], [200, 100, 255], [0, 255, 150], [255, 200, 50]]);
                add([
                    rect(10, 14),
                    pos(wx, wy),
                    color(winCol[0], winCol[1], winCol[2]),
                    opacity(rand(0.4, 0.9)),
                    z(-7),
                    "bg_building",
                    { baseX: wx, speed: 18, isWindow: true, twinkle: rand(0, Math.PI * 2) }
                ]);
            }
        }

        cityBuildings.push(b);
    }

    // =============================================
    // MID LAYER — AI Infrastructure Structures
    // =============================================
    const structures = [
        // Satellite/antenna tower
        { w: 10, h: 180, col: [60, 20, 150] },
        // Server stack
        { w: 80, h: 140, col: [25, 12, 70] },
        // GPU cluster
        { w: 120, h: 100, col: [30, 15, 80] },
        // Data terminal
        { w: 50, h: 160, col: [20, 50, 100] },
    ];
    for (let i = 0; i < 5; i++) {
        const s = choose(structures);
        const sx = i * 320 + rand(0, 80);
        const midStruct = add([
            rect(s.w, s.h),
            pos(sx, height() - 50),
            color(s.col[0], s.col[1], s.col[2]),
            anchor("bot"),
            z(-5),
            "mg_structure",
            { baseX: sx, speed: 80 }
        ]);

        // Neon accent line on mid structures
        add([
            rect(s.w, 3),
            pos(sx, height() - 50 - s.h),
            anchor("botleft"),
            color(0, 200, 255),
            opacity(0.7),
            z(-4),
            "mg_structure",
            { baseX: sx, speed: 80 }
        ]);
    }

    // Data stream particles — ambient moving dots
    for (let i = 0; i < 20; i++) {
        const dsx = rand(0, width());
        const dsy = rand(height() * 0.1, height() * 0.7);
        const dsSpeed = rand(60, 180);
        const dsCol = choose([[0, 255, 150], [0, 150, 255], [255, 50, 200], [255, 230, 0]]);
        add([
            circle(rand(2, 4)),
            pos(dsx, dsy),
            color(dsCol[0], dsCol[1], dsCol[2]),
            opacity(rand(0.3, 0.8)),
            z(-6),
            "data_stream",
            { speed: dsSpeed, baseY: dsy, waveOff: rand(0, Math.PI * 2) }
        ]);
    }

    // =============================================
    // FOREGROUND LAYER — Neon wiring & platform edges
    // =============================================
    for (let i = 0; i < 12; i++) {
        const wx = i * 140 + rand(-20, 20);
        add([
            rect(rand(30, 80), rand(4, 8)),
            pos(wx, height() - 55),
            color(0, 255, 150),
            opacity(rand(0.4, 0.9)),
            z(-2),
            "fg_wire",
            { baseX: wx, speed: 300, twinkle: rand(0, Math.PI * 2) }
        ]);
    }

    // =============================================
    // GROUND
    // =============================================
    add([
        rect(width() * 3, 50),
        pos(0, height()),
        anchor("botleft"),
        color(30, 8, 65),
        area(),
        body({ isStatic: true }),
        z(10),
    ]);

    // Ground top glowing strip
    add([
        rect(width() * 3, 3),
        pos(0, height() - 50),
        anchor("botleft"),
        color(180, 50, 255),
        opacity(0.9),
        z(11),
    ]);

    // Ground secondary shimmer strip
    add([
        rect(width() * 3, 1),
        pos(0, height() - 48),
        anchor("botleft"),
        color(255, 100, 255),
        opacity(0.4),
        z(11),
    ]);

    // =============================================
    // PARALLAX UPDATES
    // =============================================
    onUpdate("bg_building", (b) => {
        b.pos.x -= b.speed * dt();
        if (b.pos.x < -(b.width || 130) - 20) {
            b.pos.x = width() + rand(0, 100);
            b.baseX = b.pos.x;
        }
        if (b.isWindow) {
            b.twinkle += dt() * rand(0.5, 1.5);
            b.opacity = 0.3 + Math.abs(Math.sin(b.twinkle)) * 0.6;
        }
    });

    onUpdate("mg_structure", (s) => {
        s.pos.x -= s.speed * dt();
        if (s.pos.x < -(s.width || 120) - 20) {
            s.pos.x = width() + rand(0, 150);
            s.baseX = s.pos.x;
        }
    });

    onUpdate("data_stream", (d) => {
        d.pos.x -= d.speed * dt();
        d.waveOff += dt() * 2;
        d.pos.y = d.baseY + Math.sin(d.waveOff) * 20;
        d.opacity = 0.3 + Math.abs(Math.sin(d.waveOff * 0.5)) * 0.5;
        if (d.pos.x < -10) d.pos.x = width() + rand(0, 50);
    });

    onUpdate("fg_wire", (w) => {
        w.pos.x -= w.speed * dt();
        if (w.pos.x < -100) {
            w.pos.x = width() + rand(0, 60);
            w.baseX = w.pos.x;
        }
        w.twinkle += dt() * 3;
        w.opacity = 0.3 + Math.abs(Math.sin(w.twinkle)) * 0.6;
    });
}
