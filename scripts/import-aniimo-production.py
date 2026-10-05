"""Import MIT Aniimax fact tables. Excludes entries marked unverified; no invented images/positions."""
import csv,json,sys,subprocess
from pathlib import Path
src=Path(sys.argv[1]); root=Path(__file__).resolve().parents[1]
sha=subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip()
url=f'https://github.com/ae-bii/aniimax/tree/{sha}'
def read(path):
 with path.open() as f:
  return [{k.strip():v.strip() for k,v in row.items()} for row in csv.DictReader(f,skipinitialspace=True)]
def name(s): return s.replace('_',' ').title()
def number(s): return float(s) if '.' in s else int(s)
unverified={(r['name'],r['facility']) for r in read(src/'data/unverified.csv')}
requirements={r['name']:r for r in read(src/'data/aniimo_requirements.csv')}
recipes=[]; items={}
for p in sorted((src/'data').glob('*.csv')):
 rows=read(p)
 if not rows or 'sell_value' not in rows[0]: continue
 for r in rows:
  facility=r.get('facility') or name(p.stem)
  if (r['name'],facility) in unverified: continue
  mats=[s.strip() for s in r.get('raw_materials','').split(';') if s.strip()]
  amounts=[int(s) for s in r.get('required_amount','').split(';') if s.strip()]
  if len(mats)!=len(amounts): raise ValueError(r['name'])
  facts={k:number(r[k]) for k in ['sell_value','yield','facility_level','cost','workload','production_time','energy','byproduct_yield','points'] if r.get(k)}
  entry={'id':'aniimo-item-'+r['name'],'name':name(r['name']),'sourceName':r['name'],'kind':'resource','category':facility,'station':facility,'stats':facts,'sourceUrl':url+'/data/'+p.name,'facilityLevel':int(r.get('facility_level') or 1),'moduleRequirement':r.get('module_requirement',''),'environment':r.get('environment',''),'currency':r.get('sell_currency') or 'coins','season':'Harvest Moon Festival' if p.stem=='harvest_moon_festival' else ''}
  req=requirements.get(r['name'])
  if req: entry['work']=[{'name':req['ability'],'level':int(req['min_level'])}]
  if r['name'] not in items or items[r['name']].get('category')=='Origine non renseignée': items[r['name']]=entry
  if mats:
   recipe={**entry,'id':'aniimo-recipe-'+p.stem+'-'+r['name'],'yield':int(r.get('yield') or 1),'ingredients':[{'name':name(n),'amount':a} for n,a in zip(mats,amounts)]}
   recipes.append(recipe)
  for mat in mats:
   items.setdefault(mat,{'id':'aniimo-item-'+mat,'name':name(mat),'sourceName':mat,'kind':'resource','sourceUrl':url,'category':'Origine non renseignée'})
# Replace placeholders with verified gathering metadata, irrespective of file iteration order.
for recipe in recipes:
 if items[recipe['sourceName']].get('category')=='Origine non renseignée':items[recipe['sourceName']]={k:v for k,v in recipe.items() if k not in ['ingredients','yield']}
data={'recipes':recipes,'items':list(items.values()),'resources':list(items.values()),'productionSource':url,'productionVersion':f'Aniimax {sha[:7]} ; production du Homeland, catalogue partiel en anglais. Entrées non vérifiées exclues.','productionLicenseUrl':'/aniimo-production-license.txt'}
(root/'dashboard/lib/aniimo-production.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
(root/'dashboard/public/aniimo-production-license.txt').write_text('Aniimo Homeland production facts adapted from Aniimax by aebii.\nSource: '+url+'\nChanges: CSV fields normalized to catalog entries; unverified entries omitted; numeric workload is not a guaranteed duration. English source names formatted for display. No maps or images copied.\nGame content belongs to its respective rightsholders.\n\n'+(src/'LICENSE').read_text())
print(len(recipes),'recipes',len(items),'items')
