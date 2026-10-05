"""Adapt the separately GPL-3.0 licensed 2019 m-xubair/conanexilesdb data.
Usage: python scripts/import-conan-catalog.py /path/to/conanexilesdb
Only factual fields; archived content, not a current-game completeness claim.
"""
import base64,gzip,json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];SOURCE=pathlib.Path(sys.argv[1])
REVISION='26690500956a4dff9a5774dcc6f2cb10d44f96d8'
ORIGIN='https://github.com/m-xubair/conanexilesdb/tree/'+REVISION
raw=json.loads((SOURCE/'data.json').read_text());byid={str(row['RowName']):row for row in raw}
def text(value):
    match=re.fullmatch(r'NSLOCTEXT\(".*?", ".*?", "(.*)"\)',str(value))
    return match[1] if match else str(value)
def name(ident):return byid.get(str(ident),{}).get('Name') or 'ID '+str(ident)
def icon(path):return path if isinstance(path,str) and path.startswith('https://') else None
def icon_for_path(path):return next((icon(row.get('Icon')) for row in raw if row.get('Icon','').split('/')[-1].split('.')[0]==path.split('/')[-1].split('.')[0]),None)
items=[{'id':'item-'+str(row['RowName']),'number':str(row['RowName']),'name':row['Name'],'category':row.get('GUICategory'),'imageUrl':icon(row.get('Icon')),'stats':{key:row[key] for key in ['EncumbranceWeight','ArmourValue','MaxStackSize','DamageHealthLight_OnHit','DamageHealthHeavy_OnHit','ArmorPen','ItemTier'] if isinstance(row.get(key),(int,float))},'sourceUrl':ORIGIN} for row in raw if row.get('Name')]
recipes=[]
for row in json.loads((SOURCE/'recipe.json').read_text()):
    if not row.get('IsRecipeEnabled') or not row.get('Result1ID') or row.get('Result1Quantity',0)<1:continue
    parts=[{'name':name(row['Ingredient'+str(i)+'ID']),'itemId':'item-'+str(row['Ingredient'+str(i)+'ID']),'amount':row['Ingredient'+str(i)+'Quantity']} for i in range(1,5) if row.get('Ingredient'+str(i)+'ID') and row.get('Ingredient'+str(i)+'Quantity',0)>0]
    recipes.append({'id':'recipe-'+str(row['RowName']),'name':text(row['RecipeName']),'imageUrl':icon(byid.get(str(row['Result1ID']),{}).get('Icon')),'category':row['RecipeType'],'yield':row['Result1Quantity'],'ingredients':parts,'craftTime':row['TimeToCraft'],'stationId':row['CraftingStations'],'station':name(row['CraftingStations']),'dlc':row.get('DLCPackage'),'results':[{'name':name(row['Result'+str(i)+'ID']),'amount':row['Result'+str(i)+'Quantity']} for i in range(1,5) if row.get('Result'+str(i)+'ID') and row.get('Result'+str(i)+'Quantity',0)>0],'sourceUrl':ORIGIN})
knowledge=[{'id':'knowledge-'+str(row['RowName']),'name':text(row['FeatName']),'imageUrl':icon_for_path(row.get('Icon','')),'level':row['LevelRequirement'],'cost':row['FeatCost'],'categories':row['Categories'],'category':row['Categories'][0] if row['Categories'] else 'Autres','recipeIds':['recipe-'+str(ident) for ident in row['RewardRecipe']],'prerequisites':['knowledge-'+str(ident) for ident in row['PrerequisiteFeat']],'dlc':row.get('DLCPackage'),'sourceUrl':ORIGIN} for row in json.loads((SOURCE/'feats.json').read_text()) if row.get('ShowInFeatWindow')]
materialnames={part['name'] for recipe in recipes for part in recipe['ingredients']}
guide={'version':'Archive Conan Exiles du 04/04/2019 : ajouts et équilibrages récents non inclus. Données GPL-3.0.','items':items,'recipes':recipes,'knowledge':knowledge,'resources':[{**row,'kind':'resource'} for row in items if row['name'] in materialnames],'licenseUrl':'/conan-data-license.txt'}
encoded=base64.b64encode(gzip.compress(json.dumps(guide,separators=(',',':')).encode(),mtime=0)).decode()
(ROOT/'dashboard/lib/conan-guide-data.json').write_text(json.dumps({'license':'GPL-3.0','source':ORIGIN,'gzipBase64':encoded})+'\n')
(ROOT/'dashboard/lib/conan-guide.cjs').write_text("module.exports=JSON.parse(require('node:zlib').gunzipSync(Buffer.from(require('./conan-guide-data.json').gzipBase64,'base64')));\n")
(ROOT/'dashboard/public/conan-data-license.txt').write_text('Données distinctes : m-xubair/conanexilesdb, révision '+REVISION+' (04 avril 2019), GPL-3.0.\nSource complète : '+ORIGIN+'\nAdaptation : sélection des faits, noms, IDs, coûts, catégories et liens d’images ; descriptions omises.\nScript de transformation : scripts/import-conan-catalog.py dans https://github.com/znationcmd/extinction-plus-plus\nConan Exiles et ses images appartiennent à Funcom. Cette archive ne couvre pas les ajouts récents.\n\n'+(SOURCE/'LICENSE').read_text())
print('Items',len(items),'recipes',len(recipes),'knowledge',len(knowledge))
