"""Link actual wiki image records to exactly matching DayZ class names.
No guessed URLs, no invented images; the wiki keeps hosting the artwork.
Usage: python scripts/import-dayz-images.py /tmp/dayz-image-pages
"""
import json,pathlib,re,sys,time,urllib.request,urllib.error,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1];CACHE=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/dayz-image-pages');CACHE.mkdir(parents=True,exist_ok=True)
images=[];continuation={};base='https://dayz.wiki.gg/api.php'
for page in range(20):
    path=CACHE/(str(page)+'.json')
    if not path.exists():
        from urllib.parse import urlencode
        url=base+'?'+urlencode({'action':'query','format':'json','list':'allimages','ailimit':500,'aiprop':'url',**continuation})
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ExtinctionRSS-companion-data/1.0'}),timeout=25) as response:path.write_bytes(response.read())
        except urllib.error.HTTPError as error:
            print('Stopped',error.code);break
        except Exception as error:print('Stopped',type(error).__name__);break
        time.sleep(0.5)
    data=json.loads(path.read_text())
    if data.get('error'):print('Stopped',data['error'].get('code'));break
    images.extend(data.get('query',{}).get('allimages',[]));continuation=data.get('continue',{})
    print('Page',page,len(images),flush=True)
    if not continuation:break
def normalized(value):return re.sub(r'[^a-z0-9]','',value.lower())
files={}
for image in images:
    if image['name'].lower().endswith(('.png','.jpg','.webp')):
        key=normalized(image['name'].rsplit('.',1)[0]);files.setdefault(key,image)
classes=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify([...new Set(Object.values(require('./dashboard/lib/dayz-all-items.json').items).flat().map(i=>i.name))]))"],cwd=ROOT))
mapping={name:{'imageUrl':files[normalized(name)]['url'],'imageSourceUrl':files[normalized(name)]['descriptionurl']} for name in classes if normalized(name) in files}
(ROOT/'dashboard/lib/dayz-item-images.json').write_text(json.dumps(mapping,separators=(',',':'))+'\n')
print('Matched images',len(mapping),'of',len(classes))
