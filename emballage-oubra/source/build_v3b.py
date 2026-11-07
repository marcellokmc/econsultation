import math, random, sys
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import FILL_EVEN_ODD
from reportlab.lib.units import mm
from reportlab.lib.colors import CMYKColor, CMYKColorSep
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle as _PS
def ParagraphStyle(*a, **k):
    k.setdefault("bulletFontName", "Sans"); return _PS(*a, **k)
from reportlab.graphics.barcode import eanbc
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

FD = sys.argv[1]
import os
PHOTO = os.environ.get("OUBRA_PHOTO") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "photo_soumbala_cmyk.jpg")
OUT = sys.argv[2]
for n, f in [("Playfair", "playfair-display-900"), ("Slab", "roboto-slab-800"), ("Script", "courgette-400"), ("Cooper", "caprasimo-400"),
             ("Sans", "open-sans-400"), ("SansSemi", "open-sans-600"), ("SansBold", "open-sans-700"), ("SansXB", "open-sans-800")]:
    pdfmetrics.registerFont(TTFont(n, f"{FD}/{f}.ttf"))

def C(c, m, y, k): return CMYKColor(c/100, m/100, y/100, k/100)
COL = {
 "vert-foret": (90, 30, 100, 35), "vert-feuille": (85, 20, 100, 15), "vert-tendre": (55, 0, 100, 0),
 "creme": (0, 3, 12, 0), "creme-fonce": (5, 10, 25, 0), "brun-soumbala": (30, 75, 100, 40),
 "brun-nere": (40, 75, 95, 60), "rouge-oubra": (15, 100, 70, 10), "or-soleil": (0, 25, 95, 0),
 "or-profond": (15, 45, 100, 5), "noir": (0, 0, 0, 100), "blanc": (0, 0, 0, 0),
 "bf-rouge": (0, 95, 90, 0), "bf-vert": (100, 0, 90, 10), "bf-jaune": (0, 15, 95, 0),
}
K = {k: C(*v) for k, v in COL.items()}
DIE = CMYKColorSep(0, 1, 0, 0, spotName="Dieline", density=1)
SAFE = CMYKColorSep(1, 0, 0, 0, spotName="Safe_zone", density=1)
WINDOW = CMYKColorSep(0.5, 1, 0, 0, spotName="Window_no_ink", density=1)
REG = CMYKColor(1, 1, 1, 1)

PW, PH, GH = 180, 260, 100  # panel width, height, gusset flat height (2 x 50)
GUS = GH // 2
AW, AH = 170, 250           # artwork design grid, scaled uniformly into the panel
SC = min(PW / AW, PH / AH); AOX = (PW - AW*SC) / 2; AOY = (PH - AH*SC) / 2

def art_frame(c, ox, oy, bg):
    """Clip to bleed, paint full-bleed background, then enter the scaled artwork grid."""
    c.saveState(); pa = c.beginPath(); pa.rect((ox-BLEED)*mm, (oy-BLEED)*mm, (PW+2*BLEED)*mm, (PH+2*BLEED)*mm); c.clipPath(pa, stroke=0)
    c.setFillColor(bg); c.rect((ox-BLEED)*mm, (oy-BLEED)*mm, (PW+2*BLEED)*mm, (PH+2*BLEED)*mm, fill=1, stroke=0)
    c.translate((ox + AOX)*mm, (oy + AOY)*mm); c.scale(SC, SC)
    return P(c, 0, 0)
BLEED, SEAL_SIDE, SEAL_TOP, SEAL_BOT = 3, 8, 10, 8
ZIP_FROM_TOP, NOTCH_FROM_TOP, SAFE_IN = 35, 25, 3

def mmp(v): return v * mm

class P:
    """Draw helper in millimetres relative to a panel origin."""
    def __init__(s, c, ox, oy): s.c, s.ox, s.oy = c, ox, oy
    def X(s, x): return (s.ox + x) * mm
    def Y(s, y): return (s.oy + y) * mm
    def rect(s, x, y, w, h, fill, r=0, stroke=None, lw=0.5):
        c = s.c; c.setFillColor(fill) if fill is not None else None
        if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
        f = fill is not None; st = stroke is not None
        if r: c.roundRect(s.X(x), s.Y(y), w*mm, h*mm, r*mm, fill=f, stroke=st)
        else: c.rect(s.X(x), s.Y(y), w*mm, h*mm, fill=f, stroke=st)
    def circle(s, x, y, r, fill, stroke=None, lw=0.5):
        c = s.c
        if fill is not None: c.setFillColor(fill)
        if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
        c.circle(s.X(x), s.Y(y), r*mm, fill=fill is not None, stroke=stroke is not None)
    def ellipse(s, x, y, rx, ry, fill, stroke=None, lw=0.5):
        c = s.c; c.setFillColor(fill)
        if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
        c.ellipse(s.X(x-rx), s.Y(y-ry), s.X(x+rx), s.Y(y+ry), fill=1, stroke=stroke is not None)
    def text(s, x, y, t, font, size, col, align="l", cs=0):
        c = s.c; c.setFillColor(col); c.setFont(font, size)
        if cs:
            to = c.beginText(); to.setFont(font, size); to.setCharSpace(cs)
            w = pdfmetrics.stringWidth(t, font, size) + cs*(len(t)-1)
            x0 = s.X(x) - (w/2 if align == "c" else w if align == "r" else 0)
            to.setTextOrigin(x0, s.Y(y)); to.textOut(t); to.setCharSpace(0); c.drawText(to); return
        if align == "c": c.drawCentredString(s.X(x), s.Y(y), t)
        elif align == "r": c.drawRightString(s.X(x), s.Y(y), t)
        else: c.drawString(s.X(x), s.Y(y), t)
    def para(s, x, ytop, w, html, style):
        p = Paragraph(html, style); _, h = p.wrap(w*mm, 1000)
        p.drawOn(s.c, s.X(x), s.Y(ytop) - h); return h/mm
    def poly(s, pts, fill, stroke=None, lw=0.5, close=True):
        c = s.c; pa = c.beginPath(); pa.moveTo(s.X(pts[0][0]), s.Y(pts[0][1]))
        for px, py in pts[1:]: pa.lineTo(s.X(px), s.Y(py))
        if close: pa.close()
        if fill is not None: c.setFillColor(fill)
        if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
        c.drawPath(pa, fill=fill is not None, stroke=stroke is not None)

def leaf(p, x, y, ang, length, width, col):
    c = p.c; c.saveState(); c.translate(p.X(x), p.Y(y)); c.rotate(ang)
    pa = c.beginPath(); L, W = length*mm, width*mm
    pa.moveTo(0, 0); pa.curveTo(L*0.3, W, L*0.7, W, L, 0); pa.curveTo(L*0.7, -W, L*0.3, -W, 0, 0)
    c.setFillColor(col); c.drawPath(pa, fill=1, stroke=0); c.restoreState()

def nere_branch(p, x, y, ang, n, col1, col2, size=1.0):
    """Pinnate néré leaf: a rachis with paired leaflets."""
    c = p.c; c.saveState(); c.translate(p.X(x), p.Y(y)); c.rotate(ang)
    c.setStrokeColor(col1); c.setLineWidth(0.8); c.line(0, 0, n*3.2*size*mm, 0)
    for i in range(n):
        d = (i+0.6)*3.2*size*mm; L = (7 - abs(i - n*0.45)*0.6)*size
        for sgn, col in ((1, col1), (-1, col2)):
            c.saveState(); c.translate(d, 0); c.rotate(sgn*58)
            pa = c.beginPath(); Lm, Wm = L*mm, L*0.32*mm
            pa.moveTo(0, 0); pa.curveTo(Lm*0.3, Wm, Lm*0.7, Wm, Lm, 0); pa.curveTo(Lm*0.7, -Wm, Lm*0.3, -Wm, 0, 0)
            c.setFillColor(col); c.drawPath(pa, fill=1, stroke=0); c.restoreState()
    c.restoreState()

def seed(p, x, y, r, rnd):
    p.ellipse(x, y, r, r*0.88, K["brun-nere"])
    p.ellipse(x - r*0.3, y + r*0.3, r*0.28, r*0.2, K["brun-soumbala"])

def pile(p, cx, base, w, h, rnd, seeds=True):
    c = p.c
    pts = []
    for i in range(61):
        t = i/60; x = cx - w/2 + w*t
        y = base + h*(math.sin(math.pi*t)**1.6)*(1 + 0.04*math.sin(t*37))
        pts.append((x, y))
    p.poly(pts, K["brun-soumbala"])
    # granule texture
    for _ in range(int(w*h*0.55)):
        t = rnd.random(); x = cx - w/2 + w*t
        ymax = base + h*(math.sin(math.pi*t)**1.6) - 0.6
        if ymax <= base + 0.4: continue
        y = base + 0.3 + rnd.random()*(ymax - base - 0.3)
        col = rnd.choice([K["brun-nere"], K["brun-nere"], K["or-profond"], K["brun-soumbala"]])
        p.circle(x, y, 0.25 + rnd.random()*0.45, col)
    # spill line at base
    for _ in range(int(w*1.6)):
        x = cx - w/2 - 6 + rnd.random()*(w + 12); y = base - 1.5 + rnd.random()*2.2
        p.circle(x, y, 0.25 + rnd.random()*0.4, rnd.choice([K["brun-nere"], K["brun-soumbala"]]))
    if seeds:
        for (sx, sy, sr) in [(cx+w/2-2, base+1, 2.4), (cx+w/2+3, base-0.5, 2.1), (cx+w/2+1, base+4.5, 2.0),
                             (cx+w/2+6, base+2.5, 1.9), (cx-w/2+1, base-0.5, 2.0), (cx-w/2-3.5, base+1.5, 1.8)]:
            seed(p, sx, sy, sr, rnd)

def arc_text(p, cx, cy, r, text, font, size, col, start_deg, top=True):
    c = p.c; total = sum(pdfmetrics.stringWidth(ch, font, size) for ch in text) / mm
    span = total / r * 180/math.pi
    a = start_deg + span/2 if top else start_deg - span/2
    c.setFillColor(col); c.setFont(font, size)
    for ch in text:
        wch = pdfmetrics.stringWidth(ch, font, size)/mm; da = wch/r*180/math.pi
        mid = a - da/2 if top else a + da/2
        rad = math.radians(mid)
        c.saveState(); c.translate(p.X(cx + r*math.cos(rad)), p.Y(cy + r*math.sin(rad)))
        c.rotate(mid - 90 if top else mid + 90)
        c.drawCentredString(0, 0, ch); c.restoreState()
        a = a - da if top else a + da

def logo(p, cx, cy, r):
    """Provisional roundel — replace with the client's original logo file."""
    p.circle(cx, cy, r, K["rouge-oubra"])
    p.circle(cx, cy, r*0.97, None, K["or-soleil"], 0.8)
    p.circle(cx, cy, r*0.66, K["creme"])
    p.circle(cx, cy, r*0.66, None, K["or-soleil"], 0.8)
    arc_text(p, cx, cy, r*0.76, "ENTREPRISE OURBATOU", "SansBold", r*0.42, K["blanc"], 90, True)
    for a in (-122, -90, -58):
        rad = math.radians(a); p.text(cx + r*0.8*math.cos(rad), cy + r*0.8*math.sin(rad) - 0.6, "★", "Sans", r*0.55, K["or-soleil"], "c") if False else star(p, cx + r*0.82*math.cos(rad), cy + r*0.82*math.sin(rad), r*0.09, K["or-soleil"])
    # tree
    p.rect(cx - r*0.05, cy - r*0.38, r*0.1, r*0.36, K["brun-soumbala"])
    p.ellipse(cx, cy + r*0.08, r*0.42, r*0.22, K["vert-feuille"])
    p.ellipse(cx - r*0.2, cy + r*0.2, r*0.2, r*0.14, K["vert-foret"])
    p.ellipse(cx + r*0.2, cy + r*0.2, r*0.2, r*0.14, K["vert-foret"])
    p.ellipse(cx, cy + r*0.28, r*0.22, r*0.14, K["vert-tendre"])
    p.rect(cx - r*0.5, cy - r*0.4, r*1.0, r*0.03, K["vert-foret"])
    # ribbon
    p.rect(cx - r*0.62, cy - r*0.62, r*1.24, r*0.24, K["vert-foret"], r=0.6)
    p.text(cx, cy - r*0.56, "ENOUR", "SansXB", r*0.5, K["blanc"], "c")

def star(p, x, y, r, col):
    pts = []
    for i in range(10):
        a = math.radians(90 + i*36); rr = r if i % 2 == 0 else r*0.45
        pts.append((x + rr*math.cos(a), y + rr*math.sin(a)))
    p.poly(pts, col)

def check(p, x, y, r):
    p.circle(x, y, r, K["vert-feuille"])
    c = p.c; c.setStrokeColor(K["blanc"]); c.setLineWidth(1.1); c.setLineCap(1); c.setLineJoin(1)
    pa = c.beginPath(); pa.moveTo(p.X(x - r*0.5), p.Y(y)); pa.lineTo(p.X(x - r*0.1), p.Y(y - r*0.42)); pa.lineTo(p.X(x + r*0.55), p.Y(y + r*0.45))
    c.drawPath(pa, fill=0, stroke=1)

def cartouche(p, cx, cy, w, h, size):
    p.ellipse(cx, cy, w/2 + 1.2, h/2 + 1.2, K["brun-soumbala"])
    p.ellipse(cx, cy, w/2 + 0.4, h/2 + 0.4, K["creme-fonce"])
    p.ellipse(cx, cy, w/2 - 0.3, h/2 - 0.3, K["brun-soumbala"])
    p.text(cx, cy - size*0.36/2.835, "SOUMBALA", "Slab", size, K["creme"], "c", cs=0.6)

def section_title(p, x, y, label):
    w = pdfmetrics.stringWidth(label, "SansBold", 8)/mm + 11
    p.rect(x, y, w, 5.4, K["vert-feuille"], r=2.7)
    p.circle(x + 2.7, y + 2.7, 1.9, K["blanc"])
    leaf(p, x + 1.7, y + 1.8, 45, 2.4, 0.8, K["vert-feuille"])
    p.text(x + 5.8, y + 1.55, label, "SansBold", 8, K["blanc"])

def pill(p, x, y, w, h, label):
    p.rect(x, y, w, h, K["vert-feuille"], r=h/2, stroke=K["vert-tendre"], lw=0.7)
    p.text(x + w/2, y + h/2 - 1.0, label, "SansSemi", 7.6, K["blanc"], "c")

def starburst(p, cx, cy, r):
    pts = []
    for i in range(48):
        a = math.radians(i*7.5); rr = r if i % 2 == 0 else r*0.88
        pts.append((cx + rr*math.cos(a), cy + rr*math.sin(a)))
    p.poly(pts, K["or-soleil"], K["or-profond"], 0.8)

def bf_flag(p, x, y, w, h):
    p.rect(x, y + h/2, w, h/2, K["bf-rouge"]); p.rect(x, y, w, h/2, K["bf-vert"])
    star(p, x + w/2, y + h/2, h*0.22, K["bf-jaune"])

# ---- v2 helpers (front/back/gusset overridden below)
# v2 — follows the client's mockup layout as closely as possible (artwork grid 170 x 250, scaled into the panel)

def cream_panel(p, x0, x1, top, yl, yr, r, fill, stroke=None, lw=1.2):
    c = p.c; pa = c.beginPath()
    pa.moveTo(p.X(x0), p.Y(yl)); pa.lineTo(p.X(x0), p.Y(top - r))
    pa.curveTo(p.X(x0), p.Y(top), p.X(x0), p.Y(top), p.X(x0 + r), p.Y(top))
    pa.lineTo(p.X(x1 - r), p.Y(top)); pa.curveTo(p.X(x1), p.Y(top), p.X(x1), p.Y(top), p.X(x1), p.Y(top - r))
    pa.lineTo(p.X(x1), p.Y(yr))
    pa.curveTo(p.X(x1 - 45), p.Y(yr + 9), p.X(x0 + 55), p.Y(yl - 10), p.X(x0), p.Y(yl)); pa.close()
    c.setFillColor(fill)
    if stroke is not None: c.setStrokeColor(stroke); c.setLineWidth(lw)
    c.drawPath(pa, fill=1, stroke=stroke is not None)

def wave_band(p, x0, x1, yl, yr, fill, stroke=None, lw=1.2):
    c = p.c; pa = c.beginPath()
    pa.moveTo(p.X(x0), p.Y(-10)); pa.lineTo(p.X(x0), p.Y(yl))
    pa.curveTo(p.X(x0 + 55), p.Y(yl - 10), p.X(x1 - 45), p.Y(yr + 9), p.X(x1), p.Y(yr))
    pa.lineTo(p.X(x1), p.Y(-10)); pa.close()
    c.setFillColor(fill); c.drawPath(pa, fill=1, stroke=0)
    if stroke is not None:
        pa = c.beginPath(); pa.moveTo(p.X(x0), p.Y(yl))
        pa.curveTo(p.X(x0 + 55), p.Y(yl - 10), p.X(x1 - 45), p.Y(yr + 9), p.X(x1), p.Y(yr))
        c.setStrokeColor(stroke); c.setLineWidth(lw); c.drawPath(pa, fill=0, stroke=1)

def serrated_leaf(p, x, y, ang, L, W, col, vein):
    """Broad serrated leaf (as on the mockup's plants)."""
    c = p.c; c.saveState(); c.translate(p.X(x), p.Y(y)); c.rotate(ang)
    n = 9; up, dn = [], []
    for i in range(n + 1):
        t = i / n; w = W * math.sin(math.pi * t) ** 0.8
        tooth = 0.18 * W if 0 < i < n else 0
        up.append((L * t, w)); dn.append((L * t, -w))
        if i < n:
            t2 = (i + 0.5) / n; w2 = W * math.sin(math.pi * t2) ** 0.8 + tooth
            up.append((L * t2, w2)); dn.append((L * t2, -w2))
    pts = up + dn[::-1]
    pa = c.beginPath(); pa.moveTo(pts[0][0]*mm, pts[0][1]*mm)
    for px, py in pts[1:]: pa.lineTo(px*mm, py*mm)
    pa.close(); c.setFillColor(col); c.drawPath(pa, fill=1, stroke=0)
    c.setStrokeColor(vein); c.setLineWidth(0.5); c.line(0, 0, L*0.92*mm, 0)
    for i in range(1, 5):
        t = i / 5.5
        c.line(L*t*mm, 0, (L*t + W*0.6)*mm, W*0.55*mm); c.line(L*t*mm, 0, (L*t + W*0.6)*mm, -W*0.55*mm)
    c.restoreState()

def plant(p, x, y, angles, size):
    cols = [K["vert-feuille"], K["vert-foret"], K["vert-tendre"]]
    for i, a in enumerate(angles):
        L = size * (0.8 + 0.25 * ((i * 7) % 3) / 2)
        serrated_leaf(p, x, y, a, L, L * 0.36, cols[i % 3], K["vert-tendre"] if i % 3 != 2 else K["vert-feuille"])

def laurel(p, cx, cy, r, side):
    """Gold laurel branch hugging the logo (side = -1 left, +1 right)."""
    angs = [200 + i * 14 for i in range(6)] if side < 0 else [340 - i * 14 for i in range(6)]
    c = p.c; c.setStrokeColor(K["or-profond"]); c.setLineWidth(0.7)
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in angs]
    p.poly(pts, None, K["or-profond"], 0.7, close=False)
    for i, (a, (px, py)) in enumerate(zip(angs, pts)):
        tang = a + (90 if side < 0 else -90)
        leaf(p, px, py, tang + 35*side*-1 + (180 if side > 0 else 0) * 0, 4.2, 1.2, K["or-soleil"] if i % 2 else K["or-profond"])
        leaf(p, px, py, a, 3.8, 1.1, K["or-soleil"])

def glossy_seed(p, x, y, r):
    p.ellipse(x, y, r, r * 0.9, K["brun-nere"])
    p.ellipse(x - r * 0.32, y + r * 0.35, r * 0.3, r * 0.18, K["brun-soumbala"])

def cartouche(p, cx, cy, w, h, size):
    p.ellipse(cx, cy, w/2 + 1.0, h/2 + 1.0, K["brun-soumbala"])
    p.ellipse(cx, cy, w/2 + 0.2, h/2 + 0.2, K["creme"])
    p.ellipse(cx, cy, w/2 - 0.6, h/2 - 0.6, K["brun-soumbala"])
    p.text(cx, cy - size*0.33/2.835, "SOUMBALA", "Cooper", size, K["creme"], "c", cs=0.3)

def pill(p, x, y, w, h, label):
    p.rect(x, y, w, h, K["vert-feuille"], r=h/2, stroke=K["vert-tendre"], lw=0.8)
    p.text(x + 3.2, y + h/2 - 1.05, label, "SansSemi", 7.8, K["blanc"])

def scallop_badge(p, cx, cy, r):
    pts = []
    for i in range(96):
        a = 2*math.pi*i/96; rr = r * (1 + 0.045 * math.cos(14 * a))
        pts.append((cx + rr*math.cos(a), cy + rr*math.sin(a)))
    p.poly(pts, K["or-soleil"], K["or-profond"], 0.8)

def front(c, ox, oy):
    rnd = random.Random(7); p = art_frame(c, ox, oy, K["vert-foret"])
    # cream panel, wavy bottom edge, gold rule
    cream_panel(p, 9, 161, 193, 46, 40, 7, K["creme"], K["or-soleil"], 1.3)
    # logo straddling the top of the panel, gold laurels
    laurel(p, 85, 199, 15.5, -1); laurel(p, 85, 199, 15.5, 1)
    logo(p, 85, 199, 12)
    # OUBRA + swoosh
    p.text(85, 160, "OUBRA", "Playfair", 74, K["rouge-oubra"], "c", cs=0.8)
    c.setFillColor(K["rouge-oubra"]); pa = c.beginPath()
    pa.moveTo(p.X(30), p.Y(156)); pa.curveTo(p.X(70), p.Y(152.4), p.X(110), p.Y(152.4), p.X(141), p.Y(156.5))
    pa.curveTo(p.X(110), p.Y(153.9), p.X(70), p.Y(154.0), p.X(30), p.Y(156)); pa.close(); c.drawPath(pa, fill=1, stroke=0)
    p.text(82, 144, "Consommez naturel et sain", "Script", 14, K["vert-feuille"], "c")
    leaf(p, 136.5, 145.5, 35, 6.5, 2.0, K["vert-feuille"])
    cartouche(p, 85, 128, 92, 19, 31)
    p.text(85, 106, "GRANULÉS", "Cooper", 30, K["brun-soumbala"], "c", cs=0.5)
    # plants behind the pile
    plant(p, 22, 66, [60, 82, 105, 128, 40, 150], 17)
    plant(p, 148, 66, [120, 98, 75, 52, 140, 30], 17)
    pile(p, 86, 48, 96, 49, rnd, seeds=False)
    for (sx, sy, sr) in [(122, 47.5, 2.6), (127.5, 49.5, 2.4), (133, 47, 2.5), (125, 53.5, 2.2), (131, 53, 2.1),
                         (137, 51, 2.0), (118, 51.5, 2.0), (140.5, 46.5, 2.1), (129, 58, 1.8), (113, 46, 1.6)]:
        glossy_seed(p, sx, sy, sr)
    # atouts box
    p.rect(12, 46, 39, 35, K["creme"], r=4)
    p.rect(12, 46, 39, 35, None, r=4, stroke=K["creme-fonce"], lw=0.6)
    for i, t in enumerate(["Naturel", "Authentique", "Riche en goût", "Traditionnel"]):
        y = 75.5 - i*8
        check(p, 16, y + 0.9, 2.1); p.text(19.6, y - 0.3, t, "Script", 10.2, K["vert-foret"])
    # bottom band (already green) — wavy gold rule drawn by the panel stroke
    p.circle(26, 24, 13.6, K["or-profond"])
    p.circle(26, 24, 12.8, K["or-soleil"])
    p.circle(26, 24, 10.6, K["vert-foret"])
    p.text(26, 27.2, "Très", "SansXB", 10, K["blanc"], "c")
    p.text(26, 22.0, "riche en", "SansXB", 10, K["blanc"], "c")
    leaf(p, 23.2, 17.2, 20, 5.2, 1.5, K["vert-tendre"])
    pill(p, 43, 30.5, 70, 6.8, "Calcium et fer")
    pill(p, 43, 21.8, 70, 6.8, "Vitamines : B1, B2 et PP")
    pill(p, 43, 13.1, 70, 6.8, "Protides, lipides et glucides")
    scallop_badge(p, 139, 27, 12.8)
    p.text(139, 30.2, "Poids net", "SansBold", 9, K["vert-foret"], "c")
    p.text(139, 20.6, "500g", "SansXB", 20, K["vert-foret"], "c")
    bf_flag(p, 128.5, 11.2, 21, 5.2)
    c.restoreState()

# ---------------------------------------------------------------- BACK
def contact_icon(p, x, y, kind):
    col = K["noir"]
    if kind == "pin":
        p.circle(x, y + 0.5, 1.3, col); p.poly([(x - 1.1, y - 0.1), (x + 1.1, y - 0.1), (x, y - 2.0)], col); p.circle(x, y + 0.5, 0.5, K["blanc"])
    elif kind == "tel":
        c = p.c; c.saveState(); c.translate(p.X(x), p.Y(y)); c.rotate(-30)
        c.setFillColor(col); c.roundRect(-0.9*mm, -1.9*mm, 1.8*mm, 3.8*mm, 0.6*mm, fill=1, stroke=0)
        c.setFillColor(K["blanc"]); c.rect(-0.25*mm, -1.0*mm, 0.5*mm, 2.0*mm, fill=1, stroke=0); c.restoreState()
    else:
        p.rect(x - 1.6, y - 1.1, 3.2, 2.2, col)
        p.poly([(x - 1.6, y + 1.1), (x, y - 0.2), (x + 1.6, y + 1.1)], None, K["blanc"], 0.5, close=False)

def social(p, x, y, kind):
    p.circle(x, y, 3.3, K["noir"]); W = K["blanc"]
    if kind == "fb": p.text(x + 0.2, y - 1.6, "f", "SansXB", 10, W, "c")
    elif kind == "wa":
        p.circle(x, y, 1.9, None, W, 0.7); p.poly([(x - 1.6, y - 1.2), (x - 2.1, y - 2.2), (x - 0.9, y - 1.8)], W)
    elif kind == "ig":
        p.rect(x - 1.8, y - 1.8, 3.6, 3.6, None, r=1.0, stroke=W, lw=0.7); p.circle(x, y, 0.85, None, W, 0.7); p.circle(x + 1.1, y + 1.1, 0.22, W)
    else:
        p.rect(x - 2.0, y - 1.35, 4.0, 2.7, W, r=0.8); p.poly([(x - 0.6, y - 0.75), (x - 0.6, y + 0.75), (x + 0.8, y)], K["noir"])

def tidyman(p, x, y, col):
    """'Ne pas jeter dans la nature' pictogram: person dropping litter in a bin."""
    p.poly([(x + 1, y + 7), (x + 8, y + 7), (x + 7, y), (x + 2, y)], col)
    p.rect(x + 0.4, y + 7, 8.2, 0.9, col)
    p.circle(x - 4.5, y + 13.2, 1.5, col)
    c = p.c; c.setStrokeColor(col); c.setLineWidth(1.4); c.setLineCap(1)
    c.line(p.X(x - 4.5), p.Y(y + 11.5), p.X(x - 4.8), p.Y(y + 5.5))
    c.line(p.X(x - 4.8), p.Y(y + 5.5), p.X(x - 6.5), p.Y(y)); c.line(p.X(x - 4.8), p.Y(y + 5.5), p.X(x - 3.0), p.Y(y))
    c.line(p.X(x - 4.6), p.Y(y + 10.3), p.X(x - 0.6), p.Y(y + 9.6))
    p.rect(x + 0.2, y + 8.8, 1.6, 1.6, col)

def back(c, ox, oy):
    rnd = random.Random(11); p = art_frame(c, ox, oy, K["creme"])
    # top band + wavy bottom band
    p.rect(-10, 203, 190, 60, K["vert-foret"]); p.rect(-10, 202.4, 190, 0.9, K["or-soleil"])
    wave_band(p, -10, 180, 46, 40, K["vert-foret"], K["or-soleil"], 1.3)
    cartouche(p, 85, 190, 70, 13.5, 22)
    body = ParagraphStyle("b", fontName="Sans", fontSize=7.4, leading=9.2, textColor=K["noir"])
    L, CW = 13, 86
    y = 180.5
    def sec(title, html):
        nonlocal y
        y -= 5.4; section_title(p, L, y, title); y -= 2.0
        h = p.para(L, y, CW, html, body); y -= h + 3.4
    sec("Description", "Le soumbala est un condiment traditionnel obtenu à partir de graines de néré fermentées, "
        "et séchées naturellement. Il apporte une saveur unique et relevée à vos plats.")
    sec("Ingrédients", "Graines de néré fermentées et séchées. Sans additif. Sans conservateur.")
    sec("Mode d'utilisation", "À incorporer selon votre goût dans vos sauces, soupes, marinades, bouillons et plats traditionnels.")
    rows = [["Valeurs nutritives pour 100g", ""], ["Protéines", "36,5g"], ["Lipides", "28,8g"], ["Glucides", "23,6g"],
            ["Calcium", "378 mg"], ["Fer", "36,5 mg"], ["Vitamines B1", "0,04 mg"], ["Vitamines B2", "0,01 mg"],
            ["Vitamines PP", "1,9 mg"], ["Total", "432 Kcal"]]
    t = Table(rows, colWidths=[50*mm, 28*mm], rowHeights=[4.1*mm] + [3.8*mm]*(len(rows) - 1))
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Sans", 7.2), ("FONT", (0, 0), (-1, 0), "SansBold", 7.6),
        ("FONT", (0, -1), (-1, -1), "SansBold", 7.2), ("SPAN", (0, 0), (1, 0)), ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("TEXTCOLOR", (0, 0), (-1, -1), K["noir"]), ("ALIGN", (1, 1), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.2),
        ("BACKGROUND", (0, 0), (-1, -1), K["blanc"]),
        ("BOX", (0, 0), (-1, -1), 0.8, K["noir"]), ("LINEBELOW", (0, 0), (-1, 0), 0.8, K["noir"]),
        ("LINEBELOW", (0, 1), (-1, -2), 0.3, K["noir"]), ("LINEBEFORE", (1, 1), (1, -1), 0.3, K["noir"]),
    ]))
    _, th = t.wrap(0, 0); y -= 1.0
    t.drawOn(c, p.X(L), p.Y(y) - th); y -= th/mm + 3.4
    sec("Conservation", "À conserver dans un endroit frais, sec, et à l'abri de l'humidité. "
        "Refermer soigneusement après chaque utilisation.")
    # right column: bowl of soumbala, néré seeds, leaves
    R = 104
    for (sx, sy, sr) in [(146, 186, 2.3), (151, 182, 2.4), (156, 187, 2.1), (149, 176.5, 2.2), (155.5, 177.5, 2.3),
                         (159.5, 181.5, 2.0), (143, 180, 1.9), (158, 172, 1.9), (152.5, 171, 1.7)]:
        glossy_seed(p, sx, sy, sr)
    plant(p, 155, 150, [70, 100, 130, 45], 10)
    c.setFillColor(K["or-profond"]); pa = c.beginPath()
    pa.moveTo(p.X(106), p.Y(164)); pa.curveTo(p.X(108), p.Y(144), p.X(152), p.Y(144), p.X(154), p.Y(164)); pa.close(); c.drawPath(pa, fill=1, stroke=0)
    c.setFillColor(K["brun-soumbala"]); pa = c.beginPath()
    pa.moveTo(p.X(108.5), p.Y(162)); pa.curveTo(p.X(111), p.Y(148), p.X(149), p.Y(148), p.X(151.5), p.Y(162)); pa.close(); c.drawPath(pa, fill=1, stroke=0)
    p.ellipse(130, 164, 24, 5.5, K["or-profond"])
    pile(p, 130, 163.5, 44, 13, rnd, seeds=False)
    for (sx, sy, sr) in [(140, 147, 3.2), (147, 149.5, 2.9), (112, 146, 2.0)]:
        glossy_seed(p, sx, sy, sr)
    # fabricant box
    p.rect(R, 90, 56, 47, K["blanc"], r=3, stroke=K["vert-foret"], lw=0.9)
    p.text(R + 28, 132, "Fabriqué par :", "SansSemi", 7.4, K["noir"], "c")
    p.text(R + 28, 127.6, "ENTREPRISE OURBATOU", "SansXB", 8, K["noir"], "c")
    logo(p, R + 28, 118.5, 6.6)
    info = ParagraphStyle("i", fontName="Sans", fontSize=6.9, leading=8.4, textColor=K["noir"])
    contact_icon(p, R + 5, 107.2, "pin"); p.para(R + 8.5, 109.5, 46, "Secteur 24, Ouagadougou<br/>Burkina Faso", info)
    contact_icon(p, R + 5, 99.7, "tel");  p.para(R + 8.5, 102.0, 46, "+226 75 02 76 10<br/>+226 79 33 10 04", info)
    contact_icon(p, R + 5, 93.6, "mail"); p.para(R + 8.5, 95.2, 48, "oubragroindustrie@gmail.com", info)
    p.text(R + 28, 82.5, "Suivez-nous :", "SansBold", 7.6, K["noir"], "c")
    for i, kd in enumerate(["fb", "wa", "ig", "yt"]):
        social(p, R + 13 + i*10, 76, kd)
    # bottom band content
    tidyman(p, 22, 24, K["blanc"])
    p.text(22, 18.5, "Ne pas jeter", "SansSemi", 6.6, K["blanc"], "c")
    p.text(22, 15.3, "dans la nature", "SansSemi", 6.6, K["blanc"], "c")
    p.circle(64, 26, 13, K["blanc"]); p.circle(64, 26, 12.2, None, K["or-soleil"], 1.4)
    p.text(64, 32.0, "PRODUIT AU", "SansXB", 5.8, K["noir"], "c")
    p.text(64, 29.0, "BURKINA FASO", "SansXB", 5.8, K["noir"], "c")
    bf_flag(p, 56, 17.5, 16, 9)
    p.rect(100, 12, 54, 30, K["blanc"], r=1.5)
    bc = eanbc.Ean13BarcodeWidget("689900012345")
    bc.barHeight = 21*mm; bc.barWidth = 0.33*mm*0.9; bc.fontName = "Sans"; bc.fontSize = 8
    bc.barFillColor = K["noir"]; bc.textColor = K["noir"]; bc.humanReadable = 1
    x0, y0, x1, y1 = bc.getBounds(); d = Drawing(x1 - x0, y1 - y0); d.add(bc)
    renderPDF.draw(d, c, p.X(127) - (x1 - x0)/2 - x0, p.Y(14.5) - y0)
    c.restoreState()

def gusset(c, ox, oy):
    p = P(c, ox, oy)
    c.saveState(); pa = c.beginPath(); pa.rect(p.X(-BLEED), p.Y(-BLEED), (PW+2*BLEED)*mm, (GH+2*BLEED)*mm); c.clipPath(pa, stroke=0)
    p.rect(-BLEED, -BLEED, PW + 2*BLEED, GH + 2*BLEED, K["vert-foret"])
    for half, rot in ((0, 180), (1, 0)):
        cy = GUS/2 + half*GUS
        c.saveState(); c.translate(p.X(PW/2), p.Y(cy)); c.rotate(rot)
        c.setFillColor(K["or-soleil"]); c.setFont("Playfair", 28); c.drawCentredString(0, -2.5*mm, "OUBRA")
        c.setFillColor(K["creme"]); c.setFont("Script", 10); c.drawCentredString(0, -8.5*mm, "Soumbala granulés · Burkina Faso")
        c.restoreState()
    c.restoreState()

# ---------------------------------------------------------------- FRONT
# v3 — design proposal: "Terroir moderne" — Faso Dan Fani stripes, néré flower motif,
# transparent window showing the product, clear shelf hierarchy. Panel coords = real mm (180 x 260).
MOCKUP = bool(os.environ.get("OUBRA_MOCKUP"))
ARCH_PHOTO = os.environ.get("OUBRA_ARCH_PHOTO")
KAPPA = 0.5523

def frame(c, ox, oy, w, h, bg):
    c.saveState(); pa = c.beginPath(); pa.rect((ox-BLEED)*mm, (oy-BLEED)*mm, (w+2*BLEED)*mm, (h+2*BLEED)*mm); c.clipPath(pa, stroke=0)
    if bg is not None:
        c.setFillColor(bg); c.rect((ox-BLEED)*mm, (oy-BLEED)*mm, (w+2*BLEED)*mm, (h+2*BLEED)*mm, fill=1, stroke=0)
    return P(c, ox, oy)

def add_arch(p, pa, WX, WY, WW, WH, rb=6):
    R = WW/2; cx = WX + R; ys = WY + WH - R; k = KAPPA
    pa.moveTo(p.X(WX + rb), p.Y(WY)); pa.lineTo(p.X(WX + WW - rb), p.Y(WY))
    pa.curveTo(p.X(WX + WW - rb*(1-k)), p.Y(WY), p.X(WX + WW), p.Y(WY + rb*(1-k)), p.X(WX + WW), p.Y(WY + rb))
    pa.lineTo(p.X(WX + WW), p.Y(ys))
    pa.curveTo(p.X(WX + WW), p.Y(ys + R*k), p.X(cx + R*k), p.Y(ys + R), p.X(cx), p.Y(ys + R))
    pa.curveTo(p.X(cx - R*k), p.Y(ys + R), p.X(WX), p.Y(ys + R*k), p.X(WX), p.Y(ys))
    pa.lineTo(p.X(WX), p.Y(WY + rb))
    pa.curveTo(p.X(WX), p.Y(WY + rb*(1-k)), p.X(WX + rb*(1-k)), p.Y(WY), p.X(WX + rb), p.Y(WY)); pa.close()

DANFANI = [("vert-foret", 7), ("or-soleil", 1.6), ("creme", 0.8), ("rouge-oubra", 3.2), ("creme", 0.8), ("or-soleil", 1.6),
           ("brun-soumbala", 4.5), ("creme", 0.8), ("vert-feuille", 2.4), ("creme", 0.8), ("brun-nere", 1.6), ("creme", 0.8)]

def danfani(p, x0, y0, w, h, offset=0):
    """Vertical woven stripes inspired by Faso Dan Fani cloth."""
    x = x0 - offset
    i = 0
    while x < x0 + w:
        col, sw = DANFANI[i % len(DANFANI)]
        p.rect(x, y0, sw + 0.05, h, K[col]); x += sw; i += 1
    # thin weft lines for a woven feel
    p.c.saveState(); p.c.setStrokeColor(K["creme"]); p.c.setLineWidth(0.25); p.c.setStrokeAlpha(0.35)
    yy = y0 + 2.2
    while yy < y0 + h:
        p.c.line(p.X(x0), p.Y(yy), p.X(x0 + w), p.Y(yy)); yy += 2.2
    p.c.restoreState()

def arch_path(p, x0, y0, w, h, r_bottom=6):
    """Arch: straight sides, half-circle top, rounded bottom corners."""
    c = p.c; R = w / 2; cx = x0 + R; ys = y0 + h - R; k = KAPPA
    pa = c.beginPath()
    pa.moveTo(p.X(x0 + r_bottom), p.Y(y0))
    pa.lineTo(p.X(x0 + w - r_bottom), p.Y(y0))
    pa.curveTo(p.X(x0 + w - r_bottom*(1-k)), p.Y(y0), p.X(x0 + w), p.Y(y0 + r_bottom*(1-k)), p.X(x0 + w), p.Y(y0 + r_bottom))
    pa.lineTo(p.X(x0 + w), p.Y(ys))
    pa.curveTo(p.X(x0 + w), p.Y(ys + R*k), p.X(cx + R*k), p.Y(ys + R), p.X(cx), p.Y(ys + R))
    pa.curveTo(p.X(cx - R*k), p.Y(ys + R), p.X(x0), p.Y(ys + R*k), p.X(x0), p.Y(ys))
    pa.lineTo(p.X(x0), p.Y(y0 + r_bottom))
    pa.curveTo(p.X(x0), p.Y(y0 + r_bottom*(1-k)), p.X(x0 + r_bottom*(1-k)), p.Y(y0), p.X(x0 + r_bottom), p.Y(y0))
    pa.close()
    return pa

def nere_flower(p, x, y, r, stalk_to=None, rnd=None):
    """Néré (Parkia biglobosa) flower: red globular head on a hanging stalk."""
    c = p.c; rnd = rnd or random.Random(3)
    if stalk_to:
        sx, sy = stalk_to; c.setStrokeColor(K["vert-tendre"]); c.setLineWidth(1.0); c.setLineCap(1)
        pa = c.beginPath(); pa.moveTo(p.X(sx), p.Y(sy)); pa.curveTo(p.X(sx + (x - sx)*0.2), p.Y(sy - 2), p.X(x), p.Y(y + r*2), p.X(x), p.Y(y + r*0.8))
        c.drawPath(pa, stroke=1, fill=0)
    p.circle(x, y, r, K["rouge-oubra"])
    for _ in range(int(r*r*2.2)):
        a = rnd.random()*2*math.pi; d = r*math.sqrt(rnd.random())*0.95
        p.circle(x + d*math.cos(a), y + d*math.sin(a), 0.22 + rnd.random()*0.18, rnd.choice([K["or-soleil"], K["or-profond"], K["bf-rouge"]]))
    p.circle(x - r*0.35, y + r*0.35, r*0.22, K["bf-rouge"])

def nere_pod(p, x, y, ang, L, col=None):
    c = p.c; c.saveState(); c.translate(p.X(x), p.Y(y)); c.rotate(ang)
    W = L*0.055; pa = c.beginPath(); pa.moveTo(0, 0)
    n = 7
    for i in range(n + 1):
        t = i/n; yy = W*(1 + 0.25*math.cos(t*n*2*math.pi))
        pa.lineTo(L*t*mm, yy*mm)
    for i in range(n, -1, -1):
        t = i/n; yy = -W*(1 + 0.25*math.cos(t*n*2*math.pi))
        pa.lineTo(L*t*mm, yy*mm)
    pa.close(); c.setFillColor(col or K["brun-soumbala"]); c.drawPath(pa, fill=1, stroke=0)
    c.restoreState()

def claim(p, x, y, kind, l1, l2):
    """Round icon + two short lines, centred on x."""
    p.circle(x, y, 5.6, K["vert-foret"], K["or-soleil"], 1.1)
    W = K["creme"]; c = p.c
    if kind == "seed":
        p.ellipse(x - 1.4, y - 0.6, 2.0, 1.75, W); p.ellipse(x + 1.6, y + 0.9, 1.7, 1.5, W)
    elif kind == "noadd":
        p.rect(x - 1.1, y - 2.6, 2.2, 3.6, W, r=0.5); p.rect(x - 1.6, y + 1.0, 3.2, 1.0, W)
        c.setStrokeColor(K["or-soleil"]); c.setLineWidth(1.1); c.line(p.X(x - 3.2), p.Y(y - 3.2), p.X(x + 3.2), p.Y(y + 3.2))
    else:  # leaf = natural / no preservative
        leaf(p, x - 2.6, y - 2.4, 45, 6.5, 2.2, W)
    p.text(x, y - 9.6, l1, "SansBold", 6.8, K["creme"], "c")
    p.text(x, y - 12.6, l2, "SansBold", 6.8, K["creme"], "c")

def fit_size(text, font, size, maxw_mm, cs=0):
    w = (pdfmetrics.stringWidth(text, font, size) + cs*mm*(len(text) - 1)) / mm
    return size if w <= maxw_mm else size * maxw_mm / w

def front(c, ox, oy):
    rnd = random.Random(21); p = frame(c, ox, oy, PW, PH, None)
    WX, WY, WW, WH = 57, 31, 66, 72
    bgp = c.beginPath(); bgp.rect(p.X(-BLEED), p.Y(-BLEED), (PW + 2*BLEED)*mm, (PH + 2*BLEED)*mm)
    add_arch(p, bgp, WX, WY, WW, WH); c.setFillColor(K["creme"]); c.drawPath(bgp, fill=1, stroke=0, fillMode=FILL_EVEN_ODD)
    # top: Dan Fani stripes (zip / tear area — decorative only)
    danfani(p, -BLEED, 224, PW + 2*BLEED, PH - 224 + BLEED)
    p.rect(-BLEED, 222.4, PW + 2*BLEED, 1.6, K["or-soleil"])
    # brand block on cream
    laurel(p, 90, 207, 15.5, -1); laurel(p, 90, 207, 15.5, 1)
    logo(p, 90, 207, 11.5)
    sz = fit_size("OUBRA", "Playfair", 66, 120, 0.8)
    p.text(90, 173.5, "OUBRA", "Playfair", sz, K["rouge-oubra"], "c", cs=0.8)
    c.setFillColor(K["rouge-oubra"]); pa = c.beginPath()
    pa.moveTo(p.X(40), p.Y(169.6)); pa.curveTo(p.X(75), p.Y(166.4), p.X(110), p.Y(166.4), p.X(141), p.Y(170.2))
    pa.curveTo(p.X(110), p.Y(167.8), p.X(75), p.Y(167.9), p.X(40), p.Y(169.6)); pa.close(); c.drawPath(pa, fill=1, stroke=0)
    p.text(90, 158.5, "Consommez naturel et sain", "Script", 13, K["vert-feuille"], "c")
    # green lower body with a transparent window cut out (even-odd)
    WX, WY, WW, WH = 57, 31, 66, 72
    body = c.beginPath()
    body.moveTo(p.X(-BLEED), p.Y(-BLEED)); body.lineTo(p.X(-BLEED), p.Y(150.5))
    body.curveTo(p.X(50), p.Y(141.5), p.X(125), p.Y(155), p.X(PW + BLEED), p.Y(146.5))
    body.lineTo(p.X(PW + BLEED), p.Y(-BLEED)); body.close()
    win = arch_path(p, WX, WY, WW, WH)
    # merge window sub-path into the body path for even-odd knockout
    R = WW/2; cx = WX + R; ys = WY + WH - R; k = KAPPA; rb = 6
    body.moveTo(p.X(WX + rb), p.Y(WY)); body.lineTo(p.X(WX + WW - rb), p.Y(WY))
    body.curveTo(p.X(WX + WW - rb*(1-k)), p.Y(WY), p.X(WX + WW), p.Y(WY + rb*(1-k)), p.X(WX + WW), p.Y(WY + rb))
    body.lineTo(p.X(WX + WW), p.Y(ys))
    body.curveTo(p.X(WX + WW), p.Y(ys + R*k), p.X(cx + R*k), p.Y(ys + R), p.X(cx), p.Y(ys + R))
    body.curveTo(p.X(cx - R*k), p.Y(ys + R), p.X(WX), p.Y(ys + R*k), p.X(WX), p.Y(ys))
    body.lineTo(p.X(WX), p.Y(WY + rb))
    body.curveTo(p.X(WX), p.Y(WY + rb*(1-k)), p.X(WX + rb*(1-k)), p.Y(WY), p.X(WX + rb), p.Y(WY)); body.close()
    c.setFillColor(K["vert-foret"]); c.drawPath(body, fill=1, stroke=0, fillMode=FILL_EVEN_ODD)
    # gold edge on the wave
    c.setStrokeColor(K["or-soleil"]); c.setLineWidth(1.3); pa = c.beginPath()
    pa.moveTo(p.X(-BLEED), p.Y(150.5)); pa.curveTo(p.X(50), p.Y(141.5), p.X(125), p.Y(155), p.X(PW + BLEED), p.Y(146.5)); c.drawPath(pa, stroke=1, fill=0)
    # window content: unprinted in production; simulated product in the mock-up
    if MOCKUP:
        c.saveState(); c.clipPath(arch_path(p, WX, WY, WW, WH), stroke=0)
        p.rect(WX, WY, WW, WH, K["brun-soumbala"])
        for _ in range(5200):
            p.circle(WX + rnd.random()*WW, WY + rnd.random()*WH, 0.3 + rnd.random()*0.75,
                     rnd.choice([K["brun-nere"], K["brun-nere"], K["brun-nere"], K["or-profond"], K["brun-soumbala"]]))
        c.setFillColor(K["blanc"]); c.setFillAlpha(0.18); pa = c.beginPath()
        pa.moveTo(p.X(WX + 6), p.Y(WY + WH - 8)); pa.curveTo(p.X(WX + 10), p.Y(WY + WH - 2), p.X(WX + 22), p.Y(WY + WH + 1), p.X(WX + 30), p.Y(WY + WH - 1))
        pa.lineTo(p.X(WX + 28), p.Y(WY + WH - 4)); pa.curveTo(p.X(WX + 20), p.Y(WY + WH - 3), p.X(WX + 12), p.Y(WY + WH - 6), p.X(WX + 9), p.Y(WY + WH - 11)); pa.close()
        c.drawPath(pa, fill=1, stroke=0); c.restoreState()
    if ARCH_PHOTO:
        c.saveState(); c.clipPath(arch_path(p, WX, WY, WW, WH), stroke=0)
        c.drawImage(ARCH_PHOTO, p.X(WX), p.Y(WY), WW*mm, WH*mm); c.restoreState()
    c.setStrokeColor(K["or-soleil"]); c.setLineWidth(1.6); c.drawPath(arch_path(p, WX, WY, WW, WH), stroke=1, fill=0)
    # product name + descriptor
    sz = fit_size("SOUMBALA", "Cooper", 50, 150, 0.4)
    p.text(90, 120, "SOUMBALA", "Cooper", sz, K["creme"], "c", cs=0.4)
    p.text(90, 110.4, "GRANULÉS DE NÉRÉ", "SansXB", 9.5, K["or-soleil"], "c", cs=1.4)
    # néré flowers + pods framing the window
    nere_pod(p, 128, 104, -62, 30, K["brun-soumbala"]); nere_pod(p, 52, 104, 242, 30, K["brun-soumbala"])
    nere_flower(p, 137, 92, 4.6, stalk_to=(129, 104), rnd=random.Random(5))
    nere_flower(p, 43, 92, 4.6, stalk_to=(51, 104), rnd=random.Random(9))
    # left: claims
    claim(p, 29, 81, "seed", "100 %", "graines de néré")
    claim(p, 29, 61.5, "noadd", "Sans", "additif")
    claim(p, 29, 42, "leaf", "Sans", "conservateur")
    # right: nutrition badge
    p.circle(150, 60, 14.2, K["or-profond"]); p.circle(150, 60, 13.4, K["or-soleil"])
    p.text(150, 66.6, "Riche en", "SansBold", 7.4, K["vert-foret"], "c")
    p.text(150, 60.4, "PROTÉINES", "SansXB", 8.2, K["vert-foret"], "c")
    p.text(150, 54.8, "calcium · fer", "SansBold", 7.2, K["vert-foret"], "c")
    # bottom row
    bf_flag(p, 13, 13, 12, 7.2)
    p.text(27.5, 17.6, "Produit du", "SansSemi", 6.6, K["creme"])
    p.text(27.5, 14.0, "Burkina Faso", "SansXB", 6.8, K["creme"])
    p.text(90, 20.5, "Sauces · Soupes · Plats traditionnels", "SansSemi", 7.2, K["or-soleil"], "c")
    p.text(167, 21.5, "500 g", "SansXB", 17, K["creme"], "r")
    p.text(167, 15.2, "Poids net", "SansSemi", 6.8, K["or-soleil"], "r")
    c.restoreState()
    return (WX, WY, WW, WH)

# ---------------------------------------------------------------- BACK
def back(c, ox, oy):
    rnd = random.Random(11); p = frame(c, ox, oy, PW, PH, K["creme"])
    danfani(p, -BLEED, 224, PW + 2*BLEED, PH - 224 + BLEED, offset=9)
    p.rect(-BLEED, 222.4, PW + 2*BLEED, 1.6, K["or-soleil"])
    wave_band(p, -BLEED, PW + BLEED, 44, 40, K["vert-foret"], K["or-soleil"], 1.3)
    # header
    logo(p, 22, 207, 8.5)
    p.text(34, 206.5, "SOUMBALA", "Cooper", 24, K["brun-soumbala"])
    p.text(34.5, 199.6, "Granulés de néré · OUBRA · 500 g", "SansSemi", 7.6, K["brun-nere"])
    nere_flower(p, 160, 204, 4.2, stalk_to=(168, 218), rnd=random.Random(4))
    c.setStrokeColor(K["creme-fonce"]); c.setLineWidth(0.8); c.line(p.X(12), p.Y(194), p.X(168), p.Y(194))
    body = ParagraphStyle("b", fontName="Sans", fontSize=7.5, leading=9.4, textColor=K["noir"])
    L, CW = 12, 86
    y = 190
    def sec(title, html):
        nonlocal y
        y -= 5.4; section_title(p, L, y, title); y -= 2.0
        h = p.para(L, y, CW, html, body); y -= h + 3.6
    sec("Description", "Le soumbala est un condiment traditionnel obtenu à partir de graines de néré fermentées, "
        "et séchées naturellement. Il apporte une saveur unique et relevée à vos plats.")
    sec("Ingrédients", "Graines de néré fermentées et séchées. <b>Sans additif. Sans conservateur.</b>")
    sec("Mode d'utilisation", "À incorporer selon votre goût dans vos sauces, soupes, marinades, bouillons et plats traditionnels.")
    sec("Conservation", "À conserver dans un endroit frais, sec, et à l'abri de l'humidité. "
        "Refermer soigneusement après chaque utilisation.")
    # story box
    bx, bw = 12, 86; btop = y - 1; bh = 31
    p.rect(bx, btop - bh, bw, bh, K["creme-fonce"], r=3)
    nere_pod(p, bx + 6, btop - bh + 6, 62, 22, K["brun-soumbala"])
    nere_flower(p, bx + 12, btop - 8, 4.0, rnd=random.Random(12))
    story = ParagraphStyle("s", fontName="Sans", fontSize=7.2, leading=9.0, textColor=K["brun-nere"])
    p.text(bx + 22, btop - 6.5, "Le néré, arbre des savanes", "SansXB", 8, K["brun-soumbala"])
    p.para(bx + 22, btop - 9, bw - 25, "Le soumbala naît des graines du néré <i>(Parkia biglobosa)</i>, "
           "arbre emblématique du Burkina Faso. Un savoir-faire transmis de génération en génération.", story)
    # right column: nutrition table
    R, RW = 104, 64
    rows = [["Valeurs nutritionnelles moyennes", ""], ["pour 100 g", ""], ["Énergie", "1808 kJ / 432 kcal"], ["Lipides", "28,8 g"],
            ["Glucides", "23,6 g"], ["Protéines", "36,5 g"], ["Calcium", "378 mg"], ["Fer", "36,5 mg"],
            ["Vitamine B1", "0,04 mg"], ["Vitamine B2", "0,01 mg"], ["Vitamine PP (B3)", "1,9 mg"]]
    t = Table(rows, colWidths=[34*mm, 30*mm], rowHeights=[3.8*mm, 3.6*mm] + [3.8*mm]*(len(rows) - 2))
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Sans", 7.2), ("FONT", (0, 0), (-1, 0), "SansBold", 7.4), ("FONT", (0, 1), (-1, 1), "SansSemi", 7.0),
        ("FONT", (0, 2), (-1, 2), "SansBold", 7.2), ("SPAN", (0, 0), (1, 0)), ("SPAN", (0, 1), (1, 1)),
        ("TEXTCOLOR", (0, 0), (-1, -1), K["noir"]), ("ALIGN", (1, 2), (1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.1),
        ("BACKGROUND", (0, 0), (-1, -1), K["blanc"]), ("BACKGROUND", (0, 0), (-1, 1), K["creme-fonce"]),
        ("BOX", (0, 0), (-1, -1), 0.8, K["noir"]), ("LINEBELOW", (0, 1), (-1, 1), 0.8, K["noir"]),
        ("LINEBELOW", (0, 2), (-1, -2), 0.3, K["noir"]),
    ]))
    _, th = t.wrap(0, 0); t.drawOn(c, p.X(R), p.Y(190) - th)
    ty = 190 - th/mm
    # fabricant
    fb_top = ty - 5; fb_h = 44
    p.rect(R, fb_top - fb_h, RW, fb_h, K["blanc"], r=3, stroke=K["vert-foret"], lw=0.9)
    p.text(R + RW/2, fb_top - 5, "Fabriqué par :", "SansSemi", 7.2, K["noir"], "c")
    p.text(R + RW/2, fb_top - 9.6, "ENTREPRISE OURBATOU", "SansXB", 8.2, K["vert-foret"], "c")
    info = ParagraphStyle("i", fontName="Sans", fontSize=7.0, leading=8.5, textColor=K["noir"])
    yy = fb_top - 13.5
    contact_icon(p, R + 5, yy - 2.6, "pin"); p.para(R + 9, yy, RW - 11, "Secteur 24, Ouagadougou, Burkina Faso", info); yy -= 9.5
    contact_icon(p, R + 5, yy - 2.6, "tel"); p.para(R + 9, yy, RW - 11, "+226 75 02 76 10<br/>+226 79 33 10 04", info); yy -= 9.5
    contact_icon(p, R + 5, yy - 2.2, "mail"); p.para(R + 9, yy, RW - 11, "oubragroindustrie@gmail.com", info)
    sy = fb_top - fb_h - 6
    p.text(R + RW/2, sy, "Suivez-nous", "SansBold", 7.6, K["noir"], "c")
    for i, kd in enumerate(["fb", "wa", "ig", "yt"]):
        social(p, R + RW/2 - 15 + i*10, sy - 6.5, kd)
    p.text(R + RW/2, sy - 15.5, "N° de lot et DLUO : voir soudure haute", "SansSemi", 6.4, K["brun-nere"], "c")
    if ARCH_PHOTO:
        p.text(R + RW/2, sy - 20.5, "Photo : Jacoma226 / Wikimedia Commons, CC BY-SA 4.0", "Sans", 5.2, K["brun-nere"], "c")
    # bottom band
    tidyman(p, 22, 22, K["blanc"])
    p.text(22, 16.5, "Ne pas jeter", "SansSemi", 6.4, K["blanc"], "c")
    p.text(22, 13.3, "dans la nature", "SansSemi", 6.4, K["blanc"], "c")
    p.circle(62, 26, 12.5, K["blanc"]); p.circle(62, 26, 11.7, None, K["or-soleil"], 1.4)
    p.text(62, 31.6, "PRODUIT DU", "SansXB", 5.6, K["noir"], "c")
    p.text(62, 28.7, "BURKINA FASO", "SansXB", 5.6, K["noir"], "c")
    bf_flag(p, 54.5, 18.5, 15, 8.4)
    p.rect(102, 12, 54, 30, K["blanc"], r=1.5)
    bc = eanbc.Ean13BarcodeWidget("689900012345")
    bc.barHeight = 21*mm; bc.barWidth = 0.33*mm*0.9; bc.fontName = "Sans"; bc.fontSize = 8
    bc.barFillColor = K["noir"]; bc.textColor = K["noir"]; bc.humanReadable = 1
    x0, y0, x1, y1 = bc.getBounds(); d = Drawing(x1 - x0, y1 - y0); d.add(bc)
    renderPDF.draw(d, c, p.X(129) - (x1 - x0)/2 - x0, p.Y(14.5) - y0)
    c.restoreState()

def gusset(c, ox, oy):
    p = frame(c, ox, oy, PW, GH, K["vert-foret"])
    danfani(p, -BLEED, -BLEED, PW + 2*BLEED, GH + 2*BLEED, offset=4)
    for half, rot in ((0, 180), (1, 0)):
        cy = GUS/2 + half*GUS
        c.saveState(); c.translate(p.X(PW/2), p.Y(cy)); c.rotate(rot)
        c.setFillColor(K["vert-foret"]); c.roundRect(-42*mm, -11*mm, 84*mm, 20*mm, 10*mm, fill=1, stroke=0)
        c.setStrokeColor(K["or-soleil"]); c.setLineWidth(1.2); c.roundRect(-42*mm, -11*mm, 84*mm, 20*mm, 10*mm, fill=0, stroke=1)
        c.setFillColor(K["or-soleil"]); c.setFont("Playfair", 26); c.drawCentredString(0, -2.0*mm, "OUBRA")
        c.setFillColor(K["creme"]); c.setFont("Script", 9.5); c.drawCentredString(0, -8.0*mm, "Soumbala granulés · Burkina Faso")
        c.restoreState()
    c.restoreState()

def window_mark(c, ox, oy, win):
    WX, WY, WW, WH = win
    p = P(c, ox, oy)
    c.saveState(); c.setStrokeColor(WINDOW); c.setLineWidth(0.5); c.setDash(1.5, 1.2); c.setStrokeOverprint(True)
    c.drawPath(arch_path(p, WX, WY, WW, WH), stroke=1, fill=0)
    c.setDash(); c.setFillColor(WINDOW); c.setFont("SansBold", 6)
    c.drawCentredString(p.X(WX + WW/2), p.Y(WY + WH/2 + 2), "FENÊTRE TRANSPARENTE")
    c.setFont("Sans", 5.4)
    c.drawCentredString(p.X(WX + WW/2), p.Y(WY + WH/2 - 1.5), "sans encre ni blanc / no ink, no white")
    c.restoreState()

# ---------------------------------------------------------------- MARKS
def crop_marks(c, ox, oy, w, h):
    c.setStrokeColor(REG); c.setLineWidth(0.25)
    for x in (ox, ox + w):
        for y in (oy, oy + h):
            dx = -1 if x == ox else 1; dy = -1 if y == oy else 1
            c.line(x*mm, (y + dy*(BLEED + 2))*mm, x*mm, (y + dy*(BLEED + 9))*mm)
            c.line((x + dx*(BLEED + 2))*mm, y*mm, (x + dx*(BLEED + 9))*mm, y*mm)

def die(c, ox, oy, w, h, seals=True, zip_=True, label=""):
    c.saveState(); c.setStrokeColor(DIE); c.setFillColor(DIE); c.setLineWidth(0.5)
    c.setStrokeOverprint(True); c.setFillOverprint(True)
    c.rect(ox*mm, oy*mm, w*mm, h*mm, fill=0, stroke=1)
    c.setFont("Sans", 6.5)
    if seals:
        c.setDash(2, 1.5); c.setLineWidth(0.3)
        c.line((ox + SEAL_SIDE)*mm, oy*mm, (ox + SEAL_SIDE)*mm, (oy + h)*mm)
        c.line((ox + w - SEAL_SIDE)*mm, oy*mm, (ox + w - SEAL_SIDE)*mm, (oy + h)*mm)
        c.line(ox*mm, (oy + h - SEAL_TOP)*mm, (ox + w)*mm, (oy + h - SEAL_TOP)*mm)
        c.line(ox*mm, (oy + SEAL_BOT)*mm, (ox + w)*mm, (oy + SEAL_BOT)*mm)
    if zip_:
        c.setDash(6, 2); c.setLineWidth(0.6)
        zy = oy + h - ZIP_FROM_TOP; c.line(ox*mm, zy*mm, (ox + w)*mm, zy*mm)
        c.setDash()
        ny = oy + h - NOTCH_FROM_TOP
        for x, s in ((ox, 1), (ox + w, -1)):
            pa = c.beginPath(); pa.moveTo(x*mm, (ny + 1.5)*mm); pa.lineTo((x + s*3)*mm, ny*mm); pa.lineTo(x*mm, (ny - 1.5)*mm); c.drawPath(pa, stroke=1, fill=0)
        c.drawString((ox + w + 4)*mm, (zy - 1)*mm, f"ZIP  ({ZIP_FROM_TOP} mm)")
        c.drawString((ox + w + 4)*mm, (ny - 1)*mm, f"Tear notch ({NOTCH_FROM_TOP} mm)")
        c.drawString((ox + w + 4)*mm, (oy + h - SEAL_TOP/2 - 1)*mm, f"Top seal {SEAL_TOP} mm")
        c.drawString((ox + w + 4)*mm, (oy + SEAL_BOT/2 - 1)*mm, f"Bottom seal {SEAL_BOT} mm")
    c.setDash()
    c.setFont("SansBold", 9); c.drawString(ox*mm, (oy + h + BLEED + 11)*mm, label)
    c.restoreState()
    # safe zone
    c.saveState(); c.setStrokeColor(SAFE); c.setLineWidth(0.3); c.setDash(1, 1.5); c.setStrokeOverprint(True)
    m = SEAL_SIDE + SAFE_IN if seals else SAFE_IN
    c.rect((ox + m)*mm, (oy + (SEAL_BOT + SAFE_IN if seals else SAFE_IN))*mm, (w - 2*m)*mm,
           (h - (SEAL_BOT + SEAL_TOP + 2*SAFE_IN if seals else 2*SAFE_IN))*mm, fill=0, stroke=1)
    c.restoreState()

def dim(c, x0, y0, x1, y1, txt, off):
    c.saveState(); c.setStrokeColor(DIE); c.setFillColor(DIE); c.setLineWidth(0.25); c.setFont("Sans", 7)
    if y0 == y1:
        y = y0 + off; c.line(x0*mm, y*mm, x1*mm, y*mm); c.line(x0*mm, (y-1.5)*mm, x0*mm, (y+1.5)*mm); c.line(x1*mm, (y-1.5)*mm, x1*mm, (y+1.5)*mm)
        c.drawCentredString((x0+x1)/2*mm, (y+1.2)*mm, txt)
    else:
        x = x0 + off; c.line(x*mm, y0*mm, x*mm, y1*mm); c.line((x-1.5)*mm, y0*mm, (x+1.5)*mm, y0*mm); c.line((x-1.5)*mm, y1*mm, (x+1.5)*mm, y1*mm)
        c.saveState(); c.translate((x-1.2)*mm, (y0+y1)/2*mm); c.rotate(90); c.drawCentredString(0, 0, txt); c.restoreState()
    c.restoreState()

def legend(c, x, y):
    c.setFillColor(K["noir"]); c.setFont("SansBold", 9); c.drawString(x*mm, y*mm, "Couleurs CMJN / CMYK colours (Fogra39)")
    names = [("vert-foret", "Vert forêt / Forest green"), ("vert-feuille", "Vert feuille / Leaf green"), ("vert-tendre", "Vert tendre / Light green"),
             ("creme", "Crème / Cream"), ("creme-fonce", "Crème foncé / Dark cream"), ("brun-soumbala", "Brun soumbala / Brown"),
             ("brun-nere", "Brun néré / Dark brown"), ("rouge-oubra", "Rouge OUBRA / OUBRA red"), ("or-soleil", "Or / Gold"),
             ("or-profond", "Or profond / Deep gold"), ("noir", "Noir texte / Text black (K only)")]
    for i, (k, lab) in enumerate(names):
        col, row = i % 2, i // 2
        xx, yy = x + col*86, y - 8 - row*8
        c.setFillColor(K[k]); c.setStrokeColor(K["noir"]); c.setLineWidth(0.2); c.rect(xx*mm, (yy-1.5)*mm, 9*mm, 6*mm, fill=1, stroke=1)
        cm, mg, ye, bk = COL[k]
        c.setFillColor(K["noir"]); c.setFont("SansSemi", 7); c.drawString((xx+11)*mm, (yy+1.5)*mm, lab)
        c.setFont("Sans", 6.6); c.drawString((xx+11)*mm, (yy-1.2)*mm, f"C{cm} M{mg} Y{ye} K{bk}")
    yy = y - 8 - 6*8 - 2
    c.setFont("SansBold", 9); c.drawString(x*mm, yy*mm, "Repères / Marks (ne pas imprimer / do not print)")
    for i, (colr, dash, lab) in enumerate([(DIE, None, "Dieline (ton direct / spot) — trait de coupe / cut line"),
                                           (DIE, (2, 1.5), "Soudures / Seals"), (DIE, (6, 2), "Zip"),
                                           (SAFE, (1, 1.5), "Zone de sécurité / Safe zone (texte à l'intérieur)")]):
        ly = yy - 7 - i*5.5
        c.saveState(); c.setStrokeColor(colr); c.setLineWidth(0.6)
        if dash: c.setDash(*dash)
        c.line(x*mm, (ly+1)*mm, (x+14)*mm, (ly+1)*mm); c.restoreState()
        c.setFillColor(K["noir"]); c.setFont("Sans", 7); c.drawString((x+17)*mm, ly*mm, lab)

# ---------------------------------------------------------------- PAGE 1
if MOCKUP:
    c = canvas.Canvas(OUT, pagesize=((2*PW + 30)*mm, (PH + 20)*mm), initialFontName="Sans")
    c.setFillColor(CMYKColor(0.04, 0.03, 0.06, 0)); c.rect(0, 0, (2*PW + 30)*mm, (PH + 20)*mm, fill=1, stroke=0)
    front(c, 10, 10); back(c, PW + 20, 10); c.showPage(); c.save(); print("mockup", OUT); sys.exit(0)
W1, H1 = 465, 480
c = canvas.Canvas(OUT, pagesize=(W1*mm, H1*mm), initialFontName="Sans", initialFontSize=8)
c.setTitle("OUBRA Soumbala Granulés 500 g — Fichier d'impression"); c.setAuthor("Entreprise Ourbatou")
c.setSubject(f"Doypack {PW} x {PH} + 2 x {GUS} mm — CMYK — 1:1 — bleed 3 mm")
FX, FY = 30, 165; BX, BY = 250, 165; GX, GY = 30, 30
WIN = front(c, FX, FY); back(c, BX, BY); gusset(c, GX, GY)
for (x, y, w, h) in [(FX, FY, PW, PH), (BX, BY, PW, PH), (GX, GY, PW, GH)]: crop_marks(c, x, y, w, h)
die(c, FX, FY, PW, PH, label=f"RECTO / FRONT  — {PW} × {PH} mm")
die(c, BX, BY, PW, PH, label=f"VERSO / BACK  — {PW} × {PH} mm")
die(c, GX, GY, PW, GH, seals=False, zip_=False, label=f"SOUFFLET / BOTTOM GUSSET — {PW} × {GH} mm (2 × {GUS} mm)")
c.saveState(); c.setStrokeColor(DIE); c.setLineWidth(0.4); c.setDash(4, 2); c.line(GX*mm, (GY+GUS)*mm, (GX+PW)*mm, (GY+GUS)*mm)
c.setFillColor(DIE); c.setFont("Sans", 6.5); c.drawString((GX+PW+4)*mm, (GY+GUS-1)*mm, "Pli / Fold line"); c.restoreState()
dim(c, FX, FY, FX + PW, FY, f"{PW} mm", -12); dim(c, FX, FY, FX, FY + PH, f"{PH} mm", -12)
dim(c, GX, GY, GX, GY + GH, f"{GH} mm", -12)
c.setFillColor(K["noir"]); c.setFont("SansXB", 15)
c.drawString(30*mm, (H1-18)*mm, ("OUBRA — Soumbala Granulés 500 g · « Terroir moderne » variante photo · Print file" if ARCH_PHOTO else "OUBRA — Soumbala Granulés 500 g · Proposition design « Terroir moderne » · Print file"))
c.setFont("Sans", 8.5)
c.drawString(30*mm, (H1-25)*mm, f"Doypack (stand-up pouch) avec zip · {PW} × {PH} mm + soufflet 2 × {GUS} mm · Échelle 1:1 · CMJN/CMYK · Fond perdu / bleed 3 mm · "
             "Polices incorporées / fonts embedded · Dieline = ton direct « Dieline » en surimpression")
legend(c, BX, GY + GH + 12)
(None if ARCH_PHOTO else window_mark(c, FX, FY, WIN))
c.showPage()

# ---------------------------------------------------------------- PAGE 2 spec sheet (A4)
from reportlab.lib.pagesizes import A4
c.setPageSize(A4)
W, H = A4
h1 = ParagraphStyle("h1", fontName="SansXB", fontSize=15, leading=19, textColor=K["vert-foret"])
st = ParagraphStyle("t", fontName="Sans", fontSize=8.6, leading=11, textColor=K["noir"])
stb = ParagraphStyle("tb", parent=st, fontName="SansBold")
Paragraph("Fiche technique / Technical specification — OUBRA Soumbala Granulés 500 g", h1).wrapOn(c, W - 36*mm, 40*mm)
p0 = Paragraph("Fiche technique / Technical specification<br/>OUBRA Soumbala Granulés 500 g", h1); _, hh = p0.wrap(W - 36*mm, 60*mm); p0.drawOn(c, 18*mm, H - 18*mm - hh)
spec = [
 ("Type d'emballage / Pouch type", "Sachet tenant debout à soufflet de fond (doypack) avec zip refermable et encoches de déchirure / Stand-up pouch with bottom gusset, press-to-close zipper and tear notches"),
 ("Dimensions finies / Finished size", f"L {PW} mm × H {PH} mm + soufflet de fond {GUS} mm ({GH} mm à plat) — soit 18 × 26 + 5 cm / W {PW} × H {PH} mm + {GUS} mm bottom gusset ({GH} mm flat)"),
 ("Contenance / Fill", "500 g soumbala en granulés / 500 g fermented néré granules — à valider par un essai de remplissage / confirm with a fill test"),
*([("Matériau conseillé / Suggested material", "PET mat 12 µm / ALU 7 µm ou VMPET 12 µm / PE 80–100 µm (barrière humidité et odeur, contact alimentaire) / Matte PET 12µ / AL 7µ or VMPET 12µ / LLDPE 80–100µ, food-grade, moisture & odour barrier"),
("Impression / Printing", "Héliogravure, CMJN + blanc de soutien sous toute la surface si film métallisé / Rotogravure, CMYK + white underlay if metallised film"),
("Photo", "Soumbala burkinabè — Jacoma226, Wikimedia Commons, licence CC BY-SA 4.0 (mention obligatoire au verso) / Photo credit printed on back as required by the licence"),
] if ARCH_PHOTO else [
 ("Matériau conseillé / Suggested material", "Complexe transparent haute barrière : PET-AlOx (ou PET/EVOH) 12 µm / PE 80–100 µm, contact alimentaire, barrière humidité et odeur / Clear high-barrier laminate: AlOx-PET (or PET/EVOH) 12µ / LLDPE 80–100µ, food-grade"),
 ("Fenêtre / Window", "Fenêtre transparente en arche au recto (66 × 72 mm) : ni encre ni blanc de soutien dans cette zone (ton direct « Window_no_ink ») / Arch-shaped clear window on front (66 × 72 mm): no ink and no white underlay inside"),
 ("Finition / Finish", "Mat intégral / Full matte (option : vernis brillant sélectif sur OUBRA et SOUMBALA / optional spot gloss)"),
 ("Impression / Printing", "Héliogravure, CMJN + blanc de soutien partout sauf dans la fenêtre / Rotogravure, CMYK + white underlay everywhere except the window"),
]),
 ("Soudures / Seals", f"Latérales {SEAL_SIDE} mm, haut {SEAL_TOP} mm, fond {SEAL_BOT} mm / Side {SEAL_SIDE} mm, top {SEAL_TOP} mm, bottom {SEAL_BOT} mm"),
 ("Zip & encoches / Zipper & notches", f"Zip à {ZIP_FROM_TOP} mm du haut, encoches à {NOTCH_FROM_TOP} mm du haut, des deux côtés / Zipper {ZIP_FROM_TOP} mm from top, tear notches {NOTCH_FROM_TOP} mm from top, both sides"),
 ("Coins / Corners", "Coins droits (option : arrondis R 5 mm) / Square corners (option: R 5 mm rounded)"),
 ("Code-barres / Barcode", "EAN-13, barres noir 100 % K sur fond blanc, grossissement ≈ 94 % / EAN-13, 100% K bars on white, ≈ 94% magnification"),
 ("Lot & dates / Coding", "N° de lot, date de fabrication et DLUO à imprimer au jet d'encre sur la soudure du haut / Lot number, production and best-before dates: inkjet-coded on the top seal"),
 ("Couleurs / Colours", "Voir page 1. Respecter les valeurs CMJN ; BAT couleur physique exigé avant production / See page 1. Physical colour proof required before production"),
 ("Repères / Marks", "Dieline, soudures, zip et zone de sécurité sont en tons directs « Dieline » / « Safe_zone » : NE PAS IMPRIMER / Dieline & safe-zone spot colours: DO NOT PRINT"),
]
data = [[Paragraph(a, stb), Paragraph(b, st)] for a, b in spec]
t = Table(data, colWidths=[46*mm, W - 36*mm - 46*mm])
t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEBELOW", (0, 0), (-1, -1), 0.3, K["creme-fonce"]),
                       ("BACKGROUND", (0, 0), (0, -1), K["creme"]), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
_, th = t.wrap(W - 36*mm, H); ty = H - 18*mm - hh - 6*mm - th; t.drawOn(c, 18*mm, ty)
warn = ParagraphStyle("w", parent=st, textColor=K["rouge-oubra"])
items = [
 "<b>À faire avant d'envoyer en production / Before production:</b>",
 "1. Remplacer le gabarit par celui du fournisseur s'il diffère (dimensions, soudures, zip) / Replace with the supplier's own dieline if different.",
 "2. Remplacer le logo rond provisoire par le fichier original vectoriel / Replace the provisional round logo with the original vector logo file.",
 "3. Code-barres : 6 899000 12345 est un numéro d'exemple. Obtenir un vrai code GS1 et le remplacer / Barcode number is a placeholder — replace with a registered GS1 number.",
 "4. Faire valider le tableau nutritionnel par un laboratoire (l'énergie calculée à partir des protéines, lipides et glucides donne ≈ 500 kcal, pas 432 kcal) / Nutrition values to be lab-verified.",
 "5. Vérifier le nom de l'entreprise et les coordonnées, puis signer le BAT / Check company name and contact details, then sign the proof.",
]
yy = ty - 8*mm
for s in items:
    pr = Paragraph(s, warn if s[0].isdigit() else stb); _, hp = pr.wrap(W - 36*mm, H); pr.drawOn(c, 18*mm, yy - hp); yy -= hp + 2.2*mm
c.showPage()
c.save()
print("ok", OUT)
