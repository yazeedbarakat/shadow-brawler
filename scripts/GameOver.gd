extends Node2D

const W := 800.0
const H := 450.0

var score       := 0
var win         := false
var origin_scene := "Level1Scene"

const LEVEL_LABELS := {
	"Level1Scene": "LEVEL 1 — CITY STREETS",
	"Level2Scene": "LEVEL 2 — ANCIENT TEMPLE",
	"Level3Scene": "LEVEL 3 — DARK FOREST",
	"Level4Scene": "LEVEL 4 — CASTLE FORTRESS",
	"Level5Scene": "LEVEL 5 — FINAL BOSS",
}
const LEVEL_SCENES := {
	"Level1Scene": "res://scenes/Level1.tscn",
	"Level2Scene": "res://scenes/Level2.tscn",
	"Level3Scene": "res://scenes/Level3.tscn",
	"Level4Scene": "res://scenes/Level4.tscn",
	"Level5Scene": "res://scenes/Level5.tscn",
}

func _ready() -> void:
	var root = get_tree().root
	score        = root.get_meta("go_score",  0)
	win          = root.get_meta("go_win",    false)
	origin_scene = root.get_meta("go_origin", "Level1Scene")
	_build_scene()

func _build_scene() -> void:
	var cl = CanvasLayer.new()
	add_child(cl)

	# Background
	var bg = ColorRect.new()
	bg.color = Color(0.016, 0.031, 0.06)
	bg.position = Vector2.ZERO
	bg.size = Vector2(W, H)
	cl.add_child(bg)

	# Grid lines
	for gx in range(0, int(W), 48):
		var line = ColorRect.new()
		line.color = Color(0.04, 0.063, 0.125, 0.55)
		line.position = Vector2(gx, 0); line.size = Vector2(1, H)
		cl.add_child(line)
	for gy in range(0, int(H), 48):
		var line = ColorRect.new()
		line.color = Color(0.04, 0.063, 0.125, 0.55)
		line.position = Vector2(0, gy); line.size = Vector2(W, 1)
		cl.add_child(line)

	# Accent bars top + bottom
	var accent_color = Color(0.13, 0.8, 0.4) if win else Color(0.8, 0.13, 0.13)
	var tb = ColorRect.new(); tb.color = accent_color
	tb.position = Vector2(0, 3); tb.size = Vector2(W, 4); cl.add_child(tb)
	var bb = ColorRect.new(); bb.color = accent_color
	bb.position = Vector2(0, H - 7); bb.size = Vector2(W, 4); cl.add_child(bb)

	# Heading
	var heading = "LEVEL COMPLETE" if win else "GAME OVER"
	var head_col = Color(0.13, 0.87, 0.47) if win else Color(0.87, 0.2, 0.2)
	var title = Label.new()
	title.text = heading
	title.position = Vector2(W * 0.5 - 200, H * 0.20 - 30)
	title.size = Vector2(400, 60)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 58)
	title.add_theme_color_override("font_color", head_col)
	cl.add_child(title)

	# Sub-label
	var level_label = LEVEL_LABELS.get(origin_scene, "")
	if level_label != "":
		var sub = Label.new()
		sub.text = level_label
		sub.position = Vector2(W * 0.5 - 200, H * 0.20 + 38)
		sub.size = Vector2(400, 20)
		sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		sub.add_theme_font_size_override("font_size", 14)
		sub.add_theme_color_override("font_color", Color(0.27, 0.4, 0.53))
		cl.add_child(sub)

	# Score panel
	var score_bg = ColorRect.new()
	score_bg.color = Color(0.04, 0.063, 0.157)
	score_bg.position = Vector2(W * 0.5 - 140, H * 0.48 - 26)
	score_bg.size = Vector2(280, 52)
	cl.add_child(score_bg)
	var score_title = Label.new()
	score_title.text = "SCORE"
	score_title.position = Vector2(W * 0.5 - 60, H * 0.48 - 20)
	score_title.size = Vector2(120, 16)
	score_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	score_title.add_theme_font_size_override("font_size", 12)
	score_title.add_theme_color_override("font_color", Color(0.2, 0.27, 0.33))
	cl.add_child(score_title)
	var score_val = Label.new()
	score_val.text = str(score)
	score_val.position = Vector2(W * 0.5 - 80, H * 0.48 - 4)
	score_val.size = Vector2(160, 30)
	score_val.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	score_val.add_theme_font_size_override("font_size", 28)
	score_val.add_theme_color_override("font_color", Color(1, 1, 0.33))
	cl.add_child(score_val)

	# Buttons
	var retry_scene = LEVEL_SCENES.get(origin_scene, "res://scenes/Level1.tscn")
	_make_button(cl, W * 0.5 - 105, H * 0.72,
		"PLAY AGAIN", Color(0.1, 0.29, 0.16), Color(0.13, 0.8, 0.33),
		func(): get_tree().change_scene_to_file(retry_scene))
	_make_button(cl, W * 0.5 + 105, H * 0.72,
		"MAIN MENU", Color(0.1, 0.16, 0.29), Color(0.2, 0.4, 0.67),
		func(): get_tree().change_scene_to_file("res://scenes/Menu.tscn"))

	# Tip
	var tip_text = "Armor reduces damage by 30%  —  collect it on platforms" if win \
		else "Tip: use Dash (C) + Attack for a powerful sliding strike"
	var tip = Label.new()
	tip.text = tip_text
	tip.position = Vector2(0, H - 22)
	tip.size = Vector2(W, 16)
	tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tip.add_theme_font_size_override("font_size", 10)
	tip.add_theme_color_override("font_color", Color(0.13, 0.2, 0.27))
	cl.add_child(tip)

func _make_button(parent: Node, x: float, y: float, label: String,
		bg_col: Color, border_col: Color, callback: Callable) -> void:
	var btn = Button.new()
	btn.text = label
	btn.flat = false
	btn.position = Vector2(x - 92, y - 25)
	btn.size = Vector2(185, 50)
	parent.add_child(btn)
	# Style
	var style_normal = StyleBoxFlat.new()
	style_normal.bg_color = bg_col
	style_normal.border_color = border_col
	style_normal.set_border_width_all(1)
	style_normal.set_corner_radius_all(3)
	btn.add_theme_stylebox_override("normal", style_normal)
	var style_hover = style_normal.duplicate()
	(style_hover as StyleBoxFlat).bg_color = bg_col.lightened(0.18)
	btn.add_theme_stylebox_override("hover", style_hover)
	btn.add_theme_color_override("font_color", Color.WHITE)
	btn.add_theme_font_size_override("font_size", 17)
	btn.pressed.connect(callback)
