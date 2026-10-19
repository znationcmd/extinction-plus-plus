const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('RSS Discord modules use named guild channel and role selectors',()=>{
 const page=read('dashboard/app/discord-module/[key]/page.jsx');
 assert.match(page,/name:'channelId'.+type:'discord-channel'/);
 assert.match(page,/name:'roleIds'.+type:'discord-roles'/);
 assert.doesNotMatch(page,/ID du salon Discord|IDs des rôles autorisés/);
 assert.match(page,/allowVoice:key==='tempvoice'/);
});

test('all reusable module editor role/channel fields support native dropdowns and multi-select',()=>{
 const ui=read('dashboard/components/ModuleEditor.jsx');
 for(const str of ['discord-channel','discord-roles','discord-role','discordChoices','/api/discord-resources','type="checkbox"','<fieldset','<select','Aucun','loadDiscord']){
  assert.ok(ui.includes(str),str);
 }
 assert.match(ui,/roleIds\$/);
 assert.match(ui,/Array\.isArray\(value\)/);
 assert.match(ui,/selection\.includes\(role\.id\)/);
 assert.match(ui,/const body=\{\.\.\.form\}/);
 assert.match(ui,/setForm\(\{\.\.\.item\}\)/);
 assert.match(ui,/const r=await fetch\(endpoint,\{method:remove\?'DELETE'/);
});

test('guild-scoped Discord provider is authenticated, read-only, and returns no tokens',()=>{
 const src=read('dashboard/app/api/discord-resources/route.js');
 assert.match(src,/GET=guarded\(/);
 assert.match(src,/activeGuild\(\)/);
 assert.match(src,/Discord.*token|Bot.*token/s);
 assert.match(src,/\/guilds\/.*\/channels/);
 assert.match(src,/\/guilds\/.*\/roles/);
 assert.match(src,/cache:'no-store'/);
 assert.match(src,/no-store/);
 assert.doesNotMatch(src,/export const POST/);
 assert.doesNotMatch(src,/token\s*:\s*token/);
 assert.doesNotMatch(src,/console\.log\(.*token/);
});

test('unavailable Discord options keep previously stored settings',()=>{
 const ui=read('dashboard/components/ModuleEditor.jsx');
 assert.match(ui,/setDiscordChoices\(null\)/);
 assert.match(ui,/disabled=\{!discordChoices\|\|busy\}/);
 assert.match(ui,/Les valeurs déjà enregistrées sont conservées/);
 assert.match(ui,/selection\.filter\(id=>!allowed\.some/);
});
