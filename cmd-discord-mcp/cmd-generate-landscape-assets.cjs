/* CMD Sphere original vector panoramas.
   Rebuilds the CMD HD backgrounds at 1920×1080, from source, without stretching
   or cropping the old portrait versions. Regenerated after profile assets unpack. */
const fs=require("node:fs"),path=require("node:path");
const scenes=JSON.parse(fs.readFileSync(path.join(__dirname,"cmd-hd-scenes.json"),"utf8"));
const palettes=[
["#0c0626","#452964","#ac69ce"],["#041b2e","#17695d","#7ceac1"],
["#152634","#c18c53","#ffedb2"],["#061c2a","#11664c","#6de3b2"],
["#152941","#5f91ac","#ebf6fa"],["#182b4a","#839fbd","#fcfcff"],
["#1e67a3","#58b7ca","#f9e6b5"],["#231531","#d16d77","#ffdda8"],
["#152947","#6f9abd","#f6d5c7"],["#152b35","#a97645","#eec78d"],
["#54375c","#d88dac","#ffe7ed"],["#152f65","#7395db","#dbe8fa"],
["#06192d","#17636b","#6af2b6"],["#0b0829","#48256c","#dc79ce"],
["#11112d","#343d79","#bedafe"],["#080824","#252558","#f3d29a"],
["#0c1031","#553471","#e67bd3"],["#183c60","#598aa5","#d7e9ef"],
["#090b2a","#442a78","#e77bde"],["#17243a","#b34c48","#f7d58d"],
["#1f1624","#7d5034","#dfaa75"],["#271b27","#835038","#fac88a"],
["#261c22","#98703c","#ffdb91"],["#dcdde5","#e8e9ed","#fff"],
["#0b1127","#344668","#cbdbef"],["#18305d","#7795b0","#fff"],
["#5e371a","#b38856","#eacc92"],["#dde3e9","#f1f2f5","#fff"],
["#8b5da1","#e39cc3","#f7e8b6"],["#e0a5bb","#f7d2df","#fcedd5"],
["#10154a","#4965bc","#df91dc"],["#0d0e11","#33333a","#66656b"],
["#271723","#a26d44","#ffdc9d"],["#1b153b","#a341a1","#ffb3dc"],
["#332956","#9e82bc","#ffdfad"]];
function random(seed){let t=Math.imul(seed+21,99821)|0;return()=>((t=Math.imul(t,1664525)+1013904223|0)>>>0)/4294967296}
function generate(i){
 const s=scenes[i],slug=s.id.slice(7),c=palettes[i%palettes.length],rnd=random(i),v=(a,b)=>Math.round(a+(b-a)*rnd()),star=n=>Array.from({length:n},()=>'<circle cx="'+v(0,1920)+'" cy="'+v(0,1080)+'" r="'+v(1,4)+'" fill="#fff" opacity="'+(.12+rnd()*.7).toFixed(2)+'"/>').join("");
 const haze=n=>Array.from({length:n},()=>'<circle cx="'+v(0,1920)+'" cy="'+v(0,1080)+'" r="'+v(30,130)+'" fill="'+c[2]+'" opacity="'+(.05+rnd()*.18).toFixed(2)+'" filter="url(#mist)"/>').join("");
 const hill='<path d="M0 830Q300 670 580 780T1180 755T1920 790V1080H0Z" fill="'+c[1]+'" opacity=".75"/><path d="M0 970Q310 770 720 950T1500 920T1920 890V1080H0Z" fill="'+c[0]+'" opacity=".8"/>';
 let out="",type=/foret|jungle/.test(slug)?"forest":/lac|sommets/.test(slug)?"mountains":/plage|tropical|marine|palmiers/.test(slug)?"beach":/cascade/.test(slug)?"waterfall":/cerisiers|hortensias|lavande/.test(slug)?"flowers":/aurore/.test(slug)?"aurora":/galaxie/.test(slug)?"space":/orage/.test(slug)?"storm":/artifice/.test(slug)?"fireworks":/ville|metropole|rue/.test(slug)?"city":/torii/.test(slug)?"torii":/bibliotheque|cafe/.test(slug)?"interior":/studio-dore/.test(slug)?"studio":/marbre/.test(slug)?"marble":/manoir/.test(slug)?"haunted":/noel/.test(slug)?"winter":/leopard/.test(slug)?"leopard":/dalmatien/.test(slug)?"dalmatian":/damier/.test(slug)?"checker":/donuts/.test(slug)?"donuts":/orbites/.test(slug)?"abstract":/grunge/.test(slug)?"grunge":"bokeh";
 if(type==="forest"){out+=hill+haze(16);for(let k=0;k<55;k++){let x=v(-80,2000),y=v(500,1250),h=v(130,550),w=v(45,120);out+='<g opacity="'+(.3+rnd()*.65).toFixed(2)+'"><path d="M'+x+' '+y+'v-'+h+'" stroke="'+c[0]+'" stroke-width="'+v(8,26)+'"/><path d="M'+x+' '+(y-h-120)+'L'+(x-w)+' '+(y-h*.7)+'h'+w*.5+'l-'+w*.8+' '+h*.36+'h'+w*2.6+'l-'+w*.8+'-'+h*.36+'h'+w*.5+'Z" fill="'+(k%3?c[0]:"#175347")+'"/></g>'}out+=star(50)}
 else if(type==="mountains"||type==="waterfall"){out+='<path d="M0 860L150 430L375 770L650 160L900 780L1200 200L1460 750L1670 330L1920 850V1080H0Z" fill="'+c[1]+'"/><path d="M0 990L280 490L490 820L690 210L1020 790L1200 270L1510 840L1720 390L1920 950V1080H0Z" fill="'+c[0]+'" opacity=".65"/><path d="M650 160L770 435L640 355L530 450Z M1200 200L1320 470L1180 390L1090 475Z M1670 330L1760 520L1650 465L1580 520Z" fill="'+c[2]+'" opacity=".95"/>';if(type==="waterfall")out+='<path d="M855 490Q940 680 810 1080H1250Q1070 780 1160 500Z" fill="#ceeff4" opacity=".85"/><path d="M880 530Q980 720 900 1080M1110 545Q1000 830 1140 1080" fill="none" stroke="#fff" stroke-width="20" opacity=".67"/>';else out+='<path d="M0 810Q400 760 950 840T1920 820V1080H0Z" fill="'+c[2]+'" opacity=".32"/>'}
 else if(type==="beach"){out+='<circle cx="'+v(830,1450)+'" cy="'+v(180,400)+'" r="175" fill="'+c[2]+'" opacity=".9" filter="url(#soft)"/><rect y="655" width="1920" height="425" fill="'+c[1]+'" opacity=".65"/><path d="M0 870Q500 822 950 878T1920 875V1080H0Z" fill="'+c[2]+'" opacity=".85"/>';for(let k=0;k<5;k++){let x=k%2?v(1550,1950):v(-70,270),y=v(790,1190),dx=k%2?-v(120,250):v(130,270),h=v(420,800);out+='<path d="M'+x+' '+y+'Q'+(x+dx*.5)+' '+(y-h*.5)+' '+(x+dx)+' '+(y-h)+'" stroke="#182333" stroke-width="'+v(18,40)+'" fill="none"/><path d="M'+(x+dx)+' '+(y-h)+'q-230-120-370-60q240-30 360 95q100-240 330-160q-130 120-335 110q245 45 350 205q-260-66-335-190Z" fill="#1b2a36"/>'}}
 else if(type==="flowers"){out+=hill;for(let k=0;k<200;k++){let x=v(0,1920),y=v(520,1160),z=v(8,29);out+='<path d="M'+x+' '+y+'v'+v(18,75)+'" stroke="#246044" stroke-width="4"/><g fill="'+(k%3?c[2]:"#ffe5f0")+'"><circle cx="'+(x-z)+'" cy="'+y+'" r="'+z*.65+'"/><circle cx="'+(x+z)+'" cy="'+y+'" r="'+z*.65+'"/><circle cx="'+x+'" cy="'+(y-z)+'" r="'+z*.65+'"/><circle cx="'+x+'" cy="'+(y+z)+'" r="'+z*.65+'"/></g><circle cx="'+x+'" cy="'+y+'" r="'+z*.36+'" fill="#ffeeb0"/>'}}
 else if(["aurora","space","storm","fireworks"].includes(type)){out+=star(200)+haze(22);if(type==="aurora")out+='<path d="M-90 380Q700 50 2010 360V650Q850 260-90 640Z" fill="#9fffd4" opacity=".3" filter="url(#mist)"/>'+hill;if(type==="space")out+='<ellipse cx="950" cy="480" rx="800" ry="230" fill="'+c[2]+'" opacity=".25" filter="url(#mist)" transform="rotate(-20 950 480)"/>';if(type==="storm")out+='<path d="M1370 70L1090 540H1220L850 1040L1010 610H890Z" fill="#fff" filter="url(#soft)"/>';if(type==="fireworks")for(let k=0;k<20;k++){let x=v(150,1750),y=v(100,850),rad=v(40,210);for(let j=0;j<18;j++){let a=j*2*Math.PI/18;out+='<path d="M'+(x+Math.cos(a)*20)+' '+(y+Math.sin(a)*20)+'L'+(x+Math.cos(a)*rad)+' '+(y+Math.sin(a)*rad)+'" stroke="'+(k%2?c[2]:"#eec9d9")+'" stroke-width="'+v(2,8)+'" opacity=".7"/>'}}}
 else if(type==="city"){for(let k=0;k<38;k++){let x=k*53-50,y=v(260,750),w=v(62,150);out+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+(1080-y)+'" fill="'+(k%2?c[0]:"#142943")+'" stroke="'+c[1]+'" stroke-width="4"/>';for(let xx=x+15;xx<x+w-10;xx+=23)for(let yy=y+20;yy<1010;yy+=37)if(rnd()>.45)out+='<rect x="'+xx+'" y="'+yy+'" width="9" height="13" fill="'+c[2]+'" opacity=".65"/>'}out+='<path d="M700 1080L900 700H1070L1330 1080Z" fill="#101124"/>'}
 else if(type==="torii"){out+=hill;for(let k=0;k<9;k++){let scale=.38+k*.18,y=280+k*86;out+='<g transform="translate(960 '+y+') scale('+scale+')"><path d="M-270 330V-260M270 330V-260" stroke="#542026" stroke-width="53"/><path d="M-350-260H350" stroke="#ac3943" stroke-width="88"/><path d="M-390-355H390" stroke="#d1554d" stroke-width="63"/></g>'}}
 else if(type==="interior"||type==="studio"){out+='<rect width="1920" height="1080" fill="'+c[1]+'" opacity=".26"/><path d="M0 900L960 530L1920 900V1080H0Z" fill="'+c[0]+'" opacity=".8"/>';if(type==="interior")for(let k=0;k<11;k++){let x=25+k*180;out+='<rect x="'+x+'" y="110" width="150" height="640" fill="#271b28" stroke="'+c[2]+'" stroke-width="12"/>';for(let j=0;j<10;j++)out+='<rect x="'+(x+v(8,40))+'" y="'+(145+j*57)+'" width="'+v(25,80)+'" height="45" fill="'+(j%2?"#c99661":"#597981")+'"/>'}else out+=haze(75)}
 else if(type==="winter"){out+=hill;for(let k=0;k<18;k++){let x=v(-20,1920),y=v(560,1100),z=v(48,125);out+='<path d="M'+(x-z)+' '+y+'L'+x+' '+(y-z)+'L'+(x+z)+' '+y+'V'+(y+150)+'H'+(x-z)+'Z" fill="'+(k%2?"#394866":"#6a7996")+'"/><path d="M'+(x-z-12)+' '+y+'L'+x+' '+(y-z-12)+'L'+(x+z+12)+' '+y+'" fill="none" stroke="#fff" stroke-width="21"/>'}out+=star(200)}
 else if(type==="haunted"){out+=hill+'<circle cx="1510" cy="270" r="125" fill="#edf6f4" opacity=".88" filter="url(#soft)"/><path d="M560 1000V520L730 365V260H825V370L970 180L1125 370V260H1230V390L1400 540V1000Z" fill="#0d1526" stroke="#7a869c" stroke-width="15"/>';for(let k=0;k<19;k++)out+='<rect x="'+v(580,1370)+'" y="'+v(500,880)+'" width="35" height="50" fill="#f7cd8a" opacity=".7"/>'}
 else if(type==="checker"){let colors=["#dba6d6","#8ed4e4","#f9e7c2","#ed8eae","#ae99df"];for(let y=0;y<1080;y+=135)for(let x=0;x<1920;x+=135)out+='<rect x="'+x+'" y="'+y+'" width="135" height="135" fill="'+colors[(x/135+y/135)%colors.length]+'"/>'}
 else if(type==="marble"){for(let k=0;k<55;k++){let x=v(-600,1800),y=v(-100,1300);out+='<path d="M'+x+' '+y+'Q'+(x+v(100,400))+' '+(y+v(100,600))+' '+(x+v(250,780))+' '+(y+v(400,900))+'" fill="none" stroke="'+(k%3?"#98a0af":"#ac9b95")+'" stroke-width="'+v(1,8)+'" opacity=".43"/>'}}
 else if(type==="leopard"||type==="dalmatian"){for(let k=0;k<225;k++){let x=v(0,1920),y=v(0,1080);out+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+v(9,39)+'" ry="'+v(9,32)+'" fill="'+(type==="leopard"?"#523624":"#1c232f")+'" opacity=".85" transform="rotate('+v(0,180)+' '+x+' '+y+')"/>'}}
 else if(type==="donuts"){for(let k=0;k<100;k++){let x=v(0,1920),y=v(0,1080),z=v(23,65);out+='<circle cx="'+x+'" cy="'+y+'" r="'+z+'" fill="#ab7658"/><circle cx="'+x+'" cy="'+y+'" r="'+z*.83+'" fill="'+(k%2?"#f8b9d9":"#c8acdf")+'"/><circle cx="'+x+'" cy="'+y+'" r="'+z*.29+'" fill="#f8d8e0"/>'}}
 else if(type==="abstract"){for(let k=0;k<38;k++){let x=v(0,1920),y=v(0,1080);out+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+v(100,620)+'" ry="'+v(50,320)+'" fill="none" stroke="'+(k%2?c[2]:"#9eb6ff")+'" stroke-width="'+v(4,19)+'" opacity=".3" transform="rotate('+v(0,180)+' '+x+' '+y+')"/>'}}
 else if(type==="grunge"){for(let k=0;k<200;k++){let x=v(0,1920),y=v(0,1080);out+='<path d="M'+x+' '+y+'l'+v(-220,230)+' '+v(-110,100)+'" stroke="'+c[2]+'" stroke-width="'+v(1,24)+'" opacity=".14"/>'}}
 else out+=haze(100)+star(150);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="'+c[0]+'"/><stop offset=".6" stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[2]+'"/></linearGradient><filter id="mist"><feGaussianBlur stdDeviation="24"/></filter><filter id="soft"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="1920" height="1080" fill="url(#bg)"/>'+out+'</svg>';
}
const output=path.join(__dirname,"public/universe/v1");
fs.mkdirSync(output,{recursive:true});
for(let i=0;i<scenes.length;i++){
 const item=scenes[i];if(!/^\/universe\/v1\/hd-[a-z0-9-]+\.svg$/.test(item.src))throw Error("Invalid CMD scene path");
 fs.writeFileSync(path.join(output,path.basename(item.src)),generate(i),"utf8");
}
console.info("[CMD Sphere backgrounds] "+scenes.length+" landscape vector scenes generated at 1920x1080.");
