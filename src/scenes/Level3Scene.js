/* global Phaser */
import Player       from '../characters/Player.js';
import Enemy        from '../characters/Enemy.js';
import RangedEnemy  from '../characters/RangedEnemy.js';
import CombatSystem from '../systems/CombatSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HUD          from '../systems/HUD.js';
import { preloadAssets, assetLoaded } from '../systems/AssetLoader.js';
import { addWeather } from '../systems/WeatherSystem.js';

const WORLD_W    = 800;
const WORLD_H    = 450;
const GROUND_TOP = WORLD_H - 60;

export default class Level3Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level3Scene' });
  }

  preload() {
    preloadAssets(this, [
      'player', 'player_walk', 'player_jump', 'player_hit',
      'player_punch', 'player_sword', 'player_kick',
      'enemy', 'enemy_ranged', 'pickup_throwingstar', 'proj_star', 'proj_enemy',
      'bg_forest', 'plat_forest',
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
    addWeather(this, 'leaves');

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
  }

  // ─── Background: dark forest ──────────────────────────────────────────────

  _buildBackground() {
    if (assetLoaded(this, 'bg_forest')) {
      this.add.image(WORLD_W / 2, WORLD_H / 2, 'bg_forest').setDisplaySize(WORLD_W, WORLD_H);
      return;
    }
    // Black night sky
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x000005);

    // Stars
    for (let i = 0; i < 90; i++) {
      const sx = (i * 293 + 15) % WORLD_W;
      const sy = 4 + (i * 127)  % 120;
      const br = 0.2 + (i % 6) * 0.08;
      this.add.rectangle(sx, sy, i % 8 === 0 ? 2 : 1, i % 8 === 0 ? 2 : 1, 0xffffff, br);
    }

    // Moon (partial cloud coverage)
    this.add.rectangle(1480, 52, 50, 50, 0xcce8ff);
    this.add.rectangle(1494, 48, 22, 28, 0x000005); // crescent shadow bite
    this.add.rectangle(1480, 52, 100, 100, 0x8899cc, 0.07); // glow

    // Distant tree silhouettes — three layers of depth
    this._drawTreeLayer(0x030a02, 0.55, 22, 260, 340, 26); // far (barely visible)
    this._drawTreeLayer(0x071404, 0.75, 18, 200, 290, 20); // mid
    this._drawTreeLayer(0x0c2008, 0.92, 14, 150, 240, 16); // near

    // Atmospheric fog bands
    [210, 270, 330, 390].forEach((fy, i) => {
      this.add.rectangle(WORLD_W / 2, fy, WORLD_W, 28 - i * 4, 0x112211, 0.14 - i * 0.02);
    });

    // Ground-level root tangles and undergrowth
    for (let i = 0; i < 24; i++) {
      const rx = (i * 197 + 40)  % WORLD_W;
      const rh = 10 + (i * 37)   % 20;
      this.add.rectangle(rx, GROUND_TOP - rh / 2, 24 + (i % 4) * 8, rh, 0x0a1a08, 0.85);
    }

    // Fireflies — scattered glowing dots
    for (let i = 0; i < 40; i++) {
      const fx = (i * 191 + 25)  % WORLD_W;
      const fy = 80 + (i * 113)  % 270;
      this.add.rectangle(fx, fy, 2, 2, 0x88ff66, 0.25 + (i % 5) * 0.12);
    }

    // Ground surface
    this.add.rectangle(WORLD_W / 2, WORLD_H - 4,  WORLD_W, 18, 0x020602);
    this.add.rectangle(WORLD_W / 2, WORLD_H - 20, WORLD_W,  4, 0x0c1c0a);
  }

  /**
   * Draws a layer of tree silhouettes using stacked rectangles.
   * Trees are pine-shaped (wide canopy narrowing to a point at top).
   */
  _drawTreeLayer(color, alpha, count, minH, maxH, trunk) {
    const step = Math.floor(WORLD_W / count);
    for (let i = 0; i < count; i++) {
      const tx = (i * step + (i * 47) % step + 10) % WORLD_W;
      const th = minH + (tx * 7 + i * 31) % (maxH - minH);
      const tw = 22 + (i * 19) % 28; // 22–50 px wide base

      // Trunk (narrow)
      this.add.rectangle(tx, GROUND_TOP - trunk / 2, tw * 0.28, trunk, color, alpha * 0.7);

      // Canopy — 4 layers of decreasing width, each slightly above the last
      const layers = 4;
      for (let l = 0; l < layers; l++) {
        const fraction = 1 - l / layers;
        const lw = tw * fraction;
        const lh = (th / layers) * 1.2;
        const ly = GROUND_TOP - trunk - lh * l - lh / 2;
        this.add.rectangle(tx, ly, lw, lh + 4, color, alpha * (0.8 + l * 0.05));
      }
    }
  }

  // ─── Platforms: mossy stone / dark forest logs ────────────────────────────

  _buildPlatforms() {
    const MOSS  = 0x1e3e18;  // dark mossy green
    const TOP   = 0x2c6122;  // lighter green moss on top surface
    const UNDER = 0x0e1e0a;  // dark underside shadow

    const defs = [
      { x: WORLD_W / 2, y: GROUND_TOP + 10, w: WORLD_W, h: 20, color: 0x030803, edge: false },
    ];

    const PLAT_KEY = 'plat_forest';
    const useTex   = assetLoaded(this, PLAT_KEY);

    return defs.map(({ x, y, w, h = 16, color = MOSS, edge = true }) => {
      const plat = useTex
        ? this.add.tileSprite(x, y, w, h, PLAT_KEY)
        : this.add.rectangle(x, y, w, h, color);
      this.physics.add.existing(plat, true);
      if (!edge) plat.setAlpha(0);

      if (!useTex && edge) {
        this.add.rectangle(x, y - h / 2 + 1, w, 4, TOP);
        this.add.rectangle(x, y + h / 2 - 1, w, 2, UNDER);
        for (let kx = x - w / 2 + 14; kx < x + w / 2 - 8; kx += 22) {
          this.add.rectangle(kx, y, 2, h - 4, UNDER, 0.55);
        }
      }
      return plat;
    });
  }

  // ─── Exit door ────────────────────────────────────────────────────────────

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.player = new Player(this, 60, 346);
    this.physics.add.collider(this.player.sprite, this._platforms);
    this.events.on('player-dead', () => this._endGame(false));
  }

  // ─── Enemies: 3 melee (fast/low-hp) + 2 ranged ────────────────────────────

  _createEnemies() {
    this.enemies        = [];
    this.enemyGroup     = this.physics.add.group();
    this._rangedEnemies = [];

    // Shared configs
    const meleeCfg  = { health: 40, speed: 115, chaseSpeed: 165,
                        detectionRange: 270, contactDamage: 10,
                        color: 0x1a6618 };   // dark forest green
    const rangedCfg = { health: 40, speed: 95,  chaseSpeed: 138,
                        detectionRange: 300, contactDamage: 8,
                        color: 0x116614, textureKey: 'enemy_ranged',
                        shootRange: 290, minShootRange: 88,
                        shootRate: 2400, projDamage: 8 };

    // Single ranged boss — keeps distance and pelts the player
    const bossCfg = { ...rangedCfg,
      health: 350, speed: 80, chaseSpeed: 115,
      detectionRange: 700, contactDamage: 14,
      knockbackSpeed: 100, w: 44, h: 60,
      shootRange: 600, minShootRange: 80,
      shootRate: 1600, projDamage: 12,
    };

    const re = new RangedEnemy(this, 560, 358, bossCfg);
    this.enemies.push(re);
    this._rangedEnemies.push(re);
    this.enemyGroup.add(re.sprite);

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

    // Wire ranged enemies' projectiles → player damage
    this._rangedEnemies.forEach(re => {
      re.setupProjectileOverlap(this.player.sprite, dmg => {
        const dead = this.player.takeDamage(dmg);
        if (dead) this._endGame(false);
      });
    });


  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._hud = new HUD(this);

    this._noticeTxt = this.add.text(400, 88, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#44ff88',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22).setAlpha(0);
  }

  // ─── Level clear ──────────────────────────────────────────────────────────

  _checkDoorUnlock() {
    if (this._done || !this.enemies.every(e => e.isDead)) return;
    this._done = true;
    this._noticeTxt.setText('LEVEL CLEAR!').setAlpha(1);
    this.cameras.main.flash(500, 200, 255, 200);
    this.time.delayedCall(1400, () => {
      this.scene.start('Level4Scene', { score: this.score });
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._done) return;

    this.player.update(time, delta);
    this.weaponSystem.update();
    this._hud.update(this.player);

    // Enemy update — RangedEnemy.update() handles projectile firing automatically
    const alive = this.enemies.filter(e => e.sprite.active);
    alive.forEach(e => e.update(this.player, delta));
    this.enemies = alive;
    this._checkDoorUnlock();
  }

  _endGame(win) {
    if (this._done) return;
    this._done = true;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score, win, originScene: 'Level3Scene' });
    });
  }
}
