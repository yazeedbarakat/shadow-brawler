/* global Phaser */

// ─── Phase configuration ───────────────────────────────────────────────────────

const PHASES = [
  // Phase 1: 500–301 HP — slow patrol + melee charge, no projectiles
  { speed: 55, chaseSpeed: 185, shootCount: 0, shootRate: 99999,
    contactDamage: 20, baseTint: 0xffffff, label: 'PHASE 1' },
  // Phase 2: 300–151 HP — faster, starts firing single shots
  { speed: 80, chaseSpeed: 240, shootCount: 1, shootRate: 2800,
    contactDamage: 25, baseTint: 0xff8844, label: 'PHASE 2 — ENRAGED' },
  // Phase 3: 150–0 HP — very fast, 3-projectile burst
  { speed: 120, chaseSpeed: 310, shootCount: 3, shootRate: 1800,
    contactDamage: 30, baseTint: 0xff3300, label: 'PHASE 3 — BERSERK' },
];

// ─── Boss Projectile ───────────────────────────────────────────────────────────

class BossProjectile {
  constructor(scene, x, y, vx, vy, damage) {
    this.scene  = scene;
    this.damage = damage;
    this.active = true;

    if (!scene.textures.exists('proj_boss')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xdd2200); g.fillRect(0,  0,  16, 16);
      g.fillStyle(0xff6600); g.fillRect(3,  3,  10, 10);
      g.fillStyle(0xffcc00); g.fillRect(6,  6,  4,  4);
      g.generateTexture('proj_boss', 16, 16);
      g.destroy();
    }

    this.sprite = scene.physics.add.image(x, y, 'proj_boss');
    this.sprite.body.setAllowGravity(false);
    this.sprite.setVelocity(vx, vy);
    this.sprite.setDepth(7);
    this.sprite.projRef = this;
  }

  update() {
    if (!this.sprite.active) return;
    this.sprite.rotation += 0.09;
    const b = this.scene.physics.world.bounds;
    const { x, y } = this.sprite;
    if (x < b.left - 60 || x > b.right + 60 || y < b.top - 60 || y > b.bottom + 60) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    const burst = this.scene.add.rectangle(this.sprite.x, this.sprite.y, 22, 22, 0xff4400, 0.88).setDepth(10);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 3.2, scaleY: 3.2,
      duration: 210, ease: 'Power2', onComplete: () => burst.destroy(),
    });
    this.sprite.destroy();
  }
}

// ─── Boss ─────────────────────────────────────────────────────────────────────

export default class Boss {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x   Starting x (will be adjusted by physics)
   * @param {number} y
   */
  constructor(scene, x, y) {
    this.scene  = scene;
    this.health    = 500;
    this.maxHealth = 500;

    this._phase = 1;
    this._cfg   = PHASES[0];
    this._state = 'PATROL'; // PATROL | CHARGE | SHOOT | STUN | DEAD

    // Cooldowns
    this.contactCooldown  = 0;
    this.contactRate      = 1200; // ms between contact-damage ticks
    this._chargeCd        = 1500; // initial delay before first charge
    this._chargeTimer     = 0;
    this._shootCd         = 3000; // initial delay before first shot
    this._patrolDir       = -1;
    this._patrolTimer     = 2000;
    this._stunTimer       = 0;

    this._projList  = [];
    this._player    = null;

    this._buildTexture(scene);
    this._buildSprite(scene, x, y);
    this._buildHud(scene);
    this.projGroup = scene.physics.add.group();
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  _buildTexture(scene) {
    if (scene.textures.exists('boss')) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    // Body (72 × 96)
    g.fillStyle(0x990000); g.fillRect(0, 0, 72, 96);
    // Chest armour plate
    g.fillStyle(0x440000); g.fillRect(8, 0, 56, 28);
    // Shoulder pauldrons
    g.fillStyle(0x550000);
    g.fillRect(0,  8, 18, 22);
    g.fillRect(54, 8, 18, 22);
    // Belt
    g.fillStyle(0x222200); g.fillRect(0, 58, 72, 8);
    // Boot tops
    g.fillStyle(0x1a0000);
    g.fillRect(4,  78, 26, 18);
    g.fillRect(42, 78, 26, 18);
    // Helm (top section)
    g.fillStyle(0x660000); g.fillRect(14, 0, 44, 18);
    // Eye slits
    g.fillStyle(0xff2200);
    g.fillRect(16, 6, 14, 7);
    g.fillRect(42, 6, 14, 7);
    g.fillStyle(0xff8800);
    g.fillRect(18, 8, 8, 4);
    g.fillRect(44, 8, 8, 4);

    g.generateTexture('boss', 72, 96);
    g.destroy();
  }

  _buildSprite(scene, x, y) {
    this.sprite = scene.physics.add.sprite(x, y, 'boss');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(5);
    this.sprite.bossRef = this; // used by WeaponSystem projectiles
    // Expose same API as Enemy so WeaponSystem overlap works unchanged
    this.sprite.enemyRef = this;
  }

  _buildHud(scene) {
    const BAR_W = 580, BAR_X = 400, BAR_Y = 108;

    // Dark panel backing the boss bar
    this._hudPanel = scene.add.rectangle(BAR_X, BAR_Y, BAR_W + 24, 38, 0x080008)
      .setScrollFactor(0).setDepth(23);

    // Boss title
    scene.add.text(112, BAR_Y - 10, 'BOSS  —  THE DARK LORD', {
      fontSize: '10px', fontFamily: 'monospace', color: '#882222',
    }).setScrollFactor(0).setDepth(24);

    // Phase label (right-aligned)
    this._phaseLbl = scene.add.text(688, BAR_Y - 10, 'PHASE 1', {
      fontSize: '10px', fontFamily: 'monospace', color: '#aa4422',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(24);

    // Track background
    scene.add.rectangle(BAR_X, BAR_Y + 8, BAR_W, 14, 0x2a0000)
      .setScrollFactor(0).setDepth(23);

    // Filled bar — left-anchored (origin 0, 0.5)
    this._hpFill = scene.add.rectangle(BAR_X - BAR_W / 2, BAR_Y + 8, BAR_W, 10, 0xcc2222)
      .setScrollFactor(0).setDepth(24).setOrigin(0, 0.5);

    // Phase-break markers at 60 % (300 hp) and 30 % (150 hp)
    const m1 = BAR_X - BAR_W / 2 + BAR_W * 0.60;
    const m2 = BAR_X - BAR_W / 2 + BAR_W * 0.30;
    scene.add.rectangle(m1, BAR_Y + 8, 3, 14, 0xffcc00, 0.9).setScrollFactor(0).setDepth(25);
    scene.add.rectangle(m2, BAR_Y + 8, 3, 14, 0xff6600, 0.9).setScrollFactor(0).setDepth(25);

    this._BAR_W = BAR_W;
    this._BAR_X = BAR_X;
  }

  // ── State logic ─────────────────────────────────────────────────────────────

  _checkPhase() {
    const n = this.health > 300 ? 1 : this.health > 150 ? 2 : 3;
    if (n !== this._phase) this._enterPhase(n);
  }

  _enterPhase(n) {
    this._phase = n;
    this._cfg   = PHASES[n - 1];

    // Aggro reset — new phase charges / shoots immediately
    this._chargeCd = 400;
    this._shootCd  = 600;

    // Camera drama
    this.scene.cameras.main.shake(550, 0.022);
    this.scene.cameras.main.flash(180, 255, 60, 0);

    // Tint burst then settle on phase tint
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(200, () => {
      if (this.sprite.active) this.sprite.setTint(this._cfg.baseTint);
    });

    this._phaseLbl.setText(this._cfg.label).setColor(
      n === 3 ? '#ff5500' : n === 2 ? '#ff8844' : '#aa4422',
    );

    this.scene.events.emit('boss-phase', n);
  }

  _doPatrol(delta) {
    this._patrolTimer -= delta;
    if (this._patrolTimer <= 0 ||
        this.sprite.body.blocked.left ||
        this.sprite.body.blocked.right) {
      this._patrolDir  *= -1;
      this._patrolTimer = 1800 + Math.random() * 1000;
    }
    this.sprite.setVelocityX(this._patrolDir * this._cfg.speed);
    this.sprite.setFlipX(this._patrolDir === -1);
  }

  _doCharge(delta) {
    this._chargeTimer -= delta;
    const dir = this._player.sprite.x > this.sprite.x ? 1 : -1;
    this.sprite.setVelocityX(dir * this._cfg.chaseSpeed);
    this.sprite.setFlipX(dir === -1);

    if (this._chargeTimer <= 0 ||
        this.sprite.body.blocked.left ||
        this.sprite.body.blocked.right) {
      this._state     = 'PATROL';
      this._chargeCd  = 2200;
      this.sprite.setVelocityX(0);
    }
  }

  _doShoot() {
    this.sprite.setVelocityX(0);

    // Build spread angles: single shot or 3-way burst
    const offsets = this._cfg.shootCount === 1 ? [0] : [-0.32, 0, 0.32];
    const dx = (this._player.sprite.x - this.sprite.x) || 1;
    const dy = (this._player.sprite.y - this.sprite.y) || 0;
    const base = Math.atan2(dy, dx);
    const speed = 250;

    offsets.forEach((off, i) => {
      this.scene.time.delayedCall(i * 160, () => {
        if (!this.sprite.active || this._state === 'DEAD') return;
        const a  = base + off;
        const proj = new BossProjectile(
          this.scene, this.sprite.x, this.sprite.y,
          Math.cos(a) * speed, Math.sin(a) * speed,
          this._cfg.contactDamage > 25 ? 14 : 10, // damage scales with phase
        );
        this.projGroup.add(proj.sprite);
        this._projList.push(proj);
      });
    });

    this._state   = 'PATROL';
    this._shootCd = this._cfg.shootRate;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  update(player, delta) {
    if (this._state === 'DEAD') return;
    this._player = player;

    // Tick cooldowns
    this.contactCooldown = Math.max(0, this.contactCooldown - delta);
    this._chargeCd       = Math.max(0, this._chargeCd - delta);
    this._shootCd        = Math.max(0, this._shootCd  - delta);

    // Stun
    if (this._state === 'STUN') {
      this._stunTimer -= delta;
      if (this._stunTimer <= 0) this._state = 'PATROL';
    } else {
      this._checkPhase();

      if (this._state === 'CHARGE') {
        this._doCharge(delta);
      } else if (this._state === 'SHOOT') {
        this._doShoot();
      } else {
        // PATROL — decide next action
        this._doPatrol(delta);
        const dist = Phaser.Math.Distance.Between(
          this.sprite.x, this.sprite.y,
          player.sprite.x, player.sprite.y,
        );
        if (this._chargeCd <= 0 && dist < 380) {
          this._state       = 'CHARGE';
          this._chargeTimer = 1600;
        } else if (this._cfg.shootCount > 0 && this._shootCd <= 0 && dist < 520) {
          this._state = 'SHOOT';
        }
      }
    }

    // Projectile upkeep
    for (let i = this._projList.length - 1; i >= 0; i--) {
      this._projList[i].update();
      if (!this._projList[i].active) this._projList.splice(i, 1);
    }

    this._refreshHpBar();
  }

  receivedHit(amount, knockDir) {
    if (this._state === 'DEAD' || this._state === 'STUN') return;

    this.health = Math.max(0, this.health - amount);

    if (this.health <= 0) { this._die(); return; }

    // Brief stun — shorter in phase 3 (boss becomes harder to stagger)
    this._stunTimer = this._phase === 3 ? 180 : 300;
    this._state     = 'STUN';
    this.sprite.setVelocityX(knockDir * (this._phase === 3 ? 130 : 240));

    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(110, () => {
      if (this.sprite.active) this.sprite.setTint(this._cfg.baseTint);
    });
  }

  _die() {
    this._state = 'DEAD';
    this.sprite.body.enable = false;
    this.sprite.setVelocityX(0);

    // Cascading explosion bursts
    [0, 180, 360, 540, 700].forEach((delay, i) => {
      this.scene.time.delayedCall(delay, () => {
        if (!this.scene) return;
        const ox = (Math.random() - 0.5) * 90;
        const oy = (Math.random() - 0.5) * 70;
        const size = 36 + i * 8;
        const burst = this.scene.add.rectangle(
          this.sprite.x + ox, this.sprite.y + oy, size, size, 0xff4400, 0.9,
        ).setDepth(12);
        this.scene.tweens.add({
          targets: burst, alpha: 0, scaleX: 3.5, scaleY: 3.5,
          duration: 450, ease: 'Power2', onComplete: () => burst.destroy(),
        });
        this.scene.cameras.main.shake(220, 0.014 + i * 0.005);
      });
    });

    // Boss sprite fades and sinks
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0, y: this.sprite.y + 28,
      duration: 900, delay: 750, ease: 'Power2',
      onComplete: () => {
        this.sprite.destroy();
        this._hudPanel?.destroy();
        this.scene.events.emit('boss-dead');
      },
    });
  }

  _refreshHpBar() {
    const ratio = Math.max(0, this.health / this.maxHealth);
    this._hpFill.width    = this._BAR_W * ratio;
    this._hpFill.fillColor = ratio > 0.60 ? 0xcc2222 : ratio > 0.30 ? 0xff6600 : 0xff1111;
  }

  get isDead()       { return this._state === 'DEAD'; }
  get isHittable()   { return this._state !== 'STUN' && this._state !== 'DEAD'; }
  get contactDamage(){ return this._cfg.contactDamage; }
}
