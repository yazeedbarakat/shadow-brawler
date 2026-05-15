extends CharacterBody2D

# ── Signals ────────────────────────────────────────────────────────────────────
signal player_dead
signal combo_hit
signal combo_reset
signal player_attack(data: Dictionary)
signal player_throw(data: Dictionary)
signal weapon_changed(type: String)
signal armor_equipped(data: Dictionary)
signal armor_hit(data: Dictionary)
signal armor_broken
signal armor_refilled(data: Dictionary)

# ── Constants ──────────────────────────────────────────────────────────────────
const GRAVITY      := 700.0
const SPEED        := 210.0
const RUN_SPEED    := 330.0
const JUMP_FORCE   := 520.0
const FRAME_W      := 120   # samurai sprite sheet frame size
const FRAME_H      := 140
const SPRITE_SCALE := 0.6

# Attack definitions (times in seconds)
const ATTACKS := {
	"ATTACK_1":     {anim="attack1",      hit_w=52, hit_h=28, hit_ox=44, dur=0.340, start=0.060, active=0.140, dmg=22, chain="ATTACK_2",  chain_t=0.190},
	"ATTACK_2":     {anim="attack2",      hit_w=58, hit_h=30, hit_ox=48, dur=0.360, start=0.055, active=0.160, dmg=28, chain="ATTACK_3",  chain_t=0.200},
	"ATTACK_3":     {anim="attack3",      hit_w=82, hit_h=42, hit_ox=58, dur=0.380, start=0.070, active=0.200, dmg=45, move_x=150.0},
	"ATTACK_HEAVY": {anim="attack_heavy", hit_w=92, hit_h=46, hit_ox=62, dur=0.700, start=0.190, active=0.270, dmg=65, move_x=90.0},
	"ATTACK_AIR":   {anim="attack_air",   hit_w=64, hit_h=34, hit_ox=50, dur=0.380, start=0.055, active=0.200, dmg=30},
	"ATTACK_DASH":  {anim="attack_dash",  hit_w=90, hit_h=38, hit_ox=64, dur=0.440, start=0.040, active=0.280, dmg=40, move_x=220.0},
}

# ── State ──────────────────────────────────────────────────────────────────────
var health        := 100
var max_health    := 100
var facing        := 1
var state         := ""
var state_timer   := 0.0
var is_attacking  := false
var is_blocking   := false
var dash_invincible  := false
var roll_invincible  := false
var parry_active     := false
var can_counter      := false
var counter_timer    := 0.0
var equipped_weapon  := ""
var hitbox_on        := false
var chain_queued     := false
var hit_offset_x     := 44.0
var cd_dash          := 0.0
var cd_roll          := 0.0
var attack_cfg       : Dictionary
var is_dead          := false

# Nodes
var _sprite    : AnimatedSprite2D
var _hitbox    : Area2D
var _hit_shape : CollisionShape2D
var _cam       : Camera2D
var _after_timer : float = 0.0


func _ready() -> void:
	_setup_collision()
	_sprite = _build_sprite()
	add_child(_sprite)
	_setup_hitbox()
	_transition_to("IDLE")

func _setup_collision() -> void:
	var col = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(28, 44)
	col.shape = rect
	col.position = Vector2(0, 2)
	add_child(col)
	# Layer 2 = player body; mask 1 = platforms
	collision_layer = 2
	collision_mask  = 1

func _build_sprite() -> AnimatedSprite2D:
	var spr = AnimatedSprite2D.new()
	spr.scale = Vector2(SPRITE_SCALE, SPRITE_SCALE)
	spr.position = Vector2(0, 0)
	var frames = SpriteFrames.new()
	frames.remove_animation("default")
	var base = "res://assets/sprites/samurai/"
	# Each file is a horizontal strip: n frames * 100px wide, 120px tall
	var defs := {
		"idle":         {f="idle.png",         n=4,  fps=6.0,  loop=true},
		"walk":         {f="walk.png",         n=4,  fps=9.0,  loop=true},
		"run":          {f="run.png",          n=4,  fps=14.0, loop=true},
		"jump":         {f="jump.png",         n=4,  fps=10.0, loop=false},
		"fall":         {f="fall.png",         n=2,  fps=8.0,  loop=true},
		"land":         {f="land.png",         n=2,  fps=14.0, loop=false},
		"dash":         {f="dash.png",         n=2,  fps=18.0, loop=false},
		"roll":         {f="roll.png",         n=6,  fps=14.0, loop=false},
		"crouch":       {f="crouch.png",       n=1,  fps=6.0,  loop=false},
		"crouch_walk":  {f="crouch_walk.png",  n=1,  fps=8.0,  loop=true},
		"turn":         {f="turn.png",         n=4,  fps=12.0, loop=false},
		"attack1":      {f="attack1.png",      n=3,  fps=14.0, loop=false},
		"attack2":      {f="attack2.png",      n=5,  fps=16.0, loop=false},
		"attack3":      {f="attack3.png",      n=4,  fps=14.0, loop=false},
		"attack_heavy": {f="attack_heavy.png", n=9,  fps=10.0, loop=false},
		"attack_air":   {f="attack_air.png",   n=3,  fps=14.0, loop=false},
		"attack_dash":  {f="attack_dash.png",  n=1,  fps=10.0, loop=false},
		"block":        {f="block.png",        n=1,  fps=8.0,  loop=false},
		"counter":      {f="counter.png",      n=4,  fps=14.0, loop=false},
		"hurt":         {f="hurt.png",         n=2,  fps=10.0, loop=false},
		"dead":         {f="dead.png",         n=3,  fps=8.0,  loop=false},
	}
	for anim_name in defs:
		var d = defs[anim_name]
		var tex = load(base + d["f"])
		if tex == null: continue
		frames.add_animation(anim_name)
		frames.set_animation_speed(anim_name, d["fps"])
		frames.set_animation_loop(anim_name, d["loop"])
		for i in range(d["n"]):
			var atlas = AtlasTexture.new()
			atlas.atlas = tex
			atlas.region = Rect2(i * FRAME_W, 0, FRAME_W, FRAME_H)
			frames.add_frame(anim_name, atlas)
	spr.sprite_frames = frames
	return spr

func _setup_hitbox() -> void:
	_hitbox = Area2D.new()
	_hitbox.name = "AttackHitbox"
	_hitbox.collision_layer = 0
	_hitbox.collision_mask  = 4  # enemies on layer 3 (bit 3 = 4)
	_hitbox.monitoring = false
	add_child(_hitbox)
	_hit_shape = CollisionShape2D.new()
	var rect = RectangleShape2D.new()
	rect.size = Vector2(48, 24)
	_hit_shape.shape = rect
	_hit_shape.disabled = true
	_hitbox.add_child(_hit_shape)

# ── Input helpers ──────────────────────────────────────────────────────────────
func _jp_action(action: String) -> bool:
	return Input.is_action_just_pressed(action)

# ── Physics process ────────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	if is_dead: return

	# Tick cooldowns
	if cd_dash > 0: cd_dash = max(0.0, cd_dash - delta)
	if cd_roll > 0: cd_roll = max(0.0, cd_roll - delta)
	if counter_timer > 0:
		counter_timer = max(0.0, counter_timer - delta)
		if counter_timer <= 0: can_counter = false

	# Gravity
	if not is_on_floor():
		velocity.y += GRAVITY * delta
	else:
		velocity.y = min(velocity.y, 0.0)  # clear any downward accumulation; allow jump upswing

	# Afterimage timer
	if _after_timer > 0:
		_after_timer -= delta
		if _after_timer <= 0:
			_after_timer = 0.045
			_spawn_afterimage()

	state_timer += delta
	_update_state(delta)

	_sprite.flip_h = (facing == -1)
	_sync_hitbox()
	move_and_slide()

# ── State machine dispatch ─────────────────────────────────────────────────────
func _transition_to(new_state: String) -> void:
	if new_state == state: return
	_exit_state(state)
	state = new_state
	state_timer = 0.0
	_enter_state(state)

func _enter_state(s: String) -> void:
	match s:
		"IDLE":
			velocity.x = 0.0
			_play("idle")
		"WALK":
			_play("walk")
		"RUN":
			_play("run")
		"JUMP":
			velocity.y = -JUMP_FORCE
			_play("jump")
		"FALL":
			_play("fall")
		"LAND":
			_play("land")
			velocity.x = 0.0
		"DASH":
			_play("dash")
			dash_invincible = true
			velocity.x = facing * 520.0
			_after_timer = 0.001  # start afterimage loop
		"ROLL":
			_play("roll")
			roll_invincible = true
			velocity.x = facing * 340.0
			_set_crouch_shape(true)
		"CROUCH":
			velocity.x = 0.0
			_play("crouch")
			_set_crouch_shape(true)
		"CROUCH_WALK":
			_play("crouch_walk")
			_set_crouch_shape(true)
		"BLOCK":
			_play("block")
			velocity.x = 0.0
			is_blocking = true
			parry_active = true
		"COUNTER":
			_play("counter")
			can_counter = false
			velocity.x = facing * 200.0
			_set_hitbox(90, 42, 58)
		"HIT":
			_play("hurt")
			_sprite.modulate = Color(1, 1, 1)
			get_tree().create_timer(0.08).timeout.connect(func(): if not is_dead: _sprite.modulate = Color(1, 0.07, 0.07))
			velocity.x = -facing * 170.0
			combo_reset.emit()
		"DEAD":
			is_dead = true
			is_attacking = false
			_hitbox.monitoring = false
			_hit_shape.disabled = true
			_play("dead")
			_sprite.modulate = Color(0.53, 0.53, 0.53)
			velocity.x = 0.0
			combo_reset.emit()
			get_tree().create_timer(0.86).timeout.connect(func(): player_dead.emit())
		_:
			if s in ATTACKS:
				var cfg = ATTACKS[s]
				attack_cfg = cfg
				hitbox_on = false
				chain_queued = false
				is_attacking = false
				velocity.x = cfg.get("move_x", 0.0) * facing if "move_x" in cfg else 0.0
				_play(cfg["anim"])
				_set_hitbox(cfg["hit_w"], cfg["hit_h"], cfg["hit_ox"])

func _exit_state(s: String) -> void:
	match s:
		"WALK", "RUN", "CROUCH_WALK":
			velocity.x = 0.0
		"DASH":
			dash_invincible = false
			_after_timer = 0.0
			velocity.x = 0.0
			cd_dash = 0.8
		"ROLL":
			roll_invincible = false
			velocity.x = 0.0
			_set_crouch_shape(false)
			cd_roll = 0.6
		"CROUCH":
			_set_crouch_shape(false)
		"BLOCK":
			is_blocking = false
			parry_active = false
		"HIT":
			_sprite.modulate = Color.WHITE
		_:
			if s in ATTACKS:
				hitbox_on = false
				is_attacking = false
				_hitbox.monitoring = false
				_hit_shape.disabled = true
				velocity.x = 0.0

func _update_state(delta: float) -> void:
	var s = state
	match s:
		"IDLE":
			if not is_on_floor():          _transition_to("FALL");  return
			if _try_block(): return
			if _try_roll():  return
			if _try_dash():  return
			if _try_attack(): return
			if _jp_action("jump"):         _transition_to("JUMP");  return
			if Input.is_action_pressed("move_down"): _transition_to("CROUCH"); return
			if _moving_h():
				_transition_to("RUN" if Input.is_action_pressed("run") else "WALK")
		"WALK":
			if not is_on_floor():          _transition_to("FALL");  return
			if _try_block(): return
			if _try_roll():  return
			if _try_dash():  return
			if _try_attack(): return
			if _jp_action("jump"):         _transition_to("JUMP");  return
			if Input.is_action_pressed("move_down"): _transition_to("CROUCH_WALK"); return
			if Input.is_action_pressed("run") and _moving_h(): _transition_to("RUN"); return
			if Input.is_action_pressed("move_left"):  velocity.x = -SPEED;    facing = -1
			elif Input.is_action_pressed("move_right"): velocity.x =  SPEED;  facing =  1
			else: _transition_to("IDLE")
		"RUN":
			if not is_on_floor():          _transition_to("FALL");  return
			if _try_dash():  return
			if _try_attack(): return
			if _jp_action("jump"):         _transition_to("JUMP");  return
			if not Input.is_action_pressed("run"): _transition_to("WALK"); return
			if Input.is_action_pressed("move_left"):  velocity.x = -RUN_SPEED; facing = -1
			elif Input.is_action_pressed("move_right"): velocity.x =  RUN_SPEED; facing = 1
			else: _transition_to("IDLE")
		"CROUCH":
			if not Input.is_action_pressed("move_down"): _transition_to("IDLE"); return
			if _try_roll(): return
			if _moving_h(): _transition_to("CROUCH_WALK")
		"CROUCH_WALK":
			if not Input.is_action_pressed("move_down"): _transition_to("IDLE"); return
			if _try_roll(): return
			if Input.is_action_pressed("move_left"):  velocity.x = -SPEED * 0.5; facing = -1
			elif Input.is_action_pressed("move_right"): velocity.x = SPEED * 0.5; facing = 1
			else: _transition_to("CROUCH")
		"JUMP":
			_air_move()
			if _try_air_attack(): return
			if velocity.y >= 40: _transition_to("FALL")
		"FALL":
			_air_move()
			if _try_air_attack(): return
			if is_on_floor(): _transition_to("LAND")
		"LAND":
			if state_timer >= 0.18:
				_transition_to("WALK" if _moving_h() else "IDLE")
		"DASH":
			if state_timer > 0.16: dash_invincible = false
			if _jp_action("attack_light"): _transition_to("ATTACK_DASH"); return
			var ratio = max(0.0, 1.0 - state_timer / 0.38)
			velocity.x = facing * 520.0 * ratio
			if state_timer >= 0.38:
				_transition_to("IDLE" if is_on_floor() else "FALL")
		"ROLL":
			if state_timer > 0.2: roll_invincible = false
			var ratio = max(0.0, 1.0 - state_timer / 0.42)
			velocity.x = facing * 340.0 * ratio
			if state_timer >= 0.42 and is_on_floor():
				_transition_to("IDLE")
		"BLOCK":
			if state_timer > 0.22: parry_active = false
			if can_counter and _jp_action("attack_light"): _transition_to("COUNTER"); return
			if not Input.is_action_pressed("block"): _transition_to("IDLE")
		"COUNTER":
			var ratio = max(0.0, 1.0 - state_timer / 0.28)
			velocity.x = facing * 200.0 * ratio
			_update_attack_hitbox("COUNTER", 70.0/1000.0, 370.0/1000.0, 75)
			if state_timer >= 0.54: _transition_to("IDLE")
		"HIT":
			if state_timer >= 0.46:
				_transition_to("IDLE" if is_on_floor() else "FALL")
		"DEAD":
			pass
		_:
			if s in ATTACKS:
				_update_attack_state(s, delta)

func _update_attack_state(s: String, _delta: float) -> void:
	var cfg = ATTACKS[s]
	var startup = cfg["start"]
	var active  = cfg["active"]
	var dur     = cfg["dur"]
	var in_active = state_timer >= startup and state_timer < startup + active
	if in_active and not hitbox_on:
		hitbox_on = true
		is_attacking = true
		_hitbox.monitoring = true
		_hit_shape.disabled = false
		player_attack.emit({"x": _hitbox.global_position.x, "y": _hitbox.global_position.y,
			"w": cfg["hit_w"], "h": cfg["hit_h"], "attack_type": s, "damage": cfg["dmg"]})
	elif not in_active and hitbox_on:
		hitbox_on = false
		is_attacking = false
		_hitbox.monitoring = false
		_hit_shape.disabled = true
	if "chain" in cfg and "chain_t" in cfg and state_timer >= cfg["chain_t"]:
		if _jp_action("attack_light"): chain_queued = true
	if "move_x" in cfg:
		var ratio = max(0.0, 1.0 - state_timer / (dur * 0.5))
		velocity.x = facing * cfg["move_x"] * ratio
	if state_timer >= dur:
		if chain_queued and "chain" in cfg: _transition_to(cfg["chain"])
		else: _transition_to("IDLE" if is_on_floor() else "FALL")

func _update_attack_hitbox(name: String, t_start: float, t_end: float, dmg: int) -> void:
	if state_timer >= t_start and state_timer < t_end and not hitbox_on:
		hitbox_on = true
		is_attacking = true
		_hitbox.monitoring = true
		_hit_shape.disabled = false
		player_attack.emit({"x": _hitbox.global_position.x, "y": _hitbox.global_position.y,
			"w": 90, "h": 42, "attack_type": name, "damage": dmg})
	elif (state_timer >= t_end or state_timer < t_start) and hitbox_on:
		hitbox_on = false
		is_attacking = false
		_hitbox.monitoring = false
		_hit_shape.disabled = true

# ── Sub-helpers ────────────────────────────────────────────────────────────────
func _grounded() -> bool: return is_on_floor()
func _moving_h()  -> bool:
	return Input.is_action_pressed("move_left") or Input.is_action_pressed("move_right")

func _air_move() -> void:
	if Input.is_action_pressed("move_left"):  velocity.x = -SPEED * 0.8; facing = -1
	elif Input.is_action_pressed("move_right"): velocity.x = SPEED * 0.8; facing = 1

func _try_dash() -> bool:
	if not _jp_action("dash_roll"): return false
	if cd_dash > 0: return false
	if Input.is_action_pressed("move_down"): return false
	var s = state
	if s in ["DEAD","HIT","DASH","ROLL"] or s in ATTACKS: return false
	_transition_to("DASH")
	return true

func _try_roll() -> bool:
	if not _jp_action("dash_roll"): return false
	if not Input.is_action_pressed("move_down"): return false
	if cd_roll > 0: return false
	if state in ["DEAD","HIT","ROLL"]: return false
	_transition_to("ROLL")
	return true

func _try_block() -> bool:
	if not _jp_action("block"): return false
	if state in ["DEAD","HIT","BLOCK"] or not is_on_floor(): return false
	_transition_to("BLOCK")
	return true

func _try_attack() -> bool:
	var s = state
	if s in ["HIT","DEAD","BLOCK","COUNTER","ROLL"] or s in ATTACKS: return false
	if _jp_action("attack_light"):
		if equipped_weapon == "throwingstar":
			player_throw.emit({"x": global_position.x, "y": global_position.y, "facing": facing})
			return true
		_transition_to("ATTACK_1")
		return true
	if _jp_action("attack_heavy"):
		_transition_to("ATTACK_HEAVY")
		return true
	return false

func _try_air_attack() -> bool:
	if state in ["ATTACK_AIR","DEAD","HIT"]: return false
	if _jp_action("attack_light"):
		if equipped_weapon == "throwingstar":
			player_throw.emit({"x": global_position.x, "y": global_position.y, "facing": facing})
			return true
		_transition_to("ATTACK_AIR")
		return true
	if _jp_action("attack_heavy"):
		_transition_to("ATTACK_HEAVY")
		return true
	return false

func _set_hitbox(w: float, h: float, ox: float) -> void:
	hit_offset_x = ox
	var rect = _hit_shape.shape as RectangleShape2D
	if rect: rect.size = Vector2(w, h)
	_hitbox.position = Vector2(ox * facing, 0)

func _sync_hitbox() -> void:
	_hitbox.position.x = hit_offset_x * facing
	_hitbox.position.y = 0

func _set_crouch_shape(crouching: bool) -> void:
	for c in get_children():
		if c is CollisionShape2D and c != _hit_shape:
			var rect = c.shape as RectangleShape2D
			if rect:
				if crouching: rect.size = Vector2(28, 30); c.position.y = 10
				else:          rect.size = Vector2(28, 44); c.position.y = 2

func _play(anim: String) -> void:
	_sprite.modulate.a = 1.0
	if _sprite.sprite_frames and _sprite.sprite_frames.has_animation(anim):
		_sprite.play(anim)

func _spawn_afterimage() -> void:
	if not _sprite.visible: return
	var ghost = Sprite2D.new()
	ghost.texture = _sprite.sprite_frames.get_frame_texture(_sprite.animation, _sprite.frame)
	ghost.scale = _sprite.scale
	ghost.flip_h = _sprite.flip_h
	ghost.position = global_position
	ghost.modulate = Color(0.8, 0.27, 0.0, 0.45)
	ghost.z_index = z_index - 1
	get_parent().add_child(ghost)
	var tw = ghost.create_tween()
	tw.tween_property(ghost, "modulate:a", 0.0, 0.21)
	tw.tween_callback(ghost.queue_free)
	_after_timer = 0.045

# ── Public API ─────────────────────────────────────────────────────────────────
func take_damage(raw_amount: int) -> bool:
	if is_dead: return false
	if state == "HIT": return false
	if dash_invincible: return false
	if roll_invincible: return false

	if state == "BLOCK":
		if parry_active:
			can_counter = true
			counter_timer = 0.7
			get_viewport().get_camera_2d()
			_sprite.modulate = Color.WHITE
			get_tree().create_timer(0.12).timeout.connect(func(): _sprite.modulate = Color.WHITE)
			combo_reset.emit()
			return false
		# Normal block — 35% damage
		var dmg = max(1, int(raw_amount * 0.35))
		health = max(0, health - dmg)
		return false

	health = max(0, health - raw_amount)
	if health <= 0:
		_transition_to("DEAD")
		return true
	_transition_to("HIT")
	return false

func equip_weapon(type: String) -> void:
	equipped_weapon = type
	weapon_changed.emit(type)

func unequip_weapon() -> String:
	var had = equipped_weapon
	equipped_weapon = ""
	weapon_changed.emit("")
	return had
