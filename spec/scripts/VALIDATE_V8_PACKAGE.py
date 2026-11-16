#!/usr/bin/env python3
"""V8 package-only static validation; DOES NOT certify deployed performance or motion comfort."""
from pathlib import Path
import json,csv
R=Path(__file__).resolve().parents[1]
def read(p):return (R/p).read_text(encoding='utf-8')
def jd(p):return json.loads(read(p))
s=read('START_HERE.txt')
assert s.startswith('# V8 HIGHEST PRIORITY') and 'V8 > V7 > V6' in s
files=['specs/V8_SIGNATURE_SMOOTHNESS_AND_MOTION_SYSTEM.md','qa/V8_MOTION_RELEASE_GATES.md','V8_QUICK_GUIDE_AR.txt','data/v8_motion_contract.seed.json','data/V8_MOTION_STORYBOARD.csv','qa/V8_MOTION_QA_CASES.csv','templates/V8_MOTION_DIRECTOR_ENGINEERING_REFERENCE.md','research/V8_MOTION_OFFICIAL_REFERENCES.md','USER_PROMPT_TO_CLAUDE_V8.txt']
assert all((R/p).exists() for p in files)
q=jd('data/v8_motion_contract.seed.json')
assert q['schemaVersion']==8 and q['preservePreviousV7SevenGates'] and q['soundDefaultOff']
assert q['mainSections']==['explore','tour','design','amenities']
assert len(q['modes'])==4 and q['additionalGate']=='G8_motion_continuity_comfort'
assert q['camera']['frameRateIndependent'] and q['camera']['collisionSafePathRequired']
assert not q['higgsfield']['runtimeDependency']
def csvrd(f):
 with (R/f).open(encoding='utf-8-sig',newline='') as fo:return list(csv.DictReader(fo))
new=csvrd('qa/V8_MOTION_QA_CASES.csv');matrix=csvrd('qa/QA_MASTER_MATRIX.csv')
assert len(new)==80 and len(matrix)==732,(len(new),len(matrix))
assert all(x['status']=='NOT_RUN' for x in matrix)
assert len(set(x['test_id'] for x in matrix))==len(matrix)
assert {x['test_id'] for x in new}.issubset({x['test_id'] for x in matrix})
assert len(csvrd('data/V8_MOTION_STORYBOARD.csv'))==12
master=read('MASTER_PROMPT_COMPLETE.txt')
assert master.startswith('# V8 HIGHEST PRIORITY') and '# V7 HIGHEST PRIORITY' in master and len(master)>420_000
assert 'MotionDirector' in master and 'V8_SIGNATURE_SMOOTHNESS' in master
print('V8 STATIC PACK PASS | 8 quality gates specified | 12 motion paths | 80 new tests | 732 total NOT_RUN | NO actual site/browser tests performed.')
