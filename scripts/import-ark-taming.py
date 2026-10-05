"""Add explicit ASB food and taming parameters without inheriting ASE into ASA.
Usage: python scripts/import-ark-taming.py /path/to/ARKStatsExtractor
Source MIT: cadon/ARKStatsExtractor revision 792ce6e939971b18271dc91a802a2352d6519c26.
"""
import base64,gzip,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];SOURCE=pathlib.Path(sys.argv[1])/'ARKBreedingStats/json'
path=ROOT/'dashboard/lib/ark-creatures-data.cjs';encoded=re.search(r"module.exports='([^']+)';",path.read_text())[1];guide=json.loads(gzip.decompress(base64.b64decode(encoded)))
food=json.loads((SOURCE/'tamingFoodData.json').read_text())['tamingFoodData'];defaults=food['default']['specialFoodValues']
for edition,filename in [('ASE','values.json'),('ASA','ASA-values.json')]:
    raw=json.loads((SOURCE/'values'/filename).read_text());byid={row['blueprintPath']:row for row in raw['species']}
    for creature in guide[edition]['creatures']:
        row=byid[creature['id']];params=row.get('taming') or {};species=food.get(creature['name']) or {};specific=species.get('specialFoodValues') or {};table=[]
        for name in species.get('eats') or []:
            entry=specific.get(name,defaults.get(name))
            if entry:table.append({'name':name,'affinity':entry.get('a'),'foodValue':entry.get('f'),'quantity':entry.get('q',1),'unconfirmed':entry.get('u',False)})
        creature['taming'].update({key:params[key] for key in ['affinityNeeded0','affinityIncreasePL','tamingIneffectiveness','foodConsumptionBase','foodConsumptionMult','wakeAffinityMult','wakeFoodDeplMult'] if key in params})
        creature['taming']['foods']=table
    guide[edition]['tamingSource']='https://github.com/cadon/ARKStatsExtractor/tree/792ce6e939971b18271dc91a802a2352d6519c26'
encoded=base64.b64encode(gzip.compress(json.dumps(guide,separators=(',',':')).encode(),mtime=0)).decode();path.write_text("module.exports='"+encoded+"';\n")
print('Explicit food entries added')
