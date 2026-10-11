#!/usr/bin/env python3
"""CMD Power: private Wake-on-LAN relay on an always-on device on the home LAN.

Bind only to 127.0.0.1. Publish using an authenticated HTTPS tunnel if desired;
NEVER port-forward this unauthenticated service to the internet.
"""
import os
import re
import socket
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TOKEN = os.environ.get("CMD_POWER_RELAY_KEY", "")
MAC = os.environ.get("CMD_POWER_PC_MAC", "")
PORT = int(os.environ.get("CMD_POWER_RELAY_PORT", "8765"))
HOST = "127.0.0.1"

def magic_packet(mac: str):
    address = re.sub(r"[:-]", "", mac).upper()
    if not re.fullmatch(r"[0-9A-F]{12}", address):
        raise ValueError("Invalid MAC address")
    return b"\xff" * 6 + bytes.fromhex(address) * 16

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/wake":
            self.send_error(404)
            return
        if len(TOKEN) < 32 or not hmac.compare_digest(
            self.headers.get("Authorization", ""), "Bearer " + TOKEN
        ):
            self.send_error(401)
            return
        if int(self.headers.get("Content-Length", "0")) > 500:
            self.send_error(413)
            return
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        if b'"target":"pc"' not in body and b'"target": "pc"' not in body:
            self.send_error(400)
            return
        try:
            packet = magic_packet(MAC)
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as udp:
                udp.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                udp.sendto(packet, ("255.255.255.255", 9))
        except (OSError, ValueError) as exc:
            self.send_error(500, str(exc))
            return
        self.send_response(202)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b'{"ok":true,"sent":true,"poweredOnConfirmed":false}')
    def log_message(self, *args):
        return

if __name__ == "__main__":
    if len(TOKEN) < 32 or not re.fullmatch(r"[0-9A-Fa-f:\-]{12,17}", MAC):
        raise SystemExit("Set CMD_POWER_RELAY_KEY (32+ chars) and CMD_POWER_PC_MAC first")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
