extends CanvasLayer

# ── Shared bar constants (250×78, calibrated from healthbar.png 3718×1152) ────
const HB_W        := 250.0
const HB_H        := 78.0
const FILL_X      := 61.0    # channel left edge (scaled from 85 * 250/350)
const FILL_MAX_W  := 149.0   # channel width     (scaled from 208 * 250/350)
const FILL_H      := 14.0    # channel height    (scaled from 20  * 78/108)
const FILL_Y      := 27.0    # channel top edge  (scaled from 37  * 78/108)

# Boss bar is the same image flipped, placed flush at top-right.
# With flip_h, the channel maps to the mirror position in screen space:
#   fill_right_edge = 800 - FILL_X  = 739
#   fill_left_edge  = 739 - FILL_MAX_W = 590  (at 100 % health)
const BOSS_X          := 800.0 - HB_W          # = 550
const BOSS_FILL_RIGHT := BOSS_X + HB_W - FILL_X  # = 739  (right anchor)

# ── Nodes ──────────────────────────────────────────────────────────────────────
var _hp_fill       : ColorRect
var _boss_spr      : Sprite2D
var _boss_fill     : ColorRect
var _boss_name_lbl : Label
var _combo_label   : Label
var _weapon_label  : Label
var _weapon_hint   : Label

var _boss_ref     = null
var _hp_display   := 1.0
var _hp_target    := 1.0
var _boss_display := 1.0
var _boss_target  := 1.0
var _combo_count  := 0
var _combo_tween  : Tween
var _combo_timer  := 0.0

func _ready() -> void:
	layer = 10
	_build_player_bar()
	_build_boss_bar()
	_build_combo()
	_build_weapon_slot()

# ── Player bar (top-left, skull faces right) ───────────────────────────────────
func _build_player_bar() -> void:
	var tex = load("res://assets/sprites/healthbar.png")
	if tex:
		var spr = Sprite2D.new()
		spr.texture  = tex
		spr.centered = false
		spr.flip_h   = false
		spr.position = Vector2(0, 0)
		spr.scale    = Vector2(HB_W / tex.get_width(), HB_H / tex.get_height())
		spr.z_index  = 2
		add_child(spr)
	else:
		var fb = ColorRect.new()
		fb.color = Color(0.1, 0.03, 0.01); fb.position = Vector2.ZERO
		fb.size  = Vector2(HB_W, HB_H);    fb.z_index = 2
		add_child(fb)

	_hp_fill = ColorRect.new()
	_hp_fill.color    = Color(0.85, 0.0, 0.1)
	_hp_fill.position = Vector2(FILL_X, FILL_Y)
	_hp_fill.size     = Vector2(FILL_MAX_W, FILL_H)
	_hp_fill.z_index  = 3
	add_child(_hp_fill)

# ── Boss bar (top-right, same image flipped — skull faces left) ────────────────
func _build_boss_bar() -> void:
	var tex = load("res://assets/sprites/healthbar.png")
	if tex:
		_boss_spr = Sprite2D.new()
		_boss_spr.texture  = tex
		_boss_spr.centered = false
		_boss_spr.flip_h   = true   # mirror: skull moves to the right side
		_boss_spr.position = Vector2(BOSS_X, 0)
		_boss_spr.scale    = Vector2(HB_W / tex.get_width(), HB_H / tex.get_height())
		_boss_spr.z_index  = 2
		_boss_spr.visible  = false
		add_child(_boss_spr)
	else:
		var fb = ColorRect.new()
		fb.color = Color(0.1, 0.03, 0.01)
		fb.position = Vector2(BOSS_X, 0); fb.size = Vector2(HB_W, HB_H)
		fb.z_index = 2; fb.visible = false
		add_child(fb)

	# Fill is right-anchored: shrinks toward the skull (right side)
	_boss_fill = ColorRect.new()
	_boss_fill.color    = Color(0.85, 0.0, 0.1)
	_boss_fill.position = Vector2(BOSS_FILL_RIGHT - FILL_MAX_W, FILL_Y)
	_boss_fill.size     = Vector2(FILL_MAX_W, FILL_H)
	_boss_fill.z_index  = 3
	_boss_fill.visible  = false
	add_child(_boss_fill)

	# Boss name label — sits inside the bar between skull and fill
	_boss_name_lbl = Label.new()
	_boss_name_lbl.position = Vector2(BOSS_X + 5, FILL_Y + FILL_H + 3)
	_boss_name_lbl.size     = Vector2(HB_W - 55, 16)  # leave room for skull
	_boss_name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_name_lbl.add_theme_font_size_override("font_size", 10)
	_boss_name_lbl.add_theme_color_override("font_color", Color(1.0, 0.5, 0.5))
	_boss_name_lbl.z_index  = 4
	_boss_name_lbl.visible  = false
	add_child(_boss_name_lbl)

func set_boss(enemy, name: String) -> void:
	_boss_ref     = enemy
	_boss_display = 1.0
	_boss_target  = 1.0
	_boss_fill.size.x     = FILL_MAX_W
	_boss_fill.position.x = BOSS_FILL_RIGHT - FILL_MAX_W
	_boss_name_lbl.text   = name
	if _boss_spr: _boss_spr.visible = true
	_boss_fill.visible     = true
	_boss_name_lbl.visible = true

func _hide_boss_bar() -> void:
	if _boss_spr: _boss_spr.visible = false
	_boss_fill.visible     = false
	_boss_name_lbl.visible = false
	_boss_ref = null

# ── Combo ──────────────────────────────────────────────────────────────────────
func _build_combo() -> void:
	_combo_label = Label.new()
	_combo_label.position = Vector2(320, 170)
	_combo_label.size     = Vector2(160, 50)
	_combo_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_combo_label.add_theme_font_size_override("font_size", 28)
	_combo_label.add_theme_color_override("font_color", Color.WHITE)
	_combo_label.modulate.a = 0.0
	_combo_label.z_index    = 12
	add_child(_combo_label)

# ── Weapon slot (sits between the two bars, top-center-right) ─────────────────
func _build_weapon_slot() -> void:
	# Position it just inside the right bar area
	var sx := 256.0;  var sy := 4.0
	var border = ColorRect.new()
	border.color = Color(0.6, 0.25, 0.06)
	border.position = Vector2(sx - 1, sy - 1); border.size = Vector2(76, 58)
	border.z_index = 4; add_child(border)
	var bg = ColorRect.new()
	bg.color = Color(0.03, 0.05, 0.08)
	bg.position = Vector2(sx, sy); bg.size = Vector2(74, 56); bg.z_index = 5
	add_child(bg)

	_weapon_label = Label.new()
	_weapon_label.text     = "---"
	_weapon_label.position = Vector2(sx + 3, sy + 7)
	_weapon_label.size     = Vector2(68, 20)
	_weapon_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_weapon_label.add_theme_font_size_override("font_size", 12)
	_weapon_label.add_theme_color_override("font_color", Color(0.2, 0.3, 0.4))
	_weapon_label.z_index  = 6; add_child(_weapon_label)

	_weapon_hint = Label.new()
	_weapon_hint.text     = "Z:PUNCH\nX:KICK"
	_weapon_hint.position = Vector2(sx + 1, sy + 29)
	_weapon_hint.size     = Vector2(72, 24)
	_weapon_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_weapon_hint.add_theme_font_size_override("font_size", 7)
	_weapon_hint.add_theme_color_override("font_color", Color(0.2, 0.3, 0.4))
	_weapon_hint.z_index  = 6; add_child(_weapon_hint)

# ── Per-frame ──────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	# Player HP
	if abs(_hp_display - _hp_target) > 0.001:
		_hp_display = lerp(_hp_display, _hp_target, delta * 6.0)
	else:
		_hp_display = _hp_target
	_hp_fill.size.x = FILL_MAX_W * max(0.0, _hp_display)

	# Boss HP
	if _boss_ref != null and is_instance_valid(_boss_ref):
		if _boss_ref.is_dead:
			_hide_boss_bar()
		else:
			_boss_target = float(_boss_ref.health) / float(_boss_ref.max_health)
			if abs(_boss_display - _boss_target) > 0.001:
				_boss_display = lerp(_boss_display, _boss_target, delta * 5.0)
			else:
				_boss_display = _boss_target
			var fw = FILL_MAX_W * max(0.0, _boss_display)
			_boss_fill.size.x     = fw
			_boss_fill.position.x = BOSS_FILL_RIGHT - fw  # right-anchor: shrinks toward skull
			var p = _boss_display
			if   p > 0.5:  _boss_fill.color = Color(0.85, 0.04, 0.04)
			elif p > 0.25: _boss_fill.color = Color(0.9,  0.40, 0.00)
			else:          _boss_fill.color = Color(1.0,  0.80, 0.00)

	# Combo fade
	if _combo_timer > 0:
		_combo_timer -= delta
		if _combo_timer <= 0: _fade_combo()

func update_hp(current: int, maximum: int) -> void:
	_hp_target = float(current) / float(maximum)

# ── Events ─────────────────────────────────────────────────────────────────────
func on_weapon_changed(type: String) -> void:
	if type == "":
		_weapon_label.text = "---"
		_weapon_label.add_theme_color_override("font_color", Color(0.2, 0.3, 0.4))
		_weapon_hint.text  = "Z:PUNCH\nX:KICK"
		_weapon_hint.add_theme_color_override("font_color", Color(0.2, 0.3, 0.4))
	else:
		var labels := {"sword":["SWORD","Z:slash X:stab"],"pipe":["PIPE","Z:smash x2"],"throwingstar":["STAR","Z:throw F:drop"]}
		var colors := {"sword":Color(0.6,0.67,1),"pipe":Color(0.8,0.8,0.8),"throwingstar":Color(1,0.93,0.33)}
		if type in labels:
			_weapon_label.text = labels[type][0]; _weapon_hint.text = labels[type][1]
			_weapon_label.add_theme_color_override("font_color", colors[type])
			_weapon_hint.add_theme_color_override("font_color", colors[type] * 0.8)

func on_combo_hit() -> void:
	_combo_count += 1
	if _combo_count < 3: return
	var n := _combo_count
	var col: Color; var sz: int
	if   n >= 15: col = Color(1,0.13,0); sz = 38
	elif n >= 10: col = Color(1,0.47,0); sz = 34
	elif n >=  7: col = Color(1,0.93,0); sz = 31
	elif n >=  5: col = Color(1,1,0.33); sz = 30
	else:         col = Color.WHITE;     sz = 28
	var lbl = "COMBO!!" if n >= 10 else ("COMBO!" if n >= 5 else "HITS")
	_combo_label.text = "%d %s" % [n, lbl]
	_combo_label.add_theme_font_size_override("font_size", sz)
	_combo_label.add_theme_color_override("font_color", col)
	_combo_label.modulate.a = 1.0
	if _combo_tween: _combo_tween.kill()
	_combo_tween = create_tween()
	_combo_tween.tween_property(_combo_label, "scale", Vector2(1.22, 1.22), 0.07)
	_combo_tween.tween_property(_combo_label, "scale", Vector2(1.0,  1.0),  0.07)
	_combo_timer = 1.8

func on_combo_reset() -> void:
	if _combo_count >= 3: _fade_combo()
	_combo_count = 0; _combo_timer = 0.0

func _fade_combo() -> void:
	if _combo_tween: _combo_tween.kill()
	_combo_tween = create_tween()
	_combo_tween.tween_property(_combo_label, "modulate:a", 0.0, 0.3)
