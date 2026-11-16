#!/usr/bin/env python3
"""V3 offline package fixture/rights/mode consistency test; does NOT test website."""
from pathlib import Path
import json,csv,subprocess,sys,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
def j(p): return json.loads((ROOT/p).read_text(encoding="utf-8"))
errors=[]
def ck(ok,message):
 if not ok:errors.append(message)
creator=j("data/creator_contact.seed.json")["creator"]
ck(creator["fullLegalName"]=="Rashid Omar Mohammed","Name mismatch")
ck(creator["email"]=="rashid.iq12@gmail.com","Email mismatch")
ck(creator["phoneE164"]=="+9647700864990","Phone mismatch")
ck(creator["telHref"]=="tel:+9647700864990","Tel URI malformed")
ck(creator["mailtoHref"]=="mailto:rashid.iq12@gmail.com","Mailto URI malformed")
m=j("data/exploration_modes.seed.json")
ck({v["id"] for v in m["modes"]}=={"cinematic","guided","free_walk","property_explorer"},"Four modes missing")
ck(m["fallback"]["id"]=="lite_2d","Lite fallback missing")
st=j("data/experience_state_contract.json")
ck(st["userState"]["explorationMode"]==m["defaultMode"],"Mode state/default conflict")
ck("navigationMode" not in st["userState"],"Legacy duplicate mode field should be removed")
ck(j("data/navigation_manifest.seed.json")["authoritativeModeStateKey"]=="explorationMode","Navigation mode source mismatch")
ck("ar" in j("data/localized_copy.seed.json") and "en" in j("data/localized_copy.seed.json"),"Translations missing")
required=["specs/VISUAL_DIRECTION_AND_DESIGN_SYSTEM_V3.md","specs/EXPLORATION_CAMERA_MODES_V3.md","specs/CREATOR_OWNERSHIP_CONTACT_BRANDING_V3.md","specs/SIGNATURE_CREATIVE_EXPERIENCES_V3.md","qa/V3_VISUAL_UX_NAVIGATION_RELEASE_GATES.md","AUDIT_AND_REVISIONS_V3_AR.txt"]
for p in required: ck((ROOT/p).is_file(),"Missing "+p)
with (ROOT/"qa/QA_MASTER_MATRIX.csv").open(encoding="utf-8-sig",newline="") as f: rows=list(csv.DictReader(f))
ck(len(rows)>=300,"QA rows unexpectedly low")
ck(len({v["test_id"] for v in rows})==len(rows),"QA ID duplicates")
ck(all(v["status"]=="NOT_RUN" for v in rows),"Do not mark unperformed QA as passed")
ck(any(v["category"]=="Ownership and contact" for v in rows),"Ownership QA missing")
ck(any(v["category"]=="Mode switching" for v in rows),"Mode switching QA missing")
text=(ROOT/"MASTER_PROMPT_COMPLETE.txt").read_text(encoding="utf-8")
for word in ["Rashid Omar Mohammed","Cinematic","Guided","Free Walk","Property Explorer","V3"]:
 ck(word in text,"Missing from standalone master: "+word)
if errors:
 print("V3 DATA VALIDATION FAILED:")
 for e in errors:print("-",e)
 sys.exit(1)
print("V3 DATA VALIDATION PASSED: creator contact exact, one authoritative controller mode, 4 exploration modes + Lite, bilingual UI labels, V3 docs and QA cases consistent.")
print("NOT A WEBSITE TEST. All real-browser, Blender and device tests must be executed by Claude after implementation.")
