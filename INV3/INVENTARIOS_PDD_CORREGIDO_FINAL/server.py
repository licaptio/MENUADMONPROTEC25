import http.server, socketserver, webbrowser, os
PORT=8000
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control","no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma","no-cache")
        self.send_header("Expires","0")
        super().end_headers()
with socketserver.TCPServer(("",PORT),H) as s:
    print(f"http://localhost:{PORT}/inventarios.html")
    webbrowser.open(f"http://localhost:{PORT}/inventarios.html")
    try:s.serve_forever()
    except KeyboardInterrupt:pass
