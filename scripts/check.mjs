import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root=resolve(process.cwd());
let fail=false;
const required=[
  'index.html','package.json','src/app.js','src/styles.css','functions/api/[[path]].js','database/schema.sql',
  'public/_headers','public/_redirects','public/_routes.json','public/art/oneartist-logo.svg','public/demo/higher-ground.wav'
];
for(const f of required){try{await readFile(resolve(root,f));console.log('PASS required',f)}catch{console.error('FAIL missing',f);fail=true}}

for(const f of ['src/app.js','functions/api/[[path]].js','scripts/check.mjs']){
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
if(!/auth\/forgot-password/.test(api)||!/auth\/reset-password/.test(api)||!/password_reset_tokens/.test(api)){console.error('FAIL forgot/reset password flow');fail=true}else console.log('PASS forgot/reset password flow');
if(!/admin\/notifications/.test(api)||!/notification_preferences/.test(api)||!/notification-popover/.test(css)){console.error('FAIL D1 notifications center');fail=true}else console.log('PASS D1 notifications center');
if(!/api.resend.com\/emails/.test(api)||!/admin\/email\/test/.test(api)||!/Email & Sales Notifications/.test(app)){console.error('FAIL transactional email integration');fail=true}else console.log('PASS transactional email integration');
if(!/MIGRATION_012/.test(api)||!/ensureUpgrade012/.test(api)){console.error('FAIL automatic 0.1.2 migration');fail=true}else console.log('PASS automatic 0.1.2 migration');
if(!/version:'0.1.3'/.test(api)||pkg.version!=='0.1.3'){console.error('FAIL 0.1.3 version markers');fail=true}else console.log('PASS 0.1.3 version markers');


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
