extends Node2D
# Base class for all level scenes.
# Subclasses override the virtual methods at the bottom.

const WORLD_W := 800.0
const WORLD_H := 450.0

var score  := 0
var _done  := false
var player         # CharacterBody2D + Player.gd script
var enemies : Array = []
var _hud           # CanvasLayer + HUD.gd script
var _weapon_sys    # Node2D + WeaponSystem.gd script
var _notice_label  : Label
var _music         : AudioStreamPlayer

func _ready() -> void:
	_draw_background(_get_bg_path(), _get_bg_fallback_color())
	_build_platform()
	_spawn_player()
	_do_spawn_enemies()
	_build_weapon_system()
	_build_hud()
	# Register boss with HUD (first enemy = boss)
	if enemies.size() > 0 and _hud:
		_hud.set_boss(enemies[0], _get_boss_name())
	_build_weather()
	_build_music()
	_build_notice()

# ── Background ─────────────────────────────────────────────────────────────────
func _draw_background(path: String, fallback: Color) -> void:
	var tex = load(path) if path != "" else null
	if tex:
		# Sprite2D scales reliably to exact pixel dimensions
		var spr = Sprite2D.new()
		spr.texture  = tex
		spr.centered = false
		spr.position = Vector2.ZERO
		spr.scale    = Vector2(WORLD_W / tex.get_width(), WORLD_H / tex.get_height())
		spr.z_index  = 0
		add_child(spr)
	else:
		var bg = ColorRect.new()
		bg.color    = fallback
		bg.position = Vector2.ZERO
		bg.size     = Vector2(WORLD_W, WORLD_H)
		bg.z_index  = 0
		add_child(bg)

# ── Ground platform ────────────────────────────────────────────────────────────
func _build_platform() -> void:
	var ground_y = _get_ground_y()
	var body = StaticBody2D.new()
	body.collision_layer = 1
	body.collision_mask  = 0
	var col  = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(WORLD_W, 24)
	col.shape = rect
	body.add_child(col)
	body.position = Vector2(WORLD_W * 0.5, ground_y + 12)
	add_child(body)

# ── Player ─────────────────────────────────────────────────────────────────────
func _spawn_player() -> void:
	var ground_y = _get_ground_y()
	var PlayerScript = load("res://scripts/Player.gd")
	player = CharacterBody2D.new()
	player.set_script(PlayerScript)
	# Spawn 80px above the ground surface so the player falls and lands cleanly
	player.position = Vector2(80, ground_y - 80)
	player.z_index = 5
	add_child(player)
	player.connect("player_dead",    _on_player_dead)
	player.connect("combo_hit",      func(): if _hud: _hud.on_combo_hit())
	player.connect("combo_reset",    func(): if _hud: _hud.on_combo_reset())
	player.connect("weapon_changed", func(t): if _hud: _hud.on_weapon_changed(t))

# ── Enemies ────────────────────────────────────────────────────────────────────
func _do_spawn_enemies() -> void:
	_spawn_enemies()
	# Wire contact damage after all enemies are spawned
	for e in enemies:
		_wire_contact(e)

func _spawn_enemy(x: float, y: float, cfg: Dictionary):
	var EScript = load("res://scripts/Enemy.gd")
	var e : CharacterBody2D = CharacterBody2D.new()
	e.set_script(EScript)
	e.e_health          = cfg.get("health",          60)
	e.e_speed           = cfg.get("speed",            80.0)
	e.e_chase_speed     = cfg.get("chase_speed",     116.0)
	e.e_contact_damage  = cfg.get("contact_damage",   10)
	e.e_attack_rate     = cfg.get("attack_rate",       1.4)
	e.e_detection_range = cfg.get("detection_range", 240.0)
	e.e_give_up_range   = cfg.get("give_up_range",   420.0)
	e.e_knockback_speed = cfg.get("knockback_speed", 280.0)
	e.e_color = cfg.get("color", Color(0.8, 0.2, 0.2))
	e.e_w    = cfg.get("w", 36.0)
	e.e_h    = cfg.get("h", 52.0)
	e.position = Vector2(x, y)
	e.z_index  = 4
	add_child(e)
	e.connect("enemy_died", _on_enemy_died)
	enemies.append(e)
	return e

func _wire_contact(e) -> void:
	var area = e.get_contact_area() if e.has_method("get_contact_area") else null
	if area == null: return
	area.body_entered.connect(func(body):
		if body != player: return
		if e.attack_cooldown > 0: return
		if player.is_dead: return
		e.attack_cooldown = e.e_attack_rate
		player.take_damage(e.e_contact_damage)
	)

# ── Weapon system ──────────────────────────────────────────────────────────────
func _build_weapon_system() -> void:
	var WSScript = load("res://scripts/WeaponSystem.gd")
	_weapon_sys = Node2D.new()
	_weapon_sys.set_script(WSScript)
	add_child(_weapon_sys)
	_weapon_sys.setup(player, enemies)

# ── HUD ────────────────────────────────────────────────────────────────────────
func _build_hud() -> void:
	var HUDScript = load("res://scripts/HUD.gd")
	_hud = CanvasLayer.new()
	_hud.set_script(HUDScript)
	add_child(_hud)

func _build_notice() -> void:
	var cl = CanvasLayer.new()
	cl.layer = 15
	add_child(cl)
	_notice_label = Label.new()
	_notice_label.position = Vector2(300, 78)
	_notice_label.size     = Vector2(200, 34)
	_notice_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_notice_label.add_theme_font_size_override("font_size", 18)
	_notice_label.add_theme_color_override("font_color", Color(0, 1, 0.53))
	_notice_label.modulate.a = 0.0
	cl.add_child(_notice_label)

# ── Weather ────────────────────────────────────────────────────────────────────
func _build_weather() -> void:
	var wtype = _get_weather_type()
	if wtype == "": return
	var WSScript = load("res://scripts/WeatherSystem.gd")
	var node = WSScript.new()
	add_child(node)
	node._init_type(wtype)

# ── Music ──────────────────────────────────────────────────────────────────────
func _build_music() -> void:
	var path = _get_music_path()
	if path == "": return
	var stream = load(path)
	if stream == null: return
	_music = AudioStreamPlayer.new()
	_music.stream = stream
	_music.volume_db = -8.0
	add_child(_music)
	_music.play()

# ── Per-frame ──────────────────────────────────────────────────────────────────
func _physics_process(_delta: float) -> void:
	if _done: return
	if player and _hud:
		_hud.update_hp(player.health, player.max_health)
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead:
			e.player_ref = player

# ── Callbacks ──────────────────────────────────────────────────────────────────
func _on_enemy_died() -> void:
	score += 100
	_check_clear()

func _on_player_dead() -> void:
	if _done: return
	_done = true
	if _music: _music.stop()
	get_tree().create_timer(0.4).timeout.connect(func():
		get_tree().root.set_meta("go_score",  score)
		get_tree().root.set_meta("go_win",    false)
		get_tree().root.set_meta("go_origin", _get_level_name())
		get_tree().change_scene_to_file("res://scenes/GameOver.tscn")
	)

func _check_clear() -> void:
	if _done: return
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead: return
	_done = true
	if _music: _music.stop()
	_notice_label.text = "LEVEL CLEAR!"
	_notice_label.modulate.a = 1.0
	var tw = create_tween()
	tw.tween_interval(1.4)
	tw.tween_callback(func():
		get_tree().root.set_meta("go_score",  score)
		get_tree().root.set_meta("go_win",    true)
		get_tree().root.set_meta("go_origin", _get_level_name())
		get_tree().change_scene_to_file(_get_next_scene())
	)

# ── Virtual methods (subclasses override) ─────────────────────────────────────
func _get_bg_path()          -> String:  return ""
func _get_bg_fallback_color()-> Color:   return Color(0.04, 0.04, 0.1)
func _get_next_scene()       -> String:  return "res://scenes/GameOver.tscn"
func _get_level_name()       -> String:  return "Level1Scene"
func _get_weather_type()     -> String:  return ""
func _get_music_path()       -> String:  return "res://assets/audio/music.mp3"
func _get_boss_name()        -> String:  return "BOSS"
func _get_ground_y()         -> float:   return 380.0  # default ground surface y
func _spawn_enemies()        -> void:   pass
