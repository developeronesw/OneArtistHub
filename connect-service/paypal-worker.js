function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const clean=(v,n=500)=>String(v??'').replace(/\0/g,'').slice(0,n)
const JSON_POST_ROUTES=new Set(['/installations/activate','/installations/register','/installations/revoke','/onboard/start','/onboard/status','/paypal/create-order','/paypal/order','/paypal/capture','/paypal/refund','/paypal/webhook/verify','/square/connect/start','/square/disconnect','/square/checkout','/square/order','/software/checkout','/software/contact','/software/webhook','/admin/login','/admin/logout','/admin/products','/admin/settings/email','/admin/email/test'])
function base64url(value){return btoa(typeof value==='string'?value:JSON.stringify(value)).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')}
function authAssertion(clientId,merchantId){return `${base64url({alg:'none'})}.${base64url({iss:clientId,payer_id:merchantId})}.`}
function configurationError(message){const error=new Error(message);error.status=503;return error}
function partnerAttribution(env){const value=clean(env.PAYPAL_PARTNER_ATTRIBUTION_ID,255).trim();if(!value)throw configurationError('PayPal partner attribution ID is not configured.');return value}
async function paypalAccess(env){
  const base=env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
  const token=btoa(`${env.PAYPAL_PARTNER_CLIENT_ID}:${env.PAYPAL_PARTNER_SECRET}`);
  const r=await fetch(base+'/v1/oauth2/token',{method:'POST',headers:{authorization:`Basic ${token}`,'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  if(!r.ok)throw new Error('PayPal partner authentication failed.');
  const j=await r.json();return {base,token:j.access_token};
}
function installationRoutes(env){try{const routes=JSON.parse(String(env.CONNECT_INSTALLATION_ROUTES||'{}'));return routes&&typeof routes==='object'?routes:{}}catch{return {}}}
function bearer(req){const value=req.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7):''}
function bytesToB64url(bytes){let value='';for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value).replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_')}
function b64urlToBytes(value){const normalized=String(value).replace(/-/g,'+').replace(/_/g,'/'),padded=normalized+'='.repeat((4-normalized.length%4)%4);const raw=atob(padded),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function installationToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return `OAH_INST_${Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}`}
function installationId(){const bytes=crypto.getRandomValues(new Uint8Array(16));return `OAH_SITE_${Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}`}
function validInstallationId(value){return /^OAH_SITE_[a-f0-9]{32}$/.test(String(value||''))}
function validRoute(value){try{const url=new URL(String(value));return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash?url.toString().replace(/\/+$/,''):''}catch{return ''}}
async function tokenHash(token){return bytesToB64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(token)))))}
async function registryCryptoKey(env){if(!env.CONNECT_SHARED_SECRET)throw configurationError('CONNECT_SHARED_SECRET is not configured.');const raw=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(env.CONNECT_SHARED_SECRET)));return crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encryptRegistryToken(env,token){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await registryCryptoKey(env),data=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(token));return `${bytesToB64url(iv)}.${bytesToB64url(new Uint8Array(data))}`}
async function decryptRegistryToken(env,value){const [iv,data]=String(value||'').split('.');if(!iv||!data)return '';try{const out=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64urlToBytes(iv)},await registryCryptoKey(env),b64urlToBytes(data));return new TextDecoder().decode(out)}catch{return ''}}
function registry(env){return env.CONNECT_INSTALLATIONS&&typeof env.CONNECT_INSTALLATIONS.get==='function'?env.CONNECT_INSTALLATIONS:null}
const installationKey=id=>`installation:${id}`
const activationKey=id=>`activation:${id}`
const tokenKey=hash=>`token:${hash}`
const merchantKey=id=>`merchant:${id}`
const squareKey=id=>`square:${id}`
const squareOAuthKey=state=>`square-oauth:${state}`
async function registryInstallation(env,id){const kv=registry(env);if(!kv||!validInstallationId(id))return null;try{const record=await kv.get(installationKey(id),'json');return record&&record.installationId===id?record:null}catch{return null}}
async function registryByToken(env,token){const kv=registry(env);if(!kv||!token)return null;const hash=await tokenHash(token);try{const id=await kv.get(tokenKey(hash));const record=await registryInstallation(env,id);return record?.active&&record.tokenHash===hash?record:null}catch{return null}}
async function registryMerchant(env,merchantId){const kv=registry(env),id=clean(merchantId,64);if(!kv||!id)return null;try{return registryInstallation(env,await kv.get(merchantKey(id)))}catch{return null}}
async function putRegistryInstallation(env,record){const kv=registry(env);if(!kv)throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');await kv.put(installationKey(record.installationId),JSON.stringify(record));await kv.put(tokenKey(record.tokenHash),record.installationId);if(record.merchantId)await kv.put(merchantKey(record.merchantId),record.installationId)}
async function legacyInstallationAuthorized(env,token){try{const tokens=JSON.parse(String(env.CONNECT_INSTALLATION_TOKENS||'[]'));if(Array.isArray(tokens)&&tokens.includes(token))return true}catch{}return Object.values(installationRoutes(env)).some(route=>route&&route.token===token)}
async function createActivation(env,{installationId,url,bootstrapHash}){const route=validRoute(url),hash=clean(bootstrapHash,128);if(!validInstallationId(installationId)||!route||!/^[A-Za-z0-9_-]{43}$/.test(hash))throw Object.assign(new Error('A valid installation ID, HTTPS callback URL and SHA-256 bootstrap hash are required.'),{status:400});const kv=registry(env);if(!kv)throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');if(await registryInstallation(env,installationId))throw Object.assign(new Error('Installation ID is already registered.'),{status:409});const existing=await kv.get(activationKey(installationId),'json');if(existing){if(existing.installationId===installationId&&existing.url===route&&existing.bootstrapHash===hash)return {reused:true};throw Object.assign(new Error('Installation ID already has a different activation.'),{status:409});}await kv.put(activationKey(installationId),JSON.stringify({installationId,url:route,bootstrapHash:hash,active:true,createdAt:new Date().toISOString()}));return {reused:false}}
async function consumeActivation(env,installationId,route,token){const kv=registry(env);if(!kv||!token)return false;try{const activation=await kv.get(activationKey(installationId),'json');return !!activation&&activation.installationId===installationId&&activation.url===route&&activation.bootstrapHash===await tokenHash(token)}catch{return false}}
async function authorized(req,env){const token=bearer(req);if(!token)return false;return !!(await registryByToken(env,token))||await legacyInstallationAuthorized(env,token)}
async function installationAuthorized(req,env){const token=bearer(req);return !!token&&(!!(await registryByToken(env,token))||await legacyInstallationAuthorized(env,token))}
async function authorizedForMerchant(req,env,merchantId){const token=bearer(req);const record=await registryMerchant(env,merchantId);if(record?.active)return record.tokenHash===await tokenHash(token);const route=installationRoutes(env)[clean(merchantId,64)];return !!route?.token&&token===String(route.token)}
async function registerInstallation(env,{installationId,url}){const route=validRoute(url);if(!validInstallationId(installationId)||!route)throw Object.assign(new Error('A valid installationId and HTTPS callback URL are required.'),{status:400});if(!registry(env))throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');const existing=await registryInstallation(env,installationId);if(existing){if(existing.url!==route)throw Object.assign(new Error('Installation ID is already bound to a different callback URL.'),{status:409});const token=await decryptRegistryToken(env,existing.tokenCipher);if(!token)throw configurationError('Installation registry credential could not be read.');if(!existing.active){existing.active=true;existing.updatedAt=new Date().toISOString();await putRegistryInstallation(env,existing)}return {installationId,token,reused:true};}const token=installationToken(),record={installationId,url:route,tokenHash:await tokenHash(token),tokenCipher:await encryptRegistryToken(env,token),active:true,merchantId:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await putRegistryInstallation(env,record);return {installationId,token,reused:false}}
async function revokeInstallation(env,installationId){const record=await registryInstallation(env,installationId);if(!record)throw Object.assign(new Error('Installation was not found.'),{status:404});record.active=false;record.updatedAt=new Date().toISOString();await putRegistryInstallation(env,record)}
async function associateMerchant(env,token,merchantId){const record=await registryByToken(env,token);if(!record)return false;const existing=await registryMerchant(env,merchantId);if(existing&&existing.installationId!==record.installationId)return false;record.merchantId=clean(merchantId,64);record.updatedAt=new Date().toISOString();await putRegistryInstallation(env,record);return true}
async function squareConfig(env){
  const environment=env.SQUARE_ENV==='sandbox'?'sandbox':'production';
  const clientId=clean(env.SQUARE_CLIENT_ID,191).trim();
  const clientSecret=String(env.SQUARE_CLIENT_SECRET||'');
  if(!clientId||!clientSecret)throw configurationError('Square OAuth is not configured.');
  const base=environment==='sandbox'?'https://connect.squareupsandbox.com':'https://connect.squareup.com';
  const redirect=String(env.SQUARE_REDIRECT_URI||'https://connect.oneartisthub.site/square/oauth/callback');
  if(!/^https:\/\//i.test(redirect))throw configurationError('Square OAuth redirect URI must use HTTPS.');
  return {environment,clientId,clientSecret,base,redirect};
}
async function squareConnection(env,installationId){
  const record=await registryInstallation(env,installationId); if(!record?.squareConnected)return null;
  const kv=registry(env); if(!kv)return null;
  try{
    const cipher=await kv.get(squareKey(installationId)); if(!cipher)return null;
    const value=await decryptRegistryToken(env,cipher); if(!value)return null;
    return JSON.parse(value);
  }catch{return null}
}
async function saveSquareConnection(env,installationId,value){
  const kv=registry(env); if(!kv)throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');
  await kv.put(squareKey(installationId),await encryptRegistryToken(env,JSON.stringify(value)));
}
async function clearSquareConnection(env,installationId){const kv=registry(env);if(kv)await kv.delete(squareKey(installationId))}
async function squareToken(env,installationId){
  const cfg=await squareConfig(env), connection=await squareConnection(env,installationId);
  if(!connection?.accessToken||!connection?.refreshToken)return null;
  const stale=!connection.updatedAt||Date.now()-new Date(connection.updatedAt).getTime()>7*86400000;
  const expiring=!connection.expiresAt||new Date(connection.expiresAt).getTime()-Date.now()<7*86400000;
  if(stale||expiring){
    const r=await fetch(cfg.base+'/oauth2/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_id:cfg.clientId,client_secret:cfg.clientSecret,grant_type:'refresh_token',refresh_token:connection.refreshToken})});
    let j={};try{j=await r.json()}catch{}
    if(!r.ok||!j.access_token)throw new Error('Square access token refresh failed.');
    connection.accessToken=j.access_token;connection.refreshToken=j.refresh_token||connection.refreshToken;connection.expiresAt=j.expires_at||connection.expiresAt;connection.updatedAt=new Date().toISOString();await saveSquareConnection(env,installationId,connection);
  }
  return {cfg,connection};
}
async function squareApi(env,installationId,path,{method='GET',body}={}){
  const token=await squareToken(env,installationId); if(!token)throw Object.assign(new Error('Square is not connected for this installation.'),{status:409});
  const r=await fetch(token.cfg.base+'/v2'+path,{method,headers:{authorization:'Bearer '+token.connection.accessToken,'content-type':'application/json','Square-Version':'2026-09-16'},body:body===undefined?undefined:JSON.stringify(body)});
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(clean(data?.errors?.[0]?.detail||data?.errors?.[0]?.code||'Square API request failed.',500)),{status:r.status});
  return data;
}
async function squareRefreshAll(env){
  const kv=registry(env);if(!kv)return;
  let cursor;
  do{
    const page=await kv.list({prefix:'installation:',cursor});
    for(const key of page.keys||[]){
      try{
        const record=await registryInstallation(env,key.name.slice('installation:'.length));
        if(record?.active&&record.squareConnected)await squareToken(env,record.installationId);
      }catch{}
    }
    cursor=page.list_complete?undefined:page.cursor;
  }while(cursor);
}
export {installationId,installationToken};
async function pendingTrackingProof(token,trackingId){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(token),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(trackingId));return `${trackingId}.${base64url(String.fromCharCode(...new Uint8Array(signature)))}`}
async function verifyPendingTracking(token,pending){const value=String(pending||''),separator=value.lastIndexOf('.');if(separator<1)return '';const trackingId=value.slice(0,separator),expected=await pendingTrackingProof(token,trackingId);return expected===value?trackingId:''}
function webhookMerchantIds(event){const resource=event?.resource||{},ids=[];const add=value=>{const id=clean(value,64);if(id&&!ids.includes(id))ids.push(id)};add(resource.payee?.merchant_id);for(const unit of resource.purchase_units||[])add(unit?.payee?.merchant_id);add(resource.seller_merchant_id);add(resource.seller?.merchant_id);return ids}
async function webhookRoute(env,event){const routes=installationRoutes(env);for(const merchantId of webhookMerchantIds(event)){const registered=await registryMerchant(env,merchantId);if(registered?.active){const token=await decryptRegistryToken(env,registered.tokenCipher);if(token&&validRoute(registered.url))return {merchantId,url:validRoute(registered.url),token}}const route=routes[merchantId];if(!route?.url||!route?.token)continue;const target=validRoute(route.url);if(target)return {merchantId,url:target,token:String(route.token)}}return null}
async function verifyWebhook(env,rawBody,headers){
  const webhookId=env.PAYPAL_ENV==='live'?(env.PAYPAL_WEBHOOK_ID_LIVE||env.PAYPAL_WEBHOOK_ID):(env.PAYPAL_WEBHOOK_ID_SANDBOX||env.PAYPAL_WEBHOOK_ID);
  if(!webhookId)return {ok:false,status:503,error:'PayPal webhook ID is not configured on the Connect worker.'};
  let event;try{event=JSON.parse(rawBody)}catch{return {ok:false,status:400,error:'PayPal webhook body is invalid JSON.'}}
  const required=['auth_algo','cert_url','transmission_id','transmission_sig','transmission_time'];if(required.some(key=>!headers[key]))return {ok:false,status:400,error:'PayPal webhook verification data is incomplete.'};
  const pp=await paypalAccess(env),prefix=JSON.stringify({auth_algo:headers.auth_algo,cert_url:headers.cert_url,transmission_id:headers.transmission_id,transmission_sig:headers.transmission_sig,transmission_time:headers.transmission_time,webhook_id:webhookId}),verifyBody=prefix.slice(0,-1)+`,"webhook_event":${rawBody}}`;
  const response=await fetch(pp.base+'/v1/notifications/verify-webhook-signature',{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json'},body:verifyBody});let result={};try{result=await response.json()}catch{}
  const verified=response.ok&&result.verification_status==='SUCCESS';return {ok:verified,status:verified?200:(response.ok?401:response.status),error:clean(result.message||'PayPal webhook signature verification failed.',500),event};
}
async function receiveWebhook(req,env){
  const rawBody=await req.text(),headers={auth_algo:req.headers.get('paypal-auth-algo')||'',cert_url:req.headers.get('paypal-cert-url')||'',transmission_id:req.headers.get('paypal-transmission-id')||'',transmission_sig:req.headers.get('paypal-transmission-sig')||'',transmission_time:req.headers.get('paypal-transmission-time')||''};
  const verification=await verifyWebhook(env,rawBody,headers);if(!verification.ok)return json({ok:false,error:verification.error},verification.status||400);
  const route=await webhookRoute(env,verification.event);if(!route)return json({ok:false,error:'No connected OneArtist site is registered for this PayPal merchant.'},404);
  const response=await fetch(`${route.url}/api/paypal/webhook/internal`,{method:'POST',headers:{'content-type':'application/json','x-oneartist-connect-token':route.token,'x-oneartist-connect-merchant':route.merchantId},body:rawBody});
  if(!response.ok)return json({ok:false,error:'Connected OneArtist site did not accept the verified event.'},502);
  return json({ok:true,forwarded:true},200);
}
function paypalHeaders(env,pp,merchantId,attribution,extra={}){
  const h={authorization:`Bearer ${pp.token}`,'content-type':'application/json',...extra};
  if(merchantId)h['PayPal-Auth-Assertion']=authAssertion(env.PAYPAL_PARTNER_CLIENT_ID,merchantId);
  h['PayPal-Partner-Attribution-Id']=attribution;
  return h;
}
async function paypalJson(env,path,{method='GET',merchantId='',body,requestId}={}){
  const attribution=partnerAttribution(env),pp=await paypalAccess(env),headers=paypalHeaders(env,pp,merchantId,attribution,requestId?{'paypal-request-id':clean(requestId,38)}:{}),r=await fetch(pp.base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  let j={};try{j=await r.json()}catch{}
  return {ok:r.ok,status:r.status,data:j};
}

// --- OneArtistHub commercial site control plane ---
const WEB_ORIGIN='https://www.oneartisthub.site';
const ADMIN_SESSION_TTL=8*60*60;
const ADMIN_RATE_TTL=15*60;
const ADMIN_MAX_ATTEMPTS=5;
const COMMERCE_DB=env=>env.COMMERCE_DB;
function corsHeaders(origin=WEB_ORIGIN){
  const allowed=origin===WEB_ORIGIN?origin:WEB_ORIGIN;
  return {'access-control-allow-origin':allowed,'access-control-allow-credentials':'true','access-control-allow-headers':'content-type,x-csrf-token','access-control-allow-methods':'GET,POST,PATCH,OPTIONS','vary':'Origin'};
}
function secureJson(data,status=200,origin=WEB_ORIGIN){
  const h={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','content-security-policy':"default-src 'none'; frame-ancestors 'none'",...corsHeaders(origin)};
  return new Response(JSON.stringify(data),{status,headers:h});
}
function validEmail(value){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value||''))&&String(value).length<=254}
function adminSessionCookie(token){
  return 'oah_admin='+encodeURIComponent(token)+'; Path=/; Max-Age='+ADMIN_SESSION_TTL+'; HttpOnly; Secure; SameSite=Strict';
}
function clearAdminCookie(){return 'oah_admin=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}
function cookieValue(req,name){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===name)return decodeURIComponent(v.join('='));}return ''}
async function adminHash(value){return bytesToB64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value)))))}
async function pbkdf2Password(password,salt,iterations){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return bytesToB64url(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,256)));
}
async function verifyAdminPassword(password,stored){
  const parts=String(stored||'').split('$');
  if(parts.length!==4||parts[0]!=='pbkdf2')return false;
  const iterations=Number(parts[1]);if(!Number.isSafeInteger(iterations)||iterations<100000||iterations>1000000)return false;
  try{
    const salt=b64urlToBytes(parts[2]),expected=parts[3],actual=await pbkdf2Password(password,salt,iterations);
    return actual===expected;
  }catch{return false}
}
async function adminSession(env,req){
  const token=cookieValue(req,'oah_admin');if(!token||!registry(env))return null;
  const hash=await adminHash(token);try{const session=await registry(env).get('admin-session:'+hash,'json');if(!session||session.expiresAt<Date.now())return null;return session}catch{return null}
}
async function requireAdmin(env,req){
  const session=await adminSession(env,req);if(!session)return null;
  if(['POST','PATCH','PUT','DELETE'].includes(req.method)){
    const csrf=req.headers.get('x-csrf-token')||'';if(csrf!==session.csrf)return null;
  }
  return session;
}
async function publicRateLimited(env,req,prefix,max,ttl){
  const kv=registry(env);if(!kv)return false;
  const ip=clean(req.headers.get('cf-connecting-ip')||'unknown',80),key=prefix+':'+await adminHash(ip);
  const count=Number(await kv.get(key)||0);if(count>=max)return true;await kv.put(key,String(count+1),{expirationTtl:ttl});return false;
}
async function d1Required(env){const db=COMMERCE_DB(env);if(!db)throw configurationError('Commerce D1 database binding COMMERCE_DB is not configured.');return db}
async function setting(env,key,fallback=''){
  const db=await d1Required(env);const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();return row?.value??fallback;
}
async function saveSetting(env,key,value){const db=await d1Required(env);await db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,String(value),new Date().toISOString()).run()}
async function squareSoftwareConfig(env){
  const token=String(env.SOFTWARE_SQUARE_ACCESS_TOKEN||'').trim(),location=clean(env.SOFTWARE_SQUARE_LOCATION_ID,64).trim();
  if(!token||!location)throw configurationError('Software Square checkout is not configured on the Worker.');
  const base=env.SQUARE_ENV==='sandbox'?'https://connect.squareupsandbox.com':'https://connect.squareup.com';
  return {token,location,base};
}
async function squareSoftwareRequest(env,path,body){
  const cfg=await squareSoftwareConfig(env);
  const r=await fetch(cfg.base+'/v2'+path,{method:'POST',headers:{authorization:'Bearer '+cfg.token,'content-type':'application/json','Square-Version':'2026-09-16'},body:JSON.stringify(body)});
  let data={};try{data=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(clean(data?.errors?.[0]?.detail||data?.errors?.[0]?.code||'Square request failed.',500)),{status:r.status});
  return data;
}
async function verifySquareSoftwareWebhook(env,rawBody,signature){
  const key=String(env.SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY||'');if(!key||!signature)return false;
  const url='https://connect.oneartisthub.site/software/webhook';
  const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(url+rawBody)));
  const actual=bytesToB64url(digest),expected=String(signature);
  if(actual.length!==expected.length)return false;
  let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
async function sendEmail(env,{to,from,subject,text,html}){
  if(!env.EMAIL||typeof env.EMAIL.send!=='function')throw configurationError('Cloudflare Email Service binding EMAIL is not configured.');
  if(!validEmail(to)||!validEmail(from))throw configurationError('Email sender or recipient is not configured correctly.');
  return env.EMAIL.send({to,from,subject,text,html});
}
async function createOrderEmail(env,order){
  const from=await setting(env,'email_from','contact@oneartisthub.site');
  const download=String(env.SOFTWARE_DOWNLOAD_URL||'').trim();
  const extra=order.product_id==='prod_self_hosted'&&download?'\\n\\nDownload your OneArtistHub package: '+download:'';
  await sendEmail(env,{to:order.customer_email,from,subject:'OneArtistHub order '+order.id,text:'Thank you for your OneArtistHub purchase.'+extra,html:'<h2>Thank you for your OneArtistHub purchase.</h2><p>Order <strong>'+clean(order.id,80)+'</strong> is confirmed.</p>'+(extra?'<p><a href="'+download.replace(/"/g,'&quot;')+'">Download OneArtistHub</a></p>':'')});
}
async function publicProducts(env){
  const db=await d1Required(env);const result=await db.prepare('SELECT id,slug,name,version,price_cents AS price,currency,billing_type,active FROM products WHERE active=1 ORDER BY id').all();return result.results||[];
}
async function handleSoftwareCheckout(env,body,req){
  if(await publicRateLimited(env,req,'checkout',10,3600))return secureJson({ok:false,error:'Too many checkout attempts. Please try again later.'},429);
  const db=await d1Required(env),slug=clean(body.product,64),name=clean(body.customer_name,120),email=clean(body.customer_email,254).toLowerCase();
  if(!['self-hosted','hosted'].includes(slug)||!name||!validEmail(email))return secureJson({ok:false,error:'Valid product, name and email are required.'},400);
  const product=await db.prepare('SELECT * FROM products WHERE slug=? AND active=1').bind(slug).first();if(!product)return secureJson({ok:false,error:'Product is unavailable.'},404);
  const orderId='OAH-'+crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase(),now=new Date().toISOString();
  await db.prepare('INSERT INTO orders(id,customer_name,customer_email,product_id,product_name,product_version,amount_cents,currency,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(orderId,name,email,product.id,product.name,product.version,product.price_cents,product.currency,'pending',now,now).run();
  try{
    const data=await squareSoftwareRequest(env,'/online-checkout/payment-links',{idempotency_key:crypto.randomUUID(),quick_pay:{name:product.name,price_money:{amount:product.price_cents,currency:product.currency},location_id:(await squareSoftwareConfig(env)).location},pre_populated_data:{buyer_email:email},payment_note:orderId});
    const link=data.payment_link||{},squareOrder=data.related_resources?.orders?.[0]||{};
    await db.prepare('UPDATE orders SET square_order_id=?,payment_link_id=?,updated_at=? WHERE id=?').bind(squareOrder.id||'',link.id||'',now,orderId).run();
    return secureJson({ok:true,checkout_url:link.url||link.long_url||'',order_id:orderId},201);
  }catch(error){
    await db.prepare("UPDATE orders SET payment_status='failed',updated_at=? WHERE id=?").bind(new Date().toISOString(),orderId).run();
    throw error;
  }
}
async function handleSoftwareWebhook(env,req){
  const raw=await req.text();if(!(await verifySquareSoftwareWebhook(env,raw,req.headers.get('x-square-hmacsha256-signature'))))return secureJson({ok:false,error:'Invalid Square webhook signature.'},403);
  let event;try{event=JSON.parse(raw)}catch{return secureJson({ok:false,error:'Invalid webhook JSON.'},400)}
  const eventId=clean(event.event_id,192);if(eventId&&registry(env)){const key='square-event:'+await adminHash(eventId);if(await registry(env).get(key))return secureJson({ok:true,duplicate:true});await registry(env).put(key,'1',{expirationTtl:604800});}
  if(['payment.created','payment.updated'].includes(event.type)){
    const payment=event.data?.object?.payment||{},orderId=clean(payment.order_id,192),status=clean(payment.status,40).toUpperCase();
    const db=await d1Required(env);const order=orderId?await db.prepare('SELECT * FROM orders WHERE square_order_id=?').bind(orderId).first():null;
    if(order){
      const mapped=status==='COMPLETED'?'paid':status==='FAILED'?'failed':status==='CANCELED'?'canceled':'pending';
      await db.prepare('UPDATE orders SET payment_status=?,square_payment_id=?,updated_at=? WHERE id=?').bind(mapped,clean(payment.id,192),new Date().toISOString(),order.id).run();
      if(mapped==='paid'){try{await createOrderEmail(env,{...order,payment_status:mapped})}catch{}}
    }
  }
  return secureJson({ok:true});
}
async function handleContact(env,body,req){
  if(await publicRateLimited(env,req,'contact',5,3600))return secureJson({ok:false,error:'Too many contact attempts. Please try again later.'},429);
  const db=await d1Required(env),name=clean(body.name,120),email=clean(body.email,254).toLowerCase(),message=clean(body.message,5000);
  if(!name||!validEmail(email)||!message)return secureJson({ok:false,error:'Name, valid email and message are required.'},400);
  const id='MSG-'+crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase(),now=new Date().toISOString();
  await db.prepare('INSERT INTO contact_messages(id,name,email,message,status,created_at) VALUES(?,?,?,?,?,?)').bind(id,name,email,message,'unread',now).run();
  const to=await setting(env,'contact_to','');const from=await setting(env,'email_from','contact@oneartisthub.site');
  if(to&&validEmail(to)){await sendEmail(env,{to,from,subject:'OneArtistHub contact: '+name,text:'From: '+name+' <'+email+'>\\n\\n'+message,html:'<h2>OneArtistHub Contact</h2><p><strong>'+clean(name,120)+'</strong> &lt;'+clean(email,254)+'&gt;</p><p>'+clean(message,5000).replace(/\\n/g,'<br>')+'</p>'})}
  return secureJson({ok:true,id});
}
async function adminJson(env,req,data,status=200){const origin=req.headers.get('origin')||WEB_ORIGIN;return secureJson(data,status,origin)}
async function adminLogin(env,req,body){
  const email=clean(body.email,254).toLowerCase(),password=String(body.password||'');if(!validEmail(email)||password.length<8)return adminJson(env,req,{ok:false,error:'Invalid credentials.'},401);
  const ip=clean(req.headers.get('cf-connecting-ip')||'unknown',80),rateKey='admin-rate:'+ip;let attempts=0;if(registry(env)){attempts=Number(await registry(env).get(rateKey)||0);if(attempts>=ADMIN_MAX_ATTEMPTS)return adminJson(env,req,{ok:false,error:'Too many attempts. Try again later.'},429);await registry(env).put(rateKey,String(attempts+1),{expirationTtl:ADMIN_RATE_TTL});}
  if(email!==String(env.ADMIN_EMAIL||'').toLowerCase()||!(await verifyAdminPassword(password,env.ADMIN_PASSWORD_HASH)))return adminJson(env,req,{ok:false,error:'Invalid credentials.'},401);
  const token=bytesToB64url(crypto.getRandomValues(new Uint8Array(32))),csrf=bytesToB64url(crypto.getRandomValues(new Uint8Array(32))),hash=await adminHash(token);
  if(!registry(env))throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');
  await registry(env).put('admin-session:'+hash,JSON.stringify({email,csrf,expiresAt:Date.now()+ADMIN_SESSION_TTL}),{expirationTtl:ADMIN_SESSION_TTL});
  const response=adminJson(env,req,{ok:true,csrf,email});response.headers.set('set-cookie',adminSessionCookie(token));return response;
}
async function adminLogout(env,req){
  const token=cookieValue(req,'oah_admin');if(token&&registry(env))await registry(env).delete('admin-session:'+await adminHash(token));
  const response=adminJson(env,req,{ok:true});response.headers.set('set-cookie',clearAdminCookie());return response;
}
async function adminOverview(env,req){
  const db=await d1Required(env),products=await db.prepare('SELECT id,slug,name,version,price_cents,currency,billing_type,active,updated_at FROM products ORDER BY id').all(),orders=await db.prepare('SELECT id,customer_name,customer_email,product_id,product_name,product_version,amount_cents,currency,payment_status,square_payment_id,square_order_id,payment_link_id,created_at,updated_at FROM orders ORDER BY created_at DESC LIMIT 100').all(),stats=await db.prepare("SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN payment_status='paid' THEN amount_cents ELSE 0 END),0) AS revenue_cents,COALESCE(SUM(CASE WHEN product_id='prod_hosted' AND payment_status='paid' THEN 1 ELSE 0 END),0) AS hosted_count,COALESCE(SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END),0) AS paid_count,COALESCE(SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END),0) AS pending_count,COALESCE(SUM(CASE WHEN payment_status='failed' THEN 1 ELSE 0 END),0) AS failed_count FROM orders").first();
  const messages=await db.prepare("SELECT COUNT(*) AS unread FROM contact_messages WHERE status='unread'").first();
  return adminJson(env,req,{ok:true,products:products.results||[],orders:orders.results||[],stats:stats||{},unread_messages:Number(messages?.unread||0),email:{contact_to:await setting(env,'contact_to',''),email_from:await setting(env,'email_from','contact@oneartisthub.site')},square:{configured:!!env.SOFTWARE_SQUARE_ACCESS_TOKEN,locationConfigured:!!env.SOFTWARE_SQUARE_LOCATION_ID,environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',webhookConfigured:!!env.SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY}});
}
async function adminProductUpdate(env,req,body){
  const db=await d1Required(env),slug=clean(body.slug,64),price=Math.round(Number(body.price_cents)),version=clean(body.version,64),active=body.active?1:0;
  if(!slug||!Number.isInteger(price)||price<0||price>100000000||!version)return adminJson(env,req,{ok:false,error:'Invalid product values.'},400);
  await db.prepare('UPDATE products SET price_cents=?,version=?,active=?,updated_at=? WHERE slug=?').bind(price,version,active,new Date().toISOString(),slug).run();
  return adminJson(env,req,{ok:true});
}
async function adminEmailUpdate(env,req,body){
  const to=clean(body.contact_to,254).toLowerCase();if(to&&!validEmail(to))return adminJson(env,req,{ok:false,error:'Invalid contact email.'},400);
  await saveSetting(env,'contact_to',to);return adminJson(env,req,{ok:true,contact_to:to});
}

export default {async scheduled(event,env){await squareRefreshAll(env)},async fetch(req,env){
  try{
    const url=new URL(req.url),origin=req.headers.get('origin')||WEB_ORIGIN;
    if(req.method==='OPTIONS'&&origin===WEB_ORIGIN)return new Response(null,{status:204,headers:{...corsHeaders(origin),'access-control-max-age':'86400','x-content-type-options':'nosniff'}});
    if(req.method==='GET'&&url.pathname==='/software/products')return secureJson({ok:true,products:await publicProducts(env)},200,origin);
    if(req.method==='POST'&&url.pathname==='/software/webhook')return handleSoftwareWebhook(env,req);
    let requestBody={};
    if((req.method==='POST'||req.method==='PATCH')&&JSON_POST_ROUTES.has(url.pathname)){try{requestBody=await req.json()}catch{return secureJson({ok:false,error:'Invalid JSON request body.'},400,origin)}}
    if(req.method==='POST'&&url.pathname==='/software/checkout')return handleSoftwareCheckout(env,requestBody,req);
    if(req.method==='POST'&&url.pathname==='/software/contact')return handleContact(env,requestBody,req);
    if(req.method==='POST'&&url.pathname==='/admin/login')return adminLogin(env,req,requestBody);
    if(req.method==='POST'&&url.pathname==='/admin/logout')return adminLogout(env,req);
    if(req.method==='GET'&&url.pathname==='/admin/me'){const session=await adminSession(env,req);return adminJson(env,req,session?{ok:true,email:session.email,csrf:session.csrf}:{ok:false},session?200:401)}
    if(req.method==='GET'&&url.pathname==='/admin/overview'){if(!await requireAdmin(env,req))return adminJson(env,req,{ok:false,error:'Unauthorized'},401);return adminOverview(env,req)}
    if(req.method==='PATCH'&&url.pathname==='/admin/products'){if(!await requireAdmin(env,req))return adminJson(env,req,{ok:false,error:'Unauthorized'},401);return adminProductUpdate(env,req,requestBody)}
    if(req.method==='POST'&&url.pathname==='/admin/settings/email'){if(!await requireAdmin(env,req))return adminJson(env,req,{ok:false,error:'Unauthorized'},401);return adminEmailUpdate(env,req,requestBody)}
    if(req.method==='POST'&&url.pathname==='/admin/email/test'){
      if(!await requireAdmin(env,req))return adminJson(env,req,{ok:false,error:'Unauthorized'},401);
      const to=await setting(env,'contact_to','');if(!to)return adminJson(env,req,{ok:false,error:'Set a contact email first.'},400);
      const from=await setting(env,'email_from','contact@oneartisthub.site');
      await sendEmail(env,{to,from,subject:'OneArtistHub Email Service test',text:'Your Cloudflare Email Service binding is working.',html:'<h2>OneArtistHub Email Service is working.</h2><p>This message was sent by the OneArtistHub Connect Worker.</p>'});
      return adminJson(env,req,{ok:true});
    }
    if(req.method==='GET'&&url.pathname==='/admin/square/status'){
      if(!await requireAdmin(env,req))return adminJson(env,req,{ok:false,error:'Unauthorized'},401);
      let connected=false;
      if(env.SOFTWARE_SQUARE_ACCESS_TOKEN&&env.SOFTWARE_SQUARE_LOCATION_ID){try{const cfg=await squareSoftwareConfig(env);const check=await fetch(cfg.base+'/v2/locations/'+encodeURIComponent(cfg.location),{headers:{authorization:'Bearer '+cfg.token,'Square-Version':'2026-09-16'}});connected=check.ok}catch{}}
      return adminJson(env,req,{ok:true,configured:!!env.SOFTWARE_SQUARE_ACCESS_TOKEN,locationConfigured:!!env.SOFTWARE_SQUARE_LOCATION_ID,connected,environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',webhookConfigured:!!env.SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY});
    }
    if(url.pathname==='/health')return json({ok:true,service:'OneArtist Connect',paypalEnvironment:env.PAYPAL_ENV==='live'?'live':'sandbox',squareEnvironment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',squareConfigured:!!(env.SQUARE_CLIENT_ID&&env.SQUARE_CLIENT_SECRET)});
    if(req.method==='POST'&&url.pathname==='/paypal/webhook')return receiveWebhook(req,env);
    if(req.method==='POST'&&url.pathname==='/installations/register'){
      const id=clean(requestBody.installationId,64),route=validRoute(clean(requestBody.url,1000));
      if(!validInstallationId(id)||!route)return json({ok:false,error:'A valid installationId and HTTPS callback URL are required.'},400);
      if(!(await consumeActivation(env,id,route,bearer(req))))return json({ok:false,error:'Unauthorized registration.'},401);
      const result=await registerInstallation(env,{installationId:id,url:route});await registry(env).delete(activationKey(id));return json({ok:true,...result},201);
    }
    if(req.method==='POST'&&url.pathname==='/installations/activate'){
      if(!env.CONNECT_SHARED_SECRET||bearer(req)!==env.CONNECT_SHARED_SECRET)return json({ok:false,error:'Unauthorized activation.'},401);
      const result=await createActivation(env,{installationId:clean(requestBody.installationId,64),url:clean(requestBody.url,1000),bootstrapHash:clean(requestBody.bootstrapHash,128)});return json({ok:true},result.reused?200:201);
    }
    if(req.method==='POST'&&url.pathname==='/installations/revoke'){
      const token=bearer(req),record=await registryByToken(env,token),id=clean(requestBody.installationId,64);
      if(!record||record.installationId!==id)return json({ok:false,error:'Unauthorized installation revocation.'},403);
      await revokeInstallation(env,id);return json({ok:true});
    }
    if(req.method==='POST'&&url.pathname==='/onboard/start'){
      if(!(await installationAuthorized(req,env)))return json({ok:false,error:'Unauthorized installation.'},401);
      const installation=await registryByToken(env,bearer(req));
      if(installation?.squareConnected)return json({ok:false,error:'Disconnect Square before connecting PayPal.'},409);
      const b=requestBody,trackingId=clean(b.trackingId,120),returnUrl=clean(b.returnUrl,1000);
      if(!trackingId||!/^https:\/\//i.test(returnUrl))return json({ok:false,error:'trackingId and HTTPS returnUrl are required.'},400);
      const attribution=partnerAttribution(env),pp=await paypalAccess(env);
      const payload={tracking_id:trackingId,partner_config_override:{return_url:returnUrl,return_url_description:'Return to OneArtist Hub'},operations:[{operation:'API_INTEGRATION',api_integration_preference:{rest_api_integration:{integration_method:'PAYPAL',integration_type:'THIRD_PARTY',third_party_details:{features:['PAYMENT','REFUND']}}}}],products:['EXPRESS_CHECKOUT'],legal_consents:[{type:'SHARE_DATA_CONSENT',granted:true}]};
      const headers={authorization:`Bearer ${pp.token}`,'content-type':'application/json','PayPal-Partner-Attribution-Id':attribution};
      const r=await fetch(pp.base+'/v2/customer/partner-referrals',{method:'POST',headers,body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)return json({ok:false,error:clean(j.message||'PayPal partner referral failed.',500),details:j.details||[]},r.status);
      const actionUrl=(j.links||[]).find(x=>x.rel==='action_url')?.href,self=(j.links||[]).find(x=>x.rel==='self')?.href;if(!actionUrl)return json({ok:false,error:'PayPal did not return an onboarding URL.'},502);
      return json({ok:true,actionUrl,self,trackingId:await pendingTrackingProof(bearer(req),trackingId)},201);
    }
    if(req.method==='POST'&&url.pathname==='/square/connect/start'){
      const installation=await registryByToken(env,bearer(req));
      if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      if(installation.merchantId)return json({ok:false,error:'Disconnect PayPal before connecting Square.'},409);
      const b=requestBody,returnUrl=clean(b.returnUrl,1000);
      if(!/^https:\/\//i.test(returnUrl))return json({ok:false,error:'HTTPS returnUrl is required.'},400);
      const cfg=await squareConfig(env);
      const state=bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
      const kv=registry(env);if(!kv)throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');
      await kv.put(squareOAuthKey(state),JSON.stringify({installationId:installation.installationId,returnUrl,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10*60*1000).toISOString()}),{expirationTtl:600});
      const scope=['MERCHANT_PROFILE_READ','PAYMENTS_READ','PAYMENTS_WRITE','ORDERS_READ','ORDERS_WRITE'].join(' ');
      const authUrl=new URL(cfg.base+'/oauth2/authorize');authUrl.searchParams.set('client_id',cfg.clientId);authUrl.searchParams.set('scope',scope);authUrl.searchParams.set('session','false');authUrl.searchParams.set('state',state);authUrl.searchParams.set('redirect_uri',cfg.redirect);
      return json({ok:true,actionUrl:authUrl.toString()});
    }
    if(req.method==='GET'&&url.pathname==='/square/oauth/callback'){
      const cfg=await squareConfig(env),state=clean(url.searchParams.get('state'),200),code=clean(url.searchParams.get('code'),2048),denied=clean(url.searchParams.get('error'),100);
      const kv=registry(env);let pending=null;try{pending=state?await kv.get(squareOAuthKey(state),'json'):null}catch{}
      if(!pending||new Date(pending.expiresAt)<=new Date())return new Response('Square authorization expired. Please reconnect.',{status:400,headers:{'content-type':'text/plain'}});
      await kv.delete(squareOAuthKey(state));
      if(denied||!code)return Response.redirect(pending.returnUrl+'?square=denied',302);
      const tokenResponse=await fetch(cfg.base+'/oauth2/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_id:cfg.clientId,client_secret:cfg.clientSecret,code,grant_type:'authorization_code',redirect_uri:cfg.redirect})});
      let token={};try{token=await tokenResponse.json()}catch{}
      if(!tokenResponse.ok||!token.access_token||!token.refresh_token)return new Response('Square authorization could not be completed.',{status:400,headers:{'content-type':'text/plain'}});
      const record=await registryInstallation(env,pending.installationId);if(!record?.active)return new Response('OneArtist installation is not active.',{status:409,headers:{'content-type':'text/plain'}});
      if(record.merchantId)return new Response('PayPal is already connected. Disconnect PayPal before using Square.',{status:409,headers:{'content-type':'text/plain'}});
      const locationsResponse=await fetch(cfg.base+'/v2/locations',{headers:{authorization:'Bearer '+token.access_token,'Square-Version':'2026-09-16'}});
      let locations={};try{locations=await locationsResponse.json()}catch{}
      const location=(locations.locations||[]).find(x=>x.status==='ACTIVE')||(locations.locations||[])[0];
      if(!location?.id)return new Response('Square connected, but no active Square location was returned.',{status:400,headers:{'content-type':'text/plain'}});
      await saveSquareConnection(env,pending.installationId,{accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:token.expires_at||'',merchantId:token.merchant_id||'',locationId:location.id,locationName:location.name||'',scopes:token.scopes||[],updatedAt:new Date().toISOString(),connectedAt:new Date().toISOString()});
      record.squareConnected=true;record.squareMerchantId=clean(token.merchant_id,191);record.squareLocationId=clean(location.id,64);record.updatedAt=new Date().toISOString();await putRegistryInstallation(env,record);
      return Response.redirect(pending.returnUrl+'?square=connected',302);
    }
    if(req.method==='GET'&&url.pathname==='/square/status'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      const connection=await squareConnection(env,installation.installationId);
      if(!connection)return json({ok:true,configured:!!env.SQUARE_CLIENT_ID,status:'not_connected',merchantId:'',locationId:'',environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production'});
      try{await squareApi(env,installation.installationId,'/locations');}catch(e){return json({ok:true,configured:true,status:'action_required',merchantId:connection.merchantId||'',locationId:connection.locationId||'',environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',error:clean(e.message,300)});}
      return json({ok:true,configured:true,status:'connected',merchantId:connection.merchantId||'',locationId:connection.locationId||'',locationName:connection.locationName||'',environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production'});
    }
    if(req.method==='POST'&&url.pathname==='/square/disconnect'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      const connection=await squareConnection(env,installation.installationId);if(connection){
        const cfg=await squareConfig(env);
        try{await fetch(cfg.base+'/oauth2/revoke',{method:'POST',headers:{authorization:'Client '+cfg.clientSecret,'content-type':'application/json'},body:JSON.stringify({client_id:cfg.clientId,access_token:connection.accessToken,revoke_only_access_token:false})})}catch{}
      }
      await clearSquareConnection(env,installation.installationId);
      installation.squareConnected=false;installation.squareMerchantId='';installation.squareLocationId='';installation.updatedAt=new Date().toISOString();await putRegistryInstallation(env,installation);
      return json({ok:true});
    }
    if(req.method==='POST'&&url.pathname==='/square/checkout'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      if(installation.merchantId)return json({ok:false,error:'PayPal is connected. Disconnect PayPal before using Square.'},409);
      const connection=await squareConnection(env,installation.installationId);if(!connection)return json({ok:false,error:'Square is not connected.'},409);
      const b=requestBody,body=b.body||{},data=await squareApi(env,installation.installationId,'/online-checkout/payment-links',{method:'POST',body});
      return json({ok:true,paymentLink:data.payment_link||null,order:data.related_resources?.orders?.[0]||null});
    }
    if(req.method==='POST'&&url.pathname==='/square/order'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      const orderId=clean(requestBody.orderId,192);if(!orderId)return json({ok:false,error:'Missing Square order ID.'},400);
      const data=await squareApi(env,installation.installationId,'/orders/'+encodeURIComponent(orderId));
      return json({ok:true,order:data.order||null});
    }
    if(req.method==='POST'&&url.pathname==='/onboard/status'){
      if(!(await installationAuthorized(req,env)))return json({ok:false,error:'Unauthorized installation.'},401);
      const b=requestBody,merchantId=clean(b.merchantId,40),trackingId=clean(b.trackingId,120);
      if(!merchantId||!trackingId||!env.PAYPAL_PARTNER_ID)return json({ok:false,error:'merchantId, trackingId and PAYPAL_PARTNER_ID are required.'},400);
      const pendingTracking=await verifyPendingTracking(bearer(req),trackingId);if(!pendingTracking)return json({ok:false,error:'Unauthorized or invalid pending onboarding.'},403);
      const pp=await paypalJson(env,`/v1/customer/partners/${encodeURIComponent(env.PAYPAL_PARTNER_ID)}/merchant-integrations/${encodeURIComponent(merchantId)}`,{});
      if(!pp.ok)return json({ok:false,error:clean(pp.data.message||'Unable to verify merchant onboarding.',500)},pp.status);
      const j=pp.data;if(j.tracking_id!==pendingTracking)return json({ok:false,error:'PayPal merchant does not belong to this pending onboarding.'},403);const confirmedMerchant=clean(j.merchant_id||merchantId,40);if(registry(env)&&!(await associateMerchant(env,bearer(req),confirmedMerchant)))return json({ok:false,error:'PayPal merchant is already associated with another installation.'},409);return json({ok:true,merchantId:confirmedMerchant,trackingId:j.tracking_id,paymentsReceivable:!!j.payments_receivable,primaryEmailConfirmed:!!j.primary_email_confirmed,products:j.products||[],oauthIntegrations:j.oauth_integrations||[]});
    }
    if(!(await authorized(req,env)))return json({ok:false,error:'Unauthorized'},401);
    if(req.method==='GET'&&url.pathname==='/config'){partnerAttribution(env);const pp=await paypalAccess(env);return json({ok:true,clientId:clean(env.PAYPAL_PARTNER_CLIENT_ID,255),environment:env.PAYPAL_ENV==='live'?'live':'sandbox',webhookConfigured:!!(env.PAYPAL_WEBHOOK_ID_LIVE||env.PAYPAL_WEBHOOK_ID_SANDBOX||env.PAYPAL_WEBHOOK_ID),authenticated:!!pp.token});}
    if(req.method==='POST'&&url.pathname==='/paypal/create-order'){
      const b=requestBody,merchantId=clean(b.merchantId,40),payload=b.payload||{};
      if(!merchantId||!Array.isArray(payload.purchase_units)||!payload.purchase_units.length)return json({ok:false,error:'merchantId and a valid order payload are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      if(payload.purchase_units.some(unit=>unit?.payment_instruction&&Object.prototype.hasOwnProperty.call(unit.payment_instruction,'platform_fees')))return json({ok:false,error:'Platform fees are not supported.'},400);
      payload.purchase_units=payload.purchase_units.map(u=>({...u,payee:{...(u.payee||{}),merchant_id:merchantId},payment_instruction:{...(u.payment_instruction||{}),disbursement_mode:'INSTANT'}}));
      const r=await paypalJson(env,'/v2/checkout/orders',{method:'POST',merchantId,body:payload,requestId:b.requestId});
      if(!r.ok||!r.data?.id)return json({ok:false,error:clean(r.data.message||'PayPal order creation failed.',500),details:r.data.details||[]},r.status||502);
      return json({ok:true,order:r.data},201);
    }
    if(req.method==='POST'&&url.pathname==='/paypal/order'){
      const b=requestBody,merchantId=clean(b.merchantId,40),orderId=clean(b.orderId,80);if(!merchantId||!orderId)return json({ok:false,error:'merchantId and orderId are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/checkout/orders/${encodeURIComponent(orderId)}`,{merchantId});if(!r.ok)return json({ok:false,error:clean(r.data.message||'PayPal order lookup failed.',500)},r.status||502);return json({ok:true,order:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/capture'){
      const b=requestBody,merchantId=clean(b.merchantId,40),orderId=clean(b.orderId,80);if(!merchantId||!orderId)return json({ok:false,error:'merchantId and orderId are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{method:'POST',merchantId,body:{},requestId:b.requestId});if(!r.ok)return json({ok:false,error:clean(r.data.message||'PayPal capture failed.',500),details:r.data.details||[]},r.status||502);return json({ok:true,order:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/refund'){
      const b=requestBody,merchantId=clean(b.merchantId,40),captureId=clean(b.captureId,80);if(!merchantId||!captureId)return json({ok:false,error:'merchantId and captureId are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,{method:'POST',merchantId,body:b.payload||{},requestId:b.requestId});if(!r.ok||!['COMPLETED','PENDING'].includes(String(r.data.status||'').toUpperCase()))return json({ok:false,error:clean(r.data.message||'PayPal refund failed.',500),details:r.data.details||[]},r.status||502);return json({ok:true,refund:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/webhook/verify'){
      const b=requestBody,h=b.headers||{},rawBody=String(b.rawBody||'');if(!rawBody||!h.auth_algo||!h.cert_url||!h.transmission_id||!h.transmission_sig||!h.transmission_time)return json({ok:false,error:'PayPal webhook verification data is incomplete.'},400);let webhookEvent={};try{webhookEvent=JSON.parse(rawBody)}catch{return json({ok:false,error:'PayPal webhook body is invalid JSON.'},400);}
      const webhookId=env.PAYPAL_ENV==='live'?(env.PAYPAL_WEBHOOK_ID_LIVE||env.PAYPAL_WEBHOOK_ID):(env.PAYPAL_WEBHOOK_ID_SANDBOX||env.PAYPAL_WEBHOOK_ID);if(!webhookId)return json({ok:false,error:'PayPal webhook ID is not configured on the Connect worker.'},503);
      const pp=await paypalAccess(env),prefix=JSON.stringify({auth_algo:h.auth_algo,cert_url:h.cert_url,transmission_id:h.transmission_id,transmission_sig:h.transmission_sig,transmission_time:h.transmission_time,webhook_id:webhookId}),verifyBody=prefix.slice(0,-1)+`,"webhook_event":${rawBody}}`;
      const r=await fetch(pp.base+'/v1/notifications/verify-webhook-signature',{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json'},body:verifyBody});let j={};try{j=await r.json()}catch{}if(!r.ok)return json({ok:false,error:clean(j.message||'PayPal webhook verification failed.',500)},r.status);return json({ok:true,verified:j.verification_status==='SUCCESS',status:j.verification_status||''});
    }
    return json({ok:false,error:'Not found'},404);
  }catch(e){return json({ok:false,error:clean(e?.message||e,500)},Number(e?.status)||500)}
}}
);
  if(parts.length!==4||parts[0]!=='pbkdf2')return false;
  const iterations=Number(parts[1]);if(!Number.isSafeInteger(iterations)||iterations<100000||iterations>1000000)return false;
  try{
    const salt=b64urlToBytes(parts[2]),expected=parts[3],actual=await pbkdf2Password(password,salt,iterations);
    return actual===expected;
  }catch{return false}
}
async function adminSession(env,req){
  const token=cookieValue(req,'oah_admin');if(!token||!registry(env))return null;
  const hash=await adminHash(token);try{const session=await registry(env).get('admin-session:'+hash,'json');if(!session||session.expiresAt<Date.now())return null;return session}catch{return null}
}
async function requireAdmin(env,req){
  const session=await adminSession(env,req);if(!session)return null;
  if(['POST','PATCH','PUT','DELETE'].includes(req.method)){
    const csrf=req.headers.get('x-csrf-token')||'';if(csrf!==session.csrf)return null;
  }
  return session;
}
async function d1Required(env){const db=COMMERCE_DB(env);if(!db)throw configurationError('Commerce D1 database binding COMMERCE_DB is not configured.');return db}
async function setting(env,key,fallback=''){
  const db=await d1Required(env);const row=await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();return row?.value??fallback;
}
async function saveSetting(env,key,value){const db=await d1Required(env);await db.prepare("INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,String(value),new Date().toISOString()).run()}
async function squareSoftwareConfig(env){
  const token=String(env.SOFTWARE_SQUARE_ACCESS_TOKEN||'').trim(),location=clean(env.SOFTWARE_SQUARE_LOCATION_ID,64).trim();
  if(!token||!location)throw configurationError('Software Square checkout is not configured on the Worker.');
  const base=env.SQUARE_ENV==='sandbox'?'https://connect.squareupsandbox.com':'https://connect.squareup.com';
  return {token,location,base};
}
async function squareSoftwareRequest(env,path,body){
  const cfg=await squareSoftwareConfig(env);
  const r=await fetch(cfg.base+'/v2'+path,{method:'POST',headers:{authorization:'Bearer '+cfg.token,'content-type':'application/json','Square-Version':'2026-09-16'},body:JSON.stringify(body)});
  let data={};try{data=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(clean(data?.errors?.[0]?.detail||data?.errors?.[0]?.code||'Square request failed.',500)),{status:r.status});
  return data;
}
async function verifySquareSoftwareWebhook(env,rawBody,signature){
  const key=String(env.SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY||'');if(!key||!signature)return false;
  const url='https://connect.oneartisthub.site/software/webhook';
  const cryptoKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest=new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,new TextEncoder().encode(url+rawBody)));
  const actual=bytesToB64url(digest),expected=String(signature);
  if(actual.length!==expected.length)return false;
  let diff=0;for(let i=0;i<actual.length;i++)diff|=actual.charCodeAt(i)^expected.charCodeAt(i);return diff===0;
}
async function sendEmail(env,{to,from,subject,text,html}){
  if(!env.EMAIL||typeof env.EMAIL.send!=='function')throw configurationError('Cloudflare Email Service binding EMAIL is not configured.');
  if(!validEmail(to)||!validEmail(from))throw configurationError('Email sender or recipient is not configured correctly.');
  return env.EMAIL.send({to,from,subject,text,html});
}
async function createOrderEmail(env,order){
  const from=await setting(env,'email_from','contact@oneartisthub.site');
  const download=String(env.SOFTWARE_DOWNLOAD_URL||'').trim();
  const extra=order.product_id==='prod_self_hosted'&&download?'\\n\\nDownload your OneArtistHub package: '+download:'';
  await sendEmail(env,{to:order.customer_email,from,subject:'OneArtistHub order '+order.id,text:'Thank you for your OneArtistHub purchase.'+extra,html:'<h2>Thank you for your OneArtistHub purchase.</h2><p>Order <strong>'+clean(order.id,80)+'</strong> is confirmed.</p>'+(extra?'<p><a href="'+download.replace(/"/g,'&quot;')+'">Download OneArtistHub</a></p>':'')});
}
async function publicProducts(env){
  const db=await d1Required(env);const result=await db.prepare('SELECT id,slug,name,version,price_cents AS price,currency,billing_type,active FROM products WHERE active=1 ORDER BY id').all();return result.results||[];
}
async function handleSoftwareCheckout(env,body){
  const db=await d1Required(env),slug=clean(body.product,64),name=clean(body.customer_name,120),email=clean(body.customer_email,254).toLowerCase();
  if(!['self-hosted','hosted'].includes(slug)||!name||!validEmail(email))return secureJson({ok:false,error:'Valid product, name and email are required.'},400);
  const product=await db.prepare('SELECT * FROM products WHERE slug=? AND active=1').bind(slug).first();if(!product)return secureJson({ok:false,error:'Product is unavailable.'},404);
  const orderId='OAH-'+crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase(),now=new Date().toISOString();
  await db.prepare('INSERT INTO orders(id,customer_name,customer_email,product_id,product_name,product_version,amount_cents,currency,payment_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(orderId,name,email,product.id,product.name,product.version,product.price_cents,product.currency,'pending',now,now).run();
  try{
    const data=await squareSoftwareRequest(env,'/online-checkout/payment-links',{idempotency_key:crypto.randomUUID(),quick_pay:{name:product.name,price_money:{amount:product.price_cents,currency:product.currency},location_id:(await squareSoftwareConfig(env)).location},pre_populated_data:{buyer_email:email},payment_note:orderId});
    const link=data.payment_link||{},squareOrder=data.related_resources?.orders?.[0]||{};
    await db.prepare('UPDATE orders SET square_order_id=?,payment_link_id=?,updated_at=? WHERE id=?').bind(squareOrder.id||'',link.id||'',now,orderId).run();
    return secureJson({ok:true,checkout_url:link.url||link.long_url||'',order_id:orderId},201);
  }catch(error){
    await db.prepare("UPDATE orders SET payment_status='failed',updated_at=? WHERE id=?").bind(new Date().toISOString(),orderId).run();
    throw error;
  }
}
async function handleSoftwareWebhook(env,req){
  const raw=await req.text();if(!(await verifySquareSoftwareWebhook(env,raw,req.headers.get('x-square-hmacsha256-signature'))))return secureJson({ok:false,error:'Invalid Square webhook signature.'},403);
  let event;try{event=JSON.parse(raw)}catch{return secureJson({ok:false,error:'Invalid webhook JSON.'},400)}
  const eventId=clean(event.event_id,192);if(eventId&&registry(env)){const key='square-event:'+await adminHash(eventId);if(await registry(env).get(key))return secureJson({ok:true,duplicate:true});await registry(env).put(key,'1',{expirationTtl:604800});}
  if(['payment.created','payment.updated'].includes(event.type)){
    const payment=event.data?.object?.payment||{},orderId=clean(payment.order_id,192),status=clean(payment.status,40).toUpperCase();
    const db=await d1Required(env);const order=orderId?await db.prepare('SELECT * FROM orders WHERE square_order_id=?').bind(orderId).first():null;
    if(order){
      const mapped=status==='COMPLETED'?'paid':status==='FAILED'?'failed':status==='CANCELED'?'canceled':'pending';
      await db.prepare('UPDATE orders SET payment_status=?,square_payment_id=?,updated_at=? WHERE id=?').bind(mapped,clean(payment.id,192),new Date().toISOString(),order.id).run();
      if(mapped==='paid'){try{await createOrderEmail(env,{...order,payment_status:mapped})}catch{}}
    }
  }
  return secureJson({ok:true});
}
async function handleContact(env,body){
  const db=await d1Required(env),name=clean(body.name,120),email=clean(body.email,254).toLowerCase(),message=clean(body.message,5000);
  if(!name||!validEmail(email)||!message)return secureJson({ok:false,error:'Name, valid email and message are required.'},400);
  const id='MSG-'+crypto.randomUUID().replace(/-/g,'').slice(0,20).toUpperCase(),now=new Date().toISOString();
  await db.prepare('INSERT INTO contact_messages(id,name,email,message,status,created_at) VALUES(?,?,?,?,?,?)').bind(id,name,email,message,'unread',now).run();
  const to=await setting(env,'contact_to','');const from=await setting(env,'email_from','contact@oneartisthub.site');
  if(to&&validEmail(to)){await sendEmail(env,{to,from,subject:'OneArtistHub contact: '+name,text:'From: '+name+' <'+email+'>\\n\\n'+message,html:'<h2>OneArtistHub Contact</h2><p><strong>'+clean(name,120)+'</strong> &lt;'+clean(email,254)+'&gt;</p><p>'+clean(message,5000).replace(/\\n/g,'<br>')+'</p>'})}
  return secureJson({ok:true,id});
}
async function adminJson(env,req,data,status=200){const origin=req.headers.get('origin')||WEB_ORIGIN;return secureJson(data,status,origin)}
async function adminLogin(env,req,body){
  const email=clean(body.email,254).toLowerCase(),password=String(body.password||'');if(!validEmail(email)||password.length<8)return adminJson(env,req,{ok:false,error:'Invalid credentials.'},401);
  const ip=clean(req.headers.get('cf-connecting-ip')||'unknown',80),rateKey='admin-rate:'+ip;let attempts=0;if(registry(env)){attempts=Number(await registry(env).get(rateKey)||0);if(attempts>=ADMIN_MAX_ATTEMPTS)return adminJson(env,req,{ok:false,error:'Too many attempts. Try again later.'},429);await registry(env).put(rateKey,String(attempts+1),{expirationTtl:ADMIN_RATE_TTL});}
  if(email!==String(env.ADMIN_EMAIL||'').toLowerCase()||!(await verifyAdminPassword(password,env.ADMIN_PASSWORD_HASH)))return adminJson(env,req,{ok:false,error:'Invalid credentials.'},401);
  const token=bytesToB64url(crypto.getRandomValues(new Uint8Array(32))),csrf=bytesToB64url(crypto.getRandomValues(new Uint8Array(32))),hash=await adminHash(token);
  if(!registry(env))throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');
  await registry(env).put('admin-session:'+hash,JSON.stringify({email,csrf,expiresAt:Date.now()+ADMIN_SESSION_TTL}),{expirationTtl:ADMIN_SESSION_TTL});
  const response=adminJson(env,req,{ok:true,csrf,email});response.headers.set('set-cookie',adminSessionCookie(token));return response;
}
async function adminLogout(env,req){
  const token=cookieValue(req,'oah_admin');if(token&&registry(env))await registry(env).delete('admin-session:'+await adminHash(token));
  const response=adminJson(env,req,{ok:true});response.headers.set('set-cookie',clearAdminCookie());return response;
}
async function adminOverview(env,req){
  const db=await d1Required(env),products=await db.prepare('SELECT id,slug,name,version,price_cents,currency,billing_type,active,updated_at FROM products ORDER BY id').all(),orders=await db.prepare('SELECT id,customer_name,customer_email,product_id,product_name,product_version,amount_cents,currency,payment_status,square_payment_id,square_order_id,payment_link_id,created_at,updated_at FROM orders ORDER BY created_at DESC LIMIT 100').all(),stats=await db.prepare("SELECT COUNT(*) AS orders,COALESCE(SUM(CASE WHEN payment_status='paid' THEN amount_cents ELSE 0 END),0) AS revenue_cents,COALESCE(SUM(CASE WHEN product_id='prod_hosted' AND payment_status='paid' THEN 1 ELSE 0 END),0) AS hosted_count,COALESCE(SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END),0) AS paid_count,COALESCE(SUM(CASE WHEN payment_status='pending' THEN 1 ELSE 0 END),0) AS pending_count,COALESCE(SUM(CASE WHEN payment_status='failed' THEN 1 ELSE 0 END),0) AS failed_count FROM orders").first();
  const messages=await db.prepare("SELECT COUNT(*) AS unread FROM contact_messages WHERE status='unread'").first();
  return adminJson(env,req,{ok:true,products:products.results||[],orders:orders.results||[],stats:stats||{},unread_messages:Number(messages?.unread||0),email:{contact_to:await setting(env,'contact_to',''),email_from:await setting(env,'email_from','contact@oneartisthub.site')},square:{configured:!!env.SOFTWARE_SQUARE_ACCESS_TOKEN,locationConfigured:!!env.SOFTWARE_SQUARE_LOCATION_ID,environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',webhookConfigured:!!env.SOFTWARE_SQUARE_WEBHOOK_SIGNATURE_KEY}});
}
async function adminProductUpdate(env,req,body){
  const db=await d1Required(env),slug=clean(body.slug,64),price=Math.round(Number(body.price_cents)),version=clean(body.version,64),active=body.active?1:0;
  if(!slug||!Number.isInteger(price)||price<0||price>100000000||!version)return adminJson(env,req,{ok:false,error:'Invalid product values.'},400);
  await db.prepare('UPDATE products SET price_cents=?,version=?,active=?,updated_at=? WHERE slug=?').bind(price,version,active,new Date().toISOString(),slug).run();
  return adminJson(env,req,{ok:true});
}
async function adminEmailUpdate(env,req,body){
  const to=clean(body.contact_to,254).toLowerCase();if(to&&!validEmail(to))return adminJson(env,req,{ok:false,error:'Invalid contact email.'},400);
  await saveSetting(env,'contact_to',to);return adminJson(env,req,{ok:true,contact_to:to});
}

export default {async scheduled(event,env){await squareRefreshAll(env)},async fetch(req,env){
  try{
    const url=new URL(req.url);
    if(url.pathname==='/health')return json({ok:true,service:'OneArtist Connect',paypalEnvironment:env.PAYPAL_ENV==='live'?'live':'sandbox',squareEnvironment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',squareConfigured:!!(env.SQUARE_CLIENT_ID&&env.SQUARE_CLIENT_SECRET)});
    if(req.method==='POST'&&url.pathname==='/paypal/webhook')return receiveWebhook(req,env);
    let requestBody={};
    if(req.method==='POST'&&JSON_POST_ROUTES.has(url.pathname)){try{requestBody=await req.json()}catch{return json({ok:false,error:'Invalid JSON request body.'},400)}}
    if(req.method==='POST'&&url.pathname==='/installations/register'){
      const id=clean(requestBody.installationId,64),route=validRoute(clean(requestBody.url,1000));
      if(!validInstallationId(id)||!route)return json({ok:false,error:'A valid installationId and HTTPS callback URL are required.'},400);
      if(!(await consumeActivation(env,id,route,bearer(req))))return json({ok:false,error:'Unauthorized registration.'},401);
      const result=await registerInstallation(env,{installationId:id,url:route});await registry(env).delete(activationKey(id));return json({ok:true,...result},201);
    }
    if(req.method==='POST'&&url.pathname==='/installations/activate'){
      if(!env.CONNECT_SHARED_SECRET||bearer(req)!==env.CONNECT_SHARED_SECRET)return json({ok:false,error:'Unauthorized activation.'},401);
      const result=await createActivation(env,{installationId:clean(requestBody.installationId,64),url:clean(requestBody.url,1000),bootstrapHash:clean(requestBody.bootstrapHash,128)});return json({ok:true},result.reused?200:201);
    }
    if(req.method==='POST'&&url.pathname==='/installations/revoke'){
      const token=bearer(req),record=await registryByToken(env,token),id=clean(requestBody.installationId,64);
      if(!record||record.installationId!==id)return json({ok:false,error:'Unauthorized installation revocation.'},403);
      await revokeInstallation(env,id);return json({ok:true});
    }
    if(req.method==='POST'&&url.pathname==='/onboard/start'){
      if(!(await installationAuthorized(req,env)))return json({ok:false,error:'Unauthorized installation.'},401);
      const installation=await registryByToken(env,bearer(req));
      if(installation?.squareConnected)return json({ok:false,error:'Disconnect Square before connecting PayPal.'},409);
      const b=requestBody,trackingId=clean(b.trackingId,120),returnUrl=clean(b.returnUrl,1000);
      if(!trackingId||!/^https:\/\//i.test(returnUrl))return json({ok:false,error:'trackingId and HTTPS returnUrl are required.'},400);
      const attribution=partnerAttribution(env),pp=await paypalAccess(env);
      const payload={tracking_id:trackingId,partner_config_override:{return_url:returnUrl,return_url_description:'Return to OneArtist Hub'},operations:[{operation:'API_INTEGRATION',api_integration_preference:{rest_api_integration:{integration_method:'PAYPAL',integration_type:'THIRD_PARTY',third_party_details:{features:['PAYMENT','REFUND']}}}}],products:['EXPRESS_CHECKOUT'],legal_consents:[{type:'SHARE_DATA_CONSENT',granted:true}]};
      const headers={authorization:`Bearer ${pp.token}`,'content-type':'application/json','PayPal-Partner-Attribution-Id':attribution};
      const r=await fetch(pp.base+'/v2/customer/partner-referrals',{method:'POST',headers,body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)return json({ok:false,error:clean(j.message||'PayPal partner referral failed.',500),details:j.details||[]},r.status);
      const actionUrl=(j.links||[]).find(x=>x.rel==='action_url')?.href,self=(j.links||[]).find(x=>x.rel==='self')?.href;if(!actionUrl)return json({ok:false,error:'PayPal did not return an onboarding URL.'},502);
      return json({ok:true,actionUrl,self,trackingId:await pendingTrackingProof(bearer(req),trackingId)},201);
    }
    if(req.method==='POST'&&url.pathname==='/square/connect/start'){
      const installation=await registryByToken(env,bearer(req));
      if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      if(installation.merchantId)return json({ok:false,error:'Disconnect PayPal before connecting Square.'},409);
      const b=requestBody,returnUrl=clean(b.returnUrl,1000);
      if(!/^https:\/\//i.test(returnUrl))return json({ok:false,error:'HTTPS returnUrl is required.'},400);
      const cfg=await squareConfig(env);
      const state=bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
      const kv=registry(env);if(!kv)throw configurationError('CONNECT_INSTALLATIONS KV binding is not configured.');
      await kv.put(squareOAuthKey(state),JSON.stringify({installationId:installation.installationId,returnUrl,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+10*60*1000).toISOString()}),{expirationTtl:600});
      const scope=['MERCHANT_PROFILE_READ','PAYMENTS_READ','PAYMENTS_WRITE','ORDERS_READ','ORDERS_WRITE'].join(' ');
      const authUrl=new URL(cfg.base+'/oauth2/authorize');authUrl.searchParams.set('client_id',cfg.clientId);authUrl.searchParams.set('scope',scope);authUrl.searchParams.set('session','false');authUrl.searchParams.set('state',state);authUrl.searchParams.set('redirect_uri',cfg.redirect);
      return json({ok:true,actionUrl:authUrl.toString()});
    }
    if(req.method==='GET'&&url.pathname==='/square/oauth/callback'){
      const cfg=await squareConfig(env),state=clean(url.searchParams.get('state'),200),code=clean(url.searchParams.get('code'),2048),denied=clean(url.searchParams.get('error'),100);
      const kv=registry(env);let pending=null;try{pending=state?await kv.get(squareOAuthKey(state),'json'):null}catch{}
      if(!pending||new Date(pending.expiresAt)<=new Date())return new Response('Square authorization expired. Please reconnect.',{status:400,headers:{'content-type':'text/plain'}});
      await kv.delete(squareOAuthKey(state));
      if(denied||!code)return Response.redirect(pending.returnUrl+'?square=denied',302);
      const tokenResponse=await fetch(cfg.base+'/oauth2/token',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({client_id:cfg.clientId,client_secret:cfg.clientSecret,code,grant_type:'authorization_code',redirect_uri:cfg.redirect})});
      let token={};try{token=await tokenResponse.json()}catch{}
      if(!tokenResponse.ok||!token.access_token||!token.refresh_token)return new Response('Square authorization could not be completed.',{status:400,headers:{'content-type':'text/plain'}});
      const record=await registryInstallation(env,pending.installationId);if(!record?.active)return new Response('OneArtist installation is not active.',{status:409,headers:{'content-type':'text/plain'}});
      if(record.merchantId)return new Response('PayPal is already connected. Disconnect PayPal before using Square.',{status:409,headers:{'content-type':'text/plain'}});
      const locationsResponse=await fetch(cfg.base+'/v2/locations',{headers:{authorization:'Bearer '+token.access_token,'Square-Version':'2026-09-16'}});
      let locations={};try{locations=await locationsResponse.json()}catch{}
      const location=(locations.locations||[]).find(x=>x.status==='ACTIVE')||(locations.locations||[])[0];
      if(!location?.id)return new Response('Square connected, but no active Square location was returned.',{status:400,headers:{'content-type':'text/plain'}});
      await saveSquareConnection(env,pending.installationId,{accessToken:token.access_token,refreshToken:token.refresh_token,expiresAt:token.expires_at||'',merchantId:token.merchant_id||'',locationId:location.id,locationName:location.name||'',scopes:token.scopes||[],updatedAt:new Date().toISOString(),connectedAt:new Date().toISOString()});
      record.squareConnected=true;record.squareMerchantId=clean(token.merchant_id,191);record.squareLocationId=clean(location.id,64);record.updatedAt=new Date().toISOString();await putRegistryInstallation(env,record);
      return Response.redirect(pending.returnUrl+'?square=connected',302);
    }
    if(req.method==='GET'&&url.pathname==='/square/status'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      const connection=await squareConnection(env,installation.installationId);
      if(!connection)return json({ok:true,configured:!!env.SQUARE_CLIENT_ID,status:'not_connected',merchantId:'',locationId:'',environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production'});
      try{await squareApi(env,installation.installationId,'/locations');}catch(e){return json({ok:true,configured:true,status:'action_required',merchantId:connection.merchantId||'',locationId:connection.locationId||'',environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production',error:clean(e.message,300)});}
      return json({ok:true,configured:true,status:'connected',merchantId:connection.merchantId||'',locationId:connection.locationId||'',locationName:connection.locationName||'',environment:env.SQUARE_ENV==='sandbox'?'sandbox':'production'});
    }
    if(req.method==='POST'&&url.pathname==='/square/disconnect'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      const connection=await squareConnection(env,installation.installationId);if(connection){
        const cfg=await squareConfig(env);
        try{await fetch(cfg.base+'/oauth2/revoke',{method:'POST',headers:{authorization:'Client '+cfg.clientSecret,'content-type':'application/json'},body:JSON.stringify({client_id:cfg.clientId,access_token:connection.accessToken,revoke_only_access_token:false})})}catch{}
      }
      await clearSquareConnection(env,installation.installationId);
      installation.squareConnected=false;installation.squareMerchantId='';installation.squareLocationId='';installation.updatedAt=new Date().toISOString();await putRegistryInstallation(env,installation);
      return json({ok:true});
    }
    if(req.method==='POST'&&url.pathname==='/square/checkout'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      if(installation.merchantId)return json({ok:false,error:'PayPal is connected. Disconnect PayPal before using Square.'},409);
      const connection=await squareConnection(env,installation.installationId);if(!connection)return json({ok:false,error:'Square is not connected.'},409);
      const b=requestBody,body=b.body||{},data=await squareApi(env,installation.installationId,'/online-checkout/payment-links',{method:'POST',body});
      return json({ok:true,paymentLink:data.payment_link||null,order:data.related_resources?.orders?.[0]||null});
    }
    if(req.method==='POST'&&url.pathname==='/square/order'){
      const installation=await registryByToken(env,bearer(req));if(!installation||!installation.active)return json({ok:false,error:'Unauthorized installation.'},401);
      const orderId=clean(requestBody.orderId,192);if(!orderId)return json({ok:false,error:'Missing Square order ID.'},400);
      const data=await squareApi(env,installation.installationId,'/orders/'+encodeURIComponent(orderId));
      return json({ok:true,order:data.order||null});
    }
    if(req.method==='POST'&&url.pathname==='/onboard/status'){
      if(!(await installationAuthorized(req,env)))return json({ok:false,error:'Unauthorized installation.'},401);
      const b=requestBody,merchantId=clean(b.merchantId,40),trackingId=clean(b.trackingId,120);
      if(!merchantId||!trackingId||!env.PAYPAL_PARTNER_ID)return json({ok:false,error:'merchantId, trackingId and PAYPAL_PARTNER_ID are required.'},400);
      const pendingTracking=await verifyPendingTracking(bearer(req),trackingId);if(!pendingTracking)return json({ok:false,error:'Unauthorized or invalid pending onboarding.'},403);
      const pp=await paypalJson(env,`/v1/customer/partners/${encodeURIComponent(env.PAYPAL_PARTNER_ID)}/merchant-integrations/${encodeURIComponent(merchantId)}`,{});
      if(!pp.ok)return json({ok:false,error:clean(pp.data.message||'Unable to verify merchant onboarding.',500)},pp.status);
      const j=pp.data;if(j.tracking_id!==pendingTracking)return json({ok:false,error:'PayPal merchant does not belong to this pending onboarding.'},403);const confirmedMerchant=clean(j.merchant_id||merchantId,40);if(registry(env)&&!(await associateMerchant(env,bearer(req),confirmedMerchant)))return json({ok:false,error:'PayPal merchant is already associated with another installation.'},409);return json({ok:true,merchantId:confirmedMerchant,trackingId:j.tracking_id,paymentsReceivable:!!j.payments_receivable,primaryEmailConfirmed:!!j.primary_email_confirmed,products:j.products||[],oauthIntegrations:j.oauth_integrations||[]});
    }
    if(!(await authorized(req,env)))return json({ok:false,error:'Unauthorized'},401);
    if(req.method==='GET'&&url.pathname==='/config'){partnerAttribution(env);const pp=await paypalAccess(env);return json({ok:true,clientId:clean(env.PAYPAL_PARTNER_CLIENT_ID,255),environment:env.PAYPAL_ENV==='live'?'live':'sandbox',webhookConfigured:!!(env.PAYPAL_WEBHOOK_ID_LIVE||env.PAYPAL_WEBHOOK_ID_SANDBOX||env.PAYPAL_WEBHOOK_ID),authenticated:!!pp.token});}
    if(req.method==='POST'&&url.pathname==='/paypal/create-order'){
      const b=requestBody,merchantId=clean(b.merchantId,40),payload=b.payload||{};
      if(!merchantId||!Array.isArray(payload.purchase_units)||!payload.purchase_units.length)return json({ok:false,error:'merchantId and a valid order payload are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      if(payload.purchase_units.some(unit=>unit?.payment_instruction&&Object.prototype.hasOwnProperty.call(unit.payment_instruction,'platform_fees')))return json({ok:false,error:'Platform fees are not supported.'},400);
      payload.purchase_units=payload.purchase_units.map(u=>({...u,payee:{...(u.payee||{}),merchant_id:merchantId},payment_instruction:{...(u.payment_instruction||{}),disbursement_mode:'INSTANT'}}));
      const r=await paypalJson(env,'/v2/checkout/orders',{method:'POST',merchantId,body:payload,requestId:b.requestId});
      if(!r.ok||!r.data?.id)return json({ok:false,error:clean(r.data.message||'PayPal order creation failed.',500),details:r.data.details||[]},r.status||502);
      return json({ok:true,order:r.data},201);
    }
    if(req.method==='POST'&&url.pathname==='/paypal/order'){
      const b=requestBody,merchantId=clean(b.merchantId,40),orderId=clean(b.orderId,80);if(!merchantId||!orderId)return json({ok:false,error:'merchantId and orderId are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/checkout/orders/${encodeURIComponent(orderId)}`,{merchantId});if(!r.ok)return json({ok:false,error:clean(r.data.message||'PayPal order lookup failed.',500)},r.status||502);return json({ok:true,order:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/capture'){
      const b=requestBody,merchantId=clean(b.merchantId,40),orderId=clean(b.orderId,80);if(!merchantId||!orderId)return json({ok:false,error:'merchantId and orderId are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{method:'POST',merchantId,body:{},requestId:b.requestId});if(!r.ok)return json({ok:false,error:clean(r.data.message||'PayPal capture failed.',500),details:r.data.details||[]},r.status||502);return json({ok:true,order:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/refund'){
      const b=requestBody,merchantId=clean(b.merchantId,40),captureId=clean(b.captureId,80);if(!merchantId||!captureId)return json({ok:false,error:'merchantId and captureId are required.'},400);
      if(!(await authorizedForMerchant(req,env,merchantId)))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,{method:'POST',merchantId,body:b.payload||{},requestId:b.requestId});if(!r.ok||!['COMPLETED','PENDING'].includes(String(r.data.status||'').toUpperCase()))return json({ok:false,error:clean(r.data.message||'PayPal refund failed.',500),details:r.data.details||[]},r.status||502);return json({ok:true,refund:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/webhook/verify'){
      const b=requestBody,h=b.headers||{},rawBody=String(b.rawBody||'');if(!rawBody||!h.auth_algo||!h.cert_url||!h.transmission_id||!h.transmission_sig||!h.transmission_time)return json({ok:false,error:'PayPal webhook verification data is incomplete.'},400);let webhookEvent={};try{webhookEvent=JSON.parse(rawBody)}catch{return json({ok:false,error:'PayPal webhook body is invalid JSON.'},400);}
      const webhookId=env.PAYPAL_ENV==='live'?(env.PAYPAL_WEBHOOK_ID_LIVE||env.PAYPAL_WEBHOOK_ID):(env.PAYPAL_WEBHOOK_ID_SANDBOX||env.PAYPAL_WEBHOOK_ID);if(!webhookId)return json({ok:false,error:'PayPal webhook ID is not configured on the Connect worker.'},503);
      const pp=await paypalAccess(env),prefix=JSON.stringify({auth_algo:h.auth_algo,cert_url:h.cert_url,transmission_id:h.transmission_id,transmission_sig:h.transmission_sig,transmission_time:h.transmission_time,webhook_id:webhookId}),verifyBody=prefix.slice(0,-1)+`,"webhook_event":${rawBody}}`;
      const r=await fetch(pp.base+'/v1/notifications/verify-webhook-signature',{method:'POST',headers:{authorization:`Bearer ${pp.token}`,'content-type':'application/json'},body:verifyBody});let j={};try{j=await r.json()}catch{}if(!r.ok)return json({ok:false,error:clean(j.message||'PayPal webhook verification failed.',500)},r.status);return json({ok:true,verified:j.verification_status==='SUCCESS',status:j.verification_status||''});
    }
    return json({ok:false,error:'Not found'},404);
  }catch(e){return json({ok:false,error:clean(e?.message||e,500)},Number(e?.status)||500)}
}}
