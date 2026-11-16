#!/usr/bin/env python3
"""Build project_artifacts/QA_STATUS.csv from the specification's QA matrix.

The source matrix (spec/qa/QA_MASTER_MATRIX.csv) is never modified. A row is marked PASS only when a
named automated test demonstrably covers that exact scenario; everything else stays NOT_RUN.
Evidence scope for every PASS: automated run in Google Chrome (headless, GPU via ANGLE/D3D11) on one
Windows 11 desktop with an RTX 3050 — NOT a physical phone/tablet, NOT Safari/Firefox, NOT a human
comfort study.
"""
from pathlib import Path
import csv, json, sys

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
SRC = ROOT / 'spec/qa/QA_MASTER_MATRIX.csv'
OUT = ROOT / 'project_artifacts/QA_STATUS.csv'

E_SLICE = 'tests/e2e/slice.spec.ts + project_artifacts/evidence/motion-vertical-slice.json'
E_CYC = 'tests/e2e/motion.spec.ts + project_artifacts/evidence/motion-20-cycles.json + motion-benchmark.csv'
E_MOTION = 'tests/e2e/motion.spec.ts'
E_UNIT = 'tests/unit/motion.test.ts'
E_ACCESS = 'tests/e2e/access.spec.ts'

P, S = 'PASS', 'SKIPPED'
MAP = {
    'QA-0653': (P, 'Real click on the floor-04 facade selects F04; upper levels lift and fade (no cut).', E_SLICE),
    'QA-0654': (P, 'Floor and unit ids asserted after each transition (F04 / U04A).', E_SLICE),
    'QA-0656': (P, 'Living->kitchen: camera sampled every frame stays at eye height inside rooms/doorways.', E_SLICE),
    'QA-0658': (P, 'F10 pool -> F11 cafe keeps the selected amenity; semantic veil transit (M09).', E_SLICE),
    'QA-0663': (P, 'MotionDirector is the only camera writer; OrbitControls/GSAP are not used at all.', E_UNIT),
    'QA-0664': (P, 'Damping and trips give identical results at 120/60/30 Hz.', E_UNIT),
    'QA-0666': (P, 'Shortest-path yaw across +-pi, zero roll on every frame.', E_UNIT),
    'QA-0667': (P, 'Retarget starts from the current rendered pose (unit) and rapid floor changes keep per-frame steps bounded (browser).', E_UNIT + ' ; ' + E_MOTION),
    'QA-0672': (P, 'Durations scale with distance and stay inside the tuning bands (0.8-1.4 s).', E_SLICE),
    'QA-0674': (P, 'F03->F07->F05->U05B in quick succession ends on F05/U05B with the 3D cutaway in agreement.', E_MOTION),
    'QA-0675': (P, 'Home/Back during a flight returns to the tower; every level solid and visible again.', E_MOTION),
    'QA-0689': (P, 'Cold run including the first material swap: worst frame 20.7 ms, no frame over 50 ms.', E_SLICE),
    'QA-0690': (P, 'Store value, material library id and GPU pixels all change to the chosen finish.', E_SLICE),
    'QA-0692': (P, 'Landing CTA is usable immediately; returning visitors skip it; no forced intro.', E_SLICE),
    'QA-0693': (P, 'p50/p95/p99 logged per transition (auto tier on this desktop = high, stricter than balanced).', E_SLICE),
    'QA-0694': (P, 'Measured p95 7.1 ms active frame time (target <= 20 ms). Headless Chrome, 1366x768, DPR 1.', E_CYC),
    'QA-0696': (P, 'Frames over 50 ms counted per transition and exported (0 in 87 transitions).', E_CYC),
    'QA-0697': (P, 'Cold slice (worst frame 20.7 ms) vs warm 20-cycle run (worst frame 9.8 ms).', E_SLICE + ' ; ' + E_CYC),
    'QA-0699': (P, '20 cycles: GPU geometries 189->189, textures 137->137, programs 21->21, JS heap flat.', E_CYC),
    'QA-0700': (P, 'Ran uncapped at ~143 Hz with elapsed-time motion; idle frames are not rendered (render on demand).', E_CYC),
    'QA-0701': (P, 'A 30 Hz trip takes the same wall time and ends on the same pose as 120 Hz.', E_UNIT),
    'QA-0704': (P, 'An 8 s frame gap advances motion by at most 50 ms.', E_UNIT),
    'QA-0708': (P, '2D Lite with WebGL disabled keeps floor, unit, room and finishes and the assistant.', E_ACCESS),
    'QA-0712': (P, 'No Higgsfield or any third-party request exists at runtime (zero external requests asserted).', E_ACCESS),
    'QA-0713': (P, 'prefers-reduced-motion honoured from first paint; trips become short veils.', E_MOTION),
    'QA-0714': (P, 'Preference switched during a transition: state stays valid, later trips are reduced.', E_MOTION),
    'QA-0722': (P, 'Muted across navigation, mode, locale changes and after reload; no AudioContext before opt-in.', E_ACCESS),
    'QA-0727': (P, 'Exactly four tabs in all four locales; Motion Gentle/Reduced lives in the More menu.', E_ACCESS),
    'QA-0728': (P, 'Assistant navigation runs through the store -> MotionDirector (single owner).', E_ACCESS),
    'QA-0729': (P, 'F10 = wellness, F11 = dining after animated jumps; no apartment ids on those levels.', E_SLICE),
    'QA-0698': (S, 'Not applicable: the 3D scene has no network assets (geometry and textures are generated on device).', 'project_artifacts/DECISION_LOG.md ADR-03'),
    'QA-0707': (S, 'Not applicable: no remote asset is fetched when changing scene.', 'project_artifacts/DECISION_LOG.md ADR-03'),
    'QA-0711': (S, 'Not applicable: no GLB/KTX2 decoder is used at runtime.', 'project_artifacts/DECISION_LOG.md ADR-03'),
}

rows = list(csv.DictReader(SRC.open(encoding='utf-8-sig', newline='')))
assert len(rows) == 732, len(rows)
ids = {r['test_id'] for r in rows}
assert set(MAP) <= ids
for r in rows:
    if r['test_id'] in MAP:
        r['status'], r['actual_result'], r['evidence_path'] = MAP[r['test_id']]
    else:
        r['status'] = 'NOT_RUN'
OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open('w', encoding='utf-8-sig', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
count = {}
for r in rows: count[r['status']] = count.get(r['status'], 0) + 1
p0_open = sum(1 for r in rows if r['priority'] == 'P0' and r['status'] == 'NOT_RUN')
summary = {'total': len(rows), 'byStatus': count, 'p0NotRun': p0_open,
           'scopeOfPass': 'Automated, Chrome headless with GPU on one Windows 11 desktop (RTX 3050). No physical phone/tablet, Safari, Firefox, screen reader or human comfort session was run.',
           'releaseDecision': 'NOT READY for public release: P0 definitions remain NOT_RUN.'}
(ROOT / 'project_artifacts/QA_STATUS_SUMMARY.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps(summary, indent=2))
