/** Browser runtime is serialized by Bun, so strings and newlines stay correctly escaped. */
export function accountUiRuntime(){
 const menu=document.getElementById('neuriaMenu');
 if(!menu||document.getElementById('neuriaAccountButton'))return;
 let currentUser=null;
 const account=document.createElement('button');account.id='neuriaAccountButton';account.type='button';account.textContent='Mon compte';menu.append(account);
 const style=document.createElement('style');style.textContent=`#neuriaAuthEntry{position:fixed;inset:0;z-index:150;overflow:auto;background:radial-gradient(ellipse at 90% 12%,#443475,transparent 55%),#100c1a;color:#f4edff;display:grid;place-items:center;padding:24px;box-sizing:border-box;font:16px system-ui}#neuriaAuthEntry .authInner{width:min(100%,460px)}#neuriaAuthEntry h1{font-size:30px}#neuriaAuthEntry button,#neuriaAuthEntry input{box-sizing:border-box;width:100%;padding:14px;border-radius:12px;margin:7px 0;font:inherit}#neuriaAuthEntry button{border:1px solid #8160b7;background:#402661;color:white;cursor:pointer}#neuriaAuthEntry button:disabled{opacity:.5;cursor:not-allowed}#neuriaAuthEntry input{border:1px solid #9475ba;background:#f8f5ff;color:#171020}#neuriaAuthEntry label{display:block;margin-top:12px}#neuriaAuthEntry [role=status]{min-height:24px;color:#e8caff;white-space:pre-wrap}#neuriaAccountButton{width:100%;text-align:left;padding:12px;color:inherit;background:transparent;border:0;font:inherit}`;document.head.append(style);
 function update(user){currentUser=user;account.textContent=user?'Mon compte · '+user.email:'Mon compte';window.dispatchEvent(new CustomEvent('neuria-auth-change',{detail:{signedIn:!!user}}));}
 function show(){
  if(document.getElementById('neuriaAuthEntry'))return;
  const previous=document.activeElement,root=document.createElement('section');root.id='neuriaAuthEntry';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','neuriaAuthTitle');
  const box=document.createElement('div');box.className='authInner';root.append(box);
  const title=document.createElement('h1');title.id='neuriaAuthTitle';title.textContent=currentUser?'Mon compte':'Bienvenue sur CMD NEURIA';box.append(title);
  const notice=document.createElement('p');notice.setAttribute('role','status');notice.id='neuriaAuthNotice';
  function close(){root.remove();document.removeEventListener('keydown',keys);if(previous instanceof HTMLElement)previous.focus();}
  function keys(e){if(e.key==='Escape')close();if(e.key==='Tab'){const focus=[...root.querySelectorAll('button:not(:disabled),input')];const first=focus[0],last=focus[focus.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
  function button(label,id,fn){const b=document.createElement('button');b.type='button';b.id=id;b.textContent=label;b.onclick=fn;box.append(b);return b;}
  if(currentUser){
   const text=document.createElement('p');text.textContent=currentUser.email+(currentUser.provider==='github'?' — compte GitHub connecté':' — adresse non vérifiée');box.append(text);
   button('Se déconnecter','neuriaSignOut',async()=>{try{const responses=await Promise.all(['/api/neuria/auth/logout','/api/work/github/disconnect'].map(path=>fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})));if(responses.some(r=>!r.ok))throw Error('Déconnexion impossible');update(null);close();show()}catch(e){notice.textContent=e.message}});
   if(currentUser.provider==='email')button('Supprimer mon compte','neuriaDeleteAccount',()=>{
    if(root.querySelector('#neuriaDeleteForm'))return;
    const form=document.createElement('form');form.id='neuriaDeleteForm';const label=document.createElement('label');label.textContent='Confirme ton mot de passe pour supprimer définitivement ce compte et ses sessions.';const password=document.createElement('input');password.type='password';password.autocomplete='current-password';password.required=true;label.append(password);const submit=document.createElement('button');submit.type='submit';submit.textContent='Supprimer définitivement mon compte';form.append(label,submit);box.append(form);password.focus();
    form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const r=await fetch('/api/neuria/auth/account',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({password:password.value})});const data=await r.json();if(!r.ok)throw Error(data.error||'Suppression impossible');password.value='';update(null);close();show()}catch(e){notice.textContent=e.message}finally{submit.disabled=false}};
   });
  }else{
   const gh=button('Continuer avec GitHub','neuriaGithubSignIn',()=>{location.href='/api/oauth/github/start'});
   const google=button('Continuer avec Google','neuriaGoogleSignIn',()=>{});google.disabled=true;google.title='Connexion Google non configurée';
   const apple=button('Continuer avec Apple','neuriaAppleSignIn',()=>{});apple.disabled=true;apple.title='Connexion Apple non configurée';
   const email=button('Continuer avec l’e-mail','neuriaEmailSignIn',()=>{
    if(root.querySelector('#neuriaEmailForm'))return;
    const form=document.createElement('form');form.id='neuriaEmailForm';let signup=false;
    const heading=document.createElement('h2');heading.textContent='Se connecter par e-mail';
    const emailLabel=document.createElement('label');emailLabel.textContent='Adresse e-mail';const address=document.createElement('input');address.type='email';address.name='email';address.autocomplete='email';address.required=true;address.maxLength=254;emailLabel.append(address);
    const passLabel=document.createElement('label');passLabel.textContent='Mot de passe (12 caractères minimum)';const password=document.createElement('input');password.type='password';password.name='password';password.autocomplete='current-password';password.required=true;password.minLength=12;password.maxLength=128;passLabel.append(password);
    const warning=document.createElement('p');warning.textContent='L’adresse e-mail n’est pas encore vérifiée. La récupération du mot de passe par e-mail n’est pas disponible.';warning.style.fontSize='13px';
    const submit=document.createElement('button');submit.type='submit';submit.textContent='Se connecter';
    const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Créer un compte';toggle.onclick=()=>{signup=!signup;heading.textContent=signup?'Créer un compte':'Se connecter par e-mail';submit.textContent=signup?'Créer mon compte':'Se connecter';toggle.textContent=signup?'J’ai déjà un compte':'Créer un compte';password.autocomplete=signup?'new-password':'current-password';notice.textContent=''};
    form.append(heading,emailLabel,passLabel,warning,submit,toggle);email.after(form);address.focus();
    form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;toggle.disabled=true;notice.textContent=signup?'Création du compte…':'Connexion…';try{
     const response=await fetch('/api/neuria/auth/'+(signup?'signup':'login'),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:address.value,password:password.value})});
     const result=await response.json();if(!response.ok)throw Error(result.error||'Connexion impossible');password.value='';localStorage.removeItem('neuriaGuestContinue');update(result.user);close();
    }catch(e){notice.textContent=e.message}finally{submit.disabled=false;toggle.disabled=false}};
   });
   fetch('/api/neuria/auth/providers',{cache:'no-store'}).then(r=>r.json()).then(data=>{gh.disabled=!data.providers?.github?.enabled;email.disabled=!data.providers?.email?.enabled;if(email.disabled)notice.textContent='Le stockage des comptes e-mail est indisponible.'}).catch(()=>{notice.textContent='État des connexions indisponible.'});
  }
  button(currentUser?'Fermer':'Continuer sans compte','neuriaGuestSignIn',()=>{if(!currentUser)localStorage.setItem('neuriaGuestContinue','1');close()});box.append(notice);document.body.append(root);document.addEventListener('keydown',keys);root.querySelector('button')?.focus();
 }
 account.onclick=show;
 fetch('/api/neuria/auth/session',{cache:'no-store'}).then(r=>r.json()).then(async data=>{let user=data.user;if(!user){try{const gh=await (await fetch('/api/work/github/status',{cache:'no-store'})).json();if(gh.connected)user={provider:'github',email:'GitHub @'+gh.login}}catch{}}update(user);if(!user&&localStorage.getItem('neuriaGuestContinue')!=='1')show()}).catch(()=>{if(localStorage.getItem('neuriaGuestContinue')!=='1')show()});
}
