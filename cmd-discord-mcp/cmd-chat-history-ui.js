/* CMD Sphere — stored history search from the existing search dialog.
 * This component never edits, deletes or synchronizes message content.
 */
(()=>{'use strict';
 const localDialog=document.querySelector('.cmd-search-dialog');
 if(!localDialog||document.querySelector('#cmd-history-dialog'))return;
 const history=document.createElement('dialog');
 history.id='cmd-history-dialog';history.className='cmd-search-dialog';
 history.setAttribute('aria-label','Recherche dans tout l’historique');
 const style=document.createElement('style');
 style.textContent='#cmd-history-dialog .cmd-history-line{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}#cmd-history-dialog .cmd-history-field{display:grid;gap:4px;flex:1 1 140px;font:12px system-ui;color:#c6b8da}#cmd-history-dialog .cmd-history-field input{min-height:40px;min-width:0;border:1px solid #8a65a5;background:#1c1329;color:#fff;padding:9px;border-radius:8px}#cmd-history-dialog button{border:1px solid #8e71b0;background:#3a2754;color:#fff;padding:10px 12px;border-radius:8px;cursor:pointer;min-height:40px}#cmd-history-dialog button:disabled{opacity:.6;cursor:wait}#cmd-history-dialog .cmd-history-result{border-bottom:1px solid #715587;padding:12px 2px;white-space:pre-wrap;overflow-wrap:anywhere}#cmd-history-dialog .cmd-history-result small{display:block;color:#ac97bf;margin-bottom:4px}#cmd-history-open{display:block;margin:8px 0;width:100%}';
 document.head.append(style);
 const open=document.createElement('button');open.id='cmd-history-open';open.type='button';open.textContent='📚 Rechercher dans tout l’historique';
 localDialog.append(open);
 function field(label,type,placeholder=''){
  const wrap=document.createElement('label');wrap.className='cmd-history-field';wrap.textContent=label;
  const input=document.createElement('input');input.type=type;input.placeholder=placeholder;
  wrap.append(input);return [wrap,input];
 }
 const heading=document.createElement('div');heading.className='cmd-search-header';
 const title=document.createElement('strong');title.textContent='Historique complet';
 const close=document.createElement('button');close.type='button';close.textContent='Fermer';heading.append(title,close);
 const query=field('Mot ou expression','search','Deux caractères minimum');
 const author=field('Identifiant auteur (facultatif)','text','Identifiant du membre');
 const after=field('À partir du','date');const before=field('Avant le','date');
 const dates=document.createElement('div');dates.className='cmd-history-line';dates.append(after[0],before[0]);
 const controls=document.createElement('div');controls.className='cmd-history-line';
 const submit=document.createElement('button');submit.type='button';submit.textContent='Rechercher dans l’historique';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Effacer les filtres';
 controls.append(submit,cancel);
 const status=document.createElement('p');status.className='cmd-search-status';status.setAttribute('aria-live','polite');
 const results=document.createElement('div');results.className='cmd-search-results';
 history.append(heading,query[0],author[0],dates,controls,status,results);
 document.body.append(history);
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 function context(){
  try{
   if(document.querySelector('#channelMessages')){
    if(typeof CHAT==='undefined'||CHAT.mode!=='native'||!UUID.test(String(CHAT.guildId||''))||!String(CHAT.channelId||''))return null;
    return {scope:'server',guildId:String(CHAT.guildId),channelId:String(CHAT.channelId)};
   }
   if(document.querySelector('#msgs')){
    if(typeof active==='undefined'||!active)return null;
    const id=String(active);
    if(id.startsWith('group:'))return UUID.test(id.slice(6))?{scope:'group',groupId:id.slice(6)}:null;
    return UUID.test(id)?{scope:'dm',threadId:id}:null;
   }
   if(document.querySelector('#messages')){
    if(typeof GID==='undefined'||typeof active==='undefined'||!UUID.test(String(GID))||!String(active))return null;
    return {scope:'server',guildId:String(GID),channelId:String(active)};
   }
  }catch{}
  return null;
 }
 function closeDialog(){if(history.open&&history.close)history.close();else history.removeAttribute('open')}
 function showDialog(){if(history.showModal)history.showModal();else history.setAttribute('open','')}
 function makeResult(row){
  const box=document.createElement('div');box.className='cmd-history-result';
  const date=document.createElement('small');
  date.textContent=[row.channelName||'',row.authorId||'',row.createdAt?new Date(row.createdAt).toLocaleString('fr-FR'):''].filter(Boolean).join(' · ');
  const body=document.createElement('div');body.textContent=String(row.content||'');
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copier';
  copy.addEventListener('click',()=>{
   navigator.clipboard?.writeText(String(row.content||'')).then(()=>{copy.textContent='Copié'}).catch(()=>{copy.textContent='Copie impossible'});
  });
  box.append(date,body,copy);return box;
 }
 let controller=null;
 async function perform(){
  const selected=context();
  if(!selected){status.textContent='Ouvre d’abord un salon CMD Sphere ou une conversation privée.';return}
  const q=query[1].value.trim();if(q.length<2){status.textContent='Saisis au moins deux caractères.';query[1].focus();return}
  controller?.abort();controller=new AbortController();
  const params=new URLSearchParams({...selected,q,limit:'50'});
  if(author[1].value.trim())params.set('authorId',author[1].value.trim());
  if(after[1].value)params.set('after',after[1].value);
  if(before[1].value)params.set('before',before[1].value);
  submit.disabled=true;status.textContent='Recherche en cours…';results.replaceChildren();
  try{
   const resp=await fetch('/api/cmd/messages/history-search?'+params.toString(),{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   const payload=await resp.json();
   if(!resp.ok)throw Error(payload.error||'Recherche refusée');
   const list=Array.isArray(payload.results)?payload.results:[];
   list.forEach(item=>results.append(makeResult(item)));
   status.textContent=list.length+' résultat'+(list.length>1?'s':'')+' dans la conversation enregistrée'+(payload.morePossible?' (limite de 50 par recherche)':'')+'.';
  }catch(e){if(e.name!=='AbortError')status.textContent=e.message||'Recherche impossible.'}
  finally{submit.disabled=false}
 }
 open.addEventListener('click',()=>{
  const selected=context();if(!selected){open.textContent='Choisir une conversation CMD Sphere';return}
  const localQuery=document.querySelector('.cmd-search-input');
  query[1].value=localQuery?.value||'';
  if(localDialog.open&&localDialog.close)localDialog.close();
  showDialog();query[1].focus();status.textContent='Recherche autorisée uniquement dans la conversation sélectionnée.';
 });
 close.addEventListener('click',closeDialog);
 cancel.addEventListener('click',()=>{author[1].value='';after[1].value='';before[1].value=''});
 submit.addEventListener('click',perform);
 query[1].addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();perform()}});
 history.addEventListener('close',()=>controller?.abort());
 window.cmdSphereHistorySearch={open:()=>open.click(),version:'2026-10-16-server',scope:'stored-history'};
})();