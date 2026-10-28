"""Reproducible finite weighted-book model, Engine file format. Not certification.

Python 3.14+ standard-library zstd, or Python 3.12+ with zstandard. No client result generation. The proposal
draws boards independently; published integer lookup weights define final odds.
"""
from pathlib import Path
try:
    from compression import zstd
except ImportError:
    import zstandard as zstd
from fractions import Fraction
import argparse, hashlib, json, math, random

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / 'config.json').read_text())

def evaluate_lines(board):
    wins = []
    table = CONFIG['paytable']
    for number, rows in enumerate(CONFIG['lines'], 1):
        names = [board[reel][row + 1]['name'] for reel, row in enumerate(rows)]
        wild = 0
        while wild < 5 and names[wild] == 'wild': wild += 1
        name = names[wild] if wild < 5 else None
        count = wild
        if name:
            while count < 5 and names[count] in (name, 'wild'): count += 1
        wild_award = table['wild'].get(str(wild), 0)
        regular = table.get(name, {}).get(str(count), 0)
        if wild_award > regular: name, count, award = 'wild', wild, wild_award
        else: award = regular
        if award:
            wins.append({'symbol':name,'kind':count,'win':award,
                'positions':[{'reel':r,'row':rows[r]+1} for r in range(count)],
                'meta':{'lineIndex':number,'multiplier':1,'winWithoutMult':award}})
    return wins

def make_board(rng, feature=False):
    names = rng.choices(CONFIG['symbols'], CONFIG['proposalWeights'], k=25)
    board = [[{'name':names[reel*5+row]} for row in range(5)] for reel in range(5)]
    if feature:
        for reel in board:
            for symbol in reel[1:4]:
                if symbol['name'] == 'salmon':
                    symbol['value'] = rng.choices(CONFIG['fishValues'], CONFIG['fishValueWeights'])[0]
    return board

def positions(board, name):
    return [{'reel':r,'row':row} for r in range(5) for row in range(1,4) if board[r][row]['name']==name]

def make_round(rng, identifier, mode):
    events, total, caught = [], 0, 0
    feature_total, current, feature_award = 0, 0, 0
    def emit(kind, **data): events.append({'index':len(events),'type':kind,**data})
    def reveal(feature):
        nonlocal total, caught, feature_award
        board = make_board(rng, feature)
        emit('reveal',board=board,gameType='freegame' if feature else 'basegame')
        wins = evaluate_lines(board)
        if wins:
            amount = sum(w['win'] for w in wins)
            total += amount
            if feature: feature_award += amount
            emit('winInfo',totalWin=amount,wins=wins)
        if feature:
            fish, collectors = positions(board,'salmon'), positions(board,'wild')
            if fish and collectors:
                multiplier = CONFIG['stageMultipliers'][min(2, caught//3)]
                values = [board[p['reel']][p['row']]['value'] for p in fish]
                amount = sum(values)*multiplier*100
                total += amount; feature_award += amount; caught += len(fish)
                emit('winInfo',totalWin=amount,wins=[{
                    'symbol':'salmon','kind':len(fish),'win':amount,'positions':fish,
                    'meta':{'mechanic':'collection','lineIndex':0,'multiplier':multiplier,
                            'winWithoutMult':sum(values)*100,'collectorPositions':collectors}}])
                emit('collectFish',positions=fish,collectors=collectors,values=values,
                     multiplier=multiplier,collected=caught,stage=min(2,caught//3))
        emit('setTotalWin',amount=total)
        return board
    if mode == 'base':
        board = reveal(False)
        scatters = positions(board,'scatter')
        if len(scatters)>=3:
            feature_total = CONFIG['freeSpins'][str(min(5,len(scatters)))]
            emit('freeSpinTrigger',totalFs=feature_total,positions=scatters,purchased=False)
    else:
        feature_total = 6
        emit('freeSpinTrigger',totalFs=feature_total,positions=[],purchased=True)
    while current < feature_total:
        emit('updateFreeSpin',amount=current,total=feature_total)
        board = reveal(True)
        current += 1
        scatters=positions(board,'scatter')
        if len(scatters)>=3 and feature_total < CONFIG['maximumFreeSpins']:
            feature_total=min(CONFIG['maximumFreeSpins'],feature_total+CONFIG['retriggerSpins'])
            emit('freeSpinRetrigger',totalFs=feature_total,positions=scatters)
    if feature_total: emit('freeSpinEnd',amount=feature_award,collected=caught,totalFs=feature_total)
    emit('finalWin',amount=total)
    return {'id':identifier,'events':events,'payoutMultiplier':total}

def calibrate(payouts, cost):
    # Two uniform strata on either side of the target. This exact rational
    # construction avoids silently changing awards/paytable to hit an RTP label.
    differences=[2*p-193*cost for p in payouts]
    positive=sum(d for d in differences if d>0)
    negative=-sum(d for d in differences if d<0)
    if not positive or not negative: raise ValueError('Pool does not bracket target; change the model.')
    divisor=math.gcd(positive,negative)
    high,low=negative//divisor,positive//divisor
    weights=[high if d>0 else low if d<0 else min(high,low) for d in differences]
    assert all(w>0 for w in weights)
    assert sum(weights)<2**64
    assert Fraction(sum(p*w for p,w in zip(payouts,weights)),sum(weights)*100*cost)==Fraction(193,200)
    return weights

def statistics_report(payouts, weights, cost, features, spins, seed):
    total=sum(weights)
    mean=sum(p*w for p,w in zip(payouts,weights))/total/100/cost
    variance=sum(w*(p/100/cost-mean)**2 for p,w in zip(payouts,weights))/total
    rng=random.Random(seed)
    cumulative=[]; running=0
    for w in weights: running+=w; cumulative.append(running)
    sampled_sum=sampled_squares=sampled_hits=0
    for start in range(0,spins,100000):
        ids=rng.choices(range(len(payouts)),cum_weights=cumulative,k=min(100000,spins-start))
        for i in ids:
            value=payouts[i]/100/cost
            sampled_sum+=value; sampled_squares+=value*value; sampled_hits+=value>0
    simulated=sampled_sum/spins
    standard_error=math.sqrt(max(0,sampled_squares/spins-simulated*simulated)/spins)
    tail_mass=.001*total; remaining=tail_mass; worst=0
    for p,w in sorted(zip(payouts,weights),reverse=True):
        take=min(w,remaining);worst+=p/100*take;remaining-=take
        if remaining<=0:break
    return {
        'books':len(payouts),'cost':cost,'totalWeight':total,'nonzeroWeightBooks':len(weights),
        'exactRtpFraction':'193/200','weightedRtp':mean,'simulatedRtp':simulated,
        'simulationSpins':spins,'simulationSeed':seed,'standardError':standard_error,
        'confidenceInterval95':[simulated-1.96*standard_error,simulated+1.96*standard_error],
        'simulationWithinFiveStandardErrors':abs(simulated-mean)<=5*standard_error,
        'standardDeviationPerCost':math.sqrt(variance),
        'weightedHitRate':sum(w for p,w in zip(payouts,weights) if p>0)/total,
        'sampledHitRate':sampled_hits/spins,'maximumWinX':max(payouts)/100,
        'mostLikelySingleBookProbability':max(weights)/total,
        'featureProbability':sum(w for flag,w in zip(features,weights) if flag)/total,
        'cvarWorstPointOnePercentX':worst/tail_mass,
        'cvarPerCost':worst/tail_mass/cost,
        'tailProbabilities':{str(x):sum(w for p,w in zip(payouts,weights) if p>=x*100)/total for x in [5000,10000,25000,50000,100000]},
    }

def generate(count=100000, spins=1000000):
    output=ROOT/'publish_files';output.mkdir(exist_ok=True)
    report={'status':'development math; not certified or approved','model':'finite weighted event-book distribution; proposal draw frequencies are not final odds','seed':20261026,'modes':{}}
    index={'modes':[]}; fixtures={}
    for number,(mode,options) in enumerate(CONFIG['modes'].items()):
        rng=random.Random(20261026+number)
        payouts=[];features=[];unique=set()
        filename=f'books_{mode}.jsonl.zst'
        compression={'cctx':zstd.ZstdCompressor(level=9)} if hasattr(zstd,'ZstdCompressor') else {'level':9}
        with zstd.open(output/filename,'wt',encoding='utf8',**compression) as stream:
            for identifier in range(count):
                book=make_round(rng,identifier,mode)
                encoded=json.dumps(book,separators=(',',':'))
                # The ID is excluded from the visual/event diversity check.
                unique.add(hashlib.sha256(json.dumps(book['events'],separators=(',',':')).encode()).digest()[:16])
                stream.write(encoded+'\n');payouts.append(book['payoutMultiplier'])
                triggered=any(e['type']=='freeSpinTrigger' for e in book['events'])
                features.append(triggered)
                key=mode+(':feature' if triggered else ':win' if book['payoutMultiplier'] else ':loss')
                fixtures.setdefault(key,book)
                if any(e['type']=='freeSpinRetrigger' for e in book['events']): fixtures.setdefault(mode+':retrigger',book)
                if identifier%10000==0:print(mode,identifier,flush=True)
        weights=calibrate(payouts,options['cost'])
        weights_name=f'lookUpTable_{mode}.csv'
        with (output/weights_name).open('w') as stream:
            stream.writelines(f'{i},{w},{p}\n' for i,(w,p) in enumerate(zip(weights,payouts)))
        stats=statistics_report(payouts,weights,options['cost'],features,spins,417400+number)
        stats['uniqueEventBooks']=len(unique)
        stats['eventsSha256']=hashlib.sha256((output/filename).read_bytes()).hexdigest()
        stats['weightsSha256']=hashlib.sha256((output/weights_name).read_bytes()).hexdigest()
        report['modes'][mode]=stats
        index['modes'].append({'name':mode,'cost':options['cost'],'events':filename,'weights':weights_name})
    (output/'index.json').write_text(json.dumps(index,indent=2)+'\n')
    (ROOT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    (ROOT/'fixtures.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
    print(json.dumps(report,indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--books',type=int,default=100000);parser.add_argument('--spins',type=int,default=1000000)
    args=parser.parse_args();generate(args.books,args.spins)
