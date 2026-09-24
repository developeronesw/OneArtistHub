import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import test from 'node:test';
import worker,{installationId as generateInstallationId,installationToken as generateInstallationToken} from '../paypal-worker.js';

const merchantId=`merchant-${randomUUID().replaceAll('-','').slice(0,24)}`;
const installationToken=`installation-${randomUUID()}`;
const clientId=`client-${randomUUID()}`;
const partnerId=`partner-${randomUUID()}`;
const attribution=`bn-${randomUUID()}`;
const webhookId=`webhook-${randomUUID()}`;

function environment(overrides={}){
  return {
    PAYPAL_ENV:'sandbox',
    PAYPAL_PARTNER_CLIENT_ID:clientId,
    PAYPAL_PARTNER_SECRET:randomUUID(),
    PAYPAL_PARTNER_ID:partnerId,
    PAYPAL_PARTNER_ATTRIBUTION_ID:attribution,
    PAYPAL_WEBHOOK_ID_SANDBOX:webhookId,
    CONNECT_INSTALLATION_TOKENS:JSON.stringify([installationToken]),
    CONNECT_INSTALLATION_ROUTES:JSON.stringify({[merchantId]:{url:'https://artist.example',token:installationToken}}),
    ...overrides
  };
}

function request(path,init={}){return new Request(`https://connect.oneartisthub.site${path}`,init)}
async function responseJson(response){return {status:response.status,body:await response.json()}}
async function withFetch(mock,callback){const original=globalThis.fetch;globalThis.fetch=mock;try{return await callback()}finally{globalThis.fetch=original}}
function jsonResponse(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}})}
function kv(){const values=new Map();return {async get(key,type){const value=values.get(key);return type==='json'&&value?JSON.parse(value):value??null},async put(key,value){values.set(key,String(value))},async delete(key){values.delete(key)},values}}
const bootstrapToken=id=>`bootstrap-${id}`;
const bootstrapHash=token=>createHash('sha256').update(token).digest('base64url');
function registryEnvironment(store,overrides={}){return environment({CONNECT_SHARED_SECRET:'registry-administrative-secret',CONNECT_INSTALLATIONS:store,CONNECT_INSTALLATION_TOKENS:'[]',CONNECT_INSTALLATION_ROUTES:'{}',...overrides})}
async function register(store,installationId,url='https://artist.example',token=bootstrapToken(installationId)){
  const env=registryEnvironment(store);
  const activation=await responseJson(await worker.fetch(request('/installations/activate',{method:'POST',headers:{authorization:'Bearer registry-administrative-secret','content-type':'application/json'},body:JSON.stringify({installationId,url,bootstrapHash:bootstrapHash(token)})}),env));assert.ok([200,201].includes(activation.status));
  return responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({installationId,url})}),env));
}

test('health endpoint stays public and reports the configured environment',{concurrency:false},async()=>{
  const result=await responseJson(await worker.fetch(request('/health'),environment()));
  assert.equal(result.status,200);
  assert.deepEqual(result.body,{ok:true,service:'OneArtist Connect',paypalEnvironment:'sandbox',squareEnvironment:'production',squareConfigured:false});
});

test('rejects caller-supplied platform fees before making a PayPal request',{concurrency:false},async()=>{
  let calls=0;
  const result=await withFetch(async()=>{calls++;throw new Error('PayPal must not be called');},()=>worker.fetch(request('/paypal/create-order',{method:'POST',headers:{authorization:`Bearer ${installationToken}`,'content-type':'application/json'},body:JSON.stringify({merchantId,payload:{purchase_units:[{payment_instruction:{platform_fees:[]}}]}})}),environment()));
  const body=await responseJson(result);
  assert.equal(body.status,400);
  assert.deepEqual(body.body,{ok:false,error:'Platform fees are not supported.'});
  assert.equal(calls,0);
});

test('returns a JSON 400 response for malformed JSON on every JSON route',{concurrency:false},async()=>{
  for(const path of ['/installations/register','/installations/revoke','/onboard/start','/onboard/status','/paypal/create-order','/paypal/order','/paypal/capture','/paypal/refund','/paypal/webhook/verify']){
    const result=await responseJson(await worker.fetch(request(path,{method:'POST',headers:{authorization:`Bearer ${installationToken}`,'content-type':'application/json'},body:'{"broken"'}),environment()));
    assert.equal(result.status,400,path);
    assert.deepEqual(result.body,{ok:false,error:'Invalid JSON request body.'},path);
  }
});

test('generates unique cryptographically random installation credentials with the required format',{concurrency:false},()=>{
  const ids=new Set(Array.from({length:64},()=>generateInstallationId()));
  assert.equal(ids.size,64);
  for(const id of ids)assert.match(id,/^OAH_SITE_[a-f0-9]{32}$/);
  const tokens=new Set(Array.from({length:64},()=>generateInstallationToken()));
  assert.equal(tokens.size,64);
  for(const token of tokens)assert.match(token,/^OAH_INST_[a-f0-9]{64}$/);
});

test('registration is one-time bootstrap protected and validates inputs',{concurrency:false},async()=>{
  const store=kv(),installationId='OAH_SITE_0123456789abcdef0123456789abcdef';
  await worker.fetch(request('/installations/activate',{method:'POST',headers:{authorization:'Bearer registry-administrative-secret','content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example',bootstrapHash:bootstrapHash(bootstrapToken(installationId))})}),registryEnvironment(store));
  const unauth=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example'})}),registryEnvironment(store)));
  assert.equal(unauth.status,401);
  const invalid=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:'Bearer invalid','content-type':'application/json'},body:JSON.stringify({installationId:'not-an-installation',url:'http://artist.example'})}),registryEnvironment(store)));assert.equal(invalid.status,400);
  const first=await register(store,installationId);assert.equal(first.status,201);assert.match(first.body.token,/^OAH_INST_[a-f0-9]{64}$/);
  const retry=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:`Bearer ${bootstrapToken(installationId)}`,'content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example'})}),registryEnvironment(store)));assert.equal(retry.status,401);
  assert.equal([...store.values.values()].some(v=>v.includes(first.body.token)),false,'registry must not persist a plaintext credential');
});

test('a bootstrap credential cannot register an arbitrary installation',{concurrency:false},async()=>{
  const store=kv(),firstId='OAH_SITE_11111111111111111111111111111111',secondId='OAH_SITE_22222222222222222222222222222222',firstToken=bootstrapToken(firstId);
  const env=registryEnvironment(store);await worker.fetch(request('/installations/activate',{method:'POST',headers:{authorization:'Bearer registry-administrative-secret','content-type':'application/json'},body:JSON.stringify({installationId:firstId,url:'https://artist.example',bootstrapHash:bootstrapHash(firstToken)})}),env);
  const result=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:`Bearer ${firstToken}`,'content-type':'application/json'},body:JSON.stringify({installationId:secondId,url:'https://other.example'})}),env));
  assert.equal(result.status,401);
});

test('trusted activation stores only a bootstrap hash and rejects unauthenticated callers',{concurrency:false},async()=>{
  const store=kv(),installationId='OAH_SITE_44444444444444444444444444444444',token=bootstrapToken(installationId),env=registryEnvironment(store);
  const denied=await responseJson(await worker.fetch(request('/installations/activate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example',bootstrapHash:bootstrapHash(token)})}),env));assert.equal(denied.status,401);
  const created=await responseJson(await worker.fetch(request('/installations/activate',{method:'POST',headers:{authorization:'Bearer registry-administrative-secret','content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example',bootstrapHash:bootstrapHash(token)})}),env));assert.equal(created.status,201);
  const activation=await store.get(`activation:${installationId}`,'json');assert.equal(activation.bootstrapHash,bootstrapHash(token));assert.equal(JSON.stringify(activation).includes(token),false);
});

test('bootstrap is origin-scoped, one-time, and cannot authenticate or revoke',{concurrency:false},async()=>{
  const store=kv(),installationId='OAH_SITE_33333333333333333333333333333333',token=bootstrapToken(installationId),env=registryEnvironment(store);
  await worker.fetch(request('/installations/activate',{method:'POST',headers:{authorization:'Bearer registry-administrative-secret','content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example',bootstrapHash:bootstrapHash(token)})}),env);
  const wrongOrigin=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({installationId,url:'https://other.example'})}),env));assert.equal(wrongOrigin.status,401);
  const normal=await responseJson(await worker.fetch(request('/onboard/start',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({trackingId:'x',returnUrl:'https://artist.example'})}),env));assert.equal(normal.status,401);
  const revoke=await responseJson(await worker.fetch(request('/installations/revoke',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({installationId})}),env));assert.equal(revoke.status,403);
  const registered=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example'})}),env));assert.equal(registered.status,201);
  const replay=await responseJson(await worker.fetch(request('/installations/register',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify({installationId,url:'https://artist.example'})}),env));assert.equal(replay.status,401);
});

test('registry credentials are installation and merchant scoped, including webhook routing',{concurrency:false},async()=>{
  const store=kv(),firstId='OAH_SITE_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',secondId='OAH_SITE_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',merchant='merchant-registry';
  const first=(await register(store,firstId)).body,second=(await register(store,secondId,'https://other.example')).body;
  const start=await withFetch(async(url)=>{
    if(String(url).endsWith('/v1/oauth2/token'))return jsonResponse({access_token:'access-token'});
    if(String(url).endsWith('/v2/customer/partner-referrals'))return jsonResponse({links:[{rel:'action_url',href:'https://paypal.example/onboard'}]});
    throw new Error(`Unexpected URL: ${url}`);
  },async()=>responseJson(await worker.fetch(request('/onboard/start',{method:'POST',headers:{authorization:`Bearer ${first.token}`,'content-type':'application/json'},body:JSON.stringify({trackingId:'tracking-registry',returnUrl:'https://artist.example/api/paypal/connect/callback'})}),registryEnvironment(store))));
  assert.equal(start.status,201);
  const status=await withFetch(async(url)=>{
    if(String(url).endsWith('/v1/oauth2/token'))return jsonResponse({access_token:'access-token'});
    if(String(url).includes('/merchant-integrations/'))return jsonResponse({merchant_id:merchant,tracking_id:'tracking-registry',payments_receivable:true,primary_email_confirmed:true});
    throw new Error(`Unexpected URL: ${url}`);
  },async()=>responseJson(await worker.fetch(request('/onboard/status',{method:'POST',headers:{authorization:`Bearer ${first.token}`,'content-type':'application/json'},body:JSON.stringify({merchantId:merchant,trackingId:start.body.trackingId})}),registryEnvironment(store))));
  assert.equal(status.status,200);
  const cross=await responseJson(await worker.fetch(request('/paypal/order',{method:'POST',headers:{authorization:`Bearer ${second.token}`,'content-type':'application/json'},body:JSON.stringify({merchantId:merchant,orderId:'ORDER'})}),registryEnvironment(store)));
  assert.equal(cross.status,403);
  const forwarded=await withFetch(async(url,init={})=>{
    if(String(url).endsWith('/v1/oauth2/token'))return jsonResponse({access_token:'access-token'});
    if(String(url).endsWith('/v1/notifications/verify-webhook-signature'))return jsonResponse({verification_status:'SUCCESS'});
    if(String(url)==='https://artist.example/api/paypal/webhook/internal'){assert.equal(init.headers['x-oneartist-connect-token'],first.token);return jsonResponse({ok:true})}
    throw new Error(`Unexpected URL: ${url}`);
  },async()=>responseJson(await worker.fetch(request('/paypal/webhook',{method:'POST',headers:{'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api-m.sandbox.paypal.com/cert','paypal-transmission-id':'TRANSMISSION-ID','paypal-transmission-sig':'signature','paypal-transmission-time':'2026-09-17T00:00:00Z'},body:JSON.stringify({resource:{payee:{merchant_id:merchant}}})}),registryEnvironment(store))));
  assert.equal(forwarded.status,200);
});

test('revoked registry installations cannot authenticate',{concurrency:false},async()=>{
  const store=kv(),installationId='OAH_SITE_cccccccccccccccccccccccccccccccc',registered=(await register(store,installationId)).body;
  const revoked=await responseJson(await worker.fetch(request('/installations/revoke',{method:'POST',headers:{authorization:`Bearer ${registered.token}`,'content-type':'application/json'},body:JSON.stringify({installationId})}),registryEnvironment(store)));
  assert.equal(revoked.status,200);
  const result=await responseJson(await worker.fetch(request('/onboard/start',{method:'POST',headers:{authorization:`Bearer ${registered.token}`,'content-type':'application/json'},body:JSON.stringify({trackingId:'x',returnUrl:'https://artist.example'})}),registryEnvironment(store)));
  assert.equal(result.status,401);
});

test('an installation cannot revoke another installation',{concurrency:false},async()=>{
  const store=kv(),firstId='OAH_SITE_dddddddddddddddddddddddddddddddd',secondId='OAH_SITE_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
  const first=(await register(store,firstId)).body,second=(await register(store,secondId,'https://other.example')).body;
  const cross=await responseJson(await worker.fetch(request('/installations/revoke',{method:'POST',headers:{authorization:`Bearer ${first.token}`,'content-type':'application/json'},body:JSON.stringify({installationId:secondId})}),registryEnvironment(store)));
  assert.equal(cross.status,403);
  const own=await responseJson(await worker.fetch(request('/installations/revoke',{method:'POST',headers:{authorization:`Bearer ${second.token}`,'content-type':'application/json'},body:JSON.stringify({installationId:secondId})}),registryEnvironment(store)));
  assert.equal(own.status,200);
});

test('legacy installation credentials remain accepted and merchant-scoped',{concurrency:false},async()=>{
  const legacyMerchant='merchant-legacy',legacyToken='legacy-installation-token',env=environment({CONNECT_INSTALLATION_TOKENS:JSON.stringify([legacyToken]),CONNECT_INSTALLATION_ROUTES:JSON.stringify({[legacyMerchant]:{url:'https://legacy.example',token:legacyToken}})});
  const own=await responseJson(await worker.fetch(request('/paypal/order',{method:'POST',headers:{authorization:`Bearer ${legacyToken}`,'content-type':'application/json'},body:JSON.stringify({merchantId:'another-merchant',orderId:'ORDER'})}),env));
  assert.equal(own.status,403);
  const anonymous=await responseJson(await worker.fetch(request('/onboard/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({trackingId:'legacy',returnUrl:'https://legacy.example'})}),env));
  assert.equal(anonymous.status,401);
});

test('fails safely when required PayPal partner attribution is missing',{concurrency:false},async()=>{
  let calls=0;
  const result=await withFetch(async()=>{calls++;throw new Error('PayPal must not be called');},()=>worker.fetch(request('/config',{headers:{authorization:`Bearer ${installationToken}`}}),environment({PAYPAL_PARTNER_ATTRIBUTION_ID:''})));
  const body=await responseJson(result);
  assert.equal(body.status,503);
  assert.deepEqual(body.body,{ok:false,error:'PayPal partner attribution ID is not configured.'});
  assert.equal(calls,0);
});

test('authenticated order creation sends the artist payee, instant disbursement, and attribution',{concurrency:false},async()=>{
  const calls=[];
  const result=await withFetch(async(url,init={})=>{
    calls.push({url:String(url),init});
    if(String(url).endsWith('/v1/oauth2/token'))return jsonResponse({access_token:'access-token'});
    if(String(url).endsWith('/v2/checkout/orders'))return jsonResponse({id:'ORDER-ID',status:'CREATED'},201);
    throw new Error(`Unexpected URL: ${url}`);
  },()=>worker.fetch(request('/paypal/create-order',{method:'POST',headers:{authorization:`Bearer ${installationToken}`,'content-type':'application/json'},body:JSON.stringify({merchantId,payload:{intent:'CAPTURE',purchase_units:[{amount:{currency_code:'USD',value:'10.00'}}]}})}),environment()));
  const body=await responseJson(result);
  assert.equal(body.status,201);
  assert.equal(body.body.order.id,'ORDER-ID');
  assert.equal(calls.length,2);
  const payPalRequest=calls[1];
  assert.equal(payPalRequest.init.headers['PayPal-Partner-Attribution-Id'],attribution);
  const purchaseUnit=JSON.parse(payPalRequest.init.body).purchase_units[0];
  assert.equal(purchaseUnit.payee.merchant_id,merchantId);
  assert.equal(purchaseUnit.payment_instruction.disbursement_mode,'INSTANT');
  assert.equal(Object.hasOwn(purchaseUnit.payment_instruction,'platform_fees'),false);
});

test('verified PayPal webhooks are forwarded only after signature verification',{concurrency:false},async()=>{
  const calls=[];
  const event={id:'EVENT-ID',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{payee:{merchant_id:merchantId}}};
  const result=await withFetch(async(url,init={})=>{
    calls.push({url:String(url),init});
    if(String(url).endsWith('/v1/oauth2/token'))return jsonResponse({access_token:'access-token'});
    if(String(url).endsWith('/v1/notifications/verify-webhook-signature'))return jsonResponse({verification_status:'SUCCESS'});
    if(String(url)==='https://artist.example/api/paypal/webhook/internal')return jsonResponse({ok:true});
    throw new Error(`Unexpected URL: ${url}`);
  },()=>worker.fetch(request('/paypal/webhook',{method:'POST',headers:{'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api-m.sandbox.paypal.com/cert','paypal-transmission-id':'TRANSMISSION-ID','paypal-transmission-sig':'signature','paypal-transmission-time':'2026-09-17T00:00:00Z'},body:JSON.stringify(event)}),environment()));
  const body=await responseJson(result);
  assert.deepEqual(body,{status:200,body:{ok:true,forwarded:true}});
  assert.equal(calls.length,3);
  assert.equal(calls[2].init.headers['x-oneartist-connect-token'],installationToken);
  assert.equal(calls[2].init.headers['x-oneartist-connect-merchant'],merchantId);
});
