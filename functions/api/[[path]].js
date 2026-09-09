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
CREATE TABLE IF NOT EXISTS download_tokens (token_hash TEXT PRIMARY KEY, entitlement_id TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, FOREIGN KEY(entitlement_id) REFERENCES entitlements(id) ON DELETE CASCADE);`;

const ALLOWED_TYPES = new Set(['release','track','video','tour','product','page','media','news']);
const json = (data, status=200, extra={}) => new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const bytesToB64 = b => btoa(String.fromCharCode(...b));
const b64ToBytes = s => Uint8Array.from(atob(s), c=>c.charCodeAt(0));
const hex = b => [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const parseCookies = req => Object.fromEntries((req.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('='); return [decodeURIComponent(v.slice(0,i)), decodeURIComponent(v.slice(i+1))]}));
const cleanText = (v,n=5000) => String(v??'').replace(/\0/g,'').slice(0,n);
const cleanSlug = v => cleanText(v,120).toLowerCase().trim().replace(/[^a-z0-9-_]+/g,'-').replace(/^-+|-+$/g,'');
const youtubeIdFromUrl = value => { const v=String(value||'').trim(); const m=v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i)||v.match(/[?&]v=([A-Za-z0-9_-]{6,})/i); return m?m[1]:''; };
const sanitizeHtml = v => cleanText(v,50000)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,'')
  .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'')
  .replace(/javascript\s*:/gi,'');
async function body(req){ try{return await req.json()}catch{return {}} }
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
async function getSettings(env){ const {results=[]}=await env.DB.prepare('SELECT key,value FROM settings').all(); const out={}; for(const r of results){ try{out[r.key]=JSON.parse(r.value)}catch{out[r.key]=r.value} } return out; }
async function setSetting(env,key,value){ await env.DB.prepare(`INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(key,JSON.stringify(value),now()).run(); }
function contentRow(row){ if(!row)return row; let data={}; try{data=JSON.parse(row.data||'{}')}catch{} return {...row,featured:!!row.featured,data}; }
async function visitorHash(req){ const ip=req.headers.get('cf-connecting-ip')||'local'; const ua=req.headers.get('user-agent')||''; return sha(`${ip}|${ua}`); }
function bucketFor(kind){ const d=new Date(); return kind==='site_view'?d.toISOString().slice(0,10):d.toISOString().slice(0,13); }
async function recordAnalytics(req,env,eventType,objectType,objectId){
  const vh=await visitorHash(req), bucket=bucketFor(eventType);
  await env.DB.prepare(`INSERT OR IGNORE INTO analytics(event_type,object_type,object_id,visitor_hash,bucket,value,created_at) VALUES(?,?,?,?,?,1,?)`).bind(eventType,objectType,objectId,vh,bucket,now()).run();
}
async function paypalConfig(env){ const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='paypal'`).first(); return r?decrypt(env,r.data_enc):null; }
async function paypalAccess(cfg){ const base=cfg.environment==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com'; const token=btoa(`${cfg.clientId}:${cfg.clientSecret}`); const res=await fetch(`${base}/v1/oauth2/token`,{method:'POST',headers:{authorization:`Basic ${token}`,'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'}); if(!res.ok) throw new Error('PayPal authentication failed'); const j=await res.json(); return {base,token:j.access_token}; }
const currencyCode=v=>/^[A-Z]{3}$/.test(String(v||'').toUpperCase())?String(v).toUpperCase():'USD';
const money=v=>Math.round(Math.max(0,Number(v)||0)*100)/100;
async function resolveCart(env,cart){
  const items=[]; let subtotal=0, hasPhysical=false;
  for(const c of Array.isArray(cart)?cart:[]){
    const r=await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product' AND status='published'`).bind(cleanText(c.id,100)).first(); if(!r)continue;
    const p=contentRow(r), qty=Math.max(1,Math.min(20,Math.floor(Number(c.qty)||1))), price=money(p.data.price), kind=p.data.kind==='physical'?'physical':'digital';
    const inv=p.data.inventory===''||p.data.inventory==null?null:Math.max(0,Math.floor(Number(p.data.inventory)||0));
    if(kind==='physical'&&inv!==null&&qty>inv) throw new Error(`${p.title} does not have enough inventory.`);
    items.push({id:p.id,title:p.title,qty,price,kind,data:p.data}); subtotal=money(subtotal+price*qty); if(kind==='physical')hasPhysical=true;
  }
  return {items,subtotal,hasPhysical};
}
function seriesDays(rows,key='v'){ const map=new Map((rows||[]).map(r=>[r.day,Number(r[key]||0)])),out=[]; for(let i=29;i>=0;i--){const d=new Date(Date.now()-i*86400000).toISOString().slice(0,10);out.push({day:d,value:map.get(d)||0});} return out; }

async function route(req,env,url){
  if(!env.DB) return json({ok:false,error:'D1 binding DB is missing. Add a D1 binding named DB in Cloudflare.'},503);
  const p=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
  const method=req.method.toUpperCase();
  if(p==='status' && method==='GET') return json({ok:true,installed:await isInstalled(env),version:'0.1.1'});
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

  if(p==='auth/login' && method==='POST'){
    const b=await body(req), login=cleanText(b.login,160).trim(); const a=await env.DB.prepare('SELECT * FROM admins WHERE username=? OR email=?').bind(login,login.toLowerCase()).first();
    if(!a || await hashPassword(String(b.password||''),a.password_salt)!==a.password_hash) return json({ok:false,error:'Invalid username/email or password.'},401);
    const sid=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), csrf=bytesToB64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g,''), exp=new Date(Date.now()+7*864e5).toISOString();
    await env.DB.prepare('INSERT INTO sessions(id,admin_id,csrf,expires_at,created_at) VALUES(?,?,?,?,?)').bind(sid,a.id,csrf,exp,now()).run();
    return json({ok:true,user:{username:a.username,email:a.email},csrf},200,{'set-cookie':`oah_session=${encodeURIComponent(sid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`});
  }
  if(p==='auth/me' && method==='GET'){ const u=await auth(req,env); return u?json({ok:true,user:{username:u.username,email:u.email},csrf:u.csrf}):json({ok:false},401); }
  if(p==='auth/logout' && method==='POST'){ const u=await auth(req,env); if(u)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(u.id).run(); return json({ok:true},200,{'set-cookie':'oah_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}); }

  if(p==='public/bootstrap' && method==='GET'){
    const settings=await getSettings(env); const {results=[]}=await env.DB.prepare(`SELECT * FROM content_items WHERE status='published' ORDER BY COALESCE(sort_date,created_at) DESC`).all();
    const content=results.map(contentRow); return json({ok:true,settings,content});
  }
  if(p==='analytics' && method==='POST'){
    const b=await body(req), event=String(b.event||''); if(!['site_view','play','video_view'].includes(event))return json({ok:false,error:'Invalid event'},400);
    await recordAnalytics(req,env,event,cleanText(b.objectType||'site',40),cleanText(b.objectId||'site',100)); return json({ok:true});
  }
  if(p==='paypal/config' && method==='GET'){ const cfg=await paypalConfig(env); const settings=await getSettings(env); return json({ok:true,configured:!!(cfg?.clientId&&cfg?.clientSecret),clientId:cfg?.clientId||'',environment:cfg?.environment||'sandbox',currency:settings.commerce?.currency||'USD'}); }
  if(p==='paypal/create-order' && method==='POST'){
    const cfg=await paypalConfig(env); if(!cfg?.clientId||!cfg?.clientSecret)return json({ok:false,error:'PayPal is not configured.'},503);
    const b=await body(req), cart=await resolveCart(env,b.cart); if(!cart.items.length)return json({ok:false,error:'Cart is empty.'},400);
    const settings=await getSettings(env), commerce=settings.commerce||{}, currency=currencyCode(commerce.currency), shipping=cart.hasPhysical?money(commerce.flatShipping):0, total=money(cart.subtotal+shipping), pp=await paypalAccess(cfg);
    const payload={intent:'CAPTURE',purchase_units:[{amount:{currency_code:currency,value:total.toFixed(2),breakdown:{item_total:{currency_code:currency,value:cart.subtotal.toFixed(2)},shipping:{currency_code:currency,value:shipping.toFixed(2)}}},items:cart.items.map(x=>({name:x.title.slice(0,127),quantity:String(x.qty),unit_amount:{currency_code:currency,value:x.price.toFixed(2)}}))}]};
    const r=await fetch(`${pp.base}/v2/checkout/orders`,{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json','paypal-request-id':id()},body:JSON.stringify(payload)}); const j=await r.json();
    if(!r.ok||!j.id)return json({ok:false,error:'PayPal order creation failed.'},502);
    const snapshot=cart.items.map(x=>({id:x.id,title:x.title,qty:x.qty,price:x.price,kind:x.kind,data:x.data})), created=now(), exp=new Date(Date.now()+2*60*60*1000).toISOString();
    await env.DB.prepare(`INSERT OR REPLACE INTO checkout_sessions(paypal_order_id,cart_json,currency,subtotal,shipping,total,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(j.id,JSON.stringify(snapshot),currency,cart.subtotal,shipping,total,exp,created).run();
    return json({ok:true,paypalOrderId:j.id});
  }
  if(p==='paypal/capture' && method==='POST'){
    const cfg=await paypalConfig(env); if(!cfg)return json({ok:false,error:'PayPal is not configured.'},503); const b=await body(req), paypalOrderId=cleanText(b.paypalOrderId,80); if(!paypalOrderId)return json({ok:false,error:'Missing PayPal order.'},400);
    const existing=await env.DB.prepare('SELECT public_id,total,customer_email FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(existing)return json({ok:true,order:{publicId:existing.public_id,total:existing.total,email:existing.customer_email}});
    const checkout=await env.DB.prepare('SELECT * FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(!checkout||new Date(checkout.expires_at)<=new Date())return json({ok:false,error:'Checkout session expired or invalid.'},409);
    let items=[]; try{items=JSON.parse(checkout.cart_json||'[]')}catch{} if(!items.length)return json({ok:false,error:'Checkout snapshot is invalid.'},409);
    // Re-check physical inventory before charging the customer.
    for(const x of items.filter(i=>i.kind==='physical')){const r=contentRow(await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product' AND status='published'`).bind(x.id).first()); if(!r)return json({ok:false,error:`${x.title} is no longer available.`},409); const inv=r.data.inventory===''||r.data.inventory==null?null:Math.max(0,Math.floor(Number(r.data.inventory)||0)); if(inv!==null&&x.qty>inv)return json({ok:false,error:`${x.title} no longer has enough inventory.`},409);}
    const pp=await paypalAccess(cfg), requestId=('OAHCAP-'+paypalOrderId).slice(0,38);
    const r=await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json','paypal-request-id':requestId}}); const j=await r.json(); if(!r.ok||j.status!=='COMPLETED')return json({ok:false,error:'Payment capture did not complete.'},502);
    const capture=j.purchase_units?.[0]?.payments?.captures?.[0], paidValue=money(capture?.amount?.value), paidCurrency=currencyCode(capture?.amount?.currency_code); if(paidValue!==money(checkout.total)||paidCurrency!==checkout.currency)return json({ok:false,error:'Captured payment did not match the verified checkout total.'},409);
    const settings=await getSettings(env), orderId=id(), publicId=bytesToB64(crypto.getRandomValues(new Uint8Array(24))).replace(/[+/=]/g,''), payer=j.payer||{}, email=cleanText(payer.email_address||b.email||'',160).toLowerCase(), name=cleanText(`${payer.name?.given_name||''} ${payer.name?.surname||''}`.trim()||b.name||'',160), shippingInfo=j.purchase_units?.[0]?.shipping||{}, t=now();
    if(!email)return json({ok:false,error:'PayPal did not return a customer email address.'},409);
    await env.DB.prepare(`INSERT INTO orders(id,public_id,paypal_order_id,customer_email,customer_name,currency,subtotal,shipping,total,status,fulfillment_status,shipping_json,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(orderId,publicId,paypalOrderId,email,name,checkout.currency,checkout.subtotal,checkout.shipping,checkout.total,'paid',items.some(x=>x.kind==='physical')?'unfulfilled':'not_required',JSON.stringify(shippingInfo),JSON.stringify(j),t,t).run();
    for(const x of items){
      await env.DB.prepare(`INSERT INTO order_items(order_id,product_id,title,quantity,unit_price,kind,data) VALUES(?,?,?,?,?,?,?)`).bind(orderId,x.id,x.title,x.qty,x.price,x.kind,JSON.stringify(x.data)).run();
      if(x.kind==='digital')await env.DB.prepare(`INSERT INTO entitlements(id,order_id,product_id,customer_email,downloads_used,downloads_max,created_at) VALUES(?,?,?,?,0,?,?)`).bind(id(),orderId,x.id,email,Math.max(1,Math.min(50,Number(settings.commerce?.downloadsMax)||5)),t).run();
      if(x.kind==='physical'&&x.data.inventory!==''&&x.data.inventory!=null){const latest=contentRow(await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(x.id).first()); if(latest){latest.data.inventory=Math.max(0,(Math.floor(Number(latest.data.inventory)||0)-x.qty)); await env.DB.prepare('UPDATE content_items SET data=?,updated_at=? WHERE id=?').bind(JSON.stringify(latest.data),t,x.id).run();}}
    }
    await env.DB.prepare('DELETE FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).run();
    return json({ok:true,order:{publicId,total:Number(checkout.total),email}});
  }
  const orderMatch=p.match(/^order\/([^/]+)$/); if(orderMatch&&method==='GET'){
    const o=await env.DB.prepare('SELECT id,public_id,customer_email,customer_name,currency,subtotal,shipping,total,status,fulfillment_status,tracking_carrier,tracking_number,created_at FROM orders WHERE public_id=?').bind(orderMatch[1]).first(); if(!o)return json({ok:false},404); const {results=[]}=await env.DB.prepare('SELECT product_id,title,quantity,unit_price,kind FROM order_items WHERE order_id=?').bind(o.id).all(); return json({ok:true,order:{...o,items:results}});
  }
  if(p==='downloads/request'&&method==='POST'){
    const b=await body(req), o=await env.DB.prepare('SELECT id,customer_email FROM orders WHERE public_id=? AND status=?').bind(cleanText(b.publicId,100),'paid').first(); if(!o||o.customer_email.toLowerCase()!==cleanText(b.email,160).toLowerCase())return json({ok:false,error:'Purchase could not be verified.'},403); const ent=await env.DB.prepare('SELECT * FROM entitlements WHERE order_id=? AND product_id=?').bind(o.id,cleanText(b.productId,100)).first(); if(!ent)return json({ok:false,error:'No download entitlement found.'},404); if(ent.downloads_used>=ent.downloads_max)return json({ok:false,error:'Download limit reached.'},429);
    const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), th=await sha(raw), exp=new Date(Date.now()+15*60*1000).toISOString(); await env.DB.prepare('INSERT INTO download_tokens(token_hash,entitlement_id,expires_at) VALUES(?,?,?)').bind(th,ent.id,exp).run(); return json({ok:true,url:`/api/downloads/file?token=${encodeURIComponent(raw)}`,expiresAt:exp});
  }
  if(p==='downloads/file'&&method==='GET'){
    const raw=url.searchParams.get('token')||'', th=await sha(raw), tok=await env.DB.prepare(`SELECT dt.*,e.product_id,e.downloads_used,e.downloads_max FROM download_tokens dt JOIN entitlements e ON e.id=dt.entitlement_id WHERE dt.token_hash=?`).bind(th).first(); if(!tok||tok.used_at||new Date(tok.expires_at)<=new Date())return new Response('Download link expired or invalid.',{status:410}); const pr=contentRow(await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product'`).bind(tok.product_id).first()); if(!pr)return new Response('Product not found.',{status:404});
    const ir=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='dropbox'`).first(); if(!ir||!pr.data.dropboxPath)return new Response('Digital file storage is not configured.',{status:503}); const cfg=await decrypt(env,ir.data_enc); const dr=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:`Bearer ${cfg.accessToken}`,'Dropbox-API-Arg':JSON.stringify({path:pr.data.dropboxPath})}}); if(!dr.ok)return new Response('Storage download failed.',{status:502});
    await env.DB.batch([env.DB.prepare('UPDATE download_tokens SET used_at=? WHERE token_hash=?').bind(now(),th),env.DB.prepare('UPDATE entitlements SET downloads_used=downloads_used+1 WHERE id=?').bind(tok.entitlement_id),env.DB.prepare(`INSERT OR IGNORE INTO analytics(event_type,object_type,object_id,visitor_hash,bucket,value,created_at) VALUES('download','product',?,?,?,1,?)`).bind(pr.id,await visitorHash(req),th.slice(0,40),now())]);
    const h=new Headers(dr.headers); h.set('content-disposition',`attachment; filename="${pr.slug||'download'}.zip"`); h.set('cache-control','no-store'); return new Response(dr.body,{status:200,headers:h});
  }

  const user=await auth(req,env); if(!user)return json({ok:false,error:'Authentication required.'},401);
  if(p==='admin/dashboard'&&method==='GET'){
    const [{c:releases=0}={}, {c:orders=0}={}, {v:revenue=0}={}, {c:plays=0}={}, {c:downloads=0}={}, {c:views=0}={}] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) c FROM content_items WHERE type='release'`).first(), env.DB.prepare(`SELECT COUNT(*) c FROM orders WHERE status='paid'`).first(), env.DB.prepare(`SELECT COALESCE(SUM(total),0) v FROM orders WHERE status='paid'`).first(), env.DB.prepare(`SELECT COALESCE(SUM(value),0) c FROM analytics WHERE event_type='play'`).first(), env.DB.prepare(`SELECT COALESCE(SUM(value),0) c FROM analytics WHERE event_type='download'`).first(), env.DB.prepare(`SELECT COALESCE(SUM(value),0) c FROM analytics WHERE event_type='site_view'`).first()
    ]);
    const [recentOrdersQ,recentQ,toursQ,playsQ,viewsQ,downloadsQ,revenueQ]=await Promise.all([
      env.DB.prepare('SELECT public_id,customer_name,total,status,created_at FROM orders ORDER BY created_at DESC LIMIT 5').all(),
      env.DB.prepare(`SELECT * FROM content_items WHERE type='release' ORDER BY COALESCE(sort_date,created_at) DESC LIMIT 4`).all(),
      env.DB.prepare(`SELECT * FROM content_items WHERE type='tour' AND status='published' AND sort_date>=date('now') ORDER BY sort_date ASC LIMIT 4`).all(),
      env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(value),0) v FROM analytics WHERE event_type='play' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(),
      env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(value),0) v FROM analytics WHERE event_type='site_view' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(),
      env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(value),0) v FROM analytics WHERE event_type='download' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all(),
      env.DB.prepare(`SELECT substr(created_at,1,10) day,COALESCE(SUM(total),0) v FROM orders WHERE status='paid' AND created_at>=datetime('now','-29 days') GROUP BY day ORDER BY day`).all()
    ]);
    return json({ok:true,kpis:{revenue:Number(revenue),orders,releases,plays,downloads,views},recentOrders:recentOrdersQ.results||[],recentReleases:(recentQ.results||[]).map(contentRow),tours:(toursQ.results||[]).map(contentRow),series:{plays:seriesDays(playsQ.results),views:seriesDays(viewsQ.results),downloads:seriesDays(downloadsQ.results),revenue:seriesDays(revenueQ.results)}});
  }
  if(p==='admin/settings'&&method==='GET') return json({ok:true,settings:await getSettings(env)});
  if(p==='admin/settings'&&(method==='PUT'||method==='POST')){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req); for(const [k,v] of Object.entries(b.settings||{}))await setSetting(env,cleanText(k,80),v); return json({ok:true,settings:await getSettings(env)}); }
  if(p==='admin/integrations'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), provider=cleanText(b.provider,40); if(!['paypal','dropbox'].includes(provider))return json({ok:false,error:'Unsupported provider.'},400); const data=provider==='paypal'?{clientId:cleanText(b.clientId,300),clientSecret:String(b.clientSecret||''),environment:b.environment==='live'?'live':'sandbox'}:{accessToken:String(b.accessToken||'')}; if((provider==='paypal'&&!data.clientSecret)||(provider==='dropbox'&&!data.accessToken))return json({ok:false,error:'Required secret missing.'},400); const e=await encrypt(env,data); await env.DB.prepare(`INSERT INTO integrations(provider,data_enc,updated_at) VALUES(?,?,?) ON CONFLICT(provider) DO UPDATE SET data_enc=excluded.data_enc,updated_at=excluded.updated_at`).bind(provider,e,now()).run(); return json({ok:true}); }
  if(p==='admin/integrations'&&method==='GET'){ const {results=[]}=await env.DB.prepare('SELECT provider,updated_at FROM integrations').all(); return json({ok:true,integrations:results}); }
  if(p==='admin/youtube'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), youtubeId=youtubeIdFromUrl(b.url); if(!youtubeId)return json({ok:false,error:'Enter a valid YouTube video URL.'},400); const canonical=`https://www.youtube.com/watch?v=${youtubeId}`; let meta={}; try{const r=await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`,{headers:{accept:'application/json'}}); if(r.ok)meta=await r.json()}catch{} return json({ok:true,youtubeId,title:cleanText(meta.title||'',250),author:cleanText(meta.author_name||'',250),thumbnail:cleanText(meta.thumbnail_url||`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,1000)}); }
  if(p==='admin/orders'&&method==='GET'){ const {results=[]}=await env.DB.prepare('SELECT id,public_id,customer_email,customer_name,currency,total,status,fulfillment_status,tracking_carrier,tracking_number,shipping_json,created_at FROM orders ORDER BY created_at DESC LIMIT 100').all(); return json({ok:true,orders:results.map(o=>({...o,shipping:(()=>{try{return JSON.parse(o.shipping_json||'{}')}catch{return {}}})()}))}); }
  const adminOrder=p.match(/^admin\/orders\/([^/]+)$/); if(adminOrder&&method==='PUT'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), status=['unfulfilled','processing','shipped','delivered','not_required'].includes(b.fulfillmentStatus)?b.fulfillmentStatus:'unfulfilled'; await env.DB.prepare('UPDATE orders SET fulfillment_status=?,tracking_carrier=?,tracking_number=?,updated_at=? WHERE id=?').bind(status,cleanText(b.trackingCarrier,80)||null,cleanText(b.trackingNumber,160)||null,now(),adminOrder[1]).run(); return json({ok:true}); }
  const cRoot=p==='admin/content'; const cId=p.match(/^admin\/content\/([^/]+)$/);
  if(cRoot&&method==='GET'){ const type=url.searchParams.get('type'); if(type&&!ALLOWED_TYPES.has(type))return json({ok:false,error:'Invalid type'},400); const q=type?await env.DB.prepare('SELECT * FROM content_items WHERE type=? ORDER BY COALESCE(sort_date,created_at) DESC').bind(type).all():await env.DB.prepare('SELECT * FROM content_items ORDER BY created_at DESC').all(); return json({ok:true,items:(q.results||[]).map(contentRow)}); }
  if(cRoot&&method==='POST'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const b=await body(req), type=cleanText(b.type,40), title=cleanText(b.title,250).trim();
    if(!ALLOWED_TYPES.has(type))return json({ok:false,error:'Invalid content type.'},400);
    if(!title)return json({ok:false,error:'Title is required.'},400);
    const itemId=id(), t=now(), data={...(b.data||{})};
    if(type==='page')data.html=sanitizeHtml(data.html||'');
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
      if(data.kind!=='digital')data.kind='physical';
    }
    await env.DB.prepare(`INSERT INTO content_items(id,type,slug,title,status,sort_date,featured,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(itemId,type,cleanSlug(b.slug||title),title,b.status==='draft'?'draft':'published',cleanText(b.sortDate||'',40)||null,b.featured?1:0,JSON.stringify(data),t,t).run();
    return json({ok:true,id:itemId});
  }
  if(cId&&method==='PUT'){
    if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403);
    const existing=contentRow(await env.DB.prepare('SELECT * FROM content_items WHERE id=?').bind(cId[1]).first());
    if(!existing)return json({ok:false,error:'Content item not found.'},404);
    const b=await body(req), title=cleanText(b.title??existing.title,250).trim(), data={...(b.data??existing.data)};
    if(!title)return json({ok:false,error:'Title is required.'},400);
    if(existing.type==='page')data.html=sanitizeHtml(data.html||'');
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
      if(data.kind!=='digital')data.kind='physical';
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
    return await route(context.request,context.env,new URL(context.request.url));
  }catch(err){ console.error('OneArtist API error',err); return json({ok:false,error:'Server error',message:String(err?.message||err)},500); }
}
