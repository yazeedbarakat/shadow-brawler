export default class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d0d1a);

    // Decorative bars
    this.add.rectangle(width / 2, 8, width, 16, 0x4488ff);
    this.add.rectangle(width / 2, height - 8, width, 16, 0x4488ff);

    this.add.text(width / 2, height * 0.28, 'BRAWLER', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#4488ff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28 + 72, 'a side-scrolling brawler', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#556688',
    }).setOrigin(0.5);

    // Start button
    const btn = this.add.rectangle(width / 2, height * 0.62, 200, 56, 0x4488ff)
      .setInteractive({ useHandCursor: true });

    const btnLabel = this.add.text(width / 2, height * 0.62, 'START GAME', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn.on('pointerover', () => { btn.setFillStyle(0x66aaff); btnLabel.setColor('#ffffff'); });
    btn.on('pointerout',  () => { btn.setFillStyle(0x4488ff); });
    btn.on('pointerdown', () => btn.setFillStyle(0x2255cc));
    btn.on('pointerup',   () => this.scene.start('Level1Scene'));

    // Controls
    const controls = [
      '← → Arrow Keys  Move',
      '↑ Arrow Key     Jump',
      'Z               Punch',
    ];
    controls.forEach((line, i) => {
      this.add.text(width / 2, height * 0.8 + i * 22, line, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#556688',
      }).setOrigin(0.5);
    });
  }
}
