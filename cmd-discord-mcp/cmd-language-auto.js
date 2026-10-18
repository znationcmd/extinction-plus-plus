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
    for(var i=0;i<candidates.length;i++){
      var v=canonical(candidates[i]);
      if(v&&v!=='und')return v;
    }
    return 'fr';
  }
  function current(){
    var manual=read(MODE)==='manual';
    var saved=canonical(read(STORAGE));
    // Older versions saved a manual preference without a separate mode marker.
    // Never replace that user choice with geolocation or OS guesses.
    if(!read(MODE)&&saved){write(MODE,'manual');manual=true}
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
