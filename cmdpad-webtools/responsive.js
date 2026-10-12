/* CMDPad++ responsive toolbar controls: do not delete or disable existing tools. */
(function(){
'use strict';
const d=document,toolbar=d.querySelector('.toolbar'),menu=d.querySelector('.menubar');if(!toolbar)return;
const control=d.createElement('button');control.type='button';control.className='toolbtn';control.id='cmdpadToolbarExpand';control.title='Afficher ou replier tous les outils';control.setAttribute('aria-expanded','true');
let folded=window.innerWidth<1000;
function render(){toolbar.classList.toggle('cmd-toolbar-folded',folded);control.textContent=folded?'☷ Tous les outils ▾':'☷ Réduire ▴';control.setAttribute('aria-expanded',String(!folded))}
control.onclick=()=>{folded=!folded;render()};
toolbar.prepend(control);
const observer=new MutationObserver(()=>{if(toolbar.firstElementChild!==control)toolbar.prepend(control)});
observer.observe(toolbar,{childList:true});
render();
if(menu){
 menu.setAttribute('aria-label','Menu principal — défilement horizontal possible');
 menu.addEventListener('wheel',event=>{if(Math.abs(event.deltaX)>0){menu.scrollLeft+=event.deltaX;event.preventDefault()}},{passive:false});
}
window.CMDPAD_RESPONSIVE_READY=true;
})();