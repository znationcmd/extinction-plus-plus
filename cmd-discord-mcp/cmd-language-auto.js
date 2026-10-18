/* CMD Sphere — per-device automatic locale, with an explicit permanent manual override.
 * Browser languages/regions are signals, not proof of physical location.
 * No location permission, third-party geolocation or paid API.
 */
(function(root){
  'use strict';
  var STORAGE='cmd-sphere-language',MODE='cmd-sphere-language-mode';
  var tag=/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
  function canonical(v){
    v=String(v||'').trim();
    if(!tag.test(v)||v.length>64)return null;
    if(v.toLowerCase()==='us')return 'en-US';
    try{return Intl.getCanonicalLocales(v)[0]||null}catch{return null}
  }
  function read(key){try{return root.localStorage?.getItem(key)||null}catch{return null}}
  function write(key,v){try{root.localStorage?.setItem(key,v)}catch{}}
  function inferred(){
    var browser=root.navigator||{},candidates=[];
    if(Array.isArray(browser.languages))candidates.push.apply(candidates,browser.languages);
    candidates.push(browser.language);
    try{candidates.push(Intl.DateTimeFormat().resolvedOptions().locale)}catch{}
    var preferred=null;
    for(var i=0;i<candidates.length;i++){
      var v=canonical(candidates[i]);
      if(v&&v!=='und'){preferred=v;break}
    }
    // The device time zone is an optional, approximate country hint.
    // Prefer it for unambiguous locations (Germany, Italy, Japan, etc.)
    // so an English-configured phone visiting Germany can start in German.
    var zone='';
    try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch{}
    var single={
      'Europe/Berlin':'de-DE','Europe/Rome':'it-IT','Europe/Madrid':'es-ES',
      'Europe/Paris':'fr-FR','Europe/Lisbon':'pt-PT','Europe/Vienna':'de-AT',
      'Europe/Amsterdam':'nl-NL','Europe/London':'en-GB','Europe/Warsaw':'pl-PL',
      'Europe/Prague':'cs-CZ','Europe/Athens':'el-GR','Europe/Oslo':'nb-NO',
      'Europe/Stockholm':'sv-SE','Europe/Copenhagen':'da-DK',
      'Asia/Tokyo':'ja-JP','Asia/Seoul':'ko-KR','Asia/Kolkata':'hi-IN',
      'Asia/Bangkok':'th-TH','America/Sao_Paulo':'pt-BR',
      'America/Mexico_City':'es-MX'
    };
    if(single[zone])return single[zone];
    // Multilingual countries (Switzerland, Belgium, Canada) MUST use
    // the user's preferred language; country alone cannot choose dialect.
    var shared={'Europe/Zurich':'CH','Europe/Brussels':'BE','America/Toronto':'CA'};
    if(shared[zone]&&preferred){
      var base=preferred.split('-')[0];
      return canonical(base+'-'+shared[zone])||preferred;
    }
    return preferred||'fr';
  }
  function current(){
    var manual=read(MODE)==='manual';
    var saved=canonical(read(STORAGE));
    // Older versions saved a manual preference without a separate mode marker.
    // Never replace that user choice with geolocation or OS guesses.
    if(!read(MODE)&&saved&&saved!=='fr'){write(MODE,'manual');manual=true}
    // Old CMD Sphere saved French on every visit, even when the user did not choose it.
    // Migrate that old default to automatic detection; explicitly marked manual stays manual.
    if(manual&&saved)return {code:saved,mode:'manual'};
    var detected=inferred();
    write(MODE,'auto');write(STORAGE,detected);
    return {code:detected,mode:'auto'};
  }
  function notify(code,mode){
    try{
      root.document?.documentElement?.setAttribute('lang',code);
      root.dispatchEvent?.(new CustomEvent('cmd-sphere-language-change',{detail:{language:code,mode:mode}}));
    }catch{}
  }
  function manual(code){
    var value=canonical(code);if(!value)return null;
    write(STORAGE,value);write(MODE,'manual');notify(value,'manual');
    return value;
  }
  function automatic(){
    write(MODE,'auto');
    var value=inferred();write(STORAGE,value);notify(value,'auto');
    return value;
  }
  root.CMDSphereLocale=Object.freeze({canonical:canonical,detect:inferred,current:current,manual:manual,automatic:automatic});
  current();
})(typeof window!=='undefined'?window:globalThis);
