import {guarded} from '../../../lib/dashboard-auth';
import native from '../../../lib/native-package.cjs';
export const GET=guarded(async()=>new Response(native.zip(),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="extinction-dayz-source.zip"','Cache-Control':'no-store'}}));
