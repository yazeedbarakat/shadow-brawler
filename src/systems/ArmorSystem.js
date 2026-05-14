/* global Phaser */

const MAX_DURABILITY   = 5;
const DAMAGE_REDUCTION = 0.30; // 30 % less damage per hit
const SPEED_FACTOR     = 0.82; // player moves at 82 % of base speed

// ─── Armor Pickup ──────────────────────────────────────────────────────────────

class ArmorPickup {
  constructor(scene, x, y) {
    this.scene  = scene;
    this.active = true;

    const TEX = 'pickup_armor';
    if (!scene.textures.exists(TEX)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });

      // Shield body
      g.fillStyle(0xffcc00);
      g.fillRect(2, 0, 20, 22);

      // Tapered lower half (heraldic point)
      g.fillRect(4, 22, 16, 4);
      g.fillRect(6, 26, 12, 4);
      g.fillRect(8, 30, 8,  4);
      g.fillRect(10, 34, 4, 4);
      g.fillRect(11, 38, 2, 2); // tip

      // Inner highlight
      g.fillStyle(0xffee99);
      g.fillRect(4, 2, 16, 8);

      // Cross emblem
      g.fillStyle(0xaa7700);
      g.fillRect(10, 3,  4, 17); // vertical
      g.fillRect(5,  10, 14, 4); // horizontal

      g.generateTexture(TEX, 24, 40);
      g.destroy();
    }

    this.sprite = scene.physics.add.image(x, y, TEX);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setDepth(3);
    this.sprite.pickupRef = this;

    this._tween = scene.tweens.add({
      targets: this.sprite,
      y: y - 9,
      yoyo: true, repeat: -1,
      duration: 960 + Math.random() * 180,
      ease: 'Sine.easeInOut',
    });

    const baseStyle = { fontFamily: 'monospace', backgroundColor: '#00000099', padding: { x: 3, y: 1 } };
    this._label = scene.add.text(x, y - 28, 'ARMOR', {
      ...baseStyle, fontSize: '10px', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(8);

    this._hint = scene.add.text(x, y - 14, '5-hit shield  F=drop', {
      ...baseStyle, fontSize: '8px', color: '#998800',
    }).setOrigin(0.5).setDepth(8);
  }

  updateLabels() {
    if (!this.active || !this.sprite.active) return;
    this._label.setPosition(this.sprite.x, this.sprite.y - 28);
    this._hint.setPosition(this.sprite.x, this.sprite.y - 14);
  }

  remove() {
    if (!this.active) return;
    this.active = false;
    this._tween?.stop();
    this._label?.destroy();
    this._hint?.destroy();
    this.sprite.destroy();
  }
}

// ─── ArmorSystem ───────────────────────────────────────────────────────────────

export default class ArmorSystem {
  /**
   * @param {Phaser.Scene} scene
   * @param {Player}       player  — must expose `player.armor` and `player.speed`
   */
  constructor(scene, player) {
    this.scene   = scene;
    this._player = player;

    this._equipped   = false;
    this._durability = 0;
    this._outline    = null;   // gold border rectangle that follows player
    this._pickups    = [];

    this._baseSpeed = player.speed; // restored when armor breaks

    // Drop key
    this._dropKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);

    this._pickupGroup = scene.physics.add.group();
    this._setupOverlap();
  }

  // ── One-time setup ────────────────────────────────────────────────────────

  _setupOverlap() {
    this.scene.physics.add.overlap(
      this._player.sprite,
      this._pickupGroup,
      (_, pickupSprite) => {
        const pickup = pickupSprite.pickupRef;
        if (pickup?.active) this._collect(pickup);
      },
    );
  }

  // ── Pickups ───────────────────────────────────────────────────────────────

  /** Spawns a collectible armor pickup at world position (x, y). */
  addPickup(x, y) {
    const pickup = new ArmorPickup(this.scene, x, y);
    this._pickupGroup.add(pickup.sprite);
    this._pickups.push(pickup);
    return pickup;
  }

  _collect(pickup) {
    pickup.remove();
    this._pickups = this._pickups.filter(p => p !== pickup);

    if (this._equipped) {
      // Already armoured — refill instead of re-equipping
      this._durability = MAX_DURABILITY;
      this.scene.events.emit('armor-refilled', { durability: MAX_DURABILITY, max: MAX_DURABILITY });
    } else {
      this._equip();
    }
  }

  // ── Equip / Break ─────────────────────────────────────────────────────────

  _equip() {
    this._equipped   = true;
    this._durability = MAX_DURABILITY;

    // Speed penalty
    this._player.speed = Math.round(this._baseSpeed * SPEED_FACTOR);

    // Gold outline — solid rectangle drawn just behind the player sprite
    const { sprite } = this._player;
    this._outline = this.scene.add.rectangle(
      sprite.x, sprite.y,
      sprite.width + 10, sprite.height + 10,
      0xffcc00,
    ).setDepth(sprite.depth - 0.5);

    // Register with player so takeDamage() routes through interceptHit()
    this._player.armor = this;

    this.scene.events.emit('armor-equipped', { durability: MAX_DURABILITY, max: MAX_DURABILITY });
  }

  _dropArmor() {
    if (!this._equipped) return;
    // Spawn a fresh pickup at the player's feet
    this._break(/* showDrop */ true);
  }

  _break(spawnDrop = false) {
    this._equipped = false;
    this._player.armor = null;
    this._player.speed = this._baseSpeed;

    this._outline?.destroy();
    this._outline = null;

    if (spawnDrop) {
      // Respawn the pickup where the player stands so they can re-equip later
      const { x, y } = this._player.sprite;
      const p = this.addPickup(x, y + 28);
      p.sprite.body.enable = false; // brief grace period
      this.scene.time.delayedCall(700, () => {
        if (p.sprite.active) p.sprite.body.enable = true;
      });
    }

    // Shatter burst
    const { x, y, width, height } = this._player.sprite;
    const burst = this.scene.add
      .rectangle(x, y, width + 18, height + 18, 0xffcc00, 0.9)
      .setDepth(11);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 480, ease: 'Power2',
      onComplete: () => burst.destroy(),
    });

    this.scene.cameras.main.shake(260, 0.011);
    this.scene.events.emit('armor-broken');
  }

  // ── Called by Player.takeDamage() ─────────────────────────────────────────

  /**
   * Intercepts an incoming hit:
   *   - Reduces the damage by DAMAGE_REDUCTION
   *   - Decrements durability; shatters on the 5th hit
   * Returns the final (reduced) damage to apply to health.
   */
  interceptHit(rawAmount) {
    this._durability = Math.max(0, this._durability - 1);
    // Notify HUD via event — HUD listens to 'armor-hit' and refreshes pips
    this.scene.events.emit('armor-hit', { durability: this._durability, max: MAX_DURABILITY });

    if (this._durability <= 0) this._break();

    return Math.max(1, Math.round(rawAmount * (1 - DAMAGE_REDUCTION)));
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  update() {
    // G key — drop armor back to the ground
    if (Phaser.Input.Keyboard.JustDown(this._dropKey) && this._equipped) {
      this._dropArmor();
    }

    // Gold outline tracks the player sprite
    if (this._outline && this._player.sprite.active) {
      this._outline.setPosition(this._player.sprite.x, this._player.sprite.y);
    }

    // Animate pickup labels
    for (const p of this._pickups) p.updateLabels();
  }

  get isEquipped()  { return this._equipped; }
  get durability()  { return this._durability; }
}
