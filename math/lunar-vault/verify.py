"""Independent, exhaustive publication verifier; never imports the generator.

A separate state machine rebuilds every award and consumes the exact event order.
"""
from pathlib import Path
from fractions import Fraction
try:
    from compression import zstd
except ImportError:
    import zstandard as zstd
import csv, hashlib, json, math
ROOT=Path(__file__).resolve().parent
CONFIG=json.loads((ROOT/'config.json').read_text())

def expected_lines(board):
    result=[]
    for line,rows in enumerate(CONFIG['lines'],1):
        symbols=[board[r][rows[r]+1] for r in range(5)]
        first=next((s['name'] for s in symbols if s['name']!='W'),None)
        candidates=[]
        for name in ['W']+([first] if first in CONFIG['paytable'] else []):
            run=[]
            for symbol in symbols:
                if symbol['name'] not in (name,'W'):break
                run.append(symbol)
            base=CONFIG['paytable'][name].get(str(len(run)),0)
            if base:candidates.append((base,len(run),name,run))
        if not candidates:continue
        # Highest base award, ties favor the regular combination.
        base,count,name,run=max(candidates,key=lambda c:(c[0],c[2]!='W'))
        mult=sum(s['multiplier'] for s in run if s['name']=='W' and s['multiplier']>1) or 1
        result.append({'symbol':name,'kind':count,'win':base*mult,
            'positions':[{'reel':r,'row':rows[r]+1} for r in range(count)],
            'meta':{'lineIndex':line,'multiplier':mult,'winWithoutMult':base,'globalMult':1,'lineMultiplier':mult}})
    return result

def audit_book(book,mode):
    assert mode in CONFIG['modes'],'unknown mode'
    assert type(book['id']) is int and 0<=book['id']<2**64,'invalid ID'
    events=book['events'];cursor=0;total=free_total=base_total=0;completed=announced=0
    assert events,'empty book'
    def consume(kind,**expected):
        nonlocal cursor
        assert cursor<len(events),'missing '+kind
        event=events[cursor]
        assert event['index']==cursor and type(event['index']) is int,'event index'
        assert event['type']==kind,'expected '+kind+', got '+event['type']
        for key,value in expected.items():assert event[key]==value,kind+' '+key+' mismatch'
        if 'amount' in event or 'totalWin' in event:
            for key in ('amount','totalWin'):
                if key in event:assert type(event[key]) is int and event[key]>=0,'monetary event must be a nonnegative integer'
        cursor+=1
        return event
    def reveal(feature):
        nonlocal total,free_total,base_total
        event=consume('reveal',gameType='freegame' if feature else 'basegame',paddingPositions=[0]*5,anticipation=[0]*5)
        board=event['board'];assert len(board)==5 and all(len(r)==5 for r in board),'board shape'
        for symbol in [s for reel in board for s in reel]:
            assert symbol['name'] in CONFIG['symbols'],'unknown symbol'
            if symbol['name']=='W':assert symbol.get('wild') is True and type(symbol.get('multiplier')) is int and symbol['multiplier'] in CONFIG['wildMultipliers'],'invalid wild'
            else:assert 'multiplier' not in symbol and not symbol.get('wild',False),'unexpected multiplier'
            assert bool(symbol.get('scatter',False))==(symbol['name']=='S'),'scatter flag'
        wins=expected_lines(board);amount=sum(w['win'] for w in wins)
        if wins:
            awarded=consume('winInfo',totalWin=amount)
            assert awarded['wins']==wins,'line award mismatch'
            assert all(type(w['win']) is int and all(type(w['meta'][key]) is int for key in ('multiplier','winWithoutMult','globalMult','lineMultiplier')) for w in awarded['wins']),'line monetary metadata must be integer'
        if feature:free_total+=amount
        else:base_total+=amount
        total+=amount
        consume('setWin',amount=amount,winLevel=2 if amount else 1)
        consume('setTotalWin',amount=total)
        return [{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']=='S']
    if mode=='base':
        scatters=reveal(False)
        if len(scatters)>=3:
            announced=CONFIG['freeSpins'][str(min(5,len(scatters)))]
            consume('freeSpinTrigger',totalFs=announced,positions=scatters)
    else:
        announced=CONFIG['purchasedFreeSpins'];consume('freeSpinTrigger',totalFs=announced,positions=[])
    while completed<announced:
        # Counter values are zero-based before each reveal.
        assert cursor<len(events) and events[cursor].get('amount')==completed,'free spin counter'
        consume('updateFreeSpin',amount=completed,total=announced)
        scatters=reveal(True);completed+=1
        if len(scatters)>=3 and announced<CONFIG['maximumFreeSpins']:
            announced=min(CONFIG['maximumFreeSpins'],announced+CONFIG['retriggerSpins'])
            consume('freeSpinRetrigger',totalFs=announced,positions=scatters)
    if announced:consume('freeSpinEnd',amount=free_total,winLevel=2 if free_total else 1)
    consume('finalWin',amount=total)
    assert cursor==len(events),'extra events'
    assert type(book['payoutMultiplier']) is int and book['payoutMultiplier']==total,'book payout mismatch'
    assert Fraction(str(book['baseGameWins']))*100==base_total,'base component'
    assert Fraction(str(book['freeGameWins']))*100==free_total,'free component'
    return total

def verify():
    path=ROOT/'publish_files';index=json.loads((path/'index.json').read_text());report=json.loads((ROOT/'report.json').read_text());checked={}
    assert len(index['modes'])==len(CONFIG['modes']) and {m['name'] for m in index['modes']}==set(CONFIG['modes']),'mode set mismatch'
    for mode in index['modes']:
        name=mode['name'];cost=CONFIG['modes'][name]['cost'];assert mode['cost']==cost,'cost mismatch'
        weight_total=weighted_payout=weighted_squared=hits=features=rows=maximum=0;decoded=hashlib.sha256()
        with zstd.open(path/mode['events'],'rt') as books,(path/mode['weights']).open() as lookup:
            reader=csv.reader(lookup)
            for i,line in enumerate(books):
                decoded.update(line.encode())
                fields=next(reader,None);assert fields is not None and len(fields)==3,'missing/invalid CSV row'
                assert all(v.isascii() and v.isdigit() for v in fields),'CSV must be unsigned decimal integers'
                identifier,weight,payout=map(int,fields)
                assert 0<=identifier<2**64 and 0<weight<2**64 and 0<=payout<2**64,'uint64 contract'
                book=json.loads(line);assert book['id']==identifier==i,'row/ID alignment'
                assert audit_book(book,name)==payout,'CSV payout mismatch'
                rows+=1;weight_total+=weight;weighted_payout+=weight*payout;weighted_squared+=weight*payout*payout;maximum=max(maximum,payout)
                if payout:hits+=weight
                if any(e['type']=='freeSpinTrigger' for e in book['events']):features+=weight
            assert next(reader,None) is None,'extra CSV rows'
        assert 0<weight_total<2**64,'total weight overflow'
        rtp=Fraction(weighted_payout,weight_total*100*cost);assert rtp==Fraction(193,200),'weighted RTP'
        std=math.sqrt(float(Fraction(weighted_squared,weight_total*(100*cost)**2)-rtp**2))
        if name=='base':assert std>=.6,'base volatility below approval guideline'
        stats=report['modes'][name]
        for key,value in {'books':rows,'totalWeight':weight_total,'maximumWinX':maximum/100,'weightedRtp':float(rtp),'weightedHitRate':hits/weight_total,'featureProbability':features/weight_total}.items():assert stats[key]==value,'report mismatch: '+key
        assert math.isclose(stats['standardDeviationPerCost'],std,rel_tol=1e-11),'report volatility'
        assert stats['decodedEventsSha256']==decoded.hexdigest(),'decoded publication hash'
        for key,filename in [('eventsSha256',mode['events']),('weightsSha256',mode['weights'])]:assert stats[key]==hashlib.sha256((path/filename).read_bytes()).hexdigest(),'publication hash'
        checked[name]={'verifiedBooks':rows,'rtpFraction':str(rtp),'maximumWinX':maximum/100,'standardDeviationPerCost':std,'totalWeight':weight_total,'errors':0}
    return checked

if __name__=='__main__':
    result=verify();print(json.dumps(result,indent=2));(ROOT/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
