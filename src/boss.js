// ─── Boss: THE OVERFITTING MODEL ──────────────────────────────────────────────
// Fully self-contained boss encounter.
// Called from main.js when timeAlive >= 75.
// Returns { update, isActive, isDefeated, playerShoot }

export function setupBoss(gameState, player, effects, messages, ui) {

    const BOSS_MAX_HP    = 10;
    const HITS_PER_HP    = 2;       // 2 bullet hits = 1 HP lost
    const SHOOT_COOLDOWN = 0.35;    // seconds between player shots
    const BOSS_X         = width() * 0.72;
    const BOSS_Y         = height() - 50;

    let bossHP           = BOSS_MAX_HP;
    let bossHitCount     = 0;       // running tally toward next HP loss
    let bossDefeated     = false;
    let bossActive       = true;
    let defeatTimer      = 0;
    let shootCooldown    = 0;
    let gunUnlocked      = false;
    let portalSpawned    = false;
    let phase            = 0;       // 0=intro, 1=fight, 2=defeated

    // Attack state
    let attackTimer      = 0;
    let attackPattern    = 0;

    // Player bullets
    let playerBullets    = [];

    // Boss attack projectiles
    let bossProjectiles  = [];

    // ── Boss visual entity (procedurally drawn) ────────────────────────────────
    const bossEntity = add([
        rect(160, 200),
        pos(BOSS_X, BOSS_Y),
        anchor("botleft"),
        opacity(0),         // invisible hitbox rect — all visual via draw()
        z(20),
        "boss_body",
        { bossPhase: 0, introSlide: 0 }
    ]);

    // Entrance: slide in from right
    bossEntity.pos.x = width() + 200;
    bossEntity.onUpdate(() => {
        if (phase === 0) {
            bossEntity.pos.x += (BOSS_X - bossEntity.pos.x) * dt() * 4;
            if (Math.abs(bossEntity.pos.x - BOSS_X) < 5) {
                bossEntity.pos.x = BOSS_X;
                phase = 1;
                gunUnlocked = true;
                messages.showPopup("WEAPON SYSTEM ONLINE", rgb(255, 200, 0));
                ui.showBossHP(BOSS_MAX_HP);
            }
        }
    });

    // Boss draw
    const bossDrawer = add([
        pos(BOSS_X, BOSS_Y),
        z(21),
        {
            draw() {
                const t = time();
                const bx = bossEntity.pos.x;
                const by = bossEntity.pos.y;
                const w  = 160;
                const h  = 200;

                const hpRatio = bossHP / BOSS_MAX_HP;
                const isLowHP = hpRatio <= 0.3;
                const instability = isLowHP ? (0.5 + Math.sin(t * 20) * 0.5) : 0;
                
                // Determine attack state (arms up, core glowing brighter)
                const isAttacking = phase === 1 && attackTimer > getAttackInterval() - 0.4;
                const isDefeated = phase === 2 || bossDefeated;

                drawBossRobot(bx, by, w, h, t, hpRatio, instability, isAttacking, isDefeated, bossHitCount > 0);
            }
        }
    ]);
    bossDrawer.onUpdate(() => {
        bossDrawer.pos.x = bossEntity.pos.x;
        bossDrawer.pos.y = bossEntity.pos.y;
    });

    function drawBossRobot(bx, by, w, h, t, hpRatio, instability, isAttacking, isDefeated, recentHit) {
        const isLow = hpRatio <= 0.3;
        const isMid = hpRatio <= 0.6;
        const shake = (instability || recentHit) ? (Math.random() * 6 - 3) : 0;
        const cx = bx + w / 2 + shake;
        const cy = by - h / 2 + shake;
        
        if (isDefeated) return; // Hidden or drawn as smoking wreckage (handled by particles in defeat)

        // Colors
        const metalDark = rgb(40, 45, 60);
        const metalLight = rgb(90, 100, 120);
        const coreCol = isLow ? rgb(255, 30, 30) : isMid ? rgb(255, 120, 0) : rgb(0, 200, 255);
        const accentCol = isLow ? rgb(200, 0, 0) : rgb(0, 150, 200);

        // Hover bobbing
        const hoverY = Math.sin(t * 2) * 10;
        const baseY = cy + hoverY;

        // ── Data Shard Orbit ──
        for (let i = 0; i < 3; i++) {
            const angle = t * 2 + (i / 3) * Math.PI * 2;
            const px = cx + Math.cos(angle) * 90;
            const py = baseY + Math.sin(angle) * 40;
            drawPolygon({
                pts: [vec2(px, py-10), vec2(px+6, py+5), vec2(px-6, py+5)],
                color: coreCol,
                opacity: 0.6 + Math.sin(t*5)*0.2
            });
        }

        // ── Arms ──
        const armSwing = isAttacking ? Math.sin(t * 15) * 20 : Math.sin(t * 1.5) * 5;
        const armLift = isAttacking ? -40 : 0;
        
        // Left Arm (background)
        drawRect({ width: 30, height: 80, pos: vec2(cx - 70 + armSwing, baseY - 30 + armLift), color: metalDark, radius: 10 });
        drawCircle({ radius: 15, pos: vec2(cx - 55 + armSwing, baseY + 50 + armLift), color: coreCol, opacity: 0.8 });
        
        // Right Arm (foreground)
        drawRect({ width: 30, height: 80, pos: vec2(cx + 40 - armSwing, baseY - 30 + armLift), color: metalLight, radius: 10 });
        drawCircle({ radius: 15, pos: vec2(cx + 55 - armSwing, baseY + 50 + armLift), color: coreCol, opacity: 0.8 });

        // ── Torso ──
        // Broad shoulders tapering down
        drawPolygon({
            pts: [
                vec2(cx - 50, baseY - 60),
                vec2(cx + 50, baseY - 60),
                vec2(cx + 35, baseY + 40),
                vec2(cx - 35, baseY + 40)
            ],
            color: metalDark
        });
        drawPolygon({
            pts: [
                vec2(cx - 40, baseY - 50),
                vec2(cx + 40, baseY - 50),
                vec2(cx + 25, baseY + 30),
                vec2(cx - 25, baseY + 30)
            ],
            color: metalLight
        });

        // Armor plating accents
        drawLine({ p1: vec2(cx - 30, baseY - 20), p2: vec2(cx + 30, baseY - 20), width: 4, color: accentCol, opacity: 0.8 });
        drawLine({ p1: vec2(cx - 20, baseY + 10), p2: vec2(cx + 20, baseY + 10), width: 4, color: accentCol, opacity: 0.8 });

        // ── AI Core Reactor ──
        const coreSize = isAttacking ? 25 + Math.sin(t * 20) * 5 : 20 + Math.sin(t * 5) * 2;
        drawCircle({ radius: coreSize + 10, pos: vec2(cx, baseY - 5), color: coreCol, opacity: 0.3 });
        drawCircle({ radius: coreSize, pos: vec2(cx, baseY - 5), color: rgb(255, 255, 255), opacity: 0.9 });
        drawCircle({ radius: coreSize - 5, pos: vec2(cx, baseY - 5), color: coreCol });

        // ── Head / Sensor ──
        drawRect({ width: 40, height: 35, pos: vec2(cx - 20, baseY - 100), color: metalDark, radius: 8 });
        drawRect({ width: 30, height: 25, pos: vec2(cx - 15, baseY - 95), color: rgb(20, 20, 20), radius: 4 });
        
        // Sensor Eye (tracks player roughly)
        const eyeXOffset = isAttacking ? Math.sin(t*30)*2 : 0;
        drawRect({ width: 20, height: 8, pos: vec2(cx - 10 + eyeXOffset, baseY - 85), color: coreCol, radius: 2 });
        drawCircle({ radius: 3, pos: vec2(cx + eyeXOffset, baseY - 81), color: rgb(255,255,255) });

        // ── Damage Cracks (Low HP) ──
        if (isLow) {
            drawLine({ p1: vec2(cx - 30, baseY - 40), p2: vec2(cx - 10, baseY - 20), width: 2, color: rgb(0,0,0) });
            drawLine({ p1: vec2(cx + 25, baseY + 20), p2: vec2(cx + 10, baseY), width: 2, color: rgb(0,0,0) });
            drawCircle({ radius: 4, pos: vec2(cx - 20, baseY - 30), color: coreCol });
        }
    }

    // ── Player bullet spawner ──────────────────────────────────────────────────
    function playerShoot() {
        if (!gunUnlocked || bossDefeated) return;
        if (shootCooldown > 0) return;
        shootCooldown = SHOOT_COOLDOWN;

        const bx = player.pos.x + player.width + 5;
        const by = player.pos.y - player.height / 2;

        const bullet = add([
            rect(18, 6),
            opacity(0),
            area(),
            pos(bx, by),
            anchor("left"),
            z(25),
            "player_bullet",
            { vx: 900, vy: 0, hit: false }
        ]);

        // Bullet draw entity
        const bdraw = add([
            pos(bx, by),
            z(26),
            {
                draw() {
                    if (!bullet.exists()) { destroy(this); return; }
                    drawRect({ width: 18, height: 6, pos: vec2(bullet.pos.x, bullet.pos.y - 3), color: rgb(0, 255, 200), radius: 3 });
                    drawCircle({ radius: 6, pos: vec2(bullet.pos.x, bullet.pos.y), color: rgb(0, 255, 200), opacity: 0.3 });
                }
            }
        ]);
        bdraw.onUpdate(() => { if (!bullet.exists()) destroy(bdraw); });

        playerBullets.push(bullet);
        bullet.onUpdate(() => {
            if (bullet.hit) { destroy(bullet); return; }
            bullet.pos.x += bullet.vx * dt();
            if (bullet.pos.x > width() + 50) destroy(bullet);
        });

        // Hit detection
        bullet.onCollide("boss_body", () => {
            if (bullet.hit || bossDefeated) return;
            bullet.hit = true;
            // Particle hit burst
            effects.bossHitFlash();
            effects.spawnParticles(bullet.pos.x, bullet.pos.y, rgb(0, 255, 200), 8, 180, 0.35, 5);

            bossHitCount++;
            if (bossHitCount >= HITS_PER_HP) {
                bossHitCount = 0;
                bossHP = Math.max(0, bossHP - 1);
                ui.updateBossHP(bossHP, BOSS_MAX_HP);

                if (bossHP <= 0) triggerBossDefeat();
            }
            destroy(bullet);
        });
    }

    // ── Boss attacks (Pointy Data Shards) ──────────────────────────────────────
    function spawnBossProjectile(startX, startY, vx, vy, col) {
        const p = add([
            rect(14, 14),
            opacity(0),
            area(),
            pos(startX, startY),
            anchor("center"),
            z(24),
            "boss_projectile",
            { vx, vy, col: col || rgb(255, 100, 0), angle: Math.atan2(vy, vx) }
        ]);

        const pdraw = add([
            pos(startX, startY),
            z(25),
            {
                draw() {
                    if (!p.exists()) { destroy(this); return; }
                    // Draw a sharp data shard pointing in the direction of travel
                    pushTransform();
                    translate(vec2(p.pos.x - startX, p.pos.y - startY)); // Translate relative to start since entity is at start
                    rotate(p.angle * 180 / Math.PI);
                    
                    // Triangle pointing right (since 0 degrees is right)
                    drawPolygon({
                        pts: [vec2(16, 0), vec2(-12, -8), vec2(-12, 8)],
                        color: p.col,
                        opacity: 0.9
                    });
                    // Core glow
                    drawPolygon({
                        pts: [vec2(10, 0), vec2(-8, -4), vec2(-8, 4)],
                        color: rgb(255, 255, 255),
                        opacity: 0.8
                    });
                    // Particle trail element
                    drawCircle({ radius: 4, pos: vec2(-16, 0), color: p.col, opacity: 0.4 + Math.sin(time()*20)*0.2 });
                    
                    popTransform();
                }
            }
        ]);
        pdraw.onUpdate(() => { if (!p.exists()) destroy(pdraw); });

        p.onUpdate(() => {
            p.pos.x += p.vx * dt();
            p.pos.y += p.vy * dt();
            if (p.pos.x < -50 || p.pos.y > height() + 50 || p.pos.y < -100) destroy(p);
        });

        bossProjectiles.push(p);

        // Damage player if hit
        p.onCollide("player", () => {
            if (!p.exists() || player.isHit || player.isRespawning) return;
            destroy(p);
            // Trigger damage externally via callback
            if (bossEntity._onPlayerHit) bossEntity._onPlayerHit();
        });

        return p;
    }

    function fireBossAttack() {
        if (bossDefeated || phase !== 1) return;

        const hpRatio    = bossHP / BOSS_MAX_HP;
        const isLow      = hpRatio <= 0.3;
        const isMid      = hpRatio <= 0.6;
        const bCX        = bossEntity.pos.x + 80;
        const bCY        = bossEntity.pos.y - 100;

        // Choose pattern based on HP ratio
        const pattern = attackPattern % (isLow ? 4 : isMid ? 3 : 2);
        attackPattern++;

        if (pattern === 0) {
            // Simple direct shot toward player
            const dx  = player.pos.x - bCX;
            const dy  = (player.pos.y - player.height / 2) - bCY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const spd = isLow ? 420 : 300;
            spawnBossProjectile(bCX, bCY, (dx / len) * spd, (dy / len) * spd, rgb(255, 80, 0));
        } else if (pattern === 1) {
            // Three-spread (noisy data spread)
            for (let i = -1; i <= 1; i++) {
                const spd = isMid ? 380 : 280;
                spawnBossProjectile(bCX, bCY, -spd * 0.9, i * spd * 0.4, rgb(255, 200, 50));
            }
        } else if (pattern === 2) {
            // Data drift: diagonal arcing shots
            for (let i = 0; i < 3; i++) {
                const angle = -Math.PI * 0.5 + (i - 1) * 0.35;
                spawnBossProjectile(bCX, bCY, Math.cos(angle) * 350, Math.sin(angle) * 350, rgb(50, 200, 255));
            }
        } else if (pattern === 3) {
            // Overfitting burst — 5-way when low HP
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI + (i - 2) * 0.28;
                spawnBossProjectile(bCX, bCY, Math.cos(angle) * 400, Math.sin(angle) * 400, rgb(255, 30, 30));
            }
        }
    }

    // ── Boss defeat ────────────────────────────────────────────────────────────
    function triggerBossDefeat() {
        bossDefeated = true;
        bossActive   = false;
        defeatTimer  = 2.5;

        // Destroy all boss projectiles
        for (const p of bossProjectiles) { if (p.exists()) destroy(p); }
        bossProjectiles = [];

        // Explode boss
        effects.spawnParticles(bossEntity.pos.x + 80, bossEntity.pos.y - 100, rgb(255, 100, 0), 25, 400, 1.2, 8);
        effects.spawnParticles(bossEntity.pos.x + 80, bossEntity.pos.y - 100, rgb(0, 255, 200), 15, 300, 0.8, 5);

        // Shake screen
        effects.zoneTransitionFlash(rgb(255, 80, 0));

        messages.showPopup("TECHNICAL DEBT ELIMINATED!", rgb(50, 255, 100));
        ui.hideBossHP();

        // Spawn portal after delay
        wait(defeatTimer, () => {
            if (!portalSpawned) {
                portalSpawned = true;
                spawnPortal();
            }
        });

        // Hide boss body
        wait(0.5, () => { if (bossEntity.exists()) bossEntity.opacity = 0; });
    }

    // ── Portal ─────────────────────────────────────────────────────────────────
    function spawnPortal() {
        messages.showZoneAnnouncement("AI/ML PORTAL OPEN — ENTER!", [0, 255, 150]);

        const portal = add([
            rect(80, height() - 50),
            opacity(0),
            area(),
            pos(width() - 120, 0),
            z(30),
            "ai_portal",
            { pulse: 0 }
        ]);

        const pdraw = add([
            pos(width() - 80, 0),
            z(31),
            { pulse: 0,
              draw() {
                  this.pulse += dt() * 3;
                  const t = time();
                  const ph = height();
                  // Portal frame
                  drawRect({ width: 80, height: ph - 50, pos: vec2(-40, 0), color: rgb(0, 30, 20), opacity: 0.6 });
                  // Left edge
                  drawRect({ width: 6, height: ph - 50, pos: vec2(-40, 0), color: rgb(0, 255, 150), opacity: 0.8 + Math.sin(t * 6) * 0.2 });
                  // Right edge
                  drawRect({ width: 6, height: ph - 50, pos: vec2(34, 0), color: rgb(0, 255, 150), opacity: 0.8 + Math.sin(t * 6 + 1) * 0.2 });
                  // Particle stream inside portal
                  for (let i = 0; i < 8; i++) {
                      const py = ((t * 200 + i * (ph / 8)) % (ph - 50));
                      drawRect({ width: 4, height: 10, pos: vec2(-20 + Math.sin(t * 4 + i) * 15, py), color: rgb(100, 255, 200), opacity: 0.6 });
                  }
                  // Portal label
                  drawRect({ width: 200, height: 36, pos: vec2(-100, ph * 0.3), color: rgb(0, 30, 15), opacity: 0.9, radius: 8 });
              }
            }
        ]);

        portal.onCollide("player", () => {
            if (bossEntity._onPortalEnter) bossEntity._onPortalEnter();
        });
    }

    // ── Attack interval (frequency scales with phase) ─────────────────────────
    function getAttackInterval() {
        const r = bossHP / BOSS_MAX_HP;
        if (r <= 0.3) return rand(0.6, 1.0);
        if (r <= 0.6) return rand(1.0, 1.5);
        return rand(1.5, 2.2);
    }

    // ── Main boss update (called from main.js onUpdate) ───────────────────────
    function update(dt_) {
        if (!bossActive) return;
        if (shootCooldown > 0) shootCooldown -= dt_;

        attackTimer += dt_;
        if (attackTimer >= getAttackInterval()) {
            attackTimer = 0;
            fireBossAttack();
        }
    }

    return {
        update,
        playerShoot,
        isActive: () => bossActive,
        isDefeated: () => bossDefeated,
        setOnPlayerHit: (cb) => { bossEntity._onPlayerHit = cb; },
        setOnPortalEnter: (cb) => { bossEntity._onPortalEnter = cb; },
        gunUnlocked: () => gunUnlocked,
    };
}
