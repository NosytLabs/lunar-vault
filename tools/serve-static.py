"""Static preview server with enough queue capacity for parallel sprite requests."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Server(ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.split('?')[0].endswith(('.webp', '.svg', '.ttf', '.wav')):
            self.send_header('Cache-Control', 'public, max-age=3600')
        super().end_headers()

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=4173)
    parser.add_argument('--directory',required=True)
    args=parser.parse_args()
    Server(('127.0.0.1',args.port),partial(Handler,directory=args.directory)).serve_forever()
