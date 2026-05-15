/* global Phaser */

// Width of the full health bar in pixels
const HP_W = 184;

// Weapon icon descriptors — shapes drawn programmatically inside the slot
const WEAPON_ICONS = {
  sword: {
    label: 'SWORD',
    hint:  'C=swing  F=drop',
    color: '#99aaff',
    draw(scene, cx, cy, sf, d) {
      return [
        scene.add.rectangle(cx, cy - 5, 4, 18, 0x99aaff).setScrollFactor(sf).setDepth(d), // blade
        scene.add.rectangle(cx, cy + 6, 18, 4,  0xddaa44).setScrollFactor(sf).setDepth(d), // guard
        scene.add.rectangle(cx, cy + 12, 4, 8,  0x885533).setScrollFactor(sf).setDepth(d), // handle
        scene.add.rectangle(cx, cy - 13, 2, 4,  0xccddff).setScrollFactor(sf).setDepth(d), // tip
      ];
    },
  },
  pipe: {
    label: 'PIPE',
    hint:  'Z=smash (x2 dmg)  F=drop',
    color: '#cccccc',
    draw(scene, cx, cy, sf, d) {
      return [
        scene.add.rectangle(cx, cy,      28, 8,  0xbbbbbb).setScrollFactor(sf).setDepth(d), // body
        scene.add.rectangle(cx - 13, cy,  5, 14, 0x888888).setScrollFactor(sf).setDepth(d), // left cap
        scene.add.rectangle(cx + 13, cy,  5, 14, 0x888888).setScrollFactor(sf).setDepth(d), // right cap
        scene.add.rectangle(cx,      cy - 3, 28, 2, 0xdddddd).setScrollFactor(sf).setDepth(d), // shine
      ];
    },
  },
  throwingstar: {
    label: 'STAR',
    hint:  'Z=throw  F=drop',
    color: '#ffee55',
    draw(scene, cx, cy, sf, d) {
      return [
        scene.add.rectangle(cx, cy, 5, 22, 0xffee55).setScrollFactor(sf).setDepth(d),     // vertical spike
        scene.add.rectangle(cx, cy, 22, 5, 0xffee55).setScrollFactor(sf).setDepth(d),     // horizontal spike
        scene.add.rectangle(cx - 7, cy - 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d), // corners
        scene.add.rectangle(cx + 7, cy - 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx - 7, cy + 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx + 7, cy + 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx, cy, 7, 7, 0xffffff).setScrollFactor(sf).setDepth(d + 1),  // center gem
      ];
    },
  },
};

export default class HUD {
  /**
   * @param {Phaser.Scene} scene
   * @param {string}       levelName   — displayed top-center, e.g. "LEVEL 1 — CITY STREETS"
   */
  constructor(scene, levelName = '') {
    this._scene     = scene;
    this._iconRects = [];  // current weapon icon game objects
    this._comboCount = 0;
    this._comboClearTimer = null;

    this._build(levelName);
    this._listenEvents();
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  _build(_levelName) {
    const sf = 0;
    const D  = 20;

    // ── Pixel-art skull icon ─────────────────────────────────────────────────
    const BONE = 0xbdb0a0;
    const VOID = 0x050505;
    const sx = 16, sy = 21;
    // Cranium
    this._scene.add.rectangle(sx,     sy - 8, 10, 4,  BONE).setScrollFactor(sf).setDepth(D + 2);
    this._scene.add.rectangle(sx,     sy - 4, 14, 8,  BONE).setScrollFactor(sf).setDepth(D + 2);
    // Eye sockets
    this._scene.add.rectangle(sx - 4, sy - 3, 4, 5, VOID).setScrollFactor(sf).setDepth(D + 3);
    this._scene.add.rectangle(sx + 4, sy - 3, 4, 5, VOID).setScrollFactor(sf).setDepth(D + 3);
    // Nose
    this._scene.add.rectangle(sx,     sy + 1, 2, 3, VOID, 0.7).setScrollFactor(sf).setDepth(D + 3);
    // Jaw
    this._scene.add.rectangle(sx,     sy + 5, 12, 5, BONE).setScrollFactor(sf).setDepth(D + 2);
    // Teeth gaps
    this._scene.add.rectangle(sx - 4, sy + 6, 2, 5, VOID).setScrollFactor(sf).setDepth(D + 3);
    this._scene.add.rectangle(sx,     sy + 6, 2, 5, VOID).setScrollFactor(sf).setDepth(D + 3);
    this._scene.add.rectangle(sx + 4, sy + 6, 2, 5, VOID).setScrollFactor(sf).setDepth(D + 3);

    // ── Gothic vitality bar ──────────────────────────────────────────────────
    const barX = 28, barY = 21;

    // Outer iron frame
    this._scene.add.rectangle(barX + HP_W / 2 + 1, barY, HP_W + 10, 20, 0x0a0a0a)
      .setScrollFactor(sf).setDepth(D).setOrigin(0.5, 0.5);
    // Inner dark channel
    this._scene.add.rectangle(barX + HP_W / 2 + 1, barY, HP_W + 2, 13, 0x1a0202)
      .setScrollFactor(sf).setDepth(D + 1).setOrigin(0.5, 0.5);

    // Blood fill — left-anchored so it shrinks from the right
    this._hpFill = this._scene.add.rectangle(barX + 2, barY, HP_W, 13, 0x8b0000)
      .setScrollFactor(sf).setDepth(D + 2).setOrigin(0, 0.5);

    // Gloss shimmer on top of fill
    this._hpShine = this._scene.add.rectangle(barX + 2, barY - 4, HP_W, 3, 0xff3333, 0.28)
      .setScrollFactor(sf).setDepth(D + 3).setOrigin(0, 0.5);

    // Ornamental divider ticks
    for (let t = 1; t < 5; t++) {
      this._scene.add.rectangle(barX + 2 + (HP_W / 5) * t, barY, 1, 13, 0x0a0a0a, 0.55)
        .setScrollFactor(sf).setDepth(D + 4);
    }

    // ── Armor pips (hidden until equipped) ───────────────────────────────────
    this._armorLabel = this._scene.add.text(barX, 37, 'ARMOR', {
      fontSize: '9px', fontFamily: 'monospace', color: '#997700',
    }).setScrollFactor(sf).setDepth(D + 3).setAlpha(0);

    this._pips = Array.from({ length: 5 }, (_, i) =>
      this._scene.add.rectangle(barX + 36 + i * 19, 43, 15, 9, 0xffcc00)
        .setScrollFactor(sf).setDepth(D + 2).setAlpha(0),
    );

    // ── Weapon slot (top-right) ───────────────────────────────────────────────
    const slotX = 757, slotY = 27;
    this._scene.add.rectangle(slotX, slotY, 70, 52, 0x080c14)
      .setScrollFactor(sf).setDepth(D);
    this._scene.add.rectangle(slotX, slotY, 66, 48, 0x0e1824)
      .setScrollFactor(sf).setDepth(D + 1);
    this._emptySlot = this._scene.add.text(slotX, slotY - 4, '---', {
      fontSize: '14px', fontFamily: 'monospace', color: '#1a2a3a',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 3);
    this._slotLabel = this._scene.add.text(slotX, slotY + 17, 'Z:PUNCH\nX:KICK', {
      fontSize: '7px', fontFamily: 'monospace', color: '#2a4455', align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 3);

    this._slotX = slotX;
    this._slotY = slotY - 8;

    // ── Combo counter (center-screen, hidden until 3+ hits) ──────────────────
    this._comboTxt = this._scene.add.text(400, 185, '', {
      fontSize: '28px', fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 4).setAlpha(0);
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  _listenEvents() {
    const ev = this._scene.events;
    ev.on('weapon-changed',  t  => this._onWeaponChanged(t));
    ev.on('armor-equipped',  d  => this._onArmorEquipped(d));
    ev.on('armor-hit',       d  => this._onArmorHit(d));
    ev.on('armor-broken',    () => this._onArmorBroken());
    ev.on('armor-refilled',  d  => this._onArmorRefilled(d));
    ev.on('combo-hit',       () => this._onComboHit());
    ev.on('combo-reset',     () => this._onComboReset());
  }

  // ── Combo counter ─────────────────────────────────────────────────────────

  _onComboHit() {
    this._comboCount++;

    // Only display when the streak reaches 3 or more
    if (this._comboCount < 3) return;

    const n = this._comboCount;
    let color, size;
    if      (n >= 15) { color = '#ff2200'; size = '38px'; }
    else if (n >= 10) { color = '#ff7700'; size = '34px'; }
    else if (n >=  7) { color = '#ffee00'; size = '31px'; }
    else if (n >=  5) { color = '#ffff55'; size = '30px'; }
    else              { color = '#ffffff'; size = '28px'; }

    const label = n >= 10 ? 'COMBO!!' : n >= 5 ? 'COMBO!' : 'HITS';
    this._comboTxt
      .setText(`${n} ${label}`)
      .setFontSize(size)
      .setColor(color)
      .setAlpha(1)
      .setScale(1);

    // Punch-in scale pop
    this._scene.tweens.killTweensOf(this._comboTxt);
    this._scene.tweens.add({
      targets: this._comboTxt,
      scaleX: 1.22, scaleY: 1.22,
      duration: 70, yoyo: true, ease: 'Power2',
    });

    // Auto-fade after 1.8 s of no new hits
    if (this._comboClearTimer) this._comboClearTimer.remove();
    this._comboClearTimer = this._scene.time.delayedCall(1800, () => {
      this._fadeCombo();
    });
  }

  _onComboReset() {
    if (this._comboCount >= 3) this._fadeCombo();
    this._comboCount = 0;
    if (this._comboClearTimer) { this._comboClearTimer.remove(); this._comboClearTimer = null; }
  }

  _fadeCombo() {
    this._scene.tweens.killTweensOf(this._comboTxt);
    this._scene.tweens.add({
      targets: this._comboTxt, alpha: 0, duration: 300, ease: 'Power2',
    });
  }

  // ── Armor pip helpers ─────────────────────────────────────────────────────

  _showArmorRow(visible) {
    const a = visible ? 1 : 0;
    this._armorLabel.setAlpha(a);
    this._pips.forEach(p => p.setAlpha(a));
  }

  _refreshPips(durability) {
    this._pips.forEach((pip, i) => {
      const alive = i < durability;
      pip.setFillStyle(alive ? 0xffcc00 : 0x442200);
      pip.setAlpha(alive ? 1.0 : 0.28);
    });
  }

  _onArmorEquipped({ durability, max: _max }) {
    this._showArmorRow(true);
    this._refreshPips(durability);
  }

  _onArmorHit({ durability }) {
    this._refreshPips(durability);
  }

  _onArmorBroken() {
    this._refreshPips(0);
    // Dim pips briefly, then hide the whole row
    this._scene.time.delayedCall(900, () => this._showArmorRow(false));
  }

  _onArmorRefilled({ durability }) {
    this._refreshPips(durability);
  }

  // ── Weapon icon ───────────────────────────────────────────────────────────

  _onWeaponChanged(type) {
    // Destroy previous icon rects
    this._iconRects.forEach(r => r?.destroy());
    this._iconRects = [];

    const def = WEAPON_ICONS[type];

    if (!def) {
      // No weapon — show empty slot
      this._emptySlot.setAlpha(1);
      this._slotLabel.setText('Z:PUNCH\nX:KICK').setColor('#2a4455');
      return;
    }

    this._emptySlot.setAlpha(0);
    this._iconRects = def.draw(this._scene, this._slotX, this._slotY, 0, 23);
    this._slotLabel.setText(def.hint).setColor(def.color);
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  /** Call this every frame from the scene's update(). */
  update(player) {
    const hp = Math.max(0, player.health / player.maxHealth);
    this._hpFill.width     = HP_W * hp;
    this._hpShine.width    = HP_W * hp;
    this._hpFill.fillColor = hp > 0.5 ? 0x8b0000 : hp > 0.25 ? 0x993300 : 0xcc1100;
  }
}
