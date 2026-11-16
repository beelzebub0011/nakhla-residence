"""Write ASSET_MANIFEST.json (source -> derived mapping with SHA-256) and SOURCE_LICENSE_LEDGER.csv.
Run after a build / bake / render:  python tools/manifest.py"""
import hashlib, json, os, csv, glob, datetime

def h(p):
    d = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): d.update(b)
    return d.hexdigest()

def entries(pattern, kind, source, licence):
    out = []
    for p in sorted(glob.glob(pattern, recursive=True)):
        if os.path.isfile(p): out.append({'path': p.replace('\\', '/'), 'kind': kind, 'source': source, 'licence': licence, 'bytes': os.path.getsize(p), 'sha256': h(p)})
    return out

items = []
items += entries('src/domain/*.ts', 'canonical model (code)', 'original', 'owner')
items += entries('public/textures/*.jpg', 'PBR texture (processed)', 'assets_src/polyhaven via tools/process_textures.py', 'CC0 1.0')
items += entries('public/textures/*.png', 'original drawn texture (leaf cluster, V11 r2)', 'tools/leaf_cluster.py', 'owner')
items += entries('public/lightmaps/*', 'baked light (derived)', 'blender/build_nakhla.py --bake + tools/floor_irradiance.py', 'owner (computed)')
items += entries('public/renders/*', 'Cycles still (derived)', 'blender/build_nakhla.py', 'owner (computed)')
items += entries('public/renders/w/*', 'responsive WebP of a Cycles still (derived)', 'tools/web_images.py', 'owner (computed)')
items += entries('public/gateway/*', 'gateway preview: real live-WebGL capture (derived)', 'tools/parity_shots.mjs + tools/web_images.py', 'owner (computed)')
items += entries('blender/scene_prims.json', 'Blender scene export (derived)', 'tests/unit/export-artifacts.test.ts', 'owner (computed)')
items += entries('blender/scene_meshes.bin', 'Blender mesh export (derived)', 'tests/unit/export-artifacts.test.ts', 'owner (computed)')
items += entries('blender/nakhla_tower.blend', 'editable Blender source (derived)', 'blender/build_nakhla.py', 'owner (computed)')
items += entries('blender/nakhla_tower.glb', 'glTF interchange (derived)', 'blender/build_nakhla.py', 'owner (computed)')
items += entries('assets_src/polyhaven/*', 'third-party original download', 'polyhaven.com', 'CC0 1.0')
json.dump({'generatedBy': 'tools/manifest.py', 'generatedAt': datetime.datetime.now().isoformat(timespec='seconds'),
           'note': 'Derived files are regenerated from the canonical model; compare hashes to detect stale outputs.', 'items': items},
          open('ASSET_MANIFEST.json', 'w', encoding='utf-8'), indent=1)

rows = [['asset', 'type', 'source_url_or_path', 'licence', 'attribution', 'commercial_use', 'derivatives_allowed', 'used_in', 'sha256_or_note']]
poly = list(csv.DictReader(open('project_artifacts/POLYHAVEN_ASSETS.csv', encoding='utf-8')))
for r in poly:
    p = os.path.join('assets_src/polyhaven', r['file'])
    rows.append([r['asset'] + ' / ' + r['file'], 'texture or HDRI (third party)', r['source_url'], 'CC0 1.0', r['authors'], 'yes', 'yes', r['used_for'], h(p) if os.path.exists(p) else 'missing'])
for a in csv.DictReader(open('project_artifacts/ASSET_LICENSE_LEDGER.csv', encoding='utf-8')):
    rows.append([a['asset'], a['type'], a['source'], a['licence'], 'see licence', 'see licence', 'see licence', a['notes'], a['version']])
rows.append(['Leaf-cluster card texture (trees, olives, shrubs)', 'original procedural drawing', 'tools/leaf_cluster.py -> public/textures/leaf_cluster.png', 'owner', 'Rashid Omar Mohammed', 'yes', 'yes', 'broadleaf trees in the website and Cycles', 'deterministic; regenerate with the script'])
rows.append(['Sound (all ambience, music pad, effects)', 'original procedural', 'src/audio/ambience.ts', 'owner', 'Rashid Omar Mohammed', 'yes', 'yes', 'website sound (off by default)', 'synthesised at runtime; no files'])
rows.append(['Font: Noto Naskh Arabic (display, V11)', 'third party (npm @fontsource)', 'node_modules/@fontsource/noto-naskh-arabic', 'SIL OFL 1.1', 'Google / Noto authors', 'yes', 'yes (OFL terms)', 'Arabic and Sorani titles', 'package-lock.json'])
rows.append(['Fonts: Noto Sans Arabic, Manrope, Cormorant Garamond', 'third party (npm @fontsource)', 'node_modules/@fontsource', 'SIL OFL 1.1', 'font authors', 'yes', 'yes (OFL terms)', 'interface text', 'package-lock.json'])
with open('SOURCE_LICENSE_LEDGER.csv', 'w', newline='', encoding='utf-8') as f: csv.writer(f).writerows(rows)
print('manifest items', len(items), '| ledger rows', len(rows) - 1)
