/* CMD Sphere worldwide locale policy — ISO 639-3 plus region and dialect BCP47.
 * Accepted locale preferences do NOT guarantee machine or UI translation coverage.
 */
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('./cmd-language-catalog.json',import.meta.url),'utf8'));
const codes=new Set(catalog.languages.map(pair=>String(pair[0])));
const BASE=/^[a-z]{2,3}$/i;
const LOCALE=/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,7}$/i;
export const WORLD_LANGUAGE_COUNT=catalog.count;
export function recognizeWorldLanguage(value){
 const input=String(value||'').trim();
 if(!LOCALE.test(input)||input.length>64)return null;
 if(input.toLowerCase()==='us')return 'en-US';
 let canonical;
 try{canonical=Intl.getCanonicalLocales(input)[0]}catch{return null}
 if(!canonical)return null;
 const base=canonical.split('-')[0].toLowerCase();
 if(BASE.test(base)&&codes.has(base))return canonical;
 return null;
}
export function providerLanguageCode(locale){
 const requested=recognizeWorldLanguage(locale);
 if(!requested)return null;
 const base=requested.split('-')[0];
 if(base==='gsw')return {requested,target:'de',approximation:'Suisse allemand : traduction de secours en allemand standard, pas en dialecte.'};
 if(base==='zh')return {requested,target:/-Hant\b/i.test(requested)?'zh-TW':'zh-CN',approximation:requested.includes('-')?'La variété chinoise exacte n’est pas garantie.':null};
 const known={fra:'fr',eng:'en',deu:'de',ger:'de',spa:'es',ita:'it',por:'pt',rus:'ru',kor:'ko',jpn:'ja',zho:'zh-CN',cmn:'zh-CN',cos:'co',ara:'ar',hin:'hi',nld:'nl',dut:'nl'};
 const target=known[base]||base;
 return {requested,target,approximation:requested.toLowerCase()!==target.toLowerCase()&&requested.includes('-')?'La variété régionale n’est pas garantie par le fournisseur gratuit.':null};
}
