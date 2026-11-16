#!/usr/bin/env python3
"""V4 handoff fixture validation; DOES NOT validate built application or human translations."""
from pathlib import Path
import csv,json,sys
R=Path(__file__).resolve().parents[1]
J=lambda n: json.loads((R/n).read_text(encoding='utf-8'))
E=[]
def ck(b,msg):
 if not b: E.append(msg)
l=J('data/locales_manifest.seed.json');c=J('data/localized_copy.seed.json');a=J('data/audio_preferences.seed.json');s=J('data/experience_state_contract.json');rev=J('data/translation_review_status.seed.json')
ck(l['defaultLocale']=='ar','Arabic default')
ck(set(c)==set(l['urlPrefix'])==set(rev['localeStatus'])=={'ar','en','ckb','zh'},'Locale set mismatch')
ck({v['key']:v['dir'] for v in l['supported']}=={'ar':'rtl','en':'ltr','ckb':'rtl','zh':'ltr'},'Direction mismatch')
ck({v['key']:v['bcp47'] for v in l['supported']}=={'ar':'ar-IQ','en':'en','ckb':'ckb-IQ','zh':'zh-Hans'},'Locale tags mismatch')
ck(all(set(d)==set(c['ar']) for d in c.values()),'Translations missing or extra keys')
ck(s['userState']['locale']=='ar','State Arabic default missing')
ck(s['userState']['audio']['muted'] is True and not s['userState']['audio']['masterEnabled'],'State not silent')
ck('ambientSoundEnabled' not in s['userState'],'Legacy audio controller found')
ck(a['muted'] and not a['masterEnabled'] and not a['userOptedInThisPageLoad'],'Audio initial defaults wrong')
ck(a['newPageLoadAlwaysResetsAudioToMuted'] and a['allowOnExplicitAudioControlOnly'],'Silent default/opt-in policy missing')
ck(all(not v['enabled'] for v in a['channels'].values()),'Audio channel begins enabled')
ck(all(z['status']=='DRAFT_UNVERIFIED' for z in rev['localeStatus'].values()),'Native review invented')
ck('explorationMode' in s['userState'] and 'navigationMode' not in s['userState'],'Mode inconsistency')
ck((R/'qa/V4_AUDIO_I18N_RELEASE_GATES.md').exists(),'QA docs missing')
ck((R/'specs/V4_FOUR_LANGUAGE_LOCALIZATION_AND_TRANSLATION_QA.md').exists(),'Locale docs missing')
ck((R/'specs/V4_AUDIO_QUIET_BY_DEFAULT.md').exists(),'Audio docs missing')
with (R/'qa/QA_MASTER_MATRIX.csv').open(encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
ck(len(rows)>350,'Not enough V4 QA cases')
ck(len(set(v['test_id'] for v in rows))==len(rows),'Duplicate QA ID')
ck(all(v['status']=='NOT_RUN' for v in rows),'False QA PASS in handoff')
ck(any('silent' in r['category'].lower() for r in rows),'Audio QA missing')
ck(any('localization' in r['category'].lower() for r in rows),'Locale QA missing')
for p in ['START_HERE.txt','CLAUDE.md','MASTER_PROMPT_COMPLETE.txt']:
 txt=(R/p).read_text(encoding='utf-8');ck('V4' in txt and 'ckb' in txt and 'zh' in txt,'V4 not linked from '+p)
if E:
 print('V4 VALIDATION FAILED:');print(*E,sep='\n- ');sys.exit(1)
print('V4 PACKAGE FIXTURE VALIDATION PASSED: four key-complete draft locales; RTL/LTR tags; silent-by-default opt-in audio; QA status NOT_RUN; V4 instructions present.')
print('This DOES NOT validate the actual website, sound behavior, translated meaning, native editorial review, WebGL performance, or device usability.')
