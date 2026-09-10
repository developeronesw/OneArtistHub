import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root=resolve(process.cwd());
let fail=false;
const required=[
  'index.html','package.json','src/app.js','src/media-ingest.js','src/styles.css','functions/api/[[path]].js','database/schema.sql','database/schema.mysql.sql','self-host/server.mjs','self-host/mysql-adapter.mjs','self-host/sql-compat.mjs','self-host/local-storage.mjs','self-host/install-ubuntu.sh','self-host/install-ubuntu-sqlite.sh','self-host/sqlite-adapter.mjs','connect-service/paypal-worker.js',
  'public/_headers','public/_redirects','public/_routes.json','public/art/oneartist-logo.svg','public/demo/higher-ground.wav'
];
for(const f of required){try{await readFile(resolve(root,f));console.log('PASS required',f)}catch{console.error('FAIL missing',f);fail=true}}

for(const f of ['src/app.js','src/media-ingest.js','functions/api/[[path]].js','self-host/server.mjs','self-host/mysql-adapter.mjs','self-host/sql-compat.mjs','self-host/local-storage.mjs','self-host/sqlite-adapter.mjs','connect-service/paypal-worker.js','scripts/check.mjs']){
  try{execFileSync(process.execPath,['--check',resolve(root,f)],{stdio:'pipe'});console.log('PASS syntax',f)}catch(e){console.error('FAIL syntax',f,String(e.stderr||e.message));fail=true}
}

const pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
if(!pkg.dependencies?.react||!pkg.dependencies?.['react-dom']||!pkg.devDependencies?.vite){console.error('FAIL React/Vite dependency manifest');fail=true}else console.log('PASS React/Vite dependency manifest');
if(pkg.scripts?.build!=='vite build'){console.error('FAIL expected Vite production build script');fail=true}else console.log('PASS Vite production build script');

const app=await readFile(resolve(root,'src/app.js'),'utf8');
const css=await readFile(resolve(root,'src/styles.css'),'utf8');
const api=await readFile(resolve(root,'functions/api/[[path]].js'),'utf8');
if(!/display:inline-flex;align-items:center;justify-content:center/.test(css)){console.error('FAIL centered button/icon CSS contract');fail=true}else console.log('PASS centered SVG button/icon contract');
if(!/function Icon\(/.test(app)||!/<svg/i.test(await readFile(resolve(root,'public/art/oneartist-logo.svg'),'utf8'))){console.error('FAIL SVG icon/logo contract');fail=true}else console.log('PASS SVG icon/logo contract');
if(!/checkout_sessions/.test(api)||!/Captured payment did not match/.test(api)){console.error('FAIL verified checkout binding');fail=true}else console.log('PASS verified checkout binding');
if(!/seriesDays/.test(api)||!/30-Day Engagement/.test(app)){console.error('FAIL live analytics series');fail=true}else console.log('PASS live analytics series');

if(!/const TYPE_META=/.test(app)||!/function blankFor\(/.test(app)||!/function ContentManager\(/.test(app)||!/function ContentEditor\(/.test(app)){console.error('FAIL functional CRUD UI definitions');fail=true}else console.log('PASS functional CRUD UI definitions');
if(!/function Themes\(/.test(app)||!/publicTheme/.test(app)||!/themePreview/.test(app)){console.error('FAIL immediate theme switching UI');fail=true}else console.log('PASS immediate theme switching UI');
if(!/admin\/youtube/.test(api)||!/youtubeIdFromUrl/.test(api)||!/Fetch YouTube/.test(app)){console.error('FAIL YouTube CRUD/thumbnail flow');fail=true}else console.log('PASS YouTube CRUD/thumbnail flow');
if(!/bulkDelete/.test(app)||!/toggleStatus/.test(app)){console.error('FAIL content bulk/status controls');fail=true}else console.log('PASS content bulk/status controls');
if(!/create\('release'\)/.test(app)||!/create\('video'\)/.test(app)||!/create\('tour'\)/.test(app)){console.error('FAIL dashboard quick-create actions');fail=true}else console.log('PASS dashboard quick-create actions');

if(!/Glass Player|glass-player|player-expanded/.test(app)||!/function Player\(/.test(app)){console.error('FAIL glass SaaS player UI');fail=true}else console.log('PASS glass SaaS player UI');
if(!/PLAYER GEOMETRY LOCK — 0\.3\.0 HF1/.test(css)||!/\.public \.player-shell\{position:fixed;left:50%;right:auto;bottom:16px;transform:translateX\(-50%\);width:min\(1180px,calc\(100vw - 30px\)\)/.test(css)||/\.public\.os \.glass-player\{[^}]*?(?:left|right|bottom|width|max-width|margin|position|transform)\s*:/.test(css)){console.error('FAIL theme-safe player geometry lock');fail=true}else console.log('PASS theme-safe player geometry lock');
if(!/auth\/forgot-password/.test(api)||!/auth\/reset-password/.test(api)||!/password_reset_tokens/.test(api)){console.error('FAIL forgot/reset password flow');fail=true}else console.log('PASS forgot/reset password flow');
if(!/admin\/notifications/.test(api)||!/notification_preferences/.test(api)||!/notification-popover/.test(css)){console.error('FAIL D1 notifications center');fail=true}else console.log('PASS D1 notifications center');
if(!/api.resend.com\/emails/.test(api)||!/admin\/email\/test/.test(api)||!/Email & Sales Notifications/.test(app)){console.error('FAIL transactional email integration');fail=true}else console.log('PASS transactional email integration');
if(!/MIGRATION_012/.test(api)||!/ensureUpgrade012/.test(api)){console.error('FAIL automatic 0.1.2 migration');fail=true}else console.log('PASS automatic 0.1.2 migration');
if(!/version:'0.3.0'/.test(api)||pkg.version!=='0.3.0'){console.error('FAIL 0.3.0 version markers');fail=true}else console.log('PASS 0.3.0 version markers');


if(!/customer\/magic-link/.test(api)||!/customer\/orders/.test(api)||!/customer\/download/.test(api)||!/function CustomerAccount\(/.test(app)){console.error('FAIL passwordless customer account flow');fail=true}else console.log('PASS passwordless customer account flow');
if(!/paypal\/webhook/.test(api)||!/verify-webhook-signature/.test(api)||!/webhook_events/.test(api)||!/PAYMENT\.CAPTURE\.PENDING/.test(api)||!/Preserve the webhook_event bytes exactly as received/.test(api)||!/PayPal Webhook Health/.test(app)){console.error('FAIL PayPal verified webhook flow');fail=true}else console.log('PASS PayPal verified webhook flow');
if(!/order_documents/.test(api)||!/invoice_number/.test(api)||!/PAID INVOICE \/ RECEIPT/.test(app)){console.error('FAIL invoice/receipt flow');fail=true}else console.log('PASS invoice/receipt flow');
if(!/normalizeVariants/.test(api)||!/function VariantEditor\(/.test(app)||!/selectedVariant/.test(api)){console.error('FAIL structured product variant flow');fail=true}else console.log('PASS structured product variant flow');
if(!/admin\/customers/.test(api)||!/admin\/downloads/.test(api)||!/function Customers\(/.test(app)||!/function DownloadsAdmin\(/.test(app)){console.error('FAIL commerce admin customer/download tools');fail=true}else console.log('PASS commerce admin customer/download tools');
if(!/refundMatch/.test(api)||!/Issue Refund/.test(app)||!/refunded_amount/.test(api)){console.error('FAIL refund workflow');fail=true}else console.log('PASS refund workflow');
if(!/Refund pending/.test(api)||!/transactionByProvider/.test(api)||!/d.pending/.test(app)){console.error('FAIL pending-refund webhook reconciliation');fail=true}else console.log('PASS pending-refund webhook reconciliation');
if(!/MIGRATION_013/.test(api)||!/ensureUpgrade013/.test(api)){console.error('FAIL automatic 0.1.3 migration');fail=true}else console.log('PASS automatic 0.1.3 migration');
if(!/idx_order_transactions_provider_id/.test(api)){console.error('FAIL PayPal transaction idempotency index');fail=true}else console.log('PASS PayPal transaction idempotency index');
if(!/webhookId/.test(app)||!/admin\/paypal\/config/.test(api)){console.error('FAIL safe PayPal webhook configuration UI');fail=true}else console.log('PASS safe PayPal webhook configuration UI');
if(!/paypalCaptureOrRecover/.test(api)||!/waitForFinalizedOrder/.test(api)||!/PayPal payment is not fully captured yet/.test(api)||!/recovered:cap.recovered/.test(api)){console.error('FAIL PayPal capture race recovery');fail=true}else console.log('PASS PayPal capture race recovery');


if(!pkg.dependencies?.fflate){console.error('FAIL album ZIP dependency');fail=true}else console.log('PASS album ZIP dependency');
if(!/function AlbumImporter\(/.test(app)||!/Import Album ZIP/.test(app)||!/Finalize & Publish Release/.test(app)){console.error('FAIL album ZIP ingest UI');fail=true}else console.log('PASS album ZIP ingest UI');
const mediaIngest=await readFile(resolve(root,'src/media-ingest.js'),'utf8');
if(!/unpackReleaseZip/.test(mediaIngest)||!/writeMp3Metadata/.test(mediaIngest)||!/buildReleaseZip/.test(mediaIngest)||!/APIC/.test(mediaIngest)||!/embeddedCover/.test(mediaIngest)||!/previewDuration/.test(mediaIngest)){console.error('FAIL MP3 metadata/package pipeline');fail=true}else console.log('PASS MP3 metadata/package pipeline');
if(!/media_objects/.test(api)||!/admin\/media\/upload/.test(api)||!/api\/media\/file/.test(api)||!/mediaObjectId/.test(api)){console.error('FAIL provider-backed media pipeline');fail=true}else console.log('PASS provider-backed media pipeline');
if(!/Cloudflare Email Service/.test(app)||!/email\/sending\/send/.test(api)||!/replyTo/.test(api)||!/reply_to/.test(api)){console.error('FAIL Cloudflare Email Service adapter');fail=true}else console.log('PASS Cloudflare Email Service adapter');
if(!/admin\/paypal\/test/.test(api)||!/Test Connection/.test(app)){console.error('FAIL PayPal credential test');fail=true}else console.log('PASS PayPal credential test');
if(!/MIGRATION_020/.test(api)||!/ensureUpgrade020/.test(api)){console.error('FAIL automatic 0.2.0 migration');fail=true}else console.log('PASS automatic 0.2.0 migration');
if(!/function MediaManager\(/.test(app)||!/function AssetPicker\(/.test(app)||!/function AssetField\(/.test(app)||!/admin\/media\/library/.test(api)){console.error('FAIL Media Library and reusable asset picker');fail=true}else console.log('PASS Media Library and reusable asset picker');
if(!/x-register-library/.test(app)||!/registerLibrary/.test(api)||!/upsertMediaMeta/.test(api)){console.error('FAIL direct form upload registration');fail=true}else console.log('PASS direct form upload registration');
if(!/deleteStoredObject/.test(api)||!/LOCAL_STORAGE\?\.delete/.test(api)||!/async delete\(key\)/.test(await readFile(resolve(root,'self-host/local-storage.mjs'),'utf8'))){console.error('FAIL provider-backed media deletion');fail=true}else console.log('PASS provider-backed media deletion');
if(!/usageCount/.test(app)||!/usageCount/.test(api)||!/Replace those references before deleting/.test(api)){console.error('FAIL in-use media delete protection');fail=true}else console.log('PASS in-use media delete protection');
if(!/x-content-type-options':'nosniff'/.test(api)||!/cross-origin-resource-policy':'same-site'/.test(api)||!/disposition=\['image','audio','video'\]/.test(api)){console.error('FAIL public media response hardening');fail=true}else console.log('PASS public media response hardening');
if(!/Hero image/.test(app)||!/Profile image/.test(app)||!/Product image/.test(app)||!/Cover artwork/.test(app)||!/chooseLibraryCover/.test(app)){console.error('FAIL asset picker integration across forms');fail=true}else console.log('PASS asset picker integration across forms');
const mysqlSchema=await readFile(resolve(root,'database/schema.mysql.sql'),'utf8');
const mysqlAdapter=await readFile(resolve(root,'self-host/mysql-adapter.mjs'),'utf8');
const selfHostServer=await readFile(resolve(root,'self-host/server.mjs'),'utf8');
if(!/CREATE TABLE IF NOT EXISTS media_objects/i.test(mysqlSchema)||!/MySQLD1Adapter/.test(mysqlAdapter)||!/LOCAL_STORAGE/.test(selfHostServer)){console.error('FAIL VPS MySQL/local-storage profile');fail=true}else console.log('PASS VPS MySQL/local-storage profile');

const sqlCompat=await import(new URL('../self-host/sql-compat.mjs',import.meta.url));
const compatSamples=[
  `INSERT OR IGNORE INTO analytics(event_type,object_type,object_id,visitor_hash,bucket,value,created_at) VALUES(?,?,?,?,?,1,?)`,
  `SELECT COUNT(*) c FROM password_reset_tokens WHERE admin_id=? AND created_at>=datetime('now','-15 minutes')`,
  `SELECT * FROM content_items WHERE type='tour' AND status='published' AND sort_date>=date('now') ORDER BY sort_date ASC LIMIT 4`,
  `INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`,
  `INSERT INTO integrations(provider,data_enc,updated_at) VALUES(?,?,?) ON CONFLICT(provider) DO UPDATE SET data_enc=excluded.data_enc,updated_at=excluded.updated_at`
];
try{for(const q of compatSamples)sqlCompat.assertMySQLCompatibleSQL(q);console.log('PASS MySQL SQLite-compat SQL translation')}catch(e){console.error('FAIL MySQL SQL translation',e.message);fail=true}
try{execFileSync('bash',['-n',resolve(root,'self-host/install-ubuntu.sh')],{stdio:'pipe'});console.log('PASS Ubuntu installer shell syntax')}catch(e){console.error('FAIL Ubuntu installer shell syntax',String(e.stderr||e.message));fail=true}

const sqliteAdapter=await readFile(resolve(root,'self-host/sqlite-adapter.mjs'),'utf8');
const connectWorker=await readFile(resolve(root,'connect-service/paypal-worker.js'),'utf8');
if(!/s3Request/.test(api)||!/admin\/storage\/s3\/test/.test(api)||!/S3-Compatible Storage/.test(app)){console.error('FAIL S3-compatible storage adapter');fail=true}else console.log('PASS S3-compatible storage adapter');
if(!/api\.brevo\.com\/v3\/smtp\/email/.test(api)||!/value:'brevo'/.test(app)||!/SMTP_SEND/.test(api)||!/nodemailer/.test(selfHostServer)){console.error('FAIL Brevo and SMTP email adapters');fail=true}else console.log('PASS Brevo and SMTP email adapters');
if(!/email_queue/.test(api)||!/processEmailQueue/.test(api)||!/Durable Email Queue/.test(app)||!/admin\/email\/queue\/retry/.test(api)){console.error('FAIL durable email retry queue');fail=true}else console.log('PASS durable email retry queue');
if(!/SQLiteD1Adapter/.test(sqliteAdapter)||!/DB_DRIVER/.test(selfHostServer)||!/better-sqlite3/.test(await readFile(resolve(root,'self-host/package.json'),'utf8'))){console.error('FAIL self-host SQLite deployment profile');fail=true}else console.log('PASS self-host SQLite deployment profile');
if(!/partner-referrals/.test(connectWorker)||!/merchant-integrations/.test(connectWorker)||!/admin\/paypal\/connect\/start/.test(api)||!/PayPal Connect — Partner Onboarding/.test(app)){console.error('FAIL PayPal Connect partner onboarding architecture');fail=true}else console.log('PASS PayPal Connect partner onboarding architecture');
try{execFileSync('bash',['-n',resolve(root,'self-host/install-ubuntu-sqlite.sh')],{stdio:'pipe'});console.log('PASS SQLite Ubuntu installer shell syntax')}catch(e){console.error('FAIL SQLite Ubuntu installer shell syntax',String(e.stderr||e.message));fail=true}

const pbkdf2Iterations=Number((api.match(/iterations:(\d+)/)||[])[1]||0);
if(!pbkdf2Iterations||pbkdf2Iterations>100000){console.error('FAIL Cloudflare PBKDF2 iteration limit',pbkdf2Iterations);fail=true}else console.log('PASS Cloudflare PBKDF2 iteration limit',pbkdf2Iterations);

const secretPatterns=[/sk_live_[A-Za-z0-9]+/i,/ghp_[A-Za-z0-9]{20,}/i,/clientSecret\s*[:=]\s*['"][^'"]{12,}['"]/i,/accessToken\s*[:=]\s*['"][^'"]{12,}['"]/i];
async function walk(dir){const out=[];for(const ent of await readdir(dir,{withFileTypes:true})){if(['node_modules','dist','.git'].includes(ent.name))continue;const p=resolve(dir,ent.name);if(ent.isDirectory())out.push(...await walk(p));else out.push(p)}return out}
const files=await walk(root);
for(const p of files){
  const rel=relative(root,p).replaceAll('\\','/');
  const ext=extname(p).toLowerCase();
  if(['.png','.jpg','.jpeg','.gif','.webp','.ico'].includes(ext)&&(/(^|\/)(src|public)\//.test(rel))){console.error('FAIL raster UI asset',rel);fail=true}
  if(['.js','.mjs','.json','.md','.txt','.html','.css','.sql'].includes(ext)||!ext){
    let t='';try{t=await readFile(p,'utf8')}catch{}
    if(secretPatterns.some(r=>r.test(t))){console.error('FAIL possible embedded secret',rel);fail=true}
  }
}
if(!files.some(p=>relative(root,p)==='public/art/oneartist-logo.svg')){console.error('FAIL logo missing');fail=true}
else console.log('PASS no raster UI assets / built-in logo SVG');

const routeConfig=JSON.parse(await readFile(resolve(root,'public/_routes.json'),'utf8'));
if(routeConfig.version!==1||!routeConfig.include?.includes('/api/*')){console.error('FAIL Pages Functions route config');fail=true}else console.log('PASS Pages Functions route config');

if(fail)process.exit(1);
console.log('\nOneArtist Hub static/source QA PASSED.');
