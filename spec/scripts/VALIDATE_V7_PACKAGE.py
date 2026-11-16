#!/usr/bin/env python3
"""Static integrity of V7 REQUIREMENTS AND FIXTURES only — never certifies website or provider."""
from pathlib import Path
import csv,json
R=Path(__file__).resolve().parents[1]
def rdj(p):return json.loads((R/p).read_text(encoding='utf-8'))
start=(R/'START_HERE.txt').read_text(encoding='utf-8')
assert start.startswith(('# V7 HIGHEST PRIORITY','# V8 HIGHEST PRIORITY')) and 'V7 > V6 > V5 > V4 > V3 > V2 > V1' in start
files=['specs/V7_SEVEN_ENGINEERING_QUALITY_GATES.md','specs/V7_HIGGSFIELD_CREATIVE_WORKFLOW.md','specs/V7_CREATIVE_STORYBOARD_AND_MEDIA_POLICY.md','ops/V7_PROVIDER_SAFETY_AND_ACTIVATION.md','qa/V7_RELEASE_GATES.md','qa/V7_NEW_QA_CASES.csv','data/v7_quality_contract.seed.json','data/v7_provider_policy.seed.json','data/v7_architecture_provenance.seed.json','research/V7_REFERENCES_AND_ENTITLEMENT_NOTES.md','V7_QUICK_GUIDE_AR.txt']
assert all((R/p).exists() for p in files)
q=rdj('data/v7_quality_contract.seed.json');pr=rdj('data/v7_provider_policy.seed.json');ar=rdj('data/v7_architecture_provenance.seed.json')
assert q['schemaVersion']==pr['schemaVersion']==ar['schemaVersion']==7
assert len(q['releaseGates'])==7 and all(x for x in q['releaseGates'])
assert pr['optional'] and not pr['enableByDefault'] and not pr['chargeOrNewSubscriptionAllowedWithoutOwnerApproval']
assert pr['autoRenewRisk'] and pr['claimedDurationHours']==72
assert ar['conceptDefaults']['floorCountTotal']==12 and ar['conceptDefaults']['unitCount']==18
assert ar['conceptDefaults']['roomDimensionsMeters'] is None
v6=rdj('data/v6_ai_contract.seed.json');assert v6['ui']['mainSections']==['explore','tour','design','amenities'] and len(v6['ui']['locales'])==4
with (R/'qa/V7_NEW_QA_CASES.csv').open(encoding='utf-8-sig',newline='') as f:new=list(csv.DictReader(f))
with (R/'qa/QA_MASTER_MATRIX.csv').open(encoding='utf-8-sig',newline='') as f:matrix=list(csv.DictReader(f))
assert len(new)>=90 and len(matrix)>=550+len(new), (len(matrix),len(new))
assert all(row['status']=='NOT_RUN' for row in matrix)
assert len({r['test_id'] for r in matrix})==len(matrix)
assert {r['test_id'] for r in new}.issubset({r['test_id'] for r in matrix})
master=(R/'MASTER_PROMPT_COMPLETE.txt').read_text(encoding='utf-8')
assert len(master)>390_000 and '==== ALL PREVIOUS V6 FULL MASTER PROMPT PRESERVED BELOW ====' in master
assert (R/'data/creator_contact.seed.json').exists()
print(f'V7 SPEC PACK CHECK PASSED: {len(matrix)} defined NOT_RUN tests; {len(new)} new cases; 7 release gates; optional provider, V6 data preserved. No site runtime tests performed.')
