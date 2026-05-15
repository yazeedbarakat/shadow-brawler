/* global Phaser */

// ─── Weapon definitions ────────────────────────────────────────────────────────

const WEAPONS = {
  sword: {
    label: 'SWORD',
    desc:  'C=swing  F=drop',
    color: 0x99aaff,
    w: 10, h: 40,
  },
  pipe: {
    label: 'PIPE',
    desc:  'Z=smash(x2 dmg)  F=drop',
    color: 0xbbbbbb,
    w: 10, h: 34,
  },
  throwingstar: {
    label: 'STAR',
    desc:  'Z=throw  F=drop',
    color: 0xffee55,
    w: 20, h: 20,
  },
};

// ─── Throwing Star Projectile ─────────────────────────────────────────────────

class Projectile {
  constructor(scene, x, y, direction) {
    this.scene     = scene;
    this.direction = direction;
    this.damage    = 18;
    this.active    = true;

    if (!scene.textures.exists('proj_star')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffee55);
      g.fillRect(6, 0, 4, 16);  // vertical spike
      g.fillRect(0, 6, 16, 4);  // horizontal spike
      g.fillStyle(0xffcc00);
      g.fillRect(2, 2, 4, 4);   // corner blades
      g.fillRect(10, 2, 4, 4);
      g.fillRect(2, 10, 4, 4);
      g.fillRect(10, 10, 4, 4);
      g.fillStyle(0xffffff);
      g.fillRect(6, 6, 4, 4);   // center highlight
      g.generateTexture('proj_star', 16, 16);
      g.destroy();
    }

    this.sprite = scene.physics.add.image(x, y, 'proj_star');
    this.sprite.body.setAllowGravity(false);
    this.sprite.setVelocityX(direction * 520);
    this.sprite.setDepth(7);
    this.sprite.projectileRef = this;
  }

  update() {
    if (!this.sprite.active) return;
    this.sprite.rotation += 0.16 * this.direction;

    const b = this.scene.physics.world.bounds;
    if (this.sprite.x < b.left - 60 || this.sprite.x > b.right + 60) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.active) return;
    this.active = false;
    // Impact burst
    const burst = this.scene.add.rectangle(
      this.sprite.x, this.sprite.y, 20, 20, 0xffee55, 0.85,
    ).setDepth(9);
    this.scene.tweens.add({
      targets: burst,
      alpha: 0, scaleX: 2.8, scaleY: 2.8,
      duration: 190, ease: 'Power2',
      onComplete: () => burst.destroy(),
    });
    this.sprite.destroy();
  }
}

// ─── Weapon Pickup ─────────────────────────────────────────────────────────────

class WeaponPickup {
  constructor(scene, x, y, type) {
    this.scene  = scene;
    this.type   = type;
    this.active = true;

    const def    = WEAPONS[type];
    const texKey = `pickup_${type}`;
    const tw = def.w + 4, th = def.h + 4; // texture includes 2px padding each side

    if (!scene.textures.exists(texKey)) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      this._drawShape(g, type, def);
      g.generateTexture(texKey, tw, th);
      g.destroy();
    }

    // Physics image — gravity off so it stays put, pickup via overlap
    this.sprite = scene.physics.add.image(x, y, texKey);
    this.sprite.body.setAllowGravity(false);
    this.sprite.setDepth(3);
    this.sprite.pickupRef = this;

    // Float animation
    this._tween = scene.tweens.add({
      targets: this.sprite,
      y: y - 8,
      yoyo: true, repeat: -1,
      duration: 880 + Math.random() * 220,
      ease: 'Sine.easeInOut',
    });

    // Label (weapon name) and hint (what it does)
    const style = { fontFamily: 'monospace', backgroundColor: '#00000099', padding: { x: 3, y: 1 } };
    this._label = scene.add.text(x, y - def.h / 2 - 18, def.label, {
      ...style, fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(8);

    this._hint = scene.add.text(x, y - def.h / 2 - 6, def.desc, {
      ...style, fontSize: '8px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(8);
  }

  // Draw a recognisable weapon silhouette inside the texture canvas (2px padding)
  _drawShape(g, type, def) {
    const { color, w, h } = def;
    const px = 2, py = 2;

    if (type === 'sword') {
      // Blade
      g.fillStyle(color);
      g.fillRect(px + w / 2 - 2, py, 4, h - 12);
      // Tip highlight
      g.fillStyle(0xccddff);
      g.fillRect(px + w / 2 - 1, py, 2, 5);
      // Cross-guard
      g.fillStyle(0xddaa44);
      g.fillRect(px, py + h - 14, w, 5);
      // Handle
      g.fillStyle(0x885533);
      g.fillRect(px + w / 2 - 2, py + h - 9, 4, 9);

    } else if (type === 'pipe') {
      // Main tube body
      g.fillStyle(color);
      g.fillRect(px + w / 2 - 3, py, 6, h);
      // Shine stripe
      g.fillStyle(0xdddddd);
      g.fillRect(px + w / 2 - 3, py, 2, h);
      // End caps
      g.fillStyle(0x666677);
      g.fillRect(px + w / 2 - 4, py, 8, 5);
      g.fillRect(px + w / 2 - 4, py + h - 5, 8, 5);

    } else if (type === 'throwingstar') {
      // Four-pointed star: cross shape + corner blades
      g.fillStyle(color);
      g.fillRect(px + w / 2 - 2, py, 4, h);       // vertical spike
      g.fillRect(px, py + h / 2 - 2, w, 4);        // horizontal spike
      g.fillStyle(0xffcc00);
      g.fillRect(px + 2, py + 2, 5, 5);            // corner blades
      g.fillRect(px + w - 7, py + 2, 5, 5);
      g.fillRect(px + 2, py + h - 7, 5, 5);
      g.fillRect(px + w - 7, py + h - 7, 5, 5);
      g.fillStyle(0xffffff);
      g.fillRect(px + w / 2 - 2, py + h / 2 - 2, 4, 4); // center
    }
  }

  // Update floating label/hint Y to track the sprite's animated Y
  updateLabels() {
    if (!this.active || !this.sprite.active) return;
    const topY = this.sprite.y - WEAPONS[this.type].h / 2;
    this._label?.setPosition(this.sprite.x, topY - 18);
    this._hint?.setPosition(this.sprite.x, topY - 6);
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

// ─── WeaponSystem ──────────────────────────────────────────────────────────────

export default class WeaponSystem {
  constructor(scene, player) {
    this.scene  = scene;
    this.player = player;

    this._pickups     = [];      // WeaponPickup[]
    this._projectiles = [];      // Projectile[]
    this._flash       = null;    // melee effect rect

    // Physics groups — one overlap registered per group covers all members
    this._pickupGroup = scene.physics.add.group();
    this._projGroup   = scene.physics.add.group();

    // F key drops / swaps current weapon
    this._dropKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    this._setupPickupOverlap();
    this._listenEvents();
  }

  // ── One-time setup ────────────────────────────────────────────────────────

  _setupPickupOverlap() {
    this.scene.physics.add.overlap(
      this.player.sprite,
      this._pickupGroup,
      (_pSprite, pickupSprite) => {
        const pickup = pickupSprite.pickupRef;
        if (pickup?.active) this._collect(pickup);
      },
    );
  }

  _listenEvents() {
    // Melee attack flash (carries over from old WeaponSystem)
    this.scene.events.on('player-attack', d => this._showMeleeEffect(d));
    // Throw star
    this.scene.events.on('player-throw',  d => this._fireProjectile(d));
  }

  /**
   * Call after enemies are created so projectiles can hit them.
   * @param {Phaser.Physics.Arcade.Group} enemyGroup
   * @param {function} onKill  — called with the killed Enemy instance
   */
  setupProjectileOverlaps(enemyGroup, onKill) {
    this.scene.physics.add.overlap(
      this._projGroup,
      enemyGroup,
      (projSprite, enemySprite) => {
        const proj  = projSprite.projectileRef;
        const enemy = enemySprite.enemyRef;
        if (!proj?.active || !enemy || enemy.isDead) return;
        const knockDir = projSprite.x < enemySprite.x ? 1 : -1;
        enemy.receivedHit(proj.damage, knockDir);
        proj.destroy();
        if (enemy.isDead && onKill) onKill(enemy);
      },
    );
  }

  // ── Pickup management ─────────────────────────────────────────────────────

  /** Place a weapon on the ground at (x, y). Returns the WeaponPickup. */
  addPickup(x, y, type) {
    const pickup = new WeaponPickup(this.scene, x, y, type);
    this._pickupGroup.add(pickup.sprite);
    this._pickups.push(pickup);
    return pickup;
  }

  _collect(pickup) {
    const current = this.player.equippedWeapon;

    // Swap: drop held weapon exactly where this pickup sits, then take the new one
    if (current) {
      this._spawnDrop(pickup.sprite.x, pickup.sprite.y, current);
    }

    pickup.remove();
    this._pickups = this._pickups.filter(p => p !== pickup);
    this.player.equipWeapon(pickup.type);
  }

  _spawnDrop(x, y, type) {
    const pickup = this.addPickup(x, y, type);

    // 700 ms grace period — prevents immediately re-picking up what you just dropped
    pickup.sprite.body.enable = false;
    this.scene.time.delayedCall(700, () => {
      if (pickup.sprite.active) pickup.sprite.body.enable = true;
    });
  }

  _dropCurrentWeapon() {
    const type = this.player.unequipWeapon();
    if (!type) return;
    this._spawnDrop(this.player.sprite.x, this.player.sprite.y + 24, type);
  }

  // ── Projectiles ───────────────────────────────────────────────────────────

  _fireProjectile({ x, y, facing }) {
    // Spawn slightly in front of the player so it doesn't overlap the sprite
    const proj = new Projectile(this.scene, x + facing * 24, y, facing);
    this._projGroup.add(proj.sprite);
    this._projectiles.push(proj);
  }

  // ── Visual effects ────────────────────────────────────────────────────────

  _showMeleeEffect({ x, y, w, h, attackType }) {
    const STYLES = {
      ATTACK_1:     { color: 0xffaa33, alpha: 0.80, dur: 160, scaleEnd: 1.5 },
      ATTACK_2:     { color: 0xff5533, alpha: 0.75, dur: 160, scaleEnd: 1.6 },
      ATTACK_3:     { color: 0xffee00, alpha: 0.90, dur: 220, scaleEnd: 1.9 },
      ATTACK_HEAVY: { color: 0xff2200, alpha: 0.95, dur: 280, scaleEnd: 2.2 },
      ATTACK_AIR:   { color: 0xffaa33, alpha: 0.80, dur: 160, scaleEnd: 1.5 },
      ATTACK_DASH:  { color: 0xff8800, alpha: 0.85, dur: 200, scaleEnd: 2.0 },
      COUNTER:      { color: 0xffffff, alpha: 1.00, dur: 300, scaleEnd: 2.5 },
    };
    const { color, alpha, dur, scaleEnd } = STYLES[attackType] ?? STYLES.ATTACK_1;

    if (this._flash) { this._flash.destroy(); this._flash = null; }
    this._flash = this.scene.add.rectangle(x, y, w, h, color, alpha).setDepth(8);
    this.scene.tweens.add({
      targets: this._flash,
      alpha: 0, scaleX: scaleEnd, scaleY: scaleEnd,
      duration: dur, ease: 'Power2',
      onComplete: () => { this._flash?.destroy(); this._flash = null; },
    });
  }

  // ── Per-frame update (called from Level1Scene.update) ─────────────────────

  update() {
    // F key — drop current weapon
    if (Phaser.Input.Keyboard.JustDown(this._dropKey)) {
      this._dropCurrentWeapon();
    }

    // Advance + prune projectiles
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      p.update();
      if (!p.active) this._projectiles.splice(i, 1);
    }

    // Float pickup labels to track their animated sprites
    for (const p of this._pickups) p.updateLabels();
  }
}
