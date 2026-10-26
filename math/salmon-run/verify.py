"""Independent event/lookup verification; no imports from the generator."""
from compression import zstd
from fractions import Fraction
from pathlib import Path
import argparse, csv, hashlib, json

ROOT=Path(__file__).resolve().parent
CONFIG=json.loads((ROOT/'config.json').read_text())

def expected_lines(board):
    result=[]
    for number,rows in enumerate(CONFIG['lines'],1):
        names=[board[r][row+1]['name'] for r,row in enumerate(rows)]
        candidates=[]
        first_regular=next((n for n in names if n!='wild'),None)
        for name,table in CONFIG['paytable'].items():
            if name not in ('wild', first_regular):continue
            count=0
            for symbol in names:
                if symbol not in (name,'wild'):break
                count+=1
            award=table.get(str(count),0)
            if award:candidates.append((award,name,count))
        if candidates:
            # Ties favour the first non-wild line over a shorter leading-wild run.
            award,name,count=max(candidates,key=lambda c:(c[0],c[2]))
            result.append((number,award,name,count,tuple((r,rows[r]+1) for r in range(count))))
    return sorted(result)

def audit_book(book,mode):
    total=feature_sum=collected=completed=announced=feature_reveals=0
    base_trigger_expected=False
    board=None;feature=False;lines_pending=False;collection_pending=False;expected_collect=None;collection_awarded=False
    for i,event in enumerate(book['events']):
        assert event['index']==i,'non-contiguous event index'
        kind=event['type']
        if kind=='reveal':
            assert not lines_pending and not collection_pending,'missing award event before next board'
            board=event['board'];feature=event['gameType']=='freegame'
            assert len(board)==5 and all(len(reel)==5 for reel in board),'bad padded board shape'
            assert all(s['name'] in CONFIG['symbols'] for reel in board for s in reel),'unknown symbol'
            expected=expected_lines(board);lines_pending=bool(expected)
            if feature:
                feature_reveals+=1
                assert announced>0 and completed==feature_reveals,'feature reveal ordering mismatch'
            else:
                base_trigger_expected=sum(s['name']=='scatter' for reel in board for s in reel[1:4])>=3
            fish=[{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']=='salmon']
            collectors=[{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']=='wild']
            if feature:
                assert all(board[p['reel']][p['row']]['value'] in CONFIG['fishValues'] for p in fish),'invalid fish value'
            collection_pending=bool(feature and fish and collectors)
            collection_awarded=False
            if collection_pending:
                values=[board[p['reel']][p['row']]['value'] for p in fish]
                multiplier=1 if collected<3 else 2 if collected<6 else 3
                expected_collect=(fish,collectors,values,multiplier,sum(values)*100*multiplier)
        elif kind=='winInfo':
            collection=event['wins'][0]['meta'].get('mechanic')=='collection'
            if collection:
                assert collection_pending and not collection_awarded and not lines_pending,'unexpected collection award'
                fish,collectors,values,multiplier,amount=expected_collect
                assert len(event['wins'])==1,'duplicate collection award'
                award=event['wins'][0]
                assert award['positions']==fish and award['meta']['collectorPositions']==collectors,'bad collection positions'
                assert award['win']==event['totalWin']==amount,'collection amount mismatch'
                assert award['meta']['multiplier']==multiplier and award['meta']['winWithoutMult']==sum(values)*100,'collection value or stage mismatch'
                collection_awarded=True
            else:
                assert lines_pending,'unexpected or repeated line award'
                reported=sorted((w['meta']['lineIndex'],w['win'],w['symbol'],w['kind'],tuple((p['reel'],p['row']) for p in w['positions'])) for w in event['wins'])
                assert reported==expected,'line calculation mismatch'
                assert event['totalWin']==sum(w['win'] for w in event['wins']),'line sum mismatch'
                lines_pending=False
            total+=event['totalWin']
            if feature:feature_sum+=event['totalWin']
        elif kind=='collectFish':
            assert collection_pending and collection_awarded and not lines_pending,'unexpected/reordered/repeated collection'
            fish,collectors,values,multiplier,amount=expected_collect
            assert event['positions']==fish and event['collectors']==collectors,'bad collection positions'
            assert event['values']==values and event['multiplier']==multiplier,'collection value or stage mismatch'
            collected+=len(fish)
            assert event['collected']==collected and event['stage']==min(2,collected//3),'progress mismatch'
            collection_pending=False
        elif kind=='setTotalWin':
            assert not lines_pending and not collection_pending,'missing award before total'
            assert event['amount']==total,'cumulative total mismatch'
        elif kind=='freeSpinTrigger':
            assert announced==0,'duplicate entry'
            if mode=='base':
                scatters=[{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']=='scatter']
                assert len(scatters)>=3 and event['positions']==scatters,'invalid trigger positions'
                assert event['totalFs']==CONFIG['freeSpins'][str(min(5,len(scatters)))],'wrong initial free spins'
            else:assert event['purchased'] and event['totalFs']==6 and event['positions']==[],'wrong river mode entry'
            announced=event['totalFs']
        elif kind=='updateFreeSpin':
            assert event['amount']==completed and event['total']==announced,'free spin counter mismatch'
            assert completed<announced,'extra free spin'
            completed+=1
        elif kind=='freeSpinRetrigger':
            assert feature,'retrigger outside feature'
            scatters=[{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']=='scatter']
            assert len(scatters)>=3 and event['positions']==scatters,'invalid retrigger positions'
            assert event['totalFs']==min(CONFIG['maximumFreeSpins'],announced+2),'wrong retrigger count'
            assert event['totalFs']>announced,'non-extending retrigger'
            announced=event['totalFs']
        elif kind=='freeSpinEnd':
            assert completed==announced==feature_reveals and event['totalFs']==announced,'unfinished feature'
            assert event['amount']==feature_sum and event['collected']==collected,'feature summary mismatch'
        elif kind=='finalWin':
            assert i==len(book['events'])-1 and event['amount']==total,'terminal total mismatch'
        else:raise AssertionError('unknown event: '+kind)
    assert book['events'][-1]['type']=='finalWin','missing finalWin'
    assert not lines_pending and not collection_pending,'missing award at end'
    assert book['payoutMultiplier']==total,'book payout mismatch'
    if mode=='base' and base_trigger_expected:assert announced>0,'missing triggered feature'
    return total

def verify():
    index=json.loads((ROOT/'publish_files/index.json').read_text());report=json.loads((ROOT/'report.json').read_text())
    assert 1<=len(index['modes'])<=20
    checked={}
    for mode in index['modes']:
        path=ROOT/'publish_files'; total_weight=weighted_payout=rows=0;maximum=0
        with zstd.open(path/mode['events'],'rt') as books, (path/mode['weights']).open() as lookup:
            reader=csv.reader(lookup)
            for position,line in enumerate(books):
                book=json.loads(line);identifier,weight,payout=map(int,next(reader))
                assert identifier==book['id']==position,'book/CSV position mismatch'
                assert 0<weight<2**64 and 0<=payout<2**64
                assert audit_book(book,mode['name'])==payout,'lookup payout mismatch'
                rows+=1;total_weight+=weight;weighted_payout+=weight*payout;maximum=max(maximum,payout)
            assert next(reader,None) is None,'extra CSV rows'
        assert total_weight<2**64
        rtp=Fraction(weighted_payout,total_weight*100*mode['cost'])
        assert rtp==Fraction(193,200),'wrong weighted RTP'
        stats=report['modes'][mode['name']]
        assert stats['books']==rows and stats['totalWeight']==total_weight
        assert stats['maximumWinX']==maximum/100
        assert stats['eventsSha256']==hashlib.sha256((path/mode['events']).read_bytes()).hexdigest()
        assert stats['weightsSha256']==hashlib.sha256((path/mode['weights']).read_bytes()).hexdigest()
        checked[mode['name']]={'verifiedBooks':rows,'rtpFraction':str(rtp),'maximumWinX':maximum/100,'errors':0}
    return checked

if __name__=='__main__':
    result=verify();print(json.dumps(result,indent=2));(ROOT/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
