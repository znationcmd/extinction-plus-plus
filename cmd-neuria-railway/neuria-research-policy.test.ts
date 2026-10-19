import {test,expect} from 'bun:test';
import {shouldResearch,normalizeResearch} from './neuria-research-policy.ts';
test('current prices, API docs and versions trigger research while stable tasks do not',()=>{
 for(const question of ['Quel est le prix du serveur ?','Quelle version ARK est disponible ?','Cherche la documentation API','Les nouveautés de 2026'])expect(shouldResearch(question)).toBe(true);
 expect(shouldResearch('Explique la différence entre RAM et SSD')).toBe(false);expect(shouldResearch('Écris un poème')).toBe(false);
 expect(shouldResearch('Quel est le prix ?', 'off')).toBe(false);expect(shouldResearch('RAM et SSD','on')).toBe(true);
});
test('only safe, unique source links are passed to the engine',()=>{
 const found=normalizeResearch({provider:'Test',results:[{title:'Source fiable',url:'https://example.com/article',description:'<b>Extrait</b>'},{title:'Doublon',url:'https://example.com/article'},{url:'javascript:alert(1)'},{url:'https://user:password@example.com/'},{url:'not a URL'}]});
 expect(found.sources.length).toBe(1);expect(found.sources[0].excerpt).toBe('Extrait');expect(found.provider).toBe('Test');expect(normalizeResearch({results:null}).sources).toEqual([]);
});
