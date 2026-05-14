// Canonical damage values per attack type.
const ATTACK_DAMAGE = {
  ATTACK_PUNCH: 10,
  ATTACK_KICK:  15,
  ATTACK_SWORD: 25,
};

// Weapon overrides — when this weapon is equipped the mapped attack deals different damage.
const WEAPON_DAMAGE_OVERRIDE = {
  pipe: { ATTACK_PUNCH: 20 }, // pipe doubles punch damage
};

export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Wire up all arcade-physics overlaps for player ↔ enemy combat.
   *
   * callbacks:
   *   onEnemyKilled(enemy)  — fired once per kill, after DEAD transition
   *   onPlayerDied()        — fired when player's health reaches 0
   */
  setupOverlaps(player, enemyGroup, callbacks = {}) {
    // ── Player attack hitbox → enemy ────────────────────────────────────────
    //
    // Damage is looked up from ATTACK_DAMAGE by current player state name.
    // Knockback direction = player.facing (the direction the attack swings).
    // Enemy.receivedHit() handles HIT-state invincibility internally.

    this.scene.physics.add.overlap(
      player.attackHitbox,
      enemyGroup,
      (_hitbox, enemySprite) => {
        if (!player.isAttacking) return;

        const enemy = enemySprite.enemyRef;
        if (!enemy || enemy.isDead) return;

        const base     = ATTACK_DAMAGE[player.state] ?? ATTACK_DAMAGE.ATTACK_PUNCH;
        const override = WEAPON_DAMAGE_OVERRIDE[player.equippedWeapon]?.[player.state];
        const dmg      = override ?? base;
        const knockDir = player.facing; // +1 = push right, -1 = push left

        // Track whether this hit will actually register (not in invincibility frames)
        const wasHittable = enemy.sm?.current !== 'HIT' && !enemy.isDead;
        enemy.receivedHit(dmg, knockDir);

        // Emit combo event only when damage truly landed
        if (wasHittable) this.scene.events.emit('combo-hit');

        if (enemy.isDead && callbacks.onEnemyKilled) {
          callbacks.onEnemyKilled(enemy);
        }
      },
    );

    // ── Enemy body → player contact ─────────────────────────────────────────
    //
    // Each enemy has its own contactDamage and attackRate so sub-types can vary.
    // Enemy.attackCooldown is ticked down inside Enemy.update(), not here.
    // Player.takeDamage() handles HIT-state invincibility internally.

    this.scene.physics.add.overlap(
      player.sprite,
      enemyGroup,
      (_playerSprite, enemySprite) => {
        const enemy = enemySprite.enemyRef;
        if (!enemy || enemy.isDead || enemy.attackCooldown > 0) return;

        enemy.attackCooldown = enemy.attackRate;
        const dead = player.takeDamage(enemy.contactDamage);
        if (dead && callbacks.onPlayerDied) callbacks.onPlayerDied();
      },
    );
  }
}
