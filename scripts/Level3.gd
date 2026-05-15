extends "res://scripts/LevelBase.gd"

func _get_bg_path()          -> String: return "res://assets/backgrounds/level3.webp"
func _get_bg_fallback_color()-> Color:  return Color(0.04, 0.09, 0.04)
func _get_next_scene()       -> String: return "res://scenes/Level4.tscn"
func _get_level_name()       -> String: return "Level3Scene"
func _get_weather_type()     -> String: return "leaves"

func _spawn_enemies() -> void:
	_spawn_enemy(400, 350, {
		health=200, speed=90.0, chase_speed=140.0,
		detection_range=600.0, contact_damage=13,
		knockback_speed=200.0, w=34.0, h=50.0,
		color=Color(0.13, 0.47, 0.13)
	})
	_spawn_enemy(600, 350, {
		health=160, speed=100.0, chase_speed=155.0,
		detection_range=500.0, contact_damage=12,
		knockback_speed=220.0, w=30.0, h=46.0,
		color=Color(0.0, 0.33, 0.0)
	})
func _get_boss_name() -> String: return "FOREST WRAITH"
