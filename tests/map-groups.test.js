const test=require('node:test'),assert=require('node:assert/strict');
const groups=require('../dashboard/lib/map-groups.cjs');
const owner={userId:'owner',name:'Créateur'},player={userId:'player',name:'Joueur'},other={userId:'other',name:'Autre'};
const map={id:'terrain',xMin:0,xMax:100,yMin:0,yMax:100};
test('players join with a valid invitation, duplicate joins are idempotent and secrets are never returned',()=>{
 const g=groups.create(owner,'Mon groupe'),token=groups.invite(g,owner);
 groups.join(g,player,token);groups.join(g,player,token);
 assert.equal(g.members.length,2);assert.equal(groups.safe(g).inviteHash,undefined);assert.equal(groups.safe(g).inviteExpires,undefined);
 assert.throws(()=>groups.invite(g,player),/créateur/);
 assert.throws(()=>groups.member(g,other),/Accès refusé/);
});
test('renewing, revoking and expiring invitations prevents joining',()=>{
 const g=groups.create(owner,'G'),old=groups.invite(g,owner),current=groups.invite(g,owner);
 assert.throws(()=>groups.join(g,player,old),/invalide/);g.inviteExpires=Date.now()-1;assert.throws(()=>groups.join(g,player,current),/expirée/);
 const token=groups.invite(g,owner);groups.change(g,owner,{action:'revoke'});assert.throws(()=>groups.join(g,player,token),/invalide/);
});
test('private markers require membership and only author or owner can edit or delete',()=>{
 const g=groups.create(owner,'G');groups.join(g,player,groups.invite(g,owner));groups.join(g,other,groups.invite(g,owner));
 groups.pin(g,player,map,{name:'Base',x:10,y:20},'POST');const p=g.pins[0];
 assert.throws(()=>groups.pin(g,other,map,{...p,name:'Volé'},'PATCH'),/auteur/);
 assert.throws(()=>groups.pin(g,{userId:'outsider'},map,p,'DELETE'),/Accès refusé/);
 groups.pin(g,owner,map,{...p,name:'Corrigé'},'PATCH');assert.equal(g.pins[0].actorId,'player');
 assert.throws(()=>groups.pin(g,player,map,{name:'Hors carte',x:200,y:20},'POST'),/limites/);
 groups.change(g,owner,{action:'remove',memberId:'player'});assert.throws(()=>groups.member(g,player),/Accès refusé/);
 groups.pin(g,owner,map,p,'DELETE');assert.equal(g.pins.length,0);
});
test('ownership transfer revokes invitations and prevents the former owner from managing members',()=>{
 const g=groups.create(owner,'G'),token=groups.invite(g,owner);groups.join(g,player,token);
 assert.throws(()=>groups.change(g,owner,{action:'leave'}),/Transfère/);
 groups.change(g,owner,{action:'transfer',memberId:'player'});
 assert.throws(()=>groups.change(g,owner,{action:'remove',memberId:'player'}),/créateur/);
 assert.throws(()=>groups.join(g,other,token),/invalide/);
 groups.change(g,owner,{action:'leave'});assert.equal(g.members.length,1);assert.equal(g.ownerId,'player');
});
