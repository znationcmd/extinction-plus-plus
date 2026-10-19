const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('CMD Sphere developer portal navigation replaces puzzle emoji with user-selected logo',()=>{
 const src=read('server.js');
 assert.match(src,/import \{cmdDeveloperRailIcon,cmdDeveloperInlineIcon\} from "\.\/cmd-developer-logo\.js";/);
 assert.match(src,/id="railDevelopers" href="\/developers"[^>]+>\x27\+cmdDeveloperRailIcon\+\x27<\/a>/);
 assert.match(src,/cmd-developer-entry" href="\/developers"[^>]+>\x27\+cmdDeveloperInlineIcon\+\x27 CMD Sphere Développeur<\/a>/);
 assert.doesNotMatch(src,/id="railDevelopers"[^>]+>🧩<\/a>/);
 assert.doesNotMatch(src,/cmd-developer-entry"[^>]+>🧩 CMD Sphere Développeur/);
 // Other integration/compose icons remain unchanged.
 assert.match(src,/settingRow\('🧩','Intégrations'/);
});
test('embedded user-supplied neon developer logo is a small valid WebP asset, not an external dependency',()=>{
 const src=read('cmd-developer-logo.js');
 const match=src.match(/data:image\/webp;base64,([a-zA-Z0-9+/=]+)/);
 assert.ok(match,'WebP embedded directly for predictable mobile rendering');
 const buf=Buffer.from(match[1],'base64');
 assert.ok(buf.length>1500&&buf.length<10000, 'compact image');
 assert.equal(buf.toString('ascii',0,4),'RIFF');
 assert.equal(buf.toString('ascii',8,12),'WEBP');
 assert.match(src,/alt=""/);
 assert.match(src,/aria-hidden="true"/);
 assert.match(src,/object-fit:cover/);
});
