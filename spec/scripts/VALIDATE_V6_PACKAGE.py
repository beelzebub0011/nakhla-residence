#!/usr/bin/env python3
"""Static SPEC and fixture checks; NOT a running app or linguistic validation."""
from pathlib import Path
import json,csv,hashlib
R=Path(__file__).resolve().parents[1]
def j(p): return json.loads((R/p).read_text(encoding='utf-8'))
contract=j('data/v6_ai_contract.seed.json')
assert contract['schemaVersion']==6
assert contract['ui']['mainSections']==['explore','tour','design','amenities']
assert contract['ui']['locales']==['ar','en','ckb','zh']
assert contract['implementationPolicy']['localFactualResolverRequired']
assert not contract['implementationPolicy']['externalLLMEnabledByDefault']
assert not contract['implementationPolicy']['voiceEnabledByDefault']
assert contract['ui']['audioOnHardLoad'] is False
assert len(contract['allowedActions'])>=12 and all(x in contract['forbiddenActions'] for x in ['execute_code','purchase','secret_read'])
assert all(v is None for v in contract['unknownPolicy'].values())
loc=j('data/v6_ai_ui_translations.DRAFT.json');assert loc['metadata']['requiresQualifiedNativeReview']
keys={lang:set(loc[lang].keys()) for lang in ('ar','en','ckb','zh')}
assert len(set(map(frozenset,keys.values())))==1
for lang in keys:
 assert all(isinstance(loc[lang][key],str) and loc[lang][key].strip() for key in keys[lang])
ints=j('data/v6_ai_intents.seed.json')['intents']; assert len(ints)>=35 and len({x['id'] for x in ints})==len(ints)
facts=j('data/v6_ai_facts.seed.json')
assert all(a['value'] is None and a['status']=='unknown' for a in facts['missingFacts'])
tower=j('data/tower_concept.seed.json')
assert tower['project']['levels_total_including_ground']==12 and tower['project']['residential_units_total']==18
assert len(tower['units'])==18
assert {u['id'] for u in tower['unitTypes']}=={'TYPE_A','TYPE_B'}
assert next(x['approx_area_sqm'] for x in tower['unitTypes'] if x['id']=='TYPE_A')==125
assert next(x['approx_area_sqm'] for x in tower['unitTypes'] if x['id']=='TYPE_B')==145
room=j('data/room_program.seed.json')
assert all(a['dimensions_m'] is None for a in room['rooms'])
v5=j('data/v5_sections.seed.json')
assert [a['id'] for a in v5['sections']]==['explore','tour','design','amenities']
ai=next(a for a in v5['featureFlags'] if a['id']=='ai_concierge')
assert ai['tier']=='P0' and 'local grounded' in ai['requirement']
v5p=j('data/v5_product_contract.seed.json')
assert not v5p['aiExternalRequestsDefaultOff'] is False
assert v5p['aiFactualAssistant']['mandatoryTier']=='P0'
with (R/'qa/V6_AI_QA_CASES.csv').open(encoding='utf-8-sig',newline='') as f: q=list(csv.DictReader(f))
with (R/'qa/QA_MASTER_MATRIX.csv').open(encoding='utf-8-sig',newline='') as f: allq=list(csv.DictReader(f))
assert len(q)>=75 and len({a['test_id'] for a in allq})==len(allq)
assert all(a['status']=='NOT_RUN' for a in q)
assert set(a['test_id'] for a in q).issubset({a['test_id'] for a in allq})
assert all((R/p).exists() for p in ['specs/V6_AI_PROPERTY_EXPERT.md','specs/V6_AI_GROUNDING_ENGINE_AND_ACTIONS.md','specs/V6_AI_CONTEXTUAL_UI_I18N_PRIVACY.md','qa/V6_AI_RELEASE_GATES.md','templates/V6_AI_RELEASE_REPORT_TEMPLATE.md'])
start=(R/'START_HERE.txt').read_text(encoding='utf-8');assert start.startswith(('# V6 HIGHEST PRIORITY', '# V7 HIGHEST PRIORITY', '# V8 HIGHEST PRIORITY'))
assert 'V6 > V5 > V4 > V3 > V2 > V1' in start
assert 'Rashid Omar Mohammed' in (R/'data/creator_contact.seed.json').read_text(encoding='utf-8')
print(f'V6 STATIC FIXTURE CHECK PASSED: {len(ints)} intents, {len(q)} new NOT_RUN tests, {len(allq)} total NOT_RUN test definitions, four draft locales, canonical project data preserved.')
print('This does NOT certify implementation, translation, model accuracy, field measurements, browser/device tests, or production readiness.')
