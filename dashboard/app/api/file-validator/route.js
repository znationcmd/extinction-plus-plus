import validator from '../../../lib/file-validator.cjs';
import { authorize, sameOrigin, failure } from '../../../lib/mod-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(req) {
  try {
    sameOrigin(req);
    // Bound the streamed request, including JSON escaping, before parsing it.
    const reader=req.body?.getReader();
    if(!reader)throw new Error('Fichier absent.');
    const chunks=[];let length=0;
    while(true) {
      const {done,value}=await reader.read();if(done)break;
      length+=value.length;
      if(length>validator.MAX_BYTES*2+4096){await reader.cancel();throw Object.assign(new Error('Fichier trop volumineux.'),{status:413});}
      chunks.push(Buffer.from(value));
    }
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    await authorize(body.guildId);
    return Response.json(validator.validateFile(body.filename,body.content),{headers:{'Cache-Control':'no-store'}});
  } catch(e) {return failure(e);}
}
