'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'cmd-language-catalog.json'),'utf8')).languages;
const ui=fs.readFileSync(path.join(root,'settings-ui.js'),'utf8');
const initial=label=>String(label||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/^[^a-z0-9]+/i,'').charAt(0).toUpperCase();
function group(letter){return catalogue.filter(([code,name])=>letter==='#'
  ?!/^[A-Z]$/.test(initial(name)):initial(name)===letter);}
test('every worldwide language belongs to precisely one A to Z or Other letter, all 8148 preserved',()=>{
 const letters=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'];
 const subsets=letters.map(group);
 const all=subsets.flat();
 assert.equal(all.length,catalogue.length);
 assert.equal(catalogue.length,8148);
 assert.deepEqual(new Set(all.map(row=>row[0])).size,catalogue.length);
 assert.ok(group('A').length>100);
 assert.ok(group('B').length>100);
 assert.ok(group('C').length>100);
 assert.equal(group('A').some(row=>row[0]==='alu'),true,"'Are'are must appear in A");
 assert.equal(group('B').some(row=>row[0]==='alu'),false);
});
test('all A and all B languages open directly from letter buttons, never country list',()=>{
 assert.match(ui,/var activeLetter='A'/);
 assert.match(ui,/chosenCountry=null,allLanguages=true/);
 assert.match(ui,/if\(!query&&activeLetter\)/);
 assert.match(ui,/initial===activeLetter/);
 assert.match(ui,/listMatches\(query\)/);
 assert.match(ui,/alphabet\.addEventListener\('click'/);
 assert.match(ui,/activeLetter=button\.dataset\.cmdLetter/);
 assert.doesNotMatch(ui,/chosenCountry=null;allLanguages=false;searchInput\.value='';\s*updateLetters\(\)/);
 assert.match(ui,/Toutes les langues par lettre/);
 assert.match(ui,/🌍 Rechercher par pays/);
 assert.match(ui,/Revenir aux langues \(A–Z\)/);
});
test('all 8148 codes and country-specific search remain separately available without native iPhone select',()=>{
 assert.match(ui,/var alphabetLetters=\['Toutes',\.\.\.'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'\]/);
 assert.match(ui,/matchedLanguages=out;loadedLanguages=0/);
 assert.match(ui,/pageSize=75/);
 assert.match(ui,/data-cmd-more/);
 assert.match(ui,/function listCountries\(term\)/);
 assert.match(ui,/function listCountryLanguages\(country\)/);
 assert.match(ui,/id="cmdLanguageAutomatic"/);
 assert.doesNotMatch(ui,/<select id="cmdLanguageChoice"/);
});
