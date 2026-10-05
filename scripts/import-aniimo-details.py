"""Import factual fields from the official French index. No descriptions or invented coordinates.
Usage: python scripts/import-aniimo-details.py /tmp/aniimo-pages
Cached pages are reused; denied/rate-limited requests stop the import.
"""
import concurrent.futures, json, pathlib, re, sys, threading, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/aniimo-pages')
CACHE.mkdir(parents=True, exist_ok=True)
dataset = json.loads((ROOT / 'dashboard/lib/aniimo-guide.json').read_text())
stop = threading.Event()

def detail(row):
    target = CACHE / (row['number'] + '.html')
    if not target.exists():
        if stop.is_set(): return None
        try:
            request = urllib.request.Request(row['sourceUrl'], headers={'User-Agent': 'ExtinctionRSS-companion-data/1.0'})
            with urllib.request.urlopen(request, timeout=25) as response: target.write_bytes(response.read())
        except urllib.error.HTTPError as error:
            if error.code in (403, 429): stop.set()
            print('Unavailable', row['number'], error.code, flush=True)
            return None
        except Exception as error:
            print('Unavailable', row['number'], type(error).__name__, flush=True)
            return None
    match = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', target.read_text(), re.S)
    if not match: return None
    data = json.loads(match[1])
    def decode(index, seen=frozenset()):
        if index < 0 or index in seen: return None
        value = data[index]; seen = seen | {index}
        if isinstance(value, dict): return {key: decode(ref, seen) for key, ref in value.items()}
        if isinstance(value, list): return [decode(ref, seen) if isinstance(ref, int) else ref for ref in value]
        return value
    index = next((ref for value in data if isinstance(value, dict) for key, ref in value.items() if key.startswith('aniimo-detail-')), None)
    if index is None: return None
    page = decode(index)
    if page.get('searchKey', {}).get('entryId') != row['number']: return None
    nodes = [component for directory in page.get('directories', []) for component in directory.get('components', [])]
    def walk(components):
        for component in components:
            yield component
            yield from walk(component.get('children') or [])
            for tab in (component.get('props') or {}).get('tabs') or []: yield from walk(tab.get('children') or [])
    stats = {}; habitats = []; abilities = []; evolution = []
    for node in walk(nodes):
        props = node.get('props') or {}
        if node.get('type') == 'aniimoInfo':
            form = props.get('formData') or {}
            stats = {key: form[key] for key in ['hp','physicalAttack','magicAttack','physicalDefense','magicDefense','haste'] if isinstance(form.get(key), (int,float))}
        if props.get('title') == 'Habitats':
            habitats = [child['props']['title'] for child in node.get('children') or [] if child.get('props', {}).get('title')]
        if node.get('type') == 'circle' and props.get('descTitle'):
            abilities.append({'name': props['descTitle'], 'imageUrl': props.get('icon')})
        if node.get('type') == 'evolution':
            def tree(branch):
                if not branch: return
                evolution.append({'name': branch.get('name'), 'stage': branch.get('stage'), 'imageUrl': branch.get('icon')})
                for child in branch.get('children') or []: tree(child)
            tree(props.get('data'))
    print('Imported', row['number'], flush=True)
    return {'stats': stats, 'habitats': habitats, 'abilities': abilities, 'evolution': evolution, 'detailsSource': row['sourceUrl']}

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for row, result in zip(dataset['creatures'], pool.map(detail, dataset['creatures'])):
        if result: row.update(result)
dataset['version'] = 'Index officiel français, 05/10/2026 ; habitats par région, sans coordonnées précises.'
(ROOT / 'dashboard/lib/aniimo-guide.json').write_text(json.dumps(dataset, ensure_ascii=False, separators=(',', ':')) + '\n')
print('Detailed records', sum(bool(row.get('stats')) for row in dataset['creatures']))
