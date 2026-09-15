import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const api=await readFile(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');
const connectWorker=await readFile(new URL('../connect-service/paypal-worker.js',import.meta.url),'utf8');
const ingest=await readFile(new URL('../src/media-ingest.js',import.meta.url),'utf8');
const selfHost=await readFile(new URL('../self-host/server.mjs',import.meta.url),'utf8');
const mysql=await readFile(new URL('../self-host/mysql-adapter.mjs',import.meta.url),'utf8');
const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');

const checks=[
  ['receipt tokens are stored and checked',/receipt_tokens/.test(api)&&/receiptAccess/.test(api)&&/publicReceiptPayload/.test(api)],
  ['public receipts do not return customer email',/customer_email:''/.test(api)],
  ['download token consumption is atomic',/UPDATE download_tokens SET used_at=\? WHERE token_hash=\? AND used_at IS NULL AND expires_at>\?/.test(api)],
  ['login attempts and progressive throttle are persistent',/login_attempts/.test(api)&&/loginThrottle/.test(api)&&/login_failure/.test(api)],
  ['emergency recovery is throttled and audited',/emergency_reset_attempt/.test(api)&&/emergency_reset_success/.test(api)],
  ['production errors use request IDs',/error:'Internal server error',requestId/.test(api)&&!/message:String\(err/.test(api)],
  ['uploads have bounded streaming, signature validation, and preflight limits',/readLimitedBody/.test(api)&&/mediaBytesMatch/.test(api)&&/declaredLength/.test(api)],
  ['album ZIP policy is bounded',/ZIP_LIMITS/.test(ingest)&&/Nested ZIP archives/.test(ingest)],
  ['content URL policy rejects dangerous schemes',/safeUrl/.test(api)&&/sanitizeContentData/.test(api)],
  ['PayPal webhook values are reconciled',/x-oneartist-connect-token/.test(api)&&/Verified PayPal capture did not match/.test(api)&&/Verified PayPal refund did not match/.test(api)&&/verifyWebhook/.test(connectWorker)&&/authorizedForMerchant/.test(connectWorker)&&/status:verified\?200:\(response\.ok\?401:response\.status\)/.test(connectWorker)],
  ['PayPal onboarding starts with a private installation token',/installationAuthorized/.test(connectWorker)&&/CONNECT_INSTALLATION_TOKENS/.test(connectWorker)&&/pendingTrackingProof/.test(connectWorker)&&/verifyPendingTracking/.test(connectWorker)&&/j\.tracking_id!==pendingTracking/.test(connectWorker)&&!/installationAuthorized\([^)]*CONNECT_SHARED_SECRET/.test(connectWorker)],
  ['PayPal onboarding is bound to the pending installation flow',/pendingTrackingProof/.test(connectWorker)&&/verifyPendingTracking/.test(connectWorker)&&/j\.tracking_id!==pendingTracking/.test(connectWorker)&&/trackingId:state\.trackingId,merchantId/.test(api)],
  ['self-host migration execution is implemented',/async exec\(sql\)/.test(mysql)&&!/async exec\(\)\{return \{count:0/.test(mysql)],
  ['self-host responses include security headers',/x-content-type-options/.test(selfHost)&&/strict-transport-security/.test(selfHost)],
  ['Pages headers preserve provider compatibility and frame policy',/paypal\.com/.test(headers)&&/youtube-nocookie\.com/.test(headers)&&/frame-ancestors 'self'/.test(headers)&&/Strict-Transport-Security/.test(headers)]
];
for(const [label,ok] of checks){assert.ok(ok,`FAIL ${label}`);console.log(`PASS ${label}`)}
console.log('Security regression checks passed.');
