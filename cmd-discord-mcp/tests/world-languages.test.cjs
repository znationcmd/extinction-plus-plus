"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const base=path.join(__dirname,'..');
const world=import(pathToFileURL(path.join(base,'cmd-world-language-codes.js')).href);
const catalog=JSON.parse(fs.readFileSync(path.join(base,'cmd-language-catalog.json'),'utf8'));
test('language picker registry includes over 8,000 ISO languages and aliases, and regional dialects',()=>{
 assert.ok(catalog.count>=8000,'Worldwide ISO 639-3 registry must not fall back to 11');
 assert.equal(catalog.count,catalog.languages.length);
 const all=new Map(catalog.languages);
 assert.equal(all.size,catalog.count,'no duplicate codes');
 for(const code of ['fr','en','de','co','ru','zh','ar','hi','pt','bn','sw',
   'gsw','gsw-CH','gsw-CH-x-bern','gsw-CH-x-zueri',
   'gsw-CH-x-basel','gsw-CH-x-wallis','gsw-CH-x-luzern',
   'de-CH','fr-CH','it-CH','rm-CH','fr-CA','pt-BR','zh-Hant']){
    assert.ok(all.get(code),code+' must exist');
 }
 assert.match(all.get('gsw-CH-x-bern'),/Bärndütsch/);
 assert.match(catalog.note,/not a guarantee/i);
});
test('BCP 47 ISO registry recognizes dialect tags but rejects unknown languages',async()=>{
 const {recognizeWorldLanguage:normalize,WORLD_LANGUAGE_COUNT}=await world;
 assert.equal(WORLD_LANGUAGE_COUNT,catalog.count);
 assert.equal(normalize('gsw-CH-x-bern'),'gsw-CH-x-bern');
 assert.equal(normalize('gsw-CH'),'gsw-CH');
 assert.equal(normalize('de-CH'),'de-CH');
 assert.equal(normalize('co-FR'),'co-FR');
 assert.equal(normalize('us'),'en-US');
 assert.equal(normalize('FR'),'fr');
 assert.equal(normalize('ar-EG'),'ar-EG');
 for(const bad of ['','zzz','zz-QQ','anything','gsw-CH;DROP TABLE','gsw-CH-INVALID-TAG-123456789','gsw CH']){
  assert.equal(normalize(bad),null,bad);
 }
});
test('Swiss German and regional tags are transparent about standard-language fallback',async()=>{
 const {providerLanguageCode:provider}=await world;
 const swiss=provider('gsw-CH-x-bern');
 assert.equal(swiss.requested,'gsw-CH-x-bern');
 assert.equal(swiss.target,'de');
 assert.match(swiss.approximation,/pas en dialecte/i);
 assert.equal(provider('zh-Hant').target,'zh-TW');
 assert.equal(provider('fr-CH').target,'fr');
 assert.ok(provider('fr-CH').approximation);
 assert.equal(provider('ar-EG').target,'ar');
 assert.equal(provider('fr').approximation,null);
 assert.equal(provider('non-existent'),null);
});
test('translation endpoint accepts global target codes without claiming provider coverage',async()=>{
 const {freeMessageTranslation:translate}=await import(pathToFileURL(path.join(base,'cmd-translation.js')).href);
 const exact=await translate({userId:'member',text:'Bonjour',target:'gsw-CH-x-bern',source:'gsw-CH-x-bern'});
 assert.equal(exact.targetLanguage,'gsw-CH-x-bern');
 assert.equal(exact.providerLanguage,'de');
 assert.match(exact.approximation,/pas en dialecte/i);
 await assert.rejects(translate({userId:'member',text:'Bonjour',target:'not-a-code',source:'auto'}),e=>e.status===400);
});
test('settings and chat UI offer searchable catalogue, custom region tags, no language reset and honest fallback',()=>{
 const settings=fs.readFileSync(path.join(base,'settings-ui.js'),'utf8');
 const messages=fs.readFileSync(path.join(base,'cmd-message-translate.js'),'utf8');
 const server=fs.readFileSync(path.join(base,'server.js'),'utf8');
 assert.match(settings,/id="cmdLanguageSearch"/);
 assert.match(settings,/id="cmdLanguageCustomCode"/);
 assert.match(settings,/loadLanguageCatalogue\(\)/);
 assert.match(settings,/fetch\('\/cmd-language-catalog\.json'/);
 assert.match(settings,/languageCatalogue\.length<7000/);
 assert.match(settings,/applySettingsLanguage\(code\)/);
 assert.match(settings,/ensureLanguageOption\(globalPicker,code\)/);
 assert.match(settings,/cmdSettingsLocales\[base\]/);
 assert.doesNotMatch(settings,/return cmdSettingsNativeNames\[selected\]\?selected:'fr'/);
 assert.match(messages,/const languageTag=/);
 assert.doesNotMatch(messages,/return supported\[saved\]\?saved:"fr"/);
 assert.match(messages,/result\.approximation/);
 assert.match(server,/if\(url\.pathname==="\/cmd-language-catalog\.json"\)/);
 assert.match(server,/readFileSync\(new URL\("\.\/cmd-language-catalog\.json"/);
});
