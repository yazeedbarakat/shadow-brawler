/* global Phaser */
import { preloadAssets, assetLoaded } from '../systems/AssetLoader.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload() {
    preloadAssets(this, ['bg_menu']);
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Background ────────────────────────────────────────────────────────────
    if (assetLoaded(this, 'bg_menu')) {
      this.add.image(W / 2, H / 2, 'bg_menu').setDisplaySize(W, H).setDepth(0);
    } else {
      this.add.rectangle(W / 2, H / 2, W, H, 0x0d0010).setDepth(0);
    }

    // Dark gradient overlay so text reads cleanly over the art
    const overlay = this.add.graphics().setDepth(1);
    overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.72, 0.72);
    overlay.fillRect(0, H * 0.38, W, H * 0.62);

    // Subtle vignette top
    const vigTop = this.add.graphics().setDepth(1);
    vigTop.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    vigTop.fillRect(0, 0, W, H * 0.3);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(W / 2, H * 0.12, 'BRAWLER', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ccaaff',
      stroke: '#220033',
      strokeThickness: 4,
      letterSpacing: 12,
    }).setOrigin(0.5).setDepth(5).setAlpha(0.85);

    // ── PLAY button (large brush-stroke style) ────────────────────────────────
    const playY = H * 0.60;

    // Glow halo behind the text
    const glow = this.add.graphics().setDepth(3);
    glow.fillStyle(0x6600cc, 0.18);
    glow.fillEllipse(W / 2, playY, 260, 60);

    // Horizontal separator lines flanking "PLAY"
    this.add.rectangle(W / 2 - 140, playY + 1, 80, 1, 0x9933ff, 0.7).setDepth(4);
    this.add.rectangle(W / 2 + 140, playY + 1, 80, 1, 0x9933ff, 0.7).setDepth(4);

    const playTxt = this.add.text(W / 2, playY, 'PLAY', {
      fontSize: '64px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic bold',
      color: '#ffffff',
      stroke: '#8822ee',
      strokeThickness: 7,
      shadow: { offsetX: 0, offsetY: 0, color: '#aa44ff', blur: 18, fill: true },
    }).setOrigin(0.5).setDepth(5);

    // Invisible hit-target larger than the text for easy clicking
    const playHit = this.add.rectangle(W / 2, playY, 280, 70, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(6);

    playHit.on('pointerover', () => {
      playTxt.setColor('#ddaaff');
      this.tweens.add({ targets: playTxt, scaleX: 1.06, scaleY: 1.06, duration: 120, ease: 'Power2' });
      glow.clear();
      glow.fillStyle(0x9944ff, 0.30);
      glow.fillEllipse(W / 2, playY, 300, 70);
    });
    playHit.on('pointerout', () => {
      playTxt.setColor('#ffffff');
      this.tweens.add({ targets: playTxt, scaleX: 1, scaleY: 1, duration: 120, ease: 'Power2' });
      glow.clear();
      glow.fillStyle(0x6600cc, 0.18);
      glow.fillEllipse(W / 2, playY, 260, 60);
    });
    playHit.on('pointerdown', () => playTxt.setAlpha(0.7));
    playHit.on('pointerup', () => this.scene.start('Level1Scene'));

    // ── Controls legend (pinned to bottom edge) ───────────────────────────────
    this.add.rectangle(W / 2, H - 14, W, 28, 0x000000, 0.62).setDepth(4);

    this.add.text(W / 2, H - 14, '← → Move   ↑ Jump   Z Punch   X Kick', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#887799',
    }).setOrigin(0.5).setDepth(5);
  }
}
