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

const MIGRATION_012 = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_password_reset_admin ON password_reset_tokens(admin_id,created_at DESC);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, link TEXT, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE TABLE IF NOT EXISTS notification_preferences (id INTEGER PRIMARY KEY CHECK(id=1), new_order INTEGER NOT NULL DEFAULT 1, digital_sale INTEGER NOT NULL DEFAULT 1, physical_sale INTEGER NOT NULL DEFAULT 1, shipping_updates INTEGER NOT NULL DEFAULT 1, security_alerts INTEGER NOT NULL DEFAULT 1, low_inventory INTEGER NOT NULL DEFAULT 1, low_inventory_threshold INTEGER NOT NULL DEFAULT 5, updated_at TEXT NOT NULL);
INSERT OR IGNORE INTO notification_preferences(id,updated_at) VALUES(1,datetime('now'));
CREATE TABLE IF NOT EXISTS email_log (id TEXT PRIMARY KEY, recipient TEXT NOT NULL, template TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL, provider TEXT, provider_message_id TEXT, error TEXT, created_at TEXT NOT NULL, sent_at TEXT);
CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at DESC);`;
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

const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function emailConfig(env){ const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='email'`).first(); return r?decrypt(env,r.data_enc):null; }
async function notificationPrefs(env){ const r=await env.DB.prepare('SELECT * FROM notification_preferences WHERE id=1').first(); return r||{new_order:1,digital_sale:1,physical_sale:1,shipping_updates:1,security_alerts:1,low_inventory:1,low_inventory_threshold:5}; }
async function createNotification(env,type,title,message,link=''){ await env.DB.prepare('INSERT INTO notifications(id,type,title,message,link,is_read,created_at) VALUES(?,?,?,?,?,0,?)').bind(id(),cleanText(type,40),cleanText(title,180),cleanText(message,1200),cleanText(link,80)||null,now()).run(); }
async function sendEmail(env,{to,subject,html,text='',template='generic'}){
  const cfg=await emailConfig(env); if(!cfg?.apiKey||!cfg?.fromEmail) return {ok:false,skipped:true,error:'Email provider is not configured.'};
  const logId=id(), created=now(), provider=cfg.service||'resend';
  try{
    if(provider!=='resend') throw new Error('Unsupported email service.');
    const from=cfg.fromName?`${cleanText(cfg.fromName,120)} <${cleanText(cfg.fromEmail,220)}>`:cleanText(cfg.fromEmail,220);
    const payload={from,to:[cleanText(to,220)],subject:cleanText(subject,300),html:String(html||''),text:cleanText(text,10000)};
    if(cfg.replyTo) payload.reply_to=cleanText(cfg.replyTo,220);
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${cfg.apiKey}`,'content-type':'application/json'},body:JSON.stringify(payload)});
    let j={}; try{j=await r.json()}catch{}
    if(!r.ok) throw new Error(cleanText(j.message||j.error||`Email provider returned ${r.status}`,500));
    await env.DB.prepare('INSERT INTO email_log(id,recipient,template,subject,status,provider,provider_message_id,error,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(logId,cleanText(to,220),template,cleanText(subject,300),'sent',provider,cleanText(j.id||'',160)||null,null,created,now()).run();
    return {ok:true,id:j.id||''};
  }catch(err){
    await env.DB.prepare('INSERT INTO email_log(id,recipient,template,subject,status,provider,provider_message_id,error,created_at,sent_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(logId,cleanText(to,220),template,cleanText(subject,300),'failed',provider,null,cleanText(err?.message||err,800),created,null).run();
    console.error('OneArtist email error',err); return {ok:false,error:String(err?.message||err)};
  }
}
async function emailShell(env,title,content){ const settings=await getSettings(env), artist=htmlEscape(settings.artist?.name||settings.site?.title||'OneArtist Hub'), accent=htmlEscape(settings.site?.accent||'#b45cff'); return `<!doctype html><html><body style="margin:0;background:#070812;color:#eef1ff;font-family:Arial,sans-serif"><div style="max-width:640px;margin:0 auto;padding:30px 18px"><div style="padding:26px;border:1px solid #282b45;border-radius:18px;background:#0d0f1d"><div style="font-size:13px;letter-spacing:.14em;color:${accent};text-transform:uppercase">${artist}</div><h1 style="margin:8px 0 18px;font-size:28px">${htmlEscape(title)}</h1>${content}<div style="margin-top:26px;padding-top:18px;border-top:1px solid #282b45;color:#8f96b3;font-size:12px">Powered by OneArtist Hub</div></div></div></body></html>`; }
async function adminEmail(env){ const a=await env.DB.prepare('SELECT email FROM admins ORDER BY id LIMIT 1').first(); return a?.email||''; }
async function sendSecurityEmail(env,to,title,message){ if(!to)return; const prefs=await notificationPrefs(env); if(!prefs.security_alerts)return {ok:false,skipped:true}; const html=await emailShell(env,title,`<p style="line-height:1.7;color:#cdd1e4">${htmlEscape(message)}</p>`); return sendEmail(env,{to,subject:title,html,text:message,template:'security'}); }
async function sendOrderEmails(env,order,items,url){
  const prefs=await notificationPrefs(env), settings=await getSettings(env), currency=order.currency||'USD', hasPhysical=items.some(x=>x.kind==='physical'), hasDigital=items.some(x=>x.kind==='digital');
  const rows=items.map(x=>`<tr><td style="padding:9px 0;border-bottom:1px solid #24263c">${htmlEscape(x.title)} × ${x.qty}</td><td style="padding:9px 0;border-bottom:1px solid #24263c;text-align:right">${new Intl.NumberFormat('en-US',{style:'currency',currency}).format(Number(x.price)*Number(x.qty))}</td></tr>`).join('');
  const receiptUrl=`${url.origin}/order/${encodeURIComponent(order.publicId)}`;
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
async function paypalWebhookVerify(req,rawEvent,cfg){
  if(!cfg?.webhookId)throw new Error('PayPal Webhook ID is not configured.');
  const pp=await paypalAccess(cfg), headers={auth_algo:req.headers.get('paypal-auth-algo')||'',cert_url:req.headers.get('paypal-cert-url')||'',transmission_id:req.headers.get('paypal-transmission-id')||'',transmission_sig:req.headers.get('paypal-transmission-sig')||'',transmission_time:req.headers.get('paypal-transmission-time')||'',webhook_id:cfg.webhookId};
  if([headers.auth_algo,headers.cert_url,headers.transmission_id,headers.transmission_sig,headers.transmission_time].some(v=>!v))throw new Error('PayPal webhook signature headers are incomplete.');
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
  const saleLabel=items.some(x=>x.kind==='physical')?'New merchandise order':'New digital sale'; await createNotification(env,'sale',saleLabel,`${name||email} purchased ${items.map(x=>x.title).join(', ')} for ${checkout.total} ${checkout.currency}.`,'orders'); const orderForEmail={publicId,total:Number(checkout.total),email,name,currency:checkout.currency}; const task=sendOrderEmails(env,orderForEmail,items,url); ctx?.waitUntil?ctx.waitUntil(task):await task;
  const prefs=await notificationPrefs(env); if(prefs.low_inventory){for(const x of low.filter(x=>x.remaining<=Number(prefs.low_inventory_threshold||5))){const inventoryMessage=`${x.label} has ${x.remaining} item(s) remaining.`;await createNotification(env,'inventory','Low inventory',inventoryMessage,'product');const ae=await adminEmail(env);if(ae){const html=await emailShell(env,'Low inventory',`<p style=\"color:#cdd1e4\">${htmlEscape(inventoryMessage)}</p>`);const lowTask=sendEmail(env,{to:ae,subject:`Low inventory — ${x.label}`,html,text:inventoryMessage,template:'low_inventory'});ctx?.waitUntil?ctx.waitUntil(lowTask):await lowTask;}}}
  return orderPayload(env,await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(orderId).first());
}

async function route(req,env,url,ctx){
  if(!env.DB) return json({ok:false,error:'D1 binding DB is missing. Add a D1 binding named DB in Cloudflare.'},503);
  const p=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
  const method=req.method.toUpperCase();
  const installed=await isInstalled(env); if(installed){await ensureUpgrade012(env);await ensureUpgrade013(env);}
  if(p==='status' && method==='GET') return json({ok:true,installed,version:'0.1.3'});
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
    await env.DB.batch([env.DB.prepare('UPDATE admins SET password_hash=?,password_salt=? WHERE id=?').bind(ph,salt,row.admin_id),env.DB.prepare('UPDATE password_reset_tokens SET used_at=? WHERE token_hash=?').bind(t,th),env.DB.prepare('DELETE FROM sessions WHERE admin_id=?').bind(row.admin_id)]);
    await createNotification(env,'security','Password reset','The administrator password was reset using email recovery.','security');
    const task=sendSecurityEmail(env,row.email,'OneArtist Hub password changed','Your administrator password was reset. If this was not you, review your account and email provider immediately.'); ctx?.waitUntil?ctx.waitUntil(task):await task;
    return json({ok:true});
  }

  if(p==='auth/emergency-reset' && method==='POST'){
    const b=await body(req); if(!env.ONEARTIST_SETUP_KEY||String(b.setupKey||'')!==env.ONEARTIST_SETUP_KEY)return json({ok:false,error:'Invalid recovery key.'},403);
    const login=cleanText(b.login,160).trim(), password=String(b.password||''); if(password.length<10)return json({ok:false,error:'New password must be at least 10 characters.'},400);
    const a=await env.DB.prepare('SELECT * FROM admins WHERE username=? OR email=?').bind(login,login.toLowerCase()).first(); if(!a)return json({ok:false,error:'Administrator account was not found.'},404);
    const salt=bytesToB64(crypto.getRandomValues(new Uint8Array(18))), ph=await hashPassword(password,salt); await env.DB.batch([env.DB.prepare('UPDATE admins SET password_hash=?,password_salt=? WHERE id=?').bind(ph,salt,a.id),env.DB.prepare('DELETE FROM sessions WHERE admin_id=?').bind(a.id)]); await createNotification(env,'security','Emergency password recovery','The administrator password was reset with the deployment recovery key.','security'); return json({ok:true});
  }
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
    const verified=await paypalWebhookVerify(req,raw,cfg); if(!verified)return json({ok:false,error:'Webhook signature verification failed.'},400); const eventId=cleanText(event.id,160), eventType=cleanText(event.event_type,120); if(!eventId)return json({ok:false,error:'Webhook event ID is missing.'},400);
    const seen=await env.DB.prepare('SELECT event_id,status FROM webhook_events WHERE event_id=?').bind(eventId).first(); if(seen?.status==='processed')return json({ok:true,duplicate:true}); if(!seen)await env.DB.prepare('INSERT INTO webhook_events(event_id,event_type,status,payload,created_at) VALUES(?,?,?,?,?)').bind(eventId,eventType,'processing',raw,now()).run(); else await env.DB.prepare('UPDATE webhook_events SET status=?,error=NULL WHERE event_id=?').bind('processing',eventId).run();
    try{
      const resource=event.resource||{}, paypalOrderId=resource.supplementary_data?.related_ids?.order_id||resource.id||'';
      if(eventType==='CHECKOUT.ORDER.APPROVED'){
        const existing=await env.DB.prepare('SELECT id FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(!existing){const checkout=await env.DB.prepare('SELECT * FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).first(); if(checkout&&new Date(checkout.expires_at)>new Date()){const items=parseJson(checkout.cart_json,[]),pp=await paypalAccess(cfg),cap=await paypalCaptureOrRecover(pp,paypalOrderId,('OAWH-'+paypalOrderId).slice(0,38)),jj=cap.order;if(cap.ok&&jj.status==='COMPLETED'&&paypalCaptureStatus(jj)==='COMPLETED')await finalizeCapturedOrder(env,url,paypalOrderId,jj,items,checkout,ctx,{})}}
      } else if(eventType==='PAYMENT.CAPTURE.PENDING'){
        // Keep the verified checkout snapshot; do not fulfill until COMPLETED arrives.
      } else if(eventType==='PAYMENT.CAPTURE.COMPLETED'){
        let order=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first();
        if(order){await env.DB.prepare("UPDATE orders SET status='paid',updated_at=? WHERE id=?").bind(now(),order.id).run();await recordTransaction(env,{orderId:order.id,type:'capture',providerId:resource.id,status:resource.status||'COMPLETED',amount:resource.amount?.value||order.total,currency:resource.amount?.currency_code||order.currency,data:resource});}
        else {const checkout=await env.DB.prepare('SELECT * FROM checkout_sessions WHERE paypal_order_id=?').bind(paypalOrderId).first();if(checkout&&new Date(checkout.expires_at)>new Date()){const items=parseJson(checkout.cart_json,[]),pp=await paypalAccess(cfg),or=await fetch(`${pp.base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,{headers:{authorization:`Bearer ${pp.token}`}}),oj=await or.json();if(or.ok&&oj.status==='COMPLETED')await finalizeCapturedOrder(env,url,paypalOrderId,oj,items,checkout,ctx,{})}}
      } else if(eventType==='PAYMENT.CAPTURE.REFUNDED'){
        const order=await env.DB.prepare('SELECT * FROM orders WHERE paypal_order_id=?').bind(paypalOrderId).first();
        if(order){
          const prior=await transactionByProvider(env,'refund',resource.id);
          if(!prior||String(prior.status||'').toUpperCase()!=='COMPLETED'){
            const doc=await orderDocument(env,order.id), amt=money(resource.amount?.value), refunded=money(Number(doc?.refunded_amount||0)+amt), full=refunded>=money(order.total), ts=now();
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
  const orderMatch=p.match(/^order\/([^/]+)$/); if(orderMatch&&method==='GET'){ const o=await env.DB.prepare('SELECT * FROM orders WHERE public_id=?').bind(orderMatch[1]).first(); if(!o)return json({ok:false},404); return json({ok:true,order:await orderPayload(env,o)}); }
  if(p==='downloads/request'&&method==='POST'){
    const b=await body(req), o=await env.DB.prepare(`SELECT id,customer_email,status FROM orders WHERE public_id=? AND status IN ('paid','partially_refunded')`).bind(cleanText(b.publicId,100)).first(); if(!o||o.customer_email.toLowerCase()!==cleanText(b.email,160).toLowerCase())return json({ok:false,error:'Purchase could not be verified.'},403); const ent=await env.DB.prepare('SELECT * FROM entitlements WHERE order_id=? AND product_id=?').bind(o.id,cleanText(b.productId,100)).first(); if(!ent)return json({ok:false,error:'No download entitlement found.'},404); if(ent.downloads_used>=ent.downloads_max)return json({ok:false,error:'Download limit reached.'},429); const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), th=await sha(raw), exp=new Date(Date.now()+15*60*1000).toISOString(); await env.DB.prepare('INSERT INTO download_tokens(token_hash,entitlement_id,expires_at) VALUES(?,?,?)').bind(th,ent.id,exp).run(); return json({ok:true,url:`/api/downloads/file?token=${encodeURIComponent(raw)}`,expiresAt:exp});
  }
  if(p==='downloads/file'&&method==='GET'){
    const raw=url.searchParams.get('token')||'', th=await sha(raw), tok=await env.DB.prepare(`SELECT dt.*,e.product_id,e.downloads_used,e.downloads_max FROM download_tokens dt JOIN entitlements e ON e.id=dt.entitlement_id WHERE dt.token_hash=?`).bind(th).first(); if(!tok||tok.used_at||new Date(tok.expires_at)<=new Date())return new Response('Download link expired or invalid.',{status:410}); const pr=contentRow(await env.DB.prepare(`SELECT * FROM content_items WHERE id=? AND type='product'`).bind(tok.product_id).first()); if(!pr)return new Response('Product not found.',{status:404});
    const ir=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='dropbox'`).first(); if(!ir||!pr.data.dropboxPath)return new Response('Digital file storage is not configured.',{status:503}); const cfg=await decrypt(env,ir.data_enc); const dr=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{authorization:`Bearer ${cfg.accessToken}`,'Dropbox-API-Arg':JSON.stringify({path:pr.data.dropboxPath})}}); if(!dr.ok)return new Response('Storage download failed.',{status:502});
    await env.DB.batch([env.DB.prepare('UPDATE download_tokens SET used_at=? WHERE token_hash=?').bind(now(),th),env.DB.prepare('UPDATE entitlements SET downloads_used=downloads_used+1 WHERE id=?').bind(tok.entitlement_id),env.DB.prepare(`INSERT OR IGNORE INTO analytics(event_type,object_type,object_id,visitor_hash,bucket,value,created_at) VALUES('download','product',?,?,?,1,?)`).bind(pr.id,await visitorHash(req),th.slice(0,40),now())]);
    const h=new Headers(dr.headers); h.set('content-disposition',`attachment; filename="${pr.slug||'download'}.zip"`); h.set('cache-control','no-store'); return new Response(dr.body,{status:200,headers:h});
  }

  if(p==='customer/magic-link'&&method==='POST'){
    const b=await body(req), email=cleanText(b.email,160).trim().toLowerCase(), generic={ok:true,message:'If purchases exist for that email and email delivery is configured, a secure sign-in link has been sent.'}; if(!email.includes('@'))return json(generic); const order=await env.DB.prepare(`SELECT id FROM orders WHERE customer_email=? AND status IN ('paid','partially_refunded','refunded') LIMIT 1`).bind(email).first(); if(!order)return json(generic); const recent=await env.DB.prepare(`SELECT COUNT(*) c FROM customer_magic_tokens WHERE email=? AND created_at>=datetime('now','-15 minutes')`).bind(email).first(); if(Number(recent?.c||0)>=4)return json(generic); const raw=bytesToB64(crypto.getRandomValues(new Uint8Array(36))).replace(/[+/=]/g,''), th=await sha(raw), exp=new Date(Date.now()+20*60*1000).toISOString(); await env.DB.prepare('INSERT INTO customer_magic_tokens(token_hash,email,expires_at,used_at,created_at) VALUES(?,?,?,?,?)').bind(th,email,exp,null,now()).run(); const link=`${url.origin}/account?token=${encodeURIComponent(raw)}`, html=await emailShell(env,'Your secure customer account link',`<p style=\"color:#cdd1e4;line-height:1.7\">Use this one-time link to view receipts, order status and available downloads. It expires in 20 minutes.</p><p><a href=\"${link}\" style=\"display:inline-block;padding:12px 18px;border-radius:999px;background:#8d66ff;color:#fff;text-decoration:none\">Open My Account</a></p>`); const task=sendEmail(env,{to:email,subject:'Your secure artist store account link',html,text:`Open your account: ${link}`,template:'customer_magic_link'}); ctx?.waitUntil?ctx.waitUntil(task):await task; return json(generic);
  }
  if(p==='customer/consume'&&method==='POST'){ const b=await body(req), th=await sha(String(b.token||'')), tok=await env.DB.prepare('SELECT * FROM customer_magic_tokens WHERE token_hash=?').bind(th).first(); if(!tok||tok.used_at||new Date(tok.expires_at)<=new Date())return json({ok:false,error:'This sign-in link is invalid or expired.'},410); const sid=bytesToB64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g,''), exp=new Date(Date.now()+30*864e5).toISOString(); await env.DB.batch([env.DB.prepare('UPDATE customer_magic_tokens SET used_at=? WHERE token_hash=?').bind(now(),th),env.DB.prepare('INSERT INTO customer_sessions(id,email,expires_at,created_at) VALUES(?,?,?,?)').bind(sid,tok.email,exp,now())]); return json({ok:true,email:tok.email},200,{'set-cookie':`oah_customer_session=${encodeURIComponent(sid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`}); }
  if(p==='customer/me'&&method==='GET'){const c=await customerAuth(req,env);return c?json({ok:true,email:c.email}):json({ok:false},401)}
  if(p==='customer/logout'&&method==='POST'){const c=await customerAuth(req,env);if(c)await env.DB.prepare('DELETE FROM customer_sessions WHERE id=?').bind(c.id).run();return json({ok:true},200,{'set-cookie':'oah_customer_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'})}
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
  if(p==='admin/notification-preferences'&&method==='GET'){ return json({ok:true,preferences:await notificationPrefs(env)}); }
  if(p==='admin/notification-preferences'&&method==='PUT'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), f=x=>b[x]===false||b[x]===0?0:1, threshold=Math.max(1,Math.min(100,Math.floor(Number(b.low_inventory_threshold)||5))); await env.DB.prepare(`UPDATE notification_preferences SET new_order=?,digital_sale=?,physical_sale=?,shipping_updates=?,security_alerts=?,low_inventory=?,low_inventory_threshold=?,updated_at=? WHERE id=1`).bind(f('new_order'),f('digital_sale'),f('physical_sale'),f('shipping_updates'),f('security_alerts'),f('low_inventory'),threshold,now()).run(); return json({ok:true,preferences:await notificationPrefs(env)}); }
  if(p==='admin/email/config'&&method==='GET'){ const cfg=await emailConfig(env); return json({ok:true,configured:!!(cfg?.apiKey&&cfg?.fromEmail),service:cfg?.service||'resend',fromName:cfg?.fromName||'',fromEmail:cfg?.fromEmail||'',replyTo:cfg?.replyTo||''}); }
  if(p==='admin/email/test'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), to=cleanText(b.to||user.email,220); const html=await emailShell(env,'Email test','<p style="color:#cdd1e4">Your OneArtist Hub email integration is working.</p>'); const result=await sendEmail(env,{to,subject:'OneArtist Hub email test',html,text:'Your OneArtist Hub email integration is working.',template:'test'}); if(!result.ok)return json({ok:false,error:result.error||'Test email failed.'},502); return json({ok:true}); }
  if(p==='admin/paypal/config'&&method==='GET'){ const cfg=await paypalConfig(env); return json({ok:true,configured:!!(cfg?.clientId&&cfg?.clientSecret),clientId:cfg?.clientId||'',environment:cfg?.environment||'sandbox',webhookId:cfg?.webhookId||'',webhookConfigured:!!cfg?.webhookId}); }
  if(p==='admin/integrations'&&method==='POST'){ if(!requireCsrf(req,user))return json({ok:false,error:'CSRF validation failed.'},403); const b=await body(req), provider=cleanText(b.provider,40); if(!['paypal','dropbox','email'].includes(provider))return json({ok:false,error:'Unsupported provider.'},400); let data={}; if(provider==='paypal'){let previous=null;try{previous=await paypalConfig(env)}catch{} data={clientId:cleanText(b.clientId||previous?.clientId||'',300),clientSecret:String(b.clientSecret||previous?.clientSecret||''),environment:b.environment==='live'?'live':'sandbox',webhookId:cleanText(b.webhookId??previous?.webhookId??'',80)};} else if(provider==='dropbox'){let previous=null;try{const r=await env.DB.prepare(`SELECT data_enc FROM integrations WHERE provider='dropbox'`).first();if(r)previous=await decrypt(env,r.data_enc)}catch{} data={accessToken:String(b.accessToken||previous?.accessToken||'')};} else { let previous=null; try{previous=await emailConfig(env)}catch{} data={service:'resend',apiKey:String(b.apiKey||previous?.apiKey||''),fromName:cleanText(b.fromName||previous?.fromName||'',120),fromEmail:cleanText(b.fromEmail||previous?.fromEmail||'',220).trim(),replyTo:cleanText(b.replyTo||previous?.replyTo||'',220).trim()}; } if((provider==='paypal'&&(!data.clientId||!data.clientSecret))||(provider==='dropbox'&&!data.accessToken)||(provider==='email'&&(!data.apiKey||!data.fromEmail)))return json({ok:false,error:'Required secret or sender information is missing.'},400); const e=await encrypt(env,data); await env.DB.prepare(`INSERT INTO integrations(provider,data_enc,updated_at) VALUES(?,?,?) ON CONFLICT(provider) DO UPDATE SET data_enc=excluded.data_enc,updated_at=excluded.updated_at`).bind(provider,e,now()).run(); return json({ok:true}); }
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
      if(data.kind!=='digital'){data.kind='physical';data.variants=normalizeVariants(data.variants);}else{data.kind='digital';data.variants=[];}
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
    return await route(context.request,context.env,new URL(context.request.url),context);
  }catch(err){ console.error('OneArtist API error',err); return json({ok:false,error:'Server error',message:String(err?.message||err)},500); }
}
