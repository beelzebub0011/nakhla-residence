#!/usr/bin/env python3
"""Validate supplied Nakhla project concept data; no external dependency or network calls."""
from pathlib import Path
import json, sys, csv
ROOT=Path(__file__).resolve().parents[1]
load=lambda x: json.loads((ROOT/x).read_text(encoding='utf-8'))
t=load('data/tower_concept.seed.json')
m=load('data/material_catalog.seed.json')
p=load('data/finish_packages.seed.json')
s=load('data/experience_state_contract.json')
floors=t['floors']; units=t['units']; mats=m['materials']
errs=[]
def assert_(ok,msg):
 if not ok: errs.append(msg)
assert_(len(floors)==12,'floor count must be 12')
assert_(sorted(f['number'] for f in floors)==list(range(12)),'numeric levels 0..11')
assert_(len(units)==18,'exactly 18 units')
assert_(len(set(f['id'] for f in floors))==12,'floor IDs unique')
assert_(len(set(u['id'] for u in units))==len(units),'unit IDs unique')
assert_(all(len(f['unitIds'])==2 for f in floors if f['category']=='residential'),'two units per res floor')
assert_(all(len(f['unitIds'])==0 for f in floors if f['category']!='residential'),'nonres floors cannot have units')
assert_(sum(f['category']=='residential' for f in floors)==9,'9 residential floors')
assert_(next(f['category'] for f in floors if f['number']==10)=='wellness','floor 10 wellness')
assert_(next(f['category'] for f in floors if f['number']==11)=='dining','floor 11 dining')
assert_(all(u['floorId'] in {f['id'] for f in floors if f['category']=='residential'} for u in units),'unit floor lookup')
assert_(len(mats)==18 and len(set(x['id'] for x in mats))==18,'18 unique materials')
assert_(len(m['categories'])==6,'six material categories')
assert_(all(len(v)==3 for v in m['categories'].values()),'3 variants per category')
mat_by_id={x['id']: x for x in mats}
for key,v in p['packages'].items():
 for category,matid in v['ids'].items():
  assert_(matid in mat_by_id and mat_by_id.get(matid,{}).get('category')==category, f'Invalid package mapping {key}.{category} -> {matid}')
for loc in ['ar','en']:
 l=load('data/localized_copy.seed.json')
 assert_(loc in l and 'hero_title' in l[loc],f'{loc} dictionary missing')
for required in ['START_HERE.txt','CLAUDE.md','PROJECT_CHARTER.md','MASTER_PROMPT_COMPLETE.txt','references/README_REFERENCE_ASSETS.txt','research/RESEARCH_AND_SKILL_PROTOCOL.md']:
 assert_((ROOT/required).exists(),f'Missing {required}')
# V2 source contract assertions
extra_files=['specs/PERFORMANCE_NO_LAG_CONTRACT.md','specs/RESPONSIVE_INPUT_ACCESSIBILITY_CONTRACT.md','specs/ENVIRONMENT_TIME_WEATHER_SEASONS.md','specs/FREE_WALK_CAMERA_AND_WAYFINDING.md','specs/WOW_FEATURES_AND_PRODUCT_STRATEGY_V2.md','qa/PERFORMANCE_E2E_ACCEPTANCE.md','data/device_quality_profiles.seed.json','data/environment_presets.seed.json','data/navigation_manifest.seed.json','data/DEVICE_AND_NETWORK_TEST_MATRIX.csv','AUDIT_AND_REVISIONS_V2_AR.txt']
for r in extra_files: assert_((ROOT/r).exists(),f'Missing V2 file {r}')
q=load('data/device_quality_profiles.seed.json'); env=load('data/environment_presets.seed.json'); nav=load('data/navigation_manifest.seed.json')
assert_(len(q['tiers'])==5 and {i['id'] for i in q['tiers']}=={'lite','low','balanced','high','ultra'},'quality tiers invalid')
assert_(len(env['seasons'])==4 and len(env['weathers'])==6,'environment preset counts invalid')
assert_(len(nav['floorIds'])==12 and set(nav['floorIds'])=={f['id'] for f in floors},'navigation floor list invalid')
assert_(all(i in nav['floorIds'] for i in nav['elevatorStops']),'elevator floor mismatch')
assert_(all(v in {x['id'] for x in env['weathers']} for v in [load('data/experience_state_contract.json')['userState']['weatherId']]),'weather state reference invalid')
with (ROOT/'qa/QA_MASTER_MATRIX.csv').open(encoding='utf-8-sig',newline='') as fh:
  qrows=list(csv.DictReader(fh))
assert_(len(qrows)>=220,'V2 QA matrix unexpectedly short')
assert_(len({x['test_id'] for x in qrows})==len(qrows),'QA IDs duplicate')
assert_(all(x['status'] in ['NOT_RUN','PASS','FAIL','BLOCKED','SKIPPED'] for x in qrows),'QA status invalid')
with (ROOT/'data/DEVICE_AND_NETWORK_TEST_MATRIX.csv').open(encoding='utf-8-sig',newline='') as fh:
  drows=list(csv.DictReader(fh))
assert_(len(drows)>=12,'device and network matrix incomplete')
assert_('PRIORITY V2.0' in (ROOT/'MASTER_PROMPT_COMPLETE.txt').read_text(encoding='utf-8'),'missing priority V2 standalone master')
if errs:
 print('PACKAGE VALIDATION FAILED:')
 for e in errs:print(' -',e)
 sys.exit(1)
print('PACKAGE VALIDATION PASSED: 12 levels, 9 residential levels, 18 units, 6 categories, 18 concept materials, 3 consistent finish packages.')
print('IMPORTANT: This checks concept DATA and FILE PRESENCE, not whether the real website or 3D models have been built.')
