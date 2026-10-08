import webpush from "web-push";
let pool=null,keys=null;
export async function setupNotifications(db){
  pool=db;
  await pool.query("CREATE TABLE IF NOT EXISTS cmd_push_config(key TEXT PRIMARY KEY,value JSONB NOT NULL)");
  await pool.query("CREATE TABLE IF NOT EXISTS cmd_push_subscriptions(endpoint TEXT PRIMARY KEY,user_id TEXT NOT NULL,subscription JSONB NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE INDEX IF NOT EXISTS cmd_push_sub_user ON cmd_push_subscriptions(user_id)");
  await pool.query("CREATE TABLE IF NOT EXISTS cmd_notification_events(id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,href TEXT NOT NULL,room TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE INDEX IF NOT EXISTS cmd_notification_events_user ON cmd_notification_events(user_id,id DESC)");
  await pool.query("ALTER TABLE cmd_notification_events ADD COLUMN IF NOT EXISTS sender_user_id TEXT");
  const envPub=String(process.env.VAPID_PUBLIC_KEY||""),envPriv=String(process.env.VAPID_PRIVATE_KEY||"");
  if(envPub&&envPriv)keys={publicKey:envPub,privateKey:envPriv};
  else{
    await pool.query("INSERT INTO cmd_push_config(key,value) VALUES('vapid',$1::jsonb) ON CONFLICT(key) DO NOTHING",[JSON.stringify(webpush.generateVAPIDKeys())]);
    const found=await pool.query("SELECT value FROM cmd_push_config WHERE key='vapid'");
    keys=found.rows[0].value;
  }
  webpush.setVapidDetails("mailto:znation.cmd@gmail.com",keys.publicKey,keys.privateKey);
  console.log("[notifications] push ready");
}
export function pushPublicKey(){return keys?.publicKey||null}
export async function subscribePush(userId,sub){
  const endpoint=String(sub?.endpoint||""),keys=sub?.keys||{};
  if(!/^https:\/\//.test(endpoint)||endpoint.length>3000||!keys.p256dh||!keys.auth)throw new Error("Abonnement push invalide.");
  const clean={endpoint,keys:{p256dh:String(keys.p256dh),auth:String(keys.auth)}};
  await pool.query("INSERT INTO cmd_push_subscriptions(endpoint,user_id,subscription) VALUES($1,$2,$3::jsonb) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,subscription=EXCLUDED.subscription,updated_at=NOW()",[endpoint,String(userId),JSON.stringify(clean)]);
  return {ok:true};
}
export async function unsubscribePush(userId,sub){
  await pool.query("DELETE FROM cmd_push_subscriptions WHERE endpoint=$1 AND user_id=$2",[String(sub?.endpoint||""),String(userId)]);return {ok:true};
}
export async function pollNotifications(uid,after){
  const r=await pool.query("SELECT id::text,kind,title,body,href,room,sender_user_id FROM cmd_notification_events WHERE user_id=$1 AND id>$2 ORDER BY id ASC LIMIT 40",[String(uid),Math.max(0,Number(after)||0)]);
  return {events:r.rows.map(e=>({id:Number(e.id),kind:e.kind,title:e.title,body:e.body,href:e.href,room:e.room,senderId:e.sender_user_id||null,icon:e.sender_user_id?"/api/notifications/avatar/"+encodeURIComponent(e.sender_user_id):"/app-icon.webp?v=5"}))};
}
export function notifyUsers(users,{kind="message",title="CMD Sphere",body="",href="/messages",room=null,senderId=null}){
  if(!pool)return;
  const ids=[...new Set(users.map(String).filter(Boolean))],data={kind,title:String(title).slice(0,140),body:String(body).slice(0,200),href:String(href).startsWith("/")?String(href):"/messages",room:room?String(room):null,senderId:senderId?String(senderId):null};
  data.icon=data.senderId?"/api/notifications/avatar/"+encodeURIComponent(data.senderId):"/app-icon.webp?v=5";
  setImmediate(async()=>{
    for(const uid of ids)try{
      await pool.query("INSERT INTO cmd_notification_events(user_id,kind,title,body,href,room,sender_user_id) VALUES($1,$2,$3,$4,$5,$6,$7)",[uid,data.kind,data.title,data.body,data.href,data.room,data.senderId]);
      const r=await pool.query("SELECT endpoint,subscription FROM cmd_push_subscriptions WHERE user_id=$1",[uid]);
      await Promise.allSettled(r.rows.map(async row=>{
        try{await webpush.sendNotification(row.subscription,JSON.stringify(data),{TTL:kind==="call"?45:3600,urgency:"high"})}
        catch(e){if([404,410].includes(e.statusCode))await pool.query("DELETE FROM cmd_push_subscriptions WHERE endpoint=$1",[row.endpoint]);else console.warn("[notifications] push delivery:",e.message)}
      }));
    }catch(e){console.error("[notifications] error:",e.message)}
  });
}
