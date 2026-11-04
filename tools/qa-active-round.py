#!/usr/bin/env python3
"""
Verify Engine guideline [187]: an active round restores its bet amount.

The guideline says:

    If authenticate returns `round` with `active: true`, the game resumes
    that round and the selected bet becomes `round.amount`, not
    `defaultBetLevel`. The stake shown after the resumed round finishes, and
    the next bet, must still be that amount. With no active round, use
    `defaultBetLevel`.

The trap this harness exists for: a CLOSED round also carries an `amount`.
The RGS sends the last round's details even when it is finished. A game that
treats "the authenticate response has a round with an amount" as "there is an
active round" opens on the stale round's stake instead of the RGS's default.

This drives the real game in headless Chrome against the mock RGS and reads
the amount the game actually sends to /wallet/play.

Three scenarios, one per sessionID:
  * default-bet    -> no round at all             -> must use defaultBetLevel (25)
  * active-round   -> round with active:true      -> must use round.amount (7)
  * closed-round   -> round with active:false     -> must use defaultBetLevel (25)

Usage:
    python3 tools/qa-active-round.py
"""

import importlib.util
import json
import os
import subprocess
import sys
import time
import urllib.request

# The harness lives at qa-gameplay.py, whose name is not a valid module
# identifier, so load it by path.
_spec = importlib.util.spec_from_file_location(
    'qa_gameplay',
    os.path.join(os.path.dirname(os.path.abspath(__file__)), 'qa-gameplay.py'),
)
if _spec is None or _spec.loader is None:
    raise RuntimeError('could not load qa-gameplay.py')
_qa = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_qa)
CDP = _qa.CDP
free_port = _qa.free_port

PREVIEW = 'http://127.0.0.1:4173'
RGS = 'http://127.0.0.1:8099'
API_AMOUNT_MULTIPLIER = 100_000_000

DEFAULT_BET = 25
ROUND_BET = 7

SCENARIOS = (
    # sessionID,             expected, what the RGS returns
    ('default-bet', DEFAULT_BET, 'no round in the authenticate response'),
    ('active-round', ROUND_BET, 'a round with active:true'),
    ('closed-round', DEFAULT_BET, 'a round with active:false (a closed round)'),
)


def rgs_default_bet():
    req = urllib.request.Request(
        f'{RGS}/wallet/authenticate',
        data=b'{}',
        headers={'Content-Type': 'application/json'},
    )
    auth = json.loads(urllib.request.urlopen(req, timeout=10).read())
    return auth['config']['defaultBetLevel'] / API_AMOUNT_MULTIPLIER


def reset_recorded_play():
    """Clear the mock RGS's recorded play amount."""
    try:
        urllib.request.urlopen(f'{RGS}/__reset', timeout=5).read()
    except Exception:
        pass


def play_amount_for(session_id):
    """Launch the game with session_id, place one bet, return the amount sent."""
    reset_recorded_play()
    port = free_port()
    profile = f'/tmp/lv-qa-active-{session_id}'
    subprocess.run(['rm', '-rf', profile], check=False)

    proc = subprocess.Popen(
        [
            'google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--window-size=1440,900',
            f'--remote-debugging-port={port}', f'--user-data-dir={profile}',
            f'{PREVIEW}/?rgs_url={RGS}&sessionID={session_id}&currency=USD&lang=en',
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    try:
        ws_url = None
        for _ in range(60):
            time.sleep(0.5)
            try:
                tabs = json.load(
                    urllib.request.urlopen(f'http://127.0.0.1:{port}/json', timeout=5)
                )
                pages = [t for t in tabs if t.get('type') == 'page']
                if pages:
                    ws_url = pages[0]['webSocketDebuggerUrl']
                    break
            except Exception:
                continue
        if not ws_url:
            return None, 'the game never opened a page'

        cdp = CDP(ws_url)
        cdp.connect()
        cdp.call('Page.enable')
        cdp.call('Runtime.enable')

        # The loader takes a while, and the first space press advances past
        # it. These are the timings qa-default-bet.py uses and they work.
        time.sleep(12)
        try:
            cdp.key(' ', 'Space', 32)   # advance past the loader
        except Exception as exc:
            return None, f'could not press space: {exc}'
        time.sleep(10)

        # Drain any queued events, then place the bet.
        try:
            cdp.call('Runtime.evaluate', {'expression': '1'})
            cdp.key(' ', 'Space', 32)
        except Exception as exc:
            return None, f'could not place the bet: {exc}'

        amount = None
        for _ in range(40):
            time.sleep(0.5)
            try:
                raw = json.loads(
                    urllib.request.urlopen(
                        f'{RGS}/__last-play-amount', timeout=5).read()
                )
            except Exception:
                continue
            # The mock records 0 until a play request has arrived.
            if raw.get('amount'):
                amount = raw['amount'] / API_AMOUNT_MULTIPLIER
                break

        return amount, None
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
        subprocess.run(['rm', '-rf', profile], check=False)


def main():
    print(f'RGS defaultBetLevel = {rgs_default_bet()}')
    print(f'RGS active/closed round amount = {ROUND_BET}')
    print()

    failures = []
    for session_id, expected, description in SCENARIOS:
        amount, error = play_amount_for(session_id)
        if error:
            failures.append(f'{session_id}: {error}')
            print(f'FAIL  {session_id:14s} {error}')
            continue
        if amount is None:
            failures.append(f'{session_id}: the game never sent a /wallet/play request')
            print(f'FAIL  {session_id:14s} no /wallet/play request was sent')
            continue
        if amount != expected:
            failures.append(
                f'{session_id}: the game opened on {amount}, expected {expected} '
                f'({description})'
            )
            print(f'FAIL  {session_id:14s} opened on {amount}, expected {expected} '
                  f'({description})')
            continue
        print(f'ok    {session_id:14s} opened on {amount} ({description})')

    print()
    if failures:
        print(f'{len(failures)} failure(s):')
        for f in failures:
            print(f'  - {f}')
        return 1

    print('all scenarios passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
