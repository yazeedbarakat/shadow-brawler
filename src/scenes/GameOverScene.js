/* global Phaser */
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score       = data.score       ?? 0;
    this.win         = data.win         ?? false;
    this.originScene = data.originScene ?? 'Level1Scene';
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x04080f);

    // Subtle grid lines
    for (let gx = 0; gx < width;  gx += 48) this.add.rectangle(gx, height / 2, 1, height, 0x0a1020, 0.55);
    for (let gy = 0; gy < height; gy += 48) this.add.rectangle(cx, gy, width, 1, 0x0a1020, 0.55);

    // ── Horizontal rule at top and bottom ─────────────────────────────────────
    const accentColor = this.win ? 0x22cc66 : 0xcc2222;
    this.add.rectangle(cx, 6,          width, 4, accentColor);
    this.add.rectangle(cx, height - 6, width, 4, accentColor);

    // ── Main heading ──────────────────────────────────────────────────────────
    const heading    = this.win ? 'LEVEL COMPLETE' : 'GAME OVER';
    const headColor  = this.win ? '#22dd77'        : '#dd3333';

    this.add.text(cx, height * 0.20, heading, {
      fontSize: '58px',
      fontFamily: 'monospace',
      color: headColor,
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // Sub-label (level name derived from originScene)
    const levelLabel = {
      Level1Scene: 'LEVEL 1 — CITY STREETS',
      Level2Scene: 'LEVEL 2 — ANCIENT TEMPLE',
      Level3Scene: 'LEVEL 3 — DARK FOREST',
      Level4Scene: 'LEVEL 4 — CASTLE FORTRESS',
      Level5Scene: 'LEVEL 5 — FINAL BOSS',
    }[this.originScene] ?? '';

    if (levelLabel) {
      this.add.text(cx, height * 0.20 + 62, levelLabel, {
        fontSize: '14px', fontFamily: 'monospace', color: '#446688',
      }).setOrigin(0.5);
    }

    // ── Score panel ───────────────────────────────────────────────────────────
    this.add.rectangle(cx, height * 0.48, 280, 52, 0x0a1828).setStrokeStyle(1, 0x1a3048);
    this.add.text(cx, height * 0.48 - 14, 'SCORE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#334455',
    }).setOrigin(0.5);
    this.add.text(cx, height * 0.48 + 6, this.score.toLocaleString(), {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffff55',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5);

    // ── Buttons ───────────────────────────────────────────────────────────────
    this._makeButton(
      cx - 105, height * 0.72, 185,
      'PLAY AGAIN',
      0x1a4a28, 0x22cc55,
      () => this.scene.start(this.originScene),
    );

    this._makeButton(
      cx + 105, height * 0.72, 185,
      'MAIN MENU',
      0x1a2848, 0x3366aa,
      () => this.scene.start('MenuScene'),
    );

    // ── Tip line at bottom ────────────────────────────────────────────────────
    const tip = this.win
      ? 'Armor reduces damage by 30 %  —  collect it on high platforms'
      : 'Tip: pick up armor to absorb hits and slow enemy damage';

    this.add.text(cx, height - 22, tip, {
      fontSize: '10px', fontFamily: 'monospace', color: '#223344',
    }).setOrigin(0.5);
  }

  _makeButton(x, y, w, label, bgColor, borderColor, onClick) {
    const btn = this.add.rectangle(x, y, w, 50, bgColor)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, borderColor);

    this.add.text(x, y, label, {
      fontSize: '17px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);

    btn.on('pointerover',  () => btn.setFillStyle(
      Phaser.Display.Color.ValueToColor(bgColor).lighten(18).color,
    ));
    btn.on('pointerout',   () => btn.setFillStyle(bgColor));
    btn.on('pointerdown',  () => btn.setFillStyle(
      Phaser.Display.Color.ValueToColor(bgColor).darken(15).color,
    ));
    btn.on('pointerup',    () => onClick());
  }
}
