/* global Phaser */
import Player       from '../characters/Player.js';
import Boss         from '../characters/Boss.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HUD          from '../systems/HUD.js';
import { preloadAssets, assetLoaded, PLAYER_KEYS } from '../systems/AssetLoader.js';
import { addWeather } from '../systems/WeatherSystem.js';

// Canonical melee damage values — must stay in sync with CombatSystem.js
const ATTACK_DAMAGE = {
  ATTACK_1: 22, ATTACK_2: 28, ATTACK_3: 45,
  ATTACK_HEAVY: 65, ATTACK_AIR: 30, ATTACK_DASH: 40, COUNTER: 75,
};

const WORLD_W    = 800;
const WORLD_H    = 450;
const GROUND_TOP = WORLD_H - 60;

export default class Level5Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level5Scene' });
  }

  preload() {
    preloadAssets(this, [
      ...PLAYER_KEYS,
      'boss', 'pickup_sword', 'proj_star', 'proj_boss',
      'bg_throne', 'plat_boss', 'healthbar',
    ]);
  }

  create() {
    this.score = 0;
    this._done = false;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    this._buildBackground();
    this._platforms = this._buildPlatforms();
    this._createPlayer();
    this._createBoss();
    this._setupCombat();
    this._buildHUD();
    addWeather(this, 'ash');

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

    this.events.on('boss-dead', () => this._showVictory());
    this.events.on('boss-phase', n => this._onPhaseChange(n));
  }

  // ─── Background: throne room ──────────────────────────────────────────────

  _buildBackground() {
    if (assetLoaded(this, 'bg_throne')) {
      this.add.image(WORLD_W / 2, WORLD_H / 2, 'bg_throne').setDisplaySize(WORLD_W, WORLD_H);
      return;
    }
    // Dark stone base
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0c0810);

    // Stone block grid
    const BW = 80, BH = 52;
    for (let bx = 0; bx <= WORLD_W; bx += BW) {
      for (let by = 0; by <= WORLD_H; by += BH) {
        const e = ((bx / BW) + (by / BH)) % 2 === 0;
        this.add.rectangle(bx + BW / 2, by + BH / 2, BW - 2, BH - 2,
          e ? 0x161020 : 0x120c1c, 0.88);
      }
    }

    // Grand columns flanking the throne room
    [90, 310, 890, 1110].forEach(cx => {
      this.add.rectangle(cx, WORLD_H / 2, 36, WORLD_H, 0x1a142a);
      this.add.rectangle(cx, 22, 54, 32, 0x22183a); // capital
      this.add.rectangle(cx, GROUND_TOP - 8, 52, 18, 0x1a142a); // base
    });

    // Massive stained glass window (central, behind the throne)
    const wCX = 1000, wCY = 160, wW = 180, wH = 220;
    this.add.rectangle(wCX, wCY, wW + 12, wH + 12, 0x1e1630); // outer frame
    // Panes: columns of deep color
    [
      [wCX - 56, 0x4a0008, 0.55],
      [wCX - 28, 0x00044a, 0.55],
      [wCX,      0x4a0030, 0.55],
      [wCX + 28, 0x00044a, 0.55],
      [wCX + 56, 0x4a0008, 0.55],
    ].forEach(([gx, gc, ga]) => {
      this.add.rectangle(gx, wCY, 24, wH, gc, ga);
    });
    // Arch
    this.add.rectangle(wCX, wCY - wH / 2 - 12, wW * 0.7, 22, 0x28204a, 0.5);
    this.add.rectangle(wCX, wCY - wH / 2 - 26, wW * 0.4, 18, 0x28204a, 0.4);
    // Leading
    [-28, 0, 28].forEach(lx => {
      this.add.rectangle(wCX + lx, wCY, 3, wH, 0x060408, 0.9);
    });
    // Window glow halo
    this.add.rectangle(wCX, wCY, wW + 60, wH + 60, 0x330022, 0.07);

    // Throne (far right, purely decorative)
    const tX = 1080, tY = GROUND_TOP - 60;
    this.add.rectangle(tX, tY + 30, 80, 48, 0x2a1800);  // seat
    this.add.rectangle(tX, tY - 22, 64, 82, 0x1e1000);  // back rest
    this.add.rectangle(tX - 28, tY + 18, 10, 38, 0x1e1000); // left arm
    this.add.rectangle(tX + 28, tY + 18, 10, 38, 0x1e1000); // right arm
    this.add.rectangle(tX, tY - 70, 58, 14, 0x2a1800);  // top rail
    this.add.rectangle(tX, tY - 74, 50, 5,  0xaa7700, 0.8); // gold trim
    this.add.rectangle(tX, tY + 54, 72, 5,  0xaa7700, 0.8);
    // Throne skull ornament
    this.add.rectangle(tX, tY - 82, 18, 14, 0x1a0800);
    this.add.rectangle(tX - 4, tY - 86, 6, 5, 0xcc3300, 0.8); // left eye glow
    this.add.rectangle(tX + 4, tY - 86, 6, 5, 0xcc3300, 0.8); // right eye glow

    // Red carpet from left to throne
    this.add.rectangle(WORLD_W / 2 - 50, GROUND_TOP - 4, WORLD_W - 100, 10, 0x440008, 0.7);

    // Dramatic torch sconces
    [195, 510, 695, 1005].forEach(tx => {
      this.add.rectangle(tx + 18, 210, 20, 6,  0x2a1204);
      this.add.rectangle(tx + 26, 200, 8,  12, 0x3a1c0a);
      this.add.rectangle(tx + 26, 188, 6,  10, 0xff5500, 0.9);
      this.add.rectangle(tx + 26, 184, 4,  6,  0xffcc00, 0.85);
      this.add.rectangle(tx + 26, 188, 32, 32, 0xff6600, 0.09);
    });

    // Floor
    this.add.rectangle(WORLD_W / 2, WORLD_H - 4,  WORLD_W, 18, 0x08050e);
    this.add.rectangle(WORLD_W / 2, WORLD_H - 20, WORLD_W,  4, 0x1e1430);
  }

  // ─── Platforms: dark stone + two low cover blocks ─────────────────────────

  _buildPlatforms() {
    const STONE = 0x1e1630;
    const TRIM  = 0x5a4880;
    const SHADE = 0x100c1a;

    const defs = [
      { x: WORLD_W / 2, y: GROUND_TOP + 10, w: WORLD_W, h: 20, color: 0x0c0818, edge: false },
    ];

    const PLAT_KEY = 'plat_boss';
    const useTex   = assetLoaded(this, PLAT_KEY);

    return defs.map(({ x, y, w, h = 14, color = STONE, edge = true }) => {
      const plat = useTex
        ? this.add.tileSprite(x, y, w, h, PLAT_KEY)
        : this.add.rectangle(x, y, w, h, color);
      this.physics.add.existing(plat, true);
      if (!edge) plat.setAlpha(0);

      if (!useTex && edge) {
        this.add.rectangle(x, y - h / 2 + 1, w, 3, TRIM);
        this.add.rectangle(x, y + h / 2 - 1, w, 2, SHADE);
      }
      return plat;
    });
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  _createPlayer() {
    this.player = new Player(this, 80, 346);
    this.physics.add.collider(this.player.sprite, this._platforms);
    this.events.on('player-dead', () => this._endGame());
  }

  // ─── Boss ────────────────────────────────────────────────────────────────

  _createBoss() {
    this._boss = new Boss(this, 580, 342);
    // Boss collides with platforms and world bounds (already set in Boss constructor)
    this.physics.add.collider(this._boss.sprite, this._platforms);
  }

  // ─── Combat wiring ────────────────────────────────────────────────────────

  _setupCombat() {
    // WeaponSystem for player weapons (throwing stars can hit boss)
    this.weaponSystem = new WeaponSystem(this, this.player);


    // Boss sprite acts as a single-member "enemy group" for WeaponSystem
    const bossGroup = this.physics.add.group();
    bossGroup.add(this._boss.sprite);
    this.weaponSystem.setupProjectileOverlaps(bossGroup, () => {
      // Boss already updated via direct attack overlap below; score bonus only
      this.score += 20;
    });

    // ── Player melee/kicks → Boss ─────────────────────────────────────────
    this.physics.add.overlap(
      this.player.attackHitbox,
      this._boss.sprite,
      () => {
        if (!this.player.isAttacking || !this._boss.sprite.active) return;
        const dmg = ATTACK_DAMAGE[this.player.state] ?? ATTACK_DAMAGE.ATTACK_PUNCH;
        const wasHittable = this._boss.isHittable;
        this._boss.receivedHit(dmg, this.player.facing);
        this.score += dmg;
        // Feed the combo counter only when the hit actually registered
        if (wasHittable) this.events.emit('combo-hit');
      },
    );

    // ── Boss body contacts Player ──────────────────────────────────────────
    this.physics.add.overlap(
      this.player.sprite,
      this._boss.sprite,
      () => {
        if (this._boss.contactCooldown > 0 || !this._boss.sprite.active) return;
        this._boss.contactCooldown = this._boss.contactRate;
        const dead = this.player.takeDamage(this._boss.contactDamage);
        if (dead) this._endGame();
      },
    );

    // ── Boss projectiles → Player ──────────────────────────────────────────
    this.physics.add.overlap(
      this.player.sprite,
      this._boss.projGroup,
      (_, projSprite) => {
        const proj = projSprite.projRef;
        if (!proj?.active) return;
        const dmg = proj.damage;
        proj.destroy();
        const dead = this.player.takeDamage(dmg);
        if (dead) this._endGame();
      },
    );
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  _buildHUD() {
    this._hud = new HUD(this);
    this._hud.setBoss(this._boss, 'THE OVERLORD');

    const sf = 0;
    // Phase notification (centred, fades in/out on phase change)
    this._phaseNotice = this.add.text(400, 88, '', {
      fontSize: '17px', fontFamily: 'monospace', color: '#ff5500',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(22).setAlpha(0);

    this._stateTxt = this.add.text(790, 62, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#1a2d3a',
    }).setOrigin(1, 0).setScrollFactor(sf).setDepth(22);
  }

  // ─── Phase change notification ─────────────────────────────────────────────

  _onPhaseChange(n) {
    const msgs = {
      2: 'PHASE 2 — THE DARK LORD RAGES!',
      3: 'PHASE 3 — BERSERK MODE!',
    };
    if (!msgs[n]) return;

    this._phaseNotice.setText(msgs[n]).setAlpha(1);
    this.tweens.add({
      targets: this._phaseNotice, alpha: 0, duration: 2400, delay: 1000, ease: 'Power2',
    });

    // ── 300 ms slow-motion bullet-time ──────────────────────────────────────
    // Use window.setTimeout (real-world clock) so the timer isn't affected
    // by the physics/scene timeScale we're about to change.
    this.physics.world.timeScale = 0.18;
    this.time.timeScale          = 0.18;
    window.setTimeout(() => {
      try {
        this.physics.world.timeScale = 1;
        this.time.timeScale          = 1;
      } catch (_) { /* scene may have been stopped */ }
    }, 300);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._done) return;

    this.player.update(time, delta);
    this.weaponSystem.update();
    this._hud.update(this.player, this._boss);
    this._boss.update(this.player, delta);

  }

  // ─── Victory screen (inline overlay — no scene transition on win) ──────────

  _showVictory() {
    if (this._done) return;
    this._done = true;

    const W = 800, H = 450, sf = 0, D = 30;
    const cx = W / 2;

    // Dark overlay
    this.add.rectangle(cx, H / 2, W, H, 0x000000, 0.88).setScrollFactor(sf).setDepth(D);

    // Gold accent lines
    this.add.rectangle(cx, 6,     W, 6, 0xffcc00).setScrollFactor(sf).setDepth(D + 1);
    this.add.rectangle(cx, H - 6, W, 6, 0xffcc00).setScrollFactor(sf).setDepth(D + 1);

    // Congratulations
    this.add.text(cx, H * 0.14, 'CONGRATULATIONS!', {
      fontSize: '46px', fontFamily: 'monospace',
      color: '#ffcc00', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2);

    this.add.text(cx, H * 0.14 + 58, 'THE DARK LORD HAS BEEN DEFEATED', {
      fontSize: '15px', fontFamily: 'monospace', color: '#ddaa44',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2);

    // Stars decoration
    [-260, -130, 0, 130, 260].forEach((ox, i) => {
      this.add.text(cx + ox, H * 0.38, i === 2 ? '***' : '*', {
        fontSize: i === 2 ? '28px' : '20px',
        fontFamily: 'monospace', color: '#ffcc00',
      }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2);
    });

    // Score panel
    this.add.rectangle(cx, H * 0.52, 320, 56, 0x0a0800).setScrollFactor(sf).setDepth(D + 1);
    this.add.text(cx, H * 0.52 - 14, 'FINAL SCORE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#556644',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2);
    this.add.text(cx, H * 0.52 + 8, this.score.toLocaleString(), {
      fontSize: '26px', fontFamily: 'monospace',
      color: '#ffff55', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2);

    // Buttons
    this._victoryBtn(cx - 115, H * 0.74, 200, 'PLAY AGAIN', 0x1a4422, 0x22cc55,
      () => this.scene.start('Level1Scene'));
    this._victoryBtn(cx + 115, H * 0.74, 200, 'MAIN MENU',  0x1a2244, 0x3366aa,
      () => this.scene.start('MenuScene'));

    this.add.text(cx, H - 22, 'Thank you for playing!', {
      fontSize: '11px', fontFamily: 'monospace', color: '#334422',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2);
  }

  _victoryBtn(x, y, w, label, bg, border, onClick) {
    const btn = this.add.rectangle(x, y, w, 52, bg)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0).setDepth(32)
      .setStrokeStyle(1, border);

    this.add.text(x, y, label, {
      fontSize: '17px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(33);

    btn.on('pointerover',  () => btn.setFillStyle(Phaser.Display.Color.ValueToColor(bg).lighten(18).color));
    btn.on('pointerout',   () => btn.setFillStyle(bg));
    btn.on('pointerdown',  () => btn.setFillStyle(Phaser.Display.Color.ValueToColor(bg).darken(15).color));
    btn.on('pointerup',    () => onClick());
  }

  // ─── End states ───────────────────────────────────────────────────────────

  _endGame() {
    if (this._done) return;
    this._done = true;
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { score: this.score, win: false, originScene: 'Level5Scene' });
    });
  }
}
