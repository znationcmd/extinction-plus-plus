'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'cmd-language-auto.js'),'utf8');
function simulate({languages=['fr-FR'],timezone='Europe/Paris',initial={}}={}){
 const data=new Map(Object.entries(initial));
 const events=[],doc={setAttribute(name,value){events.push(['attr',name,value])}};
 const browser={navigator:{languages,language:languages[0]},
  localStorage:{getItem(key){return data.get(key)||null},setItem(key,value){data.set(key,String(value))}},
  document:{documentElement:doc},dispatchEvent(e){events.push(['event',e.type,e.detail])}};
 const time=()=>({resolvedOptions:()=>({locale:languages[0],timeZone:timezone})});
 const mockIntl={getCanonicalLocales:Intl.getCanonicalLocales,DateTimeFormat:time};
 const ctx={window:browser,Intl:mockIntl,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}}};
 vm.runInNewContext(source,ctx,{filename:'cmd-language-auto.js'});
 return {api:browser.CMDSphereLocale,data,events};
}
test('German region defaults to German, no GPS or network lookup',()=>{
 const {api,data}=simulate({languages:['en-US','fr-FR'],timezone:'Europe/Berlin'});
 assert.equal(api.current().code,'de-DE');
 assert.equal(api.current().mode,'auto');
 assert.equal(data.get('cmd-sphere-language-mode'),'auto');
 assert.doesNotMatch(source,/geolocation|getCurrentPosition|ipapi|ipinfo|fetch\(/);
});
test('first visit accepts multilingual regions from device preferences',()=>{
 assert.equal(simulate({languages:['gsw-CH','de-CH'],timezone:'Europe/Zurich'}).api.current().code,'gsw-CH');
 assert.equal(simulate({languages:['fr-CH'],timezone:'Europe/Zurich'}).api.current().code,'fr-CH');
 assert.equal(simulate({languages:['nl-BE'],timezone:'Europe/Brussels'}).api.current().code,'nl-BE');
 assert.equal(simulate({languages:['it-IT'],timezone:'Europe/Rome'}).api.current().code,'it-IT');
 assert.equal(simulate({languages:['ja-JP'],timezone:'Asia/Tokyo'}).api.current().code,'ja-JP');
});
test('manual language wins over automatic detection until user activates auto',()=>{
 const run=simulate({languages:['de-DE'],timezone:'Europe/Berlin',initial:{
  'cmd-sphere-language':'fr','cmd-sphere-language-mode':'manual'
 }});
 assert.equal(run.api.current().code,'fr');
 assert.equal(run.api.manual('gsw-CH-x-bern'),'gsw-CH-x-bern');
 assert.equal(run.data.get('cmd-sphere-language-mode'),'manual');
 assert.equal(run.api.current().code,'gsw-CH-x-bern');
 assert.equal(run.api.automatic(),'de-DE');
 assert.equal(run.data.get('cmd-sphere-language-mode'),'auto');
 assert.ok(run.events.some(e=>e[0]==='event'&&e[2]?.mode==='manual'));
});
test('legacy chosen language is preserved, legacy default French becomes automatic',()=>{
 const chosen=simulate({languages:['de-DE'],timezone:'Europe/Berlin',initial:{'cmd-sphere-language':'co'}});
 assert.equal(chosen.api.current().code,'co');
 assert.equal(chosen.api.current().mode,'manual');
 const french=simulate({languages:['de-DE'],timezone:'Europe/Berlin',initial:{'cmd-sphere-language':'fr'}});
 assert.equal(french.api.current().code,'de-DE');
 assert.equal(french.api.current().mode,'auto');
});
test('malformed BCP 47 strings cannot be used as language codes',()=>{
 const {api}=simulate();
 for(const candidate of ['<script>','de_DE','zz-123456789','fr-FR;alert(1)','']){
  assert.equal(api.canonical(candidate),null,candidate);
 }
 assert.equal(api.canonical('gsw-CH-x-bern'),'gsw-CH-x-bern');
 assert.equal(api.canonical('en-US'),'en-US');
});
test('mobile language picker exposes all entries in paged buttons, not a native select',()=>{
 const settings=fs.readFileSync(path.join(root,'settings-ui.js'),'utf8');
 const runtime=fs.readFileSync(path.join(root,'patch-runtime.cjs'),'utf8');
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
 assert.match(settings,/id="cmdLanguageAutomatic"/);
 assert.match(settings,/function appendLanguages\(/);
 assert.match(settings,/matchedLanguages\.length/);
 assert.match(settings,/pageSize=75/);
 assert.match(settings,/data-cmd-more/);
 assert.match(settings,/languageCatalogue\.forEach\(function\(entry\)/);
 assert.match(settings,/CMDSphereLocale\?\.manual\(code\)/);
 assert.match(settings,/CMDSphereLocale\?\.automatic\(\)/);
 assert.doesNotMatch(settings,/max=30/);
 assert.match(runtime,/cmd-language-auto\.js/);
 assert.match(runtime,/const renderLang=/);
 assert.doesNotMatch(runtime,/if\(!languages\.includes\(language\)\)language="fr"/);
 assert.match(server,/if\(url\.pathname==="\/cmd-language-auto\.js"\)/);
});
