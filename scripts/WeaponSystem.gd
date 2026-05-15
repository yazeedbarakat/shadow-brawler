extends Node2D

# ── Signals ────────────────────────────────────────────────────────────────────
signal enemy_hit_by_projectile(enemy, damage: int, knock_dir: int)

const GRAVITY := 700.0

var _player          = null
var _pickups     : Array = []
var _projectiles : Array = []
var _enemy_group : Array = []
var _drop_key_held := false

func setup(player, enemy_group: Array) -> void:
	_player = player
	_enemy_group = enemy_group
	player.connect("player_attack",   _on_player_attack)
	player.connect("player_throw",    _on_player_throw)
	player.connect("weapon_changed",  _on_weapon_changed)

# ── Per-frame ──────────────────────────────────────────────────────────────────
func _process(_delta: float) -> void:
	if _player == null: return

	# Drop weapon with F key
	if Input.is_action_just_pressed("drop_weapon"):
		_drop_current_weapon()

	# Update floating pickup label positions
	for p in _pickups:
		if is_instance_valid(p): p.update_label()

	# Update projectiles
	for i in range(_projectiles.size() - 1, -1, -1):
		var p = _projectiles[i]
		if not is_instance_valid(p) or p.finished:
			_projectiles.remove_at(i)
		else:
			p.update_self(_enemy_group)
			if p.finished: _projectiles.remove_at(i)

	# Check pickup overlaps
	for p in _pickups.duplicate():
		if not is_instance_valid(p): continue
		if not p.active: continue
		if _player.global_position.distance_to(p.global_position) < 30:
			_collect(p)

func _on_weapon_changed(_type: String) -> void:
	pass

func _on_player_attack(data: Dictionary) -> void:
	# Visual melee flash
	_show_melee_effect(data)
	# Check hit enemies
	var attack_rect = Rect2(data["x"] - data["w"] * 0.5, data["y"] - data["h"] * 0.5, data["w"], data["h"])
	for e in _enemy_group:
		if not is_instance_valid(e) or e.is_dead: continue
		var e_rect = Rect2(e.global_position.x - e.e_w * 0.5, e.global_position.y - e.e_h * 0.5, e.e_w, e.e_h)
		if attack_rect.intersects(e_rect):
			if not _player.is_attacking: continue
			e.received_hit(data["damage"], _player.facing)

func _on_player_throw(data: Dictionary) -> void:
	var proj = _Projectile.new(get_parent(), data["x"] + data["facing"] * 24, data["y"], data["facing"])
	_projectiles.append(proj)

func _show_melee_effect(data: Dictionary) -> void:
	var styles := {
		"ATTACK_1":    {c=Color(1, 0.67, 0.2),  a=0.80, d=0.16, s=1.5},
		"ATTACK_2":    {c=Color(1, 0.33, 0.2),  a=0.75, d=0.16, s=1.6},
		"ATTACK_3":    {c=Color(1, 0.93, 0),    a=0.90, d=0.22, s=1.9},
		"ATTACK_HEAVY":{c=Color(1, 0.13, 0),    a=0.95, d=0.28, s=2.2},
		"ATTACK_AIR":  {c=Color(1, 0.67, 0.2),  a=0.80, d=0.16, s=1.5},
		"ATTACK_DASH": {c=Color(1, 0.53, 0),    a=0.85, d=0.20, s=2.0},
		"COUNTER":     {c=Color.WHITE,           a=1.00, d=0.30, s=2.5},
	}
	var st = styles.get(data.get("attack_type", ""), styles["ATTACK_1"])
	var flash = ColorRect.new()
	flash.color = st["c"]
	flash.modulate.a = st["a"]
	flash.size = Vector2(data["w"], data["h"])
	flash.position = Vector2(data["x"] - data["w"] * 0.5, data["y"] - data["h"] * 0.5)
	flash.z_index = 8
	get_parent().add_child(flash)
	var tw = flash.create_tween()
	tw.parallel().tween_property(flash, "modulate:a", 0.0, st["d"])
	tw.parallel().tween_property(flash, "scale", Vector2(st["s"], st["s"]), st["d"])
	tw.tween_callback(flash.queue_free)

func add_pickup(x: float, y: float, type: String) -> void:
	var p = _WeaponPickup.new(get_parent(), x, y, type)
	_pickups.append(p)

func _collect(pickup) -> void:
	var current = _player.equipped_weapon
	if current != "":
		add_pickup(pickup.global_position.x, pickup.global_position.y, current)
		_pickups.back().deactivate_briefly()
	pickup.remove()
	_pickups.erase(pickup)
	_player.equip_weapon(pickup.weapon_type)

func _drop_current_weapon() -> void:
	var type = _player.unequip_weapon()
	if type == "": return
	add_pickup(_player.global_position.x, _player.global_position.y + 24, type)
	if not _pickups.is_empty(): _pickups.back().deactivate_briefly()

# ══════════════════════════════════════════════════════════════════════════════
class _WeaponPickup:
	var scene_root    = null
	var weapon_type   : String
	var active        := true
	var _sprite       : Sprite2D
	var _label        : Label
	var _hint         : Label
	var _tween        : Tween
	var global_position : Vector2:
		get: return _sprite.global_position if is_instance_valid(_sprite) else Vector2.ZERO

	func _init(root, x: float, y: float, type: String) -> void:
		scene_root = root
		weapon_type = type
		_sprite = Sprite2D.new()
		_sprite.texture = _make_tex(type)
		_sprite.position = Vector2(x, y)
		_sprite.z_index = 3
		root.add_child(_sprite)

		_label = Label.new()
		_label.text = type.to_upper()
		_label.add_theme_font_size_override("font_size", 10)
		_label.add_theme_color_override("font_color", Color.WHITE)
		_label.position = Vector2(x - 20, y - 28)
		_label.z_index = 8
		root.add_child(_label)

		_hint = Label.new()
		var hints := {"sword": "Z:slash", "pipe": "Z:smash x2", "throwingstar": "Z:throw"}
		_hint.text = hints.get(type, "")
		_hint.add_theme_font_size_override("font_size", 8)
		_hint.add_theme_color_override("font_color", Color(0.67, 0.67, 0.67))
		_hint.position = Vector2(x - 20, y - 18)
		_hint.z_index = 8
		root.add_child(_hint)

		_tween = _sprite.create_tween().set_loops()
		_tween.tween_property(_sprite, "position:y", y - 8, 0.88 + randf() * 0.22).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
		_tween.tween_property(_sprite, "position:y", y,      0.88 + randf() * 0.22).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)

	func update_label() -> void:
		if not is_instance_valid(_sprite): return
		_label.position = Vector2(_sprite.position.x - 20, _sprite.position.y - 28)
		_hint.position  = Vector2(_sprite.position.x - 20, _sprite.position.y - 18)

	func deactivate_briefly() -> void:
		active = false
		scene_root.get_tree().create_timer(0.7).timeout.connect(func(): active = true)

	func remove() -> void:
		if not active: return
		active = false
		if _tween: _tween.kill()
		if is_instance_valid(_label): _label.queue_free()
		if is_instance_valid(_hint):  _hint.queue_free()
		if is_instance_valid(_sprite): _sprite.queue_free()

	func _make_tex(type: String) -> ImageTexture:
		var img = Image.create(14, 40, false, Image.FORMAT_RGBA8)
		match type:
			"sword":
				for px in range(5, 9):
					for py in range(0, 28): img.set_pixel(px, py, Color(0.6, 0.67, 1))
				for px in range(0, 14):
					for py in range(26, 31): img.set_pixel(px, py, Color(0.87, 0.67, 0.27))
				for px in range(5, 9):
					for py in range(31, 40): img.set_pixel(px, py, Color(0.53, 0.33, 0.2))
			"pipe":
				for px in range(4, 10):
					for py in range(0, 40): img.set_pixel(px, py, Color(0.73, 0.73, 0.73))
				for px in range(4, 6):
					for py in range(0, 40): img.set_pixel(px, py, Color(0.87, 0.87, 0.87))
			"throwingstar":
				for px in range(6, 8):
					for py in range(0, 14): img.set_pixel(px, py, Color(1, 0.93, 0.33))
				for px in range(0, 14):
					for py in range(6, 8):  img.set_pixel(px, py, Color(1, 0.93, 0.33))
		return ImageTexture.create_from_image(img)

# ══════════════════════════════════════════════════════════════════════════════
class _Projectile:
	var finished := false
	var damage   := 18
	var direction: int
	var _sprite  : Sprite2D
	var _scene   = null

	func _init(root, x: float, y: float, dir: int) -> void:
		direction = dir
		_scene = root
		_sprite = Sprite2D.new()
		_sprite.texture = _make_tex()
		_sprite.position = Vector2(x, y)
		_sprite.z_index = 7
		root.add_child(_sprite)

	func update_self(enemies: Array) -> void:
		if finished or not is_instance_valid(_sprite): return
		_sprite.position.x += direction * 520.0 * (1.0 / 60.0)
		_sprite.rotation += 0.16 * direction
		var bounds = _scene.get_viewport_rect()
		if _sprite.position.x < bounds.position.x - 60 or _sprite.position.x > bounds.end.x + 60:
			_destroy(); return
		for e in enemies:
			if not is_instance_valid(e) or e.is_dead: continue
			if _sprite.position.distance_to(e.global_position) < e.e_w:
				var kdir = 1 if _sprite.position.x < e.global_position.x else -1
				e.received_hit(damage, kdir)
				_destroy(); return

	func _destroy() -> void:
		finished = true
		if is_instance_valid(_sprite):
			var burst = ColorRect.new()
			burst.color = Color(1, 0.93, 0.33, 0.85)
			burst.size = Vector2(20, 20)
			burst.position = _sprite.position - Vector2(10, 10)
			burst.z_index = 9
			_scene.add_child(burst)
			var tw = burst.create_tween()
			tw.parallel().tween_property(burst, "modulate:a", 0.0, 0.19)
			tw.parallel().tween_property(burst, "scale", Vector2(2.8, 2.8), 0.19)
			tw.tween_callback(burst.queue_free)
			_sprite.queue_free()

	func _make_tex() -> ImageTexture:
		var img = Image.create(16, 16, false, Image.FORMAT_RGBA8)
		for px in range(6, 10):
			for py in range(0, 16): img.set_pixel(px, py, Color(1, 0.93, 0.33))
		for px in range(0, 16):
			for py in range(6, 10): img.set_pixel(px, py, Color(1, 0.93, 0.33))
		for px in range(6, 10):
			for py in range(6, 10): img.set_pixel(px, py, Color(1,1,1))
		return ImageTexture.create_from_image(img)
