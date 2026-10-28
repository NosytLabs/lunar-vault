from fractions import Fraction
import math, random

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

