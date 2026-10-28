"""Monetary and lifecycle regressions for the original development model."""
import copy, random, unittest, json, tempfile
from pathlib import Path
from unittest.mock import patch
import verify
from fractions import Fraction
from generate import evaluate_lines, make_round, calibrate
from verify import audit_book

def board(names, multipliers=None):
    result=[[{'name':'S'} for _ in range(5)] for _ in range(5)]
    for r,name in enumerate(names):
        result[r][1]={'name':name}
        if name=='W': result[r][1]['multiplier']=(multipliers or [1]*5)[r]
    return result

class Contracts(unittest.TestCase):
    def test_highest_base_award_before_multipliers(self):
        wins=evaluate_lines(board(['W','W','W','L5','W'],[1,1,1,1,10]))
        win=next(w for w in wins if w['meta']['lineIndex']==1)
        self.assertEqual((win['symbol'],win['kind'],win['win']),('W',3,500))
    def test_winning_wild_multipliers_add_and_one_is_ignored(self):
        win=next(w for w in evaluate_lines(board(['W','W','W','H1','H1'],[1,2,5,1,1])) if w['meta']['lineIndex']==1)
        self.assertEqual(win['win'],14000)
        self.assertEqual(win['meta']['multiplier'],7)
    def test_all_wild_line(self):
        win=next(w for w in evaluate_lines(board(['W']*5,[2]*5)) if w['meta']['lineIndex']==1)
        self.assertEqual((win['kind'],win['win']),(5,20000))
    def test_exact_rational_calibration(self):
        ps=[0,50,100,10000];ws=calibrate(ps,1)
        self.assertEqual(Fraction(sum(p*w for p,w in zip(ps,ws)),sum(ws)*100),Fraction(193,200))
    def test_generated_rounds_reconstruct(self):
        for mode in ['base','bonus']:
            rng=random.Random(342)
            for i in range(100):
                b=make_round(rng,i,mode)
                self.assertEqual(audit_book(b,mode),b['payoutMultiplier'])
    def test_feature_end_required(self):
        b=make_round(random.Random(21),0,'bonus')
        b['events']=[e for e in b['events'] if e['type']!='freeSpinEnd']
        for i,e in enumerate(b['events']): e['index']=i
        with self.assertRaises(AssertionError): audit_book(b,'bonus')
    def test_no_multiplier_metadata_forgery(self):
        rng=random.Random(42)
        for i in range(100):
            b=make_round(rng,i,'bonus')
            wins=[e for e in b['events'] if e['type']=='winInfo']
            if wins: break
        wins[0]['wins'][0]['meta']['lineMultiplier']+=1
        with self.assertRaisesRegex(AssertionError,'line award'):audit_book(b,'bonus')
    def test_feature_counter_cannot_skip(self):
        b=make_round(random.Random(21),0,'bonus')
        next(e for e in b['events'] if e['type']=='updateFreeSpin')['amount']=1
        with self.assertRaisesRegex(AssertionError,'counter'):audit_book(b,'bonus')
    def test_publication_cost_is_independently_bound_to_config(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'publish_files').mkdir()
            (root/'publish_files/index.json').write_text(json.dumps({'modes':[{'name':'base','cost':2},{'name':'bonus','cost':100}]}))
            (root/'report.json').write_text('{}')
            with patch.object(verify,'ROOT',root),self.assertRaisesRegex(AssertionError,'cost'):verify.verify()
    def test_monetary_events_require_integers(self):
        b=make_round(random.Random(21),0,'bonus')
        event=next(e for e in b['events'] if e['type']=='setWin');event['amount']=float(event['amount'])
        with self.assertRaisesRegex(AssertionError,'integer'):audit_book(b,'bonus')
    def test_payout_units_cannot_change(self):
        b=make_round(random.Random(21),0,'bonus');b['payoutMultiplier']*=100
        with self.assertRaisesRegex(AssertionError,'payout'):audit_book(b,'bonus')

if __name__=='__main__':unittest.main()
