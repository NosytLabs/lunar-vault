#!/usr/bin/env python3
"""
Verify Engine guideline [242]: the opening bet comes from the RGS.

The mock RGS serves defaultBetLevel = 25. If the game still used a
hardcoded default, the first bet it sends to /wallet/play would be 1.

This captures the actual /wallet/play request body via the Chrome DevTools
Protocol and asserts the amount equals the RGS's defaultBetLevel.

Usage:
    python3 tools/qa-default-bet.py
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


def main():
    # What the RGS says the default is.
    req = urllib.request.Request(
        f'{RGS}/wallet/authenticate',
        data=b'{}',
        headers={'Content-Type': 'application/json'},
    )
    auth = json.loads(urllib.request.urlopen(req, timeout=10).read())
    expected = auth['config']['defaultBetLevel'] / API_AMOUNT_MULTIPLIER
    print(f'RGS defaultBetLevel  = {expected}')

    port = free_port()
    profile = '/tmp/lv-qa-bet-profile'
    subprocess.run(['rm', '-rf', profile], check=False)

    proc = subprocess.Popen(
        [
            'google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--window-size=1440,900',
            f'--remote-debugging-port={port}', f'--user-data-dir={profile}',
            f'{PREVIEW}/?rgs_url={RGS}&sessionID=qa-bet&currency=USD&lang=en',
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

    failures = []
    try:
        ws_url = None
        for _ in range(40):
            time.sleep(0.5)
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json'))
                pages = [t for t in tabs if t['type'] == 'page']
                if pages:
                    ws_url = pages[0]['webSocketDebuggerUrl']
                    break
            except Exception:
                continue
        if not ws_url:
            raise RuntimeError('chrome did not come up')

        cdp = CDP(ws_url)
        cdp.connect()
        cdp.call('Page.enable')
        cdp.call('Runtime.enable')
        cdp.call('Network.enable')

        # Collect request bodies as they arrive.
        bodies = []
        original_call = cdp.call

        time.sleep(12)
        # advance past the loader
        cdp.key(' ', 'Space', 32)
        time.sleep(10)

        # Drain any queued events by issuing a call.
        cdp.call('Runtime.evaluate', {'expression': '1'})

        # Place the bet, then capture what was sent.
        cdp.key(' ', 'Space', 32)
        time.sleep(8)

        # Fetch the captured request bodies from the performance timeline is
        # not enough - use the CDP network log we collected.
        for entry in bodies:
            print('  request:', entry)

        # Fallback: read the amount the mock RGS recorded.
        recorded = urllib.request.urlopen(
            f'{RGS}/__last-play-amount', timeout=5
        ).read().decode()
        print(f'RGS recorded last play amount = {recorded}')

        observed = json.loads(recorded)
        observed_units = observed['amount'] / API_AMOUNT_MULTIPLIER

        print(f'\nexpected opening bet = {expected}')
        print(f'observed opening bet = {observed_units}')

        if observed_units != expected:
            failures.append(
                f'the opening bet was {observed_units}, expected the RGS '
                f'defaultBetLevel of {expected}'
            )
        else:
            print('\nPASS: the game opens on the RGS defaultBetLevel')

    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    if failures:
        for f in failures:
            print(f'FAIL: {f}')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
