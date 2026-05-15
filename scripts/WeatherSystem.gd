extends Node2D

func _init_type(type: String) -> void:
	match type:
		"rain":   _rain()
		"snow":   _snow()
		"leaves": _leaves()
		"embers": _embers()
		"ash":    _ash()

func _make_particles(cfg: Dictionary) -> CPUParticles2D:
	var p = CPUParticles2D.new()
	p.emitting = true
	p.amount = cfg.get("amount", 40)
	p.lifetime = cfg.get("lifetime", 1.0)
	p.lifetime_randomness = cfg.get("lifetime_rand", 0.3)
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = cfg.get("emit_rect", Vector2(400, 1))
	p.position = cfg.get("pos", Vector2(400, -10))
	p.direction = cfg.get("dir", Vector2(0, 1))
	p.spread = cfg.get("spread", 5.0)
	p.initial_velocity_min = cfg.get("vel_min", 50.0)
	p.initial_velocity_max = cfg.get("vel_max", 120.0)
	p.scale_amount_min = cfg.get("scale_min", 0.5)
	p.scale_amount_max = cfg.get("scale_max", 1.5)
	p.color = cfg.get("color", Color.WHITE)
	p.z_index = cfg.get("z", 18)
	if "gravity" in cfg: p.gravity = cfg["gravity"]
	add_child(p)
	return p

func _rain() -> void:
	_make_particles({
		amount=80, lifetime=0.52, lifetime_rand=0.2,
		emit_rect=Vector2(440, 1), pos=Vector2(400, -20),
		dir=Vector2(0.15, 1), spread=3.0,
		vel_min=600.0, vel_max=900.0,
		scale_min=0.5, scale_max=1.2,
		color=Color(0.67, 0.8, 1, 0.6),
		gravity=Vector2.ZERO, z=18
	})
	_make_particles({
		amount=30, lifetime=0.7, lifetime_rand=0.3,
		emit_rect=Vector2(440, 1), pos=Vector2(400, -10),
		dir=Vector2(0.1, 1), spread=4.0,
		vel_min=350.0, vel_max=550.0,
		scale_min=0.3, scale_max=0.7,
		color=Color(0.6, 0.73, 0.87, 0.3),
		gravity=Vector2.ZERO, z=17
	})

func _snow() -> void:
	_make_particles({
		amount=25, lifetime=6.0, lifetime_rand=0.4,
		emit_rect=Vector2(440, 1), pos=Vector2(400, -10),
		dir=Vector2(0, 1), spread=20.0,
		vel_min=30.0, vel_max=65.0,
		scale_min=0.6, scale_max=1.2,
		color=Color.WHITE,
		gravity=Vector2(0, 5), z=18
	})
	_make_particles({
		amount=15, lifetime=8.0, lifetime_rand=0.5,
		emit_rect=Vector2(460, 1), pos=Vector2(400, -10),
		dir=Vector2(0, 1), spread=30.0,
		vel_min=18.0, vel_max=45.0,
		scale_min=0.4, scale_max=0.9,
		color=Color(0.93, 0.93, 1, 0.55),
		gravity=Vector2(0, 3), z=17
	})

func _leaves() -> void:
	_make_particles({
		amount=20, lifetime=7.0, lifetime_rand=0.4,
		emit_rect=Vector2(460, 1), pos=Vector2(400, -10),
		dir=Vector2(0.5, 1), spread=25.0,
		vel_min=30.0, vel_max=80.0,
		scale_min=0.8, scale_max=1.5,
		color=Color(0.8, 0.1, 0.1, 0.9),
		gravity=Vector2(0, 8), z=18
	})
	_make_particles({
		amount=12, lifetime=9.0, lifetime_rand=0.5,
		emit_rect=Vector2(440, 1), pos=Vector2(400, -10),
		dir=Vector2(0.3, 1), spread=20.0,
		vel_min=18.0, vel_max=50.0,
		scale_min=0.6, scale_max=1.3,
		color=Color(1, 0.33, 0, 0.75),
		gravity=Vector2(0, 5), z=17
	})

func _embers() -> void:
	_make_particles({
		amount=30, lifetime=2.5, lifetime_rand=0.4,
		emit_rect=Vector2(440, 1), 
		pos=Vector2(400, 460),
		dir=Vector2(0, -1), spread=35.0,
		vel_min=60.0, vel_max=160.0,
		scale_min=0.8, scale_max=1.4,
		color=Color(1, 0.47, 0),
		gravity=Vector2(0, -20), z=18
	})
	_make_particles({
		amount=15, lifetime=1.2, lifetime_rand=0.5,
		emit_rect=Vector2(440, 1), pos=Vector2(400, 400),
		dir=Vector2(0, -1), spread=50.0,
		vel_min=100.0, vel_max=220.0,
		scale_min=0.6, scale_max=1.0,
		color=Color(1, 0.93, 0.27),
		gravity=Vector2(0, -40), z=19
	})

func _ash() -> void:
	_make_particles({
		amount=20, lifetime=4.5, lifetime_rand=0.4,
		emit_rect=Vector2(440, 1), pos=Vector2(400, -10),
		dir=Vector2(0, 1), spread=20.0,
		vel_min=20.0, vel_max=60.0,
		scale_min=0.8, scale_max=1.4,
		color=Color(0.67, 0.4, 1, 0.85),
		gravity=Vector2(0, 5), z=18
	})
	_make_particles({
		amount=12, lifetime=6.0, lifetime_rand=0.5,
		emit_rect=Vector2(440, 1), pos=Vector2(400, -5),
		dir=Vector2(0, 1), spread=15.0,
		vel_min=12.0, vel_max=40.0,
		scale_min=0.5, scale_max=1.0,
		color=Color(0.33, 0.2, 0.4, 0.65),
		gravity=Vector2(0, 3), z=17
	})
