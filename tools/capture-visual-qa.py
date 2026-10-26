#!/usr/bin/env python3
"""Browser QA of the compiled Engine frontend using a fake, never-money RGS."""
import json
import shutil
import subprocess
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "apps/lunar-vault/build"
OUT = ROOT / "visual-qa"
OUT.mkdir(exist_ok=True)
PORT = 8877

AUTH = {
    "balance": {"amount": 100_000_000, "currency": "USD"},
    "config": {
        "gameID": "0_0_lunar_vault",
        "minBet": 10_000,
        "maxBet": 100_000_000,
        "stepBet": 10_000,
        "defaultBetLevel": 1_000_000,
        "betLevels": [10_000, 20_000, 50_000, 100_000, 500_000, 1_000_000, 2_000_000, 5_000_000],
        "gameModes": [{"mode": "BASE", "costMultiplier": 1, "maxBet": 100_000_000}],
        "jurisdiction": {
            "socialCasino": False, "disabledFullscreen": False,
            "disabledTurbo": False, "disabledSuperTurbo": False,
            "disabledAutoplay": False, "disabledSlamstop": False,
            "disabledSpacebar": False, "disabledBuyFeature": True,
            "displayNetPosition": False, "displayRTP": False,
            "displaySessionTimer": False, "minimumRoundDuration": 0
        },
    },
}

def mock_rgs(route):
    headers = {"access-control-allow-origin": "*", "access-control-allow-headers": "*"}
    if route.request.method == "OPTIONS":
        route.fulfill(status=204, headers=headers)
    elif route.request.url.endswith("/wallet/authenticate"):
        route.fulfill(status=200, content_type="application/json", headers=headers, body=json.dumps(AUTH))
    elif route.request.url.endswith("/wallet/balance"):
        route.fulfill(status=200, content_type="application/json", headers=headers,
                      body=json.dumps({"balance": AUTH["balance"]}))
    else:
        # No play or real-money operation is ever simulated in this visual smoke test.
        route.fulfill(status=400, content_type="application/json", headers=headers,
                      body=json.dumps({"error": "ERR_VAL", "message": "No play fixture in visual QA"}))

def main():
    if not (DIST / "index.html").exists():
        raise SystemExit("Missing built index.html")
    chrome = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        raise SystemExit("Chrome/Chromium missing on runner")
    server = subprocess.Popen(["python3", "-m", "http.server", str(PORT), "--bind", "127.0.0.1", "--directory", str(DIST)],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results = []
    try:
        time.sleep(1)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, executable_path=chrome,
                                                 args=["--no-sandbox", "--disable-dev-shm-usage"])
            for width, height in [(1280, 720), (1024, 576), (800, 450), (400, 225), (425, 812)]:
                page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error) + "\\n" + (error.stack if getattr(error, "stack", None) else "")))
                page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
                page.route("**/wallet/**", mock_rgs)
                page.goto(
                    f"http://127.0.0.1:{PORT}/?sessionID=qa-only&rgs_url=fake-rgs.invalid&lang=en&currency=USD&device=desktop&demo=true",
                    wait_until="domcontentloaded", timeout=30000,
                )
                page.wait_for_timeout(5500)
                page.screenshot(path=str(OUT / f"loading-{width}x{height}.png"))
                page.keyboard.press("Space")
                page.wait_for_timeout(1400)
                page.screenshot(path=str(OUT / f"game-{width}x{height}.png"))
                canvas_count = page.locator("canvas").count()
                result = {"viewport": f"{width}x{height}", "canvas_count": canvas_count, "errors": errors[-20:]}
                results.append(result)
                page.close()
            browser.close()
        (OUT / "result.json").write_text(json.dumps(results, indent=2))
        print(json.dumps(results, indent=2))
        if any(item["canvas_count"] == 0 for item in results):
            raise SystemExit("One or more QA viewports failed to render a canvas")
        if any(item["errors"] for item in results):
            raise SystemExit("Game logged a JavaScript/runtime error during viewport QA")
    finally:
        server.terminate()
        server.wait(timeout=5)

if __name__ == "__main__":
    main()
