extends "res://scripts/LevelBase.gd"

func _get_bg_path()          -> String: return "res://assets/backgrounds/level4.webp"
func _get_bg_fallback_color()-> Color:  return Color(0.1, 0.04, 0.02)
func _get_next_scene()       -> String: return "res://scenes/Level5.tscn"
func _get_level_name()       -> String: return "Level4Scene"
func _get_weather_type()     -> String: return "embers"

func _spawn_enemies() -> void:
	_spawn_enemy(500, 348, {
		health=400, speed=55.0, chase_speed=82.0,
		detection_range=700.0, contact_damage=18,
		knockback_speed=80.0, w=52.0, h=68.0,
		color=Color(0.53, 0.07, 0.07)
	})
	_spawn_enemy(650, 350, {
		health=120, speed=110.0, chase_speed=165.0,
		detection_range=450.0, contact_damage=11,
		knockback_speed=250.0, w=30.0, h=46.0,
		color=Color(0.67, 0.13, 0.0)
	})
	_spawn_enemy(680, 350, {
		health=120, speed=110.0, chase_speed=165.0,
		detection_range=450.0, contact_damage=11,
		knockback_speed=250.0, w=30.0, h=46.0,
		color=Color(0.6, 0.1, 0.0)
	})

# Override to also add a pickup after setup
func _ready() -> void:
	super._ready()
	# Add throwingstar pickup (weapon_sys is available after super._ready)
	_weapon_sys.add_pickup(400.0, 355.0, "throwingstar")
func _get_boss_name() -> String: return "IRON FORTRESS"
