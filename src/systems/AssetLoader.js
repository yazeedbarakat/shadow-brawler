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

  // ── Player animation strips (each frame 52×93 px) ──────────────────────────
  player:       { path: '/assets/sprites/player_idle.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 1 frame
  player_walk:  { path: '/assets/sprites/player_walk.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 4 frames
  player_jump:  { path: '/assets/sprites/player_jump.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 1 frame
  player_hit:   { path: '/assets/sprites/player_hit.png',   w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 1 frame
  player_punch: { path: '/assets/sprites/player_punch.png', w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 6 frames
  player_sword: { path: '/assets/sprites/player_sword.png', w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 6 frames
  player_kick:  { path: '/assets/sprites/player_kick.png',  w: 52, h: 93, frameWidth: 52, frameHeight: 93 }, // 5 frames
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
  bg_menu:             { path: '/assets/backgrounds/menu_bg.webp',          w: 960,  h: 540 },

  // ── Backgrounds (stretched to fill WORLD_W × WORLD_H) ─────────────────────
  bg_city:             { path: '/assets/backgrounds/level1theame.webp',   w: 1600, h: 450 },
  bg_level1:           { path: '/assets/backgrounds/level1_bg.png',       w: 1600, h: 450 },
  bg_level1_anim:      { path: '/assets/backgrounds/level1_anim.png',     w: 2730, h: 1536, frameWidth: 910, frameHeight: 512 },
  bg_temple:           { path: '/assets/backgrounds/level2theme.webp',    w: 1600, h: 450 },
  bg_forest:           { path: '/assets/backgrounds/level3theme.webp',    w: 1600, h: 450 },
  bg_castle:           { path: '/assets/backgrounds/level4theme.webp',    w: 1600, h: 450 },
  bg_throne:           { path: '/assets/backgrounds/level5theme.webp',    w: 1200, h: 450 },

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
