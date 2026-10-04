const dgram=require('node:dgram');
function crc32(data){let crc=0xffffffff;for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function packet(payload){const body=Buffer.concat([Buffer.from([255]),payload]);const head=Buffer.alloc(6);head.write('BE');head.writeUInt32LE(crc32(body),2);return Buffer.concat([head,body]);}
function decode(data){if(data.length<8||data.toString('ascii',0,2)!=='BE'||data[6]!==255||data.readUInt32LE(2)!==crc32(data.subarray(6)))return null;return data.subarray(7);}
function send({host,port,password},command,{timeout=10000}={}) {
  if(typeof command!=='string'||command.length>4096||command.includes('\0'))return Promise.reject(new Error('Commande RCON invalide.'));
  return new Promise((resolve,reject)=>{
    const socket=dgram.createSocket('udp4');let finished=false,logged=false,parts=new Map(),total=0;
    const timer=setTimeout(()=>finish(new Error('Délai RCON BattlEye dépassé. Vérifie le port UDP et le mot de passe.')),timeout);
    function finish(error,value){if(finished)return;finished=true;clearTimeout(timer);try{socket.close()}catch{}error?reject(error):resolve(value);}
    function transmit(payload){socket.send(packet(payload),error=>{if(error)finish(error)});}
    socket.on('error',finish);
    socket.on('message',data=>{
      const payload=decode(data);if(!payload)return;
      if(payload[0]===0&&!logged){if(payload[1]!==1)return finish(new Error('Mot de passe RCON BattlEye refusé.'));logged=true;transmit(Buffer.concat([Buffer.from([1,0]),Buffer.from(command)]));}
      else if(payload[0]===2&&payload.length>=2)transmit(payload.subarray(0,2));
      else if(payload[0]===1&&payload[1]===0&&logged){const body=payload.subarray(2);if(body[0]===0&&body.length>=3){if(!body[1]||body[2]>=body[1]||total&&total!==body[1])return finish(new Error('Réponse RCON fragmentée invalide.'));total=body[1];parts.set(body[2],body.subarray(3));if(parts.size===total)finish(null,Buffer.concat(Array.from({length:total},(_,i)=>parts.get(i))).toString());}else finish(null,body.toString());}
    });
    // A connected UDP socket accepts datagrams only from the requested endpoint.
    // Commands are never retried automatically: a lost acknowledgement could hide a successful write.
    socket.connect(port,host,()=>transmit(Buffer.concat([Buffer.from([0]),Buffer.from(password)])));
  });
}
module.exports={send,packet,decode,crc32};
