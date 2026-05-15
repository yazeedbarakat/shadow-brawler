extends CharacterBody2D

signal enemy_died

# ── Config ─────────────────────────────────────────────────────────────────────
@export var e_health         := 600
@export var e_speed          := 60.0
@export var e_contact_damage := 18
@export var e_attack_rate    := 1.2
@export var e_detection_range := 800.0
@export var e_w              := 46.0
@export var e_h              := 65.0

const GRAVITY      := 700.0
const FRAME_W      := 130
const FRAME_H      := 150
const SPRITE_SCALE := 0.65

# Phase 2 multipliers (triggered below 50% HP)
const P2_SPEED_MULT   := 1.55
const P2_DAMAGE_MULT  := 1.4
const INFERNO_COOLDOWN_P1 := 12.0
const INFERNO_COOLDOWN_P2 := 6.0

# ── Runtime ────────────────────────────────────────────────────────────────────
var health      : int
var max_health  : int
var state       := "IDLE"
var state_timer := 0.0
var is_dead     := false
var facing      := -1   # boss starts facing left (toward player)
var phase       := 1
var enrage_done := false
var attack_cooldown    := 0.0
var inferno_cooldown   := 0.0
var combo_step         := 0      # which hit in the current combo
var combo_queued       := false
var player_ref         = null
var _is_attacking      := false

var _sprite       : AnimatedSprite2D
var _hit_area     : Area2D       # attack hitbox
var _contact_area : Area2D       # body contact damage
var _inferno_zone = null         # persistent fire zone node
var _attack_damage := 0
var _hit_shape    : CollisionShape2D

# Inferno floor hazard
var _inferno_fires : Array = []   # Array of {node, timer} dicts
var _inferno_tick_interval := 0.5

func _ready() -> void:
	health = e_health; max_health = e_health
	_build_sprite()
	_build_collision()
	_build_attack_area()
	_build_contact_area()
	collision_layer = 4
	collision_mask  = 1
	_play("idle")

# ── Sprite ─────────────────────────────────────────────────────────────────────
func _build_sprite() -> void:
	_sprite = AnimatedSprite2D.new()
	_sprite.scale = Vector2(SPRITE_SCALE, SPRITE_SCALE)
	var frames = SpriteFrames.new()
	frames.remove_animation("default")
	var base = "res://assets/sprites/golem/"
	var defs := {
		"idle":         {f="idle.png",         n=4, fps=5.0,  loop=true},
		"walk":         {f="walk.png",         n=4, fps=8.0,  loop=true},
		"attack1":      {f="attack1.png",      n=4, fps=14.0, loop=false},
		"attack2":      {f="attack2.png",      n=8, fps=16.0, loop=false},
		"attack_heavy": {f="attack_heavy.png", n=5, fps=10.0, loop=false},
		"attack3":      {f="attack3.png",      n=8, fps=12.0, loop=false},
		"hurt":         {f="hurt.png",         n=2, fps=10.0, loop=false},
		"dead":         {f="dead.png",         n=7, fps=10.0, loop=false},
	}
	for anim in defs:
		var d = defs[anim]
		var tex = load(base + d["f"])
		if tex == null: continue
		frames.add_animation(anim)
		frames.set_animation_speed(anim, d["fps"])
		frames.set_animation_loop(anim, d["loop"])
		for i in range(d["n"]):
			var atlas = AtlasTexture.new()
			atlas.atlas = tex
			atlas.region = Rect2(i * FRAME_W, 0, FRAME_W, FRAME_H)
			frames.add_frame(anim, atlas)
	_sprite.sprite_frames = frames
	_sprite.animation_finished.connect(_on_animation_finished)
	add_child(_sprite)

func _build_collision() -> void:
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(e_w - 10, e_h - 8)
	col.shape = rect; col.position = Vector2(0, 6)
	add_child(col)

func _build_attack_area() -> void:
	_hit_area = Area2D.new()
	_hit_area.collision_layer = 0
	_hit_area.collision_mask  = 2   # detects player
	_hit_area.monitoring = false
	_hit_shape = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(130, 70)
	_hit_shape.shape = rect
	_hit_shape.disabled = true
	_hit_area.add_child(_hit_shape)
	add_child(_hit_area)
	_hit_area.body_entered.connect(_on_hit_area_body)

func _build_contact_area() -> void:
	_contact_area = Area2D.new()
	_contact_area.collision_layer = 0
	_contact_area.collision_mask  = 2
	_contact_area.monitoring = true
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(e_w - 4, e_h - 4)
	col.shape = rect; col.position = Vector2(0, 4)
	_contact_area.add_child(col)
	add_child(_contact_area)

# ── Physics ────────────────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	if is_dead: return
	if not is_on_floor():
		velocity.y += GRAVITY * delta
	else:
		velocity.y = min(velocity.y, 0.0)
	if attack_cooldown > 0:  attack_cooldown  -= delta
	if inferno_cooldown > 0: inferno_cooldown -= delta
	state_timer += delta
	_update_state(delta)
	_sprite.flip_h = (facing == 1)
	_sync_hit_area()
	move_and_slide()
	# Clamp to world bounds
	var vr = get_viewport_rect()
	global_position.x = clamp(global_position.x, vr.position.x + e_w*0.5, vr.end.x - e_w*0.5)
	# Tick inferno fires without recursive timers
	_tick_inferno_fires(delta)

func _sync_hit_area() -> void:
	_hit_area.position = Vector2(facing * -80, -10)

# ── State machine ──────────────────────────────────────────────────────────────
func _enter_state(s: String) -> void:
	state = s; state_timer = 0.0
	match s:
		"IDLE":
			velocity.x = 0.0
			_play("idle")
		"PATROL":
			_play("walk")
		"CHASE":
			_play("walk")
		"ATTACK_1":
			velocity.x = 0.0
			_attack_damage = int(e_contact_damage * 1.6)
			_play("attack1")
			_is_attacking = true
		"ATTACK_COMBO":
			velocity.x = 0.0
			_attack_damage = int(e_contact_damage * (P2_DAMAGE_MULT if phase==2 else 1.0))
			_play("attack2")
			_is_attacking = true
		"ATTACK_INFERNO":
			velocity.x = 0.0
			_attack_damage = int(e_contact_damage * 2.2)
			_play("attack3")
			_is_attacking = true
		"ENRAGE":
			velocity.x = 0.0
			_play("hurt")   # use hurt as "roar" placeholder
		"HIT":
			_play("hurt")
		"DEAD":
			is_dead = true
			set_physics_process(false)
			_contact_area.monitoring = false
			_hit_area.monitoring = false
			for c in get_children():
				if c is CollisionShape2D: c.call_deferred("set_disabled", true)
			velocity = Vector2.ZERO
			_play("dead")

func _update_state(_delta: float) -> void:
	match state:
		"IDLE":
			if state_timer > 1.0 and player_ref:
				_enter_state("CHASE")
		"PATROL":
			velocity.x = facing * e_speed * 0.4
			if is_on_wall(): facing *= -1
			if player_ref and _dist() <= e_detection_range:
				_enter_state("CHASE")
		"CHASE":
			if player_ref == null or player_ref.is_dead:
				_enter_state("IDLE"); return
			var dir = sign(player_ref.global_position.x - global_position.x)
			facing = -dir   # face toward player (flip_h logic: facing=1 means flip)
			var spd = e_speed * (P2_SPEED_MULT if phase==2 else 1.0)
			var dist = _dist()
			if dist > 140:
				velocity.x = -dir * spd
			else:
				velocity.x = 0.0
				_try_attack()
		"ATTACK_1", "ATTACK_COMBO", "ATTACK_INFERNO":
			_update_attack()
		"ENRAGE":
			if state_timer >= 1.6:
				phase = 2
				enrage_done = true
				_sprite.modulate = Color(1.3, 0.5, 0.2)  # orange tint in phase 2
				_enter_state("CHASE")
		"HIT":
			if state_timer >= 0.4:
				_enter_state("CHASE")
		"DEAD":
			pass

func _update_attack() -> void:
	# Enable hitbox during active window
	var active_start := 0.15
	var active_end   := 0.45
	if state == "ATTACK_INFERNO":
		active_start = 0.30; active_end = 0.70
	if state_timer >= active_start and state_timer < active_end:
		if not _hit_area.monitoring:
			_hit_area.monitoring = true
			_hit_shape.disabled  = false
			# Inferno stomp: spawn fire on ground
			if state == "ATTACK_INFERNO":
				_spawn_inferno_fire()
	elif _hit_area.monitoring:
		_hit_area.monitoring = false
		_hit_shape.disabled  = true

func _try_attack() -> void:
	if attack_cooldown > 0: return
	# Check phase 2 inferno
	if phase == 2 and inferno_cooldown <= 0 and randf() < 0.35:
		inferno_cooldown = INFERNO_COOLDOWN_P2
		attack_cooldown  = 2.4
		_enter_state("ATTACK_INFERNO")
		return
	# Phase 1 inferno
	if phase == 1 and inferno_cooldown <= 0 and randf() < 0.15:
		inferno_cooldown = INFERNO_COOLDOWN_P1
		attack_cooldown  = 2.4
		_enter_state("ATTACK_INFERNO")
		return
	# Combo or single
	var combo_chance = 0.55 if phase == 2 else 0.35
	if randf() < combo_chance:
		attack_cooldown = 2.0
		_enter_state("ATTACK_COMBO")
	else:
		attack_cooldown = 1.4
		_enter_state("ATTACK_1")

func _on_animation_finished() -> void:
	match state:
		"ATTACK_1", "ATTACK_COMBO", "ATTACK_INFERNO":
			_hit_area.monitoring = false
			_hit_shape.disabled  = true
			_is_attacking = false
			_enter_state("CHASE")
		"HIT":
			_enter_state("CHASE")
		"ENRAGE":
			pass   # handled in _update_state

func _on_hit_area_body(body: Node) -> void:
	if not _is_attacking: return
	if body == player_ref and player_ref != null:
		player_ref.take_damage(_attack_damage)

func _spawn_inferno_fire() -> void:
	if not is_instance_valid(get_parent()): return
	var fire = ColorRect.new()
	fire.color = Color(1.0, 0.4, 0.0, 0.75)
	fire.size  = Vector2(160, 20)
	fire.position = Vector2(global_position.x - 80, global_position.y + e_h * 0.4)
	fire.z_index = 3
	get_parent().add_child(fire)
	var tw = fire.create_tween()
	tw.tween_property(fire, "modulate:a", 0.0, 4.0)
	tw.tween_callback(fire.queue_free)
	_inferno_fires.append({"node": fire, "timer": 0.0})

func _tick_inferno_fires(delta: float) -> void:
	var i := _inferno_fires.size() - 1
	while i >= 0:
		var entry = _inferno_fires[i]
		if not is_instance_valid(entry["node"]):
			_inferno_fires.remove_at(i)
			i -= 1
			continue
		entry["timer"] += delta
		if entry["timer"] >= _inferno_tick_interval:
			entry["timer"] -= _inferno_tick_interval
			if is_instance_valid(player_ref) and not player_ref.is_dead:
				var fire_rect = Rect2(entry["node"].position, entry["node"].size)
				if fire_rect.has_point(player_ref.global_position):
					player_ref.take_damage(8)
		i -= 1

# ── Helpers ────────────────────────────────────────────────────────────────────
func _dist() -> float:
	return global_position.distance_to(player_ref.global_position) if player_ref else INF

func _play(anim: String) -> void:
	if _sprite.sprite_frames and _sprite.sprite_frames.has_animation(anim):
		_sprite.play(anim)

# ── Public API ─────────────────────────────────────────────────────────────────
func received_hit(amount: int, knock_dir: int) -> void:
	if state == "DEAD" or state == "HIT": return
	health = max(0, health - amount)
	velocity.x = knock_dir * 120.0
	# Check enrage trigger
	if health <= max_health / 2 and not enrage_done:
		enrage_done = true   # prevent re-trigger
		_enter_state("ENRAGE")
		_flash_enrage()
		return
	if health <= 0:
		_enter_state("DEAD")
		var tw = create_tween()
		tw.tween_interval(0.9)
		tw.parallel().tween_property(self, "modulate:a", 0.0, 0.6)
		tw.tween_callback(func(): enemy_died.emit(); queue_free())
		return
	_enter_state("HIT")
	_sprite.modulate = Color.WHITE
	var tw = create_tween()
	tw.tween_interval(0.07)
	tw.tween_callback(func():
		if not is_dead: _sprite.modulate = Color(1.3,0.5,0.2) if phase==2 else Color.WHITE)

func _flash_enrage() -> void:
	var tw = create_tween()
	for i in range(4):
		tw.tween_callback(func():
			if not is_dead:
				_sprite.modulate = Color(2.0, 0.6, 0.1) if i % 2 == 0 else Color.WHITE
		)
		tw.tween_interval(0.22)

func get_contact_area() -> Area2D:
	return _contact_area
