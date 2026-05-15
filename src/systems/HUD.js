/* global Phaser */

// ── Layout constants ────────────────────────────────────────────────────────
const HP_W   = 228;   // player HP bar max fill width
const BOSS_W = 510;   // boss HP bar max fill width
const SLANT  = 7;     // parallelogram slant (px)
const SF     = 0;     // scroll factor — fixed to camera
const D      = 20;    // base depth

// ── Colours ─────────────────────────────────────────────────────────────────
const C = {
  FRAME_DARK  : 0x1e0a02,
  FRAME_MID   : 0x5a2008,
  FRAME_COPPER: 0x9a4010,
  FRAME_BRIGHT: 0xc86828,
  CORNER_GOLD : 0xe8a828,
  BAR_VOID    : 0x0e0002,
  BAR_DARK    : 0x3a000c,
  BAR_MID     : 0x7a001c,
  BAR_BRIGHT  : 0xcc0030,
  CRACK_A     : 0xff1a55,
  CRACK_B     : 0xff55aa,
  SHIMMER     : 0xff66bb,
  FACE_RED    : 0xaa1500,
  FACE_DARK   : 0x6e0c00,
  EYE_WHITE   : 0xffe8c0,
  EYE_GLOW    : 0xff2200,
  FANG        : 0xfff0e0,
};

// ── Weapon icon descriptors ──────────────────────────────────────────────────
const WEAPON_ICONS = {
  sword: {
    hint: 'C=swing  F=drop', color: '#99aaff',
    draw(sc, cx, cy, depth) {
      return [
        sc.add.rectangle(cx, cy-5, 4,18,0x99aaff).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx, cy+6,18, 4,0xddaa44).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx, cy+12,4, 8,0x885533).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx, cy-13,2, 4,0xccddff).setScrollFactor(SF).setDepth(depth),
      ];
    },
  },
  pipe: {
    hint: 'Z=smash (x2 dmg)  F=drop', color: '#cccccc',
    draw(sc, cx, cy, depth) {
      return [
        sc.add.rectangle(cx,    cy,   28,8, 0xbbbbbb).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx-13, cy,    5,14,0x888888).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx+13, cy,    5,14,0x888888).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx,    cy-3, 28,2, 0xdddddd).setScrollFactor(SF).setDepth(depth),
      ];
    },
  },
  throwingstar: {
    hint: 'Z=throw  F=drop', color: '#ffee55',
    draw(sc, cx, cy, depth) {
      return [
        sc.add.rectangle(cx,   cy,   5,22,0xffee55).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx,   cy,  22, 5,0xffee55).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx-7, cy-7, 5, 5,0xffcc00).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx+7, cy-7, 5, 5,0xffcc00).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx-7, cy+7, 5, 5,0xffcc00).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx+7, cy+7, 5, 5,0xffcc00).setScrollFactor(SF).setDepth(depth),
        sc.add.rectangle(cx,   cy,   7, 7,0xffffff).setScrollFactor(SF).setDepth(depth+1),
      ];
    },
  },
};

// ── Helper: fill a parallelogram ─────────────────────────────────────────────
function fillPara(g, x, y, w, h, slant) {
  if (w <= 0) return;
  g.beginPath();
  g.moveTo(x + slant, y);
  g.lineTo(x + w,         y);
  g.lineTo(x + w - slant, y + h);
  g.lineTo(x,             y + h);
  g.closePath();
  g.fillPath();
}

// ── Helper: stroke a parallelogram ───────────────────────────────────────────
function strokePara(g, x, y, w, h, slant) {
  g.beginPath();
  g.moveTo(x + slant, y);
  g.lineTo(x + w,         y);
  g.lineTo(x + w - slant, y + h);
  g.lineTo(x,             y + h);
  g.closePath();
  g.strokePath();
}

// ── Helper: draw frame border as 4 filled rects ──────────────────────────────
function drawFrame(g, x, y, w, h, t, color, alpha) {
  g.fillStyle(color, alpha);
  g.fillRect(x,         y,         w, t);
  g.fillRect(x,         y + h - t, w, t);
  g.fillRect(x,         y,         t, h);
  g.fillRect(x + w - t, y,         t, h);
}

// ── Helper: draw crack-vein lines over a fill region ────────────────────────
// Cracks are expressed as fractions of HP_W (so they clip naturally when fw < HP_W).
const CRACKS = [
  // format: [ [fx0,fy0], [fx1,fy1], ... ] — fx as fraction of HP_W, fy as fraction of barH
  [ [0.06,0.0], [0.08,0.45], [0.05,1.0] ],
  [ [0.15,0.0], [0.18,0.3],  [0.13,0.65],[0.16,1.0] ],
  [ [0.27,0.0], [0.30,0.5],  [0.26,1.0] ],
  [ [0.38,0.1], [0.40,0.5],  [0.37,0.9] ],
  [ [0.50,0.0], [0.52,0.4],  [0.48,0.7],[0.51,1.0] ],
  [ [0.61,0.0], [0.63,0.45], [0.60,1.0] ],
  [ [0.73,0.1], [0.75,0.55], [0.72,0.9] ],
  [ [0.84,0.0], [0.86,0.4],  [0.83,0.8],[0.85,1.0] ],
  [ [0.93,0.0], [0.95,0.5],  [0.92,1.0] ],
];

function drawCracks(g, x, y, fw, fh, maxW, colorA, colorB, alpha) {
  CRACKS.forEach((pts, i) => {
    const startFx = pts[0][0] * maxW;
    if (startFx > fw) return; // outside fill — skip
    g.lineStyle(1, i % 2 === 0 ? colorA : colorB, alpha);
    g.beginPath();
    pts.forEach(([fx, fy], j) => {
      const px = x + Math.min(fx * maxW, fw);
      const py = y + fy * fh;
      j === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    });
    g.strokePath();
  });
}

// ── Helper: draw demon oni portrait ─────────────────────────────────────────
// cx, cy = center of portrait area, r = "face" radius
function drawOniPortrait(g, cx, cy, r) {
  const s = r / 20; // scale factor (portrait designed for r=20)

  // Gold ring outer
  g.fillStyle(C.CORNER_GOLD, 1);
  g.fillCircle(cx, cy, r + 4);

  // Copper mid ring
  g.fillStyle(C.FRAME_COPPER, 1);
  g.fillCircle(cx, cy, r + 2);

  // Dark ring
  g.fillStyle(C.FRAME_DARK, 1);
  g.fillCircle(cx, cy, r + 0.5);

  // Face bg: dark red
  g.fillStyle(C.FACE_DARK, 1);
  g.fillCircle(cx, cy, r);

  // Face main: crimson
  g.fillStyle(C.FACE_RED, 1);
  g.fillCircle(cx, cy + s, r - 3 * s);

  // Horns (two filled triangles pointing up)
  g.fillStyle(0x2a0808, 1);
  g.fillTriangle(
    cx - 7 * s, cy - r + 7 * s,
    cx - 3 * s, cy - r - 5 * s,
    cx - 1 * s, cy - r + 4 * s,
  );
  g.fillTriangle(
    cx + 1 * s, cy - r + 4 * s,
    cx + 3 * s, cy - r - 5 * s,
    cx + 7 * s, cy - r + 7 * s,
  );
  // Horn highlights
  g.fillStyle(0x5a1010, 1);
  g.fillTriangle(
    cx - 6 * s, cy - r + 7 * s,
    cx - 4 * s, cy - r - 3 * s,
    cx - 2 * s, cy - r + 5 * s,
  );
  g.fillTriangle(
    cx + 2 * s, cy - r + 5 * s,
    cx + 4 * s, cy - r - 3 * s,
    cx + 6 * s, cy - r + 7 * s,
  );

  // Brow ridge (dark, angled)
  g.fillStyle(0x1a0404, 1);
  g.fillRect(cx - 8 * s, cy - 7 * s, 7 * s, 3 * s);  // left brow
  g.fillRect(cx + 1 * s, cy - 7 * s, 7 * s, 3 * s);  // right brow

  // Eyes (white with red glow)
  g.fillStyle(C.EYE_WHITE, 1);
  g.fillEllipse(cx - 5 * s, cy - 3 * s, 7 * s, 5 * s);
  g.fillEllipse(cx + 5 * s, cy - 3 * s, 7 * s, 5 * s);
  g.fillStyle(C.EYE_GLOW, 1);
  g.fillCircle(cx - 5 * s, cy - 3 * s, 2 * s);
  g.fillCircle(cx + 5 * s, cy - 3 * s, 2 * s);
  g.fillStyle(0x000000, 1);
  g.fillCircle(cx - 5 * s, cy - 3 * s, s);
  g.fillCircle(cx + 5 * s, cy - 3 * s, s);

  // Nose bridge
  g.fillStyle(C.FACE_DARK, 1);
  g.fillRect(cx - s, cy, 2 * s, 4 * s);

  // Mouth / fangs
  g.fillStyle(0x1a0404, 1);
  g.fillRect(cx - 7 * s, cy + 5 * s, 14 * s, 4 * s);
  g.fillStyle(C.FANG, 1);
  g.fillTriangle(cx - 5 * s, cy + 5 * s, cx - 3 * s, cy + 5 * s, cx - 4 * s, cy + 9 * s);
  g.fillTriangle(cx - 1 * s, cy + 5 * s, cx + 1 * s, cy + 5 * s, cx,         cy + 9 * s);
  g.fillTriangle(cx + 3 * s, cy + 5 * s, cx + 5 * s, cy + 5 * s, cx + 4 * s, cy + 9 * s);
}

// ════════════════════════════════════════════════════════════════════════════
export default class HUD {
  constructor(scene, levelName = '') {
    this._scene      = scene;
    this._iconRects  = [];
    this._comboCount = 0;
    this._comboClearTimer = null;
    this._boss       = null;
    this._bossContainer = [];  // all boss bar game objects (for show/hide)

    this._buildPlayerBar();
    this._buildBossBar();
    this._buildWeaponSlot();
    this._buildCombo();
    this._listenEvents();
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PLAYER BAR (top-left)
  // ══════════════════════════════════════════════════════════════════════════
  _buildPlayerBar() {
    const sc = this._scene;

    // ── Layout ──────────────────────────────────────────────────────────────
    const PX = 4, PY = 4;          // panel top-left
    const PW = 302, PH = 48;       // panel size
    const EMB_X = 30, EMB_Y = 28;  // portrait centre
    const BAR_X = 56, BAR_Y = 10;  // bar fill origin
    const BAR_H = 20;

    // ── Static backing ───────────────────────────────────────────────────────
    const bg = sc.add.graphics().setScrollFactor(SF).setDepth(D);

    // Drop shadow
    bg.fillStyle(0x000000, 0.65);
    bg.fillRect(PX + 4, PY + 4, PW + 2, PH + 2);

    // Panel bg
    bg.fillStyle(C.FRAME_DARK, 1);
    bg.fillRect(PX, PY, PW, PH);
    bg.fillStyle(0x160606, 1);
    bg.fillRect(PX + 3, PY + 3, PW - 6, PH - 6);

    // Diagonal texture lines (simulate rough metal)
    bg.lineStyle(1, 0x2a0808, 0.4);
    for (let i = 0; i < 14; i++) {
      const tx = PX + i * 22;
      bg.beginPath(); bg.moveTo(tx, PY); bg.lineTo(tx + 10, PY + PH); bg.strokePath();
    }

    // Outer copper frame
    bg.lineStyle(2, C.FRAME_COPPER, 1);
    bg.strokeRect(PX, PY, PW, PH);
    // Inner dark frame
    bg.lineStyle(1, C.FRAME_MID, 0.6);
    bg.strokeRect(PX + 3, PY + 3, PW - 6, PH - 6);
    // Bright top edge highlight
    bg.lineStyle(1, C.FRAME_BRIGHT, 0.9);
    bg.beginPath(); bg.moveTo(PX, PY); bg.lineTo(PX + PW, PY); bg.strokePath();

    // Corner ornament squares
    [[PX,PY],[PX+PW,PY],[PX,PY+PH],[PX+PW,PY+PH]].forEach(([cx,cy]) => {
      bg.fillStyle(C.CORNER_GOLD, 1); bg.fillRect(cx-4, cy-4, 8, 8);
      bg.fillStyle(C.FRAME_DARK,  1); bg.fillRect(cx-2, cy-2, 4, 4);
    });

    // Vine/thorn accents on frame edges
    [0.3, 0.55, 0.75].forEach(t => {
      const tx = PX + t * PW;
      bg.fillStyle(C.FRAME_COPPER, 0.7);
      bg.fillRect(tx - 1, PY - 3, 3, 5);
      bg.fillRect(tx - 1, PY + PH - 2, 3, 5);
    });

    // Bar trough (dark channel behind fill)
    bg.fillStyle(C.BAR_VOID, 1);
    fillPara(bg, BAR_X - 1, BAR_Y - 1, HP_W + 4, BAR_H + 2, SLANT);

    // Separator between portrait and bar area
    bg.fillStyle(C.FRAME_MID, 0.7);
    bg.fillRect(EMB_X + 24, PY + 4, 2, PH - 8);

    // HP label
    sc.add.text(BAR_X + SLANT + 2, BAR_Y + 1, 'HP', {
      fontSize: '9px', fontFamily: 'monospace',
      color: '#ff2255', stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(SF).setDepth(D + 6);

    // ── Oni portrait ─────────────────────────────────────────────────────────
    const fg = sc.add.graphics().setScrollFactor(SF).setDepth(D + 5);
    drawOniPortrait(fg, EMB_X, EMB_Y, 20);

    // ── Bar fill graphics (redrawn every frame) ──────────────────────────────
    this._hpGfx = sc.add.graphics().setScrollFactor(SF).setDepth(D + 2);

    // ── Bar border (drawn over fill) ─────────────────────────────────────────
    const bfg = sc.add.graphics().setScrollFactor(SF).setDepth(D + 4);
    bfg.lineStyle(1.5, C.FRAME_COPPER, 1);
    strokePara(bfg, BAR_X - 1, BAR_Y - 1, HP_W + 4, BAR_H + 2, SLANT);
    bfg.lineStyle(1, C.FRAME_BRIGHT, 0.5);
    strokePara(bfg, BAR_X, BAR_Y, HP_W + 2, BAR_H, SLANT);

    // End cap
    bfg.fillStyle(C.CORNER_GOLD, 1);
    bfg.fillRect(BAR_X + HP_W + 2, BAR_Y + BAR_H / 2 - 5, 9, 9);
    bfg.fillStyle(C.FRAME_DARK, 1);
    bfg.fillRect(BAR_X + HP_W + 4, BAR_Y + BAR_H / 2 - 3, 5, 5);

    // ── Shimmer overlay (animated alpha) ─────────────────────────────────────
    this._hpShimGfx = sc.add.graphics().setScrollFactor(SF).setDepth(D + 3);
    sc.tweens.add({
      targets: this._hpShimGfx,
      alpha: { from: 0.1, to: 0.7 },
      duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Store geometry for update()
    this._hpBarX = BAR_X; this._hpBarY = BAR_Y; this._hpBarH = BAR_H;

    // ── Armor pips ────────────────────────────────────────────────────────────
    this._armorLabel = sc.add.text(BAR_X, PY + PH + 4, 'ARMOR', {
      fontSize: '9px', fontFamily: 'monospace', color: '#997700',
    }).setScrollFactor(SF).setDepth(D + 3).setAlpha(0);

    this._pips = Array.from({ length: 5 }, (_, i) =>
      sc.add.rectangle(BAR_X + 36 + i * 20, PY + PH + 14, 16, 9, 0xffcc00)
        .setScrollFactor(SF).setDepth(D + 2).setAlpha(0),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  BOSS BAR (bottom-center) — hidden until setBoss() is called
  // ══════════════════════════════════════════════════════════════════════════
  _buildBossBar() {
    const sc = this._scene;

    // ── Layout ──────────────────────────────────────────────────────────────
    const BX   = 118;           // frame left
    const BY   = 410;           // frame top
    const BW   = 564;           // frame width
    const BH   = 34;            // frame height
    const EMB_X = 147, EMB_Y = BY + BH / 2;
    const BAR_X = 170, BAR_Y = BY + 7, BAR_H = 18;

    this._bossBarX = BAR_X; this._bossBarY = BAR_Y; this._bossBarH = BAR_H;

    // ── Static frame ─────────────────────────────────────────────────────────
    const bg = sc.add.graphics().setScrollFactor(SF).setDepth(D);
    sc.add.container(0, 0).setScrollFactor(SF); // anchor

    // Shadow
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(BX + 4, BY + 4, BW + 2, BH + 2);

    // Panel bg
    bg.fillStyle(C.FRAME_DARK, 1);
    bg.fillRect(BX, BY, BW, BH);
    bg.fillStyle(0x160606, 1);
    bg.fillRect(BX + 3, BY + 3, BW - 6, BH - 6);

    // Texture lines
    bg.lineStyle(1, 0x2a0808, 0.35);
    for (let i = 0; i < 26; i++) {
      const tx = BX + i * 22;
      bg.beginPath(); bg.moveTo(tx, BY); bg.lineTo(tx + 10, BY + BH); bg.strokePath();
    }

    // Frame
    bg.lineStyle(2, C.FRAME_COPPER, 1);
    bg.strokeRect(BX, BY, BW, BH);
    bg.lineStyle(1, C.FRAME_MID, 0.5);
    bg.strokeRect(BX + 3, BY + 3, BW - 6, BH - 6);
    bg.lineStyle(1, C.FRAME_BRIGHT, 0.8);
    bg.beginPath(); bg.moveTo(BX, BY); bg.lineTo(BX + BW, BY); bg.strokePath();

    // Corners
    [[BX,BY],[BX+BW,BY],[BX,BY+BH],[BX+BW,BY+BH]].forEach(([cx,cy]) => {
      bg.fillStyle(C.CORNER_GOLD, 1); bg.fillRect(cx-4, cy-4, 8, 8);
      bg.fillStyle(C.FRAME_DARK,  1); bg.fillRect(cx-2, cy-2, 4, 4);
    });

    // Vine accents
    [0.25, 0.45, 0.65, 0.82].forEach(t => {
      const tx = BX + t * BW;
      bg.fillStyle(C.FRAME_COPPER, 0.6);
      bg.fillRect(tx - 1, BY - 3, 3, 5);
      bg.fillRect(tx - 1, BY + BH - 2, 3, 5);
    });

    // Bar trough
    bg.fillStyle(C.BAR_VOID, 1);
    fillPara(bg, BAR_X - 1, BAR_Y - 1, BOSS_W + 4, BAR_H + 2, SLANT);

    // Separator
    bg.fillStyle(C.FRAME_MID, 0.7);
    bg.fillRect(EMB_X + 22, BY + 4, 2, BH - 8);

    // Oni portrait
    const fg = sc.add.graphics().setScrollFactor(SF).setDepth(D + 5);
    drawOniPortrait(fg, EMB_X, EMB_Y, 16);

    // Bar border overlay
    const bfg = sc.add.graphics().setScrollFactor(SF).setDepth(D + 4);
    bfg.lineStyle(1.5, C.FRAME_COPPER, 1);
    strokePara(bfg, BAR_X - 1, BAR_Y - 1, BOSS_W + 4, BAR_H + 2, SLANT);
    bfg.lineStyle(1, C.FRAME_BRIGHT, 0.5);
    strokePara(bfg, BAR_X, BAR_Y, BOSS_W + 2, BAR_H, SLANT);

    // End cap
    bfg.fillStyle(C.CORNER_GOLD, 1);
    bfg.fillRect(BAR_X + BOSS_W + 2, BAR_Y + BAR_H / 2 - 5, 9, 9);
    bfg.fillStyle(C.FRAME_DARK, 1);
    bfg.fillRect(BAR_X + BOSS_W + 4, BAR_Y + BAR_H / 2 - 3, 5, 5);

    // Boss name text
    this._bossNameTxt = sc.add.text(BX + BW / 2 + 10, BY - 14, '', {
      fontSize: '11px', fontFamily: 'monospace',
      color: '#ff4466', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(SF).setDepth(D + 6);

    // Fill + shimmer graphics (updated per frame)
    this._bossGfx      = sc.add.graphics().setScrollFactor(SF).setDepth(D + 2);
    this._bossShimGfx  = sc.add.graphics().setScrollFactor(SF).setDepth(D + 3);

    sc.tweens.add({
      targets: this._bossShimGfx,
      alpha: { from: 0.1, to: 0.65 },
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Collect all boss bar objects for alpha control
    this._bossContainer = [bg, fg, bfg, this._bossNameTxt, this._bossGfx, this._bossShimGfx];

    // Hide until boss is registered
    this._bossContainer.forEach(o => o.setAlpha(0));
  }

  // ── Register a boss and reveal the bar ────────────────────────────────────
  setBoss(enemy, name = 'BOSS') {
    this._boss = enemy;
    this._bossNameTxt.setText(name);
    // Fade in
    this._scene.tweens.add({
      targets: this._bossContainer,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        // Restore shimmer to its own tween target (alpha was overridden)
        this._bossShimGfx.setAlpha(0.4);
      },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  WEAPON SLOT (top-right)
  // ══════════════════════════════════════════════════════════════════════════
  _buildWeaponSlot() {
    const sc = this._scene;
    const slotX = 757, slotY = 28;

    const wg = sc.add.graphics().setScrollFactor(SF).setDepth(D);
    wg.fillStyle(0x000000, 0.55); wg.fillRect(slotX - 36, slotY - 29, 76, 60);
    wg.fillStyle(C.FRAME_COPPER, 1); wg.fillRect(slotX - 37, slotY - 30, 74, 58);
    wg.fillStyle(C.FRAME_MID,    1); wg.fillRect(slotX - 34, slotY - 27, 68, 52);
    wg.fillStyle(0x080c14,       1); wg.fillRect(slotX - 32, slotY - 25, 64, 48);
    wg.fillStyle(0x0e1824,       1); wg.fillRect(slotX - 30, slotY - 23, 60, 44);
    [[slotX-37,slotY-30],[slotX+37,slotY-30],
     [slotX-37,slotY+28],[slotX+37,slotY+28]].forEach(([cx,cy]) => {
      wg.fillStyle(C.CORNER_GOLD, 1); wg.fillRect(cx-3, cy-3, 7, 7);
    });

    this._emptySlot = sc.add.text(slotX, slotY - 4, '---', {
      fontSize: '14px', fontFamily: 'monospace', color: '#1a2a3a',
    }).setOrigin(0.5).setScrollFactor(SF).setDepth(D + 5);
    this._slotLabel = sc.add.text(slotX, slotY + 17, 'Z:PUNCH\nX:KICK', {
      fontSize: '7px', fontFamily: 'monospace', color: '#2a4455', align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(SF).setDepth(D + 5);

    this._slotX = slotX;
    this._slotY = slotY - 8;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  COMBO
  // ══════════════════════════════════════════════════════════════════════════
  _buildCombo() {
    this._comboTxt = this._scene.add.text(400, 185, '', {
      fontSize: '28px', fontFamily: 'monospace',
      color: '#ffffff', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(SF).setDepth(D + 12).setAlpha(0);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PER-FRAME UPDATE
  // ══════════════════════════════════════════════════════════════════════════
  update(player, boss = null) {
    // ── Player HP ────────────────────────────────────────────────────────────
    this._drawBar(
      this._hpGfx, this._hpShimGfx,
      this._hpBarX, this._hpBarY, this._hpBarH,
      HP_W,
      Math.max(0, Math.min(1, player.health / player.maxHealth)),
    );

    // ── Boss HP ───────────────────────────────────────────────────────────────
    const b = boss ?? this._boss;
    if (b && !b.isDead) {
      this._drawBar(
        this._bossGfx, this._bossShimGfx,
        this._bossBarX, this._bossBarY, this._bossBarH,
        BOSS_W,
        Math.max(0, Math.min(1, b.health / b.maxHealth)),
      );
    } else if (b && b.isDead) {
      // Drain the boss bar to 0 on death (already at 0 if killed properly)
      this._bossGfx.clear();
      this._bossShimGfx.clear();
    }
  }

  // ── Draw one demon-style bar ───────────────────────────────────────────────
  _drawBar(fillGfx, shimGfx, bx, by, bh, maxW, pct) {
    const fw = maxW * pct;
    fillGfx.clear();
    shimGfx.clear();
    if (fw <= 0) return;

    // 1. Void base
    fillGfx.fillStyle(C.BAR_VOID, 1);
    fillPara(fillGfx, bx, by, fw, bh, SLANT);

    // 2. Dark crimson lower half
    fillGfx.fillStyle(C.BAR_DARK, 1);
    fillPara(fillGfx, bx, by + Math.floor(bh * 0.5), fw, Math.ceil(bh * 0.5), SLANT);

    // 3. Crimson mid gradient
    fillGfx.fillGradientStyle(C.BAR_BRIGHT, C.BAR_BRIGHT, C.BAR_MID, C.BAR_MID, 1);
    fillPara(fillGfx, bx, by + 2, fw, Math.floor(bh * 0.55), SLANT);

    // 4. Bright top sliver
    fillGfx.fillStyle(0xff2244, 0.85);
    fillPara(fillGfx, bx, by, fw, 3, SLANT);

    // 5. Crack veins
    drawCracks(fillGfx, bx, by, fw, bh, maxW, C.CRACK_A, C.CRACK_B, 0.6);

    // 6. Shimmer (animated by tween on shimGfx's alpha)
    shimGfx.fillStyle(C.SHIMMER, 1);
    fillPara(shimGfx, bx, by, fw, 4, SLANT);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EVENTS
  // ══════════════════════════════════════════════════════════════════════════
  _listenEvents() {
    const ev = this._scene.events;
    ev.on('weapon-changed', t  => this._onWeaponChanged(t));
    ev.on('armor-equipped', d  => this._onArmorEquipped(d));
    ev.on('armor-hit',      d  => this._onArmorHit(d));
    ev.on('armor-broken',   () => this._onArmorBroken());
    ev.on('armor-refilled', d  => this._onArmorRefilled(d));
    ev.on('combo-hit',      () => this._onComboHit());
    ev.on('combo-reset',    () => this._onComboReset());
  }

  // ── Armor ──────────────────────────────────────────────────────────────────
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

  // ── Weapon ─────────────────────────────────────────────────────────────────
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
    this._iconRects = def.draw(this._scene, this._slotX, this._slotY, D + 6);
    this._slotLabel.setText(def.hint).setColor(def.color);
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
}
