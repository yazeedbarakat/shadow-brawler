/* global Phaser */

// ── Constants ──────────────────────────────────────────────────────────────
const HP_W   = 200;   // max fill width
const SP_W   = 200;
const SLANT  = 8;     // parallelogram end slant (px)
const SF     = 0;     // scrollFactor (fixed to camera)
const D_BASE = 20;    // base depth

// Weapon icon descriptors
const WEAPON_ICONS = {
  sword: {
    hint: 'C=swing  F=drop', color: '#99aaff',
    draw(scene, cx, cy, d) {
      return [
        scene.add.rectangle(cx, cy - 5,  4, 18, 0x99aaff).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx, cy + 6, 18,  4, 0xddaa44).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx, cy + 12, 4,  8, 0x885533).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx, cy - 13, 2,  4, 0xccddff).setScrollFactor(SF).setDepth(d),
      ];
    },
  },
  pipe: {
    hint: 'Z=smash (x2 dmg)  F=drop', color: '#cccccc',
    draw(scene, cx, cy, d) {
      return [
        scene.add.rectangle(cx,      cy,      28, 8,  0xbbbbbb).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx - 13, cy,       5, 14, 0x888888).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx + 13, cy,       5, 14, 0x888888).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx,      cy - 3,  28, 2,  0xdddddd).setScrollFactor(SF).setDepth(d),
      ];
    },
  },
  throwingstar: {
    hint: 'Z=throw  F=drop', color: '#ffee55',
    draw(scene, cx, cy, d) {
      return [
        scene.add.rectangle(cx,      cy,       5, 22, 0xffee55).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx,      cy,      22,  5, 0xffee55).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx - 7,  cy - 7,   5,  5, 0xffcc00).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx + 7,  cy - 7,   5,  5, 0xffcc00).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx - 7,  cy + 7,   5,  5, 0xffcc00).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx + 7,  cy + 7,   5,  5, 0xffcc00).setScrollFactor(SF).setDepth(d),
        scene.add.rectangle(cx,      cy,        7,  7, 0xffffff).setScrollFactor(SF).setDepth(d + 1),
      ];
    },
  },
};

// ── Parallelogram path helpers ─────────────────────────────────────────────

/** Fill a left-slanted parallelogram. */
function fillPara(gfx, x, y, w, h, slant) {
  gfx.beginPath();
  gfx.moveTo(x + slant, y);
  gfx.lineTo(x + w,     y);
  gfx.lineTo(x + w - slant, y + h);
  gfx.lineTo(x,         y + h);
  gfx.closePath();
  gfx.fillPath();
}

/** Stroke a left-slanted parallelogram. */
function strokePara(gfx, x, y, w, h, slant) {
  gfx.beginPath();
  gfx.moveTo(x + slant, y);
  gfx.lineTo(x + w,     y);
  gfx.lineTo(x + w - slant, y + h);
  gfx.lineTo(x,         y + h);
  gfx.closePath();
  gfx.strokePath();
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
    const sc  = this._scene;
    const D   = D_BASE;

    // ══════════════════════════════════════════════════════════════════════
    //  STATIC background graphics (panel, emblem, bar frames)
    // ══════════════════════════════════════════════════════════════════════
    const bg = sc.add.graphics().setScrollFactor(SF).setDepth(D);

    // ── Panel shadow ───────────────────────────────────────────────────────
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(6, 6, 285, 70);

    // ── Main panel backing ─────────────────────────────────────────────────
    bg.fillStyle(0x0e0808, 1);
    bg.fillRect(8, 8, 280, 66);

    // Panel inner warm tone
    bg.fillStyle(0x180c0c, 1);
    bg.fillRect(11, 11, 274, 60);

    // ── Outer gold border ──────────────────────────────────────────────────
    bg.lineStyle(2, 0xc8920a, 1);
    bg.strokeRect(8, 8, 280, 66);

    // Inner thin accent line
    bg.lineStyle(1, 0x7a5808, 0.7);
    bg.strokeRect(12, 12, 272, 58);

    // Corner diamond accents
    const corners = [[8,8],[288,8],[8,74],[288,74]];
    corners.forEach(([cx, cy]) => {
      bg.fillStyle(0xe8a020, 1);
      bg.fillRect(cx - 3, cy - 3, 6, 6);
    });

    // ── Portrait circle ────────────────────────────────────────────────────
    const embX = 44, embY = 41;

    // Outer glow
    bg.fillStyle(0x660000, 0.35);
    bg.fillCircle(embX, embY, 28);

    // Gold ring outer
    bg.fillStyle(0xc8920a, 1);
    bg.fillCircle(embX, embY, 25);

    // Gold ring inner highlight
    bg.fillStyle(0xe8c040, 1);
    bg.fillCircle(embX, embY, 23);

    // Dark face bg
    bg.fillStyle(0x120404, 1);
    bg.fillCircle(embX, embY, 21);

    // ── Separator line ──────────────────────────────────────────────────────
    bg.fillStyle(0x7a5808, 0.8);
    bg.fillRect(72, 14, 2, 58);

    // ── HP bar trough ──────────────────────────────────────────────────────
    const hpX = 78, hpY = 16, hpH = 18;
    bg.fillStyle(0x0a0000, 1);
    fillPara(bg, hpX - 1, hpY - 1, HP_W + 2, hpH + 2, SLANT);

    // HP label
    sc.add.text(hpX + SLANT + 2, hpY + 1, 'HP', {
      fontSize: '9px', fontFamily: 'monospace',
      color: '#dd3333', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(SF).setDepth(D + 6);

    // ── SP bar trough ──────────────────────────────────────────────────────
    const spX = 78, spY = 42, spH = 12;
    bg.fillStyle(0x000a0a, 1);
    fillPara(bg, spX - 1, spY - 1, SP_W + 2, spH + 2, SLANT);

    // SP label
    sc.add.text(spX + SLANT + 2, spY + 1, 'SP', {
      fontSize: '9px', fontFamily: 'monospace',
      color: '#11ccaa', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(SF).setDepth(D + 6);

    // ── HP bar divider ticks (static, drawn once) ──────────────────────────
    bg.lineStyle(1, 0x000000, 0.45);
    for (let t = 1; t < 5; t++) {
      const tx = hpX + (HP_W / 5) * t;
      bg.beginPath();
      bg.moveTo(tx + SLANT * (1 - t/5), hpY);
      bg.lineTo(tx + SLANT * (1 - t/5) - SLANT, hpY + hpH);
      bg.strokePath();
    }

    // ══════════════════════════════════════════════════════════════════════
    //  DYNAMIC HP fill graphics
    // ══════════════════════════════════════════════════════════════════════
    this._hpGfx = sc.add.graphics().setScrollFactor(SF).setDepth(D + 2);
    this._spGfx = sc.add.graphics().setScrollFactor(SF).setDepth(D + 2);

    // Store geometry for update()
    this._hpX = hpX; this._hpY = hpY; this._hpH = hpH;
    this._spX = spX; this._spY = spY; this._spH = spH;

    // ══════════════════════════════════════════════════════════════════════
    //  FOREGROUND: bar borders and skull (on top of fills)
    // ══════════════════════════════════════════════════════════════════════
    const fg = sc.add.graphics().setScrollFactor(SF).setDepth(D + 4);

    // HP bar gold border
    fg.lineStyle(1.5, 0xc8920a, 1);
    strokePara(fg, hpX - 1, hpY - 1, HP_W + 2, hpH + 2, SLANT);

    // SP bar gold border
    fg.lineStyle(1.5, 0xc8920a, 0.8);
    strokePara(fg, spX - 1, spY - 1, SP_W + 2, spH + 2, SLANT);

    // HP right-end diamond cap
    fg.fillStyle(0xe8c040, 1);
    fg.fillRect(hpX + HP_W - 2, hpY + hpH / 2 - 5, 10, 10);
    fg.fillStyle(0x0d0808, 1);
    fg.fillRect(hpX + HP_W + 1, hpY + hpH / 2 - 3, 4, 6);

    // SP right-end diamond cap
    fg.fillStyle(0xe8c040, 0.7);
    fg.fillRect(spX + SP_W - 2, spY + spH / 2 - 4, 8, 8);
    fg.fillStyle(0x0d0808, 1);
    fg.fillRect(spX + SP_W + 1, spY + spH / 2 - 2, 4, 4);

    // ── Pixel skull inside portrait circle ─────────────────────────────────
    const BONE = 0xd0bc9a, VOID = 0x050505;
    const sx = embX, sy = embY - 1;

    fg.fillStyle(BONE, 1);
    fg.fillRect(sx - 5,  sy - 10, 10, 4);   // cranium top
    fg.fillRect(sx - 7,  sy - 6,  14, 9);   // cranium main
    fg.fillRect(sx - 6,  sy + 3,  12, 6);   // jaw
    fg.fillRect(sx - 3,  sy + 8,  6, 3);    // chin

    fg.fillStyle(VOID, 1);
    fg.fillRect(sx - 5,  sy - 4,   4, 5);   // left eye
    fg.fillRect(sx + 1,  sy - 4,   4, 5);   // right eye
    fg.fillRect(sx - 1,  sy + 2,   2, 3);   // nose

    fg.fillRect(sx - 5,  sy + 7,  2, 5);    // tooth gap L
    fg.fillRect(sx - 1,  sy + 7,  2, 5);    // tooth gap C
    fg.fillRect(sx + 3,  sy + 7,  2, 5);    // tooth gap R

    // Red eye glow
    fg.fillStyle(0xff2200, 0.7);
    fg.fillRect(sx - 4, sy - 3, 2, 3);
    fg.fillRect(sx + 2, sy - 3, 2, 3);

    // Portrait ring inner glow arc (decorative)
    fg.lineStyle(1, 0xdd6600, 0.4);
    fg.strokeCircle(embX, embY, 18);

    // ══════════════════════════════════════════════════════════════════════
    //  SHIMMER graphics (pulsing, on top of fill)
    // ══════════════════════════════════════════════════════════════════════
    this._hpShimGfx = sc.add.graphics().setScrollFactor(SF).setDepth(D + 3);
    this._spShimGfx = sc.add.graphics().setScrollFactor(SF).setDepth(D + 3);

    // Animate shimmer alpha
    sc.tweens.add({
      targets: [this._hpShimGfx, this._spShimGfx],
      alpha: { from: 0.15, to: 0.75 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ══════════════════════════════════════════════════════════════════════
    //  ARMOR PIPS
    // ══════════════════════════════════════════════════════════════════════
    this._armorLabel = sc.add.text(hpX, 82, 'ARMOR', {
      fontSize: '9px', fontFamily: 'monospace', color: '#997700',
    }).setScrollFactor(SF).setDepth(D + 5).setAlpha(0);

    this._pips = Array.from({ length: 5 }, (_, i) =>
      sc.add.rectangle(hpX + 36 + i * 20, 92, 16, 9, 0xffcc00)
        .setScrollFactor(SF).setDepth(D + 4).setAlpha(0),
    );

    // ══════════════════════════════════════════════════════════════════════
    //  WEAPON SLOT (top-right, gold framed)
    // ══════════════════════════════════════════════════════════════════════
    const slotX = 757, slotY = 28;
    const wgfx = sc.add.graphics().setScrollFactor(SF).setDepth(D);

    // Shadow
    wgfx.fillStyle(0x000000, 0.55);
    wgfx.fillRect(slotX - 36, slotY - 29, 76, 60);

    // Gold outer frame
    wgfx.fillStyle(0xc8920a, 1);
    wgfx.fillRect(slotX - 37, slotY - 30, 74, 58);

    // Inner ring
    wgfx.fillStyle(0x7a5808, 1);
    wgfx.fillRect(slotX - 34, slotY - 27, 68, 52);

    // Dark bg
    wgfx.fillStyle(0x080c14, 1);
    wgfx.fillRect(slotX - 32, slotY - 25, 64, 48);
    wgfx.fillStyle(0x0e1824, 1);
    wgfx.fillRect(slotX - 30, slotY - 23, 60, 44);

    // Corner accents
    [[slotX-37,slotY-30],[slotX+37,slotY-30],
     [slotX-37,slotY+28],[slotX+37,slotY+28]].forEach(([cx,cy]) => {
      wgfx.fillStyle(0xe8c040, 1);
      wgfx.fillRect(cx-3, cy-3, 7, 7);
    });

    this._emptySlot = sc.add.text(slotX, slotY - 4, '---', {
      fontSize: '14px', fontFamily: 'monospace', color: '#1a2a3a',
    }).setOrigin(0.5).setScrollFactor(SF).setDepth(D + 5);
    this._slotLabel = sc.add.text(slotX, slotY + 17, 'Z:PUNCH\nX:KICK', {
      fontSize: '7px', fontFamily: 'monospace', color: '#2a4455', align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(SF).setDepth(D + 5);

    this._slotX = slotX;
    this._slotY = slotY - 8;

    // ══════════════════════════════════════════════════════════════════════
    //  COMBO COUNTER
    // ══════════════════════════════════════════════════════════════════════
    this._comboTxt = sc.add.text(400, 185, '', {
      fontSize: '28px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(SF).setDepth(D + 12).setAlpha(0);
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(player) {
    const pct = Math.max(0, Math.min(1, player.health / player.maxHealth));

    // HP color: dark crimson → blood red → danger orange-red
    let hpTop, hpBot, hpMid;
    if (pct > 0.5) {
      hpTop = 0xdd2200; hpMid = 0x8b0000; hpBot = 0x550000;
    } else if (pct > 0.25) {
      hpTop = 0xff4400; hpMid = 0xaa2200; hpBot = 0x661100;
    } else {
      hpTop = 0xff6600; hpMid = 0xcc2200; hpBot = 0x880000;
    }

    const { _hpGfx: hg, _spGfx: sg, _hpShimGfx: hs, _spShimGfx: ss } = this;
    const { _hpX: hpX, _hpY: hpY, _hpH: hpH, _spX: spX, _spY: spY, _spH: spH } = this;

    // ── HP fill ────────────────────────────────────────────────────────────
    hg.clear();
    if (pct > 0) {
      const fw = HP_W * pct;

      // Bottom dark layer
      hg.fillStyle(hpBot, 1);
      fillPara(hg, hpX, hpY, fw, hpH, SLANT);

      // Middle gradient band
      hg.fillGradientStyle(hpTop, hpTop, hpMid, hpMid, 1);
      fillPara(hg, hpX, hpY, fw, hpH * 0.55, SLANT);

      // Bright top edge
      hg.fillStyle(0xff6666, 0.6);
      fillPara(hg, hpX, hpY, fw, 3, SLANT);
    }

    // ── HP shimmer ─────────────────────────────────────────────────────────
    hs.clear();
    if (pct > 0) {
      const fw = HP_W * pct;
      hs.fillStyle(0xff9999, 1);
      fillPara(hs, hpX, hpY + 2, fw, 4, SLANT);
    }

    // ── SP fill ────────────────────────────────────────────────────────────
    sg.clear();
    if (pct > 0) {
      const fw = SP_W * pct;
      sg.fillStyle(0x006644, 1);
      fillPara(sg, spX, spY, fw, spH, SLANT);

      sg.fillGradientStyle(0x44ffcc, 0x44ffcc, 0x009966, 0x009966, 1);
      fillPara(sg, spX, spY, fw, spH * 0.5, SLANT);

      sg.fillStyle(0x88ffee, 0.5);
      fillPara(sg, spX, spY, fw, 2, SLANT);
    }

    // ── SP shimmer ─────────────────────────────────────────────────────────
    ss.clear();
    if (pct > 0) {
      const fw = SP_W * pct;
      ss.fillStyle(0x88ffdd, 1);
      fillPara(ss, spX, spY + 1, fw, 3, SLANT);
    }
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

  // ── Combo ──────────────────────────────────────────────────────────────────

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
    this._scene.tweens.add({ targets: this._comboTxt, scaleX: 1.22, scaleY: 1.22, duration: 70, yoyo: true, ease: 'Power2' });
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

  _showArmorRow(v) {
    this._armorLabel.setAlpha(v ? 1 : 0);
    this._pips.forEach(p => p.setAlpha(v ? 1 : 0));
  }

  _refreshPips(dur) {
    this._pips.forEach((p, i) => {
      p.setFillStyle(i < dur ? 0xffcc00 : 0x442200);
      p.setAlpha(i < dur ? 1 : 0.28);
    });
  }

  _onArmorEquipped({ durability }) { this._showArmorRow(true);  this._refreshPips(durability); }
  _onArmorHit({ durability })      { this._refreshPips(durability); }
  _onArmorBroken()                 { this._refreshPips(0); this._scene.time.delayedCall(900, () => this._showArmorRow(false)); }
  _onArmorRefilled({ durability }) { this._refreshPips(durability); }

  // ── Weapon slot ────────────────────────────────────────────────────────────

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
    this._iconRects = def.draw(this._scene, this._slotX, this._slotY, D_BASE + 6);
    this._slotLabel.setText(def.hint).setColor(def.color);
  }
}
