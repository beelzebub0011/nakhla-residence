#!/usr/bin/env python3
"""Validate handoff fixture consistency only, not the website or translations."""
from pathlib import Path
import csv,json,hashlib,sys
R=Path(__file__).resolve().parents[1]
def readj(p):return json.loads((R/p).read_text(encoding='utf-8'))
s=readj('data/v5_sections.seed.json')
assert [a['id'] for a in s['sections']]==['explore','tour','design','amenities']
assert s['mobileBottomTabsMax']==4 and s['explorationModeIsOnlyCameraMode']
fs=s['featureFlags']; ids=[f['id'] for f in fs]
assert len(ids)==len(set(ids)) and len(fs)>=18
assert {'day_in_life','smart_finder','apartment_compare','sun_view','presentation_room','furniture_fit','ai_concierge','white_label_config'}.issubset(ids)
assert all(f['tier'] in ('P0','P1','P2') for f in fs)
assert all(f['default']=='off_until_tested' for f in fs if f['tier']=='P2')
a=readj('data/audio_preferences.seed.json');assert a['muted'] and a['newPageLoadAlwaysResetsAudioToMuted']
l=readj('data/locales_manifest.seed.json');assert l['defaultLocale']=='ar' and {x['key'] for x in l['supported']}=={'ar','en','ckb','zh'}
c=readj('data/localized_copy.seed.json');ks={lang:set(c[lang].keys()) for lang in c};assert len(set(map(frozenset,ks.values())))==1
assert {f'v5.section{x.title()}' for x in ['explore','tour','design','amenities']}.issubset(ks['ar'])
for lang in ('ar','en','ckb','zh'):
 for key in ks['ar']:
  assert isinstance(c[lang][key],str) and c[lang][key].strip(),(lang,key)
contact=readj('data/creator_contact.seed.json')['creator'];assert contact['fullLegalName']=='Rashid Omar Mohammed' and contact['phoneE164']=='+9647700864990' and contact['email']=='rashid.iq12@gmail.com'
tower=readj('data/tower_concept.seed.json')['project'];assert tower['levels_total_including_ground']==12 and tower['residential_levels']==9 and tower['residential_units_total']==18
n=readj('data/navigation_manifest.seed.json');assert n['floorIds']==['G']+[f'F{i:02}' for i in range(1,12)]
assert set(n['floorUnitMappings'])=={f'F{i:02}' for i in range(1,10)}
assert readj('data/exploration_modes.seed.json')['defaultMode']=='property_explorer'
p=readj('data/v5_product_contract.seed.json');assert p['maxComparedUnits']==2 and p['audioResetOnHardLoad']['muted']
assert 'name' in p['shareSchema']['forbidden'] and 'phone' in p['shareSchema']['forbidden']
assert p['cameraControllerSourceOfTruth']=='explorationMode'
ch=readj('data/v5_story_chapters.seed.json');assert len(ch['chapters'])==5 and ch['soundDefaultOff'] and ch['skipPauseExit']
with (R/'qa/QA_MASTER_MATRIX.csv').open(encoding='utf-8-sig',newline='') as f:tests=list(csv.DictReader(f))
with (R/'qa/V5_SECTIONED_QA_CASES.csv').open(encoding='utf-8-sig',newline='') as f:v5tests=list(csv.DictReader(f))
assert len({t['test_id'] for t in tests})==len(tests)
assert len(v5tests)>=65 and all(t['status']=='NOT_RUN' for t in v5tests)
assert set(t['test_id'] for t in v5tests).issubset({t['test_id'] for t in tests})
assert all((R/f).exists() for f in ['START_HERE.txt','CLAUDE.md','PROJECT_CHARTER.md','specs/V5_INFORMATION_ARCHITECTURE_AND_REVEAL.md','specs/V5_PERFORMANCE_ACCESSIBILITY_AND_INTEGRATION.md','qa/V5_RELEASE_GATES.md'])
start=(R/'START_HERE.txt').read_text(encoding='utf-8');assert start.startswith(('# V5 LATEST OVERRIDE','# V6 HIGHEST PRIORITY','# V7 HIGHEST PRIORITY','# V8 HIGHEST PRIORITY')) and '# V5 LATEST OVERRIDE' in start
assert 'V5 > V4 > V3' in start
print(f'V5 FIXTURE VALIDATION PASSED: four sections, {len(fs)} roadmap flags, {len(v5tests)} NEW QA tests, {len(tests)} TOTAL QA definitions, four translation DRAFT dictionaries and original contact/floor topology.')
print('NOT a built product test or certified translation review. Test actual browsers/devices and request native language proofreading before production claims.')
