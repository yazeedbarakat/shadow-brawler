/* global Phaser */

// ─── State Machine ─────────────────────────────────────────────────────────────

class StateMachine {
  constructor(owner) { this.owner = owner; this._states = {}; this._current = null; }
  add(name, state)   { this._states[name] = state; return this; }
  transition(name) {
    const next = this._states[name];
    if (!next || next === this._current) return;
    this._current?.exit();
    this._current = next;
    this._current.enter();
  }
  update(time, delta) { this._current?.update(time, delta); }
  get current()       { return this._current?.name ?? null; }
}

class State {
  constructor(player, name) { this.player = player; this.name = name; }
  enter()           {}
  update(_t, _dt)   {}
  exit()            {}
}

const JD = key => Phaser.Input.Keyboard.JustDown(key);

// ─── Ground States ─────────────────────────────────────────────────────────────

class IdleState extends State {
  constructor(p) { super(p, 'IDLE'); }
  enter() { this.player.sprite.setVelocityX(0); this.player._play('p_idle'); }
  update() {
    const p = this.player;
    if (!p._grounded())                        { p.sm.transition('FALL'); return; }
    if (p._tryBlock())                         return;
    if (p._tryRoll())                          return;
    if (p._tryDash())                          return;
    if (p._tryAttack())                        return;
    if (JD(p.cursors.up) || JD(p.wKey))       { p.sm.transition('JUMP'); return; }
    if (p.cursors.down.isDown)                 { p.sm.transition('CROUCH'); return; }
    if (p._movingH()) p.sm.transition(p.shiftKey.isDown ? 'RUN' : 'WALK');
  }
}

class WalkState extends State {
  constructor(p) { super(p, 'WALK'); }
  enter() { this.player._play('p_walk'); }
  update() {
    const p = this.player;
    if (!p._grounded())                        { p.sm.transition('FALL'); return; }
    if (p._tryBlock())                         return;
    if (p._tryRoll())                          return;
    if (p._tryDash())                          return;
    if (p._tryAttack())                        return;
    if (JD(p.cursors.up) || JD(p.wKey))       { p.sm.transition('JUMP'); return; }
    if (p.cursors.down.isDown)                 { p.sm.transition('CROUCH_WALK'); return; }
    if (p.shiftKey.isDown && p._movingH())     { p.sm.transition('RUN'); return; }
    if (p.cursors.left.isDown)                 { p.sprite.setVelocityX(-p.speed); p.facing = -1; }
    else if (p.cursors.right.isDown)           { p.sprite.setVelocityX(p.speed);  p.facing =  1; }
    else                                         p.sm.transition('IDLE');
  }
  exit() { this.player.sprite.setVelocityX(0); }
}

class RunState extends State {
  constructor(p) { super(p, 'RUN'); }
  enter() { this.player._play('p_run'); }
  update() {
    const p = this.player;
    if (!p._grounded())                    { p.sm.transition('FALL'); return; }
    if (p._tryDash())                      return;
    if (p._tryAttack())                    return;
    if (JD(p.cursors.up) || JD(p.wKey))   { p.sm.transition('JUMP'); return; }
    if (!p.shiftKey.isDown)               { p.sm.transition('WALK'); return; }
    if (p.cursors.left.isDown)             { p.sprite.setVelocityX(-p.runSpeed); p.facing = -1; }
    else if (p.cursors.right.isDown)       { p.sprite.setVelocityX(p.runSpeed);  p.facing =  1; }
    else                                     p.sm.transition('IDLE');
  }
  exit() { this.player.sprite.setVelocityX(0); }
}

class CrouchState extends State {
  constructor(p) { super(p, 'CROUCH'); }
  enter() {
    const p = this.player;
    p.sprite.setVelocityX(0);
    p._play('p_crouch');
    p.sprite.body.setSize(38, 48); p.sprite.body.setOffset(7, 42);
  }
  update() {
    const p = this.player;
    if (!p.cursors.down.isDown) { p.sm.transition('IDLE'); return; }
    if (p._tryRoll())           return;
    if (p._movingH())             p.sm.transition('CROUCH_WALK');
  }
  exit() { this.player.sprite.body.setSize(38, 70); this.player.sprite.body.setOffset(7, 20); }
}

class CrouchWalkState extends State {
  constructor(p) { super(p, 'CROUCH_WALK'); }
  enter() {
    const p = this.player;
    p._play('p_crouch_walk');
    p.sprite.body.setSize(38, 48); p.sprite.body.setOffset(7, 42);
  }
  update() {
    const p = this.player;
    if (!p.cursors.down.isDown) { p.sm.transition('IDLE'); return; }
    if (p._tryRoll())           return;
    if (p.cursors.left.isDown)       { p.sprite.setVelocityX(-p.speed * 0.5); p.facing = -1; }
    else if (p.cursors.right.isDown) { p.sprite.setVelocityX(p.speed * 0.5);  p.facing =  1; }
    else p.sm.transition('CROUCH');
  }
  exit() {
    this.player.sprite.setVelocityX(0);
    this.player.sprite.body.setSize(38, 70); this.player.sprite.body.setOffset(7, 20);
  }
}

class LandState extends State {
  constructor(p) { super(p, 'LAND'); }
  enter() { this._t = 0; this.player._play('p_land'); this.player.sprite.setVelocityX(0); }
  update(_time, delta) {
    this._t += delta;
    if (this._t >= 180) {
      const p = this.player;
      p.sm.transition(p._movingH() ? 'WALK' : 'IDLE');
    }
  }
}

// ─── Air States ────────────────────────────────────────────────────────────────

class JumpState extends State {
  constructor(p) { super(p, 'JUMP'); }
  enter() {
    const p = this.player;
    p.sprite.setVelocityY(-p.jumpForce);
    p._play('p_jump');
  }
  update() {
    const p = this.player;
    p._airMove();
    if (p._tryAirAttack()) return;
    if (p.sprite.body.velocity.y >= 40) p.sm.transition('FALL');
  }
}

class FallState extends State {
  constructor(p) { super(p, 'FALL'); }
  enter() { this.player._play('p_fall'); }
  update() {
    const p = this.player;
    p._airMove();
    if (p._tryAirAttack()) return;
    if (p._grounded())       p.sm.transition('LAND');
  }
}

// ─── Dash State ────────────────────────────────────────────────────────────────

class DashState extends State {
  constructor(p) { super(p, 'DASH'); }
  enter() {
    this._t = 0;
    const p = this.player;
    p._play('p_dash');
    p._dashInvincible = true;
    p.sprite.setVelocityX(p.facing * 520);
    p._startAfterimage();
  }
  update(_time, delta) {
    const p = this.player;
    this._t += delta;
    if (this._t > 160) p._dashInvincible = false;
    if (JD(p.zKey))   { p.sm.transition('ATTACK_DASH'); return; }
    const ratio = Math.max(0, 1 - this._t / 380);
    p.sprite.setVelocityX(p.facing * 520 * ratio);
    if (this._t >= 380) p.sm.transition(p._grounded() ? 'IDLE' : 'FALL');
  }
  exit() {
    const p = this.player;
    p._dashInvincible = false;
    p._stopAfterimage();
    p.sprite.setVelocityX(0);
    p._cd.dash = 800;
  }
}

// ─── Roll State ────────────────────────────────────────────────────────────────

class RollState extends State {
  constructor(p) { super(p, 'ROLL'); }
  enter() {
    this._t = 0;
    const p = this.player;
    p._play('p_roll');
    p._rollInvincible = true;
    p.sprite.setVelocityX(p.facing * 340);
    p.sprite.body.setSize(38, 40); p.sprite.body.setOffset(7, 50);
  }
  update(_time, delta) {
    const p = this.player;
    this._t += delta;
    if (this._t > 200) p._rollInvincible = false;
    const ratio = Math.max(0, 1 - this._t / 420);
    p.sprite.setVelocityX(p.facing * 340 * ratio);
    if (this._t >= 420 && p._grounded()) p.sm.transition('IDLE');
  }
  exit() {
    const p = this.player;
    p._rollInvincible = false;
    p.sprite.setVelocityX(0);
    p.sprite.body.setSize(38, 70); p.sprite.body.setOffset(7, 20);
    p._cd.roll = 600;
  }
}

// ─── Parametric Attack State ────────────────────────────────────────────────────
//
// cfg: { animKey, hitW, hitH, hitOffsetX, duration, startup, activeWindow,
//        damage, moveX?, chainKey?, chainState?, chainWindowStart? }

class AttackState extends State {
  constructor(p, name, cfg) {
    super(p, name);
    this.cfg = cfg;
    this._t = 0; this._hitboxOn = false; this._chainQueued = false;
  }
  enter() {
    const p = this.player;
    this._t = 0; this._hitboxOn = false; this._chainQueued = false;
    p.isAttacking = false;
    p.sprite.setVelocityX(this.cfg.moveX ? p.facing * this.cfg.moveX : 0);
    p._play(this.cfg.animKey);
    p.attackHitbox.setDisplaySize(this.cfg.hitW, this.cfg.hitH);
    p.attackHitbox.body.setSize(this.cfg.hitW, this.cfg.hitH);
    p._hitOffset = this.cfg.hitOffsetX;
    p._syncHitbox();
  }
  update(_time, delta) {
    const p   = this.player;
    const cfg = this.cfg;
    this._t  += delta;

    const inActive = this._t >= cfg.startup && this._t < cfg.startup + cfg.activeWindow;
    if (inActive && !this._hitboxOn) {
      this._hitboxOn = true; p.isAttacking = true;
      p.attackHitbox.body.enable = true;
      p.scene.events.emit('player-attack', {
        x: p.attackHitbox.x, y: p.attackHitbox.y,
        w: cfg.hitW, h: cfg.hitH, attackType: this.name, damage: cfg.damage,
      });
    } else if (!inActive && this._hitboxOn) {
      this._hitboxOn = false; p.isAttacking = false;
      p.attackHitbox.body.enable = false;
    }
    p._syncHitbox();

    // Chain window — allow Z press to queue next combo hit
    if (cfg.chainState && cfg.chainWindowStart && this._t >= cfg.chainWindowStart) {
      if (JD(p.zKey)) this._chainQueued = true;
    }

    // Decelerate forward lunge
    if (cfg.moveX) {
      const ratio = Math.max(0, 1 - this._t / (cfg.duration * 0.5));
      p.sprite.setVelocityX(p.facing * cfg.moveX * ratio);
    }

    if (this._t >= cfg.duration) {
      if (this._chainQueued && cfg.chainState) p.sm.transition(cfg.chainState);
      else p.sm.transition(p._grounded() ? 'IDLE' : 'FALL');
    }
  }
  exit() {
    const p = this.player;
    this._hitboxOn = false; p.isAttacking = false;
    p.attackHitbox.body.enable = false;
    p.sprite.setVelocityX(0);
  }
}

// ─── Block & Counter ───────────────────────────────────────────────────────────

class BlockState extends State {
  constructor(p) { super(p, 'BLOCK'); }
  enter() {
    this._t = 0;
    const p = this.player;
    p._play('p_block');
    p.sprite.setVelocityX(0);
    p.isBlocking   = true;
    p._parryActive = true;
  }
  update(_time, delta) {
    const p = this.player;
    this._t += delta;
    if (this._t > 220) p._parryActive = false;
    if (p._canCounter && JD(p.zKey)) { p.sm.transition('COUNTER'); return; }
    if (!p.sKey.isDown)                p.sm.transition('IDLE');
  }
  exit() { this.player.isBlocking = false; this.player._parryActive = false; }
}

class CounterState extends State {
  constructor(p) { super(p, 'COUNTER'); }
  enter() {
    this._t = 0; this._hitboxOn = false;
    const p = this.player;
    p._canCounter = false;
    p._play('p_counter');
    p.sprite.setVelocityX(p.facing * 200);
    p.attackHitbox.setDisplaySize(90, 42);
    p.attackHitbox.body.setSize(90, 42);
    p._hitOffset = 58;
    p._syncHitbox();
  }
  update(_time, delta) {
    const p = this.player;
    this._t += delta;
    if (this._t >= 70 && !this._hitboxOn) {
      this._hitboxOn = true; p.isAttacking = true;
      p.attackHitbox.body.enable = true;
      p.scene.events.emit('player-attack', {
        x: p.attackHitbox.x, y: p.attackHitbox.y,
        w: 90, h: 42, attackType: 'COUNTER', damage: 75,
      });
    } else if (this._t >= 370 && this._hitboxOn) {
      this._hitboxOn = false; p.isAttacking = false;
      p.attackHitbox.body.enable = false;
    }
    p._syncHitbox();
    const ratio = Math.max(0, 1 - this._t / 280);
    p.sprite.setVelocityX(p.facing * 200 * ratio);
    if (this._t >= 540) p.sm.transition('IDLE');
  }
  exit() {
    const p = this.player;
    this._hitboxOn = false; p.isAttacking = false;
    p.attackHitbox.body.enable = false;
    p.sprite.setVelocityX(0);
  }
}

// ─── Reaction States ───────────────────────────────────────────────────────────

class HitState extends State {
  constructor(p) { super(p, 'HIT'); }
  enter() {
    this._t = 0;
    const p = this.player;
    p.scene.events.emit('combo-reset');
    p._play('p_hurt');
    p._tint(0xffffff);
    p.scene.time.delayedCall(80, () => {
      if (p.sprite.active && p.sm.current === 'HIT') p._tint(0xff1111);
    });
    p.sprite.setVelocityX(-p.facing * 170);
  }
  update(_time, delta) {
    this._t += delta;
    if (this._t >= 460) {
      const p = this.player;
      p.sm.transition(p._grounded() ? 'IDLE' : 'FALL');
    }
  }
}

class DeadState extends State {
  constructor(p) { super(p, 'DEAD'); }
  enter() {
    const p = this.player;
    p._play('p_death');
    p._tint(0x888888);
    p.sprite.setVelocityX(0);
    p.isAttacking = false;
    p.attackHitbox.body.enable = false;
    p.scene.events.emit('combo-reset');
    p.scene.time.delayedCall(860, () => {
      if (p.sprite.active) p.scene.events.emit('player-dead');
    });
  }
}

// ─── Player ────────────────────────────────────────────────────────────────────

export default class Player {
  constructor(scene, x, y) {
    this.scene       = scene;
    this.health      = 100;
    this.maxHealth   = 100;
    this.speed       = 210;
    this.runSpeed    = 330;
    this.jumpForce   = 520;
    this.facing      = 1;
    this.isAttacking = false;
    this.isBlocking  = false;
    this._hitOffset  = 44;

    this._dashInvincible = false;
    this._rollInvincible = false;
    this._parryActive    = false;
    this._canCounter     = false;
    this._counterTimer   = 0;

    this.equippedWeapon  = null;
    this.armor           = null;

    this._cd             = { dash: 0, roll: 0 };
    this._afterTimer     = null;

    // Animation fallbacks for when new sprites aren't loaded
    this._fb = {
      p_idle: 'player_idle', p_walk: 'player_walk', p_run: 'player_walk',
      p_sprint: 'player_walk', p_jump: 'player_jump', p_fall: 'player_jump',
      p_land: 'player_jump', p_dash: 'player_jump', p_turn: 'player_walk',
      p_crouch: 'player_idle', p_crouch_idle: 'player_idle',
      p_crouch_walk: 'player_walk', p_atk_light1: 'player_punch',
      p_atk_light2: 'player_kick', p_atk_heavy: 'player_sword',
      p_combo1a: 'player_punch', p_combo1b: 'player_punch',
      p_combo1c: 'player_kick', p_hurt: 'player_hit',
      p_block: 'player_hit', p_counter: 'player_sword',
      p_dash_attack: 'player_sword', p_roll: 'player_jump',
      p_death: 'player_hit',
    };

    this._initTextures(scene);
    this._initSprite(scene, x, y);
    this._initHitbox(scene);
    this._initInput(scene);
    this._initSM();
  }

  // ── Setup ───────────────────────────────────────────────────────────────────

  _initTextures(scene) {
    const has = k => scene.textures.exists(k);

    if (has('p_idle') && !scene.anims.exists('p_idle')) {
      const A = (key, end, rate, repeat = 0) => {
        if (!has(key)) return;
        scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(key, { start: 0, end }), frameRate: rate, repeat });
      };
      A('p_idle',        5,  8, -1);
      A('p_walk',        7, 10, -1);
      A('p_run',         7, 14, -1);
      A('p_sprint',      9, 18, -1);
      A('p_jump',        3, 12,  0);
      A('p_fall',        2,  8,  0);
      A('p_land',        2, 18,  0);
      A('p_dash',        5, 20,  0);
      A('p_turn',        3, 16,  0);
      A('p_crouch',      0,  6,  0);
      A('p_crouch_idle', 0,  6, -1);
      A('p_crouch_walk', 5, 10, -1);
      A('p_atk_light1',  4, 16,  0);
      A('p_atk_light2',  4, 16,  0);
      A('p_atk_heavy',   7, 10,  0);
      A('p_combo1a',     4, 16,  0);
      A('p_combo1b',     4, 18,  0);
      A('p_combo1c',     4, 14,  0);
      A('p_hurt',        2,  8,  0);
      A('p_block',       1,  8,  0);
      A('p_counter',     4, 14,  0);
      A('p_dash_attack', 5, 18,  0);
      A('p_roll',        5, 14,  0);
      A('p_death',       9, 12,  0);
    }

    // Legacy animations (fallbacks)
    if (has('player') && !scene.anims.exists('player_idle')) {
      scene.anims.create({ key: 'player_idle',  frames: scene.anims.generateFrameNumbers('player',       { start: 0, end: 0 }), frameRate: 6,  repeat: -1 });
      if (has('player_walk'))  scene.anims.create({ key: 'player_walk',  frames: scene.anims.generateFrameNumbers('player_walk',  { start: 0, end: 3 }), frameRate:  8, repeat: -1 });
      if (has('player_jump'))  scene.anims.create({ key: 'player_jump',  frames: scene.anims.generateFrameNumbers('player_jump',  { start: 0, end: 0 }), frameRate:  1, repeat:  0 });
      if (has('player_hit'))   scene.anims.create({ key: 'player_hit',   frames: scene.anims.generateFrameNumbers('player_hit',   { start: 0, end: 0 }), frameRate:  1, repeat:  0 });
      if (has('player_punch')) scene.anims.create({ key: 'player_punch', frames: scene.anims.generateFrameNumbers('player_punch', { start: 0, end: 5 }), frameRate: 18, repeat:  0 });
      if (has('player_sword')) scene.anims.create({ key: 'player_sword', frames: scene.anims.generateFrameNumbers('player_sword', { start: 0, end: 5 }), frameRate: 11, repeat:  0 });
      if (has('player_kick'))  scene.anims.create({ key: 'player_kick',  frames: scene.anims.generateFrameNumbers('player_kick',  { start: 0, end: 4 }), frameRate: 12, repeat:  0 });
    }

    if (!has('p_idle') && !has('player')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x1a1a2e); g.fillRect(0, 0, 52, 80);
      g.fillStyle(0xcc2222); g.fillRect(8, 20, 36, 38);
      g.fillStyle(0xd4956a); g.fillRect(14, 4, 24, 18);
      g.generateTexture('p_idle', 52, 80);
      g.destroy();
    }

    if (!scene.textures.exists('_px')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 0); g.fillRect(0, 0, 1, 1);
      g.generateTexture('_px', 1, 1); g.destroy();
    }
  }

  _initSprite(scene, x, y) {
    const key = scene.textures.exists('p_idle') ? 'p_idle' : 'player';
    this.sprite = scene.physics.add.sprite(x, y, key);
    this.sprite.body.setSize(38, 70);
    this.sprite.body.setOffset(7, 20);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(5);
    this.sprite.setDisplaySize(52, 80);
  }

  _initHitbox(scene) {
    this.attackHitbox = scene.physics.add.image(0, 0, '_px');
    this.attackHitbox.setDisplaySize(48, 24);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.setAlpha(0).setDepth(4);
  }

  _initInput(scene) {
    this.cursors  = scene.input.keyboard.createCursorKeys();
    this.zKey     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.cKey     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.sKey     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.wKey     = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  _initSM() {
    this.sm = new StateMachine(this);

    const ATTACKS = {
      ATTACK_1: {
        animKey: 'p_atk_light1', hitW: 52, hitH: 28, hitOffsetX: 44,
        duration: 340, startup: 60, activeWindow: 140, damage: 22,
        chainKey: 'z', chainState: 'ATTACK_2', chainWindowStart: 190,
      },
      ATTACK_2: {
        animKey: 'p_atk_light2', hitW: 58, hitH: 30, hitOffsetX: 48,
        duration: 360, startup: 55, activeWindow: 160, damage: 28,
        chainKey: 'z', chainState: 'ATTACK_3', chainWindowStart: 200,
      },
      ATTACK_3: {
        animKey: 'p_combo1c', hitW: 82, hitH: 42, hitOffsetX: 58,
        duration: 500, startup: 80, activeWindow: 220, damage: 45, moveX: 150,
      },
      ATTACK_HEAVY: {
        animKey: 'p_atk_heavy', hitW: 92, hitH: 46, hitOffsetX: 62,
        duration: 700, startup: 190, activeWindow: 270, damage: 65, moveX: 90,
      },
      ATTACK_AIR: {
        animKey: 'p_combo1a', hitW: 64, hitH: 34, hitOffsetX: 50,
        duration: 380, startup: 55, activeWindow: 200, damage: 30,
      },
      ATTACK_DASH: {
        animKey: 'p_dash_attack', hitW: 90, hitH: 38, hitOffsetX: 64,
        duration: 440, startup: 40, activeWindow: 280, damage: 40, moveX: 220,
      },
    };

    this.sm
      .add('IDLE',         new IdleState(this))
      .add('WALK',         new WalkState(this))
      .add('RUN',          new RunState(this))
      .add('JUMP',         new JumpState(this))
      .add('FALL',         new FallState(this))
      .add('LAND',         new LandState(this))
      .add('DASH',         new DashState(this))
      .add('CROUCH',       new CrouchState(this))
      .add('CROUCH_WALK',  new CrouchWalkState(this))
      .add('ATTACK_1',     new AttackState(this, 'ATTACK_1',     ATTACKS.ATTACK_1))
      .add('ATTACK_2',     new AttackState(this, 'ATTACK_2',     ATTACKS.ATTACK_2))
      .add('ATTACK_3',     new AttackState(this, 'ATTACK_3',     ATTACKS.ATTACK_3))
      .add('ATTACK_HEAVY', new AttackState(this, 'ATTACK_HEAVY', ATTACKS.ATTACK_HEAVY))
      .add('ATTACK_AIR',   new AttackState(this, 'ATTACK_AIR',   ATTACKS.ATTACK_AIR))
      .add('ATTACK_DASH',  new AttackState(this, 'ATTACK_DASH',  ATTACKS.ATTACK_DASH))
      .add('BLOCK',        new BlockState(this))
      .add('COUNTER',      new CounterState(this))
      .add('ROLL',         new RollState(this))
      .add('HIT',          new HitState(this))
      .add('DEAD',         new DeadState(this));

    this.sm.transition('IDLE');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _grounded()  { return this.sprite.body.blocked.down; }
  _movingH()   { return this.cursors.left.isDown || this.cursors.right.isDown; }

  _airMove() {
    if (this.cursors.left.isDown)       { this.sprite.setVelocityX(-this.speed * 0.8); this.facing = -1; }
    else if (this.cursors.right.isDown) { this.sprite.setVelocityX(this.speed * 0.8);  this.facing =  1; }
  }

  _tryDash() {
    if (!JD(this.cKey) || this._cd.dash > 0) return false;
    const s = this.sm.current;
    if (!s || s === 'DEAD' || s === 'HIT' || s === 'DASH' || s === 'ROLL' ||
        s.startsWith('ATTACK')) return false;
    if (this.cursors.down.isDown) return false; // down+C = roll, handled by _tryRoll
    this.sm.transition('DASH');
    return true;
  }

  _tryRoll() {
    if (!JD(this.cKey) || this._cd.roll > 0) return false;
    if (!this.cursors.down.isDown) return false;
    const s = this.sm.current;
    if (!s || s === 'DEAD' || s === 'HIT' || s === 'ROLL') return false;
    this.sm.transition('ROLL');
    return true;
  }

  _tryBlock() {
    if (!JD(this.sKey)) return false;
    const s = this.sm.current;
    if (!s || s === 'DEAD' || s === 'HIT' || s === 'BLOCK' || !this._grounded()) return false;
    this.sm.transition('BLOCK');
    return true;
  }

  _tryAttack() {
    const s  = this.sm.current;
    const ok = s && s !== 'HIT' && s !== 'DEAD' && s !== 'BLOCK' &&
               s !== 'COUNTER' && s !== 'ROLL' && !s.startsWith('ATTACK');
    if (!ok) return false;

    if (JD(this.zKey)) {
      if (this.equippedWeapon === 'throwingstar') {
        this.scene.events.emit('player-throw', { x: this.sprite.x, y: this.sprite.y, facing: this.facing });
        return true;
      }
      this.sm.transition('ATTACK_1');
      return true;
    }
    if (JD(this.xKey)) {
      this.sm.transition('ATTACK_HEAVY');
      return true;
    }
    return false;
  }

  _tryAirAttack() {
    const s = this.sm.current;
    if (s === 'ATTACK_AIR' || s === 'DEAD' || s === 'HIT') return false;
    if (JD(this.zKey)) {
      if (this.equippedWeapon === 'throwingstar') {
        this.scene.events.emit('player-throw', { x: this.sprite.x, y: this.sprite.y, facing: this.facing });
        return true;
      }
      this.sm.transition('ATTACK_AIR');
      return true;
    }
    if (JD(this.xKey)) { this.sm.transition('ATTACK_HEAVY'); return true; }
    return false;
  }

  _syncHitbox() {
    this.attackHitbox.x = this.sprite.x + this.facing * this._hitOffset;
    this.attackHitbox.y = this.sprite.y;
  }

  _play(key) {
    this.sprite.clearTint();
    if (!this.sprite.anims) return;
    const use = this.scene.anims.exists(key) ? key : (this._fb[key] || null);
    if (use && this.scene.anims.exists(use)) this.sprite.anims.play(use, true);
  }

  _tint(color) { this.sprite.setTint(color); }

  _startAfterimage() {
    this._afterTimer = this.scene.time.addEvent({
      delay: 45,
      callback: () => {
        if (!this.sprite.active) return;
        const frameIdx = this.sprite.anims?.currentFrame?.index ?? 0;
        const ghost = this.scene.add.image(this.sprite.x, this.sprite.y, this.sprite.texture.key, frameIdx)
          .setDisplaySize(this.sprite.displayWidth, this.sprite.displayHeight)
          .setFlipX(this.facing === -1).setAlpha(0.45).setDepth(4).setTint(0xcc4400);
        this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 210, onComplete: () => ghost.destroy() });
      },
      loop: true,
    });
  }

  _stopAfterimage() {
    if (this._afterTimer) { this._afterTimer.remove(); this._afterTimer = null; }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  update(time, delta) {
    for (const k in this._cd) {
      if (this._cd[k] > 0) this._cd[k] = Math.max(0, this._cd[k] - delta);
    }
    if (this._counterTimer > 0) {
      this._counterTimer = Math.max(0, this._counterTimer - delta);
      if (this._counterTimer <= 0) this._canCounter = false;
    }
    this.sprite.setFlipX(this.facing === -1);
    this.sm.update(time, delta);
  }

  equipWeapon(type)  { this.equippedWeapon = type; this.scene.events.emit('weapon-changed', type); }
  unequipWeapon()    {
    const had = this.equippedWeapon;
    this.equippedWeapon = null;
    this.scene.events.emit('weapon-changed', null);
    return had;
  }

  takeDamage(rawAmount) {
    const s = this.sm.current;
    if (s === 'DEAD')                return false;
    if (s === 'HIT')                 return false;
    if (this._dashInvincible)        return false;
    if (this._rollInvincible)        return false;

    if (s === 'BLOCK') {
      if (this._parryActive) {
        // Perfect parry — no damage, open counter window
        this._canCounter   = true;
        this._counterTimer = 700;
        this.scene.cameras.main.shake(110, 0.010);
        this.scene.events.emit('combo-reset');
        // Brief white flash on parry success
        this._tint(0xffffff);
        this.scene.time.delayedCall(120, () => { if (this.sprite.active) this.sprite.clearTint(); });
        return false;
      }
      // Normal block — 35% damage, no knockback
      const dmg = Math.max(1, Math.floor(rawAmount * 0.35));
      this.health = Math.max(0, this.health - dmg);
      this.scene.cameras.main.shake(70, 0.004);
      return false;
    }

    const dmg = this.armor ? this.armor.interceptHit(rawAmount) : rawAmount;
    this.health = Math.max(0, this.health - dmg);
    this.scene.cameras.main.shake(220, Math.min(0.020, 0.006 + dmg * 0.0003));
    if (this.health <= 0) { this.sm.transition('DEAD'); return true; }
    this.sm.transition('HIT');
    return false;
  }

  get state()  { return this.sm.current; }
  get isDead() { return this.sm.current === 'DEAD'; }
}
