#!/usr/bin/env python3
"""Generate visual assets for Basement Tycoon."""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math, os, random

ROOT       = os.path.dirname(__file__)
OUT        = os.path.join(ROOT, "assets")
OUT_PUB    = os.path.join(ROOT, "public")

# palette
C_BG1   = (6,  4, 20)          # near-black indigo
C_BG2   = (22, 12, 55)         # deep purple
C_GOLD1 = (255, 200,  20)      # bright gold
C_GOLD2 = (210, 140,   0)      # mid gold
C_GOLD3 = (140,  80,   0)      # dark gold
C_CREAM = (255, 248, 200)      # coin highlight
C_WHITE = (255, 255, 255)
C_DARK  = (8,   6,  26)
C_BLUE  = (0,  120, 220)       # Telegram blue

random.seed(99)

# ── utilities ────────────────────────────────────────────────────────────────

def load_font(size):
    paths = [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


def radial_bg(size, c_center, c_edge):
    """Pixel-by-pixel radial gradient (fast enough for ≤1024)."""
    w, h = size
    img = Image.new("RGB", (w, h))
    px  = img.load()
    cx, cy = w / 2, h / 2
    max_r  = math.hypot(cx, cy)
    for y in range(h):
        for x in range(w):
            t = min(math.hypot(x - cx, y - cy) / max_r, 1.0)
            t = t * t                                          # ease-in curve
            px[x, y] = tuple(int(c_center[k] + (c_edge[k] - c_center[k]) * t)
                              for k in range(3))
    return img.convert("RGBA")


def hgrad_rect(draw, x0, y0, x1, y1, c_left, c_right):
    w = x1 - x0
    for i in range(w):
        t = i / max(w - 1, 1)
        c = tuple(int(c_left[k] + (c_right[k] - c_left[k]) * t) for k in range(3))
        draw.line([(x0 + i, y0), (x0 + i, y1)], fill=c)


def soft_glow(canvas_size, cx, cy, radius, color, blur):
    """Return an RGBA layer with a blurred disc (glow)."""
    layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              fill=(*color[:3], 240))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def draw_text_centered(draw, text, font, cx, y, fill, shadow=None):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    x  = cx - tw // 2
    if shadow:
        draw.text((x + 2, y + 3), text, font=font, fill=(*shadow, 160))
    draw.text((x, y), text, font=font, fill=fill)
    return tw


def draw_text_left(draw, text, font, x, y, fill, shadow=None):
    if shadow:
        draw.text((x + 2, y + 3), text, font=font, fill=(*shadow, 160))
    draw.text((x, y), text, font=font, fill=fill)
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0]


def rounded_pill(draw, x0, y0, x1, y1, r, fill):
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill)


# ── coin ─────────────────────────────────────────────────────────────────────

def draw_coin(img, cx, cy, radius, dollar_font_size=None):
    """
    Draw a single gold coin with metallic gradient + highlight stripe.
    Returns the composite image.
    """
    size = img.size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))

    # 1. outer glow
    g = soft_glow(size, cx, cy, int(radius * 1.15), C_GOLD1, blur=radius // 3)
    layer = Image.alpha_composite(layer, g)

    # 2. dark edge shadow ring
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - radius - 8, cy - radius - 8,
               cx + radius + 8, cy + radius + 8],
              fill=(*C_GOLD3, 100))

    # 3. coin body: concentric ellipses for metallic gradient
    steps = 60
    for s in range(steps, 0, -1):
        t  = s / steps
        r  = int(radius * t)
        # dark center → bright mid → slightly darker edge
        if t < 0.5:
            tt = t / 0.5
            col = tuple(int(C_GOLD3[k] + (C_GOLD2[k] - C_GOLD3[k]) * tt) for k in range(3))
        else:
            tt = (t - 0.5) / 0.5
            col = tuple(int(C_GOLD2[k] + (C_GOLD1[k] - C_GOLD2[k]) * tt) for k in range(3))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)

    # 4. top-left metallic highlight stripe (ellipse, blurred)
    hl = Image.new("RGBA", size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hl_rx = int(radius * 0.55)
    hl_ry = int(radius * 0.22)
    hd.ellipse([cx - hl_rx, cy - radius + int(radius * 0.12),
                cx + hl_rx, cy - radius + int(radius * 0.12) + hl_ry * 2],
               fill=(*C_CREAM, 200))
    hl = hl.filter(ImageFilter.GaussianBlur(int(radius * 0.12)))
    layer = Image.alpha_composite(layer, hl)
    d = ImageDraw.Draw(layer)

    # 5. $ text
    fs   = dollar_font_size or int(radius * 1.1)
    font = load_font(fs)
    # shadow
    bbox = font.getbbox("$")
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = cx - tw // 2 - bbox[0]
    ty = cy - th // 2 - bbox[1] - int(radius * 0.04)
    d.text((tx + 3, ty + 4), "$", font=font, fill=(*C_GOLD3, 180))
    d.text((tx, ty), "$", font=font, fill=C_CREAM)

    # 6. merge
    return Image.alpha_composite(img, layer)


# ── ICON  1024×1024 ──────────────────────────────────────────────────────────

def make_icon(path, size=1024):
    img = radial_bg((size, size), C_BG2, C_BG1)

    cx, cy = size // 2, size // 2
    R = int(size * 0.40)

    # sparkle dots in background
    sp = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sp)
    for _ in range(20):
        sx = random.randint(0, size)
        sy = random.randint(0, size)
        sr = random.randint(2, 8)
        al = random.randint(60, 180)
        sd.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(*C_GOLD1, al))
    sp = sp.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img, sp)

    # coin
    img = draw_coin(img, cx, cy, R, dollar_font_size=int(R * 1.1))

    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"  {path}")


# ── OG IMAGE  1200×630 ───────────────────────────────────────────────────────

def make_og(path, w=1200, h=630):
    img = Image.new("RGBA", (w, h), C_BG1)

    # gradient background
    bg = Image.new("RGBA", (w, h))
    bd = ImageDraw.Draw(bg)
    hgrad_rect(bd, 0, 0, w, h, C_BG2, C_BG1)
    img = Image.alpha_composite(img, bg)

    # left-area ambient glow
    gl = soft_glow((w, h), w // 4, h // 2, int(h * 0.55), C_GOLD2, blur=120)
    img = Image.alpha_composite(img, gl)

    # ── coin (left half) ───────────────────────────────────────────
    coin_r = int(h * 0.34)
    coin_cx = int(w * 0.28)
    coin_cy = h // 2
    img = draw_coin(img, coin_cx, coin_cy, coin_r, dollar_font_size=int(coin_r * 1.05))

    # ── text (right half) ──────────────────────────────────────────
    d   = ImageDraw.Draw(img)
    tx  = int(w * 0.52)
    avw = int(w * 0.46)       # available width for text

    f_title = load_font(int(h * 0.20))
    f_sub   = load_font(int(h * 0.060))
    f_tag   = load_font(int(h * 0.050))
    f_btn   = load_font(int(h * 0.065))

    # "Basement"
    draw_text_left(d, "Basement", f_title, tx, int(h * 0.08),
                   C_CREAM, shadow=C_GOLD3)
    # "Tycoon"
    draw_text_left(d, "Tycoon", f_title, tx, int(h * 0.08) + int(h * 0.22),
                   C_GOLD1, shadow=C_GOLD3)

    # divider
    line_y = int(h * 0.60)
    d.rectangle([tx, line_y, tx + avw, line_y + 4], fill=C_GOLD1)

    draw_text_left(d, "Build your empire,",
                   f_sub, tx, line_y + 14, (210, 210, 230))
    draw_text_left(d, "one tap at a time",
                   f_sub, tx, line_y + 14 + int(h * 0.085), (210, 210, 230))
    draw_text_left(d, "Idle game  |  Free to play",
                   f_tag, tx, line_y + 14 + int(h * 0.175), (150, 150, 175))

    # CTA pill
    btn_x0 = tx
    btn_y0 = int(h * 0.86)
    btn_x1 = tx + int(avw * 0.58)
    btn_y1 = btn_y0 + int(h * 0.11)
    rounded_pill(d, btn_x0, btn_y0, btn_x1, btn_y1,
                 (btn_y1 - btn_y0) // 2, C_GOLD1)
    bbox = f_btn.getbbox("Play Free Now")
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    bx = btn_x0 + (btn_x1 - btn_x0 - bw) // 2 - bbox[0]
    by = btn_y0 + (btn_y1 - btn_y0 - bh) // 2 - bbox[1]
    d.text((bx, by), "Play Free Now", font=f_btn, fill=C_DARK)

    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"  {path}")


# ── TELEGRAM BANNER  640×360 ─────────────────────────────────────────────────

def make_telegram(path, w=640, h=360):
    img = Image.new("RGBA", (w, h), C_BG1)

    bg = Image.new("RGBA", (w, h))
    bd = ImageDraw.Draw(bg)
    hgrad_rect(bd, 0, 0, w, h, C_BG2, C_BG1)
    img = Image.alpha_composite(img, bg)

    # ambient glow
    gl = soft_glow((w, h), int(w * 0.3), h // 2, int(h * 0.55), C_GOLD2, blur=80)
    img = Image.alpha_composite(img, gl)

    # scattered dot bg
    sp = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sp)
    for _ in range(16):
        sx = random.randint(0, w)
        sy = random.randint(0, h)
        sr = random.randint(4, 18)
        al = random.randint(30, 100)
        sd.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(*C_GOLD1, al))
    sp = sp.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(img, sp)

    # coin
    coin_r = int(h * 0.34)
    coin_cx = int(w * 0.26)
    coin_cy = h // 2
    img = draw_coin(img, coin_cx, coin_cy, coin_r, dollar_font_size=int(coin_r * 1.05))

    # text
    d = ImageDraw.Draw(img)
    tx  = int(w * 0.50)
    avw = int(w * 0.47)

    f_title = load_font(int(h * 0.17))
    f_sub   = load_font(int(h * 0.056))
    f_btn   = load_font(int(h * 0.070))

    draw_text_left(d, "Basement", f_title, tx, int(h * 0.07), C_CREAM, shadow=C_GOLD3)
    draw_text_left(d, "Tycoon",   f_title, tx, int(h * 0.07) + int(h * 0.20),
                   C_GOLD1, shadow=C_GOLD3)

    line_y = int(h * 0.56)
    d.rectangle([tx, line_y, tx + avw, line_y + 3], fill=C_GOLD1)

    draw_text_left(d, "Build your empire,",
                   f_sub, tx, line_y + 10, (200, 200, 220))
    draw_text_left(d, "one tap at a time",
                   f_sub, tx, line_y + 10 + int(h * 0.095), (200, 200, 220))

    # Telegram button
    btn_x0 = tx
    btn_y0 = int(h * 0.80)
    btn_x1 = tx + int(avw * 0.85)
    btn_y1 = btn_y0 + int(h * 0.13)
    rounded_pill(d, btn_x0, btn_y0, btn_x1, btn_y1,
                 (btn_y1 - btn_y0) // 2, C_BLUE)
    bbox = f_btn.getbbox("Play on Telegram")
    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    bx = btn_x0 + (btn_x1 - btn_x0 - bw) // 2 - bbox[0]
    by = btn_y0 + (btn_y1 - btn_y0 - bh) // 2 - bbox[1]
    d.text((bx, by), "Play on Telegram", font=f_btn, fill=C_WHITE)

    img.convert("RGB").save(path, "PNG", optimize=True)
    print(f"  {path}")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating assets...")
    make_icon(os.path.join(OUT, "icon.png"), 1024)
    make_icon(os.path.join(OUT, "adaptive-icon.png"), 1024)
    make_icon(os.path.join(OUT, "splash-icon.png"), 512)
    make_icon(os.path.join(OUT, "favicon.png"), 256)
    make_icon(os.path.join(OUT_PUB, "favicon.png"), 256)
    make_icon(os.path.join(OUT_PUB, "apple-touch-icon.png"), 180)
    make_og(os.path.join(OUT_PUB, "og-image.png"))
    make_telegram(os.path.join(OUT, "telegram-banner.png"))
    print("Done.")
