/* global Phaser */

/**
 * Ambient weather / atmosphere effects.
 * All particles are screen-space (scrollFactor 0) so they
 * cover the viewport regardless of camera position.
 *
 * Usage:
 *   import { addWeather } from '../systems/WeatherSystem.js';
 *   addWeather(this, 'rain');   // inside scene create()
 */

// ── Texture helper ────────────────────────────────────────────────────────────

function mkTex(scene, key, w, h, drawFn) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  drawFn(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// ── Public API ────────────────────────────────────────────────────────────────

export function addWeather(scene, type) {
  const W = scene.scale.width;
  const H = scene.scale.height;

  switch (type) {
    case 'rain':   _rain(scene, W, H);   break;
    case 'snow':   _snow(scene, W, H);   break;
    case 'leaves': _leaves(scene, W, H); break;
    case 'embers': _embers(scene, W, H); break;
    case 'ash':    _ash(scene, W, H);    break;
  }
}

// ── Rain (Level 1 — City Streets) ─────────────────────────────────────────────
// Angled blue-white streaks, heavy and fast.

function _rain(scene, W, H) {
  mkTex(scene, 'wx_rain', 2, 14, g => {
    g.fillStyle(0xaaccff, 0.75);
    g.fillRect(0, 0, 1, 14);
    g.fillStyle(0xddeeff, 0.40);
    g.fillRect(1, 0, 1, 14);
  });

  // Heavy layer — fast, plentiful
  scene.add.particles(0, -20, 'wx_rain', {
    x:        { min: -40, max: W + 40 },
    lifespan: 520,
    speedX:   120,
    speedY:   820,
    scale:    { min: 0.8, max: 1.4 },
    alpha:    { start: 0.75, end: 0.15 },
    quantity: 6,
    frequency: 18,
    depth:    18,
  }).setScrollFactor(0);

  // Light mist layer — slow, translucent
  scene.add.particles(0, -10, 'wx_rain', {
    x:        { min: -60, max: W + 60 },
    lifespan: 700,
    speedX:   80,
    speedY:   500,
    scale:    { min: 0.3, max: 0.7 },
    alpha:    { start: 0.35, end: 0 },
    quantity: 3,
    frequency: 35,
    depth:    17,
  }).setScrollFactor(0);

  // Tiny splash dots at ground level
  mkTex(scene, 'wx_splash', 4, 2, g => {
    g.fillStyle(0x99bbdd, 0.6);
    g.fillRect(0, 0, 4, 1);
  });
  scene.add.particles(0, H - 62, 'wx_splash', {
    x:        { min: 0, max: W },
    lifespan: 250,
    speedX:   { min: -30, max: 30 },
    speedY:   { min: -20, max: -5 },
    scale:    { start: 1, end: 0 },
    alpha:    { start: 0.7, end: 0 },
    quantity: 2,
    frequency: 30,
    depth:    19,
  }).setScrollFactor(0);
}

// ── Snow (Level 2 — Ancient Temple) ──────────────────────────────────────────
// Soft white flakes, gentle drift, two layers for depth.

function _snow(scene, W, H) {
  mkTex(scene, 'wx_snow_lg', 4, 4, g => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
  });
  mkTex(scene, 'wx_snow_sm', 2, 2, g => {
    g.fillStyle(0xeeeeff, 1);
    g.fillRect(0, 0, 2, 2);
  });

  // Large flakes — foreground
  scene.add.particles(0, -10, 'wx_snow_lg', {
    x:        { min: -20, max: W + 20 },
    lifespan: { min: 4500, max: 7000 },
    speedX:   { min: -18, max: 18 },
    speedY:   { min: 35, max: 65 },
    scale:    { min: 0.6, max: 1.2 },
    alpha:    { start: 0.90, end: 0 },
    quantity: 1,
    frequency: 55,
    depth:    18,
  }).setScrollFactor(0);

  // Small flakes — mid layer
  scene.add.particles(0, -10, 'wx_snow_sm', {
    x:        { min: -30, max: W + 30 },
    lifespan: { min: 6000, max: 9000 },
    speedX:   { min: -10, max: 10 },
    speedY:   { min: 20, max: 45 },
    scale:    { min: 0.5, max: 1.0 },
    alpha:    { start: 0.55, end: 0 },
    quantity: 1,
    frequency: 80,
    depth:    17,
  }).setScrollFactor(0);
}

// ── Falling Leaves (Level 3 — Dark Forest) ────────────────────────────────────
// Brown/green leaves spiral and tumble down with a breeze.

function _leaves(scene, W, H) {
  // Crimson / scarlet autumn leaves — sized and coloured for a red-forest biome
  mkTex(scene, 'wx_leaf', 7, 5, g => {
    g.fillStyle(0xcc1a1a, 0.92);   // deep crimson
    g.fillEllipse(3.5, 2.5, 7, 5);
  });
  mkTex(scene, 'wx_leaf2', 6, 4, g => {
    g.fillStyle(0xff5500, 0.88);   // burnt orange accent
    g.fillEllipse(3, 2, 6, 4);
  });
  mkTex(scene, 'wx_leaf3', 5, 3, g => {
    g.fillStyle(0x8b0000, 0.80);   // dark blood-red smaller leaf
    g.fillEllipse(2.5, 1.5, 5, 3);
  });

  // Main crimson fall — drifts across screen with gentle tumble
  scene.add.particles(0, -10, 'wx_leaf', {
    x:        { min: -40, max: W + 40 },
    lifespan: { min: 5000, max: 9000 },
    speedX:   { min: 20, max: 65 },
    speedY:   { min: 28, max: 70 },
    rotate:   { start: 0, end: 360 },
    scale:    { min: 0.8, max: 1.5 },
    alpha:    { start: 0.90, end: 0 },
    quantity: 2,
    frequency: 70,
    depth:    18,
  }).setScrollFactor(0);

  // Orange accent leaves — slower, bigger
  scene.add.particles(0, -10, 'wx_leaf2', {
    x:        { min: -20, max: W + 20 },
    lifespan: { min: 6000, max: 11000 },
    speedX:   { min: 8, max: 40 },
    speedY:   { min: 18, max: 50 },
    rotate:   { start: 180, end: 540 },
    scale:    { min: 0.6, max: 1.3 },
    alpha:    { start: 0.75, end: 0 },
    quantity: 1,
    frequency: 100,
    depth:    17,
  }).setScrollFactor(0);

  // Dark small leaves — dense spray near ground
  scene.add.particles(0, H * 0.5, 'wx_leaf3', {
    x:        { min: -10, max: W + 10 },
    lifespan: { min: 3000, max: 6000 },
    speedX:   { min: 30, max: 80 },
    speedY:   { min: -10, max: 20 },
    rotate:   { start: 0, end: 720 },
    scale:    { min: 0.5, max: 1.0 },
    alpha:    { start: 0.65, end: 0 },
    quantity: 1,
    frequency: 150,
    depth:    16,
  }).setScrollFactor(0);
}

// ── Embers (Level 4 — Castle Fortress) ───────────────────────────────────────
// Fire embers drift upward from below, glowing orange and red.

function _embers(scene, W, H) {
  mkTex(scene, 'wx_ember', 3, 3, g => {
    g.fillStyle(0xff7700, 1);
    g.fillCircle(1.5, 1.5, 1.5);
  });
  mkTex(scene, 'wx_spark', 2, 2, g => {
    g.fillStyle(0xffcc44, 1);
    g.fillRect(0, 0, 2, 2);
  });

  // Main ember drift — rises slowly
  scene.add.particles(0, H + 10, 'wx_ember', {
    x:        { min: 0, max: W },
    lifespan: { min: 2000, max: 3500 },
    speedX:   { min: -35, max: 35 },
    speedY:   { min: -110, max: -40 },
    scale:    { start: 1.1, end: 0 },
    alpha:    { start: 1, end: 0 },
    tint:     [0xff4400, 0xff7700, 0xffaa00],
    quantity: 2,
    frequency: 50,
    depth:    18,
  }).setScrollFactor(0);

  // Bright sparks — faster pop, smaller
  scene.add.particles(0, H - 55, 'wx_spark', {
    x:        { min: 0, max: W },
    lifespan: { min: 800, max: 1600 },
    speedX:   { min: -60, max: 60 },
    speedY:   { min: -180, max: -80 },
    scale:    { start: 0.9, end: 0 },
    alpha:    { start: 0.9, end: 0 },
    tint:     [0xffee88, 0xffcc44],
    quantity: 1,
    frequency: 80,
    depth:    19,
  }).setScrollFactor(0);
}

// ── Dark Ash (Level 5 — Final Boss) ──────────────────────────────────────────
// Purple-grey ash and dark energy motes drift down ominously.

function _ash(scene, W, H) {
  mkTex(scene, 'wx_ash_lg', 3, 3, g => {
    g.fillStyle(0xaa66ff, 0.85);
    g.fillCircle(1.5, 1.5, 1.5);
  });
  mkTex(scene, 'wx_ash_sm', 2, 2, g => {
    g.fillStyle(0x553366, 0.9);
    g.fillRect(0, 0, 2, 2);
  });

  // Purple energy motes
  scene.add.particles(0, -10, 'wx_ash_lg', {
    x:        { min: 0, max: W },
    lifespan: { min: 3500, max: 5500 },
    speedX:   { min: -25, max: 25 },
    speedY:   { min: 18, max: 55 },
    scale:    { start: 1.2, end: 0 },
    alpha:    { start: 0.85, end: 0 },
    quantity: 1,
    frequency: 65,
    depth:    18,
  }).setScrollFactor(0);

  // Dark ash flecks
  scene.add.particles(0, -5, 'wx_ash_sm', {
    x:        { min: 0, max: W },
    lifespan: { min: 4000, max: 7000 },
    speedX:   { min: -15, max: 15 },
    speedY:   { min: 12, max: 40 },
    scale:    { start: 1, end: 0 },
    alpha:    { start: 0.65, end: 0 },
    quantity: 1,
    frequency: 90,
    depth:    17,
  }).setScrollFactor(0);
}
