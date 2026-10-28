"""Loopback-only development RGS using the verified, weighted publish files.

This is a local preview/testing utility, never a production wallet or frontend
fallback. Static production builds require explicit Engine launch parameters.
"""
try:
    from compression import zstd
except ImportError:
    import zstandard as zstd
from array import array
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, urlencode
from functools import partial
import argparse, bisect, csv, json, os, secrets, threading, uuid

ROOT=Path(__file__).resolve().parent.parent
MATH=ROOT/'math/salmon-run'
CONFIG=json.loads((MATH/'config.json').read_text())
REPORT=json.loads((MATH/'report.json').read_text())
INDEX=json.loads((MATH/'publish_files/index.json').read_text())

class BookStore:
    def __init__(self,mode):
        self.cost=mode['cost'];self.payouts=array('I');self.cumulative=array('Q');running=0
        for identifier,weight,payout in csv.reader((MATH/'publish_files'/mode['weights']).open()):
            running+=int(weight);self.cumulative.append(running);self.payouts.append(int(payout))
        self.cache=MATH/'.cache';self.cache.mkdir(exist_ok=True)
        key=REPORT['modes'][mode['name']]['eventsSha256'][:16]
        target=self.cache/(mode['name']+'-'+key+'.jsonl');offsets_file=target.with_suffix('.offsets')
        if not target.exists() or not offsets_file.exists():
            offsets=array('Q',[0]);position=0;temporary=target.with_suffix('.part')
            with zstd.open(MATH/'publish_files'/mode['events'],'rb') as source, temporary.open('wb') as output:
                for line in source:
                    output.write(line);position+=len(line);offsets.append(position)
            temporary.replace(target)
            with offsets_file.open('wb') as out:offsets.tofile(out)
        self.offsets=array('Q')
        with offsets_file.open('rb') as source:self.offsets.frombytes(source.read())
        assert len(self.offsets)==len(self.payouts)+1
        self.fd=os.open(target,os.O_RDONLY)
    def get(self,identifier):
        if identifier<0 or identifier>=len(self.payouts):raise IndexError()
        start=self.offsets[identifier];end=self.offsets[identifier+1]
        return json.loads(os.pread(self.fd,end-start,start))
    def choose(self):return bisect.bisect_right(self.cumulative,secrets.randbelow(self.cumulative[-1]))

STORES={mode['name']:BookStore(mode) for mode in INDEX['modes']}
SESSIONS={};LOCK=threading.RLock()

class Server(ThreadingHTTPServer):
    request_queue_size=128
    daemon_threads=True

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        if urlparse(self.path).path.endswith(('.webp','.ttf','.svg')):self.send_header('Cache-Control','public, max-age=3600')
        super().end_headers()
    def json_response(self,data,status=200):
        payload=json.dumps(data,separators=(',',':')).encode();self.send_response(status)
        self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
    def fail(self,code,message,status=400):self.json_response({'error':code,'message':message},status)
    def do_GET(self):
        parsed=urlparse(self.path);params=parse_qs(parsed.query)
        if parsed.path=='/' and 'rgs_url' not in params:
            identifier=uuid.uuid4().hex;currency=params.get('currency',['USD'])[0]
            with LOCK:SESSIONS[identifier]={'balance':1000_000000,'currency':currency,'authenticated':False,'round':None,'count':0}
            query={'rgs_url':f'http://127.0.0.1:{self.server.server_port}','sessionID':identifier,'currency':currency,'demo':'true','localPreview':'true','lang':'en','social':params.get('social',['true' if currency.startswith('X') else 'false'])[0]}
            self.send_response(302);self.send_header('Location','/?'+urlencode(query));self.end_headers();return
        if parsed.path.startswith('/bet/replay/'):
            try:
                _,_,_,game,version,mode,event=parsed.path.split('/')
                if game!=CONFIG['gameId'] or version not in (CONFIG['version'],'1'):raise ValueError()
                store=STORES[mode];book=store.get(int(event))
            except (KeyError,ValueError,IndexError):self.send_response(404);self.end_headers();return
            self.json_response({'payoutMultiplier':book['payoutMultiplier']/100,'costMultiplier':store.cost,'state':book['events']});return
        super().do_GET()
    def do_POST(self):
        try:
            if int(self.headers.get('Content-Length','0'))>16384:raise ValueError()
            data=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
        except (ValueError,TypeError):self.fail('ERR_VAL','invalid request');return
        path=urlparse(self.path).path
        with LOCK:
            session=SESSIONS.get(data.get('sessionID'))
            if not session:self.fail('ERR_VAL','unknown session');return
            if path!='/wallet/authenticate' and not session['authenticated']:self.fail('ERR_VAL','unauthenticated session');return
            currency=session['currency'];balance=lambda:{'amount':session['balance'],'currency':currency}
            if path=='/wallet/authenticate':
                session['authenticated']=True
                levels=[1_000000,2_000000,5_000000,10_000000] if currency=='JPY' else [10000,20000,50000,100000,200000,500000,1000000,2000000,5000000]
                self.json_response({'balance':balance(),'config':{'minBet':levels[0],'maxBet':levels[-1],'stepBet':levels[0],'defaultBetLevel':levels[0] if currency=='JPY' else 100000,'betLevels':levels,'gameModes':{name:{'costMultiplier':store.cost,'maxBet':levels[-1] if name=='base' else levels[-2]} for name,store in STORES.items()},'jurisdiction':{'socialCasino':currency.startswith('X'),'disabledSpacebar':False,'disabledTurbo':False,'disabledSlamstop':False,'disabledBuyFeature':False}},**({'round':session['round']} if session['round'] else {})});return
            if path=='/wallet/play':
                mode=data.get('mode');amount=data.get('amount');store=STORES.get(mode)
                step=1_000000 if currency=='JPY' else 10000;maximum=(5_000000 if mode=='river' else 10_000000) if currency=='JPY' else (2000000 if mode=='river' else 5000000)
                if not store or not isinstance(amount,int) or amount<step or amount>maximum or amount%step:self.fail('ERR_VAL','invalid amount');return
                if session['round']:self.fail('ERR_VAL','round still active');return
                if amount*store.cost>session['balance']:self.fail('ERR_IPB','insufficient balance');return
                identifier=store.choose();book=store.get(identifier);session['count']+=1;session['balance']-=amount*store.cost
                payout=amount*book['payoutMultiplier']//100
                round_data={'roundID':session['count'],'amount':amount,'mode':mode,'payout':payout,'payoutMultiplier':book['payoutMultiplier']/100,'active':payout>0,'state':book['events'],'event':'0','simulationID':identifier}
                session['round']=round_data if payout>0 else None
                self.json_response({'balance':balance(),'round':round_data});return
            if path=='/wallet/end-round':
                round_data=session['round']
                if not round_data:self.fail('ERR_VAL','no active round');return
                session['balance']+=round_data['payout'];session['round']=None;self.json_response({'balance':balance()});return
            if path=='/wallet/balance':self.json_response({'balance':balance()});return
            if path=='/bet/event':
                round_data=session['round']
                # Zero-win rounds are already closed and need no progress record.
                if not round_data:self.fail('ERR_VAL','no active round');return
                try:cursor=int(data.get('event','0'));assert 0<=cursor<=len(round_data['state'])
                except (ValueError,AssertionError):self.fail('ERR_VAL','invalid event');return
                round_data['event']=str(max(cursor,int(round_data['event'])));self.json_response({'event':round_data['event']});return
            self.fail('ERR_VAL','unknown endpoint')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=4174);parser.add_argument('--directory',default=str(ROOT/'apps/salmon-run/dist'))
    args=parser.parse_args();print(f'Local weighted-math preview: http://127.0.0.1:{args.port} (no real funds)',flush=True)
    Server(('127.0.0.1',args.port),partial(Handler,directory=args.directory)).serve_forever()
