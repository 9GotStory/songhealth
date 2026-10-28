#!/usr/bin/env python3
"""T036 recheck: read-only Vite HMR WebSocket probe for the development runtime.

Performs the handshake a browser tab makes (same origin, `vite-hmr` subprotocol, the
page token served in /@vite/client) through the published port and reads the server's
first message; then a negative control without the token. Sends no file change, so no
other client is reloaded. Never prints the token. Exit 0 when both checks pass.
"""
import base64
import json
import os
import re
import socket
import sys
import urllib.request

HOST, PORT = "127.0.0.1", 4324
ORIGIN = f"http://{HOST}:{PORT}"


def page_token():
    src = urllib.request.urlopen(ORIGIN + "/@vite/client", timeout=30).read().decode()
    m = re.search(r'^const wsToken = "([^"]+)";', src, re.M)
    return m.group(1) if m else None


def handshake(path):
    s = socket.create_connection((HOST, PORT), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    s.sendall((f"GET {path} HTTP/1.1\r\nHost: {HOST}:{PORT}\r\nOrigin: {ORIGIN}\r\n"
               "Upgrade: websocket\r\nConnection: Upgrade\r\n"
               f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n"
               "Sec-WebSocket-Protocol: vite-hmr\r\n\r\n").encode())
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = s.recv(4096)
        if not chunk:
            break
        buf += chunk
    head, _, rest = buf.partition(b"\r\n\r\n")
    return s, head.split(b"\r\n", 1)[0].decode(errors="replace"), rest


def first_text_frame(s, buf):
    def need(n):
        nonlocal buf
        while len(buf) < n:
            chunk = s.recv(4096)
            if not chunk:
                raise EOFError("connection closed before a full frame")
            buf += chunk
    need(2)
    opcode, n, off = buf[0] & 0x0F, buf[1] & 0x7F, 2
    if n == 126:
        need(4)
        n, off = int.from_bytes(buf[2:4], "big"), 4
    elif n == 127:
        need(10)
        n, off = int.from_bytes(buf[2:10], "big"), 10
    need(off + n)
    return opcode, buf[off:off + n]


ok = True
token = page_token()
if not token:
    print("FAIL: /@vite/client serves no wsToken")
    sys.exit(1)
s, status, rest = handshake(f"/?token={token}")
if status.split(" ")[1:2] != ["101"]:
    print(f"FAIL: browser-equivalent handshake -> {status or 'connection closed'}")
    ok = False
else:
    opcode, payload = first_text_frame(s, rest)
    msg = json.loads(payload) if opcode == 1 else {}
    if msg.get("type") == "connected":
        print(f"PASS: browser-equivalent HMR handshake (Origin {ORIGIN}, vite-hmr, page token) "
              f"-> {status}; first message type 'connected'")
    else:
        print(f"FAIL: unexpected first frame (opcode {opcode})")
        ok = False
s.close()

s, status, _ = handshake("/")
s.close()
if status.split(" ")[1:2] == ["101"]:
    print("FAIL: negative control: a tokenless connection with an Origin header was accepted")
    ok = False
else:
    print(f"PASS: negative control: tokenless connection with an Origin header refused "
          f"({status or 'connection closed'})")
print("HMR-WS: PASS" if ok else "HMR-WS: FAIL")
sys.exit(0 if ok else 1)
