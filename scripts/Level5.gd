extends "res://scripts/LevelBase.gd"

func _get_bg_path()          -> String: return "res://assets/backgrounds/level5.webp"
func _get_bg_fallback_color()-> Color:  return Color(0.04, 0.01, 0.06)
func _get_next_scene()       -> String: return "res://scenes/GameOver.tscn"
func _get_level_name()       -> String: return "Level5Scene"
func _get_weather_type()     -> String: return "ash"

func _spawn_enemies() -> void:
	_spawn_enemy(560, 345, {
		health=600, speed=85.0, chase_speed=130.0,
		detection_range=800.0, contact_damage=22,
		knockback_speed=100.0, w=54.0, h=70.0,
		color=Color(0.47, 0.0, 0.67)
	})

func _check_clear() -> void:
	if _done: return
	for e in enemies:
		if is_instance_valid(e) and not e.is_dead: return
	_done = true
	if _music: _music.stop()
	_notice_label.text = "YOU WIN!"
	_notice_label.modulate.a = 1.0
	var tw = create_tween()
	tw.tween_interval(1.6)
	tw.tween_callback(func():
		get_tree().root.set_meta("go_score",  score)
		get_tree().root.set_meta("go_win",    true)
		get_tree().root.set_meta("go_origin", "Level5Scene")
		get_tree().change_scene_to_file("res://scenes/GameOver.tscn")
	)
func _get_boss_name() -> String: return "SHADOW OVERLORD"
