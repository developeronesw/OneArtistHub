import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {webcrypto} from 'node:crypto';
import {createMySQLAdapter} from './mysql-adapter.mjs';
import {LocalStorageAdapter} from './local-storage.mjs';
import {route} from '../functions/api/[[path]].js';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
if(!globalThis.btoa)globalThis.btoa=s=>Buffer.from(s,'binary').toString('base64');
if(!globalThis.atob)globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),dist=path.join(root,'dist');
function env(name,def=''){return process.env[name]??def}
const DB=await createMySQLAdapter({host:env('DB_HOST','127.0.0.1'),port:env('DB_PORT','3306'),user:env('DB_USER'),password:env('DB_PASSWORD'),database:env('DB_NAME','oneartist_hub')});
const schema=await readFile(path.join(root,'database/schema.mysql.sql'),'utf8');
for(const statement of schema.split(/;\s*(?:\r?\n|$)/).map(x=>x.trim()).filter(Boolean))await DB.pool.query(statement);
const LOCAL_STORAGE=new LocalStorageAdapter(env('MEDIA_ROOT',path.join(root,'storage')));
const appEnv={DB,LOCAL_STORAGE,ONEARTIST_SETUP_KEY:env('ONEARTIST_SETUP_KEY'),APP_ENCRYPTION_KEY:env('APP_ENCRYPTION_KEY'),MAX_UPLOAD_BYTES:Number(env('MAX_UPLOAD_BYTES',String(512*1024*1024)))};
if(!appEnv.ONEARTIST_SETUP_KEY||!appEnv.APP_ENCRYPTION_KEY)throw new Error('ONEARTIST_SETUP_KEY and APP_ENCRYPTION_KEY are required.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wav':'audio/wav','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{
  const origin=`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`,url=new URL(req.url||'/',origin);
  if(url.pathname.startsWith('/api/')){
    const chunks=[];for await(const c of req)chunks.push(c);const body=chunks.length?Buffer.concat(chunks):undefined;const headers=new Headers();for(const [k,v] of Object.entries(req.headers)){if(v!=null)headers.set(k,Array.isArray(v)?v.join(', '):v)}headers.set('cf-connecting-ip',String(req.socket.remoteAddress||'local'));
    const request=new Request(url,{method:req.method,headers,body:body&&req.method!=='GET'&&req.method!=='HEAD'?body:undefined});const wait=[];const response=await route(request,appEnv,url,{waitUntil:p=>wait.push(Promise.resolve(p))});res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));const ab=await response.arrayBuffer();res.end(Buffer.from(ab));Promise.allSettled(wait).catch(()=>{});return;
  }
  let rel=decodeURIComponent(url.pathname);if(rel==='/'||!path.extname(rel))rel='/index.html';let target=path.resolve(dist,'.'+rel);if(!target.startsWith(dist+path.sep)||!existsSync(target))target=path.join(dist,'index.html');const data=await readFile(target);res.setHeader('content-type',mime[path.extname(target).toLowerCase()]||'application/octet-stream');res.setHeader('cache-control',target.endsWith('index.html')?'no-cache':'public, max-age=3600');res.end(data);
}catch(e){console.error(e);res.statusCode=500;res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:false,error:'Server error'}));}});
server.listen(Number(env('PORT','8788')),env('HOST','127.0.0.1'),()=>console.log(`OneArtist Hub self-host API listening on ${env('HOST','127.0.0.1')}:${env('PORT','8788')}`));
