#!/usr/bin/env python3
"""
Mock RGS server for local Lunar Vault QA.

Serves the four endpoints the game calls:
  POST /wallet/authenticate
  POST /wallet/play
  POST /wallet/end-round
  GET  /bet/replay/<game>/<version>/<mode>/<event>

It returns book events that match the game's own schema, so the real UI runs:
a base-game board, a win with winInfo, and a setTotalWin.

Usage:
  python3 tools/mock-rgs.py --port 8099
"""

import argparse
import json
import random
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

API_AMOUNT_MULTIPLIER = 100_000_000

SYMBOLS = ["L1", "L2", "L3", "L4", "L5", "H1", "H2", "H3", "H4", "S", "W"]

# The game's own paytable for the high symbols, used to build a real win.
PAYTABLE = {
    "L1": {"5": 5, "4": 1, "3": 0.5},
    "L2": {"5": 3, "4": 0.7, "3": 0.3},
    "L3": {"5": 3, "4": 0.7, "3": 0.3},
    "L4": {"5": 2, "4": 0.5, "3": 0.2},
    "L5": {"5": 1, "4": 0.3, "3": 0.1},
    "H1": {"5": 20, "4": 10, "3": 5},
    "H2": {"5": 15, "4": 5, "3": 3},
    "H3": {"5": 10, "4": 3, "3": 2},
    "H4": {"5": 8, "4": 2, "3": 1},
}


def make_board(with_win: bool):
    """5 reels x 3 rows. With a win, reels 0-2 are all H1 for a 3-of-a-kind."""
    board = []
    for reel in range(5):
        col = []
        for row in range(3):
            if with_win and reel < 3:
                col.append({"name": "H1"})
            else:
                col.append({"name": random.choice(SYMBOLS)})
        board.append(col)
    return board


def make_bet(bet_id: int, with_win: bool = True):
    board = make_board(with_win)
    events = [
        {
            "index": 0,
            "type": "reveal",
            "board": board,
            "paddingPositions": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
            "anticipation": [],
            "gameType": "basegame",
        }
    ]

    total = 0
    if with_win:
        multiplier = PAYTABLE["H1"]["3"]
        amount = int(multiplier * API_AMOUNT_MULTIPLIER)
        total = amount
        events.append(
            {
                "index": 1,
                "type": "winInfo",
                "totalWin": amount,
                "wins": [
                    {
                        "symbol": "H1",
                        "kind": 1,
                        "win": amount,
                        "positions": [
                            {"reel": 0, "row": 0},
                            {"reel": 1, "row": 0},
                            {"reel": 2, "row": 0},
                        ],
                        "meta": {
                            "lineIndex": 1,
                            "multiplier": 1,
                            "winWithoutMult": amount,
                            "globalMult": 1,
                            "lineMultiplier": 1,
                        },
                    }
                ],
            }
        )
        events.append({"index": 2, "type": "setTotalWin", "amount": amount})
        events.append({"index": 3, "type": "finalWin", "amount": amount})
    else:
        events.append({"index": 1, "type": "setTotalWin", "amount": 0})
        events.append({"index": 2, "type": "finalWin", "amount": 0})

    return {
        "betID": bet_id,
        "amount": API_AMOUNT_MULTIPLIER,
        "payout": total,
        "payoutMultiplier": (total / API_AMOUNT_MULTIPLIER) if total else 0,
        "active": False,
        "state": events,
        "mode": "BASE",
        "event": None,
    }


class Handler(BaseHTTPRequestHandler):
    counter = 1000
    # The amount of the most recent /wallet/play request, so QA can assert
    # the opening bet came from the RGS's defaultBetLevel.
    last_play_amount = 0

    def log_message(self, format, *args):
        print(f"[mock-rgs] {format % args}", flush=True)

    def _send(self, payload, status=200):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send({}, 200)

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            data = {}

        path = self.path.split("?")[0]

        if path.endswith("/wallet/authenticate"):
            # Engine guideline [187]: the RGS may return a round. A round
            # with active:true is an unfinished round the game must resume.
            # A round with active:false is a CLOSED round -- it still carries
            # an amount, and the game must NOT treat it as the active stake.
            # The sessionID selects the scenario so QA can drive both.
            session_id = str(data.get("sessionID") or "")
            round_payload = None
            if "active-round" in session_id:
                round_payload = make_bet(Handler.counter)
                round_payload["active"] = True
                round_payload["event"] = 0
                round_payload["amount"] = 7 * API_AMOUNT_MULTIPLIER
                round_payload["state"] = round_payload["state"][:1]
            elif "closed-round" in session_id:
                round_payload = make_bet(Handler.counter)
                round_payload["active"] = False
                round_payload["event"] = 0
                round_payload["amount"] = 7 * API_AMOUNT_MULTIPLIER
                round_payload["state"] = round_payload["state"][:1]

            self._send(
                {
                    "balance": {"amount": 1000 * API_AMOUNT_MULTIPLIER, "currency": "USD"},
                    "round": round_payload,
                    "currency": "USD",
                    # Engine guideline [242]: the RGS supplies the opening bet
                    # and the bet levels. The game must use these rather than
                    # a hardcoded default.
                    "config": {
                        "jurisdiction": {
                            "socialCasino": False,
                            "disabledFullscreen": False,
                            "disabledTurbo": False,
                            "disabledSuperTurbo": False,
                            "disabledAutoplay": False,
                            "disabledSlamstop": False,
                            "disabledSpacebar": False,
                            "disabledBuyFeature": False,
                            "displayNetPosition": False,
                            "displayRTP": False,
                            "displaySessionTimer": False,
                            "minimumRoundDuration": 0,
                        },
                        "betLevels": [
                            level * API_AMOUNT_MULTIPLIER
                            for level in (1, 5, 25, 50, 75, 100, 200, 500, 800, 1000)
                        ],
                        # Deliberately not 1, so a hardcoded default is visible.
                        "defaultBetLevel": 25 * API_AMOUNT_MULTIPLIER,
                    },
                }
            )
            return

        if path.endswith("/wallet/play"):
            Handler.counter += 1
            amount = int(data.get("amount") or API_AMOUNT_MULTIPLIER)
            # Recorded so QA can assert the opening bet came from the RGS's
            # defaultBetLevel rather than a hardcoded default.
            Handler.last_play_amount = amount
            bet = make_bet(Handler.counter)
            bet["amount"] = amount
            self._send(
                {
                    "balance": {"amount": 990 * API_AMOUNT_MULTIPLIER, "currency": "USD"},
                    "round": bet,
                }
            )
            return

        if path.endswith("/wallet/end-round"):
            self._send({"balance": {"amount": 990 * API_AMOUNT_MULTIPLIER, "currency": "USD"}})
            return

        self._send({"error": f"unknown endpoint {path}"}, 404)

    def do_GET(self):
        path = self.path.split("?")[0]
        if "/bet/replay/" in path:
            Handler.counter += 1
            # A replay whose event id is "fail" returns an error, so QA can
            # verify the game shows an error instead of a blank screen
            # (Engine guideline [171]).
            if "fail" in path:
                self._send({"error": "ERR_REPLAY_NOT_FOUND", "message": "replay not found"}, 404)
                return
            self._send(make_bet(Handler.counter))
            return
        if path.endswith("/__last-play-amount"):
            self._send({"amount": Handler.last_play_amount})
            return
        if path.endswith("/__reset"):
            # QA resets the recorded play amount between scenarios, so a
            # stale value from the previous scenario cannot be mistaken for
            # this one's.
            Handler.last_play_amount = 0
            self._send({"reset": True})
            return
        self._send({"error": f"unknown endpoint {path}"}, 404)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8099)
    args = ap.parse_args()
    print(f"[mock-rgs] listening on 127.0.0.1:{args.port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
