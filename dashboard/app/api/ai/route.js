import {guarded} from '../../../lib/dashboard-auth';
import guide from '../../../lib/help-assistant.cjs';
export const POST=guarded(async req=>{const {message}=await req.json();return Response.json(guide.answer(message));});
