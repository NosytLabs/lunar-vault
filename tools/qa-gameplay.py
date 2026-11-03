#!/usr/bin/env python3
"""
Headless-Chrome gameplay QA for Lunar Vault.

Drives the game against the local mock RGS and captures screenshots at each
stage. Uses the CDP HTTP/WebSocket endpoints directly so it does not depend on
the browser-use harness (which decorates document.title with an emoji).

Usage: python3 tools/qa-gameplay.py [outdir]
"""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.request

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/lv-qa'
PREVIEW = 'http://127.0.0.1:4173'
RGS = 'http://127.0.0.1:8099'


def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


class CDP:
    """Minimal Chrome DevTools Protocol client over the raw WebSocket."""

    def __init__(self, ws_url):
        self.ws_url = ws_url
        self.next_id = 1
        self.sock = None
        self._buffer = b''

    def connect(self):
        import base64
        import hashlib
        from urllib.parse import urlparse

        u = urlparse(self.ws_url)
        self.sock = socket.create_connection((u.hostname, u.port), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        req = (
            f'GET {u.path} HTTP/1.1\r\n'
            f'Host: {u.hostname}:{u.port}\r\n'
            'Upgrade: websocket\r\nConnection: Upgrade\r\n'
            f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
        )
        self.sock.sendall(req.encode())
        # read the handshake response
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.sock.recv(4096)
        assert b'101' in buf.split(b'\r\n')[0], buf[:200]

    def _send_frame(self, payload):
        import struct

        data = payload.encode()
        header = bytearray([0x81])
        mask = os.urandom(4)
        n = len(data)
        if n < 126:
            header.append(0x80 | n)
        elif n < (1 << 16):
            header.append(0x80 | 126)
            header += struct.pack('>H', n)
        else:
            header.append(0x80 | 127)
            header += struct.pack('>Q', n)
        header += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(bytes(header) + masked)

    def _recv_frame(self):
        import struct

        def read(n):
            out = b''
            while len(out) < n:
                chunk = self.sock.recv(n - len(out))
                if not chunk:
                    raise ConnectionError('socket closed')
                out += chunk
            return out

        b1, b2 = read(2)
        opcode = b1 & 0x0F
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack('>H', read(2))[0]
        elif length == 127:
            length = struct.unpack('>Q', read(8))[0]
        payload = read(length)
        if opcode == 0x8:
            raise ConnectionError('server closed')
        return payload.decode('utf-8', errors='replace')

    def call(self, method, params=None):
        msg_id = self.next_id
        self.next_id += 1
        self._send_frame(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
        while True:
            msg = json.loads(self._recv_frame())
            if msg.get('id') == msg_id:
                if 'error' in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get('result', {})

    def evaluate(self, expression, await_promise=False):
        res = self.call(
            'Runtime.evaluate',
            {
                'expression': expression,
                'returnByValue': True,
                'awaitPromise': await_promise,
            },
        )
        if res.get('exceptionDetails'):
            raise RuntimeError(res['exceptionDetails'].get('text', 'eval failed'))
        return res.get('result', {}).get('value')

    def key(self, key_name, code, vk):
        self.call(
            'Input.dispatchKeyEvent',
            {'type': 'keyDown', 'key': key_name, 'code': code,
             'windowsVirtualKeyCode': vk, 'nativeVirtualKeyCode': vk},
        )
        time.sleep(0.1)
        self.call(
            'Input.dispatchKeyEvent',
            {'type': 'keyUp', 'key': key_name, 'code': code,
             'windowsVirtualKeyCode': vk, 'nativeVirtualKeyCode': vk},
        )

    def screenshot(self, path):
        res = self.call('Page.captureScreenshot', {'format': 'png'})
        import base64
        with open(path, 'wb') as fh:
            fh.write(base64.b64decode(res['data']))
        return path


def main():
    os.makedirs(OUT, exist_ok=True)
    port = free_port()
    profile = '/tmp/lv-qa-chrome-profile'
    subprocess.run(['rm', '-rf', profile], check=False)

    proc = subprocess.Popen(
        [
            'google-chrome', '--headless=new', '--disable-gpu', '--no-sandbox',
            '--hide-scrollbars', '--window-size=1440,900',
            f'--remote-debugging-port={port}', f'--user-data-dir={profile}',
            f'{PREVIEW}/?rgs_url={RGS}&sessionID=qa&currency=USD&lang=en',
        ],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )

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

        print('title:', repr(cdp.evaluate('document.title')))
        time.sleep(12)
        print('title:', repr(cdp.evaluate('document.title')))
        cdp.screenshot(f'{OUT}/01-loader.png')
        print(f'  saved {OUT}/01-loader.png')

        # advance past the loading screen
        cdp.key(' ', 'Space', 32)
        time.sleep(10)

        ext = cdp.evaluate(
            "performance.getEntriesByType('resource').map(e=>e.name)"
            ".filter(n=>n.startsWith('http')&&!n.includes('127.0.0.1'))"
        )
        print('external requests:', ext or 'none')

        cdp.screenshot(f'{OUT}/02-board.png')
        print(f'  saved {OUT}/02-board.png')

        # place a bet with the space bar
        cdp.key(' ', 'Space', 32)
        time.sleep(8)
        calls = cdp.evaluate(
            "performance.getEntriesByType('resource').filter(e=>e.name.includes('8099')).map(e=>e.name)"
        )
        print('rgs calls:', [c.split('8099')[1] for c in calls])
        cdp.screenshot(f'{OUT}/03-after-bet.png')
        print(f'  saved {OUT}/03-after-bet.png')

        # mobile viewport
        cdp.call('Emulation.setDeviceMetricsOverride',
                 {'width': 400, 'height': 225, 'deviceScaleFactor': 1, 'mobile': True})
        time.sleep(5)
        cdp.screenshot(f'{OUT}/04-popout-s.png')
        print(f'  saved {OUT}/04-popout-s.png')

        # invalid language fallback
        cdp.call('Emulation.clearDeviceMetricsOverride')
        cdp.call('Page.navigate',
                 {'url': f'{PREVIEW}/?rgs_url={RGS}&sessionID=qa&lang=zz&currency=USD'})
        time.sleep(12)
        cdp.screenshot(f'{OUT}/05-lang-fallback.png')
        print(f'  saved {OUT}/05-lang-fallback.png')

        # invalid rgs url -> must show a clear error
        cdp.call('Page.navigate', {'url': f'{PREVIEW}/?rgs_url=example.com&sessionID=qa'})
        time.sleep(14)
        body = cdp.evaluate('document.body.innerText')
        print('invalid rgs body:', repr(body[:200]))
        cdp.screenshot(f'{OUT}/06-invalid-rgs.png')
        print(f'  saved {OUT}/06-invalid-rgs.png')

        # social mode
        cdp.call('Page.navigate',
                 {'url': f'{PREVIEW}/?rgs_url={RGS}&sessionID=qa&social=true&currency=USD&lang=en'})
        time.sleep(12)
        cdp.key(' ', 'Space', 32)
        time.sleep(8)
        cdp.screenshot(f'{OUT}/07-social.png')
        print(f'  saved {OUT}/07-social.png')
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()


if __name__ == '__main__':
    main()
