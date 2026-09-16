// Phase 2: Particle Effects System
// Lightweight, purely visual — no collision, no tags that interfere with gameplay

export function setupEffects() {

    /**
     * Spawn a burst of particles at (x, y).
     * @param {number} x
     * @param {number} y
     * @param {number[]} colorRgb - rgb() result
     * @param {number} count
     * @param {number} spread - max velocity spread in px/s
     * @param {number} lifetime - seconds before particles fully fade
     * @param {number} size - radius of each particle
     */
    function spawnParticles(x, y, colorRgb, count = 6, spread = 200, lifetime = 0.5, size = 4) {
        for (let i = 0; i < count; i++) {
            const angle = rand(0, Math.PI * 2);
            const speed = rand(spread * 0.3, spread);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const p = add([
                circle(size),
                pos(x, y),
                color(colorRgb),
                opacity(1),
                z(50),
                { vx, vy, life: lifetime, maxLife: lifetime }
            ]);
            p.onUpdate(() => {
                p.life -= dt();
                if (p.life <= 0) { destroy(p); return; }
                p.pos.x += p.vx * dt();
                p.pos.y += p.vy * dt();
                p.vy += 600 * dt(); // gravity pull
                p.opacity = p.life / p.maxLife;
            });
        }
    }

    // Landing dust puff — small grey/white burst at foot level
    function landingPuff(x, y) {
        spawnParticles(x, y, rgb(200, 200, 255), 8, 150, 0.4, 5);
    }

    // Jump dust — upward burst of cyan sparks
    function jumpDust(x, y) {
        for (let i = 0; i < 5; i++) {
            const vx = rand(-80, 80);
            const vy = rand(-150, -60);
            const p = add([
                circle(4),
                pos(x + rand(-10, 10), y),
                color(rgb(0, 255, 255)),
                opacity(1),
                z(50),
                { vx, vy, life: 0.35 }
            ]);
            p.onUpdate(() => {
                p.life -= dt();
                if (p.life <= 0) { destroy(p); return; }
                p.pos.x += p.vx * dt();
                p.pos.y += p.vy * dt();
                p.opacity = p.life / 0.35;
            });
        }
    }

    // Hit burst — red/orange particles
    function hitBurst(x, y) {
        spawnParticles(x, y, rgb(255, 50, 50), 10, 300, 0.6, 6);
        // Screen flash overlay
        const flash = add([
            rect(width(), height()),
            color(255, 0, 0),
            opacity(0.25),
            fixed(),
            z(999),
        ]);
        flash.onUpdate(() => {
            flash.opacity -= dt() * 2;
            if (flash.opacity <= 0) destroy(flash);
        });
    }

    // Coin collect sparkle — gold star burst
    function coinSparkle(x, y) {
        spawnParticles(x, y, rgb(255, 230, 0), 7, 180, 0.4, 4);
    }

    // Special loot collect — cyan star burst (larger)
    function lootSparkle(x, y) {
        spawnParticles(x, y, rgb(0, 255, 255), 12, 250, 0.6, 6);
        spawnParticles(x, y, rgb(255, 255, 255), 6, 150, 0.4, 3);
    }

    // Recovery core collect — pink heart burst
    function corePulse(x, y) {
        spawnParticles(x, y, rgb(255, 50, 120), 10, 200, 0.5, 5);
        spawnParticles(x, y, rgb(255, 200, 220), 6, 100, 0.35, 3);
    }

    // Checkpoint burst — green flash + particles
    function checkpointBurst(x, y) {
        spawnParticles(x, y, rgb(50, 255, 100), 15, 300, 0.7, 6);
        const flash = add([
            rect(width(), height()),
            color(0, 255, 100),
            opacity(0.15),
            fixed(),
            z(999),
        ]);
        flash.onUpdate(() => {
            flash.opacity -= dt() * 1.5;
            if (flash.opacity <= 0) destroy(flash);
        });
    }

    // Slide trail — small blue sparks from player feet
    function slideSpark(x, y) {
        if (chance(0.4)) { // Only spawn occasionally, not every frame
            spawnParticles(x, y, rgb(0, 150, 255), 2, 100, 0.25, 3);
        }
    }

    // Zone transition flash
    function zoneTransitionFlash(colorRgb) {
        const flash = add([
            rect(width(), height()),
            color(colorRgb),
            opacity(0.2),
            fixed(),
            z(998),
        ]);
        flash.onUpdate(() => {
            flash.opacity -= dt() * 1.2;
            if (flash.opacity <= 0) destroy(flash);
        });
    }

    // Boss hit flash
    function bossHitFlash() {
        spawnParticles(width() * 0.75, height() / 2, rgb(255, 100, 0), 12, 200, 0.5, 7);
    }

    return {
        spawnParticles,
        landingPuff,
        jumpDust,
        hitBurst,
        coinSparkle,
        lootSparkle,
        corePulse,
        checkpointBurst,
        slideSpark,
        zoneTransitionFlash,
        bossHitFlash,
    };
}

// Audio-ready event hooks (no-op by default, replace with sound calls later)
export const SFX = {
    jump:        () => { /* sfx.play("jump")    */ },
    land:        () => { /* sfx.play("land")    */ },
    slide:       () => { /* sfx.play("slide")   */ },
    coin:        () => { /* sfx.play("coin")    */ },
    loot:        () => { /* sfx.play("loot")    */ },
    hit:         () => { /* sfx.play("hit")     */ },
    checkpoint:  () => { /* sfx.play("checkpoint") */ },
    core:        () => { /* sfx.play("core")    */ },
    shoot:       () => { /* sfx.play("shoot")   */ },
    bossHit:     () => { /* sfx.play("bossHit") */ },
    bossDefeat:  () => { /* sfx.play("defeat")  */ },
    portal:      () => { /* sfx.play("portal")  */ },
    complete:    () => { /* sfx.play("complete") */ },
};
