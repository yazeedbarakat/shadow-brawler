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

    // ── PLAY button (large brush-stroke style) ────────────────────────────────
    const playY = H * 0.60;

    // Semi-circular arc above "PLAY" (halo effect)
    const arc = this.add.graphics().setDepth(3);
    arc.lineStyle(2, 0xcc88ff, 0.7);
    arc.beginPath();
    arc.arc(W / 2, playY + 8, 68, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
    arc.strokePath();

    // Glow halo behind the text
    const glow = this.add.graphics().setDepth(3);
    glow.fillStyle(0x7b2fff, 0.22);
    glow.fillEllipse(W / 2, playY, 280, 68);

    // Horizontal separator lines flanking "PLAY"
    this.add.rectangle(W / 2 - 148, playY + 2, 84, 1, 0xcc88ff, 0.7).setDepth(4);
    this.add.rectangle(W / 2 + 148, playY + 2, 84, 1, 0xcc88ff, 0.7).setDepth(4);

    const playTxt = this.add.text(W / 2, playY, 'PLAY', {
      fontSize: '64px',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic bold',
      color: '#ffffff',
      stroke: '#7b2fff',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 0, color: '#cc88ff', blur: 28, fill: true },
    }).setOrigin(0.5).setDepth(5);

    // Invisible hit-target larger than the text for easy clicking
    const playHit = this.add.rectangle(W / 2, playY, 300, 80, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(6);

    playHit.on('pointerover', () => {
      playTxt.setColor('#eeddff');
      this.tweens.add({ targets: playTxt, scaleX: 1.06, scaleY: 1.06, duration: 120, ease: 'Power2' });
      glow.clear();
      glow.fillStyle(0x9d4eff, 0.35);
      glow.fillEllipse(W / 2, playY, 320, 78);
    });
    playHit.on('pointerout', () => {
      playTxt.setColor('#ffffff');
      this.tweens.add({ targets: playTxt, scaleX: 1, scaleY: 1, duration: 120, ease: 'Power2' });
      glow.clear();
      glow.fillStyle(0x7b2fff, 0.22);
      glow.fillEllipse(W / 2, playY, 280, 68);
    });
    playHit.on('pointerdown', () => playTxt.setAlpha(0.7));
    playHit.on('pointerup', () => this.scene.start('Level1Scene'));

    // ── Controls legend (pinned to bottom edge) ───────────────────────────────
    this.add.rectangle(W / 2, H - 14, W, 28, 0x000000, 0.62).setDepth(4);

    this.add.text(W / 2, H - 14, '← → Move   Shift Run   ↑ Jump   Z Attack   X Heavy   S Block   C Dash   ↓+C Roll', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#887799',
    }).setOrigin(0.5).setDepth(5);
  }
}
