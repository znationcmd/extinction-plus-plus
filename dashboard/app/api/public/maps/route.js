import appStore from '../../../../lib/app-store.cjs';
import {dbPath} from '../../../../lib/db';
import publicView from '../../../../lib/public-maps.cjs';
export async function GET() {
  try {
    return Response.json(publicView.publicMaps(await appStore.read(dbPath())), {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({error:'Cartes temporairement indisponibles.'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
