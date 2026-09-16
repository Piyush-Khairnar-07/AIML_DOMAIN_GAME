import { SFX } from "./effects.js";

// ─── Procedural character drawing ─────────────────────────────────────────────
// Draws a futuristic AI-runner character at the origin (botleft anchor).
// All draw calls are relative to (0, 0) = bottom-left of the hitbox.
// W = 50, H = 80 (standing) or 40 (sliding)
function drawCharacter(state, t, hitW, hitH, isHit, isRespawning) {
    const cx = hitW / 2;   // horizontal center
    const cy = -hitH / 2;  // vertical center of hitbox

    // Flash red when hit
    const bodyR = isHit ? 255 : 0;
    const bodyG = isHit ? 60  : 220;
    const bodyB = isHit ? 60  : 255;
    const bodyOpacity = isRespawning ? (0.5 + Math.sin(t * 20) * 0.5) : 1;

    // ── Helper: draw a rect relative to botleft ──────────────────────────────
    const dr = (x, y, w, h, r, g, b, op = 1, radius = 0) => {
        drawRect({ width: w, height: h, pos: vec2(x, -y - h), color: rgb(r, g, b), opacity: op * bodyOpacity, radius });
    };
    const dc = (x, y, r, cr, cg, cb, op = 1) => {
        drawCircle({ radius: r, pos: vec2(x, -y), color: rgb(cr, cg, cb), opacity: op * bodyOpacity });
    };

    // ── Running cycle ────────────────────────────────────────────────────────
    // leg swing angle based on time
    const legSwing = state === "run" ? Math.sin(t * 14) * 14 : 0;
    const armSwing = state === "run" ? Math.sin(t * 14) * 10 : 0;
    const breathe  = (state === "idle") ? Math.sin(t * 2) * 1.5 : 0;

    // ── SLIDE state ──────────────────────────────────────────────────────────
    if (state === "slide") {
        // Whole body is low — hitbox is 40px tall
        // Visor helmet (head)
        dc(cx, 32, 12, bodyR, bodyG, bodyB);
        // Helmet band
        dr(cx - 12, 22, 24, 6, 0, 150, 230, 0.9, 2);
        // Visor strip
        dr(cx - 10, 25, 20, 4, 0, 255, 255, 0.7);
        // Body (crouched)
        dr(cx - 14, 8, 28, 16, bodyR, bodyG, bodyB, 0.9, 3);
        // Suit stripe
        dr(cx - 12, 10, 24, 4, 0, 180, 255, 0.6);
        // Arms extended forward
        dr(cx + 10, 14, 20, 7, bodyR, bodyG, bodyB, 0.85, 2);
        dr(cx - 30, 14, 20, 7, bodyR, bodyG, bodyB, 0.85, 2);
        // Legs tucked back
        dr(cx - 8, -2, 10, 12, bodyR, bodyG, bodyB, 0.9, 2);
        dr(cx + 2, -2, 10, 12, bodyR, bodyG, bodyB, 0.9, 2);
        // Boot glow
        dr(cx - 10, -4, 14, 4, 0, 200, 255, 0.7, 1);
        dr(cx,      -4, 14, 4, 0, 200, 255, 0.7, 1);
        // Slide spark line
        drawLine({
            p1: vec2(cx - 20, -2),
            p2: vec2(cx + 30, -2),
            width: 2,
            color: rgb(0, 255, 200),
            opacity: 0.5 + Math.sin(t * 25) * 0.5,
        });
        return;
    }

    // ── JUMP / FALL / FASTFALL states ─────────────────────────────────────────
    const isAir = state === "jump" || state === "fall" || state === "fastfall";
    const jumpTuck = isAir ? 8 : 0; // legs tucked up
    const bodyYOff = breathe;

    // ── Legs (drawn first, behind body) ──────────────────────────────────────
    if (!isAir) {
        // Left leg with running swing
        const leftLegY  = legSwing > 0 ? legSwing : 0;
        const rightLegY = legSwing < 0 ? -legSwing : 0;

        // Thigh
        dr(cx - 16, 2 + leftLegY,  10, 18, bodyR, bodyG, bodyB, 0.9, 2);
        dr(cx + 6,  2 + rightLegY, 10, 18, bodyR, bodyG, bodyB, 0.9, 2);
        // Shin
        dr(cx - 16, 2 + leftLegY  + 16, 10, 14, bodyR * 0.6, bodyG * 0.9, bodyB * 0.9, 0.9, 2);
        dr(cx + 6,  2 + rightLegY + 16, 10, 14, bodyR * 0.6, bodyG * 0.9, bodyB * 0.9, 0.9, 2);
        // Boot glow
        dr(cx - 18, 2 + leftLegY  + 28, 14, 5, 0, 200, 255, 0.8, 1);
        dr(cx + 4,  2 + rightLegY + 28, 14, 5, 0, 200, 255, 0.8, 1);
    } else {
        // Air — legs tucked under body
        dr(cx - 16, 4 + jumpTuck, 10, 16, bodyR, bodyG, bodyB, 0.9, 2);
        dr(cx + 6,  4 + jumpTuck, 10, 16, bodyR, bodyG, bodyB, 0.9, 2);
        // Boot
        dr(cx - 18, 4 + jumpTuck + 14, 14, 5, 0, 200, 255, 0.8, 1);
        dr(cx + 4,  4 + jumpTuck + 14, 14, 5, 0, 200, 255, 0.8, 1);
    }

    // ── Body/torso ────────────────────────────────────────────────────────────
    const bodyY = 32 + bodyYOff;
    dr(cx - 16, bodyY, 32, 24, bodyR, bodyG, bodyB, 0.95, 3);
    // Chest armor stripe
    dr(cx - 14, bodyY + 4, 28, 6, 0, 180, 255, 0.5, 2);
    // Glowing center core (AI core on chest)
    dc(cx, -(bodyY + 10), 5, 0, 255, 200, 0.8 + Math.sin(t * 6) * 0.2);
    // Suit vertical line detail
    dr(cx - 2, bodyY + 2, 4, 20, 0, 255, 200, 0.35);

    // ── Arms ──────────────────────────────────────────────────────────────────
    const leftArmY  = isAir ? -4 : armSwing;
    const rightArmY = isAir ? -4 : -armSwing;

    // Left arm
    dr(cx - 26, bodyY + 2 + leftArmY,  10, 18, bodyR, bodyG, bodyB, 0.88, 2);
    // Right arm
    dr(cx + 16, bodyY + 2 + rightArmY, 10, 18, bodyR, bodyG, bodyB, 0.88, 2);
    // Gloves
    dc(cx - 21, -(bodyY + 18 + leftArmY),  7, 0, 150, 220, 0.8);
    dc(cx + 21, -(bodyY + 18 + rightArmY), 7, 0, 150, 220, 0.8);

    // ── Head / helmet ─────────────────────────────────────────────────────────
    const headY = bodyY + 24 + bodyYOff;

    // Neck
    dr(cx - 5, headY, 10, 6, bodyR, bodyG, bodyB, 0.8);
    // Helmet dome
    dc(cx, -(headY + 16), 16, bodyR, bodyG, bodyB, 0.95);
    // Helmet top trim
    dr(cx - 16, headY + 24, 32, 5, 0, 150, 230, 0.8, 2);
    // Visor (glowing slit)
    dr(cx - 12, headY + 10, 24, 8, 0, 255, 255, 0.85, 3);
    // Visor inner glow
    dr(cx - 10, headY + 11, 20, 5, 200, 255, 255, 0.5 + Math.sin(t * 5) * 0.2);
    // Helmet side fin details
    dr(cx + 13, headY + 14, 5, 10, 0, 200, 255, 0.6, 1);
    dr(cx - 18, headY + 14, 5, 10, 0, 200, 255, 0.6, 1);
    // Antenna on top
    drawLine({
        p1: vec2(cx + 6, -(headY + 32)),
        p2: vec2(cx + 6, -(headY + 42)),
        width: 2,
        color: rgb(0, 255, 200),
        opacity: 0.9,
    });
    dc(cx + 6, -(headY + 42), 3, 0, 255, 200, 0.9 + Math.sin(t * 8) * 0.1);

    // ── Thrusters on back (glow when running) ─────────────────────────────────
    if (state === "run") {
        const thrusterPulse = Math.abs(Math.sin(t * 12)) * 0.6 + 0.3;
        dr(cx - 18, bodyY + 6, 5, 12, 0, 200, 255, thrusterPulse, 1);
        // Exhaust flame
        drawLine({
            p1: vec2(cx - 15, -(bodyY + 18)),
            p2: vec2(cx - 15 - rand(0, 8), -(bodyY + 18 + rand(5, 14))),
            width: 3,
            color: rgb(0, 200, 255),
            opacity: thrusterPulse * 0.7,
        });
    }

    // ── HIT state flash ───────────────────────────────────────────────────────
    if (isHit) {
        dc(cx, -(bodyY + 12), 28, 255, 50, 50, 0.25 + Math.sin(t * 30) * 0.25);
    }

    // ── Fast-fall indicator ───────────────────────────────────────────────────
    if (state === "fastfall") {
        drawLine({
            p1: vec2(cx, -(headY + 30)),
            p2: vec2(cx, -(headY + 46)),
            width: 3,
            color: rgb(255, 150, 0),
            opacity: 0.8,
        });
        drawLine({
            p1: vec2(cx - 8, -(headY + 36)),
            p2: vec2(cx, -(headY + 46)),
            width: 3,
            color: rgb(255, 150, 0),
            opacity: 0.8,
        });
        drawLine({
            p1: vec2(cx + 8, -(headY + 36)),
            p2: vec2(cx, -(headY + 46)),
            width: 3,
            color: rgb(255, 150, 0),
            opacity: 0.8,
        });
    }
}

// ─── Player Setup ──────────────────────────────────────────────────────────────
export function setupPlayer(effects, gameState) {
    const startX = 200;
    const startY = height() - 100; // botleft anchor, just above ground

    // ── Physics body (invisible rect — purely for hitbox + physics) ──────────
    const player = add([
        rect(50, 80),
        pos(startX, startY),
        opacity(0),            // INVISIBLE — character is drawn via draw()
        area({ shape: new Rect(vec2(0), 50, 80) }),
        body(),
        anchor("botleft"),
        "player",
        {
            isSliding: false,
            isHit: false,
            isRespawning: false,
            animState: "idle",   // current animation state
            portalScale: 1.0,    // used during portal entry animation
            portalFadeOpacity: 1.0, // used during portal entry animation
        }
    ]);

    // ── Cosmetic glow aura (separate entity behind player) ───────────────────
    const playerGlow = add([
        pos(startX + 25, startY - 40),
        z(4),
        { pulse: 0,
          draw() {
              drawCircle({
                  radius: 42,
                  color: rgb(0, 180, 255),
                  opacity: 0.08 + Math.sin(this.pulse) * 0.03,
                  pos: vec2(0, 0),
              });
          }
        }
    ]);
    // Pulse animation — registered as a method call, NOT as a component property
    playerGlow.onUpdate(() => { playerGlow.pulse += dt() * 4; });

    // ── Overlay entity for character drawing (drawn on top of everything) ─────
    const charDrawer = add([
        pos(startX, startY),
        z(5),
        {
            draw() {
                // Apply portal fade/scale if set
                const sc = player.portalScale;
                const fa = player.portalFadeOpacity;
                if (sc < 1.0 || fa < 1.0) {
                    pushTransform();
                    // Translate to center, scale, translate back
                    pushTranslate(player.width / 2, -player.height / 2);
                    pushScale(sc, sc);
                    pushTranslate(-player.width / 2, player.height / 2);
                }
                drawCharacter(
                    player.animState,
                    time(),
                    player.width,
                    player.height,
                    player.isHit,
                    fa < 1.0 ? fa : player.isRespawning,
                );
                if (sc < 1.0 || fa < 1.0) {
                    popTransform();
                }
            }
        }
    ]);

    function getPlayerSpeed() {
        if (!gameState) return 400;
        switch (gameState.difficulty) {
            case "Z1":     return 400; // 100%
            case "Z2":     return 440; // 110%
            case "Z3":     return 480; // 120%
            case "MAX":    return 520; // 130%
            case "PORTAL": return 400; // fallback to base
            default:       return 400;
        }
    }
    const JUMP_FORCE = 1400;

    // ── Input state ───────────────────────────────────────────────────────────
    let isSlideKeyDown         = false;
    let ignoreDownUntilRelease = false;
    let wasGroundedLastFrame   = true;
    let slideMinTimer          = 0;

    // Jump buffer — stores time of last jump press; consumed on first valid frame
    let jumpBufferTimer = 0;
    const JUMP_BUFFER   = 0.1; // 100 ms

    // ── Core jump action (also used by mobile) ────────────────────────────────
    function doJump() {
        if (player.isGrounded()) {
            // Cancel slide immediately
            if (player.isSliding) {
                player.isSliding         = false;
                slideMinTimer            = 0;
                isSlideKeyDown           = false;
                ignoreDownUntilRelease   = true;
                player.height            = 80;
                player.use(area({ shape: new Rect(vec2(0), 50, 80) }));
            }
            if (effects) effects.jumpDust(player.pos.x + 25, player.pos.y);
            SFX.jump();
            player.jump(JUMP_FORCE);
            jumpBufferTimer = 0; // consume buffer
        } else {
            // Buffer the jump — will fire the frame we land
            jumpBufferTimer = JUMP_BUFFER;
        }
    }

    // ── Keyboard bindings ─────────────────────────────────────────────────────
    onKeyDown("left",  () => player.moveLeft());
    onKeyDown("a",     () => player.moveLeft());
    onKeyDown("right", () => player.moveRight());
    onKeyDown("d",     () => player.moveRight());

    onKeyPress("space", doJump);
    onKeyPress("up",    doJump);
    onKeyPress("w",     doJump);

    onKeyDown("down", () => { if (!ignoreDownUntilRelease) isSlideKeyDown = true; });
    onKeyDown("s",    () => { if (!ignoreDownUntilRelease) isSlideKeyDown = true; });
    onKeyRelease("down", () => { isSlideKeyDown = false; ignoreDownUntilRelease = false; });
    onKeyRelease("s",    () => { isSlideKeyDown = false; ignoreDownUntilRelease = false; });

    // ── Mobile API (same logic, no duplication) ───────────────────────────────
    player.doJump    = doJump;
    player.moveLeft  = () => { SFX.move(); player.move(-getPlayerSpeed(), 0); };
    player.moveRight = () => { SFX.move(); player.move(getPlayerSpeed(),  0); };
    player.setSlideInput = (val) => {
        if (!val) {
            isSlideKeyDown         = false;
            ignoreDownUntilRelease = false;
        } else {
            if (!ignoreDownUntilRelease) isSlideKeyDown = true;
        }
    };

    // ── Main update ───────────────────────────────────────────────────────────
    player.onUpdate(() => {
        if (slideMinTimer > 0) slideMinTimer -= dt();

        const grounded = player.isGrounded();

        // ── Jump buffer: consume if just landed ───────────────────────────────
        if (jumpBufferTimer > 0) {
            jumpBufferTimer -= dt();
            if (grounded && jumpBufferTimer > 0) {
                // Buffered jump fires on landing frame
                doJump();
            }
        }

        // ── Landing feedback ──────────────────────────────────────────────────
        if (grounded && !wasGroundedLastFrame) {
            if (effects) effects.landingPuff(player.pos.x + 25, player.pos.y);
            SFX.land();
        }
        wasGroundedLastFrame = grounded;

        // ── Slide / fast-fall logic ───────────────────────────────────────────
        if (isSlideKeyDown) {
            if (!grounded) {
                // Airborne → fast-fall
                player.vel.y += 8000 * dt();
            } else if (!player.isSliding) {
                // Ground → enter slide
                player.isSliding = true;
                slideMinTimer    = 0.5;
                player.height    = 40;
                player.use(area({ shape: new Rect(vec2(0), 50, 40) }));
                SFX.slide();
            }
        } else if (slideMinTimer <= 0 && player.isSliding) {
            // Release slide
            player.isSliding = false;
            player.height    = 80;
            player.use(area({ shape: new Rect(vec2(0), 50, 80) }));
        }

        // ── Slide spark ───────────────────────────────────────────────────────
        if (player.isSliding && effects) effects.slideSpark(player.pos.x, player.pos.y);

        // ── Boundary clamp ────────────────────────────────────────────────────
        if (player.pos.x < 0)           player.pos.x = 0;
        if (player.pos.x > width() - 50) player.pos.x = width() - 50;

        // ── Determine animation state ─────────────────────────────────────────
        if (player.isHit) {
            player.animState = "hit";
        } else if (player.isSliding) {
            player.animState = "slide";
        } else if (!grounded) {
            if (isSlideKeyDown) {
                player.animState = "fastfall";
            } else if (player.vel && player.vel.y < 0) {
                player.animState = "jump";
            } else {
                player.animState = "fall";
            }
        } else {
            // Detect horizontal movement by checking keyboard state
            const movingH = isKeyDown("left") || isKeyDown("a") ||
                            isKeyDown("right") || isKeyDown("d");
            player.animState = movingH ? "run" : "idle";
        }

        // ── Sync visual entities to hitbox position ────────────────────────────
        charDrawer.pos.x = player.pos.x;
        charDrawer.pos.y = player.pos.y;

        playerGlow.pos.x = player.pos.x + 25;
        playerGlow.pos.y = player.pos.y - (player.isSliding ? 20 : 40);
    });

    return player;
}
