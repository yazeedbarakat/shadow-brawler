extends "res://scripts/LevelBase.gd"

func _get_bg_path()          -> String: return "res://assets/backgrounds/level1.webp"
func _get_bg_fallback_color()-> Color:  return Color(0.07, 0.07, 0.12)
func _get_next_scene()       -> String: return "res://scenes/Level2.tscn"
func _get_level_name()       -> String: return "Level1Scene"
func _get_weather_type()     -> String: return "leaves"
func _get_boss_name()        -> String: return "CRIMSON WARRIOR"
func _get_ground_y()         -> float:  return 328.0

func _spawn_enemies() -> void:
	var gy = _get_ground_y()
	var BossScript = load("res://scripts/Boss.gd")
	var boss : CharacterBody2D = CharacterBody2D.new()
	boss.set_script(BossScript)
	boss.position = Vector2(620, gy - 80)
	boss.z_index  = 4
	add_child(boss)
	boss.connect("enemy_died", _on_enemy_died)
	enemies.append(boss)
	_wire_contact(boss)
