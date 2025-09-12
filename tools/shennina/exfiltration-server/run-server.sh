#!/bin/bash

# Shennina Exfiltration Server
echo "🚀 Starting Shennina Exfiltration Server..."

# Configuration
PORT=${1:-8080}
HOST=${2:-0.0.0.0}

echo "📡 Server will listen on $HOST:$PORT"

# Créer un serveur HTTP simple pour la collecte de données
python3 -c "
import http.server
import socketserver
import json
import datetime
import os

class ExfiltrationHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        # Log des données reçues
        timestamp = datetime.datetime.now().isoformat()
        log_entry = {
            'timestamp': timestamp,
            'source_ip': self.client_address[0],
            'data': post_data.decode('utf-8', errors='ignore'),
            'headers': dict(self.headers)
        }
        
        # Sauvegarder dans un fichier de log
        os.makedirs('/tmp/shennina-exfiltration', exist_ok=True)
        with open('/tmp/shennina-exfiltration/data.log', 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        
        print(f'[{timestamp}] Data received from {self.client_address[0]}')
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{\"status\": \"received\"}')
    
    def do_GET(self):
        if self.path == '/status':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{\"status\": \"running\", \"service\": \"shennina-exfiltration\"}')
        else:
            super().do_GET()

with socketserver.TCPServer(('$HOST', $PORT), ExfiltrationHandler) as httpd:
    print(f'✅ Exfiltration server running on http://$HOST:$PORT')
    print('📊 Data will be logged to /tmp/shennina-exfiltration/data.log')
    httpd.serve_forever()
"
