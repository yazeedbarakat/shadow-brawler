extends "res://scripts/LevelBase.gd"

func _get_bg_path()          -> String: return "res://assets/backgrounds/level2.png"
func _get_bg_fallback_color()-> Color:  return Color(0.12, 0.07, 0.03)
func _get_next_scene()       -> String: return "res://scenes/Level3.tscn"
func _get_level_name()       -> String: return "Level2Scene"
func _get_weather_type()     -> String: return "snow"

func _spawn_enemies() -> void:
	_spawn_enemy(550, 350, {
		health=300, speed=72.0, chase_speed=108.0,
		detection_range=700.0, contact_damage=16,
		knockback_speed=110.0, w=46.0, h=62.0,
		color=Color(0.67, 0.33, 0.13)
	})
func _get_boss_name() -> String: return "TEMPLE GUARDIAN"
