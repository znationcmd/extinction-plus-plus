"""Extend the dated MIT pyPalworldAPI snapshot with images, habitats and map records.
Usage: python scripts/import-pal-details.py /path/to/pyPalworldAPI
MapX/MapY are pixels on the source's 8192-square location images, not game GPS.
"""
import base64, gzip, json, pathlib, re, sys
ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = pathlib.Path(sys.argv[1])
SQL = (SOURCE / 'mysqldb/PalAPI.sql').read_text()
REVISION = 'd531c094da71e6ce907114ccd916498552b7e9aa'
URL = f'https://raw.githubusercontent.com/stolenvw/pyPalworldAPI/{REVISION}/pyPalworldAPI'
def image(path): return URL + path if isinstance(path,str) and path.startswith('/public/images/') else None
def table(name):
    rows=[]
    for match in re.finditer(r'INSERT INTO `'+name+r'` \((.*?)\) VALUES\n(.*?);', SQL, re.S):
        keys=re.findall(r'`([^`]+)`',match[1]); row=[]; buf=''; quote=False; quoted=False; escaped=False
        for char in match[2]:
            if quote:
                if escaped: buf += {'n':'\n','r':'\r','t':'\t','0':'\0'}.get(char,char); escaped=False
                elif char=='\\': escaped=True
                elif char=="'": quote=False
                else: buf+=char
            elif char=="'": quote=True; quoted=True
            elif char in ',)':
                if buf.strip() or quoted:
                    value=buf if quoted else None if buf.strip()=='NULL' else float(buf) if '.' in buf else int(buf)
                    row.append(value); buf=''; quoted=False
                if char==')' and row:
                    if len(row)!=len(keys): raise ValueError('SQL row mismatch: '+name)
                    rows.append(dict(zip(keys,row))); row=[]
            elif char!='(' and not(char.isspace() and not buf): buf+=char
    return rows
def parsed(row,key,default):
    try:
        value=json.loads(row.get(key) or 'null') or default
        return value if isinstance(value,type(default)) else default
    except (ValueError,TypeError): return default
def write(name,value):
    encoded=base64.b64encode(gzip.compress(json.dumps(value,separators=(',',':')).encode(),mtime=0)).decode()
    (ROOT/f'dashboard/lib/{name}-data.cjs').write_text("module.exports='"+encoded+"';\n")
    (ROOT/f'dashboard/lib/{name}.cjs').write_text("module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./"+name+"-data.cjs'),'base64')));\n")

encoded=re.search(r"module.exports='([^']+)';",(ROOT/'dashboard/lib/pal-guide-data.cjs').read_text())[1]
guide=json.loads(gzip.decompress(base64.b64decode(encoded)))
pals={str(row['ID']):row for row in table('pals')}
for pal in guide['creatures']:
    row=pals[pal['id']]; pal['habitatImages']={time:image(path) for time,path in parsed(row,'Maps',{}).items() if image(path)}
    pal['skills']=[{'name':skill['Name'],'elements':[skill['Type']],'level':skill.get('Level'),'power':skill.get('Power'),'cooldown':skill.get('Cooldown')} for skill in parsed(row,'Skills',[]) if isinstance(skill,dict) and skill.get('Name')]
guide['items']=[{'id':'item-'+str(row['ID']),'name':row['Name'],'imageUrl':image(row['Image']),'category':row['Type'],'stats':{key:row[key] for key in ['Weight','Gold','Durability','MagazineSize','PhysicalAttackValue','HPValue','PhysicalDefenseValue','ShieldValue'] if isinstance(row.get(key),(int,float))},'sourceUrl':'https://github.com/stolenvw/pyPalworldAPI/tree/'+REVISION} for row in table('items') if row['bLegalInGame']]
byname={row['name']:row for row in guide['items']}
for recipe in guide['recipes']:
    recipe.update({key:byname.get(recipe['name'],{}).get(key) for key in ['imageUrl','category']})
guide['buildings']=[{'id':'building-'+str(row['ID']),'name':row['Name'],'imageUrl':image(row['Image']),'category':row['Category'],'yield':1,'ingredients':[{'name':part['Name'],'amount':part['Amount']} for part in parsed(row,'Material',[]) if part.get('Name') and isinstance(part.get('Amount'),int) and part['Amount']>0]} for row in table('buildobjects')]
guide['knowledge']=[{'id':'technology-'+str(row['ID']),'name':row['Name'],'imageUrl':image(row['Image']),'level':row['LevelCap'],'cost':row['Cost'],'category':'Technologie ancienne' if row['IsBossTechnology'] else 'Technologie','unlocks':parsed(row,'UnlockBuildObjects',[])+parsed(row,'UnlockItemRecipes',[])} for row in table('techtree')]
materials=sorted(set([drop['name'] for pal in guide['creatures'] for drop in pal.get('drops',[])]+[part['name'] for recipe in guide['recipes']+guide['buildings'] for part in recipe['ingredients']]))
guide['resources']=[{**byname.get(name,{}),'id':'resource-'+name,'name':name,'kind':'resource'} for name in materials]
entries=[]
categories={'lifmunk_effigy':'Effigies de Lifmunk','fast_travel':'Voyage rapide','dungeon':'Donjons','tower':'Tours','note':'Notes','treasure_map':'Trésors'}
for row in table('maplocations'):
    if row['Map'] not in ['world','tree'] or not (0<=row['MapX']<=8192 and 0<=row['MapY']<=8192): raise ValueError('Unexpected map extent')
    entries.append({'id':'pal-default-'+str(row['ID']),'mapId':'builtin-palworld-source-'+row['Map'],'name':row['Name'],'kind':'loot','category':categories.get(row['Category'],row['Category']),'x':round(row['MapX']/8192*100,6),'z':round(row['MapY']/8192*100,6),'imageUrl':image(row['Image']),'conditions':'Emplacement du catalogue v1.0.1.100619, export du 18 juillet 2026. Pas de suivi en temps réel.','sourceUrl':'https://github.com/stolenvw/pyPalworldAPI/blob/'+REVISION+'/mysqldb/PalAPI.sql'})
write('pal-guide',guide); write('pal-map',entries)
maps=json.loads((ROOT/'dashboard/lib/builtin-maps.json').read_text())
for scene,title in [('world','Palpagos'),('tree','Arbre du Monde')]:
    ident='builtin-palworld-source-'+scene
    value={'id':ident,'name':title+' — catalogue juillet 2026','game':'palworld','imageUrl':'/companion/palworld-'+scene+'.webp','sourceUrl':'https://github.com/stolenvw/pyPalworldAPI/tree/'+REVISION,'attribution':'pyPalworldAPI (MIT) ; Palworld © Pocketpair. Fond avec repères de voyage de la source.','xMin':0,'xMax':100,'yMin':0,'yMax':100,'flipY':False,'coordinateLabel':'Pixels MapX/MapY de la source ramenés en %. X vers la droite, Y vers le bas ; coordonnées GPS en jeu non affichées.'}
    maps=[row for row in maps if row['id']!=ident];maps.append(value)
(ROOT/'dashboard/lib/builtin-maps.json').write_text(json.dumps(maps,ensure_ascii=False,indent=2)+'\n')
print('Items',len(guide['items']),'buildings',len(guide['buildings']),'technology',len(guide['knowledge']),'map points',len(entries))
