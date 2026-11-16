# NAKHLA RESIDENCE — deterministic Blender build from the SAME scene description as the web model.
#
#   node tools/blender.mjs blender/build_nakhla.py blender/scene_prims.json blender <render_dir> [flags]
#   flags: --no-render  --only=id1,id2  --golden (only the Golden Apartment cameras)  --preview (fast, small)
#          --no-save (skip .blend/.glb)  --samples=N
#
# Geometry: plain prims (boxes/quads/slabs) + the modelled furniture meshes (scene_meshes.bin).
# Materials: the same CC0 Poly Haven scans and the same procedural finish pixels the browser uses,
# box-projected in metres. Light: physical sky + sun from the simulated solar position, real lamp
# positions, night HDRI. Colour: AgX view transform (the browser uses AgX tone mapping as well).
# CONCEPT • NOT BUILT — not a construction document. Renders are NOT photographs.
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
pos_args = [a for a in argv if not a.startswith('--')]
SCENE_JSON = pos_args[0] if len(pos_args) > 0 else 'blender/scene_prims.json'
OUT_DIR = pos_args[1] if len(pos_args) > 1 else 'blender'
RENDER_DIR = pos_args[2] if len(pos_args) > 2 else 'public/renders'
flag = lambda n: any(a == n for a in argv)
opt = lambda n, d=None: next((a.split('=', 1)[1] for a in argv if a.startswith(n + '=')), d)
DO_RENDER = not flag('--no-render'); PREVIEW = flag('--preview'); GOLDEN = flag('--golden'); SAVE = not flag('--no-save')
ONLY = [x for x in (opt('--only', '') or '').split(',') if x]
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(SCENE_JSON)), '..'))

data = json.load(open(SCENE_JSON, encoding='utf-8'))
if flag('--crown-cams'):   # V11.4 crown (D18): close review views of the tower top (render them into a review folder, never the published set)
    data['cameras'] += data.get('crownPreviewCameras', [])
MESHBIN = np.fromfile(os.path.join(os.path.dirname(os.path.abspath(SCENE_JSON)), data.get('meshBin', 'scene_meshes.bin')), dtype='<f4')
os.makedirs(OUT_DIR, exist_ok=True); os.makedirs(RENDER_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

def srgb(hexstr):
    h = hexstr.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0]

def set_in(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value; return True
    return False

IMAGES = {}
def image(path, color):
    key = (path, color)
    if key not in IMAGES:
        img = bpy.data.images.load(os.path.join(ROOT, path), check_existing=True)
        img.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
        IMAGES[key] = img
    return IMAGES[key]

MATS = {}
def material(slot):
    if slot in MATS: return MATS[slot]
    d = data['materials'].get(slot, {'color': '#ff00ff', 'rough': 0.8, 'metal': 0, 'kind': 'pbr'})
    m = bpy.data.materials.new('NK_' + slot.replace(':', '_')); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF'); out = nt.nodes.get('Material Output')
    col = srgb(d['color']); k = d['kind']
    set_in(bsdf, ['Base Color'], col); set_in(bsdf, ['Roughness'], float(d['rough'])); set_in(bsdf, ['Metallic'], float(d['metal']))
    if k == 'img' and d.get('tex'):
        t = d['tex']; tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1 / t['cover'][0], 1 / t['cover'][1], 1 / t['cover'][1])
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        def tex(path, color):
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = image(path, color); n.projection = 'BOX'; n.projection_blend = 0.15
            nt.links.new(mp.outputs['Vector'], n.inputs['Vector']); return n
        dn = tex(t['d'], True); mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = 1.0
        nt.links.new(dn.outputs['Color'], mix.inputs['A']); mix.inputs['B'].default_value = (t['tint'][0], t['tint'][1], t['tint'][2], 1.0)
        nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
        rn = tex(t['r'], False); mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.use_clamp = True; mul.inputs[1].default_value = float(t['roughMul'])
        mul.name = 'nk_roughmul'; m['nk_rm'] = float(t['roughMul'])
        nt.links.new(rn.outputs['Color'], mul.inputs[0]); nt.links.new(mul.outputs['Value'], bsdf.inputs['Roughness'])
        nn = tex(t['n'], False); nm = nt.nodes.new('ShaderNodeNormalMap'); nm.space = 'OBJECT'; nm.inputs['Strength'].default_value = 0.0
        # box-projected tangent normals have no consistent tangent frame: use the height cue as bump instead
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.004
        nt.links.new(dn.outputs['Color'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
        nt.nodes.remove(nm); nt.nodes.remove(nn)
        if d.get('lit'):   # V11.3: neighbours' occupied windows glow after sunset (same lit map as the website)
            ln = tex(d['lit'], True); nt.links.new(ln.outputs['Color'], bsdf.inputs['Emission Color'] if 'Emission Color' in bsdf.inputs else bsdf.inputs['Emission'])
            set_in(bsdf, ['Emission Strength'], 0.0); m['nk_emissive'] = 4
    elif k in ('glass', 'water'):
        # architectural glass: lets daylight through (no caustic noise), keeps a clear reflection
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); gl = nt.nodes.new('ShaderNodeBsdfGlossy'); ms = nt.nodes.new('ShaderNodeMixShader')
        fr = nt.nodes.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.33 if k == 'water' else 1.5
        gl.inputs['Roughness'].default_value = 0.03
        tr.inputs['Color'].default_value = (0.55, 0.78, 0.84, 1) if k == 'water' else (0.93, 0.96, 0.95, 1)
        fm = nt.nodes.new('ShaderNodeMath'); fm.operation = 'MULTIPLY'; fm.inputs[1].default_value = 0.55; nt.links.new(fr.outputs['Fac'], fm.inputs[0])
        nt.links.new(fm.outputs['Value'], ms.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], ms.inputs[1]); nt.links.new(gl.outputs['BSDF'], ms.inputs[2])
        nt.links.new(ms.outputs['Shader'], out.inputs['Surface'])
    elif k in ('emissive', 'window_lit'):
        set_in(bsdf, ['Emission Color', 'Emission'], srgb('#ffd9a8' if k == 'emissive' else '#ffcf8a')); set_in(bsdf, ['Emission Strength'], 0.0)
        m['nk_emissive'] = 2 if k == 'window_lit' else 1; m['nk_glow'] = float(d.get('glow') or 0.15)
    elif k == 'shop_lit':
        # V11 r2: an open shop - dark glossy glass by day, warm interior glow after sunset
        set_in(bsdf, ['Emission Color', 'Emission'], srgb('#d98a3e')); set_in(bsdf, ['Emission Strength'], 0.0); m['nk_emissive'] = 3
    elif k == 'lantern':
        # V11.4 roof crown (D18): lantern screen and light lines, dark by day, warm after sunset
        set_in(bsdf, ['Emission Color', 'Emission'], srgb('#ffc98a')); set_in(bsdf, ['Emission Strength'], 0.0); m['nk_emissive'] = 5
    elif k == 'flat':
        set_in(bsdf, ['Roughness'], 1.0)
    m.diffuse_color = col
    try: m.use_backface_culling = False
    except Exception: pass
    MATS[slot] = m
    return m

def add_box(bm, p, z0):
    x0, x1, y0, y1 = p['x0'] - 9, p['x1'] - 9, p['y0'] - 12, p['y1'] - 12; a, b = z0 + p['z0'], z0 + p['z1']
    if x1 - x0 < 1e-5 or y1 - y0 < 1e-5 or b - a < 1e-5: return
    v = [bm.verts.new(c) for c in [(x0, y0, a), (x1, y0, a), (x1, y1, a), (x0, y1, a), (x0, y0, b), (x1, y0, b), (x1, y1, b), (x0, y1, b)]]
    for f in [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]: bm.faces.new([v[i] for i in f])

def add_cyl(bm, p, z0, seg=20):
    cx, cy = p['cx'] - 9, p['cy'] - 12; r0 = p['r']; r1 = p.get('r2', p['r']); a, b = z0 + p['z0'], z0 + p['z1']
    lo = [bm.verts.new((cx + r0 * math.cos(2 * math.pi * i / seg), cy + r0 * math.sin(2 * math.pi * i / seg), a)) for i in range(seg)]
    hi = [bm.verts.new((cx + r1 * math.cos(2 * math.pi * i / seg), cy + r1 * math.sin(2 * math.pi * i / seg), b)) for i in range(seg)]
    for i in range(seg):
        j = (i + 1) % seg; bm.faces.new([lo[i], lo[j], hi[j], hi[i]])
    bm.faces.new(list(reversed(lo))); bm.faces.new(hi)

def set_lm(bm, f, p):
    lm = p.get('lm')
    if not lm: return
    uvl = bm.loops.layers.uv.get('LM') or bm.loops.layers.uv.new('LM')
    for loop, uv in zip(f.loops, [(lm[0], lm[1]), (lm[2], lm[1]), (lm[2], lm[3]), (lm[0], lm[3])]): loop[uvl].uv = uv

def add_quad(bm, p, z0):
    ax, ay, bx, by = p['ax'] - 9, p['ay'] - 12, p['bx'] - 9, p['by'] - 12
    v = [bm.verts.new(c) for c in [(ax, ay, z0 + p['z0']), (bx, by, z0 + p['z0']), (bx, by, z0 + p['z1']), (ax, ay, z0 + p['z1'])]]
    f = bm.faces.new(v); set_lm(bm, f, p); n = Vector((p['nx'], p['ny'], 0)); f.normal_update()
    if f.normal.dot(n) < 0: f.normal_flip()

def add_slab(bm, p, z0):
    x0, x1, y0, y1 = p['x0'] - 9, p['x1'] - 9, p['y0'] - 12, p['y1'] - 12; z = z0 + p['z']
    v = [bm.verts.new(c) for c in [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]]
    f = bm.faces.new(v); set_lm(bm, f, p)
    if not p.get('up', True): f.normal_flip()

def mesh_object(name, ps, z0):
    """Modelled meshes: non-indexed triangles with authored smooth normals."""
    P = []; N = []
    for p in ps:
        n = p['n']; o = p['off']
        pos = MESHBIN[o:o + n * 3].reshape(-1, 3).copy(); nrm = MESHBIN[o + n * 3:o + n * 6].reshape(-1, 3)
        pos[:, 0] -= 9; pos[:, 1] -= 12; pos[:, 2] += z0; P.append(pos); N.append(nrm)
    P = np.concatenate(P); N = np.concatenate(N); nv = len(P); nt = nv // 3
    me = bpy.data.meshes.new(name); me.vertices.add(nv); me.loops.add(nv); me.polygons.add(nt)
    me.vertices.foreach_set('co', P.ravel()); me.loops.foreach_set('vertex_index', np.arange(nv, dtype=np.int32))
    me.polygons.foreach_set('loop_start', np.arange(0, nv, 3, dtype=np.int32)); me.polygons.foreach_set('loop_total', np.full(nt, 3, dtype=np.int32))
    me.polygons.foreach_set('use_smooth', np.ones(nt, dtype=bool)); me.update(calc_edges=True); me.validate(clean_customdata=False)
    try: me.normals_split_custom_set_from_vertices(N.tolist())
    except Exception as e: print('[nakhla] custom normals skipped:', e)
    return me

def build(prims, z0, coll_name, parent_coll):
    coll = bpy.data.collections.new(coll_name); parent_coll.children.link(coll)
    buckets = {}
    for p in prims:
        if data['materials'].get(p['mat'], {}).get('kind') == 'skip': continue
        buckets.setdefault((p['grp'], p['mat'], p['k'] == 'mesh'), []).append(p)
    for (grp, mat, is_mesh), ps in buckets.items():
        name = f'{coll_name}_{grp}_{mat}'.replace(':', '_') + ('_m' if is_mesh else '')
        if is_mesh: me = mesh_object(name, ps, z0)
        else:
            bm = bmesh.new()
            if any(p.get('lm') for p in ps): bm.loops.layers.uv.new('LM')
            for p in ps:
                k = p['k']
                if k == 'box': add_box(bm, p, z0)
                elif k == 'cyl': add_cyl(bm, p, z0)
                elif k == 'quad': add_quad(bm, p, z0)
                elif k == 'slab': add_slab(bm, p, z0)
            if grp not in ('lining', 'floor', 'ceiling'): bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
            me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(me.name, me); ob.data.materials.append(material(mat)); coll.objects.link(ob)
        ob['nk_group'] = grp; ob['nk_material_slot'] = mat; ob['nk_semantic'] = ps[0]['sem']
    return coll

root = bpy.data.collections.new('NAKHLA_RESIDENCE'); scene.collection.children.link(root)
fills = {}; interiors = {}
for f in data['floors']:
    c = build(data['shells'][f['shell']], f['ffl'], f"{f['id']}_shell", root)
    for ob in c.objects:
        if ob['nk_group'] == 'fill': fills.setdefault(f['id'], []).append(ob)
for fid, prims in data['interiors'].items():
    ffl = next(x['ffl'] for x in data['floors'] if x['id'] == fid)
    interiors[fid] = build(prims, ffl, f'{fid}_interior', root)
build(data['roof'], data['roofLevel'], 'ROOF_crown', root)
build(data['site'], 0.0, 'SITE', root)

# ---- V11 date palms: same positions and frond geometry as the website (src/engine/site.ts palmSpots / palmCrown)
def build_palms():
    pd = data.get('palms')
    if not pd: return
    coll = bpy.data.collections.new('SITE_palms'); root.children.link(coll)
    leaf_img = os.path.join(ROOT, 'blender/tex/palm_leaf.png')
    def leaf_mat(name, color):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF')
        set_in(b, ['Base Color'], srgb(color)); set_in(b, ['Roughness'], 0.8)
        try: set_in(b, ['Subsurface Weight'], 0.0)
        except Exception: pass
        if os.path.exists(leaf_img):
            t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(leaf_img); t.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(t.outputs['Color'], b.inputs['Alpha'])
        try: m.blend_method = 'CLIP'
        except Exception: pass
        return m
    green, brown = leaf_mat('NK_palm_leaf', '#4c6a38'), leaf_mat('NK_palm_dead', '#7a6243')
    def crown_mesh(name, d, mat):
        me = bpy.data.meshes.new(name); P = d['pos']; verts = [(P[i], -P[i + 2], P[i + 1]) for i in range(0, len(P), 3)]
        I = d['idx']; faces = [(I[i], I[i + 1], I[i + 2]) for i in range(0, len(I), 3)]
        me.from_pydata(verts, [], faces); me.update()
        uvl = me.uv_layers.new(name='UVMap'); U = d['uv']
        for poly in me.polygons:
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index; uvl.data[li].uv = (U[vi * 2], U[vi * 2 + 1])
        for poly in me.polygons: poly.use_smooth = True
        me.materials.append(mat); return me
    crown = crown_mesh('NK_palm_crown', pd['crown'], green); skirt = crown_mesh('NK_palm_skirt', pd['skirt'], brown)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.27, radius2=0.2, depth=1.0, location=(0, 0, 0.5)); trunk = bpy.context.active_object
    trunk.data.materials.append(material('trunk')); tm = trunk.data; bpy.data.objects.remove(trunk)
    tm.transform(Matrix.Translation((0, 0, 0.5)))   # V11.3 fix: the cone mesh is centred on its origin; the trunk must START at the base (it was half underground, crowns floated)
    z0 = pd.get('plazaZ', 0.15)
    for i, sp in enumerate(pd['spots']):
        x, y, h = sp[0], sp[1], sp[2]; z0 = sp[3] if len(sp) > 3 else pd.get('plazaZ', 0.15)
        k = 0.85 + (i % 4) * 0.08; rot = i * 1.7; X, Y = x - 9, y - 12
        t = bpy.data.objects.new(f'palm_trunk_{i}', tm); t.location = (X, Y, z0); t.scale = (1, 1, h); t.rotation_euler = (0, 0, rot); coll.objects.link(t)
        for nm, me, dz in (('crown', crown, -0.04), ('skirt', skirt, -0.19)):
            o = bpy.data.objects.new(f'palm_{nm}_{i}', me); o.location = (X, Y, z0 + h + dz); o.scale = (k, k, k); o.rotation_euler = (0, 0, rot); coll.objects.link(o)
build_palms()

# ---- V11 round 2: broadleaf trees, olives, shrubs (src/engine/site.ts broadleafTree / treeSpots), and the canopy lettering
def build_trees():
    td = data.get('trees')
    if not td: return
    coll = bpy.data.collections.new('SITE_trees'); root.children.link(coll)
    img = bpy.data.images.load(os.path.join(ROOT, td['leafTex'])); img.colorspace_settings.name = 'sRGB'
    def leaf_mat(name, tint):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); out = nt.nodes.get('Material Output')
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs['Factor'].default_value = 1.0
        nt.links.new(t.outputs['Color'], mx.inputs['A']); mx.inputs['B'].default_value = srgb(tint)
        nt.links.new(mx.outputs['Result'], b.inputs['Base Color']); set_in(b, ['Roughness'], 0.75)
        # thin leaves let some light through: a little translucency keeps back-lit crowns from going black
        tl = nt.nodes.new('ShaderNodeBsdfTranslucent'); nt.links.new(mx.outputs['Result'], tl.inputs['Color'])
        ms = nt.nodes.new('ShaderNodeMixShader'); ms.inputs['Fac'].default_value = 0.22
        nt.links.new(b.outputs['BSDF'], ms.inputs[1]); nt.links.new(tl.outputs['BSDF'], ms.inputs[2])
        tr = nt.nodes.new('ShaderNodeBsdfTransparent'); ma = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(t.outputs['Alpha'], ma.inputs['Fac']); nt.links.new(tr.outputs['BSDF'], ma.inputs[1]); nt.links.new(ms.outputs['Shader'], ma.inputs[2])
        nt.links.new(ma.outputs['Shader'], out.inputs['Surface'])
        try: m.blend_method = 'CLIP'
        except Exception: pass
        return m
    leaf, olive = leaf_mat('NK_tree_leaf', '#ffffff'), leaf_mat('NK_olive_leaf', '#c8d0b4')
    def mesh(name, d, mat, uv=True):
        P = d['pos']; N = d['nrm']; I = d['idx']
        verts = [(P[i], -P[i + 2], P[i + 1]) for i in range(0, len(P), 3)]; faces = [(I[i], I[i + 1], I[i + 2]) for i in range(0, len(I), 3)]
        me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
        if uv:
            uvl = me.uv_layers.new(name='UVMap'); U = d['uv']
            for poly in me.polygons:
                for li in poly.loop_indices:
                    vi = me.loops[li].vertex_index; uvl.data[li].uv = (U[vi * 2], U[vi * 2 + 1])
        for poly in me.polygons: poly.use_smooth = True
        try: me.normals_split_custom_set_from_vertices([(N[i], -N[i + 2], N[i + 1]) for i in range(0, len(N), 3)])
        except Exception as e: print('[nakhla] tree normals skipped:', e)
        me.materials.append(mat); return me
    bark = material('bark'); meshes = []
    for kind, g in zip(td['kinds'], td['geo']):
        lm = mesh(f'NK_{kind}_leaves', g['leaves'], olive if kind == 'olive' else leaf)
        wm = mesh(f'NK_{kind}_wood', g['wood'], bark, uv=False) if g['wood']['pos'] else None
        meshes.append((lm, wm))
    for i, (x, y, sc, ki, base) in enumerate(td['spots']):
        rot = (i * 2.3 + x * 0.17) % (2 * math.pi)
        for j, me in enumerate(meshes[int(ki)]):
            if me is None: continue
            o = bpy.data.objects.new(f'tree_{i}_{j}', me); o.location = (x - 9, y - 12, base); o.scale = (sc, sc, sc); o.rotation_euler = (0, 0, rot); coll.objects.link(o)
    cs = data.get('canopySign')
    if cs:
        cu = bpy.data.curves.new('NK_sign', 'FONT'); cu.body = ' '.join(cs['text']); cu.size = 0.24; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = 0.003
        so = bpy.data.objects.new('NK_canopy_sign', cu); so.location = (cs['x'] - 9, cs['y'] - 12 - 0.006, cs['z']); so.rotation_euler = (math.radians(90), 0, 0); coll.objects.link(so)
        sm = bpy.data.materials.new('NK_sign_mat'); sm.use_nodes = True; sb = sm.node_tree.nodes.get('Principled BSDF')
        set_in(sb, ['Base Color'], srgb('#f3e7cf')); set_in(sb, ['Emission Color', 'Emission'], srgb('#ffe9c8')); set_in(sb, ['Emission Strength'], 0.0); sm['nk_emissive'] = 1; sm['nk_glow'] = 0.06
        cu.materials.append(sm)
        ms_ = data.get('monolithSign')   # V11.5: the name on the entrance monolith
        if ms_:
            cu2 = bpy.data.curves.new('NK_monolith_sign', 'FONT'); cu2.body = ' '.join(ms_['text']); cu2.size = 0.2; cu2.align_x = 'CENTER'; cu2.align_y = 'CENTER'; cu2.extrude = 0.004
            so2 = bpy.data.objects.new('NK_monolith_sign', cu2); so2.location = (ms_['x'] - 9, ms_['y'] - 12 - 0.008, ms_['z']); so2.rotation_euler = (math.radians(90), 0, 0); coll.objects.link(so2)
            cu2.materials.append(sm)
build_trees()

bpy.ops.mesh.primitive_plane_add(size=400000, location=(0, 0, -0.02)); ground = bpy.context.active_object; ground.name = 'SITE_ground'   # V11.3: ground to the horizon (hazed), so no sky shows below it
ground.data.materials.append(material('ground'))

# ---------------------------------------------------------------- light: sun lamp + physical sky / night HDRI
sun_data = bpy.data.lights.new('NK_Sun', 'SUN'); sun_data.angle = math.radians(0.9)
sun = bpy.data.objects.new('NK_Sun', sun_data); scene.collection.objects.link(sun)
world = bpy.data.worlds.new('NK_World'); scene.world = world; world.use_nodes = True
wn = world.node_tree; bg = wn.nodes.get('Background')
sky = wn.nodes.new('ShaderNodeTexSky')
for st in ('MULTIPLE_SCATTERING', 'NISHITA'):
    try: sky.sky_type = st; break
    except Exception: pass
try: sky.sun_disc = False
except Exception: pass
# V11.4: the physical sky goes dark just below 0°, and an elevated camera sees a sliver of that band between the far edge
# of the ground plane and the horizon (the "hairline" in the aerials). Look the sky up with the direction's elevation
# clamped to a hair above the horizon, so everything at or below 0° gets the horizon colour.
try:
    _stc = wn.nodes.new('ShaderNodeTexCoord'); _ssep = wn.nodes.new('ShaderNodeSeparateXYZ'); _scmb = wn.nodes.new('ShaderNodeCombineXYZ')
    _smax = wn.nodes.new('ShaderNodeMath'); _smax.operation = 'MAXIMUM'; _smax.inputs[1].default_value = 0.004
    _snrm = wn.nodes.new('ShaderNodeVectorMath'); _snrm.operation = 'NORMALIZE'
    wn.links.new(_stc.outputs['Generated'], _ssep.inputs['Vector']); wn.links.new(_ssep.outputs['X'], _scmb.inputs['X']); wn.links.new(_ssep.outputs['Y'], _scmb.inputs['Y'])
    wn.links.new(_ssep.outputs['Z'], _smax.inputs[0]); wn.links.new(_smax.outputs[0], _scmb.inputs['Z'])
    wn.links.new(_scmb.outputs['Vector'], _snrm.inputs[0]); wn.links.new(_snrm.outputs['Vector'], sky.inputs['Vector'])
    print('[nakhla] sky: below-horizon clamp on')
except Exception as e: print('[nakhla] sky clamp skipped:', e)
# V11.5: a soft cumulus layer over the physical sky. Its colour is the sky's own colour, desaturated and lifted, so the
# clouds are white at noon and pink-gold at sunset without any per-hour tuning. Faded out toward the horizon.
cloud_mix = None
try:
    c_tc = wn.nodes.new('ShaderNodeTexCoord'); c_sep = wn.nodes.new('ShaderNodeSeparateXYZ'); wn.links.new(c_tc.outputs['Generated'], c_sep.inputs['Vector'])
    c_z = wn.nodes.new('ShaderNodeMath'); c_z.operation = 'MAXIMUM'; c_z.inputs[1].default_value = 0.0; wn.links.new(c_sep.outputs['Z'], c_z.inputs[0])
    c_zo = wn.nodes.new('ShaderNodeMath'); c_zo.operation = 'ADD'; c_zo.inputs[1].default_value = 0.08; wn.links.new(c_z.outputs[0], c_zo.inputs[0])
    c_u = wn.nodes.new('ShaderNodeMath'); c_u.operation = 'DIVIDE'; wn.links.new(c_sep.outputs['X'], c_u.inputs[0]); wn.links.new(c_zo.outputs[0], c_u.inputs[1])
    c_v = wn.nodes.new('ShaderNodeMath'); c_v.operation = 'DIVIDE'; wn.links.new(c_sep.outputs['Y'], c_v.inputs[0]); wn.links.new(c_zo.outputs[0], c_v.inputs[1])
    c_uv = wn.nodes.new('ShaderNodeCombineXYZ'); wn.links.new(c_u.outputs[0], c_uv.inputs['X']); wn.links.new(c_v.outputs[0], c_uv.inputs['Y']); c_uv.inputs['Z'].default_value = 3.7
    c_n = wn.nodes.new('ShaderNodeTexNoise'); c_n.inputs['Scale'].default_value = 1.1; c_n.inputs['Detail'].default_value = 9.0; c_n.inputs['Roughness'].default_value = 0.58
    wn.links.new(c_uv.outputs['Vector'], c_n.inputs['Vector'])
    cloud_cov = wn.nodes.new('ShaderNodeMapRange'); cloud_cov.inputs['From Min'].default_value = 0.56; cloud_cov.inputs['From Max'].default_value = 0.78
    wn.links.new(c_n.outputs['Fac'], cloud_cov.inputs['Value'])
    c_fade = wn.nodes.new('ShaderNodeMapRange'); c_fade.inputs['From Min'].default_value = 0.01; c_fade.inputs['From Max'].default_value = 0.16; wn.links.new(c_sep.outputs['Z'], c_fade.inputs['Value'])
    c_d = wn.nodes.new('ShaderNodeMath'); c_d.operation = 'MULTIPLY'; wn.links.new(cloud_cov.outputs['Result'], c_d.inputs[0]); wn.links.new(c_fade.outputs['Result'], c_d.inputs[1])
    c_dd = wn.nodes.new('ShaderNodeMath'); c_dd.operation = 'MULTIPLY'; c_dd.inputs[1].default_value = 0.9; wn.links.new(c_d.outputs[0], c_dd.inputs[0])
    c_bw = wn.nodes.new('ShaderNodeRGBToBW'); wn.links.new(sky.outputs['Color'], c_bw.inputs['Color'])
    c_des = wn.nodes.new('ShaderNodeMix'); c_des.data_type = 'RGBA'; c_des.inputs['Factor'].default_value = 0.62
    wn.links.new(sky.outputs['Color'], c_des.inputs[6]); wn.links.new(c_bw.outputs['Val'], c_des.inputs[7])
    c_lift = wn.nodes.new('ShaderNodeMix'); c_lift.data_type = 'RGBA'; c_lift.blend_type = 'MULTIPLY'; c_lift.inputs['Factor'].default_value = 1.0
    wn.links.new(c_des.outputs[2], c_lift.inputs[6]); c_lift.inputs[7].default_value = (1.7, 1.66, 1.6, 1)
    cloud_mix = wn.nodes.new('ShaderNodeMix'); cloud_mix.data_type = 'RGBA'
    wn.links.new(c_dd.outputs[0], cloud_mix.inputs['Factor']); wn.links.new(sky.outputs['Color'], cloud_mix.inputs[6]); wn.links.new(c_lift.outputs[2], cloud_mix.inputs[7])
    print('[nakhla] sky: cloud layer on')
except Exception as e: print('[nakhla] cloud layer skipped:', e); cloud_mix = None
env = wn.nodes.new('ShaderNodeTexEnvironment')
try: env.image = bpy.data.images.load(os.path.join(ROOT, 'assets_src/polyhaven/satara_night_2k.hdr'))
except Exception as e: print('[nakhla] night HDRI missing:', e)

# the night photo lights the scene but is never SEEN: camera rays get a plain night sky (no real place in the backdrop)
lpath = wn.nodes.new('ShaderNodeLightPath'); bg_cam = wn.nodes.new('ShaderNodeBackground'); bg_cam.inputs['Color'].default_value = (0.012, 0.018, 0.035, 1); bg_cam.inputs['Strength'].default_value = 1.0
# V11: the night sky seen by the camera is a gradient (navy zenith, warm city glow at the horizon) like the website's dome
w_tc = wn.nodes.new('ShaderNodeTexCoord'); w_sep = wn.nodes.new('ShaderNodeSeparateXYZ'); w_ramp = wn.nodes.new('ShaderNodeValToRGB')
wn.links.new(w_tc.outputs['Generated'], w_sep.inputs['Vector']); wn.links.new(w_sep.outputs['Z'], w_ramp.inputs['Fac'])
_cr = w_ramp.color_ramp; _cr.elements[0].position = 0.0; _cr.elements[0].color = (0.055, 0.038, 0.03, 1); _cr.elements[1].position = 1.0; _cr.elements[1].color = (0.0035, 0.006, 0.016, 1)
for _p, _c in ((0.03, (0.035, 0.038, 0.06, 1)), (0.2, (0.012, 0.02, 0.05, 1))): _e = _cr.elements.new(_p); _e.color = _c
wn.links.new(w_ramp.outputs['Color'], bg_cam.inputs['Color'])
mixw = wn.nodes.new('ShaderNodeMixShader'); wout = wn.nodes.get('World Output')
wn.links.new(bg.outputs['Background'], mixw.inputs[1]); wn.links.new(bg_cam.outputs['Background'], mixw.inputs[2]); wn.links.new(mixw.outputs['Shader'], wout.inputs['Surface'])

lamp_objs = []
for L in data.get('lights', []):
    ffl = next(x['ffl'] for x in data['floors'] if x['id'] == L['floor']); k = L['kind']
    ld = bpy.data.lights.new('NK_' + k, 'SPOT' if k == 'down' else 'POINT'); ld.color = (1.0, 0.86, 0.68)
    if k == 'down': ld.spot_size = math.radians(105); ld.spot_blend = 0.7; ld.shadow_soft_size = 0.035
    else: ld.shadow_soft_size = 0.06
    ob = bpy.data.objects.new(ld.name, ld); scene.collection.objects.link(ob)
    ob.location = (L['pos'][0] - 9, L['pos'][1] - 12, ffl + L['pos'][2] - (0.03 if k == 'down' else 0.0)); ob['nk_kind'] = k; ob['nk_floor'] = L['floor']
    lamp_objs.append(ob)

# V11: real lights in the street lamps (on from blue hour), so lamp pools exist in Cycles as on the website
street_lights = []
for i, (x, y, z) in enumerate(data.get('streetLights', [])):
    ld = bpy.data.lights.new(f'NK_street_{i}', 'SPOT'); ld.color = (1.0, 0.8, 0.58); ld.spot_size = math.radians(125); ld.spot_blend = 0.75; ld.shadow_soft_size = 0.18
    ob = bpy.data.objects.new(ld.name, ld); scene.collection.objects.link(ob); ob.location = (x - 9, y - 12, z - 0.05); street_lights.append(ob)

# V11 r2: recessed downlights in the entrance canopy soffit
canopy_lights = []
for i, (x, y, z) in enumerate(data.get('canopyLights', [])):
    ld = bpy.data.lights.new(f'NK_canopy_{i}', 'SPOT'); ld.color = (1.0, 0.84, 0.64); ld.spot_size = math.radians(70); ld.spot_blend = 0.6; ld.shadow_soft_size = 0.03
    ob = bpy.data.objects.new(ld.name, ld); scene.collection.objects.link(ob); ob.location = (x - 9, y - 12, z); canopy_lights.append(ob)

def set_environment(time_min, floor, interior=None):
    d = data['sun'][str(time_min)]; v = Vector((d[0], d[1], max(d[2], 0.02))); elev = d[3]
    sun.rotation_euler = (-v).to_track_quat('-Z', 'Y').to_euler()
    night = elev < -8; twilight = (not night) and elev < -0.5   # V11: civil twilight (blue hour) is its own state, not night
    day = max(0.0, min(1.0, (elev + 1) / 14)); warm = max(0.0, min(1.0, 1 - (elev - 3) / 25))
    sun_data.energy = 0.0 if night else 650.0 * day * (1 - 0.55 * warm)   # W/m² scale, paired with the physical sky
    sun_data.color = (1.0, 0.96 - 0.34 * warm, 0.9 - 0.6 * warm)
    for l in list(bg.inputs['Color'].links): wn.links.remove(l)
    for l in list(mixw.inputs['Fac'].links): wn.links.remove(l)
    mixw.inputs['Fac'].default_value = 0.0
    if night:
        wn.links.new(env.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.35   # lamps and windows must dominate at night
        wn.links.new(lpath.outputs['Is Camera Ray'], mixw.inputs['Fac'])
    else:
        try: sky.sun_elevation = math.radians(max(0.5 if twilight else 1.0, elev)); sky.sun_rotation = math.radians(d[4])
        except Exception: pass
        wn.links.new((cloud_mix.outputs[2] if cloud_mix else sky.outputs['Color']), bg.inputs['Color']); bg.inputs['Strength'].default_value = (0.12 + 0.5 * (elev + 8) / 7.5) if twilight else 1.0
    # practical lights: physically small by day, dominant after sunset
    dusk = 1.0 if night else max(0.0, 1 - day)
    # V11 r2: evening sheen on road and paving (stylistic, as in the reference reels; same factors as the website)
    for slot, k in (('asphalt', 0.4), ('plaza', 0.25)):
        mm = MATS.get(slot)
        if mm and mm.node_tree.nodes.get('nk_roughmul'): mm.node_tree.nodes['nk_roughmul'].inputs[1].default_value = mm['nk_rm'] * (1 - k * dusk)
    for ob in canopy_lights:
        ob.hide_render = not (floor is None and dusk > 0.25); ob.data.energy = 26.0 if night else 16.0
    for ob in street_lights:
        ob.hide_render = not (floor is None and (night or dusk > 0.3)); ob.data.energy = 700.0 if night else 450.0
    for ob in lamp_objs:
        on = ob['nk_floor'] in (floor, interior)
        ob.hide_render = not on
        base = {'down': 18.0, 'pendant': 14.0, 'lamp': 9.0, 'strip': 7.0, 'cove': 5.0, 'bulb': 3.0}[ob['nk_kind']]
        ob.data.energy = base * (1.0 if night or dusk > 0.5 else 4.0)   # boosted by day so fittings read as switched on beside sunlight
    for m in bpy.data.materials:
        e = m.get('nk_emissive')
        if not e: continue
        b = m.node_tree.nodes.get('Principled BSDF')
        if not b: continue
        if e == 3: set_in(b, ['Emission Strength'], 0.95 if night else (0.9 * dusk if dusk > 0.3 else 0.0))
        elif e == 4: set_in(b, ['Emission Strength'], 1.6 if night else (1.1 * dusk if dusk > 0.35 else 0.0))
        elif e == 2: set_in(b, ['Emission Strength'], 9.0 if night else (2.5 * dusk))
        elif e == 5: set_in(b, ['Emission Strength'], 3.5 if night else (2.4 * dusk if dusk > 0.3 else 0.0))
        else: set_in(b, ['Emission Strength'], float(m['nk_glow']) * (6.0 if night else 30.0 if dusk < 0.5 else 10.0))

cams = {}
for c in data['cameras']:
    cd = bpy.data.cameras.new('NK_cam_' + c['id']); cd.sensor_fit = 'VERTICAL'; cd.angle_y = math.radians(c['fovDeg']); cd.clip_start = 0.08; cd.clip_end = 4000
    ob = bpy.data.objects.new(cd.name, cd); scene.collection.objects.link(ob)
    ob.location = c['pos']; dv = Vector(c['look']) - Vector(c['pos']); ob.rotation_euler = dv.to_track_quat('-Z', 'Y').to_euler()
    cd.shift_y = float(c.get('shiftY', 0.0))   # V11 street cameras: level view + lens shift (straight verticals)
    cams[c['id']] = ob
scene.camera = cams['exterior_day']

# ---------------------------------------------------------------- renderer
scene.render.engine = 'CYCLES'
# V11.5: photo-site masters at 2560 × 1440 (was 1600 × 900, then upscaled for the web). --res=WxH overrides.
_res = opt('--res', '')
W, H = (int(_res.split('x')[0]), int(_res.split('x')[1])) if _res else ((640, 360) if PREVIEW else (2560, 1440))
scene.render.resolution_x = W; scene.render.resolution_y = H; scene.render.resolution_percentage = 100
SAMPLES = int(opt('--samples', '48' if PREVIEW else '320'))
scene.cycles.samples = SAMPLES; scene.cycles.use_adaptive_sampling = True; scene.cycles.adaptive_threshold = 0.03 if PREVIEW else 0.012
scene.cycles.max_bounces = 10; scene.cycles.diffuse_bounces = 6; scene.cycles.glossy_bounces = 4; scene.cycles.transparent_max_bounces = 12
scene.cycles.caustics_reflective = False; scene.cycles.caustics_refractive = False
try: scene.cycles.sample_clamp_indirect = 8.0
except Exception: pass
try: scene.cycles.use_denoising = True; scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception: pass
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dev in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dev; prefs.get_devices()
            used = [x for x in prefs.devices if x.type == dev]
            if used:
                for x in prefs.devices: x.use = x.type == dev
                scene.cycles.device = 'GPU'; print('[nakhla] Cycles device:', dev, [x.name for x in used]); break
        except Exception as e: print('[nakhla] device', dev, 'unavailable:', e)
except Exception as e: print('[nakhla] GPU setup skipped:', e)
# V11.5: Khronos PBR Neutral, the same curve as the website (AgX bleached sky and plaster toward white)
try: scene.view_settings.view_transform = 'Khronos PBR Neutral'; scene.view_settings.look = 'None'; print('[nakhla] view: Khronos PBR Neutral')
except Exception as e:
    print('[nakhla] PBR Neutral unavailable, AgX:', e)
    try: scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Base Contrast'
    except Exception as e2: print('[nakhla] AgX look:', e2)

# ---------------------------------------------------------------- V11.3 aerial perspective (distance haze)
# Same curve as the website's FogExp2: factor = 1 - exp(-(density * depth)^2), capped, never applied to the sky itself.
# The haze colour is the sky colour just above the horizon, read from a tiny sky-only probe render per camera.
vl0 = scene.view_layers[0]; vl0.use_pass_z = True
HAZE = {}
try:
    ng = bpy.data.node_groups.new('NK_haze', 'CompositorNodeTree'); scene.compositing_node_group = ng
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new('CompositorNodeRLayers'); go = ng.nodes.new('NodeGroupOutput')
    def M(op, a, b=None):
        n = ng.nodes.new('ShaderNodeMath'); n.operation = op
        for i, v in enumerate((a, b)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = float(v)
            else: ng.links.new(v, n.inputs[i])
        return n
    dep = rl.outputs['Depth']
    kd = M('MULTIPLY', dep, 0.0014); sq = M('POWER', kd.outputs[0], 2.0); ex = M('EXPONENT', M('MULTIPLY', sq.outputs[0], -1.0).outputs[0])
    fcap = M('MINIMUM', M('SUBTRACT', 1.0, ex.outputs[0]).outputs[0], 0.97); fac = M('MULTIPLY', fcap.outputs[0], M('LESS_THAN', dep, 1.0e6).outputs[0])
    mix = ng.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    ng.links.new(fac.outputs[0], mix.inputs[0]); ng.links.new(rl.outputs['Image'], mix.inputs[6]); mix.inputs[7].default_value = (0.7, 0.7, 0.7, 1.0)
    # V11.4 (G5): soft fog glow for views that look into a low sun (off, strength 0, everywhere else)
    gl = ng.nodes.new('CompositorNodeGlare')
    try: gl.inputs['Type'].default_value = 'Fog Glow'
    except Exception as e: print('[nakhla] glare type', e)
    gl.inputs['Strength'].default_value = 0.0
    ng.links.new(mix.outputs[2], gl.inputs['Image']); ng.links.new(gl.outputs[0], go.inputs[0])
    HAZE = {'density': kd, 'mix': mix, 'glare': gl}
    print('[nakhla] distance haze: compositor ready')
except Exception as e:
    print('[nakhla] distance haze unavailable:', e)

def haze_for(c):
    """Probe the horizon sky colour from this camera's position and heading, then set the haze colour and density."""
    if not HAZE: return
    cam = scene.camera; fwd = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1)); yaw = math.atan2(fwd.x, fwd.y)
    pd = bpy.data.cameras.get('NK_haze_probe') or bpy.data.cameras.new('NK_haze_probe'); pd.sensor_fit = 'VERTICAL'; pd.angle_y = math.radians(30); pd.clip_end = 4000
    po = bpy.data.objects.get('NK_haze_probe') or bpy.data.objects.new('NK_haze_probe', pd)
    if po.name not in scene.collection.objects: scene.collection.objects.link(po)
    po.location = cam.location; po.rotation_euler = (math.radians(90), 0, -yaw)
    shown = [ob for ob in scene.objects if ob.type in ('MESH', 'CURVE', 'FONT') and not ob.hide_render]
    for ob in shown: ob.hide_render = True
    saved = (scene.render.resolution_x, scene.render.resolution_y, scene.cycles.samples, scene.render.image_settings.file_format, scene.render.use_compositing, scene.camera, scene.view_settings.exposure)
    scene.render.resolution_x, scene.render.resolution_y, scene.cycles.samples = 96, 32, 16; scene.render.image_settings.file_format = 'OPEN_EXR'; scene.render.use_compositing = False; scene.camera = po; scene.view_settings.exposure = 0.0
    tmp = os.path.join(bpy.app.tempdir, 'nk_haze.exr'); scene.render.filepath = tmp
    try:
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(tmp); px = np.array(img.pixels[:], dtype=np.float32).reshape(32, 96, 4); bpy.data.images.remove(img)
        col = px[16:19, :, :3].reshape(-1, 3).mean(axis=0)            # rows just above the horizon (image rows run bottom → top)
    finally:
        for ob in shown: ob.hide_render = False
        (scene.render.resolution_x, scene.render.resolution_y, scene.cycles.samples, scene.render.image_settings.file_format, scene.render.use_compositing, scene.camera, scene.view_settings.exposure) = saved
    elev = data['sun'][str(c['time'])][3]
    HAZE['density'].inputs[1].default_value = (0.0014 if elev > -0.5 else 0.0011 if elev > -8 else 0.0009) * (1.9 if c.get('dust') else 1.0)   # V11.4: dusty sunset air
    HAZE['mix'].inputs[7].default_value = (float(col[0]), float(col[1]), float(col[2]), 1.0)
    print('[nakhla] haze colour', [round(float(x), 4) for x in col])

def show_for(c):
    """Tower stills keep every level closed (window infill); interior stills use the real interior of that level."""
    shown = c['floor'] or c.get('interior')   # V11 r2: street views look into the real lobby instead of a lit infill
    for fid, obs in fills.items():
        for ob in obs: ob.hide_render = shown == fid
    for fid, coll in interiors.items():
        for ob in coll.objects: ob.hide_render = shown != fid

def meter(c):
    """Auto-exposure like a camera: tiny linear render -> log-average luminance -> exposure in stops."""
    scene.view_settings.exposure = 0.0
    rx, ry, sp, ff = scene.render.resolution_x, scene.render.resolution_y, scene.cycles.samples, scene.render.image_settings.file_format
    scene.render.resolution_x, scene.render.resolution_y, scene.cycles.samples = 192, 108, 24
    scene.render.image_settings.file_format = 'OPEN_EXR'; tmp = os.path.join(bpy.app.tempdir, 'nk_meter.exr'); scene.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(tmp); px = np.array(img.pixels[:], dtype=np.float32).reshape(-1, 4); bpy.data.images.remove(img)
    lum = px[:, 0] * 0.2126 + px[:, 1] * 0.7152 + px[:, 2] * 0.0722; lum = np.clip(lum, 1e-6, None)
    key = float(np.exp(np.mean(np.log(lum))))
    target = 0.16 if c['floor'] is None else 0.2
    if data['sun'][str(c['time'])][3] < -4: target *= 0.45        # night stays night
    ev = math.log2(target / key)
    ev = min(ev, math.log2(7.0 / float(np.percentile(lum, 93))))   # protect highlights: never blow out most of the bright area
    ev = min(ev, math.log2(16.0 / float(np.percentile(lum, 99.3))))  # V11.3: and keep the brightest surfaces (sunlit stone) out of clipping
    scene.render.resolution_x, scene.render.resolution_y, scene.cycles.samples = rx, ry, sp; scene.render.image_settings.file_format = ff
    return max(-14.0, min(8.0, ev))

if SAVE and not opt('--bake'):
    blend_path = os.path.abspath(os.path.join(OUT_DIR, 'nakhla_tower.blend'))
    set_environment(960, None)
    try: bpy.ops.file.make_paths_relative()
    except Exception: pass
    bpy.ops.wm.save_as_mainfile(filepath=blend_path); print('[nakhla] saved', blend_path)
    glb_path = os.path.abspath(os.path.join(OUT_DIR, 'nakhla_tower.glb'))
    try:
        bpy.ops.export_scene.gltf(filepath=glb_path, export_format='GLB', export_apply=True, export_cameras=True, export_lights=False, export_extras=True, use_visible=True, export_image_format='NONE')
        print('[nakhla] exported', glb_path)
    except Exception as e: print('[nakhla] GLB export failed:', e)

BAKE = opt('--bake')   # e.g. --bake=F04:residential
if BAKE:
    # Bake INDIRECT + DIRECT diffuse light (no albedo) of walls, floors and ceilings into the shared lightmap atlas.
    # Pass 1 = sky only (no sun: the browser keeps the sun live with real shadows). Pass 2 = lamps only.
    fid, cat = BAKE.split(':'); RES = int(opt('--bake-res', '1024'))
    show_for({'floor': fid}); set_environment(900, fid)
    src = [ob for ob in interiors[fid].objects if ob['nk_group'] in ('lining', 'floor', 'ceiling') and ob.data.uv_layers.get('LM')]
    bpy.ops.object.select_all(action='DESELECT'); copies = []
    for ob in src:
        c = ob.copy(); c.data = ob.data.copy(); scene.collection.objects.link(c); copies.append(c); ob.hide_render = True
    for c in copies: c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]; bpy.ops.object.join(); tgt = bpy.context.view_layer.objects.active
    bm_ = bpy.data.materials.new('NK_bake'); bm_.use_nodes = True; bn = bm_.node_tree
    set_in(bn.nodes['Principled BSDF'], ['Base Color'], (0.72, 0.72, 0.72, 1)); set_in(bn.nodes['Principled BSDF'], ['Roughness'], 0.9)
    img = bpy.data.images.new('NK_LM', RES, RES, alpha=False, float_buffer=True); tn = bn.nodes.new('ShaderNodeTexImage'); tn.image = img; bn.nodes.active = tn
    tgt.data.materials.clear(); tgt.data.materials.append(bm_); tgt.data.polygons.foreach_set('material_index', np.zeros(len(tgt.data.polygons), dtype=np.int32))
    tgt.data.uv_layers.active = tgt.data.uv_layers['LM']; tgt.data.uv_layers['LM'].active_render = True
    scene.cycles.samples = int(opt('--samples', '256')); scene.cycles.use_adaptive_sampling = False
    scene.render.bake.use_pass_direct = True; scene.render.bake.use_pass_indirect = True; scene.render.bake.use_pass_color = False
    scene.render.bake.margin = 6; scene.render.bake.use_selected_to_active = False; scene.render.bake.use_clear = True
    def run():
        bpy.ops.object.select_all(action='DESELECT'); tgt.select_set(True); bpy.context.view_layer.objects.active = tgt
        bpy.ops.object.bake(type='DIFFUSE')
        a = np.array(img.pixels[:], dtype=np.float32).reshape(RES, RES, 4); return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722
    def lamps(on):
        for ob in lamp_objs: ob.hide_render = not (on and ob['nk_floor'] == fid)
        for m in bpy.data.materials:
            if m.get('nk_emissive') == 1:
                b = m.node_tree.nodes.get('Principled BSDF')
                if b: set_in(b, ['Emission Strength'], float(m['nk_glow']) * 6.0 if on else 0.0)
    sun_data.energy = 0.0; lamps(False); sky_l = run(); print('[nakhla] baked sky pass')
    bg.inputs['Strength'].default_value = 0.0; lamps(True)
    for ob in lamp_objs: ob.data.energy = {'down': 18.0, 'pendant': 14.0, 'lamp': 9.0, 'strip': 7.0, 'cove': 5.0, 'bulb': 3.0}[ob['nk_kind']]
    lamp_l = run(); print('[nakhla] baked lamp pass')
    # Pass 3 = sunlight after its first bounce only (direct sun stays live in the browser). Representative afternoon sun.
    set_environment(900, fid); bg.inputs['Strength'].default_value = 0.0; lamps(False)
    scene.render.bake.use_pass_direct = False; scene.render.bake.use_pass_indirect = True
    sun_l = run(); print('[nakhla] baked sun-bounce pass')
    def blur(a):  # light 3x3 smoothing against residual bake noise
        b = np.pad(a, 1, mode='edge'); return (b[:-2, :-2] + b[:-2, 2:] + b[2:, :-2] + b[2:, 2:] + 2 * (b[:-2, 1:-1] + b[2:, 1:-1] + b[1:-1, :-2] + b[1:-1, 2:]) + 4 * a) / 16
    # smooth each atlas rectangle on its own (indirect light is low-frequency; no bleeding between islands)
    def smooth_rects(a, passes):
        for p in data['interiors'][fid]:
            lm = p.get('lm')
            if not lm: continue
            x0, x1 = max(0, int(lm[0] * RES) - 1), min(RES, int(math.ceil(lm[2] * RES)) + 1); y0, y1 = max(0, int(lm[1] * RES) - 1), min(RES, int(math.ceil(lm[3] * RES)) + 1)
            if x1 - x0 < 2 or y1 - y0 < 2: continue
            t = a[y0:y1, x0:x1]
            for _ in range(passes): t = blur(t)
            a[y0:y1, x0:x1] = t
        return a
    sky_l = smooth_rects(sky_l, 10); lamp_l = smooth_rects(lamp_l, 3); sun_l = smooth_rects(sun_l, 10)
    sref = float(np.percentile(sky_l[sky_l > 1e-6], 99.5)); lref = float(np.percentile(lamp_l[lamp_l > 1e-6], 99.5)); nref = float(np.percentile(sun_l[sun_l > 1e-6], 99.5))
    outp = np.zeros((RES, RES, 4), dtype=np.float32); outp[..., 0] = np.sqrt(np.clip(sky_l / sref, 0, 1)); outp[..., 1] = np.sqrt(np.clip(lamp_l / lref, 0, 1)); outp[..., 2] = np.sqrt(np.clip(sun_l / nref, 0, 1)); outp[..., 3] = 1
    oi = bpy.data.images.new('NK_LM_out', RES, RES, alpha=False); oi.colorspace_settings.name = 'Non-Color'; oi.pixels = outp.ravel().tolist()
    os.makedirs(os.path.join(ROOT, 'public/lightmaps'), exist_ok=True)
    oi.filepath_raw = os.path.join(ROOT, 'public/lightmaps', cat + '.png'); oi.file_format = 'PNG'; oi.save()
    json.dump({'category': cat, 'floor': fid, 'res': RES, 'samples': scene.cycles.samples, 'skyRef': sref, 'lampRef': lref, 'sunRef': nref, 'sunTime': 900, 'meanSky': float(outp[..., 0].mean()), 'meanLamp': float(outp[..., 1].mean())}, open(os.path.join(ROOT, 'public/lightmaps', cat + '.json'), 'w'), indent=1)
    print('[nakhla] lightmap written', oi.filepath_raw, 'skyRef', sref, 'lampRef', lref)
    DO_RENDER = False

if DO_RENDER:
    items = []
    for c in data['cameras']:
        if ONLY and c['id'] not in ONLY: continue
        if GOLDEN and not c.get('golden'): continue
        scene.camera = cams[c['id']]; set_environment(c['time'], c['floor'], c.get('interior')); show_for(c); haze_for(c)
        ev = meter(c); scene.view_settings.exposure = ev
        if HAZE.get('glare'):   # threshold in scene-linear terms (the compositor runs before the exposure is applied)
            g = HAZE['glare']; g.inputs['Strength'].default_value = 0.9 if c.get('glare') else 0.0; g.inputs['Threshold'].default_value = 0.72 * 2 ** (-ev)
        scene.render.image_settings.file_format = 'JPEG'; scene.render.image_settings.quality = 90
        out = os.path.abspath(os.path.join(RENDER_DIR, c['id'] + '.jpg')); scene.render.filepath = out
        bpy.ops.render.render(write_still=True); print('[nakhla] rendered', out, 'exposure', round(ev, 2))
        items.append({'file': c['id'] + '.jpg', 'title': c['title'], 'scope': 'derived_from_actual_scene', 'package': 'standard', 'timeMinutes': c['time'], 'exposureStops': round(ev, 2), 'samples': SAMPLES})
    if not ONLY and not GOLDEN and not PREVIEW:
        json.dump({'generatedBy': 'blender/build_nakhla.py', 'blender': bpy.app.version_string, 'note': 'Offline Cycles renders of the same concept geometry, furniture meshes and textures as the interactive model (standard finish package). Physical sky + sun from the simulated solar position; AgX view transform. Not photographs.', 'items': items},
                  open(os.path.join(RENDER_DIR, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('[nakhla] done')
