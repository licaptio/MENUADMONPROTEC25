from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser

PUERTO = 8000

class Handler(SimpleHTTPRequestHandler):
    pass

print(f"Servidor iniciado en:")
print(f"http://localhost:{PUERTO}")

webbrowser.open(f"http://localhost:{PUERTO}/index.html")

HTTPServer(("0.0.0.0", PUERTO), Handler).serve_forever()