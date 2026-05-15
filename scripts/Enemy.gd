extends CharacterBody2D

signal enemy_died

# ── Config ─────────────────────────────────────────────────────────────────────
@export var e_health         := 60
@export var e_speed          := 80.0
@export var e_chase_speed    := 116.0
@export var e_contact_damage := 10
@export var e_attack_rate    := 1.4
@export var e_detection_range := 240.0
@export var e_give_up_range  := 420.0
@export var e_knockback_speed := 280.0
@export var e_color          := Color(1, 1, 1)   # modulate tint on knight sprite
@export var e_w              := 36.0             # logical hitbox width
@export var e_h              := 52.0             # logical hitbox height

const GRAVITY    := 700.0
const FRAME_W    := 120
const FRAME_H    := 80
const SPRITE_SCALE := 0.9   # slightly smaller than player

# ── Runtime ────────────────────────────────────────────────────────────────────
var health      : int
var max_health  : int
var state       := "PATROL"
var state_timer := 0.0
var patrol_dir  := 1
var attack_cooldown := 0.0
var is_dead     := false
var patrol_timer    := 0.0
var patrol_duration := 2.5
var player_ref      = null

var _sprite       : AnimatedSprite2D
var _contact_area : Area2D

func _ready() -> void:
	health     = e_health
	max_health = e_health
	patrol_dir = 1 if randf() > 0.5 else -1
	patrol_duration = 2.0 + randf() * 1.2
	_build_sprite()
	_build_collision()
	_build_contact_area()
	collision_layer = 4
	collision_mask  = 1

func _build_sprite() -> void:
	_sprite = AnimatedSprite2D.new()
	_sprite.scale = Vector2(SPRITE_SCALE, SPRITE_SCALE)
	_sprite.modulate = e_color

	var frames = SpriteFrames.new()
	frames.remove_animation("default")
	var base = "res://assets/sprites/knight2/"

	var defs := {
		"idle": {f="_Idle.png", n=10, fps=8.0,  loop=true},
		"walk": {f="_Run.png",  n=10, fps=10.0, loop=true},
		"run":  {f="_Run.png",  n=10, fps=16.0, loop=true},
		"hurt": {f="_Hit.png",  n=1,  fps=8.0,  loop=false},
		"dead": {f="_Death.png",n=10, fps=12.0, loop=false},
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
	add_child(_sprite)
	_sprite.play("idle")

func _build_collision() -> void:
	var col  = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size   = Vector2(e_w, e_h)
	col.shape   = rect
	col.position = Vector2(0, 4)
	add_child(col)

func _build_contact_area() -> void:
	_contact_area = Area2D.new()
	_contact_area.collision_layer = 0
	_contact_area.collision_mask  = 2
	_contact_area.monitoring = true
	var col  = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(e_w - 2, e_h - 2)
	col.shape = rect
	col.position = Vector2(0, 4)
	_contact_area.add_child(col)
	add_child(_contact_area)

# ── Physics ────────────────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	if is_dead: return
	if attack_cooldown > 0: attack_cooldown -= delta
	if not is_on_floor():
		velocity.y += GRAVITY * delta
	else:
		velocity.y = min(velocity.y, 0.0)
	state_timer += delta
	_update_state(delta)
	move_and_slide()
	var vr = get_viewport_rect()
	global_position.x = clamp(global_position.x, vr.position.x + e_w * 0.5, vr.end.x - e_w * 0.5)

func _update_state(_delta: float) -> void:
	match state:
		"PATROL":
			patrol_timer += _delta
			if patrol_timer >= patrol_duration or is_on_wall():
				patrol_dir *= -1
				patrol_timer = 0.0
				patrol_duration = 2.0 + randf() * 1.2
			velocity.x = patrol_dir * e_speed * 0.5
			_sprite.flip_h = patrol_dir == -1
			_play("walk")
			if player_ref and _dist() <= e_detection_range:
				_enter_state("CHASE")
		"CHASE":
			if player_ref == null or player_ref.is_dead or _dist() > e_give_up_range:
				_enter_state("PATROL"); return
			var dir = sign(player_ref.global_position.x - global_position.x)
			velocity.x = dir * e_chase_speed
			_sprite.flip_h = dir == -1
			_play("run")
		"HIT":
			if state_timer >= 0.36:
				_enter_state("CHASE" if (player_ref and _dist() <= e_detection_range) else "PATROL")
		"DEAD":
			pass

func _enter_state(s: String) -> void:
	state = s
	state_timer = 0.0

func _dist() -> float:
	return global_position.distance_to(player_ref.global_position) if player_ref else INF

func _play(anim: String) -> void:
	if _sprite.sprite_frames and _sprite.sprite_frames.has_animation(anim):
		if _sprite.animation != anim:
			_sprite.play(anim)

# ── Public API ─────────────────────────────────────────────────────────────────
func received_hit(amount: int, knock_dir: int) -> void:
	if state == "DEAD" or state == "HIT": return
	health = max(0, health - amount)
	if health <= 0:
		_die()
	else:
		_enter_state("HIT")
		_play("hurt")
		velocity.x = knock_dir * e_knockback_speed
		if is_on_floor(): velocity.y = -160.0
		_sprite.modulate = Color.WHITE
		get_tree().create_timer(0.08).timeout.connect(
			func(): if not is_dead: _sprite.modulate = e_color)

func _die() -> void:
	is_dead = true
	_enter_state("DEAD")
	set_physics_process(false)
	_contact_area.monitoring = false
	for c in get_children():
		if c is CollisionShape2D: c.call_deferred("set_disabled", true)
	velocity = Vector2.ZERO
	_play("dead")
	var tw = create_tween()
	tw.tween_interval(0.7)
	tw.parallel().tween_property(self, "modulate:a", 0.0, 0.5)
	tw.tween_callback(func(): enemy_died.emit(); queue_free())

func get_contact_area() -> Area2D:
	return _contact_area
