/* global Phaser */
import Player       from '../characters/Player.js';
import Enemy        from '../characters/Enemy.js';
import CombatSystem from '../systems/CombatSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import ArmorSystem  from '../systems/ArmorSystem.js';
import HUD          from '../systems/HUD.js';
import { preloadAssets, assetLoaded } from '../systems/AssetLoader.js';

const WORLD_W    = 1600;
const WORLD_H    = 450;
const GROUND_TOP = WORLD_H - 20;

export default class Level4Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level4Scene' });
  }

  preload() {
    preloadAssets(this, [
      'player', 'player_walk', 'player_jump', 'player_hit',
      'player_punch', 'player_sword', 'player_kick',
      'enemy_heavy', 'pickup_sword', 'pickup_armor', 'proj_star',
      'bg_castle', 'plat_castle',
    ]);
  }

  create() {
    this.score     = 0;
    this._done     = false;
    this._doorOpen = false;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this._buildBackground();
    this._platforms = this._buildPlatforms();
    this._buildExit();
    this._createPlayer();
    this._armorSystem = new ArmorSystem(this, this.player);
    this._createEnemies();
    this._setupSystems();
    this._buildHUD();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.04);
    this.cameras.main.setDeadzone(80, 60);
  }

  // ─── Background: castle fortress ─────────────────────────────────────────

  _buildBackground() {
    if (assetLoaded(this, 'bg_castle')) {
      this.add.image(WORLD_W / 2, WORLD_H / 2, 'bg_castle').setDisplaySize(WORLD_W, WORLD_H);
      return;
    }
    // Stone wall base
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x10101e);

    // Stone block grid (alternating grey-blue shades)
    const BW = 88, BH = 56;
    for (let bx = 0; bx <= WORLD_W; bx += BW) {
      for (let by = 0; by <= WORLD_H; by += BH) {
        const even = ((bx / BW) + (by / BH)) % 2 === 0;
        this.add.rectangle(bx + BW / 2, by + BH / 2, BW - 2, BH - 2,
          even ? 0x18182c : 0x141428, 0.88);
      }
    }

    // Battlements (crenellations) along the very top
    for (let bx = 0; bx <= WORLD_W; bx += 56) {
      const isMerlon = Math.floor(bx / 56) % 2 === 0;
      this.add.rectangle(bx + 28, isMerlon ? 18 : 5, 52, isMerlon ? 32 : 8, 0x1e1e32);
    }

    // Stone columns — tall vertical pillars
    [170, 500, 830, 1160, 1490].forEach(cx => {
      this.add.rectangle(cx, WORLD_H / 2, 32, WORLD_H, 0x1c1c30);
      this.add.rectangle(cx, 22,           48, 30, 0x24243a); // capital
      this.add.rectangle(cx, GROUND_TOP - 6, 48, 16, 0x1c1c2e); // base
    });

    // Stained glass windows between columns
    [[332, 80], [660, 80], [990, 80], [1320, 80]].forEach(([wx, wy]) => {
      // Stone arch frame
      this.add.rectangle(wx, wy, 88, 120, 0x1a1a2e);
      // Glass panes (3 columns of colour)
      [
        [wx - 27, 0x551122], // deep red
        [wx,      0x112255], // deep blue
        [wx + 27, 0x225511], // deep green
      ].forEach(([gx, gc]) => {
        this.add.rectangle(gx, wy - 4, 22, 80, gc, 0.62);
      });
      // Arch crown (semi-circle approximated with rects)
      this.add.rectangle(wx, wy - 52, 68, 18, 0x223355, 0.5);
      this.add.rectangle(wx, wy - 64, 40, 14, 0x223355, 0.4);
      // Leading lines
      [-13, 0, 13].forEach(lx => {
        this.add.rectangle(wx + lx, wy - 4, 2, 82, 0x080810, 0.9);
      });
    });

    // Hanging banners / tapestries
    [245, 580, 915, 1245].forEach((bx, i) => {
      const bc = i % 2 === 0 ? 0x660000 : 0x000066;
      this.add.rectangle(bx, 52, 40, 18, 0x998800, 0.9); // rod
      this.add.rectangle(bx, 140, 30, 110, bc, 0.88);    // cloth
      this.add.rectangle(bx, 200, 20, 10, bc, 0.88);      // tapered bottom
      this.add.rectangle(bx, 209, 8, 14, bc, 0.88);
      // Crest symbol on banner
      this.add.rectangle(bx, 130, 16, 4,  0xaa8800, 0.7);
      this.add.rectangle(bx, 130, 4,  16, 0xaa8800, 0.7);
    });

    // Wall torch sconces
    [90, 415, 745, 1075, 1405].forEach(tx => {
      this.add.rectangle(tx + 18, 195, 20, 5,  0x2a1a0a);   // bracket arm
      this.add.rectangle(tx + 26, 186, 9,  14, 0x3a2010);   // cup
      this.add.rectangle(tx + 26, 173, 6,  10, 0xff6600, 0.92); // flame
      this.add.rectangle(tx + 26, 168, 4,  7,  0xffcc00, 0.85); // tip
      this.add.rectangle(tx + 26, 172, 28, 28, 0xff8800, 0.10); // glow
      this.add.rectangle(tx + 26, 172, 58, 58, 0xff8800, 0.04);
    });

    // Floor stone seams
    this.add.rectangle(WORLD_W / 2, WORLD_H - 4,  WORLD_W, 18, 0x0e0e1c);
    this.add.rectangle(WORLD_W / 2, WORLD_H - 20, WORLD_W,  4, 0x282840);
    for (let sx = 0; sx <= WORLD_W; sx += 120) {
      this.add.rectangle(sx, WORLD_H - 11, 2, 18, 0x1a1a2e, 0.6);
    }
  }

  // ─── Platforms: grey-blue castle stone ───────────────────────────────────

  _buildPlatforms() {
    const SLATE = 0x2c2c42; // dark slate rampart stone
    const GOLD  = 0x7a6a28; // gold trim along top (ornamental)
    const SHADE = 0x16162a; // underside shadow

    const defs = [
      { x: WORLD_W / 2, y: WORLD_H - 10, w: WORLD_W, h: 20, color: 0x0e0e1c, edge: false },
      { x: 198,  y: 366, w: 155 }, // P1 — starting step
      { x: 398,  y: 308, w: 185 }, // P2 — heavy enemy 1
      { x: 638,  y: 252, w: 175 }, // P3 — heavy enemy 2
      { x: 878,  y: 310, w: 180 }, // P4 — heavy enemy 3
      { x: 1096, y: 254, w: 164 }, // P5 — sword pickup
      { x: 1312, y: 308, w: 190 }, // P6 — heavy enemy 4
      { x: 1500, y: 368, w: 158 }, // P7 — approach to exit
    ];

    const PLAT_KEY = 'plat_castle';
    const useTex   = assetLoaded(this, PLAT_KEY);

    return defs.map(({ x, y, w, h = 16, color = SLATE, edge = true }) => {
      const plat = useTex
        ? this.add.tileSprite(x, y, w, h, PLAT_KEY)
        : this.add.rectangle(x, y, w, h, color);
      this.physics.add.existing(plat, true);

      if (!useTex && edge) {
        this.add.rectangle(x, y - h / 2 + 1, w, 3, GOLD);
        this.add.rectangle(x, y + h / 2 - 1, w, 2, SHADE);
        [-w / 3, 0, w / 3].forEach(ox => {
          this.add.rectangle(x + ox, y, 2, h - 3, SHADE, 0.55);
        });
      }
      return plat;
    });
  }

  // ─── Exit door ────────────────────────────────────────────────────────────

  _buildExit() {
    const dx = WORLD_W - 44;
    const dh = 100;
    const dy = GROUND_TOP - dh / 2;

    // Portcullis frame
    this.add.rectangle(dx, dy, 64, dh + 16, 0x0e0e1c).setDepth(2);
    this.add.rectangle(dx, dy, 58, dh + 10, 0x1c1c2e).setDepth(2);

    // Portcullis bars (locked)
    this._portcullis = this.add.rectangle(dx, dy, 46, dh, 0x101018).setDepth(3);
    for (let gy = dy - dh / 2 + 8; gy < dy + dh / 2; gy += 14) {
      this.add.rectangle(dx, gy, 46, 2, 0x2a2a40, 0.9).setDepth(4);
    }
    [-14, 0, 14].forEach(bx => {
      this.add.rectangle(dx + bx, dy, 4, dh - 4, 0x2a2a40, 0.9).setDepth(4);
    });

    this._lockLight = this.add.rectangle(dx, dy, 10, 10, 0xaa2222).setDepth(5);
    this._doorTxt = this.add.text(dx, dy - dh / 2 - 14, 'BARRED', {
      fontSize: '10px', fontFamily: 'monospace', color: '#882222',
    }).setOrigin(0.5).setDepth(5);

    this._arrow = this.add.text(dx - 36, dy, '>>', {
      fontSize: '18px', fontFamily: 'monospace', color: '#aaddff',
    }).setOrigin(0.5).setDepth(5).setAlpha(0);

    this._doorZone = this.add.rectangle(dx, dy, 66, dh + 14, 0x000000, 0);
    this.physics.add.existing(this._doorZone, true);
    this._dx = dx; this._dy = dy;
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.player = new Player(this, 60, 350);
    this.physics.add.collider(this.player.sprite, this._platforms);
    this.events.on('player-dead', () => this._endGame(false));
  }

  // ─── Heavy enemies (4 × 150 HP, slow, high damage) ───────────────────────

  _createEnemies() {
    this.enemies    = [];
    this.enemyGroup = this.physics.add.group();

    // Heavy guard config — large, armoured, slow but hard-hitting
    const heavyCfg = {
      health: 150, speed: 45, chaseSpeed: 78,
      contactDamage: 25, attackRate: 1100,
      knockbackSpeed: 140, // hard to push — stay close and punish
      detectionRange: 280, giveUpRange: 520,
      w: 48, h: 64,
      color: 0x3a3a5a, textureKey: 'enemy_heavy',
    };

    // Spawn above platforms so gravity settles them
    // P2 top=300, P3 top=244, P4 top=302, P6 top=300; enemy h=64 → center = top-32
    [
      { x: 398,  y: 258 }, // P2
      { x: 638,  y: 200 }, // P3
      { x: 878,  y: 260 }, // P4
      { x: 1312, y: 260 }, // P6
    ].forEach(({ x, y }) => {
      const e = new Enemy(this, x, y, heavyCfg);
      this.enemies.push(e);
      this.enemyGroup.add(e.sprite);
    });

    this.physics.add.collider(this.enemyGroup, this._platforms);
  }

  // ─── Systems + pickups ────────────────────────────────────────────────────

  _setupSystems() {
    this.weaponSystem = new WeaponSystem(this, this.player);
    this.weaponSystem.setupProjectileOverlaps(this.enemyGroup, () => {
      this.score += 100;
      this._checkDoorUnlock();
    });

    this.combat = new CombatSystem(this);
    this.combat.setupOverlaps(this.player, this.enemyGroup, {
      onEnemyKilled: () => { this.score += 150; this._checkDoorUnlock(); },
      onPlayerDied:  () => this._endGame(false),
    });

    // Armor pickup RIGHT at the start so the player gets it before engaging
    this._armorSystem.addPickup(85, 330);

    // Sword on P5 — reward for fighting through the first two heavies
    this.weaponSystem.addPickup(1096, 216, 'sword');

    this.physics.add.overlap(
      this.player.sprite,
      this._doorZone,
      () => { if (this._doorOpen && !this._done) this._enterExit(); },
    );
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._hud = new HUD(this, 'LEVEL 4 — CASTLE FORTRESS');

    const sf = 0;
    this._scoreTxt = this.add.text(14, 62, 'Score: 0', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffff55',
    }).setScrollFactor(sf).setDepth(22);

    this._enemyTxt = this.add.text(14, 78, 'Guards: 4', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff8888',
    }).setScrollFactor(sf).setDepth(22);

    this.add.text(14, 94, '! Heavy guards — deal high damage', {
      fontSize: '9px', fontFamily: 'monospace', color: '#886644',
    }).setScrollFactor(sf).setDepth(22);

    this._stateTxt = this.add.text(790, 62, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#1a2d3a',
    }).setOrigin(1, 0).setScrollFactor(sf).setDepth(22);

    this._noticeTxt = this.add.text(400, 88, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#aaddff',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(22).setAlpha(0);
  }

  // ─── Door unlock ──────────────────────────────────────────────────────────

  _checkDoorUnlock() {
    if (!this._doorOpen && this.enemies.every(e => e.isDead)) this._openDoor();
  }

  _openDoor() {
    this._doorOpen = true;
    this._portcullis.setFillStyle(0x1c2c3c);
    this._lockLight.setFillStyle(0x44aaff);
    this._doorTxt.setText('EXIT').setColor('#aaddff');

    this.tweens.add({
      targets: this._portcullis, alpha: 0.5,
      yoyo: true, repeat: -1, duration: 560, ease: 'Sine.easeInOut',
    });
    this._arrow.setAlpha(1);
    this.tweens.add({
      targets: this._arrow, x: this._dx - 20,
      yoyo: true, repeat: -1, duration: 390, ease: 'Sine.easeInOut',
    });

    this._noticeTxt.setText('FORTRESS CLEARED   GATE OPEN  >>').setAlpha(1);
    this.tweens.add({
      targets: this._noticeTxt, alpha: 0, duration: 2200, delay: 1200, ease: 'Power2',
    });
  }

  _enterExit() {
    this._done = true;
    this.cameras.main.flash(380, 200, 220, 255);
    this.time.delayedCall(420, () => {
      this.scene.start('Level5Scene', { score: this.score });
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._done) return;

    this.player.update(time, delta);
    this.weaponSystem.update();
    this._armorSystem.update();
    this._hud.update(this.player);

    const alive = this.enemies.filter(e => e.sprite.active);
    alive.forEach(e => e.update(this.player, delta));
    this.enemies = alive;

    this._scoreTxt.setText(`Score: ${this.score}`);
    const liveCount = this.enemies.filter(e => !e.isDead).length;
    this._enemyTxt
      .setText(liveCount > 0 ? `Guards: ${liveCount}` : 'All clear!')
      .setColor(liveCount > 0 ? '#ff8888' : '#aaddff');
    this._stateTxt.setText(this.player.state ?? '');
  }

  _endGame(win) {
    if (this._done) return;
    this._done = true;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score, win, originScene: 'Level4Scene' });
    });
  }
}
