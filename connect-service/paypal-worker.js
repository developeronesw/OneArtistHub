function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
const clean=(v,n=500)=>String(v??'').replace(/\0/g,'').slice(0,n)
const JSON_POST_ROUTES=new Set(['/onboard/start','/onboard/status','/paypal/create-order','/paypal/order','/paypal/capture','/paypal/refund','/paypal/webhook/verify'])
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
function authorized(req,env){const token=bearer(req);if(!token)return false;if(env.CONNECT_SHARED_SECRET&&token===env.CONNECT_SHARED_SECRET)return true;return Object.values(installationRoutes(env)).some(route=>route&&route.token===token)}
function installationAuthorized(req,env){const token=bearer(req);if(!token)return false;try{const tokens=JSON.parse(String(env.CONNECT_INSTALLATION_TOKENS||'[]'));if(Array.isArray(tokens)&&tokens.includes(token))return true}catch{}return Object.values(installationRoutes(env)).some(route=>route&&route.token===token)}
function authorizedForMerchant(req,env,merchantId){if(env.CONNECT_SHARED_SECRET&&bearer(req)===env.CONNECT_SHARED_SECRET)return true;const route=installationRoutes(env)[clean(merchantId,64)];return !!route?.token&&bearer(req)===String(route.token)}
async function pendingTrackingProof(token,trackingId){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(token),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(trackingId));return `${trackingId}.${base64url(String.fromCharCode(...new Uint8Array(signature)))}`}
async function verifyPendingTracking(token,pending){const value=String(pending||''),separator=value.lastIndexOf('.');if(separator<1)return '';const trackingId=value.slice(0,separator),expected=await pendingTrackingProof(token,trackingId);return expected===value?trackingId:''}
function webhookMerchantIds(event){const resource=event?.resource||{},ids=[];const add=value=>{const id=clean(value,64);if(id&&!ids.includes(id))ids.push(id)};add(resource.payee?.merchant_id);for(const unit of resource.purchase_units||[])add(unit?.payee?.merchant_id);add(resource.seller_merchant_id);add(resource.seller?.merchant_id);return ids}
function webhookRoute(env,event){const routes=installationRoutes(env);for(const merchantId of webhookMerchantIds(event)){const route=routes[merchantId];if(!route?.url||!route?.token)continue;try{const target=new URL(String(route.url));if(target.protocol!=='https:')continue;return {merchantId,url:target.toString().replace(/\/+$/,''),token:String(route.token)}}catch{}}return null}
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
  const route=webhookRoute(env,verification.event);if(!route)return json({ok:false,error:'No connected OneArtist site is registered for this PayPal merchant.'},404);
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
export default {async fetch(req,env){
  try{
    const url=new URL(req.url);
    if(url.pathname==='/health')return json({ok:true,service:'OneArtist Connect',paypalEnvironment:env.PAYPAL_ENV==='live'?'live':'sandbox'});
    if(req.method==='POST'&&url.pathname==='/paypal/webhook')return receiveWebhook(req,env);
    let requestBody={};
    if(req.method==='POST'&&JSON_POST_ROUTES.has(url.pathname)){try{requestBody=await req.json()}catch{return json({ok:false,error:'Invalid JSON request body.'},400)}}
    if(req.method==='POST'&&url.pathname==='/onboard/start'){
      if(!installationAuthorized(req,env))return json({ok:false,error:'Unauthorized installation.'},401);
      const b=requestBody,trackingId=clean(b.trackingId,120),returnUrl=clean(b.returnUrl,1000);
      if(!trackingId||!/^https:\/\//i.test(returnUrl))return json({ok:false,error:'trackingId and HTTPS returnUrl are required.'},400);
      const attribution=partnerAttribution(env),pp=await paypalAccess(env);
      const payload={tracking_id:trackingId,partner_config_override:{return_url:returnUrl,return_url_description:'Return to OneArtist Hub'},operations:[{operation:'API_INTEGRATION',api_integration_preference:{rest_api_integration:{integration_method:'PAYPAL',integration_type:'THIRD_PARTY',third_party_details:{features:['PAYMENT','REFUND']}}}}],products:['EXPRESS_CHECKOUT'],legal_consents:[{type:'SHARE_DATA_CONSENT',granted:true}]};
      const headers={authorization:`Bearer ${pp.token}`,'content-type':'application/json','PayPal-Partner-Attribution-Id':attribution};
      const r=await fetch(pp.base+'/v2/customer/partner-referrals',{method:'POST',headers,body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)return json({ok:false,error:clean(j.message||'PayPal partner referral failed.',500),details:j.details||[]},r.status);
      const actionUrl=(j.links||[]).find(x=>x.rel==='action_url')?.href,self=(j.links||[]).find(x=>x.rel==='self')?.href;if(!actionUrl)return json({ok:false,error:'PayPal did not return an onboarding URL.'},502);
      return json({ok:true,actionUrl,self,trackingId:await pendingTrackingProof(bearer(req),trackingId)},201);
    }
    if(req.method==='POST'&&url.pathname==='/onboard/status'){
      if(!installationAuthorized(req,env))return json({ok:false,error:'Unauthorized installation.'},401);
      const b=requestBody,merchantId=clean(b.merchantId,40),trackingId=clean(b.trackingId,120);
      if(!merchantId||!trackingId||!env.PAYPAL_PARTNER_ID)return json({ok:false,error:'merchantId, trackingId and PAYPAL_PARTNER_ID are required.'},400);
      const pendingTracking=await verifyPendingTracking(bearer(req),trackingId);if(!pendingTracking)return json({ok:false,error:'Unauthorized or invalid pending onboarding.'},403);
      const pp=await paypalJson(env,`/v1/customer/partners/${encodeURIComponent(env.PAYPAL_PARTNER_ID)}/merchant-integrations/${encodeURIComponent(merchantId)}`,{});
      if(!pp.ok)return json({ok:false,error:clean(pp.data.message||'Unable to verify merchant onboarding.',500)},pp.status);
      const j=pp.data;if(j.tracking_id!==pendingTracking)return json({ok:false,error:'PayPal merchant does not belong to this pending onboarding.'},403);return json({ok:true,merchantId:j.merchant_id||merchantId,trackingId:j.tracking_id,paymentsReceivable:!!j.payments_receivable,primaryEmailConfirmed:!!j.primary_email_confirmed,products:j.products||[],oauthIntegrations:j.oauth_integrations||[]});
    }
    if(!authorized(req,env))return json({ok:false,error:'Unauthorized'},401);
    if(req.method==='GET'&&url.pathname==='/config'){partnerAttribution(env);const pp=await paypalAccess(env);return json({ok:true,clientId:clean(env.PAYPAL_PARTNER_CLIENT_ID,255),environment:env.PAYPAL_ENV==='live'?'live':'sandbox',webhookConfigured:!!(env.PAYPAL_WEBHOOK_ID_LIVE||env.PAYPAL_WEBHOOK_ID_SANDBOX||env.PAYPAL_WEBHOOK_ID),authenticated:!!pp.token});}
    if(req.method==='POST'&&url.pathname==='/paypal/create-order'){
      const b=requestBody,merchantId=clean(b.merchantId,40),payload=b.payload||{};
      if(!merchantId||!Array.isArray(payload.purchase_units)||!payload.purchase_units.length)return json({ok:false,error:'merchantId and a valid order payload are required.'},400);
      if(!authorizedForMerchant(req,env,merchantId))return json({ok:false,error:'Unauthorized merchant.'},403);
      if(payload.purchase_units.some(unit=>unit?.payment_instruction&&Object.prototype.hasOwnProperty.call(unit.payment_instruction,'platform_fees')))return json({ok:false,error:'Platform fees are not supported.'},400);
      payload.purchase_units=payload.purchase_units.map(u=>({...u,payee:{...(u.payee||{}),merchant_id:merchantId},payment_instruction:{...(u.payment_instruction||{}),disbursement_mode:'INSTANT'}}));
      const r=await paypalJson(env,'/v2/checkout/orders',{method:'POST',merchantId,body:payload,requestId:b.requestId});
      if(!r.ok||!r.data?.id)return json({ok:false,error:clean(r.data.message||'PayPal order creation failed.',500),details:r.data.details||[]},r.status||502);
      return json({ok:true,order:r.data},201);
    }
    if(req.method==='POST'&&url.pathname==='/paypal/order'){
      const b=requestBody,merchantId=clean(b.merchantId,40),orderId=clean(b.orderId,80);if(!merchantId||!orderId)return json({ok:false,error:'merchantId and orderId are required.'},400);
      if(!authorizedForMerchant(req,env,merchantId))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/checkout/orders/${encodeURIComponent(orderId)}`,{merchantId});if(!r.ok)return json({ok:false,error:clean(r.data.message||'PayPal order lookup failed.',500)},r.status||502);return json({ok:true,order:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/capture'){
      const b=requestBody,merchantId=clean(b.merchantId,40),orderId=clean(b.orderId,80);if(!merchantId||!orderId)return json({ok:false,error:'merchantId and orderId are required.'},400);
      if(!authorizedForMerchant(req,env,merchantId))return json({ok:false,error:'Unauthorized merchant.'},403);
      const r=await paypalJson(env,`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,{method:'POST',merchantId,body:{},requestId:b.requestId});if(!r.ok)return json({ok:false,error:clean(r.data.message||'PayPal capture failed.',500),details:r.data.details||[]},r.status||502);return json({ok:true,order:r.data});
    }
    if(req.method==='POST'&&url.pathname==='/paypal/refund'){
      const b=requestBody,merchantId=clean(b.merchantId,40),captureId=clean(b.captureId,80);if(!merchantId||!captureId)return json({ok:false,error:'merchantId and captureId are required.'},400);
      if(!authorizedForMerchant(req,env,merchantId))return json({ok:false,error:'Unauthorized merchant.'},403);
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
