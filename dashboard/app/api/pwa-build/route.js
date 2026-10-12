export const dynamic = 'force-dynamic';
export const revalidate = 0;
const version = String(process.env.RAILWAY_DEPLOYMENT_ID || process.env.RAILWAY_GIT_COMMIT_SHA || 'build-' + Date.now());
export async function GET(){return Response.json({version},{headers:{'Cache-Control':'no-store, max-age=0','Pragma':'no-cache'}})}
