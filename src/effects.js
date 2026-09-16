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


// ── Web Audio Engine ────────────────────────────────────────────────────────────
// Lazy-init: AudioContext is created on first SFX call (after a user gesture),
// which satisfies browser autoplay policy on both desktop and mobile.

let _audioCtx = null;

function _getCtx() {
    if (!_audioCtx) {
        try {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return null; }
        // Resume suspended context on any subsequent user gesture (mobile Safari)
        const _tryResume = () => {
            if (_audioCtx && _audioCtx.state === "suspended") _audioCtx.resume();
        };
        document.addEventListener("click",      _tryResume);
        document.addEventListener("touchstart", _tryResume, { passive: true });
        document.addEventListener("keydown",    _tryResume);
    }
    // Best-effort resume every time we need audio
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
}

// Play a tone with optional exponential frequency sweep and gain fade-out.
// freq/freqEnd: Hz (must be > 0).  dur: seconds.  vol: 0–1.  delay: offset from now.
function _tone(freq, freqEnd, dur, type = "sine", vol = 0.25, delay = 0) {
    const ctx = _getCtx();
    if (!ctx) return;
    try {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(1, freq), now);
        if (freqEnd !== freq) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + dur);
        }
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.start(now);
        osc.stop(now + dur + 0.02);
    } catch (e) {}
}

// Play a white-noise burst with gain fade-out.
function _noise(dur, vol = 0.12, delay = 0) {
    const ctx = _getCtx();
    if (!ctx) return;
    try {
        const samples = Math.ceil(ctx.sampleRate * Math.max(0.01, dur));
        const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const g = ctx.createGain();
        src.connect(g);
        g.connect(ctx.destination);
        const now = ctx.currentTime + delay;
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        src.start(now);
        src.stop(now + dur + 0.02);
    } catch (e) {}
}

// Cooldown for move sound — prevents per-frame audio spam when a direction is held.
let _lastMoveSnd = 0;

// ── SFX: all 8 required gameplay sounds plus existing hooks ────────────────────
export const SFX = {

    // 1. Player jumps — rising pitch whoosh
    jump() {
        _tone(180, 520, 0.15, "sine", 0.22);
        _noise(0.08, 0.04);
    },

    // Landing feedback — soft thud (not in the 8, but already called in player.js)
    land() {
        _tone(110, 55, 0.12, "sine", 0.15);
    },

    // 2. Player slides — downward swoosh
    slide() {
        _tone(380, 90, 0.2, "sine", 0.18);
        _noise(0.15, 0.04);
    },

    // 3 & 4. Left / Right movement — very subtle step tick, throttled to 80 ms
    move() {
        const now = Date.now();
        if (now - _lastMoveSnd < 80) return;
        _lastMoveSnd = now;
        _tone(90, 75, 0.05, "sine", 0.06);
    },

    // 5. Player hits obstacle — sharp buzzy impact
    hit() {
        _noise(0.18, 0.28);
        _tone(140, 55, 0.22, "sawtooth", 0.18);
    },

    // 6. Falling obstacle hits ground — deep one-shot thump
    thud() {
        _tone(95, 38, 0.18, "sine", 0.32);
        _noise(0.10, 0.15);
    },

    // 7. Normal coin collected — bright short ping
    coin() {
        _tone(880, 1100, 0.10, "sine", 0.20);
    },

    // 8. Special loot collected — three-note ascending arpeggio
    loot() {
        _tone(440, 440, 0.08, "sine", 0.20, 0.00);
        _tone(550, 550, 0.08, "sine", 0.20, 0.09);
        _tone(880, 880, 0.14, "sine", 0.28, 0.18);
    },

    // Checkpoint — ascending three-note chime
    checkpoint() {
        _tone(440, 440, 0.09, "sine", 0.20, 0.00);
        _tone(550, 550, 0.09, "sine", 0.20, 0.10);
        _tone(660, 660, 0.14, "sine", 0.25, 0.21);
    },

    // Recovery core (extra heart) — warm rising tone
    core() {
        _tone(440, 660, 0.15, "sine", 0.25);
        _tone(660, 880, 0.10, "sine", 0.20, 0.13);
    },

    // Boss / shoot stubs (infrastructure kept for future integration)
    shoot()      { _tone(600, 200, 0.12, "sawtooth", 0.20); },
    bossHit()    { _noise(0.12, 0.20); _tone(200, 80, 0.15, "sawtooth", 0.15); },
    bossDefeat() { _tone(440, 880, 0.30, "sine", 0.30); _noise(0.20, 0.10, 0.10); },

    // Portal entry — whooshing energy surge
    portal() {
        _tone(300, 1400, 0.50, "sine", 0.18);
        _noise(0.35, 0.06);
    },

    // Domain complete — four-note victory fanfare
    complete() {
        _tone(440, 440, 0.10, "sine", 0.20, 0.00);
        _tone(550, 550, 0.10, "sine", 0.20, 0.12);
        _tone(660, 660, 0.15, "sine", 0.25, 0.25);
        _tone(880, 880, 0.25, "sine", 0.30, 0.42);
    },
};

