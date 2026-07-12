from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import webbrowser
import threading

HOST = "127.0.0.1"
PORT = 8000

BASE_DIR = Path(__file__).resolve().parent
os.chdir(BASE_DIR)

url = f"http://{HOST}:{PORT}/"

print("=" * 55)
print("PROVSOFT · CARGADOR CFDI PDD")
print(f"Abriendo: {url}")
print("Para cerrar el servidor presiona CTRL + C")
print("=" * 55)

threading.Timer(1.0, lambda: webbrowser.open(url)).start()

try:
    ThreadingHTTPServer((HOST, PORT), SimpleHTTPRequestHandler).serve_forever()
except KeyboardInterrupt:
    print("\nServidor cerrado.")
