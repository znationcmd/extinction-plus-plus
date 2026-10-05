"""Import all vanilla class records, including materials with zero nominal loot.
Usage: python scripts/import-dayz-catalog.py /path/to/DayZ-Central-Economy
Bohemia Interactive ADPL-SA; attribution in dashboard/public/dayz-data-license.txt.
Zero nominal classes belong to the catalog, never automatically to building loot tables.
"""
import json,pathlib,sys,xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parents[1];SOURCE=pathlib.Path(sys.argv[1]);items={}
for mission,ident in [('dayzOffline.chernarusplus','builtin-dayz-chernarusplus'),('dayzOffline.enoch','builtin-dayz-enoch'),('dayzOffline.sakhal','builtin-dayz-sakhal')]:
    rows=[]
    for node in ET.parse(SOURCE/mission/'db/types.xml').getroot().findall('type'):
        rows.append({'name':node.attrib['name'],'nominal':int(node.findtext('nominal','0')),'categories':[x.attrib['name'] for x in node.findall('category')],'usage':[x.attrib['name'] for x in node.findall('usage')],'tiers':[x.attrib['name'] for x in node.findall('value')]})
    items[ident]=rows
(ROOT/'dashboard/lib/dayz-all-items.json').write_text(json.dumps({'items':items},separators=(',',':'))+'\n')
print('Catalog classes',len({row['name'] for rows in items.values() for row in rows}))
