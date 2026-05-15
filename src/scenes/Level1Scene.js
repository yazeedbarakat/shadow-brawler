/* global Phaser */
import Player       from '../characters/Player.js';
import Enemy        from '../characters/Enemy.js';
import CombatSystem from '../systems/CombatSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HUD          from '../systems/HUD.js';
import { preloadAssets, assetLoaded } from '../systems/AssetLoader.js';
import { addWeather } from '../systems/WeatherSystem.js';

const WORLD_W    = 800;
const WORLD_H    = 450;
const GROUND_TOP = WORLD_H - 60; // top surface of the ground platform

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1Scene' });
  }

  preload() {
    preloadAssets(this, [
      'player', 'player_walk', 'player_jump', 'player_hit',
      'player_punch', 'player_sword', 'player_kick',
      'enemy', 'pickup_sword', 'proj_star',
      'bg_level1', 'bg_city', 'plat_city', 'healthbar',
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

  // ─── Background ───────────────────────────────────────────────────────────

  _buildBackground() {
    if (assetLoaded(this, 'bg_level1')) {
      this.add.image(WORLD_W / 2, WORLD_H / 2, 'bg_level1')
        .setDisplaySize(WORLD_W, WORLD_H)
        .setDepth(0);
    } else {
      this.add.rectangle(WORLD_W / 2, WORLD_H * 0.4, WORLD_W, WORLD_H * 0.8, 0x3a0a0a);
      this.add.rectangle(WORLD_W / 2, WORLD_H * 0.85, WORLD_W, WORLD_H * 0.3, 0x1a0505);
    }
  }

  // ─── Platforms: grey concrete ─────────────────────────────────────────────

  _buildPlatforms() {
    const PLAT_KEY = 'plat_city';
    const useTex   = assetLoaded(this, PLAT_KEY);

    const BODY = 0x52526a;   // concrete grey
    const EDGE = 0x7a7a96;   // lighter top edge

    const defs = [
      { x: WORLD_W / 2, y: GROUND_TOP + 10, w: WORLD_W, h: 20, color: 0x22222e, edge: false },
    ];

    return defs.map(({ x, y, w, h = 16, color = BODY, edge = true }) => {
      const plat = useTex
        ? this.add.tileSprite(x, y, w, h, PLAT_KEY)
        : this.add.rectangle(x, y, w, h, color);
      this.physics.add.existing(plat, true);
      if (!edge) plat.setAlpha(0);

      if (!useTex && edge) {
        this.add.rectangle(x, y - h / 2 + 1, w, 3, EDGE);
        this.add.rectangle(x, y + h / 2 - 1, w, 2, 0x2a2a38);
        if (w > 120) {
          const crackX = x - w / 2 + 30 + (x % 50);
          this.add.rectangle(crackX, y, 1, h - 2, 0x3a3a50, 0.5);
        }
      }
      return plat;
    });
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.player = new Player(this, 60, 346);
    this.physics.add.collider(this.player.sprite, this._platforms);
    this.events.on('player-dead', () => this._endGame(false));
  }

  // ─── Enemies ──────────────────────────────────────────────────────────────

  _createEnemies() {
    this.enemies    = [];
    this.enemyGroup = this.physics.add.group();

    // Spawn above each target platform — gravity drops them onto the ledge
    // Target platform tops: P3 y=252−8=244, P4 y=328−8=320, P6 y=308−8=300
    // Enemy h=52 → center sits at platformTop − 26
    const bossCfg = {
      health: 220, speed: 70, chaseSpeed: 105,
      detectionRange: 700, contactDamage: 14,
      knockbackSpeed: 120, w: 44, h: 60,
      color: 0xcc2222,
    };

    const e = new Enemy(this, 550, 358, bossCfg);
    this.enemies.push(e);
    this.enemyGroup.add(e.sprite);
    this._boss = e;

    this.physics.add.collider(this.enemyGroup, this._platforms);
  }

  // ─── Systems ──────────────────────────────────────────────────────────────

  _setupSystems() {
    this.weaponSystem = new WeaponSystem(this, this.player);
    this.weaponSystem.setupProjectileOverlaps(this.enemyGroup, () => {
      this.score += 100;
      this._checkDoorUnlock();
    });

    this.combat = new CombatSystem(this);
    this.combat.setupOverlaps(this.player, this.enemyGroup, {
      onEnemyKilled: () => {
        this.score += 100;
        this._checkDoorUnlock();
      },
      onPlayerDied: () => this._endGame(false),
    });


  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._hud = new HUD(this);
    this._hud.setBoss(this._boss, 'CRIMSON WARRIOR');

    // Level-clear notice
    this._noticeTxt = this.add.text(400, 88, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(22).setAlpha(0);
  }

  // ─── Level clear ──────────────────────────────────────────────────────────

  _checkDoorUnlock() {
    if (this._done || !this.enemies.every(e => e.isDead)) return;
    this._done = true;
    this._noticeTxt.setText('LEVEL CLEAR!').setAlpha(1);
    this.cameras.main.flash(500, 255, 255, 255);
    this.time.delayedCall(1400, () => {
      this.scene.start('Level2Scene', { score: this.score });
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._done) return;

    this.player.update(time, delta);
    this.weaponSystem.update();
    this._hud.update(this.player, this._boss);

    const alive = this.enemies.filter(e => e.sprite.active);
    alive.forEach(e => e.update(this.player, delta));
    this.enemies = alive;
    this._checkDoorUnlock();
  }

  // ─── End states ───────────────────────────────────────────────────────────

  _endGame(win) {
    if (this._done) return;
    this._done = true;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score, win, originScene: 'Level1Scene' });
    });
  }
}
