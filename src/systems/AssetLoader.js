/* global Phaser */

/**
 * Central asset manifest.
 *
 * Each entry maps a stable texture key to its source file and natural
 * pixel dimensions.  The dimensions (w, h) serve two purposes:
 *   1. They document the expected size of the real PNG so artists know
 *      what to produce.
 *   2. They are the canvas size used when generating the procedural
 *      fallback rectangle texture.
 *
 * ─── Swapping in real art ────────────────────────────────────────────────────
 *   Drop a correctly-named PNG at the listed `path`.  The game loads it on
 *   startup via preloadAssets(); if the file exists, the procedural fallback
 *   is bypassed automatically — no code changes required.
 *
 * ─── Path conventions ────────────────────────────────────────────────────────
 *   /assets/sprites/      — characters, pickups, projectiles, platform tiles
 *   /assets/backgrounds/  — full-level background images (WORLD_W × WORLD_H)
 */
export const ASSET_DEFS = {

  // ── New player animation strips (52×80 px per frame) ──────────────────────
  p_idle:        { path: '/assets/sprites/p_idle.png',        w: 312, h: 80, frameWidth: 52, frameHeight: 80 },
  p_walk:        { path: '/assets/sprites/p_walk.png',        w: 416, h: 80, frameWidth: 52, frameHeight: 80 },
  p_run:         { path: '/assets/sprites/p_run.png',         w: 416, h: 80, frameWidth: 52, frameHeight: 80 },
  p_sprint:      { path: '/assets/sprites/p_sprint.png',      w: 520, h: 80, frameWidth: 52, frameHeight: 80 },
  p_jump:        { path: '/assets/sprites/p_jump.png',        w: 208, h: 80, frameWidth: 52, frameHeight: 80 },
  p_fall:        { path: '/assets/sprites/p_fall.png',        w: 156, h: 80, frameWidth: 52, frameHeight: 80 },
  p_land:        { path: '/assets/sprites/p_land.png',        w: 156, h: 80, frameWidth: 52, frameHeight: 80 },
  p_dash:        { path: '/assets/sprites/p_dash.png',        w: 312, h: 80, frameWidth: 52, frameHeight: 80 },
  p_turn:        { path: '/assets/sprites/p_turn.png',        w: 208, h: 80, frameWidth: 52, frameHeight: 80 },
  p_crouch:      { path: '/assets/sprites/p_crouch.png',      w:  52, h: 80, frameWidth: 52, frameHeight: 80 },
  p_crouch_idle: { path: '/assets/sprites/p_crouch_idle.png', w:  52, h: 80, frameWidth: 52, frameHeight: 80 },
  p_crouch_walk: { path: '/assets/sprites/p_crouch_walk.png', w: 312, h: 80, frameWidth: 52, frameHeight: 80 },
  p_atk_light1:  { path: '/assets/sprites/p_atk_light1.png',  w: 260, h: 80, frameWidth: 52, frameHeight: 80 },
  p_atk_light2:  { path: '/assets/sprites/p_atk_light2.png',  w: 260, h: 80, frameWidth: 52, frameHeight: 80 },
  p_atk_heavy:   { path: '/assets/sprites/p_atk_heavy.png',   w: 416, h: 80, frameWidth: 52, frameHeight: 80 },
  p_combo1a:     { path: '/assets/sprites/p_combo1a.png',     w: 260, h: 80, frameWidth: 52, frameHeight: 80 },
  p_combo1b:     { path: '/assets/sprites/p_combo1b.png',     w: 260, h: 80, frameWidth: 52, frameHeight: 80 },
  p_combo1c:     { path: '/assets/sprites/p_combo1c.png',     w: 260, h: 80, frameWidth: 52, frameHeight: 80 },
  p_hurt:        { path: '/assets/sprites/p_hurt.png',        w: 156, h: 80, frameWidth: 52, frameHeight: 80 },
  p_block:       { path: '/assets/sprites/p_block.png',       w: 104, h: 80, frameWidth: 52, frameHeight: 80 },
  p_counter:     { path: '/assets/sprites/p_counter.png',     w: 260, h: 80, frameWidth: 52, frameHeight: 80 },
  p_dash_attack: { path: '/assets/sprites/p_dash_attack.png', w: 312, h: 80, frameWidth: 52, frameHeight: 80 },
  p_roll:        { path: '/assets/sprites/p_roll.png',        w: 312, h: 80, frameWidth: 52, frameHeight: 80 },
  p_death:       { path: '/assets/sprites/p_death.png',       w: 520, h: 80, frameWidth: 52, frameHeight: 80 },

  // ── Legacy player strips (52×93 px) — kept as fallbacks ───────────────────
  player:       { path: '/assets/sprites/player_idle.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  player_walk:  { path: '/assets/sprites/player_walk.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  player_jump:  { path: '/assets/sprites/player_jump.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  player_hit:   { path: '/assets/sprites/player_hit.png',   w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  player_punch: { path: '/assets/sprites/player_punch.png', w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  player_sword: { path: '/assets/sprites/player_sword.png', w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  player_kick:  { path: '/assets/sprites/player_kick.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 },
  enemy:               { path: '/assets/sprites/enemy.png',               w: 36,   h: 52  },
  enemy_heavy:         { path: '/assets/sprites/enemy_heavy.png',         w: 48,   h: 64  },
  enemy_ranged:        { path: '/assets/sprites/enemy_ranged.png',        w: 36,   h: 52  },
  boss:                { path: '/assets/sprites/boss.png',                w: 72,   h: 96  },

  // ── Weapon pickups (sprite includes 2 px padding on each side) ─────────────
  pickup_sword:        { path: '/assets/sprites/pickup_sword.png',        w: 14,   h: 44  },
  pickup_pipe:         { path: '/assets/sprites/pickup_pipe.png',         w: 14,   h: 38  },
  pickup_throwingstar: { path: '/assets/sprites/pickup_throwingstar.png', w: 24,   h: 24  },
  pickup_armor:        { path: '/assets/sprites/pickup_armor.png',        w: 24,   h: 40  },

  // ── Projectiles ─────────────────────────────────────────────────────────────
  proj_star:           { path: '/assets/sprites/proj_star.png',           w: 16,   h: 16  },
  proj_enemy:          { path: '/assets/sprites/proj_enemy.png',          w: 10,   h: 10  },
  proj_boss:           { path: '/assets/sprites/proj_boss.png',           w: 16,   h: 16  },

  // ── Menu background ────────────────────────────────────────────────────────
  bg_menu:             { path: '/assets/backgrounds/menu_bg.png',           w: 960,  h: 540 },

  // ── Backgrounds (stretched to fill WORLD_W × WORLD_H) ─────────────────────
  bg_city:             { path: '/assets/backgrounds/level1theame.webp',   w: 1600, h: 450 },
  bg_level1:           { path: '/assets/backgrounds/level1_bg.webp',      w: 1600, h: 450 },
  bg_level1_anim:      { path: '/assets/backgrounds/level1_anim.png',     w: 2730, h: 1536, frameWidth: 910, frameHeight: 512 },
  bg_temple:           { path: '/assets/backgrounds/level2theme.webp',    w: 1600, h: 450 },
  bg_forest:           { path: '/assets/backgrounds/level3theme.webp',    w: 1600, h: 450 },
  bg_castle:           { path: '/assets/backgrounds/level4theme.webp',    w: 1600, h: 450 },
  bg_throne:           { path: '/assets/backgrounds/level5theme.webp',    w: 1200, h: 450 },

  // ── HUD elements ────────────────────────────────────────────────────────────
  healthbar: { path: '/assets/sprites/healthbar.png', w: 165, h: 49 },

  // ── Platform tiles (tiled horizontally across each platform's full width) ──
  plat_city:           { path: '/assets/sprites/platform_city.png',       w: 16,   h: 16  },
  plat_temple:         { path: '/assets/sprites/platform_temple.png',     w: 16,   h: 16  },
  plat_forest:         { path: '/assets/sprites/platform_forest.png',     w: 16,   h: 16  },
  plat_castle:         { path: '/assets/sprites/platform_castle.png',     w: 16,   h: 16  },
  plat_boss:           { path: '/assets/sprites/platform_boss.png',       w: 16,   h: 16  },
};

/**
 * Queue asset files for loading.  Call from your scene's preload() method:
 *
 *   preload() {
 *     preloadAssets(this, ['player', 'enemy', 'bg_city', 'plat_city', ...]);
 *   }
 *
 * Missing files (HTTP 404) are silently ignored by Phaser — the procedural
 * fallbacks inside create() then activate via assetLoaded() checks.
 */
// All player sprite keys (new + legacy fallbacks). Spread into any scene's preloadAssets call.
export const PLAYER_KEYS = [
  'p_idle','p_walk','p_run','p_sprint','p_jump','p_fall','p_land',
  'p_dash','p_turn','p_crouch','p_crouch_idle','p_crouch_walk',
  'p_atk_light1','p_atk_light2','p_atk_heavy',
  'p_combo1a','p_combo1b','p_combo1c',
  'p_hurt','p_block','p_counter','p_dash_attack','p_roll','p_death',
  'player','player_walk','player_jump','player_hit','player_punch','player_sword','player_kick',
];

export function preloadAssets(scene, keys) {
  keys.forEach(key => {
    const def = ASSET_DEFS[key];
    if (!def || scene.textures.exists(key)) return;
    if (def.frameWidth) {
      scene.load.spritesheet(key, def.path, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
    } else {
      scene.load.image(key, def.path);
    }
  });
}

/**
 * Returns true when the named texture was successfully loaded from disk.
 * Returns false when the file was missing/404 or was never queued.
 *
 * Use this to choose between the real-art path and the procedural path:
 *
 *   if (assetLoaded(scene, 'bg_city')) {
 *     scene.add.image(cx, cy, 'bg_city').setDisplaySize(w, h);
 *     return;
 *   }
 *   // ... procedural background ...
 */
export function assetLoaded(scene, key) {
  return scene.textures.exists(key);
}
