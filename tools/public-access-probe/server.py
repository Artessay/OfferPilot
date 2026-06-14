#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import socket
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

STARTED_AT = datetime.now(timezone.utc).isoformat()


class ProbeHandler(BaseHTTPRequestHandler):
    server_version = "OfferPilotPublicProbe/0.1"

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        if parsed_url.path not in {"/", "/health"}:
            self.send_json(
                404,
                {
                    "ok": False,
                    "error": "not_found",
                    "message": "Use / or /health to test reachability.",
                },
            )
            return

        probe_token = getattr(self.server, "probe_token", "")
        if probe_token:
            query_token = parse_qs(parsed_url.query).get("token", [""])[0]
            header_token = self.headers.get("X-Probe-Token", "")
            if probe_token not in {query_token, header_token}:
                self.send_json(
                    401,
                    {
                        "ok": False,
                        "error": "unauthorized",
                        "message": "Network reached the probe, but the token is missing or wrong.",
                    },
                )
                return

        self.send_json(
            200,
            {
                "ok": True,
                "message": "public-access-probe reachable",
                "server_time_utc": datetime.now(timezone.utc).isoformat(),
                "started_at_utc": STARTED_AT,
                "path": parsed_url.path,
                "client_ip": self.client_address[0],
                "host_header": self.headers.get("Host"),
                "x_forwarded_for": self.headers.get("X-Forwarded-For"),
                "user_agent": self.headers.get("User-Agent"),
            },
        )

    def send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string: str, *args: Any) -> None:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        print(f"{timestamp} {self.client_address[0]} {format_string % args}")


def local_ipv4_addresses() -> list[str]:
    addresses: set[str] = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            address = info[4][0]
            if not address.startswith("127."):
                addresses.add(address)
    except OSError:
        pass
    return sorted(addresses)


def env_port() -> int:
    value = os.getenv("PUBLIC_PROBE_PORT") or os.getenv("PORT") or "18080"
    return int(value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Tiny HTTP probe for public network reachability tests.")
    parser.add_argument("--host", default=os.getenv("PUBLIC_PROBE_HOST", "0.0.0.0"))
    parser.add_argument("--port", type=int, default=env_port())
    parser.add_argument("--token", default=os.getenv("PUBLIC_PROBE_TOKEN", ""))
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), ProbeHandler)
    server.probe_token = args.token

    print(f"Public access probe listening on http://{args.host}:{args.port}")
    print("Local check: curl http://127.0.0.1:%s/health%s" % (args.port, f"?token={args.token}" if args.token else ""))
    for address in local_ipv4_addresses():
        print("LAN check:   curl http://%s:%s/health%s" % (address, args.port, f"?token={args.token}" if args.token else ""))
    if args.token:
        print("Token is enabled. Requests must include ?token=... or X-Probe-Token.")
    else:
        print("Token is disabled. Set PUBLIC_PROBE_TOKEN to avoid an open unauthenticated probe.")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping probe.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
