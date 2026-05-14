/* global Phaser */

// ─── State Machine ─────────────────────────────────────────────────────────────

class StateMachine {
  constructor(owner) {
    this.owner = owner;
    this._states = {};
    this._current = null;
  }

  add(name, state) { this._states[name] = state; return this; }

  transition(name) {
    const next = this._states[name];
    if (!next || next === this._current) return;
    this._current?.exit();
    this._current = next;
    this._current.enter();
  }

  update(time, delta) { this._current?.update(time, delta); }

  get current() { return this._current?.name ?? null; }
}

class State {
  constructor(player, name) { this.player = player; this.name = name; }
  enter()              {}
  update(_time, _dt)   {}
  exit()               {}
}

// ─── Ground States ─────────────────────────────────────────────────────────────

class IdleState extends State {
  constructor(p) { super(p, 'IDLE'); }

  enter() {
    this.player.sprite.setVelocityX(0);
    this.player._tint(0x4488ff);
  }

  update() {
    const p = this.player;
    if (!p._grounded())            { p.sm.transition('FALL'); return; }
    if (p._tryAttack())            return;
    if (p._jumpPressed())          { p.sm.transition('JUMP'); return; }
    if (p._movingHorizontally())   p.sm.transition('WALK');
  }
}

class WalkState extends State {
  constructor(p) { super(p, 'WALK'); }

  enter() { this.player._tint(0x55aaff); }

  update() {
    const p = this.player;
    if (!p._grounded())   { p.sm.transition('FALL'); return; }
    if (p._tryAttack())   return;
    if (p._jumpPressed()) { p.sm.transition('JUMP'); return; }

    if (p.cursors.left.isDown) {
      p.sprite.setVelocityX(-p.speed);
      p.facing = -1;
    } else if (p.cursors.right.isDown) {
      p.sprite.setVelocityX(p.speed);
      p.facing = 1;
    } else {
      p.sm.transition('IDLE');
    }
  }

  exit() { this.player.sprite.setVelocityX(0); }
}

// ─── Air States ────────────────────────────────────────────────────────────────

class JumpState extends State {
  constructor(p) { super(p, 'JUMP'); }

  enter() {
    this.player.sprite.setVelocityY(-this.player.jumpForce);
    this.player._tint(0x44ddff);
  }

  update() {
    const p = this.player;
    p._airMove();
    p._tryAttack();
    if (p.sprite.body.velocity.y >= 60) p.sm.transition('FALL');
  }
}

class FallState extends State {
  constructor(p) { super(p, 'FALL'); }

  enter() { this.player._tint(0x3366cc); }

  update() {
    const p = this.player;
    p._airMove();
    p._tryAttack();
    if (p._grounded()) {
      p.sm.transition(p._movingHorizontally() ? 'WALK' : 'IDLE');
    }
  }
}

// ─── Attack State (parametric — shared by PUNCH / KICK / SWORD) ───────────────
//
// cfg: {
//   hitW, hitH     — hitbox size in px
//   hitOffsetX     — distance in front of player center
//   duration       — full attack animation length (ms)
//   startup        — delay before hitbox activates (ms)   [frames before hit]
//   activeWindow   — how long the hitbox stays on (ms)    [active frames]
//   tintColor      — player tint during this attack
//   damage         — passed in player-attack event for CombatSystem
// }

class AttackState extends State {
  constructor(p, name, cfg) {
    super(p, name);
    this.cfg = cfg;
    this._elapsed  = 0;
    this._hitboxOn = false;
  }

  enter() {
    const p = this.player;
    this._elapsed  = 0;
    this._hitboxOn = false;
    p.isAttacking  = false;
    p.sprite.setVelocityX(0);
    p._tint(this.cfg.tintColor);

    // Resize the one shared hitbox for this attack's reach and height
    const { hitW, hitH, hitOffsetX } = this.cfg;
    p.attackHitbox.setDisplaySize(hitW, hitH);
    p.attackHitbox.body.setSize(hitW, hitH);
    p._hitOffset = hitOffsetX;
    p._syncHitbox();
  }

  update(_t, delta) {
    const p = this.player;
    this._elapsed += delta;
    const { startup, activeWindow, duration } = this.cfg;
    const inWindow = this._elapsed >= startup && this._elapsed < startup + activeWindow;

    if (inWindow && !this._hitboxOn) {
      this._hitboxOn     = true;
      p.isAttacking      = true;
      p.attackHitbox.body.enable = true;
      // CombatSystem reads damage from this event
      p.scene.events.emit('player-attack', {
        x: p.attackHitbox.x,
        y: p.attackHitbox.y,
        w: this.cfg.hitW,
        h: this.cfg.hitH,
        attackType: this.name,
        damage: this.cfg.damage,
      });
    } else if (!inWindow && this._hitboxOn) {
      this._hitboxOn     = false;
      p.isAttacking      = false;
      p.attackHitbox.body.enable = false;
    }

    p._syncHitbox();

    if (this._elapsed >= duration) {
      // Defer transition — exit() is called by sm.transition() automatically
      p.sm.transition(p._grounded() ? 'IDLE' : 'FALL');
    }
  }

  exit() {
    const p = this.player;
    this._hitboxOn     = false;
    p.isAttacking      = false;
    p.attackHitbox.body.enable = false;
  }
}

// ─── Reaction States ───────────────────────────────────────────────────────────

class HitState extends State {
  constructor(p) { super(p, 'HIT'); }

  enter() {
    this._elapsed = 0;
    const p = this.player;

    // Reset combo streak — player took a hit
    p.scene.events.emit('combo-reset');

    // Brief white flash, then settle to red for the stun duration
    p._tint(0xffffff);
    p.scene.time.delayedCall(80, () => {
      if (p.sprite.active && p.sm.current === 'HIT') p._tint(0xff1111);
    });

    // Knockback pushes player back from the direction they were facing
    p.sprite.setVelocityX(-p.facing * 160);
  }

  update(_t, delta) {
    this._elapsed += delta;
    if (this._elapsed >= 420) {
      const p = this.player;
      p.sm.transition(p._grounded() ? 'IDLE' : 'FALL');
    }
  }
}

class DeadState extends State {
  constructor(p) { super(p, 'DEAD'); }

  enter() {
    const p = this.player;
    p._tint(0x444444);
    p.sprite.setVelocityX(0);
    p.isAttacking = false;
    p.scene.events.emit('combo-reset'); // death also breaks the combo
    p.attackHitbox.body.enable = false;
    p.scene.events.emit('player-dead');
  }

  // Dead absorbs all updates — no transition out
}

// ─── Player ────────────────────────────────────────────────────────────────────

export default class Player {
  constructor(scene, x, y) {
    this.scene     = scene;
    this.health    = 100;
    this.maxHealth = 100;
    this.speed     = 230;
    this.jumpForce = 520;
    this.facing    = 1;   // 1 = right, -1 = left
    this.isAttacking = false;
    this._hitOffset  = 40; // updated per-attack by AttackState

    // null | 'sword' | 'pipe' | 'throwingstar'
    this.equippedWeapon = null;

    // Set by ArmorSystem when armor is equipped; null otherwise.
    // takeDamage() routes through armor.interceptHit() when this is set.
    this.armor = null;

    // Cooldowns per attack type (ms remaining)
    this._cd = { punch: 0, kick: 0, sword: 0 };

    this._initTextures(scene);
    this._initSprite(scene, x, y);
    this._initHitbox(scene);
    this._initInput(scene);
    this._initSM();
  }

  // ── Setup ───────────────────────────────────────────────────────────────────

  _initTextures(scene) {
    // Character: 48 wide × 80 tall — detailed fighter sprite
    if (!scene.textures.exists('player')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });

      // ── Legs / pants (dark navy) ──────────────────────────────────────────
      g.fillStyle(0x1a237e);
      g.fillRect(7,  54, 14, 20); // left leg
      g.fillRect(27, 54, 14, 20); // right leg

      // ── Boots (black, slightly wider) ─────────────────────────────────────
      g.fillStyle(0x1a1a1a);
      g.fillRect(5,  68, 16, 12); // left boot
      g.fillRect(27, 68, 16, 12); // right boot
      // boot highlight
      g.fillStyle(0x333333);
      g.fillRect(5,  68, 16, 3);
      g.fillRect(27, 68, 16, 3);

      // ── Belt (gold) ───────────────────────────────────────────────────────
      g.fillStyle(0xe6ac00);
      g.fillRect(6, 50, 36, 5);
      g.fillStyle(0xffd740);
      g.fillRect(6, 50, 36, 2);   // shine

      // ── Torso / gi jacket (deep red) ─────────────────────────────────────
      g.fillStyle(0xb71c1c);
      g.fillRect(6, 26, 36, 25);  // main torso block

      // gi fold lines (darker)
      g.fillStyle(0x8b0000);
      g.fillRect(20, 28, 3, 20);  // left lapel edge
      g.fillRect(25, 28, 3, 20);  // right lapel edge

      // centre white stripe (gi collar/lapels)
      g.fillStyle(0xffffff);
      g.fillRect(21, 26, 6, 22);

      // torso shadow (bottom)
      g.fillStyle(0x8b0000);
      g.fillRect(6, 46, 36, 5);

      // ── Arms ─────────────────────────────────────────────────────────────
      // left arm
      g.fillStyle(0xb71c1c);
      g.fillRect(0, 28, 8, 18);
      // right arm
      g.fillRect(40, 28, 8, 18);

      // forearms / gloves (dark)
      g.fillStyle(0x1a1a1a);
      g.fillRect(0, 40, 8, 8);   // left glove
      g.fillRect(40, 40, 8, 8);  // right glove
      g.fillStyle(0x333333);
      g.fillRect(0, 40, 8, 2);
      g.fillRect(40, 40, 8, 2);

      // ── Neck ─────────────────────────────────────────────────────────────
      g.fillStyle(0xd4956a);
      g.fillRect(19, 21, 10, 6);

      // ── Head ─────────────────────────────────────────────────────────────
      // face (skin)
      g.fillStyle(0xd4956a);
      g.fillRect(12, 5, 24, 18);

      // hair (dark, top + sides)
      g.fillStyle(0x1a1a1a);
      g.fillRect(12, 3, 24, 7);   // top hair
      g.fillRect(10, 5, 4, 12);   // left side hair
      g.fillRect(34, 5, 4, 12);   // right side hair

      // headband (red)
      g.fillStyle(0xff1744);
      g.fillRect(10, 9, 28, 4);
      g.fillStyle(0xff6d6d);
      g.fillRect(10, 9, 28, 1);   // headband shine

      // eyes (right-facing; flipped for left)
      g.fillStyle(0xffffff);
      g.fillRect(15, 15, 8, 5);   // left eye white
      g.fillRect(27, 15, 8, 5);   // right eye white
      g.fillStyle(0x1a1a1a);
      g.fillRect(17, 16, 4, 4);   // left pupil
      g.fillRect(31, 16, 4, 4);   // right pupil
      // eye glint
      g.fillStyle(0xffffff);
      g.fillRect(19, 16, 2, 2);
      g.fillRect(33, 16, 2, 2);

      // nose/mouth hint
      g.fillStyle(0xb07050);
      g.fillRect(22, 21, 4, 2);   // mouth line

      g.generateTexture('player', 48, 80);
      g.destroy();
    }

    // 1×1 invisible image used as the physics hitbox carrier
    if (!scene.textures.exists('_px')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 0);
      g.fillRect(0, 0, 1, 1);
      g.generateTexture('_px', 1, 1);
      g.destroy();
    }
  }

  _initSprite(scene, x, y) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    // Physics body skips the wide-brim hat (top ~20 px) for accurate collisions
    this.sprite.body.setSize(38, 70);
    this.sprite.body.setOffset(7, 20);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(5);
  }

  _initHitbox(scene) {
    // One shared hitbox for all attacks; AttackState resizes it on enter()
    this.attackHitbox = scene.physics.add.image(0, 0, '_px');
    this.attackHitbox.setDisplaySize(48, 24);
    this.attackHitbox.body.setAllowGravity(false);
    this.attackHitbox.body.enable = false;
    this.attackHitbox.setAlpha(0);
    this.attackHitbox.setDepth(4);
  }

  _initInput(scene) {
    this.cursors = scene.input.keyboard.createCursorKeys();
    this.zKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.xKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.cKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
  }

  _initSM() {
    this.sm = new StateMachine(this);

    // Startup = "charge" frames before the hit connects; shorter = snappier.
    // ActiveWindow = frames the hitbox actually damages; longer = more lenient.
    const ATTACKS = {
      ATTACK_PUNCH: {
        hitW: 48,  hitH: 24, hitOffsetX: 42,
        duration: 320, startup: 70,  activeWindow: 160,
        tintColor: 0xff8833, damage: 25,
      },
      ATTACK_KICK: {
        hitW: 62,  hitH: 22, hitOffsetX: 52,
        duration: 430, startup: 90,  activeWindow: 210,
        tintColor: 0xff5533, damage: 32,
      },
      ATTACK_SWORD: {
        hitW: 80,  hitH: 36, hitOffsetX: 62,
        duration: 540, startup: 55,  activeWindow: 310,
        tintColor: 0xffcc00, damage: 50,
      },
    };

    this.sm
      .add('IDLE',         new IdleState(this))
      .add('WALK',         new WalkState(this))
      .add('JUMP',         new JumpState(this))
      .add('FALL',         new FallState(this))
      .add('ATTACK_PUNCH', new AttackState(this, 'ATTACK_PUNCH', ATTACKS.ATTACK_PUNCH))
      .add('ATTACK_KICK',  new AttackState(this, 'ATTACK_KICK',  ATTACKS.ATTACK_KICK))
      .add('ATTACK_SWORD', new AttackState(this, 'ATTACK_SWORD', ATTACKS.ATTACK_SWORD))
      .add('HIT',          new HitState(this))
      .add('DEAD',         new DeadState(this));

    this.sm.transition('IDLE');
  }

  // ── Helpers used by states ──────────────────────────────────────────────────

  _grounded()           { return this.sprite.body.blocked.down; }
  _jumpPressed()        { return Phaser.Input.Keyboard.JustDown(this.cursors.up); }
  _movingHorizontally() { return this.cursors.left.isDown || this.cursors.right.isDown; }

  _airMove() {
    if (this.cursors.left.isDown) {
      this.sprite.setVelocityX(-this.speed * 0.85);
      this.facing = -1;
    } else if (this.cursors.right.isDown) {
      this.sprite.setVelocityX(this.speed * 0.85);
      this.facing = 1;
    }
  }

  // Returns true if an attack was triggered (so states can bail early)
  _tryAttack() {
    const s  = this.sm.current;
    const eq = this.equippedWeapon;
    if (!s || s === 'HIT' || s === 'DEAD' || s.startsWith('ATTACK')) return false;

    const JD = Phaser.Input.Keyboard.JustDown;

    // Z key ── throwing star: fire projectile; pipe/bare-hands: melee punch
    if (JD(this.zKey) && this._cd.punch <= 0) {
      if (eq === 'throwingstar') {
        this._cd.punch = 580;
        this.scene.events.emit('player-throw', {
          x: this.sprite.x, y: this.sprite.y, facing: this.facing,
        });
        // No state transition — player stays mobile while throwing
        return true;
      }
      this._cd.punch = 400;
      this.sm.transition('ATTACK_PUNCH'); // also used for pipe smash (CombatSystem applies correct dmg)
      return true;
    }

    // X key ── kick (always available regardless of weapon)
    if (JD(this.xKey) && this._cd.kick <= 0) {
      this._cd.kick = 550;
      this.sm.transition('ATTACK_KICK');
      return true;
    }

    // C key ── sword swing (only when sword is equipped)
    if (JD(this.cKey) && eq === 'sword' && this._cd.sword <= 0) {
      this._cd.sword = 800;
      this.sm.transition('ATTACK_SWORD');
      return true;
    }

    return false;
  }

  /** Called by WeaponSystem when the player walks over a pickup. */
  equipWeapon(type) {
    this.equippedWeapon = type;
    this.scene.events.emit('weapon-changed', type);
  }

  /**
   * Strips the equipped weapon and returns its type so the caller can
   * spawn a pickup at the appropriate position.
   */
  unequipWeapon() {
    const had = this.equippedWeapon;
    this.equippedWeapon = null;
    this.scene.events.emit('weapon-changed', null);
    return had;
  }

  _syncHitbox() {
    this.attackHitbox.x = this.sprite.x + this.facing * this._hitOffset;
    this.attackHitbox.y = this.sprite.y;
  }

  _tint(color) { this.sprite.setTint(color); }

  // ── Public API ──────────────────────────────────────────────────────────────

  update(time, delta) {
    // Tick all cooldowns
    for (const k in this._cd) {
      if (this._cd[k] > 0) this._cd[k] = Math.max(0, this._cd[k] - delta);
    }

    // Keep sprite orientation in sync regardless of state
    this.sprite.setFlipX(this.facing === -1);

    this.sm.update(time, delta);
  }

  // Returns true if the hit was lethal
  takeDamage(rawAmount) {
    const s = this.sm.current;
    if (s === 'DEAD' || s === 'HIT') return false; // HIT state = invincible frames

    // Armor intercepts the hit, reduces damage, and tracks durability
    const dmg = this.armor ? this.armor.interceptHit(rawAmount) : rawAmount;

    this.health = Math.max(0, this.health - dmg);

    // Screen shake — intensity grows slightly with damage, capped at 0.020
    this.scene.cameras.main.shake(220, Math.min(0.020, 0.006 + dmg * 0.0003));

    if (this.health <= 0) { this.sm.transition('DEAD'); return true; }
    this.sm.transition('HIT');
    return false;
  }

  get state()  { return this.sm.current; }
  get isDead() { return this.sm.current === 'DEAD'; }
}
