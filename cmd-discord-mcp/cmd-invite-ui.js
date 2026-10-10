/* QR-Code-generator JavaScript — Copyright (c) Project Nayuki; adapted by Cyphrme. MIT License. https://github.com/Cyphrme/QRGenJS/blob/master/LICENSE.md */
"use strict";var qrcodegen=new function(){this.QrCode=function(e,n,i,u){if(e<O||e>T)throw"Version value out of range";if(u<-1||u>7)throw"Mask value out of range";if(!(n instanceof D))throw"QrCode.Ecc expected";for(var f=e*4+17,g=[],v=0;v<f;v++)g.push(!1);for(var d=[],E=[],v=0;v<f;v++)d.push(g.slice()),E.push(g.slice());C();var R=z(i);if(X(R),u==-1)for(var b=1/0,v=0;v<8;v++){F(v),N(v);var P=$();P<b&&(u=v,b=P),F(v)}if(u<0||u>7)throw"Assertion error";F(u),N(u),E=null,Object.defineProperty(this,"version",{value:e}),Object.defineProperty(this,"size",{value:f}),Object.defineProperty(this,"errorCorrectionLevel",{value:n}),Object.defineProperty(this,"mask",{value:u}),this.getModule=function(r,t){return 0<=r&&r<f&&0<=t&&t<f&&d[t][r]},this.drawCanvas=function(r,t,a){if(r<=0||t<0)throw"Value out of range";var o=(f+t*2)*r;a.width=o,a.height=o;for(var s=a.getContext("2d"),c=-t;c<f+t;c++)for(var l=-t;l<f+t;l++)s.fillStyle=this.getModule(l,c)?"#000000":"#FFFFFF",s.fillRect((l+t)*r,(c+t)*r,r,r)},this.toSvgString=function(r){if(r<0)throw"Border must be non-negative";for(var t=[],a=0;a<f;a++)for(var o=0;o<f;o++)this.getModule(o,a)&&t.push("M"+(o+r)+","+(a+r)+"h1v1h-1z");return`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 `+(f+r*2)+" "+(f+r*2)+`" stroke="none">
	<rect width="100%" height="100%" fill="#FFFFFF"/>
	<path d="`+t.join(" ")+`" fill="#000000"/>
</svg>
`};function C(){for(var r=0;r<f;r++)w(6,r,r%2==0),w(r,6,r%2==0);Q(3,3),Q(f-4,3),Q(3,f-4);for(var t=J(),a=t.length,r=0;r<a;r++)for(var o=0;o<a;o++)r==0&&o==0||r==0&&o==a-1||r==a-1&&o==0||H(t[r],t[o]);N(0),W()}function N(r){for(var t=n.formatBits<<3|r,a=t,o=0;o<10;o++)a=a<<1^(a>>>9)*1335;var s=(t<<10|a)^21522;if(s>>>15!=0)throw"Assertion error";for(var o=0;o<=5;o++)w(8,o,A(s,o));w(8,7,A(s,6)),w(8,8,A(s,7)),w(7,8,A(s,8));for(var o=9;o<15;o++)w(14-o,8,A(s,o));for(var o=0;o<8;o++)w(f-1-o,8,A(s,o));for(var o=8;o<15;o++)w(8,f-15+o,A(s,o));w(8,f-8,!0)}function W(){if(!(e<7)){for(var r=e,t=0;t<12;t++)r=r<<1^(r>>>11)*7973;var a=e<<12|r;if(a>>>18!=0)throw"Assertion error";for(var t=0;t<18;t++){var o=A(a,t),s=f-11+t%3,c=Math.floor(t/3);w(s,c,o),w(c,s,o)}}}function Q(r,t){for(var a=-4;a<=4;a++)for(var o=-4;o<=4;o++){var s=Math.max(Math.abs(o),Math.abs(a)),c=r+o,l=t+a;0<=c&&c<f&&0<=l&&l<f&&w(c,l,s!=2&&s!=4)}}function H(r,t){for(var a=-2;a<=2;a++)for(var o=-2;o<=2;o++)w(r+o,t+a,Math.max(Math.abs(o),Math.abs(a))!=1)}function w(r,t,a){d[t][r]=a,E[t][r]=!0}function z(r){if(r.length!=h.getNumDataCodewords(e,n))throw"Invalid argument";for(var t=h.NUM_ERROR_CORRECTION_BLOCKS[n.ordinal][e],a=h.ECC_CODEWORDS_PER_BLOCK[n.ordinal][e],o=Math.floor(h.getNumRawDataModules(e)/8),s=t-o%t,c=Math.floor(o/t),l=[],m=h.reedSolomonComputeDivisor(a),p=0,I=0;p<t;p++){var B=r.slice(I,I+c-a+(p<s?0:1));I+=B.length;var G=h.reedSolomonComputeRemainder(B,m);p<s&&B.push(0),l.push(B.concat(G))}for(var L=[],p=0;p<l[0].length;p++)for(var _=0;_<l.length;_++)(p!=c-a||_>=s)&&L.push(l[_][p]);if(L.length!=o)throw"Assertion error";return L}function X(r){if(r.length!=Math.floor(h.getNumRawDataModules(e)/8))throw"Invalid argument";for(var t=0,a=f-1;a>=1;a-=2){a==6&&(a=5);for(var o=0;o<f;o++)for(var s=0;s<2;s++){var c=a-s,l=(a+1&2)==0,m=l?f-1-o:o;!E[m][c]&&t<r.length*8&&(d[m][c]=A(r[t>>>3],7-(t&7)),t++)}}if(t!=r.length*8)throw"Assertion error"}function F(r){if(r<0||r>7)throw"Mask value out of range";for(var t=0;t<f;t++)for(var a=0;a<f;a++){var o;switch(r){case 0:o=(a+t)%2==0;break;case 1:o=t%2==0;break;case 2:o=a%3==0;break;case 3:o=(a+t)%3==0;break;case 4:o=(Math.floor(a/3)+Math.floor(t/2))%2==0;break;case 5:o=a*t%2+a*t%3==0;break;case 6:o=(a*t%2+a*t%3)%2==0;break;case 7:o=((a+t)%2+a*t%3)%2==0;break;default:throw"Assertion error"}!E[t][a]&&o&&(d[t][a]=!d[t][a])}}function $(){for(var r=0,t=0;t<f;t++){for(var a=!1,o=0,s=[0,0,0,0,0,0,0],c=f,l=0;l<f;l++)d[t][l]==a?(o++,o==5?r+=h.PENALTY_N1:o>5&&r++):(h.finderPenaltyAddHistory(o+c,s),c=0,a||(r+=k(s)*h.PENALTY_N3),a=d[t][l],o=1);r+=Y(a,o+c,s)*h.PENALTY_N3}for(var l=0;l<f;l++){for(var a=!1,m=0,s=[0,0,0,0,0,0,0],c=f,t=0;t<f;t++)d[t][l]==a?(m++,m==5?r+=h.PENALTY_N1:m>5&&r++):(h.finderPenaltyAddHistory(m+c,s),c=0,a||(r+=k(s)*h.PENALTY_N3),a=d[t][l],m=1);r+=Y(a,m+c,s)*h.PENALTY_N3}for(var t=0;t<f-1;t++)for(var l=0;l<f-1;l++){var p=d[t][l];p==d[t][l+1]&&p==d[t+1][l]&&p==d[t+1][l+1]&&(r+=h.PENALTY_N2)}var I=0;d.forEach(function(L){L.forEach(function(_){_&&I++})});var B=f*f,G=Math.ceil(Math.abs(I*20-B*10)/B)-1;return r+=G*h.PENALTY_N4,r}function J(){if(e==1)return[];for(var r=Math.floor(e/7)+2,t=e==32?26:Math.ceil((f-13)/(r*2-2))*2,a=[6],o=f-7;a.length<r;o-=t)a.splice(1,0,o);return a}function k(r){var t=r[1];if(t>f*3)throw"Assertion error";var a=t>0&&r[2]==t&&r[3]==t*3&&r[4]==t&&r[5]==t;return(a&&r[0]>=t*4&&r[6]>=t?1:0)+(a&&r[6]>=t*4&&r[0]>=t?1:0)}function Y(r,t,a){return r&&(h.finderPenaltyAddHistory(t,a),t=0),t+=f,h.finderPenaltyAddHistory(t,a),k(a)}function A(r,t){return(r>>>t&1)!=0}},this.QrCode.encodeText=function(e,n){var i=qrcodegen.QrSegment.makeSegments(e);return this.encodeSegments(i,n)},this.QrCode.encodeBinary=function(e,n){var i=qrcodegen.QrSegment.makeBytes(e);return this.encodeSegments([i],n)},this.QrCode.encodeSegments=function(e,n,i,u,f,g){if(i==null&&(i=O),u==null&&(u=T),f==null&&(f=-1),g==null&&(g=!0),!(O<=i&&i<=u&&u<=T)||f<-1||f>7)throw"Invalid value";var v,d;for(v=i;;v++){var R=h.getNumDataCodewords(v,n)*8;if(d=qrcodegen.QrSegment.getTotalBits(e,v),d<=R)break;if(v>=u)throw"Data too long"}[this.Ecc.MEDIUM,this.Ecc.QUARTILE,this.Ecc.HIGH].forEach(function(C){g&&d<=h.getNumDataCodewords(v,C)*8&&(n=C)});var E=new M;if(e.forEach(function(C){E.appendBits(C.mode.modeBits,4),E.appendBits(C.numChars,C.mode.numCharCountBits(v)),C.getData().forEach(function(N){E.push(N)})}),E.length!=d)throw"Assertion error";var R=h.getNumDataCodewords(v,n)*8;if(E.length>R||(E.appendBits(0,Math.min(4,R-E.length)),E.appendBits(0,(8-E.length%8)%8),E.length%8!=0))throw"Assertion error";for(var b=236;E.length<R;b^=253)E.appendBits(b,8);for(var P=[];P.length*8<E.length;)P.push(0);return E.forEach(function(C,N){P[N>>>3]|=C<<7-(N&7)}),new this(v,n,P,f)};var h={};h.getNumRawDataModules=function(e){if(e<O||e>T)throw"Version number out of range";var n=(16*e+128)*e+64;if(e>=2){var i=Math.floor(e/7)+2;n-=(25*i-10)*i-55,e>=7&&(n-=36)}return n},h.getNumDataCodewords=function(e,n){return Math.floor(h.getNumRawDataModules(e)/8)-h.ECC_CODEWORDS_PER_BLOCK[n.ordinal][e]*h.NUM_ERROR_CORRECTION_BLOCKS[n.ordinal][e]},h.reedSolomonComputeDivisor=function(e){if(e<1||e>255)throw"Degree out of range";for(var n=[],i=0;i<e-1;i++)n.push(0);n.push(1);for(var u=1,i=0;i<e;i++){for(var f=0;f<n.length;f++)n[f]=h.reedSolomonMultiply(n[f],u),f+1<n.length&&(n[f]^=n[f+1]);u=h.reedSolomonMultiply(u,2)}return n},h.reedSolomonComputeRemainder=function(e,n){var i=n.map(function(){return 0});return e.forEach(function(u){var f=u^i.shift();i.push(0),n.forEach(function(g,v){i[v]^=h.reedSolomonMultiply(g,f)})}),i},h.reedSolomonMultiply=function(e,n){if(e>>>8!=0||n>>>8!=0)throw"Byte out of range";for(var i=0,u=7;u>=0;u--)i=i<<1^(i>>>7)*285,i^=(n>>>u&1)*e;if(i>>>8!=0)throw"Assertion error";return i},h.finderPenaltyAddHistory=function(e,n){n.pop(),n.unshift(e)},h.hasFinderLikePattern=function(e){var n=e[1];return n>0&&e[2]==n&&e[4]==n&&e[5]==n&&e[3]==n*3&&Math.max(e[0],e[6])>=n*4};var O=1,T=40;Object.defineProperty(this.QrCode,"MIN_VERSION",{value:O}),Object.defineProperty(this.QrCode,"MAX_VERSION",{value:T}),h.PENALTY_N1=3,h.PENALTY_N2=3,h.PENALTY_N3=40,h.PENALTY_N4=10,h.ECC_CODEWORDS_PER_BLOCK=[[null,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],[null,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],[null,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],[null,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]],h.NUM_ERROR_CORRECTION_BLOCKS=[[null,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],[null,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],[null,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],[null,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]],this.QrCode.Ecc={LOW:new D(0,1),MEDIUM:new D(1,0),QUARTILE:new D(2,3),HIGH:new D(3,2)};function D(e,n){Object.defineProperty(this,"ordinal",{value:e}),Object.defineProperty(this,"formatBits",{value:n})}this.QrSegment=function(e,n,i){if(n<0||!(e instanceof S))throw"Invalid argument";i=i.slice(),Object.defineProperty(this,"mode",{value:e}),Object.defineProperty(this,"numChars",{value:n}),this.getData=function(){return i.slice()}},this.QrSegment.makeBytes=function(e){var n=new M;return e.forEach(function(i){n.appendBits(i,8)}),new this(this.Mode.BYTE,e.length,n)},this.QrSegment.makeNumeric=function(e){if(!this.NUMERIC_REGEX.test(e))throw"String contains non-numeric characters";for(var n=new M,i=0;i<e.length;){var u=Math.min(e.length-i,3);n.appendBits(parseInt(e.substring(i,i+u),10),u*3+1),i+=u}return new this(this.Mode.NUMERIC,e.length,n)},this.QrSegment.makeAlphanumeric=function(e){if(!this.ALPHANUMERIC_REGEX.test(e))throw"String contains unencodable characters in alphanumeric mode";var n=new M,i;for(i=0;i+2<=e.length;i+=2){var u=U.ALPHANUMERIC_CHARSET.indexOf(e.charAt(i))*45;u+=U.ALPHANUMERIC_CHARSET.indexOf(e.charAt(i+1)),n.appendBits(u,11)}return i<e.length&&n.appendBits(U.ALPHANUMERIC_CHARSET.indexOf(e.charAt(i)),6),new this(this.Mode.ALPHANUMERIC,e.length,n)},this.QrSegment.makeSegments=function(e){return e==""?[]:this.NUMERIC_REGEX.test(e)?[this.makeNumeric(e)]:this.ALPHANUMERIC_REGEX.test(e)?[this.makeAlphanumeric(e)]:[this.makeBytes(K(e))]},this.QrSegment.makeEci=function(e){var n=new M;if(e<0)throw"ECI assignment value out of range";if(e<128)n.appendBits(e,8);else if(e<16384)n.appendBits(2,2),n.appendBits(e,14);else if(e<1e6)n.appendBits(6,3),n.appendBits(e,21);else throw"ECI assignment value out of range";return new this(this.Mode.ECI,0,n)},this.QrSegment.getTotalBits=function(e,n){for(var i=0,u=0;u<e.length;u++){var f=e[u],g=f.mode.numCharCountBits(n);if(f.numChars>=1<<g)return 1/0;i+=4+g+f.getData().length}return i};var U={};this.QrSegment.NUMERIC_REGEX=/^[0-9]*$/,this.QrSegment.ALPHANUMERIC_REGEX=/^[A-Z0-9 $%*+.\/:-]*$/,U.ALPHANUMERIC_CHARSET="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:",this.QrSegment.Mode={NUMERIC:new S(1,[10,12,14]),ALPHANUMERIC:new S(2,[9,11,13]),BYTE:new S(4,[8,16,16]),KANJI:new S(8,[8,10,12]),ECI:new S(7,[0,0,0])};function S(e,n){Object.defineProperty(this,"modeBits",{value:e}),this.numCharCountBits=function(i){return n[Math.floor((i+7)/17)]}}function K(e){e=encodeURI(e);for(var n=[],i=0;i<e.length;i++)e.charAt(i)!="%"?n.push(e.charCodeAt(i)):(n.push(parseInt(e.substring(i+1,i+3),16)),i+=2);return n}function M(){Array.call(this),this.appendBits=function(e,n){if(n<0||n>31||e>>>n!=0)throw"Value out of range";for(var i=n-1;i>=0;i--)this.push(e>>>i&1)}}M.prototype=Object.create(Array.prototype),M.prototype.constructor=M};
//# sourceMappingURL=qrgen.min.js.map
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
		typeof define === 'function' && define.amd ? define(['exports'], factory) :
		(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.qrgen = {}));
})(this, (function (exports) {
	exports.QrCode = qrcodegen.QrCode;
	exports.QrSegment = qrcodegen.QrSegment;

	Object.defineProperty(exports, '__esModule', {
		value: true
	});
}));
/* CMD Sphere — private server-specific invitations.
   QR rendering is entirely local: invitation URLs never leave CMD Sphere. */
(()=>{
"use strict";
if(window.__cmdInviteUiReady)return;window.__cmdInviteUiReady=true;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
let activeGuild="",currentItems=[],activeLink="",activeName="";
const css=document.createElement("style");
css.textContent=
".cmd-inv-launch{border:1px solid #aa81c5b0;border-radius:10px;background:#4b3158;color:#fff;padding:9px 11px;font-weight:750;cursor:pointer}"+
".cmd-inv-mask{display:none;position:fixed;inset:0;z-index:99998;background:#0a0612ce;align-items:end;justify-content:center;font:14px/1.4 system-ui;color:#faf7fc}"+
".cmd-inv-mask.open{display:flex}.cmd-inv-panel{width:min(610px,100%);max-height:94dvh;overflow:auto;overscroll-behavior:contain;border-radius:23px 23px 0 0;border:1px solid #795e94;background:#201626;box-shadow:0 -20px 75px #0009;padding:22px 18px calc(22px + env(safe-area-inset-bottom));position:relative}"+
".cmd-inv-handle{width:42px;height:4px;background:#78667d;border-radius:15px;margin:-12px auto 16px}"+
".cmd-inv-head{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:12px}"+
".cmd-inv-head h2{font-size:19px;margin:0;color:white}.cmd-inv-head button{border:0;border-radius:50%;width:38px;height:38px;background:#46364c;color:white;font-size:22px}"+
".cmd-inv-sub{color:#c7b9d0;margin:0 0 16px;font-size:13px}"+
".cmd-inv-create{border:1px solid #5c4866;border-radius:13px;padding:13px;background:#2d2135;margin:10px 0;display:grid;grid-template-columns:1fr 1fr;gap:9px}"+
".cmd-inv-create h3{grid-column:1/-1;margin:0 0 4px;font-size:14px}"+
".cmd-inv-create label{display:flex;flex-direction:column;gap:6px;min-width:0;font-weight:700;font-size:12px;color:#e2d7e8}"+
".cmd-inv-create label.wide{grid-column:1/-1}"+
".cmd-inv-create input,.cmd-inv-create select{background:#151019;border:1px solid #776287;color:white;border-radius:9px;padding:11px;min-width:0;width:100%;font:14px system-ui}"+
".cmd-inv-create button{grid-column:1/-1;border:0;border-radius:11px;background:#8744b5;color:white;font-weight:800;padding:12px;font-size:14px}"+
".cmd-inv-list{display:flex;flex-direction:column;gap:10px;margin-top:14px}"+
".cmd-inv-item{background:#2c2134;border:1px solid #ffffff1b;padding:12px;border-radius:14px;min-width:0}"+
".cmd-inv-item h3{font-size:15px;margin:0 0 4px}.cmd-inv-item small{color:#cabbcf}"+
".cmd-inv-url{display:block;width:100%;min-width:0;background:#160f1c;color:#fff;border:1px solid #584467;border-radius:10px;padding:10px;font-size:12px;margin:9px 0;text-overflow:ellipsis}"+
".cmd-inv-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}"+
".cmd-inv-actions button{min-height:43px;border:0;border-radius:10px;background:#4e3b5a;color:white;font:750 12px system-ui;padding:7px 3px;cursor:pointer}"+
".cmd-inv-actions .danger{color:#ffd8de;background:#60323f}"+
".cmd-inv-qr{margin:12px auto 4px;display:grid;place-items:center;background:white;border-radius:12px;padding:15px;width:fit-content;max-width:100%}"+
".cmd-inv-qr svg{display:block;width:min(220px,65vw);height:auto;image-rendering:pixelated}"+
".cmd-inv-status{min-height:20px;color:#d5c2e0;font-size:12px;margin:8px 0}"+
".cmd-inv-item.expired{opacity:.6}"+
"@media(max-width:450px){.cmd-inv-panel{padding:18px 12px calc(18px + env(safe-area-inset-bottom))}.cmd-inv-actions{gap:5px}.cmd-inv-actions button{font-size:11px}}";
document.head.append(css);
const mask=document.createElement("div");mask.className="cmd-inv-mask";mask.setAttribute("role","dialog");mask.setAttribute("aria-modal","true");mask.setAttribute("aria-label","Invitations du serveur CMD Sphere");
mask.innerHTML='<div class="cmd-inv-panel"><div class="cmd-inv-handle"></div><div class="cmd-inv-head"><h2 id="cmdInvTitle">Inviter un ami</h2><button type="button" id="cmdInvClose" aria-label="Fermer">✕</button></div>'+
 '<p class="cmd-inv-sub">Chaque lien invite seulement sur ce serveur. Les autres serveurs restent privés.</p>'+
 '<form id="cmdInvCreate" class="cmd-inv-create" hidden><h3>Créer une invitation</h3>'+
 '<label class="wide">Nom de l’invitation<input name="label" maxlength="70" placeholder="Amis, équipe, événement…"></label>'+
 '<label>Expiration<select name="expiry"><option value="3">3 jours</option><option value="30" selected>30 jours</option><option value="never">Jamais</option></select></label>'+
 '<label>Lien personnalisé (facultatif)<input name="customCode" maxlength="40" pattern="[a-z0-9][a-z0-9-]{3,39}" placeholder="mon-serveur"></label>'+
 '<button type="submit">＋ Générer mon lien</button></form>'+
 '<div id="cmdInvStatus" class="cmd-inv-status" role="status" aria-live="polite"></div><div id="cmdInvList" class="cmd-inv-list"></div></div>';
document.body.append(mask);
const list=$("#cmdInvList"),form=$("#cmdInvCreate"),status=$("#cmdInvStatus");
function hint(message,isError){status.textContent=message||"";status.style.color=isError?"#ff99aa":"#d5c2e0"}
function guildId(){
 const root=$("#workspace");
 const id=String(root?.dataset.nativeGuildId||location.pathname.match(/^\/native\/([a-f0-9-]{36})/i)?.[1]||"");
 return uuid.test(id)?id:"";
}
function close(){mask.classList.remove("open");activeGuild="";list.replaceChildren();hint("")}
$("#cmdInvClose").onclick=close;
mask.addEventListener("click",event=>{if(event.target===mask)close()});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&mask.classList.contains("open"))close()});
async function api(url,method,body){
 const res=await fetch(url,{method:method||"GET",credentials:"same-origin",cache:"no-store",headers:{"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||"Opération impossible");return data;
}
function qrSvg(url){
 const qr=qrcodegen.QrCode.encodeText(url,qrcodegen.QrCode.Ecc.MEDIUM);
 const border=4,size=qr.size+border*2;
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("viewBox","0 0 "+size+" "+size);svg.setAttribute("xmlns","http://www.w3.org/2000/svg");svg.setAttribute("aria-label","Code QR de l’invitation");
 const bg=document.createElementNS("http://www.w3.org/2000/svg","rect");
 bg.setAttribute("width",size);bg.setAttribute("height",size);bg.setAttribute("fill","#fff");svg.append(bg);
 let path="";
 for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))path+="M"+(x+border)+" "+(y+border)+"h1v1h-1z";
 const dark=document.createElementNS("http://www.w3.org/2000/svg","path");dark.setAttribute("d",path);dark.setAttribute("fill","#000");svg.append(dark);
 return svg;
}
function qrDownload(svg,name){
 const serialized=new XMLSerializer().serializeToString(svg);
 const blob=new Blob([serialized],{type:"image/svg+xml;charset=utf-8"});
 const url=URL.createObjectURL(blob);const a=document.createElement("a");
 a.href=url;a.download="CMD-Sphere-invitation-"+String(name||"serveur").replace(/[^a-z0-9-]/gi,"-")+".svg";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function copy(link){try{await navigator.clipboard.writeText(link);return true}catch{return false}}
async function share(link){
 if(navigator.share){try{await navigator.share({title:activeName||"Invitation CMD Sphere",url:link});return}catch(e){if(e.name==="AbortError")return}}
 if(await copy(link))hint("Lien copié : partage-le avec tes amis.");else hint("Sélectionne et copie le lien ci-dessous.",true);
}
function render(items,canManage){
 list.replaceChildren();
 if(!items.length){const p=document.createElement("p");p.className="cmd-inv-status";p.textContent=canManage?"Aucun lien actif. Crée une invitation pour ce serveur.":"Aucun lien actif. Demande une invitation à un administrateur.";list.append(p);return}
 for(const item of items){
  const expired=item.expired||item.revoked;
  const article=document.createElement("section");article.className="cmd-inv-item"+(expired?" expired":"");
  const head=document.createElement("h3");head.textContent=item.label||"Invitation du serveur";
  const meta=document.createElement("small");
  meta.textContent=item.revoked?"Désactivée":item.expired?"Expirée":item.expiresAt?"Expire le "+new Date(item.expiresAt).toLocaleDateString("fr-FR"):"Sans expiration";
  article.append(head,meta);
  if(!expired){
   const input=document.createElement("input");input.className="cmd-inv-url";input.value=item.url;input.readOnly=true;input.setAttribute("aria-label","Lien d’invitation du serveur");article.append(input);
   const actions=document.createElement("div");actions.className="cmd-inv-actions";
   for(const [label,fn] of [["↗ Partager",()=>share(item.url)],["Copier",async()=>{hint(await copy(item.url)?"Lien copié !":"Sélectionne et copie le lien.",false);input.select()}],["Code QR",()=>{const qr=article.querySelector(".cmd-inv-qr");if(qr){qr.remove();return}const wrap=document.createElement("div");wrap.className="cmd-inv-qr";let svg;try{svg=qrSvg(item.url);wrap.append(svg)}catch(e){hint("QR indisponible : "+e.message,true);return}const save=document.createElement("button");save.type="button";save.textContent="Télécharger le QR";save.style.cssText="margin-top:9px;background:#442b53;color:white;border:0;padding:10px;border-radius:9px";save.onclick=()=>qrDownload(svg,item.label);wrap.append(save);article.append(wrap)}]]){
    const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=fn;actions.append(b);
   }
   article.append(actions);
  }
  if(canManage&&!item.revoked){
   const actions=article.querySelector(".cmd-inv-actions")||article;
   const revoke=document.createElement("button");revoke.className="danger";revoke.type="button";revoke.textContent="Désactiver";
   revoke.onclick=async()=>{if(!confirm("Désactiver ce lien d’invitation ?"))return;revoke.disabled=true;try{await api("/api/native/invites/revoke","POST",{guildId:activeGuild,code:item.code});await refresh();hint("Lien désactivé.")}catch(e){revoke.disabled=false;hint(e.message,true)}};
   actions.append(revoke);
  }
  list.append(article);
 }
}
async function refresh(){
 const guild=activeGuild;if(!guild)return;
 const data=await api("/api/native/invites?guildId="+encodeURIComponent(guild));
 if(guild!==activeGuild)return;
 form.hidden=!data.canManage;
 currentItems=data.invites||[];
 render(currentItems,data.canManage);
}
async function open(guild){
 guild=String(guild||guildId());
 if(!uuid.test(guild)){hint("Sélectionne d’abord un serveur CMD Sphere.");return false}
 activeGuild=guild;mask.classList.add("open");$("#cmdInvTitle").textContent="Inviter un ami · Ce serveur";
 list.textContent="Chargement des invitations…";
 hint("");
 try{await refresh()}catch(e){list.textContent="";hint(e.message,true)}
 return true;
}
form.addEventListener("submit",async event=>{
 event.preventDefault();if(!activeGuild)return;
 const fd=new FormData(form),button=form.querySelector("button[type=submit]");button.disabled=true;
 try{
  const body={guildId:activeGuild,expiry:fd.get("expiry"),customCode:String(fd.get("customCode")||"").trim().toLowerCase(),label:String(fd.get("label")||"Invitation")};
  const result=await api("/api/native/invites","POST",body);
  form.reset();await refresh();hint("Invitation créée pour ce serveur.");
  const row=currentItems.find(x=>x.code===result.code);if(row){const el=list.firstElementChild;el?.scrollIntoView({block:"nearest",behavior:"smooth"})}
 }catch(e){hint(e.message,true)}finally{button.disabled=false}
});
let launch=null,lastGuild="";
function install(){
 if(!launch){
  launch=document.createElement("button");launch.type="button";launch.className="cmd-inv-launch";launch.id="cmdInviteFriends";launch.textContent="＋ Inviter un ami";
  launch.onclick=()=>{if(!open(guildId()))alert("Ouvre d’abord le serveur que tu veux partager.")};
 }
 const root=$("#workspace"),native=Boolean(root?.dataset.nativeGuildId)&&Boolean($(".sphere-app.cmd-native-selected"));
 const header=$(".cmd-server-head-actions");
 if(native&&header&&header.isConnected){
  if(launch.parentElement!==header){launch.remove();header.append(launch)}
  launch.hidden=false;
 }else{launch.hidden=true;launch.remove()}
 const id=native?guildId():"";
 if(id!==lastGuild){lastGuild=id;if(id&&mask.classList.contains("open")&&id!==activeGuild)close()}
}
document.addEventListener("click",event=>{
 const b=event.target?.closest?.("#cmdInviteCopy,#invite");
 const guild=guildId();
 if(!b||!guild)return;
 event.preventDefault();event.stopImmediatePropagation();void open(guild);
},true);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
const obs=new MutationObserver(()=>{if(!window.__cmdInviteScheduled){window.__cmdInviteScheduled=true;requestAnimationFrame(()=>{window.__cmdInviteScheduled=false;install()})}});
obs.observe(document.body,{childList:true,subtree:true});
window.cmdOpenServerInvites=open;
})();
