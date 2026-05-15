/* global Phaser */
import Player       from '../characters/Player.js';
import Enemy        from '../characters/Enemy.js';
import CombatSystem from '../systems/CombatSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HUD          from '../systems/HUD.js';
import { preloadAssets, assetLoaded } from '../systems/AssetLoader.js';
import { addWeather } from '../systems/WeatherSystem.js';

const WORLD_W    = 1600;
const WORLD_H    = 450;
const GROUND_TOP = WORLD_H - 60;

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level2Scene' });
  }

  preload() {
    preloadAssets(this, [
      'player', 'player_walk', 'player_jump', 'player_hit',
      'player_punch', 'player_sword', 'player_kick',
      'enemy', 'pickup_sword', 'pickup_throwingstar', 'proj_star',
      'bg_temple', 'plat_temple',
    ]);
  }

  create() {
    this.score = 0;
    this._done = false;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this._buildBackground();
    this._platforms = this._buildPlatforms();
    this._createPlayer();
    this._createEnemies();
    this._setupSystems();
    this._buildHUD();
    addWeather(this, 'snow');

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.04);
    this.cameras.main.setDeadzone(80, 60);
  }

  // ─── Background: ancient temple ───────────────────────────────────────────

  _buildBackground() {
    if (assetLoaded(this, 'bg_temple')) {
      this.add.image(WORLD_W / 2, WORLD_H / 2, 'bg_temple').setDisplaySize(WORLD_W, WORLD_H);
      return;
    }
    // Base stone wall
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x1e1006);

    // Stone block grid (alternating shades for wall texture)
    const BW = 96, BH = 64;
    for (let bx = 0; bx <= WORLD_W; bx += BW) {
      for (let by = 0; by <= WORLD_H; by += BH) {
        const even = ((bx / BW) + (by / BH)) % 2 === 0;
        this.add.rectangle(bx + BW / 2, by + BH / 2, BW - 2, BH - 2,
          even ? 0x241508 : 0x1a0e04, 0.9);
      }
    }

    // Columns — tall stone pillars at regular intervals
    const colPositions = [160, 430, 700, 970, 1240, 1510];
    colPositions.forEach(cx => {
      // Shaft
      this.add.rectangle(cx, WORLD_H / 2, 34, WORLD_H, 0x4a2e0c);
      // Capital (top block)
      this.add.rectangle(cx, 18, 52, 28, 0x5a3a12);
      // Entasis (middle slight bulge — two rects slightly wider at center)
      this.add.rectangle(cx, WORLD_H * 0.45, 38, 20, 0x5a3a12, 0.5);
      // Base
      this.add.rectangle(cx, GROUND_TOP - 6, 52, 20, 0x4a2e0c);

      // Torch bracket on column
      const torchY = 90;
      this.add.rectangle(cx + 22, torchY, 18, 5, 0x3a2008);  // bracket arm
      this.add.rectangle(cx + 30, torchY - 8, 8, 14, 0x2a1404); // cup
      // Flame
      this.add.rectangle(cx + 30, torchY - 18, 6, 10, 0xff6600, 0.9);
      this.add.rectangle(cx + 30, torchY - 22, 4, 6,  0xffcc00, 0.8);
      // Glow halos
      this.add.rectangle(cx + 30, torchY - 16, 32, 32, 0xff8800, 0.10);
      this.add.rectangle(cx + 30, torchY - 16, 70, 70, 0xff8800, 0.04);
    });

    // Carved decorative panels between columns
    [290, 565, 835, 1105, 1375].forEach((px, idx) => {
      // Panel slab
      this.add.rectangle(px, WORLD_H * 0.35, 110, 130, 0x2e1c08, 0.75);
      // Carved border
      this.add.rectangle(px, WORLD_H * 0.35, 106, 126, 0x3a2410, 0.6);
      // Glyph marks — simple geometric pattern to suggest hieroglyphs
      const rows = 4, cols = 3;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gx = px - 34 + c * 34;
          const gy = WORLD_H * 0.35 - 44 + r * 28;
          const shape = (idx + r + c) % 3;
          if (shape === 0) this.add.rectangle(gx, gy, 18, 10, 0x6a4820, 0.55);
          else if (shape === 1) this.add.rectangle(gx, gy, 10, 18, 0x6a4820, 0.55);
          else {
            this.add.rectangle(gx, gy - 3, 16, 6,  0x6a4820, 0.55);
            this.add.rectangle(gx, gy + 3, 16, 6,  0x6a4820, 0.55);
          }
        }
      }
    });

    // Ceiling arch bar
    this.add.rectangle(WORLD_W / 2, 4, WORLD_W, 8, 0x3a2008);

    // Floor / ground surface
    this.add.rectangle(WORLD_W / 2, WORLD_H - 4,  WORLD_W, 18, 0x150b02);
    this.add.rectangle(WORLD_W / 2, WORLD_H - 20, WORLD_W,  4, 0x3a2408);

    // Dust/particle haze near the floor
    for (let i = 0; i < 20; i++) {
      const dx = (i * 239 + 80) % WORLD_W;
      this.add.rectangle(dx, GROUND_TOP - 10, 6, 6, 0xcc8844, 0.06);
    }
  }

  // ─── Platforms: brown stone slabs ─────────────────────────────────────────

  _buildPlatforms() {
    const PLAT_KEY = 'plat_temple';
    const useTex   = assetLoaded(this, PLAT_KEY);

    const STONE = 0x7a5820;
    const TOP   = 0xaa8830;  // worn top surface
    const SHADE = 0x4a3010;  // underside shadow

    const defs = [
      { x: WORLD_W / 2, y: GROUND_TOP + 10, w: WORLD_W, h: 20, color: 0x2a1808, edge: false },
    ];

    return defs.map(({ x, y, w, h = 16, color = STONE, edge = true }) => {
      const plat = useTex
        ? this.add.tileSprite(x, y, w, h, PLAT_KEY)
        : this.add.rectangle(x, y, w, h, color);
      this.physics.add.existing(plat, true);
      if (!edge) plat.setAlpha(0);

      if (!useTex && edge) {
        this.add.rectangle(x, y - h / 2 + 1, w, 3, TOP);
        this.add.rectangle(x, y + h / 2 - 1, w, 3, SHADE);
        [-w / 3, w / 3].forEach(ox => {
          this.add.rectangle(x + ox, y, 2, h - 2, SHADE, 0.6);
        });
      }
      return plat;
    });
  }

  // ─── Exit door ────────────────────────────────────────────────────────────

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.player = new Player(this, 60, 376);
    this.physics.add.collider(this.player.sprite, this._platforms);
    this.events.on('player-dead', () => this._endGame(false));
  }

  // ─── Enemies (4, health=80 — harder than Level 1) ─────────────────────────

  _createEnemies() {
    this.enemies    = [];
    this.enemyGroup = this.physics.add.group();

    // Platform tops: P2 y=308−8=300, P3 y=252−8=244, P4 y=310−8=302, P6 y=308−8=300
    // Enemy center = top − 26 (half of 52px height)
    const spawns = [
      { x: 300,  y: 364, cfg: { health: 80, speed: 78, chaseSpeed: 114,
          detectionRange: 260, contactDamage: 12, color: 0xaa5522 } },
      { x: 600,  y: 364, cfg: { health: 80, speed: 76, chaseSpeed: 110,
          detectionRange: 260, contactDamage: 12, color: 0xaa5522 } },
      { x: 900,  y: 364, cfg: { health: 80, speed: 80, chaseSpeed: 116,
          detectionRange: 255, contactDamage: 12, color: 0xaa5522 } },
      { x: 1200, y: 364, cfg: { health: 80, speed: 82, chaseSpeed: 118,
          detectionRange: 265, contactDamage: 12, color: 0xaa5522 } },
    ];

    spawns.forEach(({ x, y, cfg }) => {
      const e = new Enemy(this, x, y, cfg);
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
      onEnemyKilled: () => { this.score += 100; this._checkDoorUnlock(); },
      onPlayerDied:  () => this._endGame(false),
    });


  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._hud = new HUD(this);

    this._noticeTxt = this.add.text(400, 88, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffcc44',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22).setAlpha(0);
  }

  // ─── Level clear ──────────────────────────────────────────────────────────

  _checkDoorUnlock() {
    if (this._done || !this.enemies.every(e => e.isDead)) return;
    this._done = true;
    this._noticeTxt.setText('LEVEL CLEAR!').setAlpha(1);
    this.cameras.main.flash(500, 255, 240, 200);
    this.time.delayedCall(1400, () => {
      this.scene.start('Level3Scene', { score: this.score });
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._done) return;

    this.player.update(time, delta);
    this.weaponSystem.update();
    this._hud.update(this.player);

    const alive = this.enemies.filter(e => e.sprite.active);
    alive.forEach(e => e.update(this.player, delta));
    this.enemies = alive;
    this._checkDoorUnlock();
  }

  _endGame(win) {
    if (this._done) return;
    this._done = true;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score, win, originScene: 'Level2Scene' });
    });
  }
}
