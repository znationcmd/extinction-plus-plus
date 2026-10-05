const {randomInt,randomUUID}=require('node:crypto');
const {account}=require('./economy.cjs');
function state(db){return db.arcade||={plays:[],lotteries:[],requests:[]};}
function amount(n,max=100000){if(!Number.isSafeInteger(n)||n<1||n>max)throw new Error(`Montant entre 1 et ${max}.`);return n;}
function balance(a){if(!Number.isSafeInteger(a.bank||0)||(a.bank||0)<0)throw new Error('Solde banque invalide.');return a.bank||0;}
function transaction(db,guildId,userId,n,reason,id){db.economy||={transactions:[]};(db.economy.transactions||=[]).push({id,guildId,userId,amount:n,reason,createdAt:new Date().toISOString()});}
function play(db,gid,user,request,game,bet,choice,now=Date.now(),rng=randomInt){
 const s=state(db),old=s.plays.find(p=>p.id===request&&p.guildId===gid&&p.userId===user);if(old)return old;
 amount(bet);if(!['pileface','des','slots'].includes(game))throw new Error('Jeu inconnu.');
 if(game==='pileface'&&!['pile','face'].includes(choice)||game==='des'&&!/^[1-6]$/.test(choice||''))throw new Error('Choisis pile/face ou un nombre de 1 à 6.');
 const last=s.plays.filter(p=>p.guildId===gid&&p.userId===user).at(-1);if(last&&now-last.at<10000)throw new Error('Attends 10 secondes entre deux mises.');
 const a=account(db,gid,user),before=balance(a);if(before<bet)throw new Error('Solde banque insuffisant.');
 let result,payout;
 if(game==='pileface'){result=['pile','face'][rng(2)];payout=result===choice?bet*2:0;}
 else if(game==='des'){result=String(rng(6)+1);payout=result===choice?bet*5:0;}
 else{const reels=Array.from({length:3},()=>rng(6));result=reels.map(i=>['🍒','🍋','🍇','🔔','⭐','💎'][i]).join(' ');payout=bet*(new Set(reels).size===1?10:new Set(reels).size===2?1:0);}
 if(!Number.isSafeInteger(before-bet+payout))throw new Error('Solde trop élevé.');a.bank=before-bet+payout;
 const row={id:request,guildId:gid,userId:user,game,bet,result,payout,net:payout-bet,at:now};s.plays.push(row);if(s.plays.length>10000)s.plays.splice(0,s.plays.length-10000);transaction(db,gid,user,row.net,`Casino ${game}`,request);return row;
}
function current(db,gid){return state(db).lotteries.find(l=>l.guildId===gid&&l.status==='open');}
function open(db,gid,price,minutes,now=Date.now()){
 amount(price);amount(minutes,10080);if(current(db,gid))throw new Error('Une loterie est déjà ouverte.');const l={id:randomUUID(),guildId:gid,price,endsAt:now+minutes*60000,status:'open',tickets:[],pot:0};state(db).lotteries.push(l);return l;
}
function buy(db,gid,user,request,count,now=Date.now()){
 const s=state(db);if(s.requests.some(r=>r.id===request&&r.guildId===gid))return current(db,gid);
 amount(count,10);const l=current(db,gid);if(!l||now>=l.endsAt)throw new Error('Aucune loterie ouverte aux achats.');
 if(l.tickets.filter(t=>t.userId===user).reduce((n,t)=>n+t.count,0)+count>10)throw new Error('10 tickets maximum par joueur et par tirage.');
 if(l.tickets.reduce((n,t)=>n+t.count,0)+count>10000)throw new Error('Loterie complète.');
 const cost=count*l.price,a=account(db,gid,user);if(balance(a)<cost)throw new Error('Solde banque insuffisant.');a.bank-=cost;l.pot+=cost;l.tickets.push({id:request,userId:user,count});s.requests.push({id:request,guildId:gid});transaction(db,gid,user,-cost,'Tickets de loterie',request);return l;
}
function draw(db,gid,now=Date.now(),rng=randomInt){
 const l=current(db,gid);if(!l)throw new Error('Aucune loterie à tirer.');if(now<l.endsAt)throw new Error('Le tirage est disponible à la fin de la loterie.');
 const total=l.tickets.reduce((n,t)=>n+t.count,0);if(total){let pick=rng(total);const winner=l.tickets.find(t=>(pick-=t.count)<0);const a=account(db,gid,winner.userId);if(!Number.isSafeInteger(balance(a)+l.pot))throw new Error('Solde gagnant trop élevé.');a.bank+=l.pot;l.winnerId=winner.userId;transaction(db,gid,winner.userId,l.pot,'Gain de loterie',l.id);}
 l.status='drawn';l.drawnAt=now;return l;
}
function minigame(game,choice,rng=randomInt){
 if(game==='chifoumi'){const moves=['pierre','feuille','ciseaux'],i=moves.indexOf(choice);if(i<0)throw new Error('Choisis pierre, feuille ou ciseaux.');const j=rng(3);return `Tu joues ${choice}, le bot joue ${moves[j]} : ${i===j?'égalité':(i-j+3)%3===1?'tu gagnes':'le bot gagne'} !`;}
 if(game==='devinette'){if(!/^(10|[1-9])$/.test(choice||''))throw new Error('Choisis un nombre de 1 à 10.');const n=rng(10)+1;return `Nombre tiré : ${n}. ${Number(choice)===n?'Bravo, tu as trouvé !':'Essaie encore !'}`;}
 if(game==='de')return `🎲 Tu as obtenu ${rng(6)+1}.`;throw new Error('Mini-jeu inconnu.');
}
module.exports={play,current,open,buy,draw,minigame};
