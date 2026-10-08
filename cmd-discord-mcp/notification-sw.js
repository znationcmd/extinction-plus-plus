
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("push",e=>{
 let data={};try{data=e.data?.json()||{}}catch{}
 const call=data.kind==="call";
 e.waitUntil(self.registration.showNotification(data.title||"CMD Sphere",{
   body:data.body||"",icon:"/app-icon.webp?v=5",badge:"/app-icon.webp?v=5",
   tag:call?"cmd-call-"+data.room:"cmd-message-"+Date.now(),renotify:call,
   requireInteraction:call,vibrate:call?[400,200,400,200,400]:[200,100,200],
   data:{href:data.href||"/messages",kind:data.kind},
   actions:call?[{action:"answer",title:"📞 Accepter"},{action:"decline",title:"✕ Refuser"}]:[{action:"open",title:"Ouvrir"}]
 }));
});
self.addEventListener("notificationclick",e=>{
 e.notification.close();if(e.action==="decline")return;
 const url=new URL(e.notification.data?.href||"/messages",self.location.origin).href;
 e.waitUntil((async()=>{
  const tabs=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  const tab=tabs.find(t=>t.url.startsWith(self.location.origin)&&typeof t.navigate==="function");
  if(tab){await tab.navigate(url);return tab.focus()}
  return self.clients.openWindow(url);
 })());
});
