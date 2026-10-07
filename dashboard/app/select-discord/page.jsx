'use client';
import {useEffect,useState} from 'react';
import {useLanguage} from '../../components/LanguageProvider';

const copy={
 fr:{title:'Mes Discord',installed:'Bot installé',manage:'Ouvrir / gérer',invite:'Inviter EXTINCTION ++ RSS',none:'Aucun Discord accessible.',reconnect:'Reconnexion Discord',owner:'Propriétaire',manager:'Gérer le serveur'},
 en:{title:'My Discord servers',installed:'Bot installed',manage:'Open / manage',invite:'Invite EXTINCTION ++ RSS',none:'No accessible Discord server.',reconnect:'Reconnect Discord',owner:'Owner',manager:'Manage server'},
 us:{title:'My Discord servers',installed:'Bot installed',manage:'Open / manage',invite:'Invite EXTINCTION ++ RSS',none:'No accessible Discord server.',reconnect:'Reconnect Discord',owner:'Owner',manager:'Manage server'},
 de:{title:'Meine Discord-Server',installed:'Bot installiert',manage:'Öffnen / verwalten',invite:'EXTINCTION ++ RSS einladen',none:'Kein zugänglicher Discord-Server.',reconnect:'Discord neu verbinden',owner:'Eigentümer',manager:'Server verwalten'},
 es:{title:'Mis servidores Discord',installed:'Bot instalado',manage:'Abrir / gestionar',invite:'Invitar EXTINCTION ++ RSS',none:'No hay servidores Discord accesibles.',reconnect:'Reconectar Discord',owner:'Propietario',manager:'Gestionar servidor'},
 it:{title:'I miei server Discord',installed:'Bot installato',manage:'Apri / gestisci',invite:'Invita EXTINCTION ++ RSS',none:'Nessun server Discord accessibile.',reconnect:'Riconnetti Discord',owner:'Proprietario',manager:'Gestisci server'},
 ru:{title:'Мои серверы Discord',installed:'Бот установлен',manage:'Открыть / управлять',invite:'Пригласить EXTINCTION ++ RSS',none:'Нет доступных серверов Discord.',reconnect:'Переподключить Discord',owner:'Владелец',manager:'Управление сервером'},
 ko:{title:'내 Discord 서버',installed:'봇 설치됨',manage:'열기 / 관리',invite:'EXTINCTION ++ RSS 초대',none:'접근 가능한 Discord 서버가 없습니다.',reconnect:'Discord 다시 연결',owner:'소유자',manager:'서버 관리'},
 ja:{title:'自分のDiscordサーバー',installed:'Botインストール済み',manage:'開く / 管理',invite:'EXTINCTION ++ RSSを招待',none:'アクセス可能なDiscordサーバーがありません。',reconnect:'Discordを再接続',owner:'オーナー',manager:'サーバー管理'},
 zh:{title:'我的 Discord 服务器',installed:'机器人已安装',manage:'打开 / 管理',invite:'邀请 EXTINCTION ++ RSS',none:'没有可访问的 Discord 服务器。',reconnect:'重新连接 Discord',owner:'所有者',manager:'管理服务器'}
};

export default function Select(){
 const {language}=useLanguage();
 const tx=copy[language]||copy.fr;
 const [guilds,setGuilds]=useState([]),[error,setError]=useState('');
 useEffect(()=>{fetch('/api/workspace',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);setGuilds(b.guilds||[])}).catch(e=>setError(e.message))},[]);
 async function select(guildId){try{const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guildId})});const b=await r.json();if(r.ok)location.href='/';else setError(b.error)}catch(e){setError(e.message)}}
 return <main className="p-6 max-w-2xl mx-auto space-y-5">
  <h1 className="text-3xl font-black">{tx.title}</h1>
  {error&&<p role="alert">{error}</p>}
  <div className="space-y-3">
   {guilds.map(g=><section key={g.id} className="rounded-2xl border border-white/15 bg-white/5 p-4 flex items-center gap-4">
    {g.icon?<img src={g.icon} alt="" className="h-12 w-12 rounded-full"/>:<div className="h-12 w-12 rounded-full bg-white/10 grid place-items-center font-black">{String(g.name||'?').slice(0,2).toUpperCase()}</div>}
    <div className="min-w-0 flex-1"><strong className="block truncate">{g.name}</strong><small className="opacity-70">{g.installed?tx.installed:(g.owner?tx.owner:tx.manager)}</small></div>
    {g.installed?<button className="btn btn-primary" onClick={()=>select(g.id)}>{tx.manage}</button>:g.inviteUrl?<a className="btn btn-primary" href={g.inviteUrl} target="_blank" rel="noopener noreferrer">{tx.invite}</a>:null}
   </section>)}
  </div>
  {!guilds.length&&!error&&<p>{tx.none}</p>}
  <a href="/api/mod-auth/login" className="underline">{tx.reconnect}</a>
 </main>
}
