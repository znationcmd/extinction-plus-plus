import { NextResponse } from 'next/server';
import { unseal, origin } from './lib/mod-auth';
export const config={runtime:'nodejs',matcher:['/((?!_next/static|_next/image|favicon|app-icons|.*\\.(?:png|jpg|jpeg|svg|ico|webp|js|webmanifest)$).*)']};
export function middleware(req) {
  const path=req.nextUrl.pathname;
  if(path==='/api/game-bridge'&&req.method==='POST')return NextResponse.next(); // The handler requires a server HMAC signature.
  const readOnly=req.method==='GET'||req.method==='HEAD';
  if(readOnly && (path==='/public'||path==='/help'||path==='/groups'||path==='/api/public/maps'||path==='/api/public/atlas'||path==='/dayz-data-license.txt'||path==='/ark-data-license.txt'||path==='/ark-spawn-license.txt'||path==='/dayz-image-license.txt'||path==='/conan-data-license.txt'||path==='/pal-data-license.txt'||path==='/ark-spawn-license.txt'||path==='/pal-data-license.txt'||/^\/explorer\/(ark|palworld|aniimo|dayz|conan)$/.test(path)||path.startsWith('/api/public/map-images/')))return NextResponse.next();
  if(['/login','/install','/offline.html','/shop'].includes(path) || path.startsWith('/api/mod-auth/'))return NextResponse.next();
  if(!unseal(req.cookies.get('extinction_mod_session')?.value)) {
    if(path==='/' && readOnly)return NextResponse.redirect(new URL('/public',req.url));
    if(path.startsWith('/api/'))return NextResponse.json({error:'Connecte-toi avec Discord.'},{status:401});
    return NextResponse.redirect(new URL('/login',req.url));
  }
  if(req.method!=='GET' && req.method!=='HEAD' && req.headers.get('origin')!==origin())return NextResponse.json({error:'Origine refusée.'},{status:403});
  return NextResponse.next();
}
