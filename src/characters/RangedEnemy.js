/* global Phaser */
import Enemy from './Enemy.js';

// ─── Enemy Projectile ─────────────────────────────────────────────────────────

class EnemyProjectile {
  constructor(scene, x, y, vx, vy, damage) {
    this.scene  = scene;
    this.damage = damage;
    this.active = true;

    if (!scene.textures.exists('proj_enemy')) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x33cc11);
      g.fillRect(0, 0, 10, 10);
      g.fillStyle(0x88ff66);
      g.fillRect(3, 3, 4, 4);
      g.generateTexture('proj_enemy', 10, 10);
      g.destroy();
    }

    this.sprite = scene.physics.add.image(x, y, 'proj_enemy');
    this.sprite.body.setAllowGravity(false);
    this.sprite.setVelocity(vx, vy);
    this.sprite.setDepth(6);
    this.sprite.projRef = this;
  }

  update() {
    if (!this.sprite.active) return;
    this.sprite.rotation += 0.12;

    const b = this.scene.physics.world.bounds;
    const { x, y } = this.sprite;
    if (x < b.left - 50 || x > b.right + 50 || y < b.top - 50 || y > b.bottom + 50) {
      this.destroy();
    }
  }

  destroy() {
    if (!this.active) return;
    this.active = false;

    const flash = this.scene.add.rectangle(
      this.sprite.x, this.sprite.y, 14, 14, 0x44ee22, 0.85,
    ).setDepth(9);
    this.scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 2.4, scaleY: 2.4,
      duration: 150, ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
    this.sprite.destroy();
  }
}

// ─── RangedEnemy ──────────────────────────────────────────────────────────────

/**
 * Extends Enemy with a ranged attack.
 * Additional cfg fields:
 *   shootRange    (default 290) — distance at which the enemy starts shooting
 *   minShootRange (default 88)  — stops shooting if player gets this close (melee range)
 *   shootRate     (default 2400) — ms between shots
 *   projSpeed     (default 230)
 *   projDamage    (default 8)
 *
 * Usage in a scene:
 *   const re = new RangedEnemy(this, x, y, cfg);
 *   re.setupProjectileOverlap(player.sprite, dmg => player.takeDamage(dmg));
 *   enemyGroup.add(re.sprite);            // for melee CombatSystem overlaps
 */
export default class RangedEnemy extends Enemy {
  constructor(scene, x, y, cfg = {}) {
    super(scene, x, y, cfg);

    this.shootRange    = cfg.shootRange    ?? 290;
    this.minShootRange = cfg.minShootRange ?? 88;
    this.shootRate     = cfg.shootRate     ?? 2400;
    this.projSpeed     = cfg.projSpeed     ?? 230;
    this.projDamage    = cfg.projDamage    ?? 8;

    this._shootCooldown = 0;
    this._projGroup     = scene.physics.add.group();
    this._projList      = [];
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Wire this enemy's projectile group to the player sprite.
   * Call this once from the scene after creating the player.
   */
  setupProjectileOverlap(playerSprite, onHit) {
    this.scene.physics.add.overlap(
      playerSprite,
      this._projGroup,
      (_, projSprite) => {
        const proj = projSprite.projRef;
        if (!proj?.active) return;
        const dmg = proj.damage;
        proj.destroy();
        if (onHit) onHit(dmg);
      },
    );
  }

  // Override Enemy.update() — runs base behaviour then checks ranged attack
  update(player, delta) {
    super.update(player, delta); // patrol / chase / hit / dead via base state machine
    if (!this.sprite.active || this.isDead) return;

    // Tick shoot cooldown
    this._shootCooldown = Math.max(0, this._shootCooldown - delta);

    const dist = this._distToPlayer();
    const s    = this.sm.current;

    // Only shoot while actively aware of the player (CHASE) or patrolling nearby (PATROL)
    const canShoot =
      dist >= this.minShootRange &&
      dist <= this.shootRange   &&
      this._shootCooldown <= 0  &&
      (s === 'CHASE' || s === 'PATROL');

    if (canShoot) {
      this._shootCooldown = this.shootRate;
      this._fire();
    }

    // Advance and prune projectiles
    for (let i = this._projList.length - 1; i >= 0; i--) {
      const p = this._projList[i];
      p.update();
      if (!p.active) this._projList.splice(i, 1);
    }
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _fire() {
    if (!this._player) return;

    const dx  = this._player.sprite.x - this.sprite.x;
    const dy  = this._player.sprite.y - this.sprite.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const vx  = (dx / mag) * this.projSpeed;
    const vy  = (dy / mag) * this.projSpeed;

    const proj = new EnemyProjectile(
      this.scene, this.sprite.x, this.sprite.y, vx, vy, this.projDamage,
    );
    this._projGroup.add(proj.sprite);
    this._projList.push(proj);

    // Green flash on the enemy to telegraph the shot
    this.sprite.setTint(0x88ff88);
    this.scene.time.delayedCall(130, () => {
      if (this.sprite.active && this.sm.current !== 'HIT') this.sprite.clearTint();
    });
  }
}
