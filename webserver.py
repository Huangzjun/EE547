from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
import json
import os
import subprocess
from datetime import datetime

request_count = 0
error_count = 0

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global request_count, error_count
        request_count += 1
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == "/ping":
            self.send_response(204)
            self.end_headers()
            return

        elif path == "/anagram":
            query_params = parse_qs(parsed_url.query)
            p = query_params.get('p', [''])[0]
            if not p or not p.isalpha():
                self.send_response(400)
                self.end_headers()
                return
            try:
                result = subprocess.run(
                    ["python3", "command-line.py", p], 
                    capture_output=True, text=True, check=True
                )
                if result.stdout.strip() == "empty" or result.stderr.strip():
                    self.send_response(400)
                    self.end_headers()
                    return
                response_data = {
                    "p": p,
                    "total": result.stdout.strip()
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(response_data).encode('utf-8'))
            except subprocess.CalledProcessError as e:
                self.send_response(400)
                self.end_headers()
                return

        elif path == "/secret":
            secret_file_path = "/tmp/secret.key"
            if os.path.exists(secret_file_path):
                with open(secret_file_path, 'r') as file:
                    secret_content = file.read()
                self.send_response(200)
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(secret_content.encode('utf-8'))
            else:
                self.send_response(404)
                self.end_headers()
                error_count += 1
            return

        elif path == "/status":
            status_data = {
                "time": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "req": request_count,
                "err": error_count
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(status_data).encode('utf-8'))
            return

        else:
            self.send_response(404)
            self.end_headers()
            error_count += 1
            return

def run(server_class=HTTPServer, handler_class=SimpleHTTPRequestHandler):
    server_address = ('', 8088) 
    httpd = server_class(server_address, handler_class)
    print("Serving on port 8088...")
    httpd.serve_forever()

if __name__ == "__main__":
    run()
