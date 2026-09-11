const SCHEMA = `PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS site_state (id INTEGER PRIMARY KEY CHECK(id=1), installed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
INSERT OR IGNORE INTO site_state(id,installed,created_at) VALUES(1,0,datetime('now'));
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, csrf TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS content_items (id TEXT PRIMARY KEY, type TEXT NOT NULL, slug TEXT, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', sort_date TEXT, featured INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_content_type_status_date ON content_items(type,status,sort_date DESC);
CREATE TABLE IF NOT EXISTS analytics (id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, object_type TEXT NOT NULL, object_id TEXT NOT NULL, visitor_hash TEXT NOT NULL, bucket TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, UNIQUE(event_type,object_type,object_id,visitor_hash,bucket));
CREATE INDEX IF NOT EXISTS idx_analytics_event_object ON analytics(event_type,object_type,object_id);
CREATE TABLE IF NOT EXISTS integrations (provider TEXT PRIMARY KEY, data_enc TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS checkout_sessions (paypal_order_id TEXT PRIMARY KEY, cart_json TEXT NOT NULL, currency TEXT NOT NULL, subtotal REAL NOT NULL, shipping REAL NOT NULL DEFAULT 0, total REAL NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_checkout_expires ON checkout_sessions(expires_at);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, paypal_order_id TEXT UNIQUE, customer_email TEXT NOT NULL, customer_name TEXT, currency TEXT NOT NULL DEFAULT 'USD', subtotal REAL NOT NULL, shipping REAL NOT NULL DEFAULT 0, total REAL NOT NULL, status TEXT NOT NULL, fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled', tracking_carrier TEXT, tracking_number TEXT, shipping_json TEXT NOT NULL DEFAULT '{}', data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, product_id TEXT NOT NULL, title TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price REAL NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS entitlements (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT NOT NULL, customer_email TEXT NOT NULL, downloads_used INTEGER NOT NULL DEFAULT 0, downloads_max INTEGER NOT NULL DEFAULT 5, created_at TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS download_tokens (token_hash TEXT PRIMARY KEY, entitlement_id TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, FOREIGN KEY(entitlement_id) REFERENCES entitlements(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_password_reset_admin ON password_reset_tokens(admin_id,created_at DESC);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, link TEXT, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE TABLE IF NOT EXISTS notification_preferences (id INTEGER PRIMARY KEY CHECK(id=1), new_order INTEGER NOT NULL DEFAULT 1, digital_sale INTEGER NOT NULL DEFAULT 1, physical_sale INTEGER NOT NULL DEFAULT 1, shipping_updates INTEGER NOT NULL DEFAULT 1, security_alerts INTEGER NOT NULL DEFAULT 1, low_inventory INTEGER NOT NULL DEFAULT 1, low_inventory_threshold INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO notification_preferences(id,updated_at) VALUES(1,datetime('now'));
CREATE TABLE IF NOT EXISTS email_log (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, template TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL, provider TEXT, provider_message_id TEXT, error TEXT, created_at TEXT NOT NULL, sent_at TEXT);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);
CREATE TABLE IF NOT EXISTS email_queue (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, template TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL, text_body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, provider TEXT, provider_message_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sent_at TEXT);
CREATE INDEX IF NOT EXISTS idx_email_queue_due ON email_queue(status,next_attempt_at);
CREATE TABLE IF NOT EXISTS customer_magic_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_customer_magic_email ON customer_magic_tokens(email,created_at DESC);
CREATE TABLE IF NOT EXISTS customer_sessions (id TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_email ON customer_sessions(email);
CREATE TABLE IF NOT EXISTS webhook_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, processed_at TEXT, error TEXT);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
CREATE TABLE IF NOT EXISTS order_transactions (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, provider TEXT NOT NULL, type TEXT NOT NULL, provider_id TEXT, status TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD', data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_order_transactions_order ON order_transactions(order_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_transactions_provider_id ON order_transactions(provider,type,provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS order_documents (order_id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, refunded_amount REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
INSERT OR IGNORE INTO order_documents(order_id,invoice_number,refunded_amount,created_at,updated_at) SELECT id,'OAH-'||replace(substr(created_at,1,10),'-','')||'-'||upper(substr(hex(randomblob(4)),1,8)),0,created_at,created_at FROM orders;
CREATE TABLE IF NOT EXISTS media_objects (id TEXT PRIMARY KEY, storage_provider TEXT NOT NULL, storage_key TEXT NOT NULL, filename TEXT NOT NULL, content_type TEXT, size_bytes INTEGER NOT NULL DEFAULT 0, visibility TEXT NOT NULL DEFAULT 'private', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_media_objects_visibility ON media_objects(visibility,created_at DESC);`;

const MIGRATION_012 = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_password_reset_admin ON password_reset_tokens(admin_id,created_at DESC);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, link TEXT, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE TABLE IF NOT EXISTS notification_preferences (id INTEGER PRIMARY KEY CHECK(id=1), new_order INTEGER NOT NULL DEFAULT 1, digital_sale INTEGER NOT NULL DEFAULT 1, physical_sale INTEGER NOT NULL DEFAULT 1, shipping_updates INTEGER NOT NULL DEFAULT 1, security_alerts INTEGER NOT NULL DEFAULT 1, low_inventory INTEGER NOT NULL DEFAULT 1, low_inventory_threshold INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO notification_preferences(id,updated_at) VALUES(1,datetime('now'));
CREATE TABLE IF NOT EXISTS email_log (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, template TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL, provider TEXT, provider_message_id TEXT, error TEXT, created_at TEXT NOT NULL, sent_at TEXT);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);
CREATE TABLE IF NOT EXISTS email_queue (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, template TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL, text_body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, provider TEXT, provider_message_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sent_at TEXT);
CREATE INDEX IF NOT EXISTS idx_email_queue_due ON email_queue(status,next_attempt_at);`;
let upgrade012Ready=false;
async function ensureUpgrade012(env){ if(upgrade012Ready)return; await env.DB.exec(MIGRATION_012); upgrade012Ready=true; }
const MIGRATION_013 = `
CREATE TABLE IF NOT EXISTS customer_magic_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_customer_magic_email ON customer_magic_tokens(email,created_at DESC);
CREATE TABLE IF NOT EXISTS customer_sessions (id TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_email ON customer_sessions(email);
CREATE TABLE IF NOT EXISTS webhook_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, processed_at TEXT, error TEXT);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);
CREATE TABLE IF NOT EXISTS order_transactions (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, provider TEXT NOT NULL, type TEXT NOT NULL, provider_id TEXT, status TEXT NOT NULL, amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD', data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_order_transactions_order ON order_transactions(order_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_transactions_provider_id ON order_transactions(provider,type,provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS order_documents (order_id TEXT PRIMARY KEY, invoice_number TEXT NOT NULL UNIQUE, refunded_amount REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE);
INSERT OR IGNORE INTO order_documents(order_id,invoice_number,refunded_amount,created_at,updated_at) SELECT id,'OAH-'||replace(substr(created_at,1,10),'-','')||'-'||upper(substr(hex(randomblob(4)),1,8)),0,created_at,created_at FROM orders;`;
let upgrade013Ready=false;
async function ensureUpgrade013(env){ if(upgrade013Ready)return; await env.DB.exec(MIGRATION_013); upgrade013Ready=true; }

const MIGRATION_020 = `
CREATE TABLE IF NOT EXISTS media_objects (id TEXT PRIMARY KEY, storage_provider TEXT NOT NULL, storage_key TEXT NOT NULL, filename TEXT NOT NULL, content_type TEXT, size_bytes INTEGER NOT NULL DEFAULT 0, visibility TEXT NOT NULL DEFAULT 'private', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_media_objects_visibility ON media_objects(visibility,created_at DESC);`;
let upgrade020Ready=false;
async function ensureUpgrade020(env){ if(upgrade020Ready)return; await env.DB.exec(MIGRATION_020); upgrade020Ready=true; }

const MIGRATION_022 = `
CREATE TABLE IF NOT EXISTS email_queue (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, template TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL, text_body TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, last_error TEXT, provider TEXT, provider_message_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sent_at TEXT);
CREATE INDEX IF NOT EXISTS idx_email_queue_due ON email_queue(status,next_attempt_at);`;
let upgrade022Ready=false;
async function ensureUpgrade022(env){ if(upgrade022Ready)return; await env.DB.exec(MIGRATION_022); upgrade022Ready=true; }
const MIGRATION_023 = `
CREATE TABLE IF NOT EXISTS receipt_tokens (token_hash TEXT PRIMARY KEY, order_id TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_receipt_tokens_order ON receipt_tokens(order_id,created_at DESC);
CREATE TABLE IF NOT EXISTS security_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, actor_id TEXT, target_id TEXT, source_ip_hash TEXT, user_agent_hash TEXT, success INTEGER NOT NULL DEFAULT 1, reason TEXT, request_id TEXT, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_target ON security_events(event_type,target_id,created_at DESC);
CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, login_key TEXT NOT NULL, source_ip_hash TEXT NOT NULL, success INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts(login_key,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(source_ip_hash,created_at DESC);`;
let upgrade023Ready=false;
async function ensureUpgrade023(env){ if(upgrade023Ready)return; await env.DB.exec(MIGRATION_023); upgrade023Ready=true; }


const ALLOWED_TYPES = new Set(['release','track','video','tour','product','page','media','news']);
const json = (data, status=200, extra={}) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const bytesToB64 = b => btoa(String.fromCharCode(...b));
const b64ToBytes = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const parseCookies = req => Object.fromEntries((req.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('='); return [decodeURIComponent(v.slice(0,i)), decodeURIComponent(v.slice(i+1))]}));
const secureCookieAttr = url => url?.protocol==='https:'?'; Secure':'';
const cleanText = (v,n=5000) => String(v??'').replace(/\0/g,'').slice(0,n);
const cleanSlug = v => cleanText(v,120).toLowerCase().trim().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'');
const youtubeIdFromUrl = value => { const v=String(value||'').trim(); const m=v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i)||v.match(/[?&]v=([A-Za-z0-9_-]{6,})/i); return m?m[1]:''; };
const sanitizeHtml = v => cleanText(v,50000)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,'')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'')
  .replace(/\s(?:style|srcdoc)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'')
  .replace(/(?:javascript|vbscript|data)\s*:/gi,'');
const safeUrl=v=>{const value=cleanText(v,2000).trim();if(!value)return '';if(value.startsWith('/')&&!value.startsWith('//'))return value;try{const u=new URL(value);return ['https:','http:','mailto:','tel:'].includes(u.protocol)?u.toString():''}catch{return ''}};
function sanitizeContentData(type,data){ const out={...(data||{})}; for(const key of ['cover','image','audio','thumbnail','heroImage','logo','profileImage','ticketUrl','youtubeUrl','instagram','facebook','tiktok','spotify','appleMusic'])if(key in out)out[key]=safeUrl(out[key]); if(type==='page')out.html=sanitizeHtml(out.html||''); return out; }

const safeFileName=v=>cleanText(v,180).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').replace(/^\.+|\.+$/g,'')||'file';
async function dropboxConfig(env){const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='dropbox'`).first();return r?decrypt(env,r.data_enc):null;}
async function s3Config(env){const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='s3'`).first();return r?decrypt(env,r.data_enc):null;}
const utf8=v=>new TextEncoder().encode(String(v));
async function hmac(key,data,raw=false){const k=await crypto.subtle.importKey('raw',key instanceof Uint8Array?key:utf8(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);const out=new Uint8Array(await crypto.subtle.sign('HMAC',k,utf8(data)));return raw?out:hex(out)}
const amzEncode=v=>encodeURIComponent(v).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
function s3Url(cfg,key=''){
  const endpoint=String(cfg.endpoint||'').replace(/\/+$/,''); if(!/^https:\/\//i.test(endpoint))throw new Error('S3 endpoint must use HTTPS.');
  const bucket=cleanText(cfg.bucket,128).trim(); if(!bucket)throw new Error('S3 bucket is missing.');
  const encoded=String(key).split('/').map(amzEncode).join('/');
  if(cfg.forcePathStyle!==false)return new URL(`${endpoint}/${amzEncode(bucket)}/${encoded}`);
  const u=new URL(endpoint);u.hostname=`${bucket}.${u.hostname}`;u.pathname='/'+encoded;return u;
}
async function s3Request(env,method,key,bytes=null,contentType='application/octet-stream'){
  const cfg=await s3Config(env);if(!cfg?.accessKeyId||!cfg?.secretAccessKey||!cfg?.bucket||!cfg?.endpoint)throw new Error('S3-compatible storage is not configured.');
  const url=s3Url(cfg,key), region=cleanText(cfg.region||'us-east-1',64)||'us-east-1', service='s3', d=new Date(), stamp=d.toISOString().replace(/[:-]|\.\d{3}/g,''), date=stamp.slice(0,8);
  const payload=bytes==null?new Uint8Array():bytes instanceof Uint8Array?bytes:new Uint8Array(bytes), payloadHash=hex(await crypto.subtle.digest('SHA-256',payload));
  const headers={'host':url.host,'x-amz-content-sha256':payloadHash,'x-amz-date':stamp}; if(method==='PUT')headers['content-type']=contentType;
  const names=Object.keys(headers).sort(), canonicalHeaders=names.map(k=>`${k}:${String(headers[k]).trim()}\n`).join(''), signedHeaders=names.join(';');
  const canonicalRequest=[method,url.pathname,url.searchParams.toString(),canonicalHeaders,signedHeaders,payloadHash].join('\n'), scope=`${date}/${region}/${service}/aws4_request`, requestHash=hex(await crypto.subtle.digest('SHA-256',utf8(canonicalRequest)));
  const kDate=await hmac(utf8('AWS4'+cfg.secretAccessKey),date,true), kRegion=await hmac(kDate,region,true), kService=await hmac(kRegion,service,true), kSigning=await hmac(kService,'aws4_request',true), signature=await hmac(kSigning,`AWS4-HMAC-SHA256\n${stamp}\n${scope}\n${requestHash}`);
  const auth=`AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const outHeaders={authorization:auth,'x-amz-content-sha256':payloadHash,'x-amz-date':stamp};if(method==='PUT')outHeaders['content-type']=contentType;
  return fetch(url,{method,headers:outHeaders,body:method==='PUT'?payload:undefined});
}
async function storageSettings(env){const s=await getSettings(env);return s.storage||{provider:env.MEDIA?'r2':env.LOCAL_STORAGE?'local':'dropbox'};}
async function putStoredObject(env,{bytes,filename,contentType='application/octet-stream',visibility='private',folder='media',provider=''}){
  const cfg=await storageSettings(env), chosen=provider||cfg.provider||(env.MEDIA?'r2':'dropbox'), objectId=id(), safe=safeFileName(filename), key=`oneartist/${cleanSlug(folder)||'media'}/${objectId}-${safe}`;
  if(chosen==='r2'){
    if(!env.MEDIA)throw new Error('R2 binding MEDIA is not configured. Add an R2 bucket binding named MEDIA or choose another storage provider.');
    await env.MEDIA.put(key,bytes,{httpMetadata:{contentType},customMetadata:{filename:safe,visibility}});
  }else if(chosen==='s3'){
    const r=await s3Request(env,'PUT',key,bytes,contentType);if(!r.ok)throw new Error(`S3 upload failed (${r.status}).`);
  }else if(chosen==='dropbox'){
    const db=await dropboxConfig(env);if(!db?.accessToken)throw new Error('Dropbox is not configured.');const path='/'+key;
    const r=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{authorization:`Bearer ${db.accessToken}`,'Dropbox-API-Arg':JSON.stringify({path,mode:'overwrite',autorename:false,mute:true}),'content-type':'application/octet-stream'},body:bytes});
    if(!r.ok){let msg='Dropbox upload failed.';try{const j=await r.json();msg=cleanText(j.error_summary||msg,500)}catch{}throw new Error(msg)}
  }else if(chosen==='local'){
    if(!env.LOCAL_STORAGE?.put)throw new Error('Local storage is available only in the self-hosted/VPS profile.');
    await env.LOCAL_STORAGE.put(key,bytes,{contentType,filename:safe,visibility});
  }else throw new Error('Unsupported storage provider.');
  await env.DB.prepare('INSERT INTO media_objects(id,storage_provider,storage_key,filename,content_type,size_bytes,visibility,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(objectId,chosen,key,safe,cleanText(contentType,160),bytes.byteLength||bytes.length||0,visibility==='public'?'public':'private',now()).run();
  return {id:objectId,provider:chosen,filename:safe,url:visibility==='public'?`/api/media/file/${objectId}`:'',size:bytes.byteLength||bytes.length||0};
}
async function getStoredObject(env,row){
  if(row.storage_provider==='r2'){if(!env.MEDIA)return null;const obj=await env.MEDIA.get(row.storage_key);if(!obj)return null;return {body:obj.body,contentType:obj.httpMetadata?.contentType||row.content_type||'application/octet-stream'};}
  if(row.storage_provider==='s3'){const r=await s3Request(env,'GET',row.storage_key);if(!r.ok)return null;return {body:r.body,contentType:row.content_type||r.headers.get('content-type')||'application/octet-stream'};}
  if(row.storage_provider==='dropbox'){const db=await dropboxConfig(env);if(!db?.accessToken)return null;const r=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:`Bearer ${db.accessToken}`,'Dropbox-API-Arg':JSON.stringify({path:'/'+row.storage_key})}});if(!r.ok)return null;return {body:r.body,contentType:row.content_type||r.headers.get('content-type')||'application/octet-stream'};}
  if(row.storage_provider==='local'){if(!env.LOCAL_STORAGE?.get)return null;const obj=await env.LOCAL_STORAGE.get(row.storage_key);if(!obj)return null;return {body:obj.body,contentType:obj.contentType||row.content_type||'application/octet-stream'};}
  return null;
}


function mediaTypeFor(contentType='',filename=''){
  const c=String(contentType||'').toLowerCase(),f=String(filename||'').toLowerCase();
  if(c.startsWith('image/')||/\.(jpe?g|png|webp|gif)$/i.test(f))return 'image';
  if(c.startsWith('audio/')||/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f))return 'audio';
  if(c.startsWith('video/')||/\.(mp4|webm|mov|m4v)$/i.test(f))return 'video';
  return 'document';
}
function normalizeMediaContentType(contentType='',filename=''){
  const c=cleanText(contentType,160).toLowerCase().split(';')[0].trim();if(c&&c!=='application/octet-stream')return c;
  const f=String(filename||'').toLowerCase(),map={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.aac':'audio/aac','.ogg':'audio/ogg','.flac':'audio/flac','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.m4v':'video/x-m4v','.pdf':'application/pdf','.txt':'text/plain','.zip':'application/zip'};
  const ext=Object.keys(map).find(x=>f.endsWith(x));return ext?map[ext]:(c||'application/octet-stream');
}
function publicMediaAllowed(contentType='',filename=''){
  const c=String(contentType||'').toLowerCase(),f=String(filename||'').toLowerCase();
  return c.startsWith('image/jpeg')||c.startsWith('image/png')||c.startsWith('image/webp')||c.startsWith('image/gif')||
    c.startsWith('audio/')||c.startsWith('video/')||c==='application/pdf'||c==='text/plain'||
    /\.(jpe?g|png|webp|gif|mp3|wav|m4a|aac|ogg|flac|mp4|webm|mov|m4v|pdf|txt)$/i.test(f);
}
function mediaBytesMatch(contentType,bytes,filename=''){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes), c=String(contentType||'').toLowerCase(), f=String(filename||'').toLowerCase();
  if(c==='image/jpeg')return b[0]===0xff&&b[1]===0xd8&&b[2]===0xff;
  if(c==='image/png')return b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47;
  if(c==='image/gif')return String.fromCharCode(...b.slice(0,6))==='GIF89a'||String.fromCharCode(...b.slice(0,6))==='GIF87a';
  if(c==='application/zip'||f.endsWith('.zip'))return b[0]===0x50&&b[1]===0x4b;
  if(c==='audio/wav')return String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WAVE';
  if(c==='application/pdf')return String.fromCharCode(...b.slice(0,4))==='%PDF';
  return true;
}
function mediaFolder(storageKey=''){
  const parts=String(storageKey||'').split('/').filter(Boolean);
  return parts[0]==='oneartist'&&parts[1]?parts[1]:'media';
}
async function mediaMetaRows(env){
  const {results=[]}=await env.DB.prepare(`SELECT id,title,data,created_at,updated_at FROM content_items WHERE type='media' ORDER BY created_at DESC LIMIT 1000`).all();
  return results.map(contentRow);
}
async function upsertMediaMeta(env,row,{title='',alt=''}={}){
  const metas=await mediaMetaRows(env),existing=metas.find(x=>x.data?.mediaObjectId===row.id),display=cleanText(title||existing?.title||row.filename,250)||row.filename;
  const data={...(existing?.data||{}),mediaObjectId:row.id,url:row.visibility==='public'?`/api/media/file/${row.id}`:'',alt:cleanText(alt??existing?.data?.alt??'',1000),mediaType:mediaTypeFor(row.content_type,row.filename),folder:mediaFolder(row.storage_key),contentType:row.content_type||'',sizeBytes:Number(row.size_bytes||0),provider:row.storage_provider,visibility:row.visibility};
  if(existing){await env.DB.prepare('UPDATE content_items SET title=?,slug=?,data=?,updated_at=? WHERE id=?').bind(display,cleanSlug(display),JSON.stringify(data),now(),existing.id).run();return existing.id;}
  const cid=id();await env.DB.prepare(`INSERT INTO content_items(id,type,slug,title,status,sort_date,featured,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(cid,'media',cleanSlug(display),display,'published',null,0,JSON.stringify(data),now(),now()).run();return cid;
}
async function mediaLibraryItems(env,{kind='',visibility=''}={}){
  const {results=[]}=await env.DB.prepare('SELECT * FROM media_objects ORDER BY created_at DESC LIMIT 1000').all();
  const metas=await mediaMetaRows(env),metaMap=new Map();for(const m of metas)if(m.data?.mediaObjectId)metaMap.set(m.data.mediaObjectId,m);
  const [contentRefs,settingRefs]=await Promise.all([env.DB.prepare(`SELECT id,type,title,data FROM content_items WHERE type<>'media'`).all(),env.DB.prepare('SELECT key,value FROM settings').all()]);
  const refStrings=[...(contentRefs.results||[]).map(x=>`${x.id} ${x.type} ${x.title} ${x.data}`),...(settingRefs.results||[]).map(x=>`${x.key} ${x.value}`)];
  return results.map(row=>{
    const meta=metaMap.get(row.id),type=mediaTypeFor(row.content_type,row.filename),url=row.visibility==='public'?`/api/media/file/${row.id}`:'',needle=row.id;
    const usageCount=refStrings.reduce((n,t)=>n+(String(t).includes(needle)?1:0),0);
    return {id:row.id,filename:row.filename,title:meta?.title||row.filename.replace(/\.[^.]+$/,''),alt:meta?.data?.alt||'',contentType:row.content_type||'',sizeBytes:Number(row.size_bytes||0),visibility:row.visibility,provider:row.storage_provider,folder:mediaFolder(row.storage_key),mediaType:type,url,usageCount,createdAt:row.created_at};
  }).filter(x=>(!kind||x.mediaType===kind)&&(!visibility||x.visibility===visibility));
}
async function deleteStoredObject(env,row){
  if(row.storage_provider==='r2'){
    if(!env.MEDIA?.delete)throw new Error('R2 binding MEDIA is unavailable.');
    await env.MEDIA.delete(row.storage_key);return;
  }
  if(row.storage_provider==='s3'){const r=await s3Request(env,'DELETE',row.storage_key);if(!r.ok&&r.status!==404)throw new Error(`S3 delete failed (${r.status}).`);return;}
  if(row.storage_provider==='dropbox'){
    const db=await dropboxConfig(env);if(!db?.accessToken)throw new Error('Dropbox is not configured.');
    const r=await fetch('https://api.dropboxapi.com/2/files/delete_v2',{method:'POST',headers:{authorization:`Bearer ${db.accessToken}`,'content-type':'application/json'},body:JSON.stringify({path:'/'+row.storage_key})});
    if(!r.ok){let msg='Dropbox delete failed.',notFound=false;try{const j=await r.json();msg=cleanText(j.error_summary||msg,500);notFound=/not_found/i.test(JSON.stringify(j))}catch{}if(!notFound)throw new Error(msg)}
    return;
  }
  if(row.storage_provider==='local'){
    if(!env.LOCAL_STORAGE?.delete)throw new Error('Local storage delete support is unavailable.');
    await env.LOCAL_STORAGE.delete(row.storage_key);return;
  }
  throw new Error('Unsupported storage provider.');
}

async function body(req){ try{return await req.json()}catch{return {}} }
async function readLimitedBody(req,limit){ if(!req.body)return new Uint8Array(); const reader=req.body.getReader(),chunks=[],max=Number(limit)||0;let total=0;try{for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>max){await reader.cancel();const error=new Error('Request body is too large.');error.code='PAYLOAD_TOO_LARGE';throw error}chunks.push(part.value)}}finally{reader.releaseLock()}const out=new Uint8Array(total);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength}return out; }
async function sha(v){ return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(v)))) }
async function hashPassword(password,salt){
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const out = await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256);
  return hex(out);
}
async function encKey(env){ const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.APP_ENCRYPTION_KEY||'')); return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']); }
async function encrypt(env,obj){ const iv=crypto.getRandomValues(new Uint8Array(12)), key=await encKey(env); const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(obj))); return `${bytesToB64(iv)}.${bytesToB64(new Uint8Array(data))}`; }
async function decrypt(env,s){ const [a,b]=String(s||'').split('.'); const key=await encKey(env); const out=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(a)},key,b64ToBytes(b)); return JSON.parse(new TextDecoder().decode(out)); }
async function isInstalled(env){ try{ const r=await env.DB.prepare('SELECT installed FROM site_state WHERE id=1').first(); return !!r?.installed }catch{return false} }
async function auth(req,env){
  const sid=parseCookies(req).oah_session; if(!sid) return null;
  const row=await env.DB.prepare(`SELECT s.id,s.csrf,s.expires_at,a.id admin_id,a.username,a.email FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.id=?`).bind(sid).first();
  if(!row || new Date(row.expires_at)<=new Date()){ if(row) await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run(); return null; }
  return row;
}
function requireCsrf(req,user){ return user && req.headers.get('x-csrf-token')===user.csrf; }
const requestId=req=>cleanText(req.headers.get('x-request-id')||id(),120);
async function securityEvent(req,env,eventType,{actorId='',targetId='',success=true,reason='',request=''}={}){ try{await env.DB.prepare('INSERT INTO security_events(event_id,event_type,actor_id,target_id,source_ip_hash,user_agent_hash,success,reason,request_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),cleanText(eventType,100),cleanText(actorId,190)||null,cleanText(targetId,190)||null,await sha(req.headers.get('cf-connecting-ip')||'local'),await sha(req.headers.get('user-agent')||''),success?1:0,cleanText(reason,500)||null,cleanText(request||requestId(req),120),now()).run()}catch(err){console.error('Security event write failed',err)} }
async function loginThrottle(req,env,login){ const ip=await sha(req.headers.get('cf-connecting-ip')||'local'), key=await sha(String(login||'').toLowerCase()); const q=await env.DB.prepare(`SELECT COUNT(*) c FROM login_attempts WHERE (login_key=? OR source_ip_hash=?) AND success=0 AND created_at>=datetime('now','-15 minutes')`).bind(key,ip).first(); const failures=Number(q?.c||0); const delay=failures>=10?Math.min(8000,500*Math.pow(2,Math.min(4,failures-10))):failures>=3?Math.min(3000,250*Math.pow(2,failures-3)):0; return {ip,key,failures,delay,locked:failures>=15}; }
async function recordLoginAttempt(req,env,login,success){ const t=await loginThrottle(req,env,login); await env.DB.prepare('INSERT INTO login_attempts(login_key,source_ip_hash,success,created_at) VALUES(?,?,?,?)').bind(t.key,t.ip,success?1:0,now()).run(); return t; }
async function getSettings(env){ const {results=[]}=await env.DB.prepare('SELECT key,value FROM settings').all(); const out={}; for(const r of results){ try{out[r.key]=JSON.parse(r.value)}catch{out[r.key]=r.value} } return out; }
async function setSetting(env,key,value){ await env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(key,JSON.stringify(value),now()).run(); }
function contentRow(row){ if(!row)return row; let data={}; try{data=JSON.parse(row.data||'{}')}catch{} return {...row,featured:!!row.featured,data}; }
function publicContentRow(row){
  const item=contentRow(row); if(!item)return item;
  const data={...(item.data||{})};
  // Never expose private storage locators/package identifiers through the public catalog.
  // Checkout and download fulfillment resolve these fields server-side from D1/MySQL.
  for(const key of ['dropboxPath','mediaObjectId','packageObjectId','storageKey','storagePath','downloadFilename']) delete data[key];
  if(item.type==='product'&&data.variants) data.variants=normalizeVariants(data.variants).map(v=>({id:v.id,name:v.name,size:v.size,color:v.color,sku:v.sku,price:v.price,inventory:v.inventory}));
  return {...item,data};
}
async function visitorHash(req){ const ip=req.headers.get('cf-connecting-ip')||'local'; const ua=req.headers.get('user-agent')||''; return sha(`${ip}|${ua}`); }
function bucketFor(kind){ const d=new Date(); return kind==='site_view'?d.toISOString().slice(0,10):d.toISOString().slice(0,13); }
async function recordAnalytics(req,env,eventType,objectType,objectId){
  const vh=await visitorHash(req), bucket=bucketFor(eventType);
  await env.DB.prepare(`INSERT OR IGNORE INTO analytics(event_type,object_type,object_id,visitor_hash,bucket,value,created_at) VALUES(?,?,?,?,?,1,?)`).bind(eventType,objectType,objectId,vh,bucket,now()).run();
}

const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function emailConfig(env){ const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='email'`).first(); return r?decrypt(env,r.data_enc):null; }
async function notificationPrefs(env){ const r=await env.DB.prepare('SELECT * FROM notification_preferences WHERE id=1').first(); return r||{new_order:1,digital_sale:1,physical_sale:1,shipping_updates:1,security_alerts:1,low_inventory:1,low_inventory_threshold:5}; }
async function createNotification(env,type,title,message,link=''){ await env.DB.prepare('INSERT INTO notifications(id,type,title,message,link,is_read,created_at) VALUES(?,?,?,?,?,0,?)').bind(id(),cleanText(type,40),cleanText(title,180),cleanText(message,1200),cleanText(link,80)||null,now()).run(); }
async function deliverEmail(env,cfg,{to,subject,html,text=''}){
  const provider=cfg.service||'resend';let providerId='';
  if(provider==='resend'){
    if(!cfg.apiKey)throw new Error('Resend API key is missing.');const from=cfg.fromName?`${cleanText(cfg.fromName,120)} <${cleanText(cfg.fromEmail,220)}>`:cleanText(cfg.fromEmail,220);const payload={from,to:[cleanText(to,220)],subject:cleanText(subject,300),html:String(html||''),text:cleanText(text,10000)};if(cfg.replyTo)payload.reply_to=cleanText(cfg.replyTo,220);const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${cfg.apiKey}`,'content-type':'application/json'},body:JSON.stringify(payload)});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error(cleanText(j.message||j.error||`Resend returned ${r.status}`,500));providerId=cleanText(j.id||'',160);
  }else if(provider==='brevo'){
    if(!cfg.apiKey)throw new Error('Brevo API key is missing.');const payload={sender:{email:cleanText(cfg.fromEmail,220),name:cleanText(cfg.fromName||'',120)},to:[{email:cleanText(to,220)}],subject:cleanText(subject,300),htmlContent:String(html||''),textContent:cleanText(text,10000)};if(cfg.replyTo)payload.replyTo={email:cleanText(cfg.replyTo,220)};const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':cfg.apiKey,'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload)});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error(cleanText(j.message||`Brevo returned ${r.status}`,500));providerId=cleanText(j.messageId||'',160);
  }else if(provider==='cloudflare'){
    if(!cfg.accountId||!cfg.apiToken)throw new Error('Cloudflare Email account ID or API token is missing.');const payload={to:cleanText(to,220),from:cfg.fromName?{address:cleanText(cfg.fromEmail,220),name:cleanText(cfg.fromName,120)}:cleanText(cfg.fromEmail,220),subject:cleanText(subject,300),html:String(html||''),text:cleanText(text,10000)};if(cfg.replyTo)payload.replyTo=cleanText(cfg.replyTo,220);const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg.accountId)}/email/sending/send`,{method:'POST',headers:{authorization:`Bearer ${cfg.apiToken}`,'content-type':'application/json'},body:JSON.stringify(payload)});let j={};try{j=await r.json()}catch{}if(!r.ok||j.success===false)throw new Error(cleanText(j.errors?.[0]?.message||`Cloudflare Email returned ${r.status}`,500));providerId=cleanText(j.result?.message_id||j.result?.delivered?.[0]||j.result?.queued?.[0]||'',160);
  }else if(provider==='smtp'){
    if(!env.SMTP_SEND)throw new Error('SMTP is available only on the self-hosted/VPS runtime.');const r=await env.SMTP_SEND({config:cfg,to:cleanText(to,220),subject:cleanText(subject,300),html:String(html||''),text:cleanText(text,10000)});providerId=cleanText(r?.messageId||'',160);
  }else throw new Error('Unsupported email service.');
  return {provider,providerId};
}
async function attemptQueuedEmail(env,row,cfg=null){
  cfg=cfg||await emailConfig(env);if(!cfg?.fromEmail)throw new Error('Email provider is not configured.');
  try{const r=await deliverEmail(env,cfg,{to:row.recipient,subject:row.subject,html:row.html,text:row.text_body});const t=now();await env.DB.batch([env.DB.prepare(`UPDATE email_queue SET status='sent',provider=?,provider_message_id=?,last_error=NULL,updated_at=?,sent_at=? WHERE id=?`).bind(r.provider,r.providerId||null,t,t,row.id),env.DB.prepare('INSERT INTO email_log(id,recipient,template,subject,status,provider,provider_message_id,error,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),row.recipient,row.template,row.subject,'sent',r.provider,r.providerId||null,null,row.created_at,t)]);return {ok:true,id:r.providerId};}
  catch(err){const attempts=Number(row.attempts||0)+1,mins=Math.min(60,Math.pow(2,Math.min(attempts,5))),next=new Date(Date.now()+mins*60000).toISOString(),status=attempts>=5?'dead':'retry';await env.DB.batch([env.DB.prepare('UPDATE email_queue SET status=?,attempts=?,next_attempt_at=?,last_error=?,updated_at=? WHERE id=?').bind(status,attempts,next,cleanText(err?.message||err,800),now(),row.id),env.DB.prepare('INSERT INTO email_log(id,recipient,template,subject,status,provider,provider_message_id,error,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),row.recipient,row.template,row.subject,'failed',cfg?.service||'unknown',null,cleanText(err?.message||err,800),row.created_at,null)]);console.error('OneArtist email error',err);return {ok:false,error:String(err?.message||err),queued:status!=='dead'};}
}
async function processEmailQueue(env,limit=3){const q=await env.DB.prepare(`SELECT * FROM email_queue WHERE status IN ('pending','retry') AND next_attempt_at<=? ORDER BY created_at ASC LIMIT ${Math.max(1,Math.min(10,Number(limit)||3))}`).bind(now()).all();for(const row of q.results||[])await attemptQueuedEmail(env,row);return (q.results||[]).length;}
async function sendEmail(env,{to,subject,html,text='',template='generic'}){
  const cfg=await emailConfig(env); if(!cfg?.fromEmail) return {ok:false,skipped:true,error:'Email provider is not configured.'};
  const qid=id(),t=now();await env.DB.prepare('INSERT INTO email_queue(id,recipient,template,subject,html,text_body,status,attempts,next_attempt_at,last_error,provider,provider_message_id,created_at,updated_at,sent_at) VALUES(?,?,?,?,?,?,\'pending\',0,?,NULL,?,NULL,?,?,NULL)').bind(qid,cleanText(to,220),template,cleanText(subject,300),String(html||''),cleanText(text,10000),t,cfg.service||'resend',t,t).run();
  const row=await env.DB.prepare('SELECT * FROM email_queue WHERE id=?').bind(qid).first();return attemptQueuedEmail(env,row,cfg);
}
async function emailShell(env,title,content){ const settings=await getSettings(env), artist=htmlEscape(settings.artist?.name||settings.site?.title||'OneArtist Hub'), accent=htmlEscape(settings.site?.accent||'#b45cff'); return `<!doctype html><html><body style="margin:0;background:#070812;color:#eef1ff;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:30px 18px"><div style="padding:26px;border:1px solid #282b45;border-radius:18px;background:#0d0f1d"><div style="font-size:13px;letter-spacing:.14em;color:${accent};text-transform:uppercase">${artist}</div><h1 style="margin:8px 0 18px;font-size:28px">${htmlEscape(title)}</h1>${content}<div style="margin-top:26px;padding-top:18px;border-top:1px solid #282b45;color:#8f96b3;font-size:12px">Powered by OneArtist Hub</div></div></div></body></html>`; }
async function adminEmail(env){ const a=await env.DB.prepare('SELECT email FROM admins ORDER BY id LIMIT 1').first(); return a?.email||''; }
async function sendSecurityEmail(env,to,title,message){ if(!to)return; const prefs=await notificationPrefs(env); if(!prefs.security_alerts)return {ok:false,skipped:true}; const html=await emailShell(env,title,`<p style="line-height:1.7;color:#cdd1e4">${htmlEscape(message)}</p>`); return sendEmail(env,{to,subject:title,html,text:message,template:'security'}); }
async function sendOrderEmails(env,order,items,url,receiptToken=''){
  const prefs=await notificationPrefs(env), settings=await getSettings(env), currency=order.currency||'USD', hasPhysical=items.some(x=>x.kind==='physical'), hasDigital=items.some(x=>x.kind==='digital');
  const rows=items.map(x=>`<tr><td style="padding:9px 0;border-bottom:1px solid #24263c">${htmlEscape(x.title)} × ${x.qty}</td><td style="padding:9px 0;border-bottom:1px solid #24263c;text-align:right">${new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(x.price)*Number(x.qty))}</td></tr>`).join('');
  const receiptUrl=`${url.origin}/order/${encodeURIComponent(order.publicId)}?token=${encodeURIComponent(receiptToken)}`;
  const customerHtml=await emailShell(env,'Thanks for your purchase',`<p style="color:#cdd1e4">Order <strong>${htmlEscape(order.publicId)}</strong> is paid.</p><table style="width:100%;border-collapse:collapse;color:#eef1ff">${rows}</table><p style="font-size:20px"><strong>Total: ${new Intl.NumberFormat('en-US',{style:'currency',currency}).format(order.total)}</strong></p>${hasDigital?'<p style="color:#9cefc7">Your digital downloads are available from the receipt page.</p>':''}<p><a href="${receiptUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#8d66ff;color:white;text-decoration:none">View Receipt${hasDigital?' & Downloads':''}</a></p>`);
  await sendEmail(env,{to:order.email,subject:`Purchase receipt — ${settings.artist?.name||'OneArtist Hub'}`,html:customerHtml,text:`Your order ${order.publicId} is paid. Receipt: ${receiptUrl}`,template:'purchase_receipt'});
  const ae=await adminEmail(env); if(ae&&prefs.new_order&&((hasPhysical&&prefs.physical_sale)||(hasDigital&&prefs.digital_sale))){ const label=hasPhysical&&hasDigital?'Mixed order':hasPhysical?'Merch order':'Digital sale'; const adminHtml=await emailShell(env,'New sale',`<p style="color:#cdd1e4"><strong>${htmlEscape(label)}</strong> from ${htmlEscape(order.name||order.email)}.</p><table style="width:100%;border-collapse:collapse;color:#eef1ff">${rows}</table><p style="font-size:20px"><strong>Total: ${new Intl.NumberFormat('en-US',{style:'currency',currency}).format(order.total)}</strong></p>`); await sendEmail(env,{to:ae,subject:`New sale — ${new Intl.NumberFormat('en-US',{style:'currency',currency}).format(order.total)}`,html:adminHtml,text:`New order ${order.publicId} for ${order.total} ${currency}.`,template:'admin_new_order'}); }
}
async function paypalConfig(env){ const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='paypal'`).first(); return r?decrypt(env,r.data_enc):null; }
async function paypalAccess(cfg){ const base=cfg.environment==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com'; const token=btoa(`${cfg.clientId}:${cfg.clientSecret}`); const res=await fetch(`${base}/v1/oauth2/token`,{method:'POST',headers:{authorization:`Basic ${token}`,'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'}); if(!res.ok) throw new Error('PayPal authentication failed'); const j=await res.json(); return {base,token:j.access_token}; }

function paypalCaptureStatus(order){ return cleanText(order?.purchase_units?.[0]?.payments?.captures?.[0]?.status||'',40).toUpperCase(); }
async function paypalOrderDetails(pp,paypalOrderId){
  const r=await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,{headers:{authorization:`Bearer ${pp.token}`}});
  let j={}; try{j=await r.json()}catch{} return {ok:r.ok,order:j,status:r.status};
}
async function paypalCaptureOrRecover(pp,paypalOrderId,requestId){
  const r=await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json','paypal-request-id':cleanText(requestId,38)}});
  let j={}; try{j=await r.json()}catch{}
  if(r.ok) return {ok:true,order:j,recovered:false,status:r.status};
  // PayPal can return 4xx when another verified request captured the same order first. Re-read the canonical order before treating that as a failure.
  const details=await paypalOrderDetails(pp,paypalOrderId);
  if(details.ok&&details.order?.status==='COMPLETED'&&paypalCaptureStatus(details.order)==='COMPLETED') return {ok:true,order:details.order,recovered:true,status:details.status};
  return {ok:false,order:j,recovered:false,status:r.status,error:cleanText(j?.message||j?.details?.[0]?.description||`PayPal capture returned ${r.status}`,500)};
}
async function waitForFinalizedOrder(env,paypalOrderId,attempts=12){
  for(let i=0;i<attempts;i++){
    const o=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first();
    if(o){
      const [doc,count]=await Promise.all([env.DB.prepare('SELECT order_id FROM order_documents WHERE order_id=?').bind(o.id).first(),env.DB.prepare('SELECT COUNT(*) c FROM order_items WHERE order_id=?').bind(o.id).first()]);
      if(doc&&Number(count?.c||0)>0)return orderPayload(env,o);
    }
    if(i<attempts-1)await new Promise(resolve=>setTimeout(resolve,Math.min(220,30+(i*20))));
  }
  return null;
}
const currencyCode=v=>/^[A-Z]{3}$/.test(String(v||'').toUpperCase())?String(v).toUpperCase():'USD';
const money=v=>Math.round(Math.max(0,Number(v)||0)*100)/100;
async function resolveCart(env,cart){
  const items=[]; let subtotal=0, hasPhysical=false;
  for(const c of Array.isArray(cart)?cart:[]){
    const r=await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product' AND status='published'`).bind(cleanText(c.id,100)).first(); if(!r)continue;
    const p=contentRow(r), qty=Math.max(1,Math.min(20,Math.floor(Number(c.qty)||1))), kind=p.data.kind==='physical'?'physical':'digital', variants=normalizeVariants(p.data.variants); let selectedVariant=null, price=money(p.data.price), inv=p.data.inventory===''||p.data.inventory==null?null:Math.max(0,Math.floor(Number(p.data.inventory)||0));
    if(kind==='physical'&&variants.length){selectedVariant=variants.find(v=>v.id===cleanText(c.variantId,80));if(!selectedVariant)throw new Error(`Choose an option for ${p.title}.`);if(selectedVariant.price!=='')price=money(selectedVariant.price);inv=selectedVariant.inventory===''?null:Number(selectedVariant.inventory);}
    if(kind==='physical'&&inv!==null&&qty>inv) throw new Error(`${p.title}${selectedVariant?` (${selectedVariant.name||selectedVariant.size||selectedVariant.color})`:''} does not have enough inventory.`);
    items.push({id:p.id,title:p.title,qty,price,kind,variantId:selectedVariant?.id||'',selectedVariant,data:p.data}); subtotal=money(subtotal+price*qty); if(kind==='physical')hasPhysical=true;
  }
  return {items,subtotal,hasPhysical};
}
function seriesDays(rows,key='v'){ const map=new Map((rows||[]).map(r=>[r.day,Number(r[key]||0)])),out=[]; for(let i=29;i>=0;i--){const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);out.push({day:d,value:map.get(d)||0});} return out; }
function normalizeVariants(value){
  if(Array.isArray(value)) return value.map((v,i)=>({id:cleanText(v.id||`v${i+1}`,80),name:cleanText(v.name||'',120),size:cleanText(v.size||'',80),color:cleanText(v.color||'',80),sku:cleanText(v.sku||'',100),inventory:v.inventory===''||v.inventory==null?'':Math.max(0,Math.floor(Number(v.inventory)||0)),price:v.price===''||v.price==null?'':money(v.price)})).filter(v=>v.name||v.size||v.color||v.sku);
  if(typeof value==='string'&&value.trim()) return value.split(/\r?\n/).map((line,i)=>{const [name='',sku='',inventory='',price='']=line.split('|').map(x=>x.trim()); return {id:`v${i+1}`,name,size:name,color:'',sku,inventory:inventory===''?'':Math.max(0,Math.floor(Number(inventory)||0)),price:price===''?'':money(price)}}).filter(v=>v.name);
  return [];
}
function invoiceNumber(){ const d=new Date().toISOString().slice(0,10).replace(/-/g,''); const suffix=hex(crypto.getRandomValues(new Uint8Array(4))).toUpperCase(); return `OAH-${d}-${suffix}`; }
async function customerAuth(req,env){ const sid=parseCookies(req).oah_customer_session; if(!sid)return null; const row=await env.DB.prepare('SELECT * FROM customer_sessions WHERE id=?').bind(sid).first(); if(!row||new Date(row.expires_at)<=new Date()){ if(row)await env.DB.prepare('DELETE FROM customer_sessions WHERE id=?').bind(sid).run(); return null; } return row; }
async function orderDocument(env,orderId){ let d=await env.DB.prepare('SELECT * FROM order_documents WHERE order_id=?').bind(orderId).first(); if(d)return d; const t=now(); for(let i=0;i<4&&!d;i++){try{const n=invoiceNumber();await env.DB.prepare('INSERT INTO order_documents(order_id,invoice_number,refunded_amount,created_at,updated_at) VALUES(?,?,0,?,?)').bind(orderId,n,t,t).run();d=await env.DB.prepare('SELECT * FROM order_documents WHERE order_id=?').bind(orderId).first()}catch{}} return d; }
async function transactionByProvider(env,type,providerId){ if(!providerId)return null; return env.DB.prepare('SELECT * FROM order_transactions WHERE provider=? AND type=? AND provider_id=? LIMIT 1').bind('paypal',type,cleanText(providerId,160)).first(); }
async function transactionExists(env,type,providerId){ return !!(await transactionByProvider(env,type,providerId)); }
async function recordTransaction(env,{orderId,type,providerId='',status='completed',amount=0,currency='USD',data={}}){ const pid=cleanText(providerId,160)||null; if(pid&&await transactionExists(env,type,pid))return false; await env.DB.prepare('INSERT OR IGNORE INTO order_transactions(id,order_id,provider,type,provider_id,status,amount,currency,data,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),orderId,'paypal',type,pid,cleanText(status,60),money(amount),currencyCode(currency),JSON.stringify(data||{}),now()).run(); return true; }
function parseJson(v,fallback={}){try{return JSON.parse(v||'')}catch{return fallback}}
async function orderPayload(env,o){
  if(!o)return null;
  const {results:items=[]}=await env.DB.prepare('SELECT product_id,title,quantity,unit_price,kind,data FROM order_items WHERE order_id=? ORDER BY id').bind(o.id).all();
  const {results:ents=[]}=await env.DB.prepare('SELECT id,product_id,downloads_used,downloads_max,created_at FROM entitlements WHERE order_id=?').bind(o.id).all();
  const {results:transactions=[]}=await env.DB.prepare('SELECT provider,type,provider_id,status,amount,currency,created_at FROM order_transactions WHERE order_id=? ORDER BY created_at ASC').bind(o.id).all();
  const doc=await orderDocument(env,o.id), settings=await getSettings(env);
  return {...o,shipping:parseJson(o.shipping_json,{}),data:parseJson(o.data,{}),invoice_number:doc?.invoice_number||'',refunded_amount:Number(doc?.refunded_amount||0),items:items.map(x=>({...x,data:parseJson(x.data,{})})),entitlements:ents,transactions,branding:{artistName:settings.artist?.name||settings.site?.title||'Artist',logo:settings.artist?.logo||'/art/oneartist-logo.svg',accent:settings.site?.accent||'#b45cff',supportEmail:settings.site?.email||''}};
}
async function createReceiptToken(env,orderId){ const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(36))).replace(/[+/=]/g,''), hash=await sha(raw), expires=new Date(Date.now()+30*864e5).toISOString(); await env.DB.prepare('INSERT INTO receipt_tokens(token_hash,order_id,expires_at,revoked_at,created_at) VALUES(?,?,?,NULL,?)').bind(hash,orderId,expires,now()).run(); return {raw,expires}; }
async function receiptAccess(env,raw){ if(!raw)return null; const hash=await sha(raw); return env.DB.prepare(`SELECT rt.order_id,rt.expires_at,o.public_id FROM receipt_tokens rt JOIN orders o ON o.id=rt.order_id WHERE rt.token_hash=? AND rt.revoked_at IS NULL AND rt.expires_at>?`).bind(hash,now()).first(); }
async function publicReceiptPayload(env,o){ const full=await orderPayload(env,o); return {public_id:full.public_id,customer_name:full.customer_name,customer_email:'',currency:full.currency,subtotal:full.subtotal,shipping:full.shipping,total:full.total,status:full.status,fulfillment_status:full.fulfillment_status,tracking_carrier:full.tracking_carrier,tracking_number:full.tracking_number,created_at:full.created_at,invoice_number:full.invoice_number,refunded_amount:full.refunded_amount,items:full.items.map(x=>({product_id:x.product_id,title:x.title,quantity:x.quantity,unit_price:x.unit_price,kind:x.kind,data:{selectedVariant:x.data?.selectedVariant||null}})),entitlements:full.entitlements.map(x=>({id:x.id,product_id:x.product_id,downloads_used:x.downloads_used,downloads_max:x.downloads_max,created_at:x.created_at})),transactions:full.transactions.filter(x=>x.type==='capture').map(x=>({type:x.type,provider_id:x.provider_id,status:x.status,created_at:x.created_at})),branding:full.branding}; }
async function paypalWebhookVerify(req,rawEvent,cfg){
  if(!cfg?.webhookId)throw new Error('PayPal Webhook ID is not configured.');
  const pp=await paypalAccess(cfg), headers={auth_algo:req.headers.get('paypal-auth-algo')||'',cert_url:req.headers.get('paypal-cert-url')||'',transmission_id:req.headers.get('paypal-transmission-id')||'',transmission_sig:req.headers.get('paypal-transmission-sig')||'',transmission_time:req.headers.get('paypal-transmission-time')||'',webhook_id:cfg.webhookId};
  if([headers.auth_algo,headers.cert_url,headers.transmission_id,headers.transmission_sig,headers.transmission_time].some(v=>!v))throw new Error('PayPal webhook signature headers are incomplete.');
  try{const cert=new URL(headers.cert_url);if(cert.protocol!=='https:'||!/(^|\.)paypal\.com$/i.test(cert.hostname))throw new Error('PayPal certificate host is invalid.')}catch{throw new Error('PayPal certificate URL is invalid.')}
  // Preserve the webhook_event bytes exactly as received. PayPal warns that parsing and re-serializing the event can break verification.
  const prefix=JSON.stringify(headers); const verifyBody=prefix.slice(0,-1)+`,"webhook_event":${rawEvent}}`;
  const r=await fetch(`${pp.base}/v1/notifications/verify-webhook-signature`,{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json'},body:verifyBody});
  const j=await r.json(); return r.ok&&j.verification_status==='SUCCESS';
}
async function updateProductInventory(env,x,t){ if(x.kind!=='physical')return {remaining:null,label:x.title}; const latest=contentRow(await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(x.id).first()); if(!latest)return {remaining:null,label:x.title}; const variants=normalizeVariants(latest.data.variants); let remaining=null,label=latest.title;
  if(x.variantId&&variants.length){const idx=variants.findIndex(v=>v.id===x.variantId);if(idx>=0&&variants[idx].inventory!==''){variants[idx].inventory=Math.max(0,Number(variants[idx].inventory)-x.qty);remaining=variants[idx].inventory;label+=` — ${variants[idx].name||[variants[idx].size,variants[idx].color].filter(Boolean).join(' / ')}`;latest.data.variants=variants;}}
  else if(latest.data.inventory!==''&&latest.data.inventory!=null){latest.data.inventory=Math.max(0,(Math.floor(Number(latest.data.inventory)||0)-x.qty));remaining=latest.data.inventory;}
  await env.DB.prepare('UPDATE content_items SET data=?,updated_at=? WHERE id=?').bind(JSON.stringify(latest.data),t,x.id).run(); return {remaining,label};
}
async function finalizeCapturedOrder(env,url,paypalOrderId,j,items,checkout,ctx,b={}){
  const existing=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first();
  if(existing){const ready=await waitForFinalizedOrder(env,paypalOrderId);if(ready)return ready;throw new Error('Order finalization is already in progress. Please retry in a moment.');}
  const capture=j.purchase_units?.[0]?.payments?.captures?.[0], captureStatus=cleanText(capture?.status||'',40).toUpperCase();
  if(j?.status!=='COMPLETED'||captureStatus!=='COMPLETED')throw new Error('PayPal payment is not fully captured yet.');
  const paidValue=money(capture?.amount?.value), paidCurrency=currencyCode(capture?.amount?.currency_code); if(paidValue!==money(checkout.total)||paidCurrency!==checkout.currency)throw new Error('Captured payment did not match the verified checkout total.');
  const settings=await getSettings(env), orderId=id(), publicId=bytesToB64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g,''), payer=j.payer||{}, email=cleanText(payer.email_address||b.email||'',160).toLowerCase(), name=cleanText(`${payer.name?.given_name||''} ${payer.name?.surname||''}`.trim()||b.name||'',160), shippingInfo=j.purchase_units?.[0]?.shipping||{}, t=now(); if(!email)throw new Error('PayPal did not return a customer email address.');
  try{await env.DB.prepare(`INSERT INTO orders(id,public_id,paypal_order_id,customer_email,customer_name,currency,subtotal,shipping,total,status,fulfillment_status,shipping_json,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderId,publicId,paypalOrderId,email,name,checkout.currency,checkout.subtotal,checkout.shipping,checkout.total,'paid',items.some(x=>x.kind==='physical')?'unfulfilled':'not_required',JSON.stringify(shippingInfo),JSON.stringify(j),t,t).run();}
  catch(err){const raced=await waitForFinalizedOrder(env,paypalOrderId);if(raced)return raced;throw err;}
  await env.DB.prepare('INSERT INTO order_documents(order_id,invoice_number,refunded_amount,created_at,updated_at) VALUES(?,?,0,?,?)').bind(orderId,invoiceNumber(),t,t).run();
  if(capture?.id)await recordTransaction(env,{orderId,type:'capture',providerId:capture.id,status:capture.status||'COMPLETED',amount:paidValue,currency:paidCurrency,data:capture});
  const low=[];
  for(const x of items){ await env.DB.prepare(`INSERT INTO order_items(order_id,product_id,title,quantity,unit_price,kind,data) VALUES(?,?,?,?,?,?,?)`).bind(orderId,x.id,x.title,x.qty,x.price,x.kind,JSON.stringify({...x.data,selectedVariant:x.selectedVariant||null})).run(); if(x.kind==='digital')await env.DB.prepare(`INSERT INTO entitlements(id,order_id,product_id,customer_email,downloads_used,downloads_max,created_at) VALUES(?,?,?,?,0,?,?)`).bind(id(),orderId,x.id,email,Math.max(1,Math.min(50,Number(settings.commerce?.downloadsMax)||5)),t).run(); const inv=await updateProductInventory(env,x,t); if(inv.remaining!=null)low.push(inv); }
  await env.DB.prepare('DELETE FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).run();
  const saleLabel=items.some(x=>x.kind==='physical')?'New merchandise order':'New digital sale'; await createNotification(env,'sale',saleLabel,`${name||email} purchased ${items.map(x=>x.title).join(', ')} for ${checkout.total} ${checkout.currency}.`,'orders'); const receiptToken=await createReceiptToken(env,orderId), orderForEmail={publicId,total:Number(checkout.total),email,name,currency:checkout.currency}; const task=sendOrderEmails(env,orderForEmail,items,url,receiptToken.raw); ctx?.waitUntil?ctx.waitUntil(task):await task;
  const prefs=await notificationPrefs(env); if(prefs.low_inventory){for(const x of low.filter(x=>x.remaining<=Number(prefs.low_inventory_threshold||5))){const inventoryMessage=`${x.label} has ${x.remaining} item(s) remaining.`;await createNotification(env,'inventory','Low inventory',inventoryMessage,'product');const ae=await adminEmail(env);if(ae){const html=await emailShell(env,'Low inventory',`<p style=\"color:#cdd1e4\">${htmlEscape(inventoryMessage)}</p>`);const lowTask=sendEmail(env,{to:ae,subject:`Low inventory — ${x.label}`,html,text:inventoryMessage,template:'low_inventory'});ctx?.waitUntil?ctx.waitUntil(lowTask):await lowTask;}}}
  return orderPayload(env,await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first());
}

export async function route(req,env,url,ctx){
  if(!env.DB) return json({ok:false,error:'D1 binding DB is missing. Add a D1 binding named DB in Cloudflare.'},503);
  const p=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
  const method=req.method.toUpperCase();
  const installed=await isInstalled(env); if(installed){await ensureUpgrade012(env);await ensureUpgrade013(env);await ensureUpgrade020(env);await ensureUpgrade022(env);await ensureUpgrade023(env);if(ctx?.waitUntil)ctx.waitUntil(processEmailQueue(env,3));}
  if(p==='status' && method==='GET') return json({ok:true,installed,version:'0.3.0'});
  if(p==='setup' && method==='POST'){
    if(await isInstalled(env)) return json({ok:false,error:'OneArtist Hub is already installed.'},409);
    const b=await body(req); if(!env.ONEARTIST_SETUP_KEY || b.setupKey!==env.ONEARTIST_SETUP_KEY) return json({ok:false,error:'Invalid setup key.'},403);
    if(!env.APP_ENCRYPTION_KEY || String(env.APP_ENCRYPTION_KEY).length<24) return json({ok:false,error:'APP_ENCRYPTION_KEY is missing or too short.'},500);
    await env.DB.exec(SCHEMA);
    if(await isInstalled(env)) return json({ok:false,error:'Already installed.'},409);
    const username=cleanText(b.username,80).trim(), email=cleanText(b.email,160).trim().toLowerCase(), password=String(b.password||''), artistName=cleanText(b.artistName||'My Artist',160).trim();
    if(username.length<3 || !email.includes('@') || password.length<10) return json({ok:false,error:'Username, valid email and a 10+ character password are required.'},400);
    const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(18))), ph=await hashPassword(password,salt), t=now();
    await env.DB.prepare('INSERT INTO admins(username,email,password_hash,password_salt,created_at) VALUES(?,?,?,?,?)').bind(username,email,ph,salt,t).run();
    await setSetting(env,'artist',{name:artistName,genre:'Independent Artist',bio:'Welcome to my official home.',location:'',logo:'',profileImage:''});
    await setSetting(env,'site',{title:artistName,theme:'aurora',publicTheme:'midnight',heroTitle:'A WORLD BRIGHTER IN MUSIC',heroSubtitle:'New music. New stories. One home.',heroImage:'/art/hero-aurora.svg',accent:'#b45cff',email:email});
    await setSetting(env,'commerce',{enabled:true,currency:'USD',flatShipping:7.95,downloadsMax:5});
    await setSetting(env,'socials',{youtube:'',instagram:'',facebook:'',tiktok:'',spotify:'',appleMusic:''});
    if(b.loadDemo!==false){
      const demos=[
        ['rel-neon','release','neon-skies','Neon Skies','published','2026-08-30',1,{releaseType:'EP',cover:'/art/neon-skies.svg',description:'A neon-lit collection built for late nights.',price:8.99}],
        ['rel-midnight','release','midnight-bloom','Midnight Bloom','published','2026-07-12',0,{releaseType:'Single',cover:'/art/midnight-bloom.svg',description:'A midnight single with an electric pulse.',price:1.29}],
        ['track-neon','track','higher-ground','Higher Ground','published','2026-08-30',1,{releaseId:'rel-neon',audio:'/demo/higher-ground.wav',cover:'/art/neon-skies.svg',duration:24,trackNo:1,preview:true}],
        ['track-bloom','track','midnight-bloom','Midnight Bloom','published','2026-07-12',0,{releaseId:'rel-midnight',audio:'/demo/midnight-bloom.wav',cover:'/art/midnight-bloom.svg',duration:24,trackNo:1,preview:true}],
        ['video-demo','video','official-video','Official Video','published','2026-08-18',1,{youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',youtubeId:'dQw4w9WgXcQ',description:'Demo YouTube video. Replace it in Videos.'}],
        ['tour-ny','tour','new-york','New York, NY','published','2026-11-14',1,{venue:'Brooklyn Steel',ticketUrl:'#',status:'Tickets Available'}],
        ['tour-la','tour','los-angeles','Los Angeles, CA','published','2026-11-23',0,{venue:'The Wiltern',ticketUrl:'#',status:'Tickets Available'}],
        ['prod-hoodie','product','aurora-hoodie','Aurora Hoodie','published','2026-08-20',1,{price:49,kind:'physical',image:'/art/hoodie.svg',description:'Premium OneArtist demo merch.',inventory:50}],
        ['prod-digital','product','neon-skies-download','Neon Skies Digital Download','published','2026-08-30',1,{price:8.99,kind:'digital',image:'/art/neon-skies.svg',description:'Digital EP download.',dropboxPath:''}],
        ['page-about','page','about','About','published','2026-08-01',0,{html:'<h2>About the Artist</h2><p>Use Pages in OneArtist Hub to replace this demo biography with your story.</p>',showInNav:true}]
      ];
      for(const d of demos) await env.DB.prepare(`INSERT INTO content_items(id,type,slug,title,status,sort_date,featured,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(...d.slice(0,8).map((x,i)=>i===7?JSON.stringify(x):x),t,t).run();
    }
    await env.DB.prepare('UPDATE site_state SET installed=1 WHERE id=1').run();
    return json({ok:true});
  }
  if(!(await isInstalled(env))) return json({ok:false,error:'OneArtist Hub is not installed.',setupRequired:true},428);


  if(p==='auth/forgot-password' && method==='POST'){
    const b=await body(req), email=cleanText(b.email,160).trim().toLowerCase(), generic={ok:true,message:'If that administrator email exists and email delivery is configured, a reset link has been sent.'};
    if(!email.includes('@'))return json(generic);
    const a=await env.DB.prepare('SELECT id,email FROM admins WHERE email=?').bind(email).first(); if(!a)return json(generic);
    const recent=await env.DB.prepare(`SELECT COUNT(*) c FROM password_reset_tokens WHERE admin_id=? AND created_at>=datetime('now','-15 minutes')`).bind(a.id).first(); if(Number(recent?.c||0)>=3)return json(generic);
    const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(36))).replace(/[+/=]/g,''), th=await sha(raw), exp=new Date(Date.now()+30*60*1000).toISOString();
    await env.DB.prepare('INSERT INTO password_reset_tokens(token_hash,admin_id,expires_at,used_at,created_at) VALUES(?,?,?,?,?)').bind(th,a.id,exp,null,now()).run();
    const resetUrl=`${url.origin}/admin/reset-password?token=${encodeURIComponent(raw)}`, html=await emailShell(env,'Reset your administrator password',`<p style="color:#cdd1e4;line-height:1.7">A password reset was requested for your OneArtist Hub administrator account. This link expires in 30 minutes and works once.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#8d66ff;color:#fff;text-decoration:none">Reset Password</a></p><p style="color:#8f96b3;font-size:12px">If you did not request this, you can ignore this message.</p>`);
    const task=sendEmail(env,{to:a.email,subject:'Reset your OneArtist Hub password',html,text:`Reset your password: ${resetUrl}`,template:'password_reset'}); ctx?.waitUntil?ctx.waitUntil(task):await task;
    return json(generic);
  }
  if(p==='auth/reset-password' && method==='POST'){
    const b=await body(req), token=String(b.token||''), password=String(b.password||''); if(password.length<10)return json({ok:false,error:'Password must be at least 10 characters.'},400);
    const th=await sha(token), row=await env.DB.prepare(`SELECT prt.*,a.email FROM password_reset_tokens prt JOIN admins a ON a.id=prt.admin_id WHERE prt.token_hash=?`).bind(th).first();
    if(!row||row.used_at||new Date(row.expires_at)<=new Date())return json({ok:false,error:'This reset link is invalid or has expired.'},410);
    const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(18))), ph=await hashPassword(password,salt), t=now();
    await env.DB.batch([env.DB.prepare('UPDATE admins SET password_hash=?,password_salt=? WHERE id=?').bind(ph,salt,row.admin_id),env.DB.prepare('UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?').bind(t,th),env.DB.prepare('DELETE FROM sessions WHERE admin_id=?').bind(row.admin_id)]); await securityEvent(req,env,'password_reset',{actorId:String(row.admin_id),targetId:String(row.admin_id)});
    await createNotification(env,'security','Password reset','The administrator password was reset using email recovery.','security');
    const task=sendSecurityEmail(env,row.email,'OneArtist Hub password changed','Your administrator password was reset. If this was not you, review your account and email provider immediately.'); ctx?.waitUntil?ctx.waitUntil(task):await task;
    return json({ok:true});
  }

  if(p==='auth/emergency-reset' && method==='POST'){
    const b=await body(req), login=cleanText(b.login,160).trim(), throttle=await loginThrottle(req,env,`emergency:${login}`); if(throttle.locked)return json({ok:false,error:'Recovery temporarily unavailable. Try again later.'},429); if(throttle.delay)await new Promise(resolve=>setTimeout(resolve,throttle.delay));
    if(!env.ONEARTIST_SETUP_KEY||String(b.setupKey||'')!==env.ONEARTIST_SETUP_KEY){await recordLoginAttempt(req,env,`emergency:${login}`,false);await securityEvent(req,env,'emergency_reset_attempt',{targetId:login,success:false,reason:'invalid_recovery_key'});return json({ok:false,error:'Recovery request could not be completed.'},403);}
    const password=String(b.password||''); if(password.length<10)return json({ok:false,error:'New password must be at least 10 characters.'},400);
    const a=await env.DB.prepare('SELECT * FROM admins WHERE username=? OR email=?').bind(login,login.toLowerCase()).first(); if(!a){await recordLoginAttempt(req,env,`emergency:${login}`,false);return json({ok:false,error:'Recovery request could not be completed.'},403);}
    const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(18))), ph=await hashPassword(password,salt); await env.DB.batch([env.DB.prepare('UPDATE admins SET password_hash=?,password_salt=? WHERE id=?').bind(ph,salt,a.id),env.DB.prepare('DELETE FROM sessions WHERE admin_id=?').bind(a.id)]); await recordLoginAttempt(req,env,`emergency:${login}`,true); await securityEvent(req,env,'emergency_reset_success',{actorId:String(a.id),targetId:String(a.id)}); await createNotification(env,'security','Emergency password recovery','The administrator password was reset with the deployment recovery key.','security'); const task=sendSecurityEmail(env,a.email,'Emergency password recovery used','Your administrator password was reset using the deployment recovery key.');ctx?.waitUntil?ctx.waitUntil(task):await task; return json({ok:true});
  }
  if(p==='auth/login' && method==='POST'){
    const b=await body(req), login=cleanText(b.login,160).trim(), throttle=await loginThrottle(req,env,login); if(throttle.locked)return json({ok:false,error:'Invalid username/email or password.'},401); if(throttle.delay)await new Promise(resolve=>setTimeout(resolve,throttle.delay)); const a=await env.DB.prepare('SELECT * FROM admins WHERE username=? OR email=?').bind(login,login.toLowerCase()).first();
    if(!a || await hashPassword(String(b.password||''),a.password_salt)!==a.password_hash){await recordLoginAttempt(req,env,login,false);await securityEvent(req,env,'login_failure',{targetId:login,success:false,reason:'invalid_credentials'});return json({ok:false,error:'Invalid username/email or password.'},401);}
    await recordLoginAttempt(req,env,login,true);await securityEvent(req,env,'login_success',{actorId:String(a.id),targetId:String(a.id)});
    const sid=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), csrf=bytesToB64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g,''), exp=new Date(Date.now()+7*864e5).toISOString();
    await env.DB.prepare('INSERT INTO sessions(id,admin_id,csrf,expires_at,created_at) VALUES(?,?,?,?,?)').bind(sid,a.id,csrf,exp,now()).run(); await securityEvent(req,env,'session_creation',{actorId:String(a.id),targetId:String(a.id)});
    return json({ok:true,user:{username:a.username,email:a.email},csrf},200,{'set-cookie':`oah_session=${encodeURIComponent(sid)}; Path=/; HttpOnly${secureCookieAttr(url)}; SameSite=Lax; Max-Age=604800`});
  }
  if(p==='auth/me' && method==='GET'){ const u=await auth(req,env); return u?json({ok:true,user:{username:u.username,email:u.email},csrf:u.csrf}):json({ok:false},401); }
  if(p==='auth/logout' && method==='POST'){ const u=await auth(req,env); if(u){await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(u.id).run();await securityEvent(req,env,'session_revocation',{actorId:String(u.admin_id),targetId:String(u.admin_id),reason:'logout'});} return json({ok:true},200,{'set-cookie':`oah_session=; Path=/; HttpOnly${secureCookieAttr(url)}; SameSite=Lax; Max-Age=0`}); }

  if(p==='public/bootstrap' && method==='GET'){
    const settings=await getSettings(env); const {results=[]}=await env.DB.prepare(`SELECT * FROM content_items WHERE status='published' ORDER BY COALESCE(sort_date,created_at) DESC`).all();
    const content=results.map(publicContentRow); return json({ok:true,settings,content});
  }
  const publicMedia=p.match(/^media\/file\/([^/]+)$/);
  if(publicMedia&&method==='GET'){
    const row=await env.DB.prepare('SELECT * FROM media_objects WHERE id=?').bind(publicMedia[1]).first();
    if(!row||row.visibility!=='public')return new Response('Media not found.',{status:404});
    const obj=await getStoredObject(env,row);if(!obj)return new Response('Media storage unavailable.',{status:503});
    const contentType=normalizeMediaContentType(obj.contentType||row.content_type||'application/octet-stream',row.filename),kind=mediaTypeFor(contentType,row.filename),disposition=['image','audio','video'].includes(kind)?'inline':'attachment';
    return new Response(obj.body,{headers:{'content-type':contentType,'cache-control':'public, max-age=3600','content-disposition':`${disposition}; filename="${safeFileName(row.filename)}"`,'x-content-type-options':'nosniff','cross-origin-resource-policy':'same-site'}});
  }
  if(p==='analytics' && method==='POST'){
    const b=await body(req), event=String(b.event||''); if(!['site_view','play','video_view'].includes(event))return json({ok:false,error:'Invalid event'},400);
    await recordAnalytics(req,env,event,cleanText(b.objectType||'site',40),cleanText(b.objectId||'site',100)); return json({ok:true});
  }
  if(p==='paypal/config' && method==='GET'){ const cfg=await paypalConfig(env); const settings=await getSettings(env); return json({ok:true,configured:!!(cfg?.clientId&&cfg?.clientSecret),clientId:cfg?.clientId||'',environment:cfg?.environment||'sandbox',webhookConfigured:!!cfg?.webhookId,currency:settings.commerce?.currency||'USD'}); }
  if(p==='paypal/create-order' && method==='POST'){
    const cfg=await paypalConfig(env); if(!cfg?.clientId||!cfg?.clientSecret)return json({ok:false,error:'PayPal is not configured.'},503);
    const b=await body(req), cart=await resolveCart(env,b.cart); if(!cart.items.length)return json({ok:false,error:'Cart is empty.'},400);
    const settings=await getSettings(env), commerce=settings.commerce||{}, currency=currencyCode(commerce.currency), shipping=cart.hasPhysical?money(commerce.flatShipping):0, total=money(cart.subtotal+shipping), pp=await paypalAccess(cfg);
    const payload={intent:'CAPTURE',purchase_units:[{amount:{currency_code:currency,value:total.toFixed(2),breakdown:{item_total:{currency_code:currency,value:cart.subtotal.toFixed(2)},shipping:{currency_code:currency,value:shipping.toFixed(2)}}},items:cart.items.map(x=>({name:(x.selectedVariant?`${x.title} — ${x.selectedVariant.name||x.selectedVariant.size||x.selectedVariant.color}`:x.title).slice(0,127),quantity:String(x.qty),unit_amount:{currency_code:currency,value:x.price.toFixed(2)},sku:cleanText(x.selectedVariant?.sku||x.data.sku||'',127)||undefined}))}]};
    const r=await fetch(`${pp.base}/v2/checkout/orders`,{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json','paypal-request-id':id()},body:JSON.stringify(payload)}); const j=await r.json(); if(!r.ok||!j.id)return json({ok:false,error:'PayPal order creation failed.'},502);
    const snapshot=cart.items.map(x=>({id:x.id,title:x.title,qty:x.qty,price:x.price,kind:x.kind,variantId:x.variantId,selectedVariant:x.selectedVariant,data:x.data})), created=now(), exp=new Date(Date.now()+2*60*60*1000).toISOString(); await env.DB.prepare(`INSERT OR REPLACE INTO checkout_sessions(paypal_order_id,cart_json,currency,subtotal,shipping,total,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(j.id,JSON.stringify(snapshot),currency,cart.subtotal,shipping,total,exp,created).run(); return json({ok:true,paypalOrderId:j.id});
  }
  if(p==='paypal/capture' && method==='POST'){
    const cfg=await paypalConfig(env); if(!cfg)return json({ok:false,error:'PayPal is not configured.'},503); const b=await body(req), paypalOrderId=cleanText(b.paypalOrderId,80); if(!paypalOrderId)return json({ok:false,error:'Missing PayPal order.'},400);
    const existing=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(existing)return json({ok:true,order:{publicId:existing.public_id,total:existing.total,email:existing.customer_email}});
    const checkout=await env.DB.prepare('SELECT * FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(!checkout||new Date(checkout.expires_at)<=new Date())return json({ok:false,error:'Checkout session expired or invalid.'},409); const items=parseJson(checkout.cart_json,[]); if(!items.length)return json({ok:false,error:'Checkout snapshot is invalid.'},409);
    for(const x of items.filter(i=>i.kind==='physical')){const r=contentRow(await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product' AND status='published'`).bind(x.id).first()); if(!r)return json({ok:false,error:`${x.title} is no longer available.`},409);const variants=normalizeVariants(r.data.variants);let inv=r.data.inventory===''||r.data.inventory==null?null:Number(r.data.inventory);if(x.variantId&&variants.length){const v=variants.find(v=>v.id===x.variantId);if(!v)return json({ok:false,error:`The selected ${x.title} option is no longer available.`},409);inv=v.inventory===''?null:Number(v.inventory);}if(inv!==null&&x.qty>inv)return json({ok:false,error:`${x.title} no longer has enough inventory.`},409);}
    const pp=await paypalAccess(cfg), requestId=('OAHCAP-'+paypalOrderId).slice(0,38), cap=await paypalCaptureOrRecover(pp,paypalOrderId,requestId), j=cap.order;
    if(!cap.ok)return json({ok:false,error:cap.error||'Payment capture did not complete.'},502);
    const captureState=paypalCaptureStatus(j); if(captureState==='PENDING'||j.status==='PENDING')return json({ok:true,pending:true,message:'PayPal is processing this payment. Fulfillment will unlock automatically after a verified PAYMENT.CAPTURE.COMPLETED webhook.'},202);
    if(j.status!=='COMPLETED'||captureState!=='COMPLETED')return json({ok:false,error:'Payment capture did not complete.'},502);
    try{const o=await finalizeCapturedOrder(env,url,paypalOrderId,j,items,checkout,ctx,b);return json({ok:true,recovered:cap.recovered,order:{publicId:o.public_id,total:o.total,email:o.customer_email}})}catch(e){const raced=await waitForFinalizedOrder(env,paypalOrderId,8);if(raced)return json({ok:true,recovered:true,order:{publicId:raced.public_id,total:raced.total,email:raced.customer_email}});return json({ok:false,error:String(e.message||e)},409)}
  }
  if(p==='paypal/webhook' && method==='POST'){
    const cfg=await paypalConfig(env); if(!cfg?.clientId||!cfg?.clientSecret||!cfg?.webhookId)return json({ok:false,error:'PayPal webhook verification is not configured.'},503);
    const raw=await req.text(); let event={}; try{event=JSON.parse(raw)}catch{return json({ok:false,error:'Invalid webhook body.'},400)}
    let verified=false;try{verified=await paypalWebhookVerify(req,raw,cfg)}catch(err){await securityEvent(req,env,'paypal_verification_failure',{success:false,reason:err.message});return json({ok:false,error:'Webhook signature verification failed.'},400)} if(!verified){await securityEvent(req,env,'paypal_verification_failure',{success:false,reason:'verification_rejected'});return json({ok:false,error:'Webhook signature verification failed.'},400);} const eventId=cleanText(event.id,160), eventType=cleanText(event.event_type,120); if(!eventId)return json({ok:false,error:'Webhook event ID is missing.'},400);
    const seen=await env.DB.prepare('SELECT event_id,status FROM webhook_events WHERE event_id=?').bind(eventId).first(); if(seen?.status==='processed')return json({ok:true,duplicate:true}); if(!seen)await env.DB.prepare('INSERT INTO webhook_events(event_id,event_type,status,payload,created_at) VALUES(?,?,?,?,?)').bind(eventId,eventType,'processing',raw,now()).run(); else await env.DB.prepare('UPDATE webhook_events SET status=?,error=NULL WHERE event_id=?').bind('processing',eventId).run();
    try{
      const resource=event.resource||{}, paypalOrderId=resource.supplementary_data?.related_ids?.order_id||resource.id||'';
      if(eventType==='CHECKOUT.ORDER.APPROVED'){
        const existing=await env.DB.prepare('SELECT id FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(!existing){const checkout=await env.DB.prepare('SELECT * FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(checkout&&new Date(checkout.expires_at)>new Date()){const items=parseJson(checkout.cart_json,[]),pp=await paypalAccess(cfg),cap=await paypalCaptureOrRecover(pp,paypalOrderId,('OAWH-'+paypalOrderId).slice(0,38)),jj=cap.order;if(cap.ok&&jj.status==='COMPLETED'&&paypalCaptureStatus(jj)==='COMPLETED')await finalizeCapturedOrder(env,url,paypalOrderId,jj,items,checkout,ctx,{})}}
      } else if(eventType==='PAYMENT.CAPTURE.PENDING'){
        // Keep the verified checkout snapshot; do not fulfill until COMPLETED arrives.
      } else if(eventType==='PAYMENT.CAPTURE.COMPLETED'){
        let order=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first();
        if(order){const amount=money(resource.amount?.value),currency=currencyCode(resource.amount?.currency_code);if(amount!==money(order.total)||currency!==order.currency)throw new Error('Verified PayPal capture did not match the order total.');await env.DB.prepare("UPDATE orders SET status='paid',updated_at=? WHERE id=?").bind(now(),order.id).run();await recordTransaction(env,{orderId:order.id,type:'capture',providerId:resource.id,status:resource.status||'COMPLETED',amount,currency,data:resource});}
        else {const checkout=await env.DB.prepare('SELECT * FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).first();if(checkout&&new Date(checkout.expires_at)>new Date()){const items=parseJson(checkout.cart_json,[]),pp=await paypalAccess(cfg),or=await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,{headers:{authorization:`Bearer ${pp.token}`}}),oj=await or.json();if(or.ok&&oj.status==='COMPLETED')await finalizeCapturedOrder(env,url,paypalOrderId,oj,items,checkout,ctx,{})}}
      } else if(eventType==='PAYMENT.CAPTURE.REFUNDED'){
        const order=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first();
        if(order){
          const prior=await transactionByProvider(env,'refund',resource.id);
          if(!prior||String(prior.status||'').toUpperCase()!=='COMPLETED'){
            const doc=await orderDocument(env,order.id), amt=money(resource.amount?.value), refundCurrency=currencyCode(resource.amount?.currency_code); if(refundCurrency!==order.currency||amt<=0||money(Number(doc?.refunded_amount||0)+amt)>money(order.total))throw new Error('Verified PayPal refund did not match the order balance.'); const refunded=money(Number(doc?.refunded_amount||0)+amt), full=refunded>=money(order.total), ts=now();
            if(prior)await env.DB.prepare('UPDATE order_transactions SET status=?,amount=?,currency=?,data=? WHERE id=?').bind(resource.status||'COMPLETED',amt,resource.amount?.currency_code||order.currency,JSON.stringify(resource||{}),prior.id).run();
            else await recordTransaction(env,{orderId:order.id,type:'refund',providerId:resource.id,status:resource.status||'COMPLETED',amount:amt,currency:resource.amount?.currency_code||order.currency,data:resource});
            await env.DB.batch([env.DB.prepare('UPDATE order_documents SET refunded_amount=?,updated_at=? WHERE order_id=?').bind(refunded,ts,order.id),env.DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(full?'refunded':'partially_refunded',ts,order.id)]);
            if(full)await env.DB.prepare('UPDATE entitlements SET downloads_max=downloads_used WHERE order_id=?').bind(order.id).run();
            await createNotification(env,'sale','Order refunded',`${order.public_id} refunded ${amt} ${order.currency}.`,'orders');
          }
        }
      } else if(eventType==='PAYMENT.CAPTURE.DENIED'||eventType==='CHECKOUT.PAYMENT-APPROVAL.REVERSED'){
        const order=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(order){await env.DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(eventType.includes('REVERSED')?'reversed':'denied',now(),order.id).run();await env.DB.prepare('UPDATE entitlements SET downloads_max=downloads_used WHERE order_id=?').bind(order.id).run();await createNotification(env,'sale','Payment issue',`${order.public_id} changed to ${eventType}.`,'orders');}else await env.DB.prepare('DELETE FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).run();
      }
      await env.DB.prepare('UPDATE webhook_events SET status=?,processed_at=?,error=NULL WHERE event_id=?').bind('processed',now(),eventId).run(); return json({ok:true});
    }catch(err){await env.DB.prepare('UPDATE webhook_events SET status=?,error=? WHERE event_id=?').bind('failed',cleanText(err?.message||err,800),eventId).run();throw err}
  }
  const orderMatch=p.match(/^order\/([^/]+)$/); if(orderMatch&&method==='GET'){ const o=await env.DB.prepare('SELECT * FROM orders WHERE public_id=?').bind(orderMatch[1]).first(); if(!o)return json({ok:false},404); const tokenAccess=await receiptAccess(env,url.searchParams.get('token')||''), customer=await customerAuth(req,env), admin=await auth(req,env); if(!tokenAccess||tokenAccess.order_id!==o.id){if(!admin&&(!customer||customer.email.toLowerCase()!==String(o.customer_email||'').toLowerCase()))return json({ok:false,error:'Receipt access is invalid or expired.'},403)} return json({ok:true,order:await publicReceiptPayload(env,o)}); }
  if(p==='downloads/request'&&method==='POST'){
    const b=await body(req), tokenAccess=await receiptAccess(env,String(b.receiptToken||'')), customer=await customerAuth(req,env), o=await env.DB.prepare(`SELECT id,customer_email,status FROM orders WHERE public_id=? AND status IN ('paid','partially_refunded')`).bind(cleanText(b.publicId,100)).first(); if(!o)return json({ok:false,error:'Purchase could not be verified.'},403); const tokenOwner=tokenAccess?.order_id===o.id, sessionOwner=customer&&customer.email.toLowerCase()===o.customer_email.toLowerCase(); if(!tokenOwner&&!sessionOwner)return json({ok:false,error:'Purchase could not be verified.'},403); const ent=await env.DB.prepare('SELECT * FROM entitlements WHERE order_id=? AND product_id=?').bind(o.id,cleanText(b.productId,100)).first(); if(!ent)return json({ok:false,error:'No download entitlement found.'},404); if(ent.downloads_used>=ent.downloads_max)return json({ok:false,error:'Download limit reached.'},429); const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), th=await sha(raw), exp=new Date(Date.now()+15*60*1000).toISOString(); await env.DB.prepare('INSERT INTO download_tokens(token_hash,entitlement_id,expires_at) VALUES(?,?,?)').bind(th,ent.id,exp).run(); await securityEvent(req,env,'download_authorized',{targetId:ent.id,reason:tokenOwner?'receipt_token':'customer_session'}); return json({ok:true,url:`/api/downloads/file?token=${encodeURIComponent(raw)}`,expiresAt:exp});
  }
  if(p==='downloads/file'&&method==='GET'){
    const raw=url.searchParams.get('token')||'', th=await sha(raw), tok=await env.DB.prepare(`SELECT dt.*,e.product_id,e.downloads_used,e.downloads_max FROM download_tokens dt JOIN entitlements e ON e.id=dt.entitlement_id WHERE dt.token_hash=?`).bind(th).first(); if(!tok||tok.used_at||new Date(tok.expires_at)<=new Date())return new Response('Download link expired or invalid.',{status:410}); const pr=contentRow(await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product'`).bind(tok.product_id).first()); if(!pr)return new Response('Product not found.',{status:404});
    let stored=null,downloadName=cleanText(pr.data.downloadFilename||'',180)||`${pr.slug||'download'}.zip`;
    if(pr.data.mediaObjectId){const row=await env.DB.prepare('SELECT * FROM media_objects WHERE id=?').bind(cleanText(pr.data.mediaObjectId,100)).first();if(row){stored=await getStoredObject(env,row);downloadName=cleanText(pr.data.downloadFilename||row.filename,180)||downloadName;}}
    if(!stored&&pr.data.dropboxPath){const cfg=await dropboxConfig(env);if(cfg?.accessToken){const dr=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:`Bearer ${cfg.accessToken}`,'Dropbox-API-Arg':JSON.stringify({path:pr.data.dropboxPath})}});if(dr.ok)stored={body:dr.body,contentType:dr.headers.get('content-type')||'application/zip'};}}
    if(!stored)return new Response('Digital file storage is not configured or the file is unavailable.',{status:503}); const claimed=await env.DB.prepare('UPDATE download_tokens SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>?').bind(now(),th,now()).run(); if(Number(claimed?.meta?.changes||0)!==1)return new Response('Download link expired or invalid.',{status:410});
    await env.DB.batch([env.DB.prepare('UPDATE entitlements SET downloads_used=downloads_used+1 WHERE id=?').bind(tok.entitlement_id),env.DB.prepare(`INSERT OR IGNORE INTO analytics(event_type,object_type,object_id,visitor_hash,bucket,value,created_at) VALUES('download','product',?,?,?,1,?)`).bind(pr.id,await visitorHash(req),th.slice(0,40),now())]); await securityEvent(req,env,'download_consumed',{targetId:tok.entitlement_id});
    const hh=new Headers({'content-type':stored.contentType||'application/octet-stream','content-disposition':`attachment; filename="${safeFileName(downloadName)}"`,'cache-control':'no-store'}); return new Response(stored.body,{status:200,headers:hh});
  }

  if(p==='customer/magic-link'&&method==='POST'){
    const b=await body(req), email=cleanText(b.email,160).trim().toLowerCase(), generic={ok:true,message:'If purchases exist for that email and email delivery is configured, a secure sign-in link has been sent.'}; if(!email.includes('@'))return json(generic); const order=await env.DB.prepare(`SELECT id FROM orders WHERE customer_email=? AND status IN ('paid','partially_refunded','refunded') LIMIT 1`).bind(email).first(); if(!order)return json(generic); const recent=await env.DB.prepare(`SELECT COUNT(*) c FROM customer_magic_tokens WHERE email=? AND created_at>=datetime('now','-15 minutes')`).bind(email).first(); if(Number(recent?.c||0)>=4)return json(generic); const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(36))).replace(/[+/=]/g,''), th=await sha(raw), exp=new Date(Date.now()+20*60*1000).toISOString(); await env.DB.prepare('INSERT INTO customer_magic_tokens(token_hash,email,expires_at,used_at,created_at) VALUES(?,?,?,?,?)').bind(th,email,exp,null,now()).run(); const link=`${url.origin}/account?token=${encodeURIComponent(raw)}`, html=await emailShell(env,'Your secure customer account link',`<p style=\"color:#cdd1e4;line-height:1.7\">Use this one-time link to view receipts, order status and available downloads. It expires in 20 minutes.</p><p><a href=\"${link}\" style=\"display:inline-block;padding:12px 18px;border-radius:999px;background:#8d66ff;color:#fff;text-decoration:none\">Open My Account</a></p>`); const task=sendEmail(env,{to:email,subject:'Your secure artist store account link',html,text:`Open your account: ${link}`,template:'customer_magic_link'}); ctx?.waitUntil?ctx.waitUntil(task):await task; return json(generic);
  }
  if(p==='customer/consume'&&method==='POST'){ const b=await body(req), th=await sha(String(b.token||'')), tok=await env.DB.prepare('SELECT * FROM customer_magic_tokens WHERE token_hash=?').bind(th).first(); if(!tok||tok.used_at||new Date(tok.expires_at)<=new Date())return json({ok:false,error:'This sign-in link is invalid or expired.'},410); const sid=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), exp=new Date(Date.now()+30*864e5).toISOString(); await env.DB.batch([env.DB.prepare('UPDATE customer_magic_tokens SET used_at=? WHERE token_hash=?').bind(now(),th),env.DB.prepare('INSERT INTO customer_sessions(id,email,expires_at,created_at) VALUES(?,?,?,?)').bind(sid,tok.email,exp,now())]); return json({ok:true,email:tok.email},200,{'set-cookie':`oah_customer_session=${encodeURIComponent(sid)}; Path=/; HttpOnly${secureCookieAttr(url)}; SameSite=Lax; Max-Age=2592000`}); }
  if(p==='customer/me'&&method==='GET'){const c=await customerAuth(req,env);return c?json({ok:true,email:c.email}):json({ok:false},401)}
  if(p==='customer/logout'&&method==='POST'){const c=await customerAuth(req,env);if(c)await env.DB.prepare('DELETE FROM customer_sessions WHERE id=?').bind(c.id).run();return json({ok:true},200,{'set-cookie':`oah_customer_session=; Path=/; HttpOnly${secureCookieAttr(url)}; SameSite=Lax; Max-Age=0`})}
  if(p==='customer/orders'&&method==='GET'){const c=await customerAuth(req,env);if(!c)return json({ok:false,error:'Customer sign-in required.'},401);const {results=[]}=await env.DB.prepare('SELECT * FROM orders WHERE customer_email=? ORDER BY created_at DESC LIMIT 100').bind(c.email).all();const orders=[];for(const o of results)orders.push(await orderPayload(env,o));return json({ok:true,email:c.email,orders});}
  if(p==='customer/download'&&method==='POST'){const c=await customerAuth(req,env);if(!c)return json({ok:false,error:'Customer sign-in required.'},401);const b=await body(req),ent=await env.DB.prepare(`SELECT e.* FROM entitlements e JOIN orders o ON o.id=e.order_id WHERE e.id=? AND lower(o.customer_email)=lower(?) AND o.status IN ('paid','partially_refunded')`).bind(cleanText(b.entitlementId,100),c.email).first();if(!ent)return json({ok:false,error:'Download entitlement not found.'},404);if(ent.downloads_used>=ent.downloads_max)return json({ok:false,error:'Download limit reached.'},429);const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''),th=await sha(raw),exp=new Date(Date.now()+15*60*1000).toISOString();await env.DB.prepare('INSERT INTO download_tokens(token_hash,entitlement_id,expires_at) VALUES(?,?,?)').bind(th,ent.id,exp).run();return json({ok:true,url:`/api/downloads/file?token=${encodeURIComponent(raw)}`,expiresAt:exp})}

  const user=await auth(req,env); if(!user)return json({ok:false,error:'Authentication required.'},401);
  if(p==='admin/dashboard'&&method==='GET'){
    const [{c:releases=0}={}, {c:orders=0}={}, {v:gross=0}={}, {v:refunded=0}={}, {c:customers=0}={}, {c:plays=0}={}, {c:downloads=0}={}, {c:views=0}={}] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) c FROM content_items WHERE type='release'`).first(), env.DB.prepare(`SELECT COUNT(*) c FROM orders WHERE status IN ('paid','partially_refunded','refunded')`).first(), env.DB.prepare(`SELECT COALESCE(SUM(total),0) v FROM orders WHERE status IN ('paid','partially_refunded','refunded')`).first(), env.DB.prepare(`SELECT COALESCE(SUM(refunded_amount),0) v FROM order_documents`).first(), env.DB.prepare(`SELECT COUNT(DISTINCT lower(customer_email)) c FROM orders WHERE status IN ('paid','partially_refunded','refunded')`).first(), env.DB.prepare(`SELECT COALESCE(SUM(value),0) c FROM analytics WHERE event_type='play'`).first(), env.DB.prepare(`SELECT COALESCE(SUM(value),0) c FROM analytics WHERE event_type='download'`).first(), env.DB.prepare(`SELECT COALESCE(SUM(value),0) c FROM analytics WHERE event_type='site_view'`).first()
    ]); const net=money(Number(gross)-Number(refunded)), aov=orders?money(net/Number(orders)):0;
    const [recentOrdersQ,recentQ,toursQ,playsQ,viewsQ,downloadsQ,revenueQ,topQ,splitQ]=await Promise.all([
      env.DB.prepare('SELECT public_id,customer_name,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 5').all(), env.DB.prepare(`SELECT * FROM content_items WHERE type='release' ORDER BY COALESCE(sort_date,created_at) DESC LIMIT 4`).all(), env.DB.prepare(`SELECT * FROM content_items WHERE type='tour' AND status='published' AND sort_date>=date('now') ORDER BY sort_date ASC LIMIT 4`).all(), env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(value),0) v FROM analytics WHERE event_type='play' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(), env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(value),0) v FROM analytics WHERE event_type='site_view' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(), env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(value),0) v FROM analytics WHERE event_type='download' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(), env.DB.prepare(`SELECT substr(o.created_at,1,10) day,COALESCE(SUM(o.total-COALESCE(d.refunded_amount,0)),0) v FROM orders o LEFT JOIN order_documents d ON d.order_id=o.id WHERE o.status IN ('paid','partially_refunded','refunded') AND o.created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(), env.DB.prepare(`SELECT oi.product_id,oi.title,SUM(oi.quantity) units,SUM(oi.quantity*oi.unit_price) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status IN ('paid','partially_refunded','refunded') GROUP BY oi.product_id,oi.title ORDER BY revenue DESC LIMIT 5`).all(), env.DB.prepare(`SELECT oi.kind,SUM(oi.quantity*oi.unit_price) revenue FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status IN ('paid','partially_refunded','refunded') GROUP BY oi.kind`).all()
    ]); return json({ok:true,kpis:{revenue:net,grossRevenue:Number(gross),refunded:Number(refunded),orders,customers,aov,releases,plays,downloads,views},recentOrders:recentOrdersQ.results||[],recentReleases:(recentQ.results||[]).map(contentRow),tours:(toursQ.results||[]).map(contentRow),topProducts:topQ.results||[],salesSplit:splitQ.results||[],series:{plays:seriesDays(playsQ.results),views:seriesDays(viewsQ.results),downloads:seriesDays(downloadsQ.results),revenue:seriesDays(revenueQ.results)}});
  }
  if(p==='admin/settings'&&method==='GET') return json({ok:true,settings:await getSettings(env)});
  if(p==='admin/settings'&&(method==='PUT'||method==='POST')){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req); for(const [k,v] of Object.entries(b.settings||{}))await setSetting(env,cleanText(k,80),v); return json({ok:true,settings:await getSettings(env)}); }

  if(p==='admin/account'&&method==='GET') return json({ok:true,user:{username:user.username,email:user.email}});
  if(p==='admin/account/password'&&method==='POST'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), current=String(b.currentPassword||''), next=String(b.newPassword||''); if(next.length<10)return json({ok:false,error:'New password must be at least 10 characters.'},400);
    const a=await env.DB.prepare('SELECT * FROM admins WHERE id=?').bind(user.admin_id).first(); if(!a||await hashPassword(current,a.password_salt)!==a.password_hash)return json({ok:false,error:'Current password is incorrect.'},403);
    const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(18))), ph=await hashPassword(next,salt); await env.DB.batch([env.DB.prepare('UPDATE admins SET password_hash=?,password_salt=? WHERE id=?').bind(ph,salt,user.admin_id),env.DB.prepare('DELETE FROM sessions WHERE admin_id=? AND id<>?').bind(user.admin_id,user.id)]);
    await createNotification(env,'security','Password changed','Your administrator password was changed. Other sessions were signed out.','security'); const task=sendSecurityEmail(env,a.email,'OneArtist Hub password changed','Your administrator password was changed and other sessions were signed out.'); ctx?.waitUntil?ctx.waitUntil(task):await task; return json({ok:true});
  }
  if(p==='admin/account/email'&&method==='POST'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), email=cleanText(b.email,160).trim().toLowerCase(), password=String(b.currentPassword||''); if(!email.includes('@'))return json({ok:false,error:'Enter a valid email address.'},400);
    const a=await env.DB.prepare('SELECT * FROM admins WHERE id=?').bind(user.admin_id).first(); if(!a||await hashPassword(password,a.password_salt)!==a.password_hash)return json({ok:false,error:'Current password is incorrect.'},403); const old=a.email;
    try{await env.DB.prepare('UPDATE admins SET email=? WHERE id=?').bind(email,user.admin_id).run()}catch{return json({ok:false,error:'That email is already in use.'},409)}
    await createNotification(env,'security','Administrator email changed',`Administrator email changed from ${old} to ${email}.`,'security');
    const task=Promise.all([sendSecurityEmail(env,old,'OneArtist Hub email changed',`The administrator email was changed to ${email}.`),sendSecurityEmail(env,email,'OneArtist Hub email updated','This address is now the administrator email for OneArtist Hub.')]); ctx?.waitUntil?ctx.waitUntil(task):await task; return json({ok:true,user:{username:a.username,email}});
  }
  if(p==='admin/notifications'&&method==='GET'){ const {results=[]}=await env.DB.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 40').all(); const unread=results.filter(x=>!x.is_read).length; return json({ok:true,notifications:results.map(x=>({...x,is_read:!!x.is_read})),unread}); }
  if(p==='admin/notifications/read-all'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); await env.DB.prepare('UPDATE notifications SET is_read=1 WHERE is_read=0').run(); return json({ok:true}); }
  const noteMatch=p.match(/^admin\/notifications\/([^/]+)$/); if(noteMatch&&method==='PUT'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); await env.DB.prepare('UPDATE notifications SET is_read=1 WHERE id=?').bind(noteMatch[1]).run(); return json({ok:true}); }
  if(p==='admin/storage/status'&&method==='GET'){const st=await storageSettings(env),db=await dropboxConfig(env),s3=await s3Config(env);return json({ok:true,provider:st.provider||(env.MEDIA?'r2':env.LOCAL_STORAGE?'local':s3?.accessKeyId?'s3':'dropbox'),r2Bound:!!env.MEDIA,localAvailable:!!env.LOCAL_STORAGE,dropboxConfigured:!!db?.accessToken,s3Configured:!!(s3?.accessKeyId&&s3?.secretAccessKey&&s3?.bucket&&s3?.endpoint),s3Endpoint:s3?.endpoint||'',s3Region:s3?.region||'us-east-1',s3Bucket:s3?.bucket||'',s3AccessKeyId:s3?.accessKeyId||'',s3ForcePathStyle:s3?.forcePathStyle!==false});}
  if(p==='admin/storage/config'&&method==='PUT'){if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);const b=await body(req),provider=['r2','dropbox','s3','local'].includes(b.provider)?b.provider:'dropbox';if(provider==='r2'&&!env.MEDIA)return json({ok:false,error:'Add an R2 bucket binding named MEDIA before selecting R2.'},400);if(provider==='dropbox'&&!await dropboxConfig(env))return json({ok:false,error:'Configure Dropbox before selecting Dropbox storage.'},400);if(provider==='s3'&&!await s3Config(env))return json({ok:false,error:'Configure S3-compatible storage before selecting it.'},400);if(provider==='local'&&!env.LOCAL_STORAGE)return json({ok:false,error:'Local storage is available only in the self-hosted/VPS profile.'},400);await setSetting(env,'storage',{provider});return json({ok:true,provider});}
  if(p==='admin/media/library'&&method==='GET'){
    const kind=['image','audio','video','document'].includes(url.searchParams.get('kind'))?url.searchParams.get('kind'):'';
    const visibility=['public','private'].includes(url.searchParams.get('visibility'))?url.searchParams.get('visibility'):'';
    return json({ok:true,items:await mediaLibraryItems(env,{kind,visibility})});
  }
  const mediaLibraryItem=p.match(/^admin\/media\/library\/([^/]+)$/);
  if(mediaLibraryItem&&method==='PUT'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const row=await env.DB.prepare('SELECT * FROM media_objects WHERE id=?').bind(mediaLibraryItem[1]).first();if(!row)return json({ok:false,error:'Media file not found.'},404);
    const b=await body(req);await upsertMediaMeta(env,row,{title:cleanText(b.title,250),alt:cleanText(b.alt,1000)});
    const item=(await mediaLibraryItems(env,{})).find(x=>x.id===row.id);return json({ok:true,item});
  }
  if(mediaLibraryItem&&method==='DELETE'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const row=await env.DB.prepare('SELECT * FROM media_objects WHERE id=?').bind(mediaLibraryItem[1]).first();if(!row)return json({ok:false,error:'Media file not found.'},404);
    const item=(await mediaLibraryItems(env,{})).find(x=>x.id===row.id);if(Number(item?.usageCount||0)>0)return json({ok:false,error:`This media file is currently used in ${item.usageCount} place${item.usageCount===1?'':'s'}. Replace those references before deleting it.`},409);
    await deleteStoredObject(env,row);
    const metas=await mediaMetaRows(env),meta=metas.find(x=>x.data?.mediaObjectId===row.id);const statements=[env.DB.prepare('DELETE FROM media_objects WHERE id=?').bind(row.id)];if(meta)statements.push(env.DB.prepare('DELETE FROM content_items WHERE id=?').bind(meta.id));await env.DB.batch(statements);
    return json({ok:true});
  }
  if(p==='admin/media/upload'&&method==='POST'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const name=safeFileName(req.headers.get('x-file-name')||'upload.bin'),contentType=normalizeMediaContentType(req.headers.get('x-content-type')||req.headers.get('content-type')||'application/octet-stream',name),visibility=req.headers.get('x-visibility')==='public'?'public':'private',folder=cleanSlug(req.headers.get('x-folder')||'media'),registerLibrary=req.headers.get('x-register-library')==='1',limit=Math.max(1024*1024,Number(env.MAX_UPLOAD_BYTES)||95*1024*1024),declaredLength=Number(req.headers.get('content-length')||0); if(declaredLength>limit)return json({ok:false,error:'Upload exceeds this installation profile limit.'},413); let ab;try{ab=await readLimitedBody(req,limit)}catch(err){if(err.code==='PAYLOAD_TOO_LARGE')return json({ok:false,error:'Upload exceeds this installation profile limit.'},413);throw err}
    if(!ab.byteLength)return json({ok:false,error:'Upload is empty.'},400);
    if(!mediaBytesMatch(contentType,ab,name))return json({ok:false,error:'The uploaded file does not match its declared media type.'},415);
    if(visibility==='public'&&!publicMediaAllowed(contentType,name))return json({ok:false,error:'That file type cannot be served as public media. Use JPG, PNG, WebP, GIF, audio, video, PDF or TXT; protected release ZIPs remain private.'},415);
    const out=await putStoredObject(env,{bytes:ab,filename:name,contentType,visibility,folder});
    if(registerLibrary){const storedRow=await env.DB.prepare('SELECT * FROM media_objects WHERE id=?').bind(out.id).first();if(storedRow)await upsertMediaMeta(env,storedRow,{title:name.replace(/\.[^.]+$/,''),alt:''});}
    return json({ok:true,object:{...out,contentType,visibility,mediaType:mediaTypeFor(contentType,name)}});
  }
  if(p==='admin/storage/s3/test'&&method==='POST'){if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);const cfg=await s3Config(env);if(!cfg)return json({ok:false,error:'Save S3-compatible credentials first.'},400);const key=`oneartist/system/connection-${id()}.txt`,bytes=utf8('OneArtist Hub S3 connection test');const put=await s3Request(env,'PUT',key,bytes,'text/plain');if(!put.ok)return json({ok:false,error:`S3 write failed (${put.status}).`},502);const get=await s3Request(env,'GET',key);if(!get.ok)return json({ok:false,error:`S3 read failed (${get.status}).`},502);await s3Request(env,'DELETE',key);return json({ok:true,bucket:cfg.bucket,endpoint:cfg.endpoint});}
  if(p==='admin/email/queue'&&method==='GET'){const q=await env.DB.prepare('SELECT id,recipient,template,subject,status,attempts,next_attempt_at,last_error,provider,provider_message_id,created_at,updated_at,sent_at FROM email_queue ORDER BY created_at DESC LIMIT 100').all();return json({ok:true,queue:q.results||[]});}
  if(p==='admin/email/queue/retry'&&method==='POST'){if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);await env.DB.prepare(`UPDATE email_queue SET status='retry',next_attempt_at=?,updated_at=? WHERE status IN ('retry','dead')`).bind(now(),now()).run();const processed=await processEmailQueue(env,10);return json({ok:true,processed});}
  if(p==='admin/paypal/connect/start'&&method==='POST'){if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);if(!env.ONEARTIST_CONNECT_URL||!env.ONEARTIST_CONNECT_TOKEN)return json({ok:false,error:'PayPal Connect is not enabled on this installation. Configure ONEARTIST_CONNECT_URL and ONEARTIST_CONNECT_TOKEN as server secrets.'},503);const tracking=`oah-${id()}`,callback=`${url.origin}/api/paypal/connect/callback`;const r=await fetch(String(env.ONEARTIST_CONNECT_URL).replace(/\/+$/,'')+'/onboard/start',{method:'POST',headers:{authorization:`Bearer ${env.ONEARTIST_CONNECT_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({trackingId:tracking,returnUrl:callback})});let j={};try{j=await r.json()}catch{}if(!r.ok||!j.actionUrl)return json({ok:false,error:cleanText(j.error||`Connect service returned ${r.status}`,500)},502);await setSetting(env,'paypalConnect',{trackingId:tracking,status:'pending'});return json({ok:true,actionUrl:j.actionUrl});}
  if(p==='paypal/connect/callback'&&method==='GET'){const merchantId=cleanText(url.searchParams.get('merchantIdInPayPal')||'',40),granted=url.searchParams.get('permissionsGranted')==='true',tracking=cleanText(url.searchParams.get('merchantId')||'',100),state=(await getSettings(env)).paypalConnect||{};if(!merchantId||!granted||!tracking||tracking!==state.trackingId)return new Response('PayPal onboarding could not be verified.',{status:400,headers:{'content-type':'text/plain'}});if(!env.ONEARTIST_CONNECT_URL||!env.ONEARTIST_CONNECT_TOKEN)return new Response('PayPal Connect verification service is unavailable.',{status:503,headers:{'content-type':'text/plain'}});const vr=await fetch(String(env.ONEARTIST_CONNECT_URL).replace(/\/+$/,'')+'/onboard/status',{method:'POST',headers:{authorization:`Bearer ${env.ONEARTIST_CONNECT_TOKEN}`,'content-type':'application/json'},body:JSON.stringify({trackingId:tracking,merchantId})});let vj={};try{vj=await vr.json()}catch{}if(!vr.ok||vj.trackingId!==tracking||vj.merchantId!==merchantId)return new Response('PayPal merchant verification failed.',{status:400,headers:{'content-type':'text/plain'}});await setSetting(env,'paypalConnect',{trackingId:tracking,merchantId,status:vj.paymentsReceivable?'connected':'action_required',paymentsReceivable:!!vj.paymentsReceivable,connectedAt:now(),accountStatus:cleanText(url.searchParams.get('accountStatus')||'',80),emailConfirmed:!!vj.primaryEmailConfirmed,products:vj.products||[]});return Response.redirect(url.origin+'/admin?section=settings&paypal=connected',302);}
  if(p==='admin/paypal/connect/status'&&method==='GET'){const st=(await getSettings(env)).paypalConnect||{};return json({ok:true,available:!!(env.ONEARTIST_CONNECT_URL&&env.ONEARTIST_CONNECT_TOKEN),status:st.status||'not_connected',merchantId:st.merchantId||'',emailConfirmed:!!st.emailConfirmed});}
  if(p==='admin/paypal/test'&&method==='POST'){if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);const cfg=await paypalConfig(env);if(!cfg?.clientId||!cfg?.clientSecret)return json({ok:false,error:'Save PayPal credentials first.'},400);const pp=await paypalAccess(cfg);return json({ok:true,environment:cfg.environment||'sandbox',authenticated:!!pp.token});}
  if(p==='admin/notification-preferences'&&method==='GET'){ return json({ok:true,preferences:await notificationPrefs(env)}); }
  if(p==='admin/notification-preferences'&&method==='PUT'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), f=x=>b[x]===false||b[x]===0?0:1, threshold=Math.max(1,Math.min(100,Math.floor(Number(b.low_inventory_threshold)||5))); await env.DB.prepare(`UPDATE notification_preferences SET new_order=?,digital_sale=?,physical_sale=?,shipping_updates=?,security_alerts=?,low_inventory=?,low_inventory_threshold=?,updated_at=? WHERE id=1`).bind(f('new_order'),f('digital_sale'),f('physical_sale'),f('shipping_updates'),f('security_alerts'),f('low_inventory'),threshold,now()).run(); return json({ok:true,preferences:await notificationPrefs(env)}); }
  if(p==='admin/email/config'&&method==='GET'){ const cfg=await emailConfig(env); const configured=cfg?.service==='cloudflare'?!!(cfg?.apiToken&&cfg?.accountId&&cfg?.fromEmail):cfg?.service==='smtp'?!!(cfg?.smtpHost&&cfg?.smtpUser&&cfg?.smtpPassword&&cfg?.fromEmail):!!(cfg?.apiKey&&cfg?.fromEmail); return json({ok:true,configured,service:cfg?.service||'resend',fromName:cfg?.fromName||'',fromEmail:cfg?.fromEmail||'',replyTo:cfg?.replyTo||'',accountId:cfg?.accountId||'',smtpAvailable:!!env.SMTP_SEND,smtpHost:cfg?.smtpHost||'',smtpPort:Number(cfg?.smtpPort||587),smtpSecure:!!cfg?.smtpSecure,smtpUser:cfg?.smtpUser||''}); }
  if(p==='admin/email/test'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), to=cleanText(b.to||user.email,220); const html=await emailShell(env,'Email test','<p style="color:#cdd1e4">Your OneArtist Hub email integration is working.</p>'); const result=await sendEmail(env,{to,subject:'OneArtist Hub email test',html,text:'Your OneArtist Hub email integration is working.',template:'test'}); if(!result.ok)return json({ok:false,error:result.error||'Test email failed.'},502); return json({ok:true}); }
  if(p==='admin/paypal/config'&&method==='GET'){ const cfg=await paypalConfig(env); return json({ok:true,configured:!!(cfg?.clientId&&cfg?.clientSecret),clientId:cfg?.clientId||'',environment:cfg?.environment||'sandbox',webhookId:cfg?.webhookId||'',webhookConfigured:!!cfg?.webhookId}); }
  if(p==='admin/integrations'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), provider=cleanText(b.provider,40); if(!['paypal','dropbox','s3','email'].includes(provider))return json({ok:false,error:'Unsupported provider.'},400); let data={}; if(provider==='paypal'){let previous=null;try{previous=await paypalConfig(env)}catch{} data={clientId:cleanText(b.clientId||previous?.clientId||'',300),clientSecret:String(b.clientSecret||previous?.clientSecret||''),environment:b.environment==='live'?'live':'sandbox',webhookId:cleanText(b.webhookId??previous?.webhookId??'',80)};} else if(provider==='dropbox'){let previous=null;try{const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='dropbox'`).first();if(r)previous=await decrypt(env,r.data_enc)}catch{} data={accessToken:String(b.accessToken||previous?.accessToken||'')};} else if(provider==='s3'){let previous=null;try{previous=await s3Config(env)}catch{} data={endpoint:cleanText(b.endpoint||previous?.endpoint||'',600).replace(/\/+$/,''),region:cleanText(b.region||previous?.region||'us-east-1',64),bucket:cleanText(b.bucket||previous?.bucket||'',128),accessKeyId:cleanText(b.accessKeyId||previous?.accessKeyId||'',256),secretAccessKey:String(b.secretAccessKey||previous?.secretAccessKey||''),forcePathStyle:b.forcePathStyle!==false};} else { let previous=null; try{previous=await emailConfig(env)}catch{} const service=['resend','brevo','cloudflare','smtp'].includes(b.service)?b.service:'resend'; data={service,apiKey:String(b.apiKey||previous?.apiKey||''),apiToken:String(b.apiToken||previous?.apiToken||''),accountId:cleanText(b.accountId||previous?.accountId||'',80),smtpHost:cleanText(b.smtpHost||previous?.smtpHost||'',220),smtpPort:Number(b.smtpPort||previous?.smtpPort||587),smtpSecure:!!b.smtpSecure,smtpUser:cleanText(b.smtpUser||previous?.smtpUser||'',220),smtpPassword:String(b.smtpPassword||previous?.smtpPassword||''),fromName:cleanText(b.fromName||previous?.fromName||'',120),fromEmail:cleanText(b.fromEmail||previous?.fromEmail||'',220).trim(),replyTo:cleanText(b.replyTo||previous?.replyTo||'',220).trim()}; } const emailMissing=provider==='email'&&(!data.fromEmail||(data.service==='cloudflare'?(!data.apiToken||!data.accountId):data.service==='smtp'?(!env.SMTP_SEND||!data.smtpHost||!data.smtpUser||!data.smtpPassword):!data.apiKey)); if((provider==='paypal'&&(!data.clientId||!data.clientSecret))||(provider==='dropbox'&&!data.accessToken)||(provider==='s3'&&(!data.endpoint||!data.bucket||!data.accessKeyId||!data.secretAccessKey))||emailMissing)return json({ok:false,error:'Required secret or sender information is missing.'},400); const e=await encrypt(env,data); await env.DB.prepare(`INSERT INTO integrations(provider,data_enc,updated_at) VALUES(?,?,?) ON CONFLICT(provider) DO UPDATE SET data_enc=excluded.data_enc,updated_at=excluded.updated_at`).bind(provider,e,now()).run(); return json({ok:true}); }
  if(p==='admin/integrations'&&method==='GET'){ const {results=[]}=await env.DB.prepare('SELECT provider,updated_at FROM integrations').all(); return json({ok:true,integrations:results}); }
  if(p==='admin/youtube'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), youtubeId=youtubeIdFromUrl(b.url); if(!youtubeId)return json({ok:false,error:'Enter a valid YouTube video URL.'},400); const canonical=`https://www.youtube.com/watch?v=${youtubeId}`; let meta={}; try{const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`,{headers:{accept:'application/json'}}); if(r.ok)meta=await r.json()}catch{} return json({ok:true,youtubeId,title:cleanText(meta.title||'',250),author:cleanText(meta.author_name||'',250),thumbnail:cleanText(meta.thumbnail_url||`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,1000)}); }
  if(p==='admin/orders'&&method==='GET'){ const {results=[]}=await env.DB.prepare('SELECT id,public_id,customer_email,customer_name,currency,total,status,fulfillment_status,tracking_carrier,tracking_number,shipping_json,created_at FROM orders ORDER BY created_at DESC LIMIT 100').all(); return json({ok:true,orders:results.map(o=>({...o,shipping:(()=>{try{return JSON.parse(o.shipping_json||'{}')}catch{return {}}})()}))}); }
  const adminOrder=p.match(/^admin\/orders\/([^/]+)$/); if(adminOrder&&method==='PUT'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), status=['unfulfilled','processing','shipped','delivered','not_required'].includes(b.fulfillmentStatus)?b.fulfillmentStatus:'unfulfilled', carrier=cleanText(b.trackingCarrier,80)||null, tracking=cleanText(b.trackingNumber,160)||null; const before=await env.DB.prepare('SELECT public_id,customer_email,customer_name,fulfillment_status FROM orders WHERE id=?').bind(adminOrder[1]).first(); await env.DB.prepare('UPDATE orders SET fulfillment_status=?,tracking_carrier=?,tracking_number=?,updated_at=? WHERE id=?').bind(status,carrier,tracking,now(),adminOrder[1]).run(); if(before&&before.fulfillment_status!==status&&(status==='shipped'||status==='delivered')){ const prefs=await notificationPrefs(env); if(prefs.shipping_updates){ const receiptUrl=`${url.origin}/order/${encodeURIComponent(before.public_id)}`, msg=status==='shipped'?`Your order has shipped${tracking?` via ${carrier||'carrier'} — tracking ${tracking}`:''}.`:'Your order has been marked delivered.'; const html=await emailShell(env,status==='shipped'?'Your order shipped':'Order delivered',`<p style="color:#cdd1e4">${htmlEscape(msg)}</p><p><a href="${receiptUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#8d66ff;color:#fff;text-decoration:none">View Order</a></p>`); const task=sendEmail(env,{to:before.customer_email,subject:status==='shipped'?'Your order has shipped':'Your order was delivered',html,text:`${msg} ${receiptUrl}`,template:'shipping_update'}); ctx?.waitUntil?ctx.waitUntil(task):await task; } } return json({ok:true}); }
  if(p==='admin/customers'&&method==='GET'){const {results=[]}=await env.DB.prepare(`SELECT lower(o.customer_email) email,MAX(o.customer_name) customer_name,COUNT(*) order_count,SUM(o.total-COALESCE(d.refunded_amount,0)) gross_value,MAX(o.created_at) last_order FROM orders o LEFT JOIN order_documents d ON d.order_id=o.id WHERE o.status IN ('paid','partially_refunded','refunded') GROUP BY lower(o.customer_email) ORDER BY last_order DESC LIMIT 250`).all();return json({ok:true,customers:results})}
  if(p==='admin/downloads'&&method==='GET'){const {results=[]}=await env.DB.prepare(`SELECT e.id,e.order_id,e.product_id,e.customer_email,e.downloads_used,e.downloads_max,e.created_at,o.public_id,o.status,oi.title FROM entitlements e JOIN orders o ON o.id=e.order_id LEFT JOIN order_items oi ON oi.order_id=e.order_id AND oi.product_id=e.product_id ORDER BY e.created_at DESC LIMIT 250`).all();return json({ok:true,downloads:results})}
  const resetDl=p.match(/^admin\/downloads\/([^/]+)\/reset$/);if(resetDl&&method==='POST'){if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);const ent=await env.DB.prepare('SELECT * FROM entitlements WHERE id=?').bind(resetDl[1]).first();if(!ent)return json({ok:false,error:'Entitlement not found.'},404);await env.DB.batch([env.DB.prepare('UPDATE entitlements SET downloads_used=0 WHERE id=?').bind(ent.id),env.DB.prepare('DELETE FROM download_tokens WHERE entitlement_id=?').bind(ent.id)]);return json({ok:true})}
  if(p==='admin/webhooks'&&method==='GET'){const {results=[]}=await env.DB.prepare('SELECT event_id,event_type,status,created_at,processed_at,error FROM webhook_events ORDER BY created_at DESC LIMIT 100').all();return json({ok:true,events:results})}
  const refundMatch=p.match(/^admin\/orders\/([^/]+)\/refund$/);
  if(refundMatch&&method==='POST'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const b=await body(req),o=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(refundMatch[1]).first();
    if(!o)return json({ok:false,error:'Order not found.'},404);
    if(!['paid','partially_refunded'].includes(o.status))return json({ok:false,error:'This order is not refundable in its current state.'},409);
    const cfg=await paypalConfig(env); if(!cfg)return json({ok:false,error:'PayPal is not configured.'},503);
    const beforeDoc=await orderDocument(env,o.id),remaining=money(Number(o.total)-Number(beforeDoc?.refunded_amount||0)),requested=b.amount==null||b.amount===''?remaining:money(b.amount);
    if(requested<=0||requested>remaining)return json({ok:false,error:'Refund amount is invalid.'},400);
    const capture=await env.DB.prepare(`SELECT provider_id FROM order_transactions WHERE order_id=? AND type='capture' ORDER BY created_at DESC LIMIT 1`).bind(o.id).first();
    const captureId=capture?.provider_id||parseJson(o.data,{}).purchase_units?.[0]?.payments?.captures?.[0]?.id;
    if(!captureId)return json({ok:false,error:'PayPal capture ID could not be found for this order.'},409);
    const pp=await paypalAccess(cfg),payload=requested===remaining?{}:{amount:{value:requested.toFixed(2),currency_code:o.currency}};
    const rr=await fetch(`${pp.base}/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json','paypal-request-id':('OAREF-'+id()).slice(0,38)},body:JSON.stringify(payload)}),j=await rr.json();
    if(!rr.ok||!['COMPLETED','PENDING'].includes(j.status))return json({ok:false,error:cleanText(j.message||'PayPal refund failed.',500)},502);
    if(j.status==='PENDING'){
      if(!await transactionExists(env,'refund',j.id))await recordTransaction(env,{orderId:o.id,type:'refund',providerId:j.id,status:'PENDING',amount:requested,currency:o.currency,data:j});
      await createNotification(env,'sale','Refund pending',`${o.public_id} refund of ${requested} ${o.currency} is pending at PayPal.`,'orders');
      const latest=await orderPayload(env,await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(o.id).first());
      return json({ok:true,pending:true,status:latest.status,refundedAmount:latest.refunded_amount,message:'PayPal accepted the refund and is processing it. The order will update after the verified refund webhook completes.'},202);
    }
    if(!await transactionExists(env,'refund',j.id)){
      const liveDoc=await orderDocument(env,o.id),refunded=money(Number(liveDoc?.refunded_amount||0)+requested),full=refunded>=money(o.total);
      await recordTransaction(env,{orderId:o.id,type:'refund',providerId:j.id,status:j.status,amount:requested,currency:o.currency,data:j});
      await env.DB.batch([
        env.DB.prepare('UPDATE order_documents SET refunded_amount=?,updated_at=? WHERE order_id=?').bind(refunded,now(),o.id),
        env.DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(full?'refunded':'partially_refunded',now(),o.id)
      ]);
      if(full)await env.DB.prepare('UPDATE entitlements SET downloads_max=downloads_used WHERE order_id=?').bind(o.id).run();
      await createNotification(env,'sale','Refund issued',`${o.public_id} refunded ${requested} ${o.currency}.`,'orders');
      const html=await emailShell(env,'Refund issued',`<p style="color:#cdd1e4">A refund of <strong>${requested.toFixed(2)} ${htmlEscape(o.currency)}</strong> was issued for invoice ${htmlEscape(liveDoc?.invoice_number||o.public_id)}.</p>`);
      const task=sendEmail(env,{to:o.customer_email,subject:'Refund issued for your order',html,text:`Refund ${requested.toFixed(2)} ${o.currency} issued for ${liveDoc?.invoice_number||o.public_id}.`,template:'refund'}); ctx?.waitUntil?ctx.waitUntil(task):await task;
    }
    const latest=await orderPayload(env,await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(o.id).first());
    return json({ok:true,pending:false,status:latest.status,refundedAmount:latest.refunded_amount});
  }

  const adminOrderDetail=p.match(/^admin\/orders\/([^/]+)\/detail$/);if(adminOrderDetail&&method==='GET'){const o=await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(adminOrderDetail[1]).first();if(!o)return json({ok:false,error:'Order not found.'},404);return json({ok:true,order:await orderPayload(env,o)})}
  const cRoot=p==='admin/content'; const cId=p.match(/^admin\/content\/([^/]+)$/);
  if(cRoot&&method==='GET'){ const type=url.searchParams.get('type'); if(type&&!ALLOWED_TYPES.has(type))return json({ok:false,error:'Invalid type'},400); const q=type?await env.DB.prepare('SELECT * FROM content_items WHERE type=? ORDER BY COALESCE(sort_date,created_at) DESC').bind(type).all():await env.DB.prepare('SELECT * FROM content_items ORDER BY created_at DESC').all(); return json({ok:true,items:(q.results||[]).map(contentRow)}); }
  if(cRoot&&method==='POST'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const b=await body(req), type=cleanText(b.type,40), title=cleanText(b.title,250).trim();
    if(!ALLOWED_TYPES.has(type))return json({ok:false,error:'Invalid content type.'},400);
    if(!title)return json({ok:false,error:'Title is required.'},400);
    const itemId=id(), t=now(), data=sanitizeContentData(type,b.data||{});
    if(type==='video'){
      const yid=youtubeIdFromUrl(data.youtubeUrl);
      if(!yid)return json({ok:false,error:'Invalid YouTube URL.'},400);
      data.youtubeId=yid;
      if(!data.thumbnail)data.thumbnail=`https://img.youtube.com/vi/${yid}/hqdefault.jpg`;
    }
    if(type==='track'){
      const releaseId=cleanText(data.releaseId,100);
      if(!releaseId)return json({ok:false,error:'A parent release is required.'},400);
      const parent=await env.DB.prepare(`SELECT id FROM content_items WHERE id=? AND type='release'`).bind(releaseId).first();
      if(!parent)return json({ok:false,error:'Selected release does not exist.'},400);
      if(!cleanText(data.audio,1200))return json({ok:false,error:'Preview audio URL is required.'},400);
      data.trackNo=Math.max(1,Math.floor(Number(data.trackNo)||1));
    }
    if(type==='product'){
      const price=Number(data.price);
      if(!Number.isFinite(price)||price<0)return json({ok:false,error:'Product price must be zero or greater.'},400);
      data.price=money(price);
      if(data.kind!=='digital'){data.kind='physical';data.variants=normalizeVariants(data.variants);}else{data.kind='digital';data.variants=[];}
    }
    await env.DB.prepare(`INSERT INTO content_items(id,type,slug,title,status,sort_date,featured,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(itemId,type,cleanSlug(b.slug||title),title,b.status==='draft'?'draft':'published',cleanText(b.sortDate||'',40)||null,b.featured?1:0,JSON.stringify(data),t,t).run();
    return json({ok:true,id:itemId});
  }
  if(cId&&method==='PUT'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const existing=contentRow(await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(cId[1]).first());
    if(!existing)return json({ok:false,error:'Content item not found.'},404);
    const b=await body(req), title=cleanText(b.title??existing.title,250).trim(), data=sanitizeContentData(existing.type,b.data??existing.data);
    if(!title)return json({ok:false,error:'Title is required.'},400);
    if(existing.type==='video'){
      const yid=youtubeIdFromUrl(data.youtubeUrl);
      if(!yid)return json({ok:false,error:'Invalid YouTube URL.'},400);
      data.youtubeId=yid;
      if(!data.thumbnail)data.thumbnail=`https://img.youtube.com/vi/${yid}/hqdefault.jpg`;
    }
    if(existing.type==='track'){
      const releaseId=cleanText(data.releaseId,100);
      if(!releaseId)return json({ok:false,error:'A parent release is required.'},400);
      const parent=await env.DB.prepare(`SELECT id FROM content_items WHERE id=? AND type='release'`).bind(releaseId).first();
      if(!parent)return json({ok:false,error:'Selected release does not exist.'},400);
      if(!cleanText(data.audio,1200))return json({ok:false,error:'Preview audio URL is required.'},400);
      data.trackNo=Math.max(1,Math.floor(Number(data.trackNo)||1));
    }
    if(existing.type==='product'){
      const price=Number(data.price);
      if(!Number.isFinite(price)||price<0)return json({ok:false,error:'Product price must be zero or greater.'},400);
      data.price=money(price);
      if(data.kind!=='digital'){data.kind='physical';data.variants=normalizeVariants(data.variants);}else{data.kind='digital';data.variants=[];}
    }
    const nextStatus=(b.status??existing.status)==='draft'?'draft':'published', nextFeatured=(b.featured??existing.featured)?1:0;
    await env.DB.prepare(`UPDATE content_items SET slug=?,title=?,status=?,sort_date=?,featured=?,data=?,updated_at=? WHERE id=?`).bind(cleanSlug(b.slug??existing.slug),title,nextStatus,cleanText(b.sortDate??existing.sort_date??'',40)||null,nextFeatured,JSON.stringify(data),now(),cId[1]).run();
    return json({ok:true});
  }
  if(cId&&method==='DELETE'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const existing=contentRow(await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(cId[1]).first()); if(!existing)return json({ok:false,error:'Content item not found.'},404); if(existing.type==='release'){const q=await env.DB.prepare(`SELECT * FROM content_items WHERE type='track'`).all(); const linked=(q.results||[]).map(contentRow).filter(t=>t.data.releaseId===existing.id); if(linked.length)await env.DB.batch(linked.map(t=>env.DB.prepare('DELETE FROM content_items WHERE id=?').bind(t.id)));} await env.DB.prepare('DELETE FROM content_items WHERE id=?').bind(cId[1]).run(); return json({ok:true}); }
  return json({ok:false,error:'API route not found.'},404);
}

export async function onRequest(context){
  try{
    if(context.request.method==='OPTIONS')return new Response(null,{status:204,headers:{allow:'GET,POST,PUT,DELETE,OPTIONS'}});
    const response=await route(context.request,context.env,new URL(context.request.url),context),headers=new Headers(response.headers),rid=requestId(context.request); headers.set('x-request-id',rid); headers.set('x-content-type-options','nosniff'); headers.set('referrer-policy','strict-origin-when-cross-origin'); headers.set('permissions-policy','camera=(), microphone=(), geolocation=()'); return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch(err){ const rid=requestId(context.request); console.error('OneArtist API error',rid,err); return json({ok:false,error:'Internal server error',requestId:rid},500,{'x-request-id':rid,'x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}); }
}
