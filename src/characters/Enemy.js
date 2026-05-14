/* global Phaser */

// ─── Minimal State Machine (local — mirrors Player.js pattern) ─────────────────

class SM {
  constructor(owner) { this._s = {}; this._cur = null; this.owner = owner; }
  add(n, s) { this._s[n] = s; return this; }
  transition(n) {
    const next = this._s[n];
    if (!next || next === this._cur) return;
    this._cur?.exit();
    this._cur = next;
    this._cur.enter();
  }
  update(dt) { this._cur?.update(dt); }
  get current() { return this._cur?.name ?? null; }
}

class EState {
  constructor(enemy, name) { this.enemy = enemy; this.name = name; }
  enter()    {}
  update()   {}
  exit()     {}
}

// ─── Enemy States ──────────────────────────────────────────────────────────────

class PatrolState extends EState {
  constructor(e) {
    super(e, 'PATROL');
    this._timer    = 0;
    this._duration = 0;
  }

  enter() {
    const e = this.enemy;
    this._timer    = 0;
    this._duration = 2000 + Math.random() * 1200; // 2 – 3.2 s between reversals
    e.sprite.clearTint(); // restore actual texture colours
  }

  update(delta) {
    const e = this.enemy;

    // Reverse direction when hitting a wall or when patrol timer expires
    this._timer += delta;
    if (this._timer >= this._duration ||
        e.sprite.body.blocked.left ||
        e.sprite.body.blocked.right) {
      e._patrolDir *= -1;
      this._timer    = 0;
      this._duration = 2000 + Math.random() * 1200;
    }

    e.sprite.setVelocityX(e._patrolDir * e.patrolSpeed);
    e.sprite.setFlipX(e._patrolDir === -1);

    // Switch to CHASE when player enters detection range
    if (e._distToPlayer() <= e.detectionRange) {
      e.sm.transition('CHASE');
    }
  }
}

class ChaseState extends EState {
  constructor(e) { super(e, 'CHASE'); }

  enter() {
    // Overlay a faint red tint (multiplied over the texture) to signal aggression.
    // The texture is drawn in red so 0xff8888 lightens it slightly rather than changing hue.
    this.enemy.sprite.setTint(0xff8888);
  }

  update() {
    const e = this.enemy;

    // Give up if player sprints out of range or is dead
    if (e._distToPlayer() > e.giveUpRange || e._player?.isDead) {
      e.sm.transition('PATROL');
      return;
    }

    const dir = e._player.sprite.x > e.sprite.x ? 1 : -1;
    e.sprite.setVelocityX(dir * e.chaseSpeed);
    e.sprite.setFlipX(dir === -1);
  }
}

class HitState extends EState {
  constructor(e) { super(e, 'HIT'); this._elapsed = 0; }

  enter() {
    const e = this.enemy;
    this._elapsed = 0;
    e.sprite.setTint(0xffffff); // white flash
    // Knockback — push opposite to player's facing (the hit direction)
    e.sprite.setVelocityX(e._knockDir * e.knockbackSpeed);
    // Brief upward pop to feel more physical
    if (e.sprite.body.blocked.down) e.sprite.setVelocityY(-180);
  }

  update(delta) {
    this._elapsed += delta;
    if (this._elapsed >= 360) {
      const e = this.enemy;
      // Resume based on whether player is still close
      e.sm.transition(e._distToPlayer() <= e.detectionRange ? 'CHASE' : 'PATROL');
    }
  }

  exit() {
    // Restore to the state the enemy was going to next (set in its enter()),
    // so just clear the tint here; the next state's enter() sets its own.
    if (this.enemy.sprite.active) this.enemy.sprite.clearTint();
  }
}

class DeadState extends EState {
  constructor(e) { super(e, 'DEAD'); }

  enter() {
    const e = this.enemy;

    // Disable physics immediately so player can't keep hitting it
    e.sprite.body.enable = false;
    e.sprite.setVelocityX(0);

    // Remove health bar right away — it's meaningless
    e._hpBg.destroy();
    e._hpBar.destroy();

    // Squash-and-fade death tween
    e.scene.tweens.add({
      targets: e.sprite,
      alpha:   0,
      scaleY:  0.08,
      y:       e.sprite.y + e._h * 0.46, // sink toward the ground
      duration: 520,
      ease:    'Power2',
      onComplete: () => e.sprite.destroy(),
    });
  }

  // No update — dead enemies absorb nothing
}

// ─── Enemy Base Class ──────────────────────────────────────────────────────────

/**
 * Base enemy class.  Extend it and pass a cfg object to create variants:
 *
 *   class HeavyEnemy extends Enemy {
 *     constructor(scene, x, y) {
 *       super(scene, x, y, { health: 150, speed: 55, color: 0x884422, w: 48, h: 64 });
 *     }
 *   }
 *
 * cfg fields (all optional):
 *   health, speed, chaseSpeed, contactDamage, attackRate,
 *   detectionRange, giveUpRange, knockbackSpeed,
 *   color, w, h, textureKey
 */
export default class Enemy {
  constructor(scene, x, y, cfg = {}) {
    this.scene = scene;

    // ── Stats ─────────────────────────────────────────────────────────────

    this.health       = cfg.health       ?? 60;
    this.maxHealth    = this.health;
    this.speed        = cfg.speed        ?? 80;
    this.chaseSpeed   = cfg.chaseSpeed   ?? Math.round(this.speed * 1.45);
    this.patrolSpeed  = Math.round(this.speed * 0.5);
    this.contactDamage  = cfg.contactDamage  ?? 10; // read by CombatSystem
    this.attackRate     = cfg.attackRate     ?? 1400; // ms between contact hits
    this.attackCooldown = 0;
    this.detectionRange = cfg.detectionRange ?? 240;
    this.giveUpRange    = cfg.giveUpRange    ?? 420;
    this.knockbackSpeed = cfg.knockbackSpeed ?? 280;

    // ── Internal state ────────────────────────────────────────────────────

    this._patrolDir = Math.random() < 0.5 ? 1 : -1;
    this._knockDir  = 0;   // set by receivedHit() before HIT transition
    this._player    = null; // assigned each update() call

    // ── Appearance ────────────────────────────────────────────────────────

    this._w = cfg.w ?? 36;
    this._h = cfg.h ?? 52;

    this._buildTexture(scene, cfg);
    this._buildSprite(scene, x, y);
    this._buildHealthBar(scene, x, y);
    this._buildSM();
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  _buildTexture(scene, cfg) {
    const key   = cfg.textureKey ?? 'enemy';
    const color = cfg.color      ?? 0xcc3333;
    const { _w: w, _h: h } = this;

    if (!scene.textures.exists(key)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });

      // Body
      g.fillStyle(color);
      g.fillRect(0, 0, w, h);

      // Head / upper highlight
      const light = Phaser.Display.Color.ValueToColor(color).lighten(22).color;
      g.fillStyle(light);
      g.fillRect(4, 2, w - 8, 18);

      // Eyes (face right; sprite.setFlipX mirrors them for left-facing)
      g.fillStyle(0xffffff);
      g.fillRect(w - 16, 6, 10, 8);
      g.fillStyle(0x110000);
      g.fillRect(w - 12, 7, 6, 6);  // pupil

      // Jaw stripe
      const dark = Phaser.Display.Color.ValueToColor(color).darken(25).color;
      g.fillStyle(dark);
      g.fillRect(0, h - 14, w, 6);

      g.generateTexture(key, w, h);
      g.destroy();
    }

    this._textureKey = key;
  }

  _buildSprite(scene, x, y) {
    this.sprite = scene.physics.add.sprite(x, y, this._textureKey);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(4);
    this.sprite.enemyRef = this; // back-reference used by CombatSystem
  }

  _buildHealthBar(scene, x, y) {
    const barW = this._w + 4;
    const barY = y - Math.round(this._h / 2) - 10;
    this._hpBg  = scene.add.rectangle(x, barY, barW,     7, 0x550000).setDepth(6);
    this._hpBar = scene.add.rectangle(x, barY, this._w + 2, 5, 0x22dd44).setDepth(7);
  }

  _buildSM() {
    this.sm = new SM(this);
    this.sm
      .add('PATROL', new PatrolState(this))
      .add('CHASE',  new ChaseState(this))
      .add('HIT',    new HitState(this))
      .add('DEAD',   new DeadState(this));
    this.sm.transition('PATROL');
  }

  // ── Helpers used by states ────────────────────────────────────────────────

  _distToPlayer() {
    if (!this._player) return Infinity;
    return Phaser.Math.Distance.Between(
      this.sprite.x, this.sprite.y,
      this._player.sprite.x, this._player.sprite.y,
    );
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Called every frame by Level1Scene.
   * Signature matches the old Enemy so Level1Scene needs no changes.
   */
  update(player, delta) {
    if (!this.sprite.active) return;

    this._player = player;

    // Tick the contact-damage cooldown regardless of state
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    this.sm.update(delta);

    // Keep health bar tracking sprite position (skipped once DEAD destroys bars)
    if (this.sm.current !== 'DEAD') {
      this._updateHealthBar();
    }
  }

  _updateHealthBar() {
    const ratio  = this.health / this.maxHealth;
    const fullW  = this._w + 2;
    const curW   = fullW * ratio;
    const barY   = this.sprite.y - Math.round(this._h / 2) - 10;

    this._hpBg.setPosition(this.sprite.x, barY);

    // Left-anchor the fill bar — its center drifts left as it shrinks
    this._hpBar.width = curW;
    this._hpBar.setPosition(this.sprite.x - (fullW - curW) / 2, barY);
    this._hpBar.fillColor = ratio > 0.5 ? 0x22dd44 : ratio > 0.25 ? 0xffcc00 : 0xff2200;
  }

  /**
   * Called by CombatSystem when the player's attack hitbox lands.
   * @param {number} amount   — damage to deal
   * @param {number} knockDir — +1 (knock right) or -1 (knock left); matches player.facing
   */
  receivedHit(amount, knockDir) {
    const s = this.sm.current;
    if (s === 'DEAD' || s === 'HIT') return; // HIT state = invincibility frames

    this.health    = Math.max(0, this.health - amount);
    this._knockDir = knockDir;

    this.sm.transition(this.health <= 0 ? 'DEAD' : 'HIT');
  }

  get isDead()  { return this.sm.current === 'DEAD'; }
  get state()   { return this.sm.current; }
}
