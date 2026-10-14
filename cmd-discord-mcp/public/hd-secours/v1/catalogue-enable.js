/* HD catalogue activation for staging. Falls back to originals on missing assets. */
(function(){
  function start(){
    if(!window.CMD_HD_ASSETS)return;
    window.CMD_HD_ASSETS.enable();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
