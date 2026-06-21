import http.server
import socketserver
import webbrowser
import threading
import os

PORT = 8000
DIRECTORIO = os.path.dirname(os.path.abspath(__file__))
os.chdir(DIRECTORIO)

class CustomHandler(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        # Permitir módulos ES y CORS local
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def guess_type(self, path):
        if path.endswith(".js"):
            return "application/javascript"
        return super().guess_type(path)

def abrir_navegador():
    webbrowser.open(f"http://localhost:{PORT}/index.html")

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"Servidor corriendo en http://localhost:{PORT}/index.html")
    threading.Timer(1, abrir_navegador).start()
    httpd.serve_forever()
