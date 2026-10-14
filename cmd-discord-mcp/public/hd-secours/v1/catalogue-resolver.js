/* CMD Sphere HD emergency catalogue URL resolver.
 * Opt-in: call window.CMD_HD_ASSETS.enable() only after catalogue UI tests.
 * Preserves all original URLs and identifiers. No network request required.
 */
(function(global){
  'use strict';
  const root='/hd-secours/v1/';
  const rules=[
    [/\/avatars\/v3\/(avatar-[a-z0-9.-]+)\.(?:png|webp)$/i,'avatars'],
    [/\/universe\/v1\/(pet-[a-z0-9.-]+)\.(?:png|webp)$/i,'animals'],
    [/\/universe\/v1\/(home-[a-z0-9.-]+)\.(?:png|webp)$/i,'houses'],
    [/\/universe\/v1\/(vehicle-[a-z0-9.-]+)\.(?:png|webp)$/i,'vehicles'],
    [/\/universe\/v1\/(scene-[a-z0-9.-]+)\.(?:png|webp)$/i,'scenes']
  ];
  let enabled=false,observer=null;
  const originals=new WeakMap();
  function resolve(src){
    if(!src||typeof src!=='string')return null;
    const clean=src.split(/[?#]/)[0];
    for(const [pattern,category] of rules){
      const m=clean.match(pattern);
      if(m)return root+category+'/'+m[1]+'.webp';
    }
    return null;
  }
  function apply(img){
    if(!enabled||!img||img.tagName!=='IMG'||originals.has(img))return;
    const source=img.getAttribute('src');
    const replacement=resolve(source);
    if(!replacement)return;
    originals.set(img,source);
    img.addEventListener('error',function fallback(){
      img.removeEventListener('error',fallback);
      const original=originals.get(img);
      if(original){img.setAttribute('src',original);originals.delete(img);}
    },{once:true});
    img.setAttribute('src',replacement);
  }
  function scan(){document.querySelectorAll('img[src]').forEach(apply);}
  function enable(){
    if(enabled)return;
    enabled=true;scan();
    observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='attributes')apply(record.target);
        for(const node of record.addedNodes){
          if(node.nodeType!==1)continue;
          if(node.matches&&node.matches('img'))apply(node);
          if(node.querySelectorAll)node.querySelectorAll('img[src]').forEach(apply);
        }
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
  }
  function disable(){enabled=false;if(observer){observer.disconnect();observer=null;}document.querySelectorAll('img').forEach(img=>{const original=originals.get(img);if(original){img.setAttribute('src',original);originals.delete(img);}});}
  global.CMD_HD_ASSETS={resolve,enable,disable,scan,get enabled(){return enabled;}};
})(window);
