/* global Phaser */
import Player       from '../characters/Player.js';
import Enemy        from '../characters/Enemy.js';
import CombatSystem from '../systems/CombatSystem.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HUD          from '../systems/HUD.js';
import { preloadAssets, assetLoaded } from '../systems/AssetLoader.js';

const WORLD_W    = 1600;
const WORLD_H    = 450;
const GROUND_TOP = WORLD_H - 20; // top surface of the ground platform

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1Scene' });
  }

  preload() {
    preloadAssets(this, [
      'player', 'enemy',
      'pickup_sword', 'proj_star',
      'bg_city', 'plat_city',
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
    this._createEnemies();
    this._setupSystems();
    this._buildHUD();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.04);
    this.cameras.main.setDeadzone(80, 60);
  }

  // ─── Background: night city ───────────────────────────────────────────────

  _buildBackground() {
    if (assetLoaded(this, 'bg_city')) {
      this.add.image(WORLD_W / 2, WORLD_H / 2, 'bg_city').setDisplaySize(WORLD_W, WORLD_H);
      return;
    }
    // Sky gradient feel — two rectangles
    this.add.rectangle(WORLD_W / 2, WORLD_H * 0.3, WORLD_W, WORLD_H * 0.6, 0x060c18);
    this.add.rectangle(WORLD_W / 2, WORLD_H * 0.8, WORLD_W, WORLD_H * 0.4, 0x0a0e1c);

    // Moon
    this.add.rectangle(1530, 40, 40, 40, 0xffffe8);
    this.add.rectangle(1541, 37, 18, 22, 0x060c18); // crescent shadow bite

    // Stars — deterministic positions so they don't flicker on restart
    for (let i = 0; i < 80; i++) {
      const sx = (i * 313 + 40)  % WORLD_W;
      const sy = 6 + (i * 97)    % 95;
      const br = 0.3 + (i % 7) * 0.1;
      this.add.rectangle(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, 0xffffff, br);
    }

    // Buildings
    this._buildBuildings();

    // Street surface (asphalt)
    this.add.rectangle(WORLD_W / 2, WORLD_H - 4,  WORLD_W, 18, 0x1a1a26);
    // Kerb / pavement edge
    this.add.rectangle(WORLD_W / 2, WORLD_H - 20, WORLD_W,  4, 0x3a3a50);
    // Centre line (road markings, dashed)
    for (let mx = 50; mx < WORLD_W; mx += 120) {
      this.add.rectangle(mx, WORLD_H - 8, 60, 3, 0x555566, 0.4);
    }

    // Street lamps
    [170, 430, 700, 960, 1220, 1490].forEach(lx => {
      this.add.rectangle(lx, WORLD_H - 48, 4, 56, 0x2a2a3a);          // pole
      this.add.rectangle(lx + 14, WORLD_H - 74, 32, 4, 0x2a2a3a);     // arm
      this.add.rectangle(lx + 28, WORLD_H - 78, 16, 9, 0xffffaa, 0.9); // bulb
      this.add.rectangle(lx + 28, WORLD_H - 76, 36, 22, 0xffffaa, 0.06); // glow
    });
  }

  _buildBuildings() {
    // [centerX, width, height, bodyColor]
    const BLDGS = [
      [75,   86, 210, 0x0d1b2e],
      [192,  66, 158, 0x0b1826],
      [296, 102, 270, 0x0e1c30],
      [420,  74, 185, 0x0f1e2e],
      [524,  62, 135, 0x0d1b28],
      [626, 102, 285, 0x09152a],
      [748,  78, 195, 0x0f1d30],
      [866, 110, 235, 0x0c1b2c],
      [990,  68, 160, 0x0e1f32],
      [1096, 92, 220, 0x0f1c2c],
      [1212, 74, 178, 0x0b192a],
      [1336,106, 248, 0x0e1d2e],
      [1464, 80, 192, 0x0d1c2e],
      [1568, 66, 148, 0x0e1f30],
    ];

    BLDGS.forEach(([cx, bw, bh, color]) => {
      const by = GROUND_TOP - bh / 2; // bottom aligns with street

      // Body
      this.add.rectangle(cx, by, bw, bh, color);
      // Roof ledge
      this.add.rectangle(cx, by - bh / 2 + 4, bw + 4, 7, 0x182230);
      // Antenna / water tower accent on some buildings
      if (bh > 200) {
        this.add.rectangle(cx + bw * 0.3, by - bh / 2 - 12, 4, 22, 0x1a2438);
        this.add.rectangle(cx - bw * 0.2, by - bh / 2 - 8,  4, 14, 0x1a2438);
      }

      // Windows — grid with pseudo-random lit/dark states
      const cols = Math.max(1, Math.floor((bw - 10) / 16));
      const rows = Math.max(1, Math.floor((bh - 22) / 20));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = cx - ((cols - 1) * 8) + c * 16;
          const wy = by - bh / 2 + 16 + r * 20;
          // Hash mixing for varied but stable lit/dark pattern
          const hash = (cx * 7 + r * 11 + c * 17) % 10;
          const lit  = hash > 3; // ~60% lit
          this.add.rectangle(wx, wy, 9, 11, lit ? 0xffdd88 : 0x141e2a, lit ? 0.88 : 0.7);
        }
      }
    });
  }

  // ─── Platforms: grey concrete ─────────────────────────────────────────────

  _buildPlatforms() {
    const PLAT_KEY = 'plat_city';
    const useTex   = assetLoaded(this, PLAT_KEY);

    const BODY = 0x52526a;   // concrete grey
    const EDGE = 0x7a7a96;   // lighter top edge

    const defs = [
      { x: WORLD_W / 2, y: WORLD_H - 10, w: WORLD_W, h: 20, color: 0x22222e, edge: false },
      { x: 200,  y: 370, w: 160 }, // P1 — starting step
      { x: 435,  y: 308, w: 200 }, // P2
      { x: 680,  y: 252, w: 190 }, // P3 — enemy 1 patrols here
      { x: 885,  y: 328, w: 185 }, // P4 — enemy 2 patrols here
      { x: 1090, y: 258, w: 165 }, // P5 — sword pickup here
      { x: 1298, y: 308, w: 205 }, // P6 — enemy 3 patrols here
      { x: 1500, y: 370, w: 165 }, // P7 — approach to exit
    ];

    return defs.map(({ x, y, w, h = 16, color = BODY, edge = true }) => {
      const plat = useTex
        ? this.add.tileSprite(x, y, w, h, PLAT_KEY)
        : this.add.rectangle(x, y, w, h, color);
      this.physics.add.existing(plat, true);

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

  // ─── Exit door ────────────────────────────────────────────────────────────

  _buildExit() {
    const dx = WORLD_W - 46;
    const dh = 100;
    const dy = GROUND_TOP - dh / 2; // sits on ground

    // Surrounding wall / door frame
    this.add.rectangle(dx, dy, 60, dh + 12, 0x1a1a2c).setDepth(2);
    // Frame border detail
    this.add.rectangle(dx, dy, 56, dh + 8, 0x2a2a40).setDepth(2);

    // Door body (changes colour when unlocked)
    this._door = this.add.rectangle(dx, dy, 44, dh, 0x441111).setDepth(3);

    // Padlock icon (two rects)
    this._padlockBody = this.add.rectangle(dx, dy + 8, 12, 10, 0x882222).setDepth(4);
    this._padlockArch = this.add.rectangle(dx, dy,     10,  8, 0x882222).setDepth(4);

    // Status text above door
    this._doorTxt = this.add.text(dx, dy - dh / 2 - 14, 'LOCKED', {
      fontSize: '10px', fontFamily: 'monospace', color: '#ff4444',
    }).setOrigin(0.5).setDepth(4);

    // Animated arrow (hidden until door opens)
    this._arrow = this.add.text(dx - 36, dy, '>>', {
      fontSize: '18px', fontFamily: 'monospace', color: '#00ff88',
    }).setOrigin(0.5).setDepth(4).setAlpha(0);

    // Invisible trigger zone for the player to walk into
    this._doorZone = this.add.rectangle(dx, dy, 64, dh + 12, 0x000000, 0);
    this.physics.add.existing(this._doorZone, true);

    // Store for _openDoor / _enterExit
    this._dx = dx;
    this._dy = dy;
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.player = new Player(this, 60, 360);
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
    const spawns = [
      { x: 680,  y: 205 }, // lands on P3 (top 244, center 218)
      { x: 885,  y: 285 }, // lands on P4 (top 320, center 294)
      { x: 1298, y: 265 }, // lands on P6 (top 300, center 274)
    ];

    spawns.forEach(({ x, y }) => {
      const e = new Enemy(this, x, y);
      this.enemies.push(e);
      this.enemyGroup.add(e.sprite);
    });

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

    // Single sword pickup floats above P5
    this.weaponSystem.addPickup(1090, 226, 'sword');

    // Walk-into-door triggers level transition (only when door is open)
    this.physics.add.overlap(
      this.player.sprite,
      this._doorZone,
      () => { if (this._doorOpen && !this._done) this._enterExit(); },
    );
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD() {
    // Shared HUD class handles: HP bar, weapon icon, level name, armor pips
    this._hud = new HUD(this, 'LEVEL 1 — CITY STREETS');

    const sf = 0;

    // Score (below HUD panel)
    this._scoreTxt = this.add.text(14, 62, 'Score: 0', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffff55',
    }).setScrollFactor(sf).setDepth(22);

    // Enemy count
    this._enemyTxt = this.add.text(14, 78, 'Enemies: 3', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ff6666',
    }).setScrollFactor(sf).setDepth(22);

    // Player state (debug, bottom-right of HUD panel)
    this._stateTxt = this.add.text(790, 62, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#1a2d3a',
    }).setOrigin(1, 0).setScrollFactor(sf).setDepth(22);

    // Exit-opened notice (centred, below HUD panel)
    this._noticeTxt = this.add.text(400, 88, '', {
      fontSize: '16px', fontFamily: 'monospace', color: '#00ff88',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(22).setAlpha(0);
  }

  // ─── Door unlock ──────────────────────────────────────────────────────────

  _checkDoorUnlock() {
    // isDead is set immediately on kill — sprite may still be fading
    const stillAlive = this.enemies.filter(e => !e.isDead);
    if (stillAlive.length === 0 && !this._doorOpen) this._openDoor();
  }

  _openDoor() {
    this._doorOpen = true;

    // Door turns green
    this._door.setFillStyle(0x22aa55);
    this._padlockBody.setFillStyle(0x44ff88);
    this._padlockArch.setFillStyle(0x44ff88);
    this._doorTxt.setText('EXIT').setColor('#44ff88');

    // Pulsing glow on the door
    this.tweens.add({
      targets: this._door,
      alpha: 0.65, yoyo: true, repeat: -1, duration: 550, ease: 'Sine.easeInOut',
    });

    // Arrow animation
    this._arrow.setAlpha(1);
    this.tweens.add({
      targets: this._arrow,
      x: this._dx - 22,
      yoyo: true, repeat: -1, duration: 380, ease: 'Sine.easeInOut',
    });

    // HUD notice
    this._noticeTxt.setText('ALL ENEMIES DEFEATED   EXIT OPENED  >>').setAlpha(1);
    this.tweens.add({
      targets: this._noticeTxt, alpha: 0, duration: 2200, delay: 1200, ease: 'Power2',
    });
  }

  _enterExit() {
    this._done = true;
    this.cameras.main.flash(380, 255, 255, 255);
    this.time.delayedCall(400, () => {
      this.scene.start('Level2Scene', { score: this.score });
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

    this._scoreTxt.setText(`Score: ${this.score}`);

    const liveCount = this.enemies.filter(e => !e.isDead).length;
    this._enemyTxt
      .setText(liveCount > 0 ? `Enemies: ${liveCount}` : 'All clear!')
      .setColor(liveCount > 0 ? '#ff6666' : '#44ff88');
    this._stateTxt.setText(this.player.state ?? '');
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
