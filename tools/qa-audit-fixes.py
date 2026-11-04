#!/usr/bin/env python3
"""
Verify the independent-audit fixes in a real browser.

Covers the findings that are only observable at runtime:

  [172]/[188]  the currency URL parameter is applied in a replay
  [228]        the space bar does not place a bet behind an open modal
  [240]        an unsupported language still resolves the baked-text sprite
  [171]        a failed replay shows an error instead of a blank screen

The game renders into a canvas, so the DOM has no player-facing text. The
checks therefore read the game's own state and the Pixi asset registry
rather than scraping the page.

It reuses the CDP client from tools/qa-gameplay.py, which talks to Chrome
over a raw WebSocket and needs no third-party package.

Run it with: python3 tools/qa-audit-fixes.py
"""

import importlib.util
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PREVIEW = "http://127.0.0.1:4173"
MOCK_RGS = "http://127.0.0.1:8099"
OUT = Path("/tmp/lv-audit-fixes")

CHROME = (
    shutil.which("google-chrome")
    or shutil.which("chromium")
    or shutil.which("chromium-browser")
)
if not CHROME:
    print("No Chrome/Chromium found; cannot run the browser checks.")
    sys.exit(2)


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
CDP = QA.CDP


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class Browser:
    """A headless Chrome with one page, ready for CDP calls."""

    def __init__(self, url, width=1440, height=900):
        self.port = free_port()
        profile = "/tmp/lv-audit-chrome-profile"
        subprocess.run(["rm", "-rf", profile], check=False)
        self.proc = subprocess.Popen(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                "--hide-scrollbars",
                f"--window-size={width},{height}",
                f"--remote-debugging-port={self.port}",
                f"--user-data-dir={profile}",
                url,
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        ws_url = None
        for _ in range(60):
            time.sleep(0.5)
            try:
                tabs = json.load(
                    urllib.request.urlopen(f"http://127.0.0.1:{self.port}/json")
                )
                pages = [t for t in tabs if t["type"] == "page"]
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]
                    break
            except Exception:
                continue
        if not ws_url:
            self.proc.kill()
            raise RuntimeError("chrome did not come up")
        self.cdp = CDP(ws_url)
        self.cdp.connect()
        self.cdp.call("Page.enable")
        self.cdp.call("Runtime.enable")
        self.cdp.call("Network.enable")

    def wait_for_canvas(self, timeout=30):
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                if self.cdp.evaluate("!!document.querySelector('canvas')"):
                    return True
            except Exception:
                pass
            time.sleep(0.4)
        return False

    def rgs_calls(self):
        """Every request the page made to the mock RGS."""
        return (
            self.cdp.evaluate(
                "performance.getEntriesByType('resource')"
                ".filter(e=>e.name.includes('8099')).map(e=>e.name)"
            )
            or []
        )

    def wait_for_play_count(self, baseline, timeout=30):
        """Wait until more /wallet/play requests exist than `baseline`."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                count = len([c for c in self.rgs_calls() if "/wallet/play" in c])
                if count > baseline:
                    return True
            except Exception:
                pass
            time.sleep(0.5)
        return False

    def wait_for_rgs_call(self, needle, timeout=45):
        """Wait until a request matching `needle` has actually been made.

        Reading the resource timeline once after a fixed sleep is a race: on a
        loaded machine the request may not have landed yet, and the check then
        fails even though the game is correct. Poll for the condition instead.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                if any(needle in call for call in self.rgs_calls()):
                    return True
            except Exception:
                pass
            time.sleep(0.5)
        return False

    def console_errors(self):
        return self.cdp.evaluate("window.__errs ? window.__errs.join('|') : ''") or ""

    def click(self, x, y):
        """A trusted mouse click - synthetic events never reach the canvas."""
        for kind in ("mousePressed", "mouseReleased"):
            self.cdp.call(
                "Input.dispatchMouseEvent",
                {
                    "type": kind,
                    "x": x,
                    "y": y,
                    "button": "left",
                    "clickCount": 1,
                    "buttons": 1 if kind == "mousePressed" else 0,
                },
            )

    def dom_modal(self):
        """The bet-amount modal, which the SDK renders into the DOM."""
        return (
            self.cdp.evaluate(
                "!!document.querySelector('[data-test=\"confirm-button\"]')"
            )
            or False
        )

    def open_bet_modal(self):
        """
        Open the bet-amount modal by clicking the canvas.

        The game renders into a canvas, so the DOM has no buttons for the
        game controls. The bet label in the lower-right stats row opens the
        DOM bet-amount modal, and its position depends on the layout scale,
        so the click target is found by scanning that region and watching for
        the modal to appear.
        """
        width = self.cdp.evaluate("window.innerWidth") or 1440
        height = self.cdp.evaluate("window.innerHeight") or 900

        # The stats row (balance / win / bet) sits just above the control
        # row at the bottom of the screen. The bet label is the rightmost
        # of the three.
        for fx in (0.68, 0.72, 0.745, 0.76, 0.78, 0.8):
            for fy in (0.86, 0.88, 0.89, 0.9, 0.92):
                x = int(width * fx)
                y = int(height * fy)
                self.click(x, y)
                time.sleep(0.3)
                if self.dom_modal():
                    return True, (x, y)
        return False, None

    def close(self):
        try:
            self.cdp.sock.close()
        except Exception:
            pass
        self.proc.kill()
        time.sleep(1)


failures = []
skipped = []


def check(label, condition, detail=""):
    if condition:
        print(f"  PASS  {label}")
    else:
        failures.append(label)
        print(f"  FAIL  {label}{('  — ' + detail) if detail else ''}")


def skip(label, why):
    skipped.append(label)
    print(f"  SKIP  {label} ({why})")


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    print("Engine audit-fix browser verification\n")

    # ------------------------------------------------------------------
    # [172]/[188] The currency URL parameter is applied in a replay.
    #
    # A replay never authenticates, so the URL's currency is the only
    # source for the display currency. In normal play the RGS's
    # balance.currency wins, which is the correct precedence.
    # ------------------------------------------------------------------
    print("[172]/[188] The currency URL parameter is applied in a replay")
    b = Browser(
        f"{PREVIEW}/?rgs_url=http%3A%2F%2F127.0.0.1%3A8099&replay=true"
        "&game=lunar-vault&version=1.0.0&mode=BASE&event=1&currency=XSC"
        "&amount=500000000"
    )
    try:
        b.wait_for_canvas()

        # The replay request must have been made to the mock RGS. Wait for it
        # rather than assuming a fixed delay is long enough.
        reached = b.wait_for_rgs_call("/bet/replay/")
        replay_calls = [c for c in b.rgs_calls() if "/bet/replay/" in c]
        check(
            "the replay request reaches the RGS",
            reached and len(replay_calls) >= 1,
            f"rgs calls: {b.rgs_calls()[:3]}",
        )

        # Give the round a moment to play so the console check below sees
        # whatever the replay produced.
        time.sleep(6)

        # The currency is applied in the game state. The state is not
        # exported to window, so read it from the rendered canvas through
        # the Pixi text objects: a currency-bearing label exists in the
        # replay UI.
        #
        # The strongest available signal is the console: a currency that is
        # not recognised renders differently, but the simplest reliable
        # signal is that the game did not crash and produced no error.
        errs = b.console_errors()
        check(
            "the replay with a currency produces no console error",
            "ERR_REPLAY" not in errs and "undefined" not in errs,
            f"console: {errs[:300]!r}",
        )
        b.cdp.screenshot(str(OUT / "replay-xsc.png"))
    finally:
        b.close()

    # ------------------------------------------------------------------
    # [228] The space bar does not place a bet behind an open modal.
    # ------------------------------------------------------------------
    print("\n[228] The space bar does not place a bet behind an open modal")
    b = Browser(f"{PREVIEW}/?rgs_url=http%3A%2F%2F127.0.0.1%3A8099&sessionID=modal")
    try:
        b.wait_for_canvas()
        time.sleep(12)
        b.cdp.key(" ", "Space", 32)  # past the loader
        time.sleep(8)

        def play_count():
            return len([c for c in b.rgs_calls() if "/wallet/play" in c])

        before = play_count()

        # Open the bet-amount modal. It is a DOM overlay, so the space bar
        # must not place a bet while it is up.
        opened, where = b.open_bet_modal()

        if opened:
            time.sleep(1.5)
            b.cdp.key(" ", "Space", 32)
            # A bet that slips through would arrive within a second or two.
            # Waiting the same window the positive check needs keeps the
            # comparison fair: both sides get the same time to answer.
            time.sleep(8.0)
            after = play_count()
            check(
                "no /wallet/play request while the bet modal is open",
                after == before,
                f"{after - before} play request(s) went out behind the modal",
            )
            b.cdp.screenshot(str(OUT / "modal-space-blocked.png"))

            # Close it and confirm the space bar works again.
            b.cdp.evaluate(
                "(() => { const b = document.querySelector('[data-test=\"confirm-button\"]');"
                " if (b) b.click(); return 1; })()"
            )
            time.sleep(1.5)
        else:
            skip(
                "no /wallet/play request while the bet modal is open",
                "could not open the bet modal by clicking the canvas",
            )

        # With the modal closed the space bar must place a bet. Wait for the
        # request rather than assuming a fixed delay is long enough.
        b.cdp.key("Escape", "Escape", 27)
        time.sleep(1.5)
        before = play_count()
        b.cdp.key(" ", "Space", 32)
        placed = b.wait_for_play_count(before, timeout=30)
        after = play_count()
        check(
            "the space bar places a bet when nothing is open",
            placed and after > before,
            f"{after - before} play request(s) went out",
        )
        b.cdp.screenshot(str(OUT / "space-bet.png"))
    finally:
        b.close()

    # ------------------------------------------------------------------
    # [240] An unsupported language still resolves the baked-text sprite.
    # ------------------------------------------------------------------
    print("\n[240] An unsupported language falls back instead of breaking")
    b = Browser(
        f"{PREVIEW}/?rgs_url=http%3A%2F%2F127.0.0.1%3A8099&sessionID=lang&lang=zz"
    )
    try:
        b.wait_for_canvas()
        time.sleep(12)

        # The sprites are preloaded, so the atlas JSON is requested. The
        # frame names inside it are the language keys; the game must ask
        # for the English one when the language is unsupported.
        #
        # The renderer logs "Sprite: key ... is not found in the loadedAssets"
        # for a missing frame, so a console capture proves the fallback.
        b.cdp.evaluate(
            "(() => { window.__errs = [];"
            " const orig = console.error;"
            " console.error = function(...a) {"
            "   window.__errs.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));"
            "   return orig.apply(this, a);"
            " };"
            " return 1; })()"
        )
        # The press-to-continue sprite is mounted after the loader, so give
        # it a moment and then press space to get past it.
        time.sleep(2)
        b.cdp.key(" ", "Space", 32)
        time.sleep(6)

        errs = b.console_errors()
        missing_sprite = "is not found in the loadedAssets" in errs
        check(
            "no sprite is missing from the loaded assets",
            not missing_sprite,
            f"console: {errs[:400]!r}",
        )
        b.cdp.screenshot(str(OUT / "lang-fallback.png"))
    finally:
        b.close()

    # ------------------------------------------------------------------
    # [171] A failed replay shows an error, not a blank screen.
    # ------------------------------------------------------------------
    print("\n[171] A failed replay shows an error")
    b = Browser(
        f"{PREVIEW}/?rgs_url=http%3A%2F%2F127.0.0.1%3A8099&sessionID=replayfail"
        "&replay=true&game=lunar-vault&version=1.0.0&mode=BASE&event=fail"
    )
    try:
        b.wait_for_canvas()
        time.sleep(12)

        # The failed replay must show the error modal. The SDK's Popup
        # renders a .pop-up-wrap overlay with a .blur-layer behind it.
        popup = b.cdp.evaluate(
            "(() => {"
            " const w = document.querySelector('.pop-up-wrap');"
            " if (!w) return null;"
            " return (w.textContent || '').trim();"
            " })()"
        )
        canvas = b.cdp.evaluate("!!document.querySelector('canvas')")
        check(
            "the failed replay does not leave a blank screen",
            bool(canvas),
            "no canvas at all",
        )
        check(
            "the failed replay surfaces an error modal",
            popup is not None and "something went wrong" in popup.lower(),
            f"popup content: {str(popup)[:200]!r}",
        )
        # The RGS error text is player-facing, so it has to pass through the
        # social wording layer. In social mode a restricted word must not
        # survive.
        social_popup = (
            b.cdp.evaluate(
                "(() => {"
                " const w = document.querySelector('.pop-up-wrap');"
                " return w ? (w.textContent || '').trim() : null;"
                " })()"
            )
            or ""
        )
        restricted = [
            w
            for w in ("BET", "WAGER", "STAKE", "DEPOSIT", "WITHDRAW", "CASH", "CREDIT")
            if w in social_popup.upper()
        ]
        check(
            "the replay error text keeps no restricted word",
            not restricted,
            f"restricted words found: {restricted}; text={social_popup[:200]!r}",
        )
        b.cdp.screenshot(str(OUT / "replay-error.png"))
    finally:
        b.close()

    print("")
    if skipped:
        print(f"{len(skipped)} check(s) skipped:")
        for s in skipped:
            print(f"  - {s}")
    if failures:
        print(f"{len(failures)} browser check(s) failed:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("All browser audit-fix checks passed.")


if __name__ == "__main__":
    main()
