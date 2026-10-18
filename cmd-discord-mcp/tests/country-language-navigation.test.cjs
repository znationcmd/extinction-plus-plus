'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const country=JSON.parse(fs.readFileSync(path.join(base,'cmd-country-language-catalog.json'),'utf8'));
const world=JSON.parse(fs.readFileSync(path.join(base,'cmd-language-catalog.json'),'utf8'));
test('country directory lists at least 240 named countries and territories with no duplicate ISO ids',()=>{
 assert.ok(country.countryCount>=240);
 assert.equal(country.countryCount,country.countries.length);
 const ids=new Set();
 for(const row of country.countries){
  assert.match(row.code,/^[A-Z]{2}$/);
  assert.ok(row.name&&typeof row.name==='string');
  assert.ok(Array.isArray(row.languages));
  assert.equal(ids.has(row.code),false,'country duplicated: '+row.code);
  ids.add(row.code);
 }
 assert.equal(ids.has('DE'),true);
 assert.equal(ids.has('DZ'),true);
 assert.equal(ids.has('AR'),true);
 assert.equal(ids.has('CH'),true);
 assert.equal(ids.has('FR'),true);
});
test('A contains Germany, Algeria, Argentina in French and B contains Belgium and Brazil',()=>{
 const byLetter=letter=>country.countries.filter(c=>
  c.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().startsWith(letter)).map(c=>c.name);
 const A=byLetter('A');
 for(const x of ['Allemagne','Algérie','Argentine'])assert.ok(A.includes(x),x);
 const B=byLetter('B');
 for(const x of ['Belgique','Brésil'])assert.ok(B.includes(x),x);
 assert.ok(!A.includes('Belgique'));
});
test('Swiss German choices are all present and belong to Switzerland, without leaking into Germany',()=>{
 const find=c=>country.countries.find(x=>x.code===c);
 const swiss=find('CH'),germany=find('DE');
 assert.ok(swiss.languages.includes('gsw-CH'));
 for(const x of ['gsw-CH-x-bern','gsw-CH-x-zueri','gsw-CH-x-basel','gsw-CH-x-wallis','gsw-CH-x-luzern','fr-CH','de-CH','it-CH','rm-CH'])
  assert.ok(swiss.languages.includes(x),x);
 assert.ok(germany.languages.includes('de'));
 assert.ok(!germany.languages.includes('de-CH'));
 assert.ok(!germany.languages.includes('gsw-CH-x-bern'));
});
test('country language choices refer only to available worldwide catalogue codes',()=>{
 const codes=new Set(world.languages.map(x=>x[0]));
 const invalid=country.countries.flatMap(c=>c.languages.filter(l=>!codes.has(l)).map(l=>c.code+':'+l));
 assert.deepEqual(invalid,[]);
 assert.ok(world.count>=8000);
 assert.match(country.note,/not a guarantee/i);
});
test('country-by-letter chooser uses accessible tappable buttons with back navigation and 8148-language escape hatch',()=>{
 const text=fs.readFileSync(path.join(base,'settings-ui.js'),'utf8');
 const server=fs.readFileSync(path.join(base,'server.js'),'utf8');
 assert.match(text,/id="cmdLanguageAlphabetLabel">Langues classées par lettre/);
 assert.match(text,/allLanguagesButton\.textContent=allLanguages\?'🌍 Voir les pays \(A–Z\)'/);
 assert.match(text,/id="cmdCountryBack"/);
 assert.match(text,/id="cmdShowAllLanguages"/);
 assert.match(text,/button\.dataset\.cmdCountry=country\.code/);
 assert.match(text,/allLanguagesButton\.addEventListener\('click'/);
 assert.match(text,/backCountry\.addEventListener\('click'/);
 assert.match(text,/var activeLetter='A'/);
 assert.match(text,/function listCountries\(term\)/);
 assert.match(text,/function listCountryLanguages\(country\)/);
 assert.match(text,/function refreshCountryList\(term\)/);
 assert.match(text,/loadCountryCatalogue\(\)/);
 assert.match(text,/fetch\('\/cmd-country-language-catalog\.json'/);
 assert.match(text,/Promise\.all\(\[loadLanguageCatalogue\(\),loadCountryCatalogue\(\)\]\)/);
 assert.match(text,/results\.addEventListener\('click'/);
 assert.match(text,/item\.dataset\.cmdLocale=entry\[0\]/);
 assert.match(text,/results\.replaceChildren\(\)/);
 assert.doesNotMatch(text,/<select id="cmdLanguageChoice"/);
 assert.match(text,/CMDSphereLocale\?\.automatic\(\)/);
 assert.match(text,/CMDSphereLocale\?\.manual\(code\)/);
 assert.match(server,/if\(url\.pathname==="\/cmd-country-language-catalog\.json"\)/);
 assert.match(server,/cmd-country-language-catalog\.json",import\.meta\.url/);
});
