"""Original finite Lunar Vault development books. Python 3.12+ and zstandard.

This is a reproducible development distribution, not certification or approval.
"""
from pathlib import Path
try:
    from compression import zstd
except ImportError:
    import zstandard as zstd
import argparse, hashlib, json, random
from distribution import calibrate, statistics_report
ROOT=Path(__file__).resolve().parent
CONFIG=json.loads((ROOT/'config.json').read_text())

def evaluate_lines(board):
    wins=[]
    for number,rows in enumerate(CONFIG['lines'],1):
        symbols=[board[r][row+1] for r,row in enumerate(rows)]
        names=[s['name'] for s in symbols]
        leading=0
        while leading<5 and names[leading]=='W':leading+=1
        name=names[leading] if leading<5 else None
        count=leading
        if name:
            while count<5 and names[count] in (name,'W'):count+=1
        wild=CONFIG['paytable']['W'].get(str(leading),0)
        regular=CONFIG['paytable'].get(name,{}).get(str(count),0)
        if wild>regular:name,count,base='W',leading,wild
        else:base=regular
        if not base:continue
        multiplier=max(1,sum(s.get('multiplier',1) for s in symbols[:count] if s.get('multiplier',1)>1))
        wins.append({'symbol':name,'kind':count,'win':base*multiplier,
            'positions':[{'reel':r,'row':rows[r]+1} for r in range(count)],
            'meta':{'lineIndex':number,'multiplier':multiplier,'winWithoutMult':base,'globalMult':1,'lineMultiplier':multiplier}})
    return wins

def positions(board):
    return [{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']=='S']

def make_board(rng,feature):
    names=rng.choices(CONFIG['symbols'],CONFIG['featureProposalWeights'] if feature else CONFIG['proposalWeights'],k=25)
    result=[]
    for r in range(5):
        reel=[]
        for name in names[r*5:r*5+5]:
            symbol={'name':name}
            if name=='W':symbol.update(wild=True,multiplier=rng.choices(CONFIG['wildMultipliers'],CONFIG['wildMultiplierWeights'])[0])
            if name=='S':symbol['scatter']=True
            reel.append(symbol)
        result.append(reel)
    return result

def make_round(rng,identifier,mode):
    assert mode in CONFIG['modes']
    events=[];total=feature_award=completed=announced=base_award=0
    def emit(kind,**kwargs):events.append({'index':len(events),'type':kind,**kwargs})
    def reveal(feature):
        nonlocal total,feature_award,base_award
        board=make_board(rng,feature)
        emit('reveal',board=board,gameType='freegame' if feature else 'basegame',paddingPositions=[0]*5,anticipation=[0]*5)
        wins=evaluate_lines(board);amount=sum(w['win'] for w in wins)
        if wins:emit('winInfo',totalWin=amount,wins=wins)
        total+=amount
        if feature:feature_award+=amount
        else:base_award+=amount
        emit('setWin',amount=amount,winLevel=2 if amount else 1)
        emit('setTotalWin',amount=total)
        return board
    if mode=='base':
        board=reveal(False);scatters=positions(board)
        if len(scatters)>=3:
            announced=CONFIG['freeSpins'][str(min(5,len(scatters)))]
            emit('freeSpinTrigger',totalFs=announced,positions=scatters)
    else:
        announced=CONFIG['purchasedFreeSpins']
        emit('freeSpinTrigger',totalFs=announced,positions=[])
    while completed<announced:
        emit('updateFreeSpin',amount=completed,total=announced)
        board=reveal(True);completed+=1;scatters=positions(board)
        if len(scatters)>=3 and announced<CONFIG['maximumFreeSpins']:
            announced=min(CONFIG['maximumFreeSpins'],announced+CONFIG['retriggerSpins'])
            emit('freeSpinRetrigger',totalFs=announced,positions=scatters)
    if announced:emit('freeSpinEnd',amount=feature_award,winLevel=2 if feature_award else 1)
    emit('finalWin',amount=total)
    return {'id':identifier,'events':events,'payoutMultiplier':total,'baseGameWins':base_award/100,'freeGameWins':feature_award/100}

def generate(count=100000,spins=1000000):
    assert count>0 and spins>0
    output=ROOT/'publish_files';output.mkdir(exist_ok=True)
    report={'status':'development math; not certified or approved','model':'finite weighted event-book distribution; proposal frequencies are not final odds','seed':20261028,'version':CONFIG['version'],'modes':{}}
    index={'modes':[]};fixtures={}
    for number,(mode,options) in enumerate(CONFIG['modes'].items()):
        rng=random.Random(report['seed']+number);payouts=[];features=[];unique=set();decoded=hashlib.sha256()
        filename=f'books_{mode}.jsonl.zst'
        compression={'cctx':zstd.ZstdCompressor(level=9)} if hasattr(zstd,'ZstdCompressor') else {'level':9}
        with zstd.open(output/filename,'wt',encoding='utf8',**compression) as stream:
            for identifier in range(count):
                book=make_round(rng,identifier,mode);encoded=json.dumps(book,separators=(',',':'))
                unique.add(hashlib.sha256(json.dumps(book['events'],separators=(',',':')).encode()).digest()[:16])
                stream.write(encoded+'\n');decoded.update((encoded+'\n').encode());payouts.append(book['payoutMultiplier'])
                triggered=any(e['type']=='freeSpinTrigger' for e in book['events']);features.append(triggered)
                key=mode+(':feature' if triggered else ':win' if book['payoutMultiplier'] else ':loss')
                fixtures.setdefault(key,book)
                if any(e['type']=='freeSpinRetrigger' for e in book['events']):fixtures.setdefault(mode+':retrigger',book)
                if identifier%10000==0:print(mode,identifier,flush=True)
        weights=calibrate(payouts,options['cost']);weights_name=f'lookUpTable_{mode}.csv'
        with (output/weights_name).open('w') as stream:stream.writelines(f'{i},{w},{p}\n' for i,(w,p) in enumerate(zip(weights,payouts)))
        stats=statistics_report(payouts,weights,options['cost'],features,spins,718200+number)
        stats.update(decodedEventsSha256=decoded.hexdigest(),uniqueEventBooks=len(unique),eventsSha256=hashlib.sha256((output/filename).read_bytes()).hexdigest(),weightsSha256=hashlib.sha256((output/weights_name).read_bytes()).hexdigest())
        report['modes'][mode]=stats;index['modes'].append({'name':mode,'cost':options['cost'],'events':filename,'weights':weights_name})
    (output/'index.json').write_text(json.dumps(index,indent=2)+'\n')
    (ROOT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    (ROOT/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--books',type=int,default=100000);p.add_argument('--spins',type=int,default=1000000)
    args=p.parse_args();generate(args.books,args.spins)
