/* Shared SVG icons; keeps the existing buttons and their original event handlers. */
(()=>{'use strict';if(window.cmdDepthUI)return;window.cmdDepthUI=true;
const paths={
 photo:'<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 4 4 3-3 6 6"/>',
 camera:'<path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 5 8 0M8 9h.01M16 9h.01"/>',
 sticker:'<path d="M20 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8Zm-7 7v-5a2 2 0 0 1 2-2h5"/><path d="M7 8h.01M13 8h.01M7 11q3 3 6 0"/>',
 mic:'<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
 video:'<rect x="2" y="5" width="14" height="14" rx="3"/><path d="m16 10 6-4v12l-6-4"/>',
 gif:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M8 9H5v6h3v-3H7M11 9v6M15 15V9h4M15 12h3"/>',
 share:'<path d="M12 16V2m-5 5 5-5 5 5M5 12H3v10h18V12h-2"/>',
 link:'<path d="m10 14 4-4M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1"/>',
 roles:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/>',
 calendar:'<rect x="3" y="5" width="18" height="17" rx="3"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3M7 18h3"/>',
 heart:'<path d="M20 4a5 5 0 0 0-8 2 5 5 0 0 0-8-2c-6 6 8 17 8 17S26 10 20 4Z"/>',
 mention:'<circle cx="11" cy="12" r="4"/><path d="M15 8v7c0 4 6 1 6-4a9 9 0 1 0-5 9"/>',
 paint:'<path d="m14 3 7 7-9 9-7-7Zm-9 9-3 7 3 3 7-3M12 5l7 7"/>',
 frame:'<rect x="3" y="3" width="18" height="18" rx="4"/><rect x="7" y="7" width="10" height="10" rx="2"/>',
 poll:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 16v-4M12 16V7M17 16v-7"/>',
 thread:'<path d="M4 3h16v12H9l-5 5ZM8 7h8M8 11h5"/>',
 apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'};
const ids={toolPhotos:'photo',toolFiles:'photo',toolPoll:'poll',toolThread:'thread',toolApps:'apps',cmdToolPaint:'paint',cmdToolCamera:'camera',cmdToolEmoji:'smile',cmdToolSticker:'sticker',cmdToolVoice:'mic',cmdToolGif:'gif',cmdToolShare:'share',cmdToolInvite:'link',cmdToolRoles:'roles',cmdToolEvents:'calendar',cmdToolVoiceChannel:'mic',cmdToolDonations:'heart',cmdToolMention:'mention',cmdToolVideo:'video',cmdToolFrame:'frame',cmdDmToolFrame:'frame'};
function decorate(root=document){for(const [id,key] of Object.entries(ids)){const b=root.querySelector('#'+id);if(!b)continue;const icon=b.querySelector('b');if(!icon||icon.querySelector('svg'))continue;icon.innerHTML='<svg class="cmd-tool-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+paths[key]+'</svg>';b.setAttribute('aria-label',b.querySelector('span')?.textContent||b.textContent)}}
let pending=false;const observer=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorate()})});observer.observe(document.body,{childList:true,subtree:true});decorate();
})();
