import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import worker from '../paypal-worker.js';

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

test('health endpoint stays public and reports the configured environment',{concurrency:false},async()=>{
  const result=await responseJson(await worker.fetch(request('/health'),environment()));
  assert.equal(result.status,200);
  assert.deepEqual(result.body,{ok:true,service:'OneArtist Connect',paypalEnvironment:'sandbox'});
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
  for(const path of ['/onboard/start','/onboard/status','/paypal/create-order','/paypal/order','/paypal/capture','/paypal/refund','/paypal/webhook/verify']){
    const result=await responseJson(await worker.fetch(request(path,{method:'POST',headers:{authorization:`Bearer ${installationToken}`,'content-type':'application/json'},body:'{"broken"'}),environment()));
    assert.equal(result.status,400,path);
    assert.deepEqual(result.body,{ok:false,error:'Invalid JSON request body.'},path);
  }
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
