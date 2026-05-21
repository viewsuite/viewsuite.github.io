"""
Build per-rollout GIFs (target -> initial -> agent's per-turn views) to be used
in the website's same-scene comparison block.

Inputs are PNG frames already shipped under:
    public/figures/rollouts/<rollout_id>/turn_*.png

Per the existing convention used by pc_traj.gif / gs_traj.gif:
  - turn_01_01.png : target view
  - turn_01_02.png : initial view
  - turn_NN_01.png : agent's view at turn N (N >= 2)

This script produces the new GIF(s) into public/figures/render_compare/.

Usage:
    python scripts/build_render_compare_gifs.py
"""

from pathlib import Path
from PIL import Image
import imageio.v2 as imageio

ROOT = Path(__file__).resolve().parents[1]
ROLL_ROOT = ROOT / "public" / "figures" / "rollouts"
OUT_DIR = ROOT / "public" / "figures" / "render_compare"


def build_gif(rollout_id, out_name, fps=1.4, hold_anchor=2):
    """
    rollout_id     : folder under public/figures/rollouts/
    out_name       : output filename under public/figures/render_compare/
    fps            : playback rate (frames per second). 1.4 ~ 0.71s per frame.
    hold_anchor    : repeat target/initial frames this many times for emphasis.
    """
    src = ROLL_ROOT / rollout_id
    assert src.exists(), f"rollout not found: {src}"

    target = src / "turn_01_01.png"
    initial = src / "turn_01_02.png"
    # Collect agent frames sorted by turn index.
    agent_frames = sorted(
        [p for p in src.glob("turn_*_01.png") if p.name != "turn_01_01.png"]
    )

    sequence = []
    # Anchors first.
    for _ in range(hold_anchor):
        sequence.append(target)
    for _ in range(hold_anchor):
        sequence.append(initial)
    # Then the trajectory.
    for p in agent_frames:
        sequence.append(p)
    # Hold final to make success readable.
    for _ in range(hold_anchor):
        sequence.append(agent_frames[-1])

    frames = []
    target_size = None
    for p in sequence:
        img = Image.open(p).convert("RGB")
        if target_size is None:
            target_size = img.size
        elif img.size != target_size:
            img = img.resize(target_size, Image.LANCZOS)
        frames.append(img)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / out_name
    duration_ms = int(1000.0 / fps)
    imageio.mimsave(out_path, frames, format="GIF", duration=duration_ms, loop=0)
    print(f"Wrote {out_path}  ({len(frames)} frames, {duration_ms} ms/frame)")


if __name__ == "__main__":
    # scene0518_00 — both models succeed.
    build_gif("20260315-193339-703bbf46", "gemini_pc_traj.gif")   # Gemini 3.1 Pro / PC / 10 turns
    build_gif("20260316-004046-fbe82c16", "gpt54_pc_traj.gif")    # GPT-5.4       / PC /  6 turns
