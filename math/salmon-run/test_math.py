import copy, json, unittest
from pathlib import Path
from verify import audit_book, expected_lines
from generate import calibrate
from fractions import Fraction

FIXTURES=json.loads((Path(__file__).parent/'fixtures.json').read_text())
def containing(kind):
    return copy.deepcopy(next(b for b in FIXTURES.values() if any(e['type']==kind for e in b['events'])))

class MathContracts(unittest.TestCase):
    def test_exact_positive_integer_lookup_calibration(self):
        payouts=[0,20,100,200,1000];weights=calibrate(payouts,1)
        self.assertTrue(all(isinstance(w,int) and w>0 for w in weights))
        self.assertEqual(Fraction(sum(p*w for p,w in zip(payouts,weights)),sum(weights)*100),Fraction(193,200))
    def test_shorter_wild_combination_can_beat_a_longer_regular_line(self):
        board=[[{'name':'scatter'} for _ in range(5)] for _ in range(5)]
        for i in range(4):board[i][1]={'name':'wild'}
        board[4][1]={'name':'leaf'}
        line=next(line for line in expected_lines(board) if line[0]==1)
        self.assertEqual(line[1:4],(300,'wild',4))
    def test_terminal_book_scale_corruption(self):
        book=containing('winInfo');book['payoutMultiplier']*=10000
        with self.assertRaisesRegex(AssertionError,'book payout'):audit_book(book,'base')
    def test_wrong_collection_total(self):
        book=containing('collectFish');next(e for e in book['events'] if e['type']=='winInfo' and e['wins'][0]['meta'].get('mechanic')=='collection')['totalWin']+=1
        with self.assertRaisesRegex(AssertionError,'collection amount'):audit_book(book,'base')
    def test_wrong_collection_stage(self):
        book=containing('collectFish');next(e for e in book['events'] if e['type']=='collectFish')['multiplier']+=1
        with self.assertRaisesRegex(AssertionError,'collection value or stage'):audit_book(book,'base')
    def test_skipped_free_spin(self):
        book=containing('updateFreeSpin');next(e for e in book['events'] if e['type']=='updateFreeSpin')['amount']+=1
        with self.assertRaisesRegex(AssertionError,'counter'):audit_book(book,'base')
    def test_wrong_line_position(self):
        book=containing('winInfo');next(e for e in book['events'] if e['type']=='winInfo')['wins'][0]['positions'][0]['row']=4
        with self.assertRaisesRegex(AssertionError,'line calculation'):audit_book(book,'base')
    def test_orphaned_event_index(self):
        book=containing('winInfo');book['events'][1]['index']=99
        with self.assertRaisesRegex(AssertionError,'event index'):audit_book(book,'base')

if __name__=='__main__':unittest.main()
