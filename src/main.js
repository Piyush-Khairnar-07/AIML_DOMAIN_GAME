import kaplay from "kaplay";
import { setupEnvironment } from "./environment.js";
import { setupPlayer } from "./player.js";
import { setupObstacles } from "./obstacles.js";
import { setupUI, setupMobileControls } from "./ui.js";
import { setupCoins } from "./coins.js";
import { setupCheckpoints } from "./checkpoints.js";
import { setupMessages } from "./messages.js";
import { setupSpecialLoot } from "./specialLoot.js";
import { setupEffects, SFX } from "./effects.js";
// NOTE: setupBoss is intentionally NOT called during the AI/ML game.
// The boss will be used later in the 4-domain final sequence.
// import { setupBoss } from "./boss.js";  ← preserved for final integration

kaplay({
    width: 1280,
    height: 720,
    letterbox: true,
    background: [8, 4, 22],
    global: true,
});

// ─── Target Preview ────────────────────────────────────────────────────────────
scene("target_preview", () => {
    add([ rect(width(), height()), color(8, 4, 22), fixed() ]);

    const titleBox = add([
        rect(600, 80, { radius: 14 }),
        color(15, 8, 45),
        opacity(0.9),
        pos(width() / 2, height() / 2 - 50),
        anchor("center"),
        fixed(),
    ]);
    titleBox.add([
        text("TARGET DOMAIN", { size: 42, font: "monospace" }),
        color(80, 190, 255),
        anchor("center"),
    ]);

    const mlLabel = add([
        text("AI / ML", { size: 72, font: "monospace" }),
        anchor("center"),
        pos(width() / 2, height() / 2 + 50),
        color(255, 50, 150),
        fixed(),
    ]);
    let mlGlow = 0;
    mlLabel.onUpdate(() => {
        mlGlow += dt() * 3;
        mlLabel.opacity = 0.8 + Math.sin(mlGlow) * 0.2;
    });

    wait(2.2, () => go("countdown"));
});

// ─── Countdown ─────────────────────────────────────────────────────────────────
scene("countdown", () => {
    let count = 3;
    add([ rect(width(), height()), color(8, 4, 22), fixed() ]);

    const countText = add([
        text(count.toString(), { size: 120, font: "monospace" }),
        anchor("center"),
        pos(width() / 2, height() / 2),
        color(0, 255, 200),
        fixed(),
    ]);

    loop(1, () => {
        count--;
        if (count > 0) {
            countText.text = count.toString();
            countText.color = rgb(0, 255, 200);
        } else if (count === 0) {
            countText.text = "GO!";
            countText.color = rgb(255, 255, 0);
        } else {
            go("game");
        }
    });
});

// ─── Main Game Scene ───────────────────────────────────────────────────────────
scene("game", () => {
    const gameState = {
        timeAlive:        0,
        lives:            5,
        maxLives:         5,
        speed:            400,
        difficulty:       "Z1",
        bankedScore:      0,
        segmentScore:     0,
        bankedCoins:      0,
        segmentCoins:     0,
        currentPhaseName: "DATA PIPELINE",
        maxSegmentX:      200,
        bossPhase:        false,  // kept for boss infrastructure compatibility
        // Stats for domain completion result
        obstaclesHit:     0,
        obstaclesAvoided: 0,
    };

    setGravity(4000);

    // ── Setup systems ──────────────────────────────────────────────────────────
    setupEnvironment();

    // ── Zone atmosphere overlay — subtle fullscreen tint per zone ──────────────
    // Target colours per zone (R, G, B, opacity)
    const zoneAtmosphere = {
        Z1:     [10, 40, 80,  0.06],  // deep blue — data streams, pipelines
        Z2:     [60, 20, 90,  0.07],  // violet — neural networks, GPU
        Z3:     [80, 30, 10,  0.06],  // amber — servers, live inference
        MAX:    [60, 5,  5,   0.10],  // deep red — critical, unstable
        PORTAL: [0,  40, 80,  0.08],  // cyan/blue — Cybersecurity transition
    };
    let _atmCurrent = [10, 40, 80, 0.06];
    const atmOverlay = add([
        rect(width(), height()),
        pos(0, 0),
        color(10, 40, 80),
        opacity(0.06),
        z(-15),
        fixed(),
    ]);
    atmOverlay.onUpdate(() => {
        const target = zoneAtmosphere[gameState.difficulty] || [10, 40, 80, 0.06];
        // Lerp towards target
        for (let i = 0; i < 4; i++) {
            _atmCurrent[i] += (target[i] - _atmCurrent[i]) * dt() * 0.8;
        }
        atmOverlay.color = rgb(_atmCurrent[0], _atmCurrent[1], _atmCurrent[2]);
        atmOverlay.opacity = _atmCurrent[3];
    });

    const effects        = setupEffects();
    const player         = setupPlayer(effects, gameState);
    const { spawnCoins, spawnSlideCoins } = setupCoins(gameState);
    const { spawnObstacle, getObstacleInfo } = setupObstacles(gameState, spawnSlideCoins);
    const { spawnSpecialLoot, spawnRecoveryCore }  = setupSpecialLoot(gameState);
    const ui             = setupUI(gameState);
    const messages       = setupMessages();
    const checkpoints    = setupCheckpoints(messages);
    const mobileControls = setupMobileControls(player);

    // ── Per-session educational tracking ──────────────────────────────────────
    // Tracks which obstacle types the player has already seen an explanation for
    const explainedTypes = new Set();
    let   educationPaused = false;  // prevent stacking pauses

    // ── Timers ─────────────────────────────────────────────────────────────────
    let spawnTimer        = 1.0;
    let coinTimer         = rand(1.5, 2.5);
    let specialLootTimer  = rand(10, 15);
    let recoveryCoreTimer = rand(15, 22);
    let nextSpeedChange   = 0;
    let lastDifficulty    = "Z1";
    let maxLivesExpanded  = false;

    // Portal / completion state
    let portalPhase       = false;  // true when FINAL/MAX → portal section starts
    let portalSpawned     = false;
    let portalEntered     = false;
    let completionFired   = false;

    // Boss infrastructure (preserved for future 4-domain integration — NOT called here)
    // let boss = null;
    // let bossStarted = false;

    const zoneAnnouncements = {
        Z1:     { name: "ZONE 1 — DATA PIPELINE",    color: [80, 190, 255]  },
        Z2:     { name: "ZONE 2 — MODEL TRAINING",   color: [255, 200, 50]  },
        Z3:     { name: "ZONE 3 — DEPLOYMENT",        color: [255, 120, 50]  },
        MAX:    { name: "ZONE 4 — CRITICAL SYSTEMS",  color: [255, 50,  80]  },
        PORTAL: { name: "ZONE 5 — CYBERSECURITY PORTAL", color: [0, 220, 255] },
    };

    // ── Hit handler ────────────────────────────────────────────────────────────
    function handlePlayerDamage(source) {
        if (player.isHit || player.isRespawning || portalEntered) return;

        // ── Educational pause on FIRST hit of this obstacle type ────────────
        if (source && !educationPaused) {
            const info = getObstacleInfo(source);
            if (info && !explainedTypes.has(info.type)) {
                explainedTypes.add(info.type);
                educationPaused = true;
                // Show the pause card, then apply damage after resume
                messages.showEducationalPause(info.term, info.desc, () => {
                    educationPaused = false;
                    applyDamage(source);
                });
                return; // damage applied after resume
            }
        }

        applyDamage(source);
    }

    function applyDamage(source) {
        if (player.isHit || player.isRespawning || portalEntered) return;

        gameState.obstaclesHit++;

        // -10 score penalty
        let totalScore = gameState.bankedScore + gameState.segmentScore;
        totalScore = Math.max(0, totalScore - 10);
        if (totalScore < gameState.bankedScore) {
            gameState.bankedScore  = totalScore;
            gameState.segmentScore = 0;
        } else {
            gameState.segmentScore = totalScore - gameState.bankedScore;
        }

        effects.hitBurst(player.pos.x + 25, player.pos.y - 40);
        SFX.hit();

        player.isHit = true;
        gameState.lives -= 1;
        ui.update();

        wait(1.0, () => { if (!player.isRespawning) player.isHit = false; });

        if (source && source.exists && source.exists()) destroy(source);

        if (gameState.lives <= 0) {
            const respawned = checkpoints.respawnPlayer(gameState, player, ui);
            if (!respawned) {
                go("game_over", buildDomainResult());
            }
        }
    }

    // ── Obstacle hit handler ──────────────────────────────────────────────────
    function handleObstacleHit(obstacle) {
        handlePlayerDamage(obstacle);
    }

    // ── Build the domain completion result object ──────────────────────────────
    function buildDomainResult() {
        return {
            domain:          "AI_ML",
            score:           Math.floor(gameState.bankedScore + gameState.segmentScore),
            coins:           gameState.bankedCoins + gameState.segmentCoins,
            completionTime:  Math.floor(gameState.timeAlive),
            livesRemaining:  gameState.lives,
            obstaclesHit:    gameState.obstaclesHit,
            obstaclesAvoided: gameState.obstaclesAvoided,
            completed:       true,
        };
    }

    // ── Portal: Cybersecurity Domain Transition Portal ─────────────────────────
    function spawnEndPortal() {
        if (portalSpawned) return;
        portalSpawned = true;

        const portalX = width() - 160;
        const portalH = height() - 50;
        const portalCX = portalX + 70; // center X of portal

        // Invisible collision trigger (70px wide)
        const portalTrigger = add([
            rect(70, portalH),
            pos(portalX + 35, 0),
            opacity(0),
            area(),
            z(30),
            "ai_portal",
        ]);

        portalTrigger.onUpdate(() => {
            portalTrigger.move(-gameState.speed, 0);
        });

        // Full Cybersecurity Domain Transition Portal visual
        const portalVisual = add([
            pos(portalCX, 0),
            z(31),
            { _t: 0,
              draw() {
                  this._t += dt();
                  const t  = time();
                  const ph = portalH;
                  const pw = 140;

                  // Dark backdrop panel
                  drawRect({ width: pw + 20, height: ph, pos: vec2(-(pw / 2 + 10), 0), color: rgb(2, 8, 28), opacity: 0.75 });

                  // Left pillar — AI/ML side (purple/green)
                  drawRect({ width: 12, height: ph, pos: vec2(-pw / 2 - 6, 0), color: rgb(80, 255, 160), opacity: 0.85 + Math.sin(t * 5) * 0.15 });
                  drawRect({ width: 20, height: ph, pos: vec2(-pw / 2 - 14, 0), color: rgb(40, 180, 80), opacity: 0.22 + Math.sin(t * 3.5) * 0.08 });

                  // Right pillar — Cybersecurity side (cyan/blue)
                  drawRect({ width: 12, height: ph, pos: vec2(pw / 2 - 6, 0), color: rgb(0, 200, 255), opacity: 0.9 + Math.sin(t * 6 + 1) * 0.1 });
                  drawRect({ width: 20, height: ph, pos: vec2(pw / 2 + 2, 0), color: rgb(0, 100, 200), opacity: 0.25 + Math.sin(t * 4 + 1) * 0.1 });

                  // Top arch cap glows
                  drawCircle({ radius: pw / 2 + 8, pos: vec2(0, 4), color: rgb(0, 200, 255), opacity: 0.18 + Math.sin(t * 4) * 0.06 });
                  drawCircle({ radius: pw / 2, pos: vec2(0, 4), color: rgb(60, 255, 180), opacity: 0.12 + Math.sin(t * 5) * 0.05 });

                  // Sweeping energy columns (AI/ML green → Cyber cyan)
                  for (let i = 0; i < 12; i++) {
                      const py = ((t * 220 + i * (ph / 12)) % ph);
                      const pw2 = 3 + Math.sin(t * 3.5 + i * 0.8) * 1.5;
                      const lerp = i / 12;
                      const cr = Math.round(80 * (1 - lerp));
                      const cg = Math.round(200 + 55 * (1 - lerp));
                      const cb = Math.round(160 + 95 * lerp);
                      drawRect({ width: pw2, height: 16, pos: vec2(-20 + Math.sin(t * 2.5 + i * 0.7) * 22, py), color: rgb(cr, cg, cb), opacity: 0.5 });
                  }

                  // Security grid pattern (right half, cybersecurity)
                  for (let r = 0; r < 12; r++) {
                      for (let c = 0; c < 3; c++) {
                          const gx = 8 + c * 24;
                          const gy = r * 55 + 15;
                          const active = Math.sin(t * 3 + r * 0.7 + c * 1.3) > 0.65;
                          if (active) drawRect({ width: 18, height: 18, pos: vec2(gx, gy), color: rgb(0, 220, 255), opacity: 0.22, radius: 3 });
                          drawRect({ width: 18, height: 18, pos: vec2(gx, gy), color: rgb(0, 100, 180), opacity: 0.10, radius: 3 });
                      }
                  }

                  // Shield + lock symbol (Cybersecurity icon, right half)
                  const sy = ph * 0.28;
                  const sr = 26;
                  drawCircle({ radius: sr, pos: vec2(32, sy), color: rgb(0, 180, 255), opacity: 0.22 + Math.sin(t * 3) * 0.08 });
                  drawRect({ width: sr * 1.4, height: sr * 1.2, pos: vec2(32 - sr * 0.7, sy), color: rgb(0, 140, 220), opacity: 0.3, radius: 6 });
                  drawRect({ width: 14, height: 10, pos: vec2(25, sy + 2), color: rgb(0, 230, 255), opacity: 0.8, radius: 3 });
                  drawCircle({ radius: 6, pos: vec2(32, sy - 2), color: rgb(0, 200, 255), opacity: 0.6 });
                  drawCircle({ radius: 3, pos: vec2(32, sy - 2), color: rgb(2, 8, 28), opacity: 1.0 });

                  // AI/ML neural cluster (left half)
                  const ny = ph * 0.72;
                  const nodes = [[-38, -12], [-22, -22], [-24, 5], [-40, 8], [-30, -5]];
                  for (let i = 0; i < nodes.length; i++) {
                      const [nx, nry] = nodes[i];
                      drawCircle({ radius: 4, pos: vec2(nx, ny + nry), color: rgb(80, 255, 160), opacity: 0.6 + Math.sin(t * 3 + i * 1.1) * 0.4 });
                  }
                  for (let i = 0; i < nodes.length - 1; i++) {
                      const [ax, ay] = nodes[i];
                      const [bx, by] = nodes[i + 1];
                      drawLine({ p1: vec2(ax, ny + ay), p2: vec2(bx, ny + by), width: 1, color: rgb(80, 255, 160), opacity: 0.35 });
                  }

                  // Orbiting energy particles
                  for (let i = 0; i < 5; i++) {
                      const angle = t * 2 + (i / 5) * Math.PI * 2;
                      const ox = Math.cos(angle) * (pw / 2 + 6);
                      const oy = ph * 0.5 + Math.sin(angle) * (ph / 2 - 12);
                      const oc = i < 3 ? rgb(0, 220, 255) : rgb(80, 255, 160);
                      drawCircle({ radius: 3 + Math.abs(Math.sin(t * 4 + i)) * 2, pos: vec2(ox, oy), color: oc, opacity: 0.75 });
                  }

                  // "AI / ML" label (left pillar top)
                  drawRect({ width: 72, height: 24, pos: vec2(-pw / 2 - 4, 28), color: rgb(4, 22, 12), opacity: 0.9, radius: 5 });
                  drawText({ text: "AI / ML", size: 13, font: "monospace", pos: vec2(-pw / 2 + 2, 32), color: rgb(100, 255, 160) });

                  // "▶ CYBERSECURITY" label (right pillar)
                  drawRect({ width: 136, height: 24, pos: vec2(pw / 2 - 138, 60), color: rgb(2, 8, 28), opacity: 0.92, radius: 5 });
                  drawText({ text: "CYBERSECURITY ▶", size: 13, font: "monospace", pos: vec2(pw / 2 - 134, 64), color: rgb(0, 220, 255) });

                  // "NEXT DOMAIN" centre sign
                  drawRect({ width: pw - 8, height: 34, pos: vec2(-pw / 2 + 4, ph * 0.46), color: rgb(2, 10, 30), opacity: 0.92, radius: 6 });
                  drawRect({ width: pw - 8, height: 34, pos: vec2(-pw / 2 + 4, ph * 0.46), color: rgb(0, 180, 255), opacity: 0.14, radius: 6 });
                  drawText({ text: "NEXT: CYBERSECURITY", size: 13, font: "monospace", pos: vec2(-pw / 2 + 7, ph * 0.46 + 7), color: rgb(0, 220, 255) });
              }
            }
        ]);

        portalVisual.onUpdate(() => {
            portalVisual.move(-gameState.speed, 0);
        });

        // Collision: player enters portal
        portalTrigger.onCollide("player", () => {
            if (portalEntered || completionFired) return;
            portalEntered  = true;
            completionFired = true;

            // Lock player controls
            player.isRespawning = true;

            // Stop world scrolling
            gameState.speed = 0;

            // Portal entry sequence
            _doPortalEntry(portalVisual.pos.x);
        });
    }

    // ── Portal entry animation ─────────────────────────────────────────────────
    function _doPortalEntry(portalCX) {
        SFX.portal();

        // Energy flash
        effects.zoneTransitionFlash(rgb(0, 255, 150));
        effects.spawnParticles(player.pos.x + 25, player.pos.y - 40, rgb(0, 255, 150), 20, 300, 0.8, 6);

        // Move player into portal over 1s, shrinking and fading them
        let t = 0;
        const startX  = player.pos.x;
        const targetX = portalCX - 25;

        const moveLoop = onUpdate(() => {
            t += dt();
            const progress = Math.min(t / 1.0, 1);
            // Ease-in
            const ease = progress * progress;
            player.pos.x = startX + (targetX - startX) * ease;

            // Shrink + fade (uses the new player state fields)
            player.portalScale        = 1 - ease * 0.88;
            player.portalFadeOpacity  = 1 - ease;

            if (progress >= 1) {
                moveLoop.cancel();
                _portalAbsorbed();
            }
        });
    }

    function _portalAbsorbed() {
        // Big energy burst
        effects.spawnParticles(player.pos.x + 25, player.pos.y - 40, rgb(0, 255, 200), 30, 400, 1.0, 8);
        effects.spawnParticles(player.pos.x + 25, player.pos.y - 40, rgb(255, 255, 255), 15, 200, 0.6, 4);
        effects.zoneTransitionFlash(rgb(100, 255, 200));

        // Bank any remaining score
        gameState.bankedScore += gameState.segmentScore;
        gameState.bankedCoins += gameState.segmentCoins;
        gameState.segmentScore = 0;
        gameState.segmentCoins = 0;

        // Brief screen flash then go to completion
        wait(0.8, () => {
            go("completed", buildDomainResult());
        });
    }

    // ── Main Update Loop ────────────────────────────────────────────────────────
    onUpdate(() => {
        gameState.timeAlive += dt();
        const t = gameState.timeAlive;

        // Movement-based scoring (only during active runner phase)
        if (!gameState.bossPhase && !portalPhase && !player.isHit && !player.isRespawning) {
            if (isKeyDown("right") || isKeyDown("d")) {
                gameState.segmentScore += 40 * dt();
            }
            // Track avoided obstacles: count obstacles that scroll past player
            for (const obs of get("obstacle")) {
                if (obs.pos.x + obs.width < player.pos.x - 5 && !obs._counted) {
                    obs._counted = true;
                    gameState.obstaclesAvoided++;
                }
            }
        }

        ui.update();

        // Checkpoint banking
        if (!gameState.bossPhase && !portalPhase) {
            const newlyReached = checkpoints.updateCheckpoints(t);
            if (newlyReached) {
                gameState.bankedScore  += gameState.segmentScore;
                gameState.bankedCoins  += gameState.segmentCoins;
                gameState.segmentScore  = 0;
                gameState.segmentCoins  = 0;
                gameState.maxSegmentX   = player.pos.x;
                gameState.currentPhaseName = newlyReached.title;
                effects.checkpointBurst(player.pos.x + 25, player.pos.y - 40);
                SFX.checkpoint();
            }
        }

        // ── Difficulty & Speed Progression ────────────────────────────────────
        
        // Helper to smoothly lerp target speed to prevent unavoidable bunching
        if (gameState.targetSpeed === undefined) gameState.targetSpeed = gameState.speed;
        if (!gameState.bossPhase && !portalPhase) {
            // Lerp towards target speed over ~0.5s to 1s
            gameState.speed += (gameState.targetSpeed - gameState.speed) * dt() * 3.0;
        }

        if (!gameState.bossPhase && !portalPhase) {
            if (t < 15) {
                // ZONE 1: mostly stable/slow, small variation
                if (gameState.difficulty !== "Z1") { gameState.difficulty = "Z1"; gameState.targetSpeed = 480; }
                if (t > nextSpeedChange) {
                    gameState.targetSpeed = rand(450, 550);
                    nextSpeedChange = t + rand(4, 6);
                }
            } else if (t < 35) {
                // ZONE 2: slow -> medium -> slow, occasional fast burst
                if (gameState.difficulty !== "Z2") { gameState.difficulty = "Z2"; gameState.targetSpeed = 600; }
                if (t > nextSpeedChange) {
                    const roll = rand(0, 1);
                    if      (roll < 0.60) gameState.targetSpeed = rand(550, 650); // slow
                    else if (roll < 0.90) gameState.targetSpeed = rand(700, 800); // medium
                    else                  gameState.targetSpeed = rand(850, 950); // fast burst
                    nextSpeedChange = t + rand(2.5, 4.0);
                }
            } else if (t < 55) {
                // ZONE 3: medium -> fast -> medium -> slow -> fast (noticeably more variation)
                if (gameState.difficulty !== "Z3") { gameState.difficulty = "Z3"; gameState.targetSpeed = 800; }
                if (t > nextSpeedChange) {
                    const roll = rand(0, 1);
                    if      (roll < 0.25) gameState.targetSpeed = rand(600, 750); // slow (break rhythm)
                    else if (roll < 0.60) gameState.targetSpeed = rand(800, 950); // medium
                    else                  gameState.targetSpeed = rand(1000, 1150); // fast
                    nextSpeedChange = t + rand(2.0, 3.5);
                }
            } else if (t < 70) {
                // ZONE 4: fast -> medium -> very fast -> slow -> fast -> medium -> very fast
                if (gameState.difficulty !== "MAX") { gameState.difficulty = "MAX"; gameState.targetSpeed = 1000; }
                if (t > nextSpeedChange) {
                    const roll = rand(0, 1);
                    if      (roll < 0.15) gameState.targetSpeed = rand(750, 900); // slow
                    else if (roll < 0.45) gameState.targetSpeed = rand(950, 1100); // medium
                    else if (roll < 0.75) gameState.targetSpeed = rand(1150, 1300); // fast
                    else                  gameState.targetSpeed = rand(1350, 1500); // very fast
                    nextSpeedChange = t + rand(1.5, 2.5); // frequent bounded bursts
                }
            } else {
                // ZONE 5: PORTAL APPROACH (70–75s)
                portalPhase = true;
                gameState.difficulty = "PORTAL";
                gameState.currentPhaseName = "CYBERSECURITY PORTAL";

                // Clear all remaining obstacles for safe approach
                for (const obs of get("obstacle"))      destroy(obs);
                for (const obs of get("obstacle_label")) destroy(obs);

                // Gradual deceleration
                gameState.speed = 220;

                // Announce portal
                messages.showZoneAnnouncement("ZONE 5 — CYBERSECURITY PORTAL", [0, 220, 255]);
                effects.zoneTransitionFlash(rgb(0, 180, 255));

                // Spawn the Cybersecurity portal after a short dramatic pause
                wait(1.5, () => spawnEndPortal());
            }
        }

        if (gameState.difficulty !== lastDifficulty) {
            const ann = zoneAnnouncements[gameState.difficulty];
            if (ann && gameState.difficulty !== "PORTAL") {
                messages.showZoneAnnouncement(ann.name, ann.color);
                effects.zoneTransitionFlash(rgb(ann.color[0], ann.color[1], ann.color[2]));
            }
            if (gameState.difficulty === "MAX" && !maxLivesExpanded) {
                gameState.maxLives = 5;
                maxLivesExpanded   = true;
                messages.showPopup("ZONE 4 — CRITICAL SYSTEMS! 5 HEARTS!", rgb(255, 50, 80));
                ui.update();
            }
            lastDifficulty = gameState.difficulty;
        }

        // ── Spawning (runner phase only, not during portal approach) ───────────
        if (!gameState.bossPhase && !portalPhase) {
            spawnTimer -= dt();
            if (spawnTimer <= 0) {
                const overrideDelay = spawnObstacle();
                if (overrideDelay !== undefined && overrideDelay !== null) {
                    spawnTimer = overrideDelay;
                } else {
                    // Spawn frequency increases with each zone
                    let baseDelay;
                    if      (gameState.difficulty === "Z1")  baseDelay = 1.6; // tighter sparse — Zone 1
                    else if (gameState.difficulty === "Z2")  baseDelay = 1.1; // tighter medium — Zone 2
                    else if (gameState.difficulty === "Z3")  baseDelay = 0.8; // absolute max density limit
                    else                                     baseDelay = 0.7; // fallback
                    // Faster speed = obstacles closer together, compensate slightly
                    const speedFactor = 400 / Math.max(gameState.speed, 200);
                    let rawTimer = baseDelay * speedFactor + rand(0, 0.4);
                    
                    // CRITICAL PHYSICS REQUIREMENT: A player jump is always 0.70s.
                    // If the time between obstacles drops below 0.75s, they will physically land on the next one at high speeds.
                    spawnTimer = Math.max(rawTimer, 0.85);
                }
            }

            coinTimer -= dt();
            if (coinTimer <= 0) { spawnCoins(); coinTimer = rand(2, 4); }

            specialLootTimer -= dt();
            if (specialLootTimer <= 0) { spawnSpecialLoot(); specialLootTimer = rand(15, 25); }

            recoveryCoreTimer -= dt();
            if (recoveryCoreTimer <= 0) { 
                spawnRecoveryCore(); 
                if      (gameState.difficulty === "Z1")  recoveryCoreTimer = rand(15, 22);
                else if (gameState.difficulty === "Z2")  recoveryCoreTimer = rand(10, 15);
                else if (gameState.difficulty === "Z3")  recoveryCoreTimer = rand(8,  11);
                else if (gameState.difficulty === "MAX") recoveryCoreTimer = rand(6,  9);
                else                                     recoveryCoreTimer = rand(15, 25);
            }
        }
    });

    // ── Swept AABB obstacle collision ───────────────────────────────────────────
    player.onUpdate(() => {
        if (player.isHit || player.isRespawning || gameState.bossPhase || portalPhase) return;

        const pLeft   = player.pos.x;
        const pRight  = player.pos.x + player.width;
        const pBottom = player.pos.y;
        const pTop    = player.pos.y - player.height;

        for (const obs of get("obstacle")) {
            const oLeft   = obs.pos.x;
            const oRight  = obs.pos.x + obs.width;
            const oBottom = obs.pos.y;
            const oTop    = obs.pos.y - obs.height;
            const travelX = gameState.speed * dt();
            const sweptRight = oRight + travelX;
            const travelY    = obs.fallSpeed ? obs.fallSpeed * dt() : 0;
            const sweptTop   = oTop - travelY;

            if (pLeft < sweptRight && pRight > oLeft && pTop < oBottom && pBottom > sweptTop) {
                handleObstacleHit(obs);
                break;
            }
        }
    });

    // ── Collectible collisions ──────────────────────────────────────────────────
    player.onCollide("coin", (coin) => {
        destroy(coin);
        gameState.segmentCoins += 1;
        gameState.segmentScore += 10;
        ui.update();
        effects.coinSparkle(coin.pos.x, coin.pos.y);
        SFX.coin();
    });

    player.onCollide("special_loot", (loot) => {
        destroy(loot);
        gameState.segmentCoins += 5;
        ui.update();
        effects.lootSparkle(loot.pos.x, loot.pos.y);
        SFX.loot();
        messages.showPopup(`+5 COINS: ${loot.term}`, rgb(0, 255, 255));
    });

    player.onCollide("recovery_core", (core) => {
        destroy(core);
        const maxLives = gameState.maxLives || 3;
        if (gameState.lives < maxLives) {
            gameState.lives += 1;
            effects.corePulse(core.pos.x, core.pos.y);
            SFX.core();
            messages.showPopup("LIFE RESTORED! +1 HEART", rgb(255, 50, 100));
        } else {
            gameState.segmentScore += 100;
            messages.showPopup("FULL HEALTH! +100 BONUS", rgb(255, 100, 50));
        }
        ui.update();
    });
});

// ─── Game Over ─────────────────────────────────────────────────────────────────
scene("game_over", (result) => {
    const score = result.score || 0;
    const coins = result.coins || 0;

    add([ rect(width(), height()), color(18, 4, 10), fixed() ]);
    add([
        text("GAME OVER", { size: 80, font: "monospace" }),
        anchor("center"), pos(width() / 2, height() / 2 - 100),
        color(255, 50, 50), fixed(),
    ]);
    add([
        rect(640, 60, { radius: 10 }), color(30, 10, 20), opacity(0.8),
        anchor("center"), pos(width() / 2, height() / 2), fixed(),
    ]);
    add([
        text(`SCORE: ${score}   COINS: ${coins}`, { size: 28, font: "monospace" }),
        anchor("center"), pos(width() / 2, height() / 2),
        color(220, 220, 220), fixed(),
    ]);
    add([
        text("PRESS SPACE OR TAP TO RESTART", { size: 22, font: "monospace" }),
        anchor("center"), pos(width() / 2, height() / 2 + 90),
        color(100, 255, 100), fixed(),
    ]);
    onKeyPress("space", () => go("target_preview"));
    onClick(() => go("target_preview"));
});

// ─── AI/ML Domain Completed ────────────────────────────────────────────────────
scene("completed", (result) => {
    const score   = result.score   || 0;
    const coins   = result.coins   || 0;
    const time_s  = result.completionTime || 0;
    const lives   = result.livesRemaining || 0;
    const avoided = result.obstaclesAvoided || 0;
    const hit     = result.obstaclesHit     || 0;

    add([ rect(width(), height()), color(4, 18, 10), fixed() ]);

    // "AI/ML DOMAIN COMPLETE" header
    add([
        text("AI/ML DOMAIN", { size: 52, font: "monospace" }),
        anchor("center"), pos(width() / 2, height() / 2 - 160),
        color(80, 255, 140), fixed(),
    ]);

    const completedText = add([
        text("COMPLETE!", { size: 76, font: "monospace" }),
        anchor("center"), pos(width() / 2, height() / 2 - 90),
        color(50, 255, 100), fixed(),
    ]);
    completedText.onUpdate(() => {
        completedText.glow = (completedText.glow || 0) + dt() * 3;
        completedText.opacity = 0.8 + Math.sin(completedText.glow) * 0.2;
    });

    // Stats card
    add([
        rect(720, 180, { radius: 14 }), color(8, 35, 20), opacity(0.92),
        anchor("center"), pos(width() / 2, height() / 2 + 20), fixed(),
    ]);
    // Border
    add([
        rect(724, 184, { radius: 15 }), color(50, 255, 100), opacity(0.25),
        anchor("center"), pos(width() / 2, height() / 2 + 20), fixed(),
    ]);

    const statsLines = [
        `FINAL SCORE:  ${score}`,
        `COINS:        ${coins}`,
        `TIME:         ${time_s}s`,
        `HEARTS LEFT:  ${lives}`,
        `DODGED:       ${avoided}  |  HIT: ${hit}`,
    ];
    statsLines.forEach((line, i) => {
        add([
            text(line, { size: 22, font: "monospace" }),
            anchor("center"), pos(width() / 2, height() / 2 - 55 + i * 34),
            color(190, 255, 200), fixed(),
        ]);
    });

    add([
        text("PRESS SPACE OR TAP TO CONTINUE", { size: 20, font: "monospace" }),
        anchor("center"), pos(width() / 2, height() / 2 + 155),
        color(80, 220, 255), fixed(),
    ]);

    // Portal particles ambient
    onUpdate(() => {
        if (chance(0.3)) {
            add([
                circle(rand(3, 7)),
                pos(rand(0, width()), rand(0, height())),
                color(0, 200, 120),
                opacity(rand(0.3, 0.7)),
                z(1),
                { life: rand(0.5, 1.2) },
            ]).onUpdate(function() {
                this.life -= dt();
                this.pos.y -= 40 * dt();
                this.opacity = this.life / 1.2;
                if (this.life <= 0) destroy(this);
            });
        }
    });

    onKeyPress("space", () => go("target_preview"));
    onClick(() => go("target_preview"));
});

go("target_preview");