# -*- coding: utf-8 -*-
"""Append new message keys to all four dictionaries (en / ar / ckb / zh). Usage: python tools/i18n_add.py <keys.json>
keys.json: {"key": ["en", "ar", "ckb", "zh"], ...}. Keys already present are skipped. Apostrophes become ’."""
import json, sys
K = json.load(open(sys.argv[1], encoding='utf-8'))
for i, loc in enumerate(['en', 'ar', 'ckb', 'zh']):
    p = f'src/i18n/{loc}.ts'; s = open(p, encoding='utf-8').read()
    new = {k: v for k, v in K.items() if f"'{k}':" not in s}
    if not new: continue
    esc = lambda t: t.replace("'", '’').replace('\\', '\\\\')
    line = '  ' + ', '.join(f"'{k}': '{esc(v[i])}'" for k, v in new.items()) + ','
    if loc == 'en':
        assert '\n} as const;' in s; s = s.replace('\n} as const;', '\n' + line + '\n} as const;', 1)
    else:
        s = s.rstrip(); assert s.endswith('};'); s = s[:-2].rstrip() + '\n' + line + '\n};\n'
    open(p, 'w', encoding='utf-8').write(s)
print('added', len(K))
