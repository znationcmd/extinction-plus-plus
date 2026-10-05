const test=require('node:test'),assert=require('node:assert/strict');
const arcade=require('../dashboard/lib/arcade.cjs');
const gid='123456789012345',user='987654321098765',other='222222222222222';
function db(){return {bank:{accounts:[{guildId:gid,userId:user,bank:1000,cash:0}]}};}
test('casino settles net winnings once per Discord interaction and enforces cooldown',()=>{
 const d=db();const p=arcade.play(d,gid,user,'one','pileface',100,'pile',10000,()=>0);
 assert.equal(p.payout,200);assert.equal(d.bank.accounts[0].bank,1100);
 assert.deepEqual(arcade.play(d,gid,user,'one','pileface',100,'pile',10001,()=>1),p);
 assert.equal(d.economy.transactions.length,1);assert.throws(()=>arcade.play(d,gid,user,'two','slots',10,null,10001),/10 secondes/);
});
test('invalid choices, unsafe bets and insufficient balance never debit the bank',()=>{
 const d=db();for(const bet of [0,-1,1.5,100001])assert.throws(()=>arcade.play(d,gid,user,'x','des',bet,'1'));
 assert.throws(()=>arcade.play(d,gid,user,'x','des',100,'7'));
 assert.throws(()=>arcade.play(d,gid,user,'x','slots',1001));assert.equal(d.bank.accounts[0].bank,1000);
});
test('slot payouts distinguish triple, pair and no match',()=>{
 for(const [reels,payout] of [[[0,0,0],100],[[0,0,1],10],[[0,1,2],0]]){const d=db();let n=0;assert.equal(arcade.play(d,gid,user,'x','slots',10,null,10000,()=>reels[n++]).payout,payout);assert.equal(d.bank.accounts[0].bank,990+payout);}
});
test('lottery escrows tickets, rejects late purchases and pays the weighted winner once',()=>{
 const d=db(),l=arcade.open(d,gid,10,1,10000);arcade.buy(d,gid,user,'a',2,10001);arcade.buy(d,gid,user,'a',2,10002);
 assert.equal(l.pot,20);assert.equal(d.bank.accounts[0].bank,980);
 d.bank.accounts.push({guildId:gid,userId:other,bank:100});arcade.buy(d,gid,other,'b',1,10003);
 assert.throws(()=>arcade.draw(d,gid,10004),/fin/);assert.throws(()=>arcade.buy(d,gid,user,'c',1,70000),/ouverte/);
 assert.equal(arcade.draw(d,gid,70000,()=>2).winnerId,other);assert.equal(d.bank.accounts[1].bank,120);assert.throws(()=>arcade.draw(d,gid,70001));
 assert.equal(d.bank.accounts.reduce((n,a)=>n+a.bank,0),1100);
});
test('lotteries are isolated by guild and cap tickets per participant',()=>{
 const d=db();arcade.open(d,gid,1,1,0);assert.throws(()=>arcade.open(d,gid,1,1,0));assert.equal(arcade.current(d,'other'),undefined);
 arcade.buy(d,gid,user,'a',10,1);assert.throws(()=>arcade.buy(d,gid,user,'b',1,2),/10 tickets/);
});
test('mini-games and slash definitions validate playable choices',()=>{
 assert.match(arcade.minigame('chifoumi','feuille',()=>0),/tu gagnes/);assert.match(arcade.minigame('devinette','10',()=>9),/Bravo/);assert.throws(()=>arcade.minigame('devinette','99'));
 const cmds=require('../shared/arcade-commands').commands().map(c=>c.toJSON());assert.deepEqual(cmds.map(c=>c.name),['casino','loterie','minijeu']);
});
