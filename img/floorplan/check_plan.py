#!/usr/bin/env python3
"""Check the main-floor room plan against where the robot vacuum actually drives.

The vacuum's own map (Home Assistant image.grace_hill_map, served by uriel's vacuum-remote
page at :8093/api/map) shows the floor it can reach. Rotated 180 degrees and scaled 50 mm per
map unit it lines up with the county outline (px = 656.9 - 2.505*x, py = 634 - 2.505*y).

FAILS when a space the vacuum cannot get into (stairs, closets) is drawn where the vacuum
drives freely -- the 2026-11-22 mistake was a full-width pantry drawn across open floor.
WARNS when a walkable room is mostly unreached (could be furniture, or a wrong wall).

The reach image is a local, git-ignored snapshot (.vacuum-reach.png): run with --refresh to
pull a fresh map from uriel. Only the main floor is checked; the vacuum never runs elsewhere.
"""
import os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REACH = os.path.join(HERE, ".vacuum-reach.png")
S, TX, TY = 2.505, 656.9, 634          # vacuum map units -> floor-plan units
SOLID = {"up", "down", "stairs", "closet", "pantry"}   # the vacuum can't be inside these
SOLID_MAX = 0.25                       # fail if more than this share of a solid space is reached
WALK_MIN = 0.30                        # warn if a walkable room is less reached than this
SKIP = {"passage"}                     # tiny connectors


def refresh():
    svg = subprocess.run(["ssh", "-o", "ConnectTimeout=10", "mikana@uriel",
                          "curl -s http://127.0.0.1:8093/api/map"], capture_output=True, text=True, timeout=60).stdout
    if "<svg" not in svg:
        sys.exit("couldn't fetch the vacuum map from uriel")
    gs = [m.end() for m in re.finditer(r'<g class="[^"]*"[^>]*>', svg)]
    det = svg[gs[2]:svg.find("</g>", gs[2])]          # third group = detailed room shapes
    det = re.sub(r'class="r\d"', 'fill="#000"', det)
    page = (f'<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" '
            f'viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#fff"/>'
            f'<g transform="translate({TX},{TY}) scale(-{S})">{det}</g></svg></body></html>')
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as f:
        f.write(page)
    subprocess.run(["google-chrome", "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    "--window-size=1200,900", f"--screenshot={REACH}", f.name],
                   capture_output=True, timeout=60)
    os.unlink(f.name)
    print("refreshed", REACH)


def inside(p, x, y):
    c = False
    for i in range(len(p)):
        (x1, y1), (x2, y2) = p[i], p[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def main():
    if "--refresh" in sys.argv or not os.path.exists(REACH):
        refresh()
    from PIL import Image
    im = Image.open(REACH).convert("L")
    ns = {"__name__": "check"}
    cwd = os.getcwd(); os.chdir(HERE)
    try:
        exec(open("rooms.py").read(), ns)
    finally:
        os.chdir(cwd)
    rooms, labels = ns["R"], ns["LBL"]
    fails, warns = [], []
    for key, poly in rooms.items():
        if key in SKIP:
            continue
        xs, ys = [p[0] for p in poly], [p[1] for p in poly]
        pts = [(x, y) for x in range(int(min(xs)) + 3, int(max(xs)) - 2, 4)
               for y in range(int(min(ys)) + 3, int(max(ys)) - 2, 4) if inside(poly, x, y)]
        if not pts:
            continue
        reached = sum(1 for x, y in pts if 0 <= x < 1200 and 0 <= y < 900 and im.getpixel((x, y)) < 128) / len(pts)
        name = (labels.get(key, ("",))[0] or key)
        line = f"{name:<16} reached {reached:4.0%}"
        if key in SOLID and reached > SOLID_MAX:
            fails.append(line + f"  <- drawn as stairs/closet but the vacuum drives here (max {SOLID_MAX:.0%})")
        elif key not in SOLID and reached < WALK_MIN:
            warns.append(line + "  <- walkable room the vacuum barely reaches (furniture, or a wall in the wrong place?)")
    for w in warns:
        print("WARN ", w)
    for f in fails:
        print("FAIL ", f)
    if fails:
        print(f"\nPLAN CHECK FAILED: {len(fails)} space(s) conflict with the vacuum map. "
              "Fix the drawing, or confirm the space is walk-in and add its key to SKIP.")
        sys.exit(1)
    print("plan check passed" + (f" ({len(warns)} warning(s))" if warns else ""))


if __name__ == "__main__":
    main()
