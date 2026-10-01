#!/usr/bin/env python3
"""Bake the ride-stats edit into the web films.

The source is shot slow (25 fps of slowed motion), so the edit runs it fast,
eases back to true speed into the apex, holds the apex frame, then eases out
and runs fast to the end. Baking that into the file means the page plays one
film at 1x: no playbackRate changes, no pause and seek, nothing to stutter.

    python3 build_film.py [apex_frame]      default 122

ffmpeg makes the edit as a near-lossless intermediate; the web films are then
encoded like every other film on the site, by scripts/encode_video.swift
(Apple's H.264 encoder, no B-frames, short keyframe interval, site bitrates).

Needs ffmpeg/ffprobe (FFMPEG_BIN, or the rippl conda env). Prints the apex
time in the edited film; the page's APEX constant must match it.
"""
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = HERE / "media"
SRC = MEDIA / "ride-stats-source.mp4"
BIN = Path(os.environ.get("FFMPEG_BIN", "/Users/dylanbinding/Projects/rippl/rippl-env/bin"))

FPS = 25          # source frame rate
FAST = 2.25       # speed outside the turn
EASE_IN = 22      # source frames easing from FAST to 1x, ending on the apex
EASE_OUT = 25     # source frames easing from 1x back to FAST after it
HOLD = 3.0        # seconds held on the apex
LAST = 200        # last source frame: the last with the rider in shot
OUT_FPS = 50
KEYINT = 25       # frames between keyframes (0.5 s): the return seek lands fast
ROOT = HERE.parent.parent

apex = int(sys.argv[1]) if len(sys.argv) > 1 else 122
a0, a1 = 0, apex - EASE_IN              # fast
b0, b1 = a1, apex + 1                   # ease in, apex included
c0, c1 = apex + 1, apex + 1 + EASE_OUT  # ease out
d0, d1 = c1, LAST + 1                   # fast


def ramp(s0, s1, n):
    # time-remap a linear speed ramp s0 -> s1 across n source frames:
    # out(t) = L / (s1 - s0) * ln(s(t) / s0), with s(t) = s0 + (s1 - s0) t / L
    L = n / FPS
    k = L / (s1 - s0)
    return f"setpts='{k:.6f}*log(({s0}+({s1 - s0:.6f})*T/{L:.6f})/{s0})/TB'"


def graph(view):
    seg = lambda i, f0, f1: f"[s{i}]trim=start_frame={f0}:end_frame={f1},setpts=PTS-STARTPTS"
    return ";".join([
        f"[0:v]{view},split=4[s0][s1][s2][s3]",
        seg(0, a0, a1) + f",setpts=PTS/{FAST}[a]",
        seg(1, b0, b1) + "," + ramp(FAST, 1, b1 - b0) + f",tpad=stop_mode=clone:stop_duration={HOLD}[b]",
        seg(2, c0, c1) + "," + ramp(1, FAST, c1 - c0) + "[c]",
        seg(3, d0, d1) + f",setpts=PTS/{FAST}[d]",
        f"[a][b][c][d]concat=n=4:v=1:a=0,fps={OUT_FPS},format=yuv420p[v]",
    ])


def encode(view, out, w, h, kbps):
    with tempfile.TemporaryDirectory() as tmp:
        mid = Path(tmp) / "edit.mov"
        subprocess.run([str(BIN / "ffmpeg"), "-v", "error", "-y", "-i", str(SRC), "-filter_complex", graph(view),
                        "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "10", str(mid)], check=True)
        subprocess.run(["swift", str(ROOT / "scripts" / "encode_video.swift"), str(mid), str(out),
                        str(w), str(h), str(kbps), str(KEYINT)], check=True)
        return freeze(mid)   # read the hold off the clean edit: the web encode sharpens a still over its first frames


def freeze(path):
    r = subprocess.run([str(BIN / "ffmpeg"), "-i", str(path), "-vf", "freezedetect=n=0.005:d=2", "-f", "null", "-"],
                       capture_output=True, text=True)
    start = float(re.search(r"freeze_start: ([\d.]+)", r.stderr).group(1))
    end = float(re.search(r"freeze_end: ([\d.]+)", r.stderr).group(1))
    return start, end


def duration(path):
    r = subprocess.run([str(BIN / "ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout)


def poster(film, at, out):
    subprocess.run([str(BIN / "ffmpeg"), "-v", "error", "-y", "-ss", f"{at:.3f}", "-i", str(film), "-frames:v", "1",
                    "-q:v", "4", str(out)], check=True)


if __name__ == "__main__":
    h, v = MEDIA / "ride-stats-1600.mp4", MEDIA / "ride-stats-vert-720.mp4"
    # bitrates as the other 1600 / 720 films on the site (sense-board, sense-flyby)
    fs, fe = encode("scale=1600:900:flags=lanczos", h, 1600, 900, 2200)
    encode("crop=1215:2160:1312:0,scale=720:1280:flags=lanczos", v, 720, 1280, 900)
    for film, tag in ((h, ""), (v, "-vert")):
        poster(film, 0, MEDIA / f"poster{tag}-0.jpg")
        poster(film, fs + 0.5, MEDIA / f"poster{tag}-apex.jpg")
    print(f"apex frame {apex}: held {fs:.3f}-{fe:.3f} s, film {duration(h):.3f} s "
          f"({h.stat().st_size / 1e6:.1f} MB, vertical {v.stat().st_size / 1e6:.1f} MB)")
