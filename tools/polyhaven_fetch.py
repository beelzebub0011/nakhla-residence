"""Download CC0 Poly Haven texture sets (1K JPG: diffuse/albedo, OpenGL normal, roughness) into assets_src/polyhaven
and append them to project_artifacts/POLYHAVEN_ASSETS.csv. Only api.polyhaven.com / dl.polyhaven.org are contacted.
Usage: python tools/polyhaven_fetch.py asphalt_02 rectangular_paving ...   (skips files already present)"""
import csv, json, os, sys, urllib.request, datetime

SRC = 'assets_src/polyhaven'; LEDGER = 'project_artifacts/POLYHAVEN_ASSETS.csv'
UA = {'User-Agent': 'nakhla-asset-fetch'}
get = lambda u: json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))
rows = list(csv.DictReader(open(LEDGER, encoding='utf-8')))
known = {r['file'] for r in rows}
info_out = {}
for aid in sys.argv[1:]:
    info = get(f'https://api.polyhaven.com/info/{aid}'); files = get(f'https://api.polyhaven.com/files/{aid}')
    authors = ', '.join(info.get('authors', {}).keys()); dims = info.get('dimensions')
    info_out[aid] = {'dimensions_mm': dims, 'authors': authors}
    for key, names in (('diff', ['Diffuse', 'diff', 'albedo', 'col_1']), ('nor_gl', ['nor_gl']), ('rough', ['Rough', 'rough'])):
        node = next((files[n] for n in names if n in files), None)
        if not node: print(aid, 'missing', key); continue
        f = node['1k']['jpg']; url = f['url']; name = url.rsplit('/', 1)[1]; path = f'{SRC}/{name}'
        if not os.path.exists(path):
            urllib.request.urlretrieve(url, path)
        if name not in known:
            rows.append({'asset': aid, 'file': name, 'bytes': str(os.path.getsize(path)), 'source_url': url, 'licence': 'CC0 1.0 (public domain) — polyhaven.com/license',
                         'authors': authors, 'downloaded': datetime.date.today().isoformat(), 'approved_by_owner': 'yes (V11 brief: vetted free assets allowed)', 'used_for': 'exterior / site (V11)'})
            known.add(name)
        print(aid, key, name, os.path.getsize(path))
with open(LEDGER, 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
json.dump(info_out, open(f'{SRC}/_v11_info.json', 'w'), indent=1)
