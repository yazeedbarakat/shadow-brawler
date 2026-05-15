extends Node2D

const W := 800.0
const H := 450.0

func _ready() -> void:
	_build_bg()
	_build_ui()
	_build_music()

func _build_bg() -> void:
	var tex = load("res://assets/backgrounds/menu_bg.png")
	if tex:
		var tr = TextureRect.new()
		tr.texture = tex
		tr.position = Vector2.ZERO
		tr.size = Vector2(W, H)
		tr.stretch_mode = TextureRect.STRETCH_SCALE
		tr.z_index = 0
		add_child(tr)
	else:
		var bg = ColorRect.new()
		bg.color = Color(0.05, 0.0, 0.06)
		bg.position = Vector2.ZERO
		bg.size = Vector2(W, H)
		add_child(bg)

	# Dark gradient overlay over lower half
	var ov = ColorRect.new()
	ov.color = Color(0, 0, 0, 0.68)
	ov.position = Vector2(0, H * 0.38)
	ov.size = Vector2(W, H * 0.62)
	ov.z_index = 1
	add_child(ov)

func _build_ui() -> void:
	var cl = CanvasLayer.new()
	cl.layer = 5
	add_child(cl)

	# Title glow ellipse
	var glow = ColorRect.new()
	glow.color = Color(0.48, 0.19, 1, 0.22)
	glow.position = Vector2(W * 0.5 - 140, H * 0.60 - 34)
	glow.size = Vector2(280, 68)
	cl.add_child(glow)

	# PLAY label
	var play_lbl = Label.new()
	play_lbl.text = "PLAY"
	play_lbl.position = Vector2(W * 0.5 - 80, H * 0.60 - 36)
	play_lbl.size = Vector2(160, 72)
	play_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	play_lbl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	play_lbl.add_theme_font_size_override("font_size", 64)
	play_lbl.add_theme_color_override("font_color", Color.WHITE)
	play_lbl.add_theme_color_override("font_shadow_color", Color(0.48, 0.19, 1))
	play_lbl.add_theme_constant_override("shadow_offset_x", 0)
	play_lbl.add_theme_constant_override("shadow_offset_y", 0)
	cl.add_child(play_lbl)

	# Hit area button
	var btn = Button.new()
	btn.text = ""
	btn.flat = true
	btn.position = Vector2(W * 0.5 - 150, H * 0.60 - 40)
	btn.size = Vector2(300, 80)
	cl.add_child(btn)
	btn.mouse_entered.connect(func():
		play_lbl.add_theme_color_override("font_color", Color(0.93, 0.87, 1))
		var tw = create_tween()
		tw.tween_property(play_lbl, "scale", Vector2(1.06, 1.06), 0.12)
	)
	btn.mouse_exited.connect(func():
		play_lbl.add_theme_color_override("font_color", Color.WHITE)
		var tw = create_tween()
		tw.tween_property(play_lbl, "scale", Vector2(1.0, 1.0), 0.12)
	)
	btn.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/Level1.tscn"))

	# Subtitle
	var sub = Label.new()
	sub.text = "SHADOW BRAWLER"
	sub.position = Vector2(W * 0.5 - 160, H * 0.32)
	sub.size = Vector2(320, 40)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font_size", 22)
	sub.add_theme_color_override("font_color", Color(0.8, 0.6, 1))
	cl.add_child(sub)

	# Controls legend
	var bar = ColorRect.new()
	bar.color = Color(0, 0, 0, 0.62)
	bar.position = Vector2(0, H - 28)
	bar.size = Vector2(W, 28)
	cl.add_child(bar)

	var ctrl = Label.new()
	ctrl.text = "← → Move   Shift Run   ↑/W Jump   Z Attack   X Heavy   S Block   C Dash   ↓+C Roll   F Drop"
	ctrl.position = Vector2(0, H - 22)
	ctrl.size = Vector2(W, 16)
	ctrl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ctrl.add_theme_font_size_override("font_size", 11)
	ctrl.add_theme_color_override("font_color", Color(0.53, 0.47, 0.6))
	cl.add_child(ctrl)

func _build_music() -> void:
	var stream = load("res://assets/audio/menu_music.mp3")
	if stream == null: return
	var mus = AudioStreamPlayer.new()
	mus.stream = stream
	mus.volume_db = -10.0
	add_child(mus)
	mus.play()
