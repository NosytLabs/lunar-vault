#!/usr/bin/env python3
"""
Measure the real on-screen bounds of every interactive control in Lunar Vault.

The layout code positions the controls with nested containers, pivots and
scales, so a geometry model of the source can disagree with what is actually
drawn. This harness asks the running game instead: it loads the game in
headless Chrome, resizes the viewport to each target size, and reads the
bounds of the Pixi nodes that make up the interactive controls.

It reports two things per control:

  - the global bounds of the node, in canvas pixels
  - whether the node is fully inside the canvas

A control that is drawn partly outside the canvas is cut off and cannot be
pressed with a tap on that part of it.

It reuses the CDP client from tools/qa-gameplay.py, which talks to Chrome
over a raw WebSocket and needs no third-party package.

Run it with: python3 tools/qa-canvas-bounds.py
"""

import importlib.util
import json
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PREVIEW = "http://127.0.0.1:4173"
RGS = "http://127.0.0.1:8099"
OUT = Path("/tmp/lv-canvas-bounds")

# The sizes the game has to survive. `popout-s` is the smallest landscape
# pop-out the Engine guidelines ask for.
SIZES = [
    ("popout-s", 400, 225),
    ("popout-m", 640, 360),
    ("mobile", 390, 844),
    ("desktop", 1280, 720),
]

_chrome = (
    shutil.which("google-chrome")
    or shutil.which("chromium")
    or shutil.which("chromium-browser")
)
if not _chrome:
    print("No Chrome/Chromium found; cannot run the canvas bounds check.")
    sys.exit(2)
CHROME: str = _chrome


def load_qa_module():
    """Import tools/qa-gameplay.py for its CDP client."""
    spec = importlib.util.spec_from_file_location(
        "qa_gameplay", REPO / "tools" / "qa-gameplay.py"
    )
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load tools/qa-gameplay.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


QA = load_qa_module()

# The script that runs inside the page. It finds the Pixi stage, walks the
# node tree, and reports every node that is interactive or that carries a
# visible label.
MEASURE_JS = r"""
(() => {
  // Find the stage. The app does not publish a global handle, so look for
  // any window key that looks like a Pixi application and has a stage.
  let app = null;
  for (const key of Object.keys(window)) {
    try {
      const value = window[key];
      if (value && value.stage && value.renderer) {
        app = value;
        break;
      }
    } catch (e) { /* some window properties throw on access */ }
  }

  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'no canvas' };
  const rect = canvas.getBoundingClientRect();
  const width = canvas.width;
  const height = canvas.height;
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;

  const out = {
    canvasWidth: width,
    canvasHeight: height,
    cssWidth: rect.width,
    cssHeight: rect.height,
    foundApp: !!app,
    nodes: [],
  };

  if (!app) {
    // Without the stage, fall back to the DOM: list every element that
    // could be a control with its client rect.
    out.domControls = [...document.querySelectorAll('button, [role=button], a')]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          label: (el.innerText || el.getAttribute('aria-label') || '').slice(0, 40),
          left: r.left, top: r.top, right: r.right, bottom: r.bottom,
        };
      });
    return out;
  }

  const describe = (node) => {
    // Pixi v8: node.getGlobalPosition / getBounds
    let bounds = null;
    try {
      const b = node.getBounds();
      bounds = { x: b.x, y: b.y, width: b.width, height: b.height };
    } catch (e) {
      try {
        const p = node.getGlobalPosition();
        bounds = { x: p.x, y: p.y, width: node.width || 0, height: node.height || 0 };
      } catch (e2) { return null; }
    }
    const interactive = node.eventMode && node.eventMode !== 'none';
    const label = node.label || (node.text ? String(node.text) : '');
    if (!interactive && !label) return null;
    return {
      label: label.slice(0, 40),
      interactive,
      x: bounds.x, y: bounds.y,
      width: bounds.width, height: bounds.height,
      right: bounds.x + bounds.width,
      bottom: bounds.y + bounds.height,
    };
  };

  const seen = new Set();
  const walk = (node, depth) => {
    if (!node || depth > 12 || seen.has(node)) return;
    seen.add(node);
    const d = describe(node);
    if (d) out.nodes.push(d);
    const children = node.children || [];
    for (const child of children) walk(child, depth + 1);
  };
  walk(app.stage, 0);

  // Drop the nodes that carry no distinct geometry (the stage itself).
  out.nodes = out.nodes.filter((n) => n.width > 0 && n.height > 0);
  return out;
})()
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    port = QA.free_port()
    profile = "/tmp/lv-bounds-chrome-profile"
    subprocess.run(["rm", "-rf", profile], check=False)

    proc = subprocess.Popen(
        [
            CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
            "--hide-scrollbars", "--window-size=1280,720",
            f"--remote-debugging-port={port}", f"--user-data-dir={profile}",
            f"{PREVIEW}/?rgs_url={RGS}&sessionID=bounds&currency=USD&lang=en",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    failures = 0
    try:
        ws_url = None
        for _ in range(60):
            time.sleep(0.5)
            try:
                tabs = json.load(urllib.request.urlopen(f"http://127.0.0.1:{port}/json"))
                pages = [t for t in tabs if t["type"] == "page"]
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                continue
        if not ws_url:
            raise RuntimeError("chrome did not come up")

        cdp = QA.CDP(ws_url)
        cdp.connect()
        cdp.call("Page.enable")
        cdp.call("Runtime.enable")

        # Wait for the game to boot, then get past the loading screen.
        time.sleep(12)
        cdp.key(" ", "Space", 32)
        time.sleep(10)

        for name, width, height in SIZES:
            cdp.call(
                "Emulation.setDeviceMetricsOverride",
                {"width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 820},
            )
            time.sleep(4)

            raw = cdp.evaluate(MEASURE_JS)
            cdp.screenshot(str(OUT / f"{name}.png"))

            if not raw or raw.get("error"):
                print(f"FAIL {name}: {raw}")
                failures += 1
                continue

            canvas_w = raw["canvasWidth"]
            canvas_h = raw["canvasHeight"]
            print(f"\n=== {name} ({width}x{height}) canvas {canvas_w}x{canvas_h} ===")

            nodes = raw.get("nodes") or []
            if not nodes:
                print("  FAIL no nodes measured")
                failures += 1
                continue

            # A control is a node that carries a visible label, or an
            # icon-only button of the size the game uses for its buttons.
            # Full-bleed background containers are excluded: they are
            # supposed to extend past the canvas.
            controls = []
            for node in nodes:
                if not node["interactive"]:
                    continue
                width = node["width"]
                height = node["height"]
                has_label = bool(node["label"]) and node["label"] not in ("Sprite", "Graphics")
                is_button = 20 <= width <= 45 and 20 <= height <= 45
                if has_label or is_button:
                    controls.append(node)

            # The same node is reported once per layer it appears in.
            unique = {}
            for node in controls:
                key = (
                    round(node["x"]),
                    round(node["y"]),
                    round(node["width"]),
                    round(node["height"]),
                )
                unique.setdefault(key, node)
            controls = list(unique.values())

            cut = [
                node
                for node in controls
                if node["x"] < 0
                or node["y"] < 0
                or node["right"] > canvas_w
                or node["bottom"] > canvas_h
            ]

            for node in sorted(controls, key=lambda n: (n["y"], n["x"])):
                label = node["label"] or "(icon)"
                mark = "CUT OFF" if node in cut else "ok"
                print(
                    f"  {mark:<7} {label:<16}"
                    f" x=[{node['x']:.0f}..{node['right']:.0f}]"
                    f" y=[{node['y']:.0f}..{node['bottom']:.0f}]"
                )

            # Every control must be reachable. A control that is drawn
            # partly outside the canvas cannot be tapped on that part of
            # it, so a player cannot use it.
            if cut:
                failures += 1
                print(f"  FAIL {len(cut)} control(s) are not fully on the canvas")
            else:
                print(f"  PASS {len(controls)} controls, all fully on the canvas")

            # The controls the player needs must be present. A bet that
            # cannot be raised or lowered is a defect that a bounds check
            # alone would not catch.
            present = {node["label"] for node in controls}
            required = {"MENU", "BET", "-", "+"}
            missing = sorted(required - present)
            if missing:
                failures += 1
                print(f"  FAIL missing control(s): {', '.join(missing)}")
            else:
                print("  PASS the required controls are all present")

            with open(OUT / f"{name}.json", "w") as handle:
                json.dump(raw, handle, indent=1)
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    print()
    if failures:
        print(f"{failures} check(s) failed")
        sys.exit(1)
    print("Every control is fully on the canvas at every size.")


if __name__ == "__main__":
    main()
