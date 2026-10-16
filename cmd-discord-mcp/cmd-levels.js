import crypto from "node:crypto";
export async function levelTables(pool){
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_user_levels(user_id TEXT PRIMARY KEY,xp BIGINT NOT NULL DEFAULT 0,last_xp_at TIMESTAMPTZ)");
 await pool.query("CREATE TABLE IF NOT EXISTS cmd_level_chests(user_id TEXT NOT NULL,level INTEGER NOT NULL,reward INTEGER NOT NULL,opened_at TIMESTAMPTZ DEFAULT NOW(),PRIMARY KEY(user_id,level))");
}
export const levelOf=xp=>Math.floor(Math.sqrt(Math.max(0,Number(xp))/120))+1;
export async function awardMessageXp(pool,userId,content){
 const str=String(content||"").trim();
 if(str.length<5||new Set(str.toLowerCase()).size<4)return null;
 await levelTables(pool);const c=await pool.connect();
 try{await c.query("BEGIN");await c.query("INSERT INTO cmd_user_levels(user_id) VALUES($1) ON CONFLICT DO NOTHING",[userId]);const r=await c.query("SELECT xp,last_xp_at FROM cmd_user_levels WHERE user_id=$1 FOR UPDATE",[userId]);const old=Number(r.rows[0].xp),last=r.rows[0].last_xp_at?new Date(r.rows[0].last_xp_at).getTime():0;
 if(Date.now()-last<30000){await c.query("COMMIT");return {xp:old,level:levelOf(old),gained:0}}
 const gained=15+crypto.randomInt(11),xp=old+gained;await c.query("UPDATE cmd_user_levels SET xp=$2,last_xp_at=NOW() WHERE user_id=$1",[userId,xp]);await c.query("COMMIT");return {xp,level:levelOf(xp),gained,leveledUp:levelOf(xp)>levelOf(old)};
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
export async function levelStatus(pool,userId){
 await levelTables(pool);const r=await pool.query("SELECT xp FROM cmd_user_levels WHERE user_id=$1",[userId]);const xp=Number(r.rows[0]?.xp||0),level=levelOf(xp),chests=await pool.query("SELECT level FROM cmd_level_chests WHERE user_id=$1",[userId]),claimed=new Set(chests.rows.map(x=>Number(x.level)));
 return {xp,level,xpInLevel:xp-(level-1)**2*120,xpForNext:((level)**2-(level-1)**2)*120,pendingChests:Array.from({length:Math.min(level-1,100)},(_,i)=>i+2).filter(x=>!claimed.has(x))};
}
export async function openLevelChest(pool,userId,level){
 level=Number(level);if(!Number.isInteger(level)||level<2||level>10000)throw Error("Niveau invalide");
 await levelTables(pool);const reward=50+25*level,c=await pool.connect();
 try{await c.query("BEGIN");const r=await c.query("SELECT xp FROM cmd_user_levels WHERE user_id=$1 FOR UPDATE",[userId]);if(!r.rows.length||levelOf(r.rows[0].xp)<level)throw Error("Coffre verrouillé");
 const claim=await c.query("INSERT INTO cmd_level_chests(user_id,level,reward) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING level",[userId,level,reward]);if(!claim.rowCount)throw Error("Coffre déjà récupéré");
 await c.query("INSERT INTO cmd_diamond_wallets(user_id,balance) VALUES($1,0) ON CONFLICT DO NOTHING",[userId]);const wallet=await c.query("UPDATE cmd_diamond_wallets SET balance=balance+$2,updated_at=NOW() WHERE user_id=$1 RETURNING balance",[userId,reward]);
 await c.query("INSERT INTO cmd_diamond_ledger(id,user_id,amount,reason,ref_type,ref_id) VALUES($1,$2,$3,$4,$5,$6)",[crypto.randomUUID(),userId,reward,"Coffre niveau "+level,"level_chest",String(level)]);
 await c.query("COMMIT");return {level,reward,balance:Number(wallet.rows[0].balance)};
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
