/* global Phaser */

const HP_W = 190;   // full-width of the HP bar fill
const SP_W = 190;   // full-width of the SP bar fill

// Weapon icon descriptors — shapes drawn programmatically inside the slot
const WEAPON_ICONS = {
  sword: {
    label: 'SWORD',
    hint:  'C=swing  F=drop',
    color: '#99aaff',
    draw(scene, cx, cy, sf, d) {
      return [
        scene.add.rectangle(cx, cy - 5, 4, 18, 0x99aaff).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx, cy + 6, 18, 4,  0xddaa44).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx, cy + 12, 4, 8,  0x885533).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx, cy - 13, 2, 4,  0xccddff).setScrollFactor(sf).setDepth(d),
      ];
    },
  },
  pipe: {
    label: 'PIPE',
    hint:  'Z=smash (x2 dmg)  F=drop',
    color: '#cccccc',
    draw(scene, cx, cy, sf, d) {
      return [
        scene.add.rectangle(cx, cy,      28, 8,  0xbbbbbb).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx - 13, cy,  5, 14, 0x888888).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx + 13, cy,  5, 14, 0x888888).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx,      cy - 3, 28, 2, 0xdddddd).setScrollFactor(sf).setDepth(d),
      ];
    },
  },
  throwingstar: {
    label: 'STAR',
    hint:  'Z=throw  F=drop',
    color: '#ffee55',
    draw(scene, cx, cy, sf, d) {
      return [
        scene.add.rectangle(cx, cy, 5, 22, 0xffee55).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx, cy, 22, 5, 0xffee55).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx - 7, cy - 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx + 7, cy - 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx - 7, cy + 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx + 7, cy + 7, 5, 5, 0xffcc00).setScrollFactor(sf).setDepth(d),
        scene.add.rectangle(cx, cy, 7, 7, 0xffffff).setScrollFactor(sf).setDepth(d + 1),
      ];
    },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Draw a hollow rectangle border using 4 thin filled rects. */
function border(scene, cx, cy, w, h, thickness, color, alpha, sf, depth) {
  const t = thickness;
  const objs = [
    scene.add.rectangle(cx,         cy - h/2 + t/2, w,     t, color, alpha),
    scene.add.rectangle(cx,         cy + h/2 - t/2, w,     t, color, alpha),
    scene.add.rectangle(cx - w/2 + t/2, cy,          t, h, color, alpha),
    scene.add.rectangle(cx + w/2 - t/2, cy,          t, h, color, alpha),
  ];
  objs.forEach(o => o.setScrollFactor(sf).setDepth(depth));
  return objs;
}

export default class HUD {
  constructor(scene, levelName = '') {
    this._scene      = scene;
    this._iconRects  = [];
    this._comboCount = 0;
    this._comboClearTimer = null;

    this._build(levelName);
    this._listenEvents();
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  _build(_levelName) {
    const sf = 0;
    const D  = 20;

    // ── Panel geometry ──────────────────────────────────────────────────────
    const PX = 8, PY = 8;    // top-left of panel
    const PW = 270, PH = 60; // panel width / height
    const PCX = PX + PW / 2, PCY = PY + PH / 2;

    // ── Panel background ────────────────────────────────────────────────────
    // Drop shadow
    this._scene.add.rectangle(PCX + 3, PCY + 3, PW + 8, PH + 8, 0x000000, 0.55)
      .setScrollFactor(sf).setDepth(D);
    // Main dark iron bg
    this._scene.add.rectangle(PCX, PCY, PW, PH, 0x0d0808)
      .setScrollFactor(sf).setDepth(D + 1);
    // Subtle inner warm tint
    this._scene.add.rectangle(PCX, PCY, PW - 4, PH - 4, 0x150c0c)
      .setScrollFactor(sf).setDepth(D + 2);

    // Outer gold border
    border(this._scene, PCX, PCY, PW, PH, 2, 0xb8860b, 1, sf, D + 3);
    // Inner thin gold inset
    border(this._scene, PCX, PCY, PW - 6, PH - 6, 1, 0x8b6914, 0.7, sf, D + 3);

    // Corner accent squares (gold)
    const corners = [
      [PX + 2, PY + 2], [PX + PW - 2, PY + 2],
      [PX + 2, PY + PH - 2], [PX + PW - 2, PY + PH - 2],
    ];
    corners.forEach(([cx, cy]) => {
      this._scene.add.rectangle(cx, cy, 5, 5, 0xdaa520)
        .setScrollFactor(sf).setDepth(D + 4);
    });

    // ── Circular skull emblem ───────────────────────────────────────────────
    const embX = PX + 32, embY = PCY;

    // Glow behind emblem
    this._scene.add.circle(embX, embY, 26, 0x440000, 0.6)
      .setScrollFactor(sf).setDepth(D + 3);
    // Gold ring outer
    this._scene.add.circle(embX, embY, 24, 0xb8860b)
      .setScrollFactor(sf).setDepth(D + 4);
    // Gold ring highlight ring
    this._scene.add.circle(embX, embY, 22, 0xdaa520)
      .setScrollFactor(sf).setDepth(D + 5);
    // Dark face bg
    this._scene.add.circle(embX, embY, 20, 0x1a0404)
      .setScrollFactor(sf).setDepth(D + 6);

    // Pixel skull
    const BONE = 0xc8b49a, VOID = 0x050505;
    const sx = embX, sy = embY - 1;
    // Cranium
    this._scene.add.rectangle(sx,     sy - 8, 10, 4,  BONE).setScrollFactor(sf).setDepth(D + 7);
    this._scene.add.rectangle(sx,     sy - 4, 14, 8,  BONE).setScrollFactor(sf).setDepth(D + 7);
    // Eye sockets
    this._scene.add.rectangle(sx - 4, sy - 3,  4, 5, VOID).setScrollFactor(sf).setDepth(D + 8);
    this._scene.add.rectangle(sx + 4, sy - 3,  4, 5, VOID).setScrollFactor(sf).setDepth(D + 8);
    // Nose
    this._scene.add.rectangle(sx,     sy + 1,  2, 3, VOID, 0.8).setScrollFactor(sf).setDepth(D + 8);
    // Jaw
    this._scene.add.rectangle(sx,     sy + 5, 12, 5,  BONE).setScrollFactor(sf).setDepth(D + 7);
    // Teeth gaps
    this._scene.add.rectangle(sx - 4, sy + 7,  2, 5, VOID).setScrollFactor(sf).setDepth(D + 8);
    this._scene.add.rectangle(sx,     sy + 7,  2, 5, VOID).setScrollFactor(sf).setDepth(D + 8);
    this._scene.add.rectangle(sx + 4, sy + 7,  2, 5, VOID).setScrollFactor(sf).setDepth(D + 8);
    // Red eye glow
    this._scene.add.circle(sx - 4, sy - 2, 2, 0xff2200, 0.55).setScrollFactor(sf).setDepth(D + 9);
    this._scene.add.circle(sx + 4, sy - 2, 2, 0xff2200, 0.55).setScrollFactor(sf).setDepth(D + 9);

    // Separator between emblem and bars
    this._scene.add.rectangle(PX + 58, PCY, 2, PH - 10, 0x6b4f10, 0.6)
      .setScrollFactor(sf).setDepth(D + 4);

    // ── HP bar ──────────────────────────────────────────────────────────────
    const barX = PX + 64;
    const hpY  = PY + 19;
    const barH = 16;

    // HP label
    this._scene.add.text(barX, hpY - 11, 'HP', {
      fontSize: '9px', fontFamily: 'monospace',
      color: '#cc3333', stroke: '#000000', strokeThickness: 2,
    }).setScrollFactor(sf).setDepth(D + 5);

    // Bar dark channel
    this._scene.add.rectangle(barX + HP_W / 2, hpY, HP_W + 4, barH + 4, 0x000000)
      .setScrollFactor(sf).setDepth(D + 4).setOrigin(0.5, 0.5);
    this._scene.add.rectangle(barX + HP_W / 2, hpY, HP_W + 2, barH + 2, 0x1a0202)
      .setScrollFactor(sf).setDepth(D + 5).setOrigin(0.5, 0.5);

    // HP fill — left-anchored, shrinks right
    this._hpFill = this._scene.add.rectangle(barX, hpY, HP_W, barH, 0x8b0000)
      .setScrollFactor(sf).setDepth(D + 6).setOrigin(0, 0.5);

    // Bright glowing shimmer band at top of fill
    this._hpShine = this._scene.add.rectangle(barX, hpY - 5, HP_W, 3, 0xff4444, 0.55)
      .setScrollFactor(sf).setDepth(D + 7).setOrigin(0, 0.5);

    // Dark lower shadow inside bar
    this._scene.add.rectangle(barX + HP_W / 2, hpY + barH / 2 - 2, HP_W, 3, 0x000000, 0.35)
      .setScrollFactor(sf).setDepth(D + 7).setOrigin(0.5, 0.5);

    // Gold frame around HP bar
    border(this._scene, barX + HP_W / 2, hpY, HP_W + 6, barH + 6, 1, 0xb8860b, 1, sf, D + 8);

    // End cap diamond
    this._scene.add.rectangle(barX + HP_W + 5, hpY, 8, 8, 0xdaa520, 0.9)
      .setScrollFactor(sf).setDepth(D + 8).setAngle(45);

    // Divider ticks
    for (let t = 1; t < 5; t++) {
      this._scene.add.rectangle(barX + (HP_W / 5) * t, hpY, 1, barH, 0x000000, 0.45)
        .setScrollFactor(sf).setDepth(D + 9);
    }

    // ── SP bar ──────────────────────────────────────────────────────────────
    const spY  = PY + PH - 16;
    const spH  = 10;

    // SP label
    this._scene.add.text(barX, spY - 9, 'SP', {
      fontSize: '9px', fontFamily: 'monospace',
      color: '#22ccaa', stroke: '#000000', strokeThickness: 2,
    }).setScrollFactor(sf).setDepth(D + 5);

    // Bar dark channel
    this._scene.add.rectangle(barX + SP_W / 2, spY, SP_W + 4, spH + 4, 0x000000)
      .setScrollFactor(sf).setDepth(D + 4).setOrigin(0.5, 0.5);
    this._scene.add.rectangle(barX + SP_W / 2, spY, SP_W + 2, spH + 2, 0x020d0d)
      .setScrollFactor(sf).setDepth(D + 5).setOrigin(0.5, 0.5);

    // SP fill
    this._spFill = this._scene.add.rectangle(barX, spY, SP_W, spH, 0x007755)
      .setScrollFactor(sf).setDepth(D + 6).setOrigin(0, 0.5);

    // Teal shimmer
    this._spShine = this._scene.add.rectangle(barX, spY - 3, SP_W, 2, 0x44ffcc, 0.5)
      .setScrollFactor(sf).setDepth(D + 7).setOrigin(0, 0.5);

    // Gold frame around SP bar
    border(this._scene, barX + SP_W / 2, spY, SP_W + 6, spH + 6, 1, 0xb8860b, 0.7, sf, D + 8);

    // End cap diamond
    this._scene.add.rectangle(barX + SP_W + 5, spY, 6, 6, 0x8b6914, 0.85)
      .setScrollFactor(sf).setDepth(D + 8).setAngle(45);

    // Store for update()
    this._barX = barX;

    // ── Pulsing shimmer animation ───────────────────────────────────────────
    this._scene.tweens.add({
      targets: [this._hpShine, this._spShine],
      alpha: { from: 0.15, to: 0.7 },
      duration: 850, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Armor pips ──────────────────────────────────────────────────────────
    this._armorLabel = this._scene.add.text(barX, PY + PH + 4, 'ARMOR', {
      fontSize: '9px', fontFamily: 'monospace', color: '#997700',
    }).setScrollFactor(sf).setDepth(D + 3).setAlpha(0);

    this._pips = Array.from({ length: 5 }, (_, i) =>
      this._scene.add.rectangle(barX + 36 + i * 19, PY + PH + 14, 15, 9, 0xffcc00)
        .setScrollFactor(sf).setDepth(D + 2).setAlpha(0),
    );

    // ── Weapon slot (top-right, gold-framed) ────────────────────────────────
    const slotX = 757, slotY = 27;
    // Outer gold frame
    this._scene.add.rectangle(slotX, slotY, 78, 60, 0xb8860b)
      .setScrollFactor(sf).setDepth(D);
    // Second gold ring
    this._scene.add.rectangle(slotX, slotY, 74, 56, 0x8b6914)
      .setScrollFactor(sf).setDepth(D + 1);
    // Dark interior
    this._scene.add.rectangle(slotX, slotY, 70, 52, 0x080c14)
      .setScrollFactor(sf).setDepth(D + 2);
    this._scene.add.rectangle(slotX, slotY, 66, 48, 0x0e1824)
      .setScrollFactor(sf).setDepth(D + 3);
    // Corner accents
    [[slotX - 37, slotY - 28], [slotX + 37, slotY - 28],
     [slotX - 37, slotY + 28], [slotX + 37, slotY + 28]].forEach(([cx, cy]) => {
      this._scene.add.rectangle(cx, cy, 5, 5, 0xdaa520)
        .setScrollFactor(sf).setDepth(D + 4);
    });

    this._emptySlot = this._scene.add.text(slotX, slotY - 4, '---', {
      fontSize: '14px', fontFamily: 'monospace', color: '#1a2a3a',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 5);
    this._slotLabel = this._scene.add.text(slotX, slotY + 17, 'Z:PUNCH\nX:KICK', {
      fontSize: '7px', fontFamily: 'monospace', color: '#2a4455', align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 5);

    this._slotX = slotX;
    this._slotY = slotY - 8;

    // ── Combo counter ────────────────────────────────────────────────────────
    this._comboTxt = this._scene.add.text(400, 185, '', {
      fontSize: '28px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 10).setAlpha(0);
  }

  // ── Event wiring ───────────────────────────────────────────────────────────

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

  // ── Combo counter ──────────────────────────────────────────────────────────

  _onComboHit() {
    this._comboCount++;
    if (this._comboCount < 3) return;

    const n = this._comboCount;
    let color, size;
    if      (n >= 15) { color = '#ff2200'; size = '38px'; }
    else if (n >= 10) { color = '#ff7700'; size = '34px'; }
    else if (n >=  7) { color = '#ffee00'; size = '31px'; }
    else if (n >=  5) { color = '#ffff55'; size = '30px'; }
    else              { color = '#ffffff'; size = '28px'; }

    const label = n >= 10 ? 'COMBO!!' : n >= 5 ? 'COMBO!' : 'HITS';
    this._comboTxt.setText(`${n} ${label}`).setFontSize(size).setColor(color).setAlpha(1).setScale(1);

    this._scene.tweens.killTweensOf(this._comboTxt);
    this._scene.tweens.add({
      targets: this._comboTxt, scaleX: 1.22, scaleY: 1.22,
      duration: 70, yoyo: true, ease: 'Power2',
    });

    if (this._comboClearTimer) this._comboClearTimer.remove();
    this._comboClearTimer = this._scene.time.delayedCall(1800, () => this._fadeCombo());
  }

  _onComboReset() {
    if (this._comboCount >= 3) this._fadeCombo();
    this._comboCount = 0;
    if (this._comboClearTimer) { this._comboClearTimer.remove(); this._comboClearTimer = null; }
  }

  _fadeCombo() {
    this._scene.tweens.killTweensOf(this._comboTxt);
    this._scene.tweens.add({ targets: this._comboTxt, alpha: 0, duration: 300, ease: 'Power2' });
  }

  // ── Armor pips ─────────────────────────────────────────────────────────────

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

  _onArmorEquipped({ durability })  { this._showArmorRow(true); this._refreshPips(durability); }
  _onArmorHit({ durability })       { this._refreshPips(durability); }
  _onArmorBroken()                  { this._refreshPips(0); this._scene.time.delayedCall(900, () => this._showArmorRow(false)); }
  _onArmorRefilled({ durability })  { this._refreshPips(durability); }

  // ── Weapon icon ────────────────────────────────────────────────────────────

  _onWeaponChanged(type) {
    this._iconRects.forEach(r => r?.destroy());
    this._iconRects = [];
    const def = WEAPON_ICONS[type];
    if (!def) {
      this._emptySlot.setAlpha(1);
      this._slotLabel.setText('Z:PUNCH\nX:KICK').setColor('#2a4455');
      return;
    }
    this._emptySlot.setAlpha(0);
    this._iconRects = def.draw(this._scene, this._slotX, this._slotY, 0, 25);
    this._slotLabel.setText(def.hint).setColor(def.color);
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(player) {
    const hp = Math.max(0, player.health / player.maxHealth);

    this._hpFill.width  = HP_W * hp;
    this._hpShine.width = HP_W * hp;

    // Colour shifts: crimson → orange-red → bright red (danger)
    this._hpFill.fillColor = hp > 0.5 ? 0x8b0000 : hp > 0.25 ? 0xaa2200 : 0xcc1100;

    // SP mirrors HP for now (no separate SP system yet)
    this._spFill.width  = SP_W * hp;
    this._spShine.width = SP_W * hp;
  }
}
