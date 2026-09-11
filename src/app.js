import React, {useEffect,useMemo,useRef,useState,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';
import {unpackReleaseZip,makePreviewWav,buildReleaseZip,releaseZipFilename,bytesToFile} from './media-ingest.js';

const h=React.createElement;

const ICONS={
  home:'M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  music:'M9 18V5l10-2v13M9 8l10-2M6 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm10-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  video:'M3 6h13a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3zM18 10l4-3v10l-4-3z',
  calendar:'M5 3v3m14-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  bag:'M6 8h12l1 13H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2',
  cart:'M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20.5 8H6m3 12a1 1 0 1 0 0 .01M18 20a1 1 0 1 0 0 .01',
  download:'M12 3v12m0 0 5-5m-5 5-5-5M4 19h16',
  pages:'M6 3h9l4 4v14H6zM15 3v5h5M9 12h6M9 16h6',
  image:'M4 5h16v14H4zM7 15l4-4 3 3 2-2 4 4M8 9h.01',
  palette:'M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a3 3 0 0 1 0-6-6 9 9 0 0 1 6-3Z',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.5 4a8.5 8.5 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L16 3.5h-4L11.7 6a8 8 0 0 0-1.7 1L7.6 6 5.6 9.5l2 1.5a8.5 8.5 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.3 2.5h4l.3-2.5a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z',
  search:'M11 19a8 8 0 1 1 5.7-2.3L22 22m-5.3-5.3L22 22',
  bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  menu:'M4 7h16M4 12h16M4 17h16',
  close:'M5 5l14 14M19 5 5 19',
  plus:'M12 5v14M5 12h14',
  minus:'M5 12h14',
  edit:'m4 20 4-.8L19 8.2 15.8 5 4.8 16 4 20Zm10.5-13.8 3.2 3.2',
  trash:'M4 7h16M9 7V4h6v3m-8 0 1 14h8l1-14M10 11v6M14 11v6',
  play:'M8 5v14l11-7z',
  pause:'M8 5h3v14H8zM14 5h3v14h-3z',
  prev:'M7 5v14M19 5 9 12l10 7z',
  next:'M17 5v14M5 5l10 7-10 7z',
  volume:'M4 10v4h4l5 4V6L8 10H4Zm12-2a6 6 0 0 1 0 8m2-10a9 9 0 0 1 0 12',
  repeat:'M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3m13-3v2a4 4 0 0 1-4 4H4',
  shuffle:'M4 6h3c5 0 5 12 10 12h3m-3-3 3 3-3 3M4 18h3c2 0 3-2 4-4m2-4c1-2 2-4 4-4h3m-3-3 3 3-3 3',
  external:'M14 4h6v6M20 4l-9 9M19 13v7H4V5h7',
  user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  shield:'M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Zm-3 9 2 2 4-4',
  logout:'M9 4H5v16h4m5-4 4-4-4-4m4 4H9',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  dollar:'M12 3v18m4-14.5c-1-1-2.2-1.5-4-1.5-2.5 0-4 1.3-4 3 0 4.5 8 2 8 6 0 1.7-1.5 3-4 3-1.8 0-3.2-.5-4-1.5',
  users:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10a6 6 0 0 1 12 0m2-10a3 3 0 1 0 0-6m-1 11a5 5 0 0 1 5 5',
  link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  save:'M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6',
  lock:'M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v11H6z',
  chevron:'m9 6 6 6-6 6',
  globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 0c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9ZM3 12h18',
  heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  queue:'M4 6h12M4 12h12M4 18h8m6-3v6l4-3-4-3Z',
  expand:'M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5',
  minimize:'M8 8H3V3m13 5h5V3M8 16H3v5m13-5h5v5',
  mail:'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  key:'M14 8a5 5 0 1 0-4.7 6.7L4 20h4v-2h2v-2h2l1.3-1.3A5 5 0 0 0 14 8Z',
  check:'m5 12 4 4L19 6',
  upload:'M12 16V4m0 0-5 5m5-5 5 5M5 20h14',
  archive:'M4 7h16v13H4zM3 4h18v3H3zM9 11h6',
  up:'m6 15 6-6 6 6',
  down:'m6 9 6 6 6-6'
};
function Icon({name,size=20,className=''}){const path=ICONS[name]||ICONS.home;return h('svg',{className:'oah-icon '+className,width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true'},h('path',{d:path}))}
function Button({children,icon,variant='',className='',...props}){return h('button',{className:`btn ${variant} ${className}`.trim(),...props},icon&&h(Icon,{name:icon}),children)}
function IconButton({icon,label,className='',...props}){return h('button',{className:`icon-btn ${className}`.trim(),'aria-label':label||icon,title:label||icon,...props},h(Icon,{name:icon}))}
function Field({label,children}){return h('div',{className:'field'},h('label',null,label),children)}
function Input(props){return h('input',{className:'input',...props})}
function Select(props){return h('select',{className:'select',...props})}
function Textarea(props){return h('textarea',{className:'textarea',...props})}
const fmtMoney=(v,c='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(Number(v||0));
const fmtDate=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'}).format(new Date(v+'T12:00:00'))}catch{return v}};
const esc=s=>String(s??'');

function usePath(){const [path,setPath]=useState(location.pathname+location.search);useEffect(()=>{const f=()=>setPath(location.pathname+location.search);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[]);const nav=useCallback((to)=>{history.pushState({},'',to);setPath(location.pathname+location.search);scrollTo(0,0)},[]);return[path,nav]}
function useToast(){const [toast,setToast]=useState(null);const show=(text,error=false)=>{setToast({text,error});setTimeout(()=>setToast(null),3300)};return [toast,show]}
function Toast({toast}){return toast?h('div',{className:'toast'+(toast.error?' error':'')},toast.text):null}

async function api(path,opts={}){
  const receiptToken=new URLSearchParams(location.search).get('token')||'';
  if(receiptToken&&path.startsWith('order/')&&!path.includes('?'))path+=`?token=${encodeURIComponent(receiptToken)}`;
  if(receiptToken&&path==='downloads/request'&&typeof opts.body==='string'){try{opts={...opts,body:JSON.stringify({...JSON.parse(opts.body),receiptToken})}}catch{}}
  const res=await fetch('/api/'+path,{credentials:'same-origin',headers:{'content-type':'application/json',...(window.__OAH_CSRF?{'x-csrf-token':window.__OAH_CSRF}:{}),...(opts.headers||{})},...opts});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.error||data.message||`Request failed (${res.status})`);return data;
}

async function uploadMediaFile(file,{visibility='private',folder='media',registerLibrary=false}={}){
  const headers={
    ...(window.__OAH_CSRF?{'x-csrf-token':window.__OAH_CSRF}:{}),
    'x-file-name':file.name||'upload.bin',
    'x-content-type':file.type||'application/octet-stream',
    'x-visibility':visibility,
    'x-folder':folder,
    'x-register-library':registerLibrary?'1':'0'
  };
  const res=await fetch('/api/admin/media/upload',{method:'POST',credentials:'same-origin',headers,body:file});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.error||data.message||`Upload failed (${res.status})`);
  return data.object;
}


function assetUrl(asset){return asset?.url||''}
function prettyBytes(n){const v=Number(n)||0;if(v<1024)return `${v} B`;if(v<1024*1024)return `${(v/1024).toFixed(1)} KB`;if(v<1024*1024*1024)return `${(v/1024/1024).toFixed(1)} MB`;return `${(v/1024/1024/1024).toFixed(1)} GB`}
function mediaIcon(kind){return kind==='image'?'image':kind==='audio'?'music':kind==='video'?'video':'pages'}

function AssetPicker({onSelect,onClose,show,kind='image'}){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[query,setQuery]=useState('');
  const load=useCallback(()=>{
    setLoading(true);
    return api(`admin/media/library?visibility=public${kind?`&kind=${encodeURIComponent(kind)}`:''}`)
      .then(d=>setItems(d.items||[]))
      .catch(e=>show?.(e.message,true))
      .finally(()=>setLoading(false));
  },[kind,show]);
  useEffect(()=>{load()},[load]);
  async function upload(files){
    const list=[...(files||[])];if(!list.length)return;
    setUploading(true);
    try{
      for(const file of list)await uploadMediaFile(file,{visibility:'public',folder:kind==='image'?'images':'media',registerLibrary:true});
      await load();show?.(`${list.length} media file${list.length===1?'':'s'} uploaded.`);
    }catch(e){show?.(e.message,true)}finally{setUploading(false)}
  }
  const filtered=items.filter(x=>!query||`${x.title} ${x.filename} ${x.alt}`.toLowerCase().includes(query.toLowerCase()));
  const grid=filtered.length?h('div',{className:'media-picker-grid'},filtered.map(x=>
    h('button',{type:'button',className:'media-picker-item',key:x.id,onClick:()=>onSelect(x)},
      x.mediaType==='image'?h('img',{src:x.url,alt:x.alt||x.title||''}):h('div',{className:'media-file-icon'},h(Icon,{name:mediaIcon(x.mediaType),size:30})),
      h('span',null,h('strong',null,x.title||x.filename),h('small',null,prettyBytes(x.sizeBytes)))
    )
  )):h('div',{className:'empty empty-action'},h(Icon,{name:'image',size:34}),h('strong',null,'No matching media yet.'),h('span',{className:'small muted'},'Upload a file here and it will become available across OneArtist Hub.'));
  return h('div',{className:'modal-backdrop media-picker-backdrop'},
    h('div',{className:'modal media-picker-modal'},
      h('div',{className:'modal-head'},
        h('div',null,h('strong',null,'Choose from Media Library'),h('div',{className:'small muted'},'Select an existing asset or upload a new one without leaving this form.')),
        h(IconButton,{icon:'close',label:'Close media library',onClick:onClose})
      ),
      h('div',{className:'modal-body'},
        h('div',{className:'media-picker-toolbar'},
          h('div',{className:'search media-search'},h(Icon,{name:'search'}),h(Input,{value:query,onChange:e=>setQuery(e.target.value),placeholder:'Search media…'})),
          h('label',{className:'btn primary file-button'},h(Icon,{name:'upload'}),uploading?'Uploading…':'Upload New',h('input',{type:'file',accept:kind==='image'?'image/jpeg,image/png,image/webp,image/gif':'*/*',multiple:true,hidden:true,disabled:uploading,onChange:e=>{upload(e.target.files);e.target.value=''}}))
        ),
        loading?h('div',{className:'empty'},'Loading media…'):grid
      )
    )
  );
}

function AssetField({label,value,onChange,show,folder='images',kind='image',placeholder='Select or upload media'}){
  const [picker,setPicker]=useState(false),[uploading,setUploading]=useState(false);
  async function upload(file){if(!file)return;setUploading(true);try{const obj=await uploadMediaFile(file,{visibility:'public',folder,registerLibrary:true});onChange(obj.url);show?.(`${file.name} uploaded to the Media Library.`)}catch(e){show?.(e.message,true)}finally{setUploading(false)}}
  return h(React.Fragment,null,
    h(Field,{label},h('div',{className:'asset-field'},value&&kind==='image'&&h('div',{className:'asset-preview'},h('img',{src:value,alt:''})),h('div',{className:'asset-field-main'},h(Input,{value:value||'',onChange:e=>onChange(e.target.value),placeholder}),h('div',{className:'row wrap'},h(Button,{type:'button',className:'compact',icon:'image',onClick:()=>setPicker(true)},'Media Library'),h('label',{className:'btn compact file-button'},h(Icon,{name:'upload'}),uploading?'Uploading…':'Upload',h('input',{type:'file',accept:kind==='image'?'image/jpeg,image/png,image/webp,image/gif':'*/*',hidden:true,disabled:uploading,onChange:e=>{upload(e.target.files?.[0]);e.target.value=''}})),value&&h(Button,{type:'button',className:'compact',icon:'close',onClick:()=>onChange('')},'Clear'))))),
    picker&&h(AssetPicker,{kind,onClose:()=>setPicker(false),show,onSelect:a=>{onChange(assetUrl(a));setPicker(false)}})
  );
}

function MediaMetaEditor({item,onClose,onSaved,show}){
  const [title,setTitle]=useState(item.title||item.filename||''),[alt,setAlt]=useState(item.alt||''),[busy,setBusy]=useState(false);
  async function save(e){e.preventDefault();setBusy(true);try{await api('admin/media/library/'+item.id,{method:'PUT',body:JSON.stringify({title,alt})});show('Media details updated.');await onSaved()}catch(err){show(err.message,true)}finally{setBusy(false)}}
  return h('div',{className:'modal-backdrop'},h('form',{className:'modal media-meta-modal',onSubmit:save},h('div',{className:'modal-head'},h('strong',null,'Edit Media Details'),h(IconButton,{type:'button',icon:'close',onClick:onClose})),h('div',{className:'modal-body content-form'},item.mediaType==='image'&&h('img',{className:'media-meta-preview',src:item.url,alt:''}),h(Field,{label:'Display title'},h(Input,{value:title,onChange:e=>setTitle(e.target.value),required:true})),h(Field,{label:'Alt text / accessibility description'},h(Textarea,{value:alt,onChange:e=>setAlt(e.target.value),placeholder:'Describe the image for visitors using assistive technology.'})),h('div',{className:'small muted'},`${item.filename} · ${prettyBytes(item.sizeBytes)} · ${item.provider.toUpperCase()}`),h('div',{className:'row end'},h(Button,{type:'button',onClick:onClose},'Cancel'),h(Button,{type:'submit',variant:'primary',icon:'save',disabled:busy},busy?'Saving…':'Save Details')))));
}

function MediaManager({search,show}){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[filter,setFilter]=useState('all'),[editing,setEditing]=useState(null);
  const load=useCallback(()=>{setLoading(true);return api('admin/media/library').then(d=>setItems(d.items||[])).catch(e=>show(e.message,true)).finally(()=>setLoading(false))},[show]);
  useEffect(()=>{load()},[load]);
  async function upload(files){const list=[...(files||[])];if(!list.length)return;setUploading(true);try{for(const file of list){await uploadMediaFile(file,{visibility:'public',folder:file.type?.startsWith('image/')?'images':'media',registerLibrary:true})}show(`${list.length} media file${list.length===1?'':'s'} uploaded.`);await load()}catch(e){show(e.message,true)}finally{setUploading(false)}}
  async function remove(item){if(item.usageCount>0){show(`This asset is used in ${item.usageCount} place${item.usageCount===1?'':'s'}. Replace those references before deleting it.`,true);return}if(!confirm(`Delete “${item.title||item.filename}” from ${item.provider.toUpperCase()} storage? This cannot be undone.`))return;try{await api('admin/media/library/'+item.id,{method:'DELETE'});show('Media file deleted.');await load()}catch(e){show(e.message,true)}}
  const filtered=items.filter(x=>(filter==='all'||x.mediaType===filter)&&(!search||`${x.title} ${x.filename} ${x.alt} ${x.folder}`.toLowerCase().includes(search.toLowerCase())));
  return h(React.Fragment,null,
    h(PageHead,{title:'Media Library',subtitle:'Upload once, then reuse artwork, hero images and other media anywhere in OneArtist Hub.',actions:h('div',{className:'row wrap'},h(Select,{value:filter,onChange:e=>setFilter(e.target.value)},h('option',{value:'all'},'All media'),h('option',{value:'image'},'Images'),h('option',{value:'audio'},'Audio'),h('option',{value:'video'},'Video'),h('option',{value:'document'},'Documents')),h('label',{className:'btn primary file-button'},h(Icon,{name:'upload'}),uploading?'Uploading…':'Upload Media',h('input',{type:'file',multiple:true,hidden:true,disabled:uploading,onChange:e=>{upload(e.target.files);e.target.value=''}})))}),
    editing&&h(MediaMetaEditor,{item:editing,show,onClose:()=>setEditing(null),onSaved:async()=>{setEditing(null);await load()}}),
    loading?h('div',{className:'empty'},'Loading Media Library…'):filtered.length?h('div',{className:'media-library-grid'},filtered.map(item=>h('article',{className:'media-card card',key:item.id},
      h('div',{className:'media-card-preview'},item.mediaType==='image'&&item.url?h('img',{src:item.url,alt:item.alt||item.title||''}):h('div',{className:'media-file-icon large'},h(Icon,{name:mediaIcon(item.mediaType),size:40})),item.usageCount>0&&h('span',{className:'media-usage pill success'},`In use · ${item.usageCount}`)),
      h('div',{className:'media-card-copy'},h('strong',{title:item.title||item.filename},item.title||item.filename),h('div',{className:'small muted'},`${prettyBytes(item.sizeBytes)} · ${item.provider.toUpperCase()}`),h('div',{className:'small muted media-path'},item.folder||'media'),h('div',{className:'row wrap'},item.url&&h(Button,{type:'button',className:'compact',icon:'link',onClick:()=>navigator.clipboard?.writeText(location.origin+item.url)},'Copy URL'),h(IconButton,{icon:'edit',label:'Edit media details',onClick:()=>setEditing(item)}),h(IconButton,{icon:'trash',label:item.usageCount?'Asset is currently in use':'Delete media',disabled:item.usageCount>0,onClick:()=>remove(item)})))
    ))):h('div',{className:'empty empty-action'},h(Icon,{name:'image',size:38}),h('strong',null,'Your Media Library is empty.'),h('span',{className:'small muted'},'Upload album artwork, artist photography, hero images and other reusable assets.'))
  );
}

function Setup({onDone}){
  const [form,setForm]=useState({setupKey:'',username:'admin',email:'',password:'',artistName:'',loadDemo:true});const [busy,setBusy]=useState(false);const [toast,show]=useToast();
  const set=k=>e=>setForm({...form,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});
  async function submit(e){e.preventDefault();setBusy(true);try{await api('setup',{method:'POST',body:JSON.stringify(form)});show('OneArtist Hub installed.');setTimeout(onDone,500)}catch(err){show(err.message,true)}finally{setBusy(false)}}
  return h('div',{className:'auth-page'},h('form',{className:'auth-box card',onSubmit:submit},
    h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo',alt:'OneArtist Hub'}),h('h1',null,'Welcome to OneArtist Hub'),h('p',{className:'lead'},'Create the first administrator and artist profile.'),
    h('div',{className:'wizard-steps'},h('span',{className:'on'}),h('span',{className:'on'}),h('span'),h('span')),
    h('div',{className:'stack'},
      h(Field,{label:'One-time setup key'},h(Input,{type:'password',required:true,value:form.setupKey,onChange:set('setupKey'),placeholder:'Cloudflare ONEARTIST_SETUP_KEY'})),
      h('div',{className:'grid2'},h(Field,{label:'Admin username'},h(Input,{required:true,minLength:3,value:form.username,onChange:set('username')})),h(Field,{label:'Admin email'},h(Input,{type:'email',required:true,value:form.email,onChange:set('email')}))),
      h(Field,{label:'Admin password (10+ characters)'},h(Input,{type:'password',required:true,minLength:10,value:form.password,onChange:set('password')})),
      h(Field,{label:'Artist / stage name'},h(Input,{required:true,value:form.artistName,onChange:set('artistName'),placeholder:'Artist Name'})),
      h('label',{className:'row small'},h('input',{type:'checkbox',checked:form.loadDemo,onChange:set('loadDemo')}),'Load demo releases, audio, video, merch and tour dates for testing'),
      h(Button,{type:'submit',variant:'primary',icon:'check',disabled:busy},busy?'Installing…':'Install OneArtist Hub')
    )),h(Toast,{toast}))
}
function Login({onLogin}){
  const [mode,setMode]=useState('login'),[login,setLogin]=useState(''),[password,setPassword]=useState(''),[email,setEmail]=useState(''),[setupKey,setSetupKey]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false);const [toast,show]=useToast();
  async function submit(e){e.preventDefault();setBusy(true);try{
    if(mode==='forgot'){const d=await api('auth/forgot-password',{method:'POST',body:JSON.stringify({email})});show(d.message||'If the account exists, a reset link has been sent.');setMode('login');return}
    if(mode==='recovery'){if(newPassword!==confirm)throw new Error('New passwords do not match.');await api('auth/emergency-reset',{method:'POST',body:JSON.stringify({setupKey,login,password:newPassword})});show('Password reset with deployment recovery key.');setMode('login');setPassword('');return}
    const d=await api('auth/login',{method:'POST',body:JSON.stringify({login,password})});window.__OAH_CSRF=d.csrf;onLogin(d.user)
  }catch(err){show(err.message,true)}finally{setBusy(false)}}
  const title=mode==='forgot'?'Reset Password':mode==='recovery'?'Emergency Recovery':'Artist Admin';
  const lead=mode==='forgot'?'Enter your administrator email. The secure reset link expires in 30 minutes.':mode==='recovery'?'Use the deployment recovery key only when email recovery is unavailable.':'Sign in to manage your music, store and website.';
  let fields=null;
  if(mode==='forgot')fields=h(React.Fragment,null,h(Field,{label:'Administrator email'},h(Input,{type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,autoComplete:'email'})),h(Button,{type:'submit',variant:'primary',icon:'mail',disabled:busy},busy?'Please wait…':'Send Reset Link'),h('button',{type:'button',className:'text-link',onClick:()=>setMode('recovery')},'Email not configured? Use recovery key'),h('button',{type:'button',className:'text-link',onClick:()=>setMode('login')},'Back to sign in'));
  else if(mode==='recovery')fields=h(React.Fragment,null,h(Field,{label:'Username or administrator email'},h(Input,{value:login,onChange:e=>setLogin(e.target.value),required:true})),h(Field,{label:'Deployment recovery key'},h(Input,{type:'password',value:setupKey,onChange:e=>setSetupKey(e.target.value),required:true,placeholder:'ONEARTIST_SETUP_KEY'})),h(Field,{label:'New password'},h(Input,{type:'password',minLength:10,value:newPassword,onChange:e=>setNewPassword(e.target.value),required:true})),h(Field,{label:'Confirm new password'},h(Input,{type:'password',minLength:10,value:confirm,onChange:e=>setConfirm(e.target.value),required:true})),h(Button,{type:'submit',variant:'primary',icon:'key',disabled:busy},busy?'Resetting…':'Reset with Recovery Key'),h('button',{type:'button',className:'text-link',onClick:()=>setMode('login')},'Back to sign in'));
  else fields=h(React.Fragment,null,h(Field,{label:'Username or email'},h(Input,{value:login,onChange:e=>setLogin(e.target.value),required:true,autoComplete:'username'})),h(Field,{label:'Password'},h(Input,{type:'password',value:password,onChange:e=>setPassword(e.target.value),required:true,autoComplete:'current-password'})),h(Button,{type:'submit',variant:'primary',icon:'lock',disabled:busy},busy?'Please wait…':'Sign in'),h('button',{type:'button',className:'text-link',onClick:()=>setMode('forgot')},'Forgot password?'));
  return h('div',{className:'auth-page'},h('form',{className:'auth-box card',onSubmit:submit},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo',alt:'OneArtist Hub'}),h('h1',null,title),h('p',{className:'lead'},lead),h('div',{className:'stack'},fields)),h(Toast,{toast}))
}
function ResetPassword({onDone}){
  const token=new URLSearchParams(location.search).get('token')||'';
  const [password,setPassword]=useState(''),[confirmPassword,setConfirm]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
  const [toast,show]=useToast();
  async function submit(e){
    e.preventDefault();
    if(password!==confirmPassword){show('Passwords do not match.',true);return}
    setBusy(true);
    try{await api('auth/reset-password',{method:'POST',body:JSON.stringify({token,password})});setDone(true);show('Password reset successfully.')}
    catch(err){show(err.message,true)}finally{setBusy(false)}
  }
  const content=done
    ? h(React.Fragment,null,
        h('p',{className:'lead'},'Your administrator password has been changed and previous sessions were signed out.'),
        h(Button,{type:'button',variant:'primary',icon:'lock',onClick:onDone},'Return to Sign In'))
    : h('div',{className:'stack'},
        h(Field,{label:'New password (10+ characters)'},h(Input,{type:'password',minLength:10,required:true,value:password,onChange:e=>setPassword(e.target.value),autoComplete:'new-password'})),
        h(Field,{label:'Confirm new password'},h(Input,{type:'password',minLength:10,required:true,value:confirmPassword,onChange:e=>setConfirm(e.target.value),autoComplete:'new-password'})),
        h(Button,{type:'submit',variant:'primary',icon:'key',disabled:busy||!token},busy?'Resetting…':'Reset Password'));
  return h('div',{className:'auth-page'},
    h('form',{className:'auth-box card',onSubmit:submit},
      h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo',alt:'OneArtist Hub'}),
      h('h1',null,'Choose a New Password'),
      content
    ),
    h(Toast,{toast})
  );
}

const TYPE_META={
  release:{label:'Releases',singular:'Release',icon:'music'},
  track:{label:'Tracks',singular:'Track',icon:'music'},
  video:{label:'Videos',singular:'Video',icon:'video'},
  tour:{label:'Tour Dates',singular:'Tour Date',icon:'calendar'},
  product:{label:'Store Products',singular:'Product',icon:'bag'},
  page:{label:'Pages',singular:'Page',icon:'pages'},
  media:{label:'Media Library',singular:'Media Item',icon:'image'},
  news:{label:'News / Stories',singular:'Story',icon:'pages'}
};
const today=()=>new Date().toISOString().slice(0,10);
function youtubeIdFromUrl(value){
  const v=String(value||'').trim();
  const m=v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i)||v.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  return m?m[1]:'';
}
function normalizeVariants(value){
  if(Array.isArray(value))return value.map((v,i)=>({id:v.id||`v${i+1}`,name:v.name||'',size:v.size||'',color:v.color||'',sku:v.sku||'',inventory:v.inventory??'',price:v.price??''}));
  if(typeof value==='string'&&value.trim())return value.split(/\r?\n/).map((line,i)=>{const [name='',sku='',inventory='',price='']=line.split('|').map(x=>x.trim());return{id:`v${i+1}`,name,size:name,color:'',sku,inventory,price}});
  return [];
}
function blankFor(type){
  const base={type,title:'',slug:'',status:'published',sortDate:today(),featured:false,data:{}};
  const data={
    release:{releaseType:'Album',price:'',cover:'',description:'',genre:'',catalogNo:'',spotifyUrl:'',appleMusicUrl:'',youtubeMusicUrl:''},
    track:{releaseId:'',trackNo:1,audio:'',cover:'',duration:'',price:'',explicit:false},
    video:{youtubeUrl:'',youtubeId:'',thumbnail:'',description:''},
    tour:{venue:'',ticketUrl:'',status:'Tickets Available',doors:'',city:'',region:'',country:'United States'},
    product:{price:'',kind:'physical',inventory:'',image:'',description:'',dropboxPath:'',sku:'',variants:[]},
    page:{showInNav:true,html:'<section>\n  <h2>New Page</h2>\n  <p>Add your content here.</p>\n</section>'},
    media:{url:'',alt:'',mediaType:'image'},
    news:{excerpt:'',html:'',image:''}
  };
  return {...base,data:data[type]||{}};
}

const NAV=[['dashboard','Dashboard','home'],['homepage','Homepage','pages'],['release','Releases','music'],['track','Tracks','music'],['video','Videos','video'],['tour','Tour Dates','calendar'],['product','Store','bag'],['orders','Orders','cart'],['customers','Customers','users'],['downloads','Downloads','download'],['page','Pages','pages'],['media','Media Library','image'],['themes','Themes','palette'],['settings','Settings','settings'],['security','Security','shield']];
function AdminShell({user,onLogout}){
  const [active,setActive]=useState('dashboard'),[menu,setMenu]=useState(false),[search,setSearch]=useState(''),[createRequest,setCreateRequest]=useState(null),[notifOpen,setNotifOpen]=useState(false),[notifications,setNotifications]=useState([]),[unread,setUnread]=useState(0);const [toast,show]=useToast();
  const select=k=>{setActive(k);setMenu(false);setNotifOpen(false)};
  const create=type=>{setActive(type);setMenu(false);setCreateRequest({type,token:Date.now()})};
  const loadNotifications=useCallback(()=>api('admin/notifications').then(d=>{setNotifications(d.notifications||[]);setUnread(d.unread||0)}).catch(()=>{}),[]);
  useEffect(()=>{loadNotifications();const t=setInterval(loadNotifications,30000);return()=>clearInterval(t)},[loadNotifications]);
  async function openNote(n){try{if(!n.is_read)await api('admin/notifications/'+n.id,{method:'PUT'});if(n.link&&NAV.some(([k])=>k===n.link))select(n.link);else setNotifOpen(false);loadNotifications()}catch{}}
  async function markAll(){try{await api('admin/notifications/read-all',{method:'POST'});loadNotifications()}catch{}}
  async function logout(){try{await api('auth/logout',{method:'POST'});}catch{}window.__OAH_CSRF='';onLogout()}
  return h('div',{className:'admin-shell'},
    h('aside',{className:'sidebar '+(menu?'open':'')},h('div',{className:'brand'},h('img',{src:'/art/oneartist-logo.svg',alt:'OneArtist Hub'})),h('nav',{className:'nav'},NAV.map(([k,l,i])=>h('button',{key:k,className:active===k?'active':'',onClick:()=>select(k)},h(Icon,{name:i}),h('span',null,l)))),h('div',{className:'side-footer'},h('div',{className:'row'},h('div',{className:'avatar'},user.username.slice(0,1).toUpperCase()),h('div',{style:{minWidth:0}},h('strong',null,user.username),h('div',{className:'small muted'},'Artist Admin'))),h(Button,{icon:'logout',className:'compact',style:{marginTop:12,width:'100%'},onClick:logout},'Sign out'))),
    menu&&h('button',{className:'sidebar-scrim','aria-label':'Close menu',onClick:()=>setMenu(false)}),
    h('main',{className:'admin-main'},h('header',{className:'topbar'},h(IconButton,{icon:'menu',label:'Open menu',className:'mobile-menu',onClick:()=>setMenu(!menu)}),h('div',{className:'search'},h(Icon,{name:'search'}),h(Input,{value:search,onChange:e=>setSearch(e.target.value),onKeyDown:e=>{if(e.key==='Enter'){const m=NAV.find(([,l])=>l.toLowerCase().includes(search.toLowerCase()));if(m){select(m[0]);setSearch('')}}},placeholder:'Search section or current list…'})),
      h('div',{className:'notification-wrap'},h(IconButton,{icon:'bell',label:'Notifications',onClick:()=>setNotifOpen(v=>!v)}),unread>0&&h('span',{className:'notification-badge'},unread>99?'99+':unread),notifOpen&&h('div',{className:'notification-popover card'},h('div',{className:'row between notification-head'},h('strong',null,'Notifications'),unread>0&&h('button',{className:'text-link',onClick:markAll},'Mark all read')),notifications.length?notifications.slice(0,12).map(n=>h('button',{key:n.id,className:'notification-item '+(!n.is_read?'unread':''),onClick:()=>openNote(n)},h('span',{className:'notification-dot'}),h('span',null,h('strong',null,n.title),h('small',null,n.message),h('i',null,new Date(n.created_at).toLocaleString())))):h('div',{className:'empty compact-empty'},'No notifications yet.'))),
      h('div',{className:'profile-chip'},h('div',{className:'avatar'},user.username.slice(0,1).toUpperCase()),h('div',{className:'meta'},h('strong',null,user.username),h('div',{className:'small muted'},'Artist Account')))),
      h('div',{className:'admin-content'},h(AdminView,{active,search,select,create,createRequest,onCreateHandled:()=>setCreateRequest(null),show})),
      h('nav',{className:'mobile-dock'},[['dashboard','Home','home'],['release','Music','music'],['product','Store','bag'],['orders','Orders','cart']].map(([k,l,i])=>h('button',{key:k,className:active===k?'active':'',onClick:()=>select(k)},h(Icon,{name:i,size:18}),l)),h('button',{onClick:()=>setMenu(true)},h(Icon,{name:'menu',size:18}),'More'))
    ),h(Toast,{toast}))
}
function AdminView({active,search,select,create,createRequest,onCreateHandled,show}){
  if(active==='dashboard')return h(Dashboard,{select,create,show});
  if(active==='media')return h(MediaManager,{search,show});
  if(['release','track','video','tour','product','page'].includes(active))return h(ContentManager,{type:active,search,show,createRequest,onCreateHandled});
  if(active==='orders')return h(Orders,{show});
  if(active==='customers')return h(Customers,{show});
  if(active==='downloads')return h(DownloadsAdmin,{show});
  if(active==='themes')return h(Themes,{show});
  if(active==='security')return h(SecurityPanel,{show});
  return h(Settings,{show,focus:active==='homepage'?'homepage':'settings'});
}
function PageHead({title,subtitle,actions}){return h('div',{className:'page-head'},h('div',null,h('h1',null,title),subtitle&&h('p',null,subtitle)),actions&&h('div',{className:'row wrap'},actions))}
function Kpi({label,value,icon,glow='#9d5cff',trend='+ live'}){return h('div',{className:'kpi card',style:{'--glow':glow}},h('div',{className:'row between'},h('span',{className:'label'},label),h(Icon,{name:icon})),h('div',{className:'num'},value),h('div',{className:'trend'},trend))}
function TrendChart({series={}}){
  const sets=[['plays','Verified Plays','#68f3b0'],['views','Site Views','#54e9ff'],['downloads','Downloads','#ff9c55']];
  const all=sets.flatMap(([k])=>(series[k]||[]).map(x=>Number(x.value)||0)), max=Math.max(1,...all);
  const pathFor=arr=>{const a=arr||[];if(!a.length)return 'M0 205 L700 205';return a.map((x,i)=>`${i?'L':'M'} ${(i/Math.max(1,a.length-1))*700} ${205-(Number(x.value||0)/max)*175}`).join(' ')};
  return h('div',{className:'trend-wrap'},
    h('div',{className:'chart-legend'},sets.map(([k,l,c])=>h('span',{key:k},h('i',{style:{background:c}}),l))),
    h('div',{className:'chart'},h('svg',{viewBox:'0 0 700 220',preserveAspectRatio:'none','aria-label':'30 day verified engagement chart',role:'img'},sets.map(([k,l,c])=>h('path',{key:k,d:pathFor(series[k]),fill:'none',stroke:c,strokeWidth:4,vectorEffect:'non-scaling-stroke'}))))
  );
}
function Dashboard({select,create,show}){
  const [d,setD]=useState(null),[updated,setUpdated]=useState(null);
  const load=useCallback(()=>api('admin/dashboard').then(x=>{setD(x);setUpdated(new Date())}).catch(e=>show(e.message,true)),[show]);
  useEffect(()=>{load();const timer=setInterval(load,30000);return()=>clearInterval(timer)},[load]);
  if(!d)return h('div',{className:'empty'},'Loading Aurora dashboard…');
  const k=d.kpis||{};
  return h(React.Fragment,null,
    h(PageHead,{title:'Dashboard',subtitle:'Aurora Glass Studio — your music business at a glance.',actions:h('div',{className:'row wrap'},h('span',{className:'small muted'},updated?`Updated ${updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:''),h(Button,{icon:'repeat',onClick:load},'Refresh'),h(Button,{variant:'primary',icon:'plus',onClick:()=>create('release')},'New Release'))}),
    h('section',{className:'aurora-hero card'},h('div',{className:'copy'},h('div',{className:'eyebrow'},'Good evening'),h('h2',null,'Welcome Back.'),h('p',{className:'muted'},'Create. Release. Connect. Grow.'),h('div',{className:'row wrap'},h(Button,{variant:'primary',icon:'music',onClick:()=>create('release')},'New Release'),h(Button,{icon:'video',onClick:()=>create('video')},'Add Video'),h(Button,{icon:'calendar',onClick:()=>create('tour')},'Add Tour Date'),h(Button,{icon:'pages',onClick:()=>create('page')},'Create Page')))),
    h('div',{className:'kpis'},h(Kpi,{label:'Net Revenue',value:fmtMoney(k.revenue),icon:'dollar',glow:'#ff55c8'}),h(Kpi,{label:'Orders',value:k.orders||0,icon:'cart',glow:'#9d5cff'}),h(Kpi,{label:'Customers',value:k.customers||0,icon:'users',glow:'#54e9ff'}),h(Kpi,{label:'Avg. Order',value:fmtMoney(k.aov),icon:'bag',glow:'#68f3b0'}),h(Kpi,{label:'Verified Plays',value:k.plays||0,icon:'play',glow:'#ff9c55'}),h(Kpi,{label:'Downloads',value:k.downloads||0,icon:'download',glow:'#5aa8ff'})),
    h('div',{className:'dashboard-grid'},
      h('div',{className:'card card-pad span2'},h('div',{className:'row between'},h('strong',null,'30-Day Engagement'),h('span',{className:'pill'},'Server verified')),h(TrendChart,{series:d.series||{}})),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Upcoming Tour Dates'),h(Button,{className:'compact',onClick:()=>select('tour')},'View all')),d.tours?.length?d.tours.map(x=>h('div',{className:'list-row',key:x.id},h('div',{className:'pill'},fmtDate(x.sort_date).split(',')[0]),h('div',null,h('strong',null,x.title),h('div',{className:'small muted'},x.data.venue||'')),h(Icon,{name:'calendar'}))):h('div',{className:'empty'},'No upcoming shows')),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Recent Releases'),h(Button,{className:'compact',onClick:()=>select('release')},'Manage')),d.recentReleases?.length?d.recentReleases.map(x=>h('div',{className:'list-row',key:x.id},h('div',{className:'thumb'},h('img',{src:x.data.cover||'/art/neon-skies.svg'})),h('div',null,h('strong',null,x.title),h('div',{className:'small muted'},`${x.data.releaseType||'Release'} · ${fmtDate(x.sort_date)}`)),h(Icon,{name:'music'}))):h('div',{className:'empty'},'No releases')),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Recent Orders'),h(Button,{className:'compact',onClick:()=>select('orders')},'View all')),d.recentOrders?.length?d.recentOrders.map(o=>h('div',{className:'list-row',key:o.public_id},h('div',{className:'avatar'},(o.customer_name||'C').slice(0,1)),h('div',null,h('strong',null,o.customer_name||'Customer'),h('div',{className:'small muted'},new Date(o.created_at).toLocaleString())),h('strong',null,fmtMoney(o.total)))):h('div',{className:'empty'},'No orders yet')),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Top Products'),h(Button,{className:'compact',onClick:()=>select('product')},'Store')),d.topProducts?.length?d.topProducts.map(x=>h('div',{className:'commerce-row',key:x.product_id},h('div',null,h('strong',null,x.title),h('div',{className:'small muted'},`${x.units||0} sold`)),h('strong',null,fmtMoney(x.revenue)))):h('div',{className:'empty'},'No product sales yet')),
      h('div',{className:'card card-pad'},h('strong',null,'Commerce Snapshot'),h('div',{className:'commerce-snapshot'},h('div',null,h('span',{className:'muted small'},'Gross sales'),h('strong',null,fmtMoney(k.grossRevenue))),h('div',null,h('span',{className:'muted small'},'Refunds'),h('strong',{className:'danger'},fmtMoney(k.refunded))),h('div',null,h('span',{className:'muted small'},'Net revenue'),h('strong',{className:'success'},fmtMoney(k.revenue)))))
    )
  )
}

function AlbumImporter({onClose,onSaved,show}){
  const [stage,setStage]=useState('pick'),[zipFile,setZipFile]=useState(null),[tracks,setTracks]=useState([]),[cover,setCover]=useState(null),[coverUrl,setCoverUrl]=useState(''),[coverAsset,setCoverAsset]=useState(null),[coverPicker,setCoverPicker]=useState(false),[busy,setBusy]=useState(false),[progress,setProgress]=useState('');
  const [form,setForm]=useState({title:'',artist:'',releaseType:'Album',genre:'',year:String(new Date().getFullYear()),releaseDate:today(),description:'',price:'9.99',status:'published',featured:true,previewSeconds:30,createProduct:true});
  useEffect(()=>()=>{if(coverUrl?.startsWith('blob:'))URL.revokeObjectURL(coverUrl)},[coverUrl]);
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function ingest(file){
    if(!file)return;setBusy(true);setProgress('Reading album ZIP…');
    try{
      const unpacked=await unpackReleaseZip(file);
      if(!unpacked.tracks.length)throw new Error('No MP3 files were found in this ZIP. OneArtist album ingest currently manages MP3 releases.');
      setZipFile(file);setTracks(unpacked.tracks);setCover(unpacked.cover);setCoverAsset(null);
      if(coverUrl)URL.revokeObjectURL(coverUrl);setCoverUrl(unpacked.cover?URL.createObjectURL(new Blob([unpacked.cover.bytes],{type:unpacked.cover.mime})):'');
      const first=unpacked.tracks[0];
      setForm(f=>({...f,title:first.album||file.name.replace(/\.zip$/i,''),artist:first.artist||f.artist,genre:first.genre||f.genre,year:first.year||f.year}));
      setStage('edit');setProgress('');
    }catch(e){show(e.message,true)}finally{setBusy(false)}
  }
  async function chooseCover(file){if(!file)return;const lower=file.name.toLowerCase();if(!/\.(jpe?g|png|webp)$/.test(lower)){show('Choose a JPG, PNG or WebP cover image.',true);return}if(file.size>25*1024*1024){show('Cover artwork must be 25 MB or smaller.',true);return}const bytes=new Uint8Array(await file.arrayBuffer()),mime=file.type|| (lower.endsWith('.png')?'image/png':lower.endsWith('.webp')?'image/webp':'image/jpeg');setCover({name:file.name,path:file.name,bytes,mime});setCoverAsset(null);if(coverUrl?.startsWith('blob:'))URL.revokeObjectURL(coverUrl);setCoverUrl(URL.createObjectURL(file));}
  async function chooseLibraryCover(asset){try{const r=await fetch(asset.url,{credentials:'same-origin'});if(!r.ok)throw new Error('Could not load the selected Media Library image.');const bytes=new Uint8Array(await r.arrayBuffer()),mime=asset.contentType||r.headers.get('content-type')||'image/jpeg';setCover({name:asset.filename,path:asset.filename,bytes,mime});setCoverAsset(asset);if(coverUrl?.startsWith('blob:'))URL.revokeObjectURL(coverUrl);setCoverUrl(asset.url);setCoverPicker(false)}catch(e){show(e.message,true)}}
  function move(from,to){if(to<0||to>=tracks.length||from===to)return;setTracks(list=>{const n=[...list],x=n.splice(from,1)[0];n.splice(to,0,x);return n.map((t,i)=>({...t,trackNo:i+1}))})}
  function drop(from,to){move(Number(from),Number(to))}
  function updateTrack(i,key,val){setTracks(list=>list.map((t,n)=>n===i?{...t,[key]:val}:t))}
  function removeTrack(i){setTracks(list=>list.filter((_,n)=>n!==i).map((t,n)=>({...t,trackNo:n+1})))}
  async function finalize(){
    if(!form.title.trim()||!form.artist.trim())return show('Release title and artist are required.',true);
    if(!tracks.length)return show('At least one track is required.',true);
    if(!cover)return show('Album artwork is required before finalizing.',true);
    setBusy(true);
    try{
      setProgress('Checking storage provider…');const st=await api('admin/storage/status');
      if(st.provider==='r2'&&!st.r2Bound)throw new Error('R2 is selected but the MEDIA bucket binding is missing. Configure Storage in Settings first.');
      if(st.provider==='dropbox'&&!st.dropboxConfigured)throw new Error('Dropbox storage is selected but not configured. Configure Storage in Settings first.');
      setProgress('Preparing album artwork…');const coverExt=cover.mime==='image/png'?'png':cover.mime==='image/webp'?'webp':'jpg';const coverObj=coverAsset||await uploadMediaFile(bytesToFile(cover.bytes,`${form.title}-cover.${coverExt}`,cover.mime),{visibility:'public',folder:'covers',registerLibrary:true});
      setProgress('Writing final MP3 metadata and packaging album…');const finalBytes=buildReleaseZip(tracks,{artist:form.artist,album:form.title,year:form.year,genre:form.genre,cover});const finalName=releaseZipFilename(form.artist,form.title);const packageObj=await uploadMediaFile(bytesToFile(finalBytes,finalName,'application/zip'),{visibility:'private',folder:'releases'});
      setProgress('Creating release record…');const rel=await api('admin/content',{method:'POST',body:JSON.stringify({type:'release',title:form.title,status:form.status,sortDate:form.releaseDate,featured:!!form.featured,data:{releaseType:form.releaseType,price:form.price,cover:coverObj.url,description:form.description,genre:form.genre,year:form.year,packageObjectId:packageObj.id,downloadFilename:finalName}})});
      for(let i=0;i<tracks.length;i++){
        const t=tracks[i];setProgress(`Generating preview ${i+1}/${tracks.length}: ${t.title}`);const preview=await makePreviewWav(t.bytes,{seconds:Number(form.previewSeconds)||30,start:0});const previewFile=bytesToFile(preview.bytes,`${String(i+1).padStart(2,'0')}-${t.title.replace(/[^a-z0-9_-]+/gi,'-')}-preview.wav`,'audio/wav');const previewObj=await uploadMediaFile(previewFile,{visibility:'public',folder:'previews'});
        await api('admin/content',{method:'POST',body:JSON.stringify({type:'track',title:t.title,status:form.status,sortDate:form.releaseDate,featured:false,data:{releaseId:rel.id,trackNo:i+1,audio:previewObj.url,cover:coverObj.url,duration:Math.round(preview.duration),price:'',explicit:!!t.explicit}})});
      }
      if(form.createProduct){setProgress('Creating digital store product…');await api('admin/content',{method:'POST',body:JSON.stringify({type:'product',title:form.title,status:form.status,sortDate:form.releaseDate,featured:!!form.featured,data:{price:String(form.price||'0'),kind:'digital',inventory:'',image:coverObj.url,description:form.description||`${form.releaseType} download by ${form.artist}`,sku:'',variants:[],mediaObjectId:packageObj.id,downloadFilename:finalName,releaseId:rel.id}})});}
      setProgress('Release finalized successfully.');show(`${form.title} finalized, tagged, packaged and published.`);setTimeout(()=>onSaved(),500);
    }catch(e){show(e.message,true);setProgress('')}finally{setBusy(false)}
  }
  const pick=h('div',{className:'album-ingest-pick'},h('div',{className:'album-drop',onDragOver:e=>e.preventDefault(),onDrop:e=>{e.preventDefault();ingest(e.dataTransfer.files?.[0])}},h(Icon,{name:'archive',size:44}),h('h2',null,'Import Album / EP / Single ZIP'),h('p',{className:'muted'},'Drop a ZIP containing MP3 tracks and optional cover artwork. Existing ID3 tags are read automatically.'),h('label',{className:'btn primary file-button'},h(Icon,{name:'upload'}),' Choose Album ZIP',h('input',{type:'file',accept:'.zip,application/zip',hidden:true,onChange:e=>ingest(e.target.files?.[0])})),busy&&h('p',{className:'small'},progress)));
  const coverPanel=h('div',{className:'album-cover-editor'},
    coverUrl?h('img',{src:coverUrl,alt:'Release cover'}):h('div',{className:'cover-placeholder'},h(Icon,{name:'image',size:42}),'No artwork'),
    h('div',{className:'row wrap'},
      h(Button,{type:'button',className:'compact',icon:'image',onClick:()=>setCoverPicker(true)},'Media Library'),
      h('label',{className:'btn compact file-button'},h(Icon,{name:'upload'}),' Upload Artwork',h('input',{type:'file',accept:'image/jpeg,image/png,image/webp',hidden:true,onChange:e=>chooseCover(e.target.files?.[0])}))
    ),
    coverPicker&&h(AssetPicker,{kind:'image',show,onClose:()=>setCoverPicker(false),onSelect:chooseLibraryCover})
  );
  const releaseFields=h('div',{className:'stack'},
    h('div',{className:'grid2'},
      h(Field,{label:'Release title'},h(Input,{required:true,value:form.title,onChange:e=>update('title',e.target.value)})),
      h(Field,{label:'Artist'},h(Input,{required:true,value:form.artist,onChange:e=>update('artist',e.target.value)})),
      h(Field,{label:'Release type'},h(Select,{value:form.releaseType,onChange:e=>update('releaseType',e.target.value)},['Album','EP','Single','Mixtape','Compilation'].map(v=>h('option',{key:v,value:v},v)))),
      h(Field,{label:'Genre'},h(Input,{value:form.genre,onChange:e=>update('genre',e.target.value)})),
      h(Field,{label:'Release date'},h(Input,{type:'date',value:form.releaseDate,onChange:e=>update('releaseDate',e.target.value)})),
      h(Field,{label:'Year written to MP3'},h(Input,{value:form.year,onChange:e=>update('year',e.target.value)})),
      h(Field,{label:'Store price'},h(Input,{type:'number',min:0,step:'.01',value:form.price,onChange:e=>update('price',e.target.value)})),
      h(Field,{label:'Preview length'},h(Select,{value:form.previewSeconds,onChange:e=>update('previewSeconds',Number(e.target.value))},[30,60,90].map(v=>h('option',{key:v,value:v},`${v} seconds`)))),
      h(Field,{label:'Publish status'},h(Select,{value:form.status,onChange:e=>update('status',e.target.value)},h('option',{value:'published'},'Published'),h('option',{value:'draft'},'Draft')))
    ),
    h(Field,{label:'Description'},h(Textarea,{value:form.description,onChange:e=>update('description',e.target.value)})),
    h('div',{className:'row wrap'},
      h('label',{className:'row small'},h('input',{type:'checkbox',checked:form.featured,onChange:e=>update('featured',e.target.checked)}),'Feature release'),
      h('label',{className:'row small'},h('input',{type:'checkbox',checked:form.createProduct,onChange:e=>update('createProduct',e.target.checked)}),'Create digital store product')
    )
  );
  const trackList=h('div',{className:'track-sort-list'},tracks.map((t,i)=>h('div',{
    className:'track-sort-row',key:t.id,draggable:true,
    onDragStart:e=>e.dataTransfer.setData('text/plain',String(i)),
    onDragOver:e=>e.preventDefault(),
    onDrop:e=>{e.preventDefault();drop(e.dataTransfer.getData('text/plain'),i)}
  },
    h('div',{className:'track-drag',title:'Drag to reorder'},h(Icon,{name:'menu'})),
    h('strong',{className:'track-number'},String(i+1).padStart(2,'0')),
    h(Input,{value:t.title,onChange:e=>updateTrack(i,'title',e.target.value),'aria-label':`Track ${i+1} title`}),
    h('div',{className:'row'},
      h(IconButton,{type:'button',icon:'up',label:'Move track up',disabled:i===0,onClick:()=>move(i,i-1)}),
      h(IconButton,{type:'button',icon:'down',label:'Move track down',disabled:i===tracks.length-1,onClick:()=>move(i,i+1)}),
      h(IconButton,{type:'button',icon:'trash',label:'Remove track',onClick:()=>removeTrack(i)})
    )
  )));
  const editor=h('div',{className:'album-ingest-editor'},
    h('div',{className:'album-ingest-grid'},coverPanel,releaseFields),
    h('div',{className:'track-order-head'},
      h('div',null,h('h3',null,'Track Order'),h('p',{className:'small muted'},'Drag tracks on desktop or use the arrow controls on touch devices. Finalized MP3 tags use this exact order.')),
      h('span',{className:'pill'},`${tracks.length} track${tracks.length===1?'':'s'}`)
    ),
    trackList,
    h('div',{className:'album-finalize-note'},h(Icon,{name:'archive'}),h('div',null,
      h('strong',null,'Finalize creates the customer-ready master package'),
      h('p',{className:'small muted'},'OneArtist rewrites MP3 title, artist, album, track number, year, genre and embedded cover art, builds the ZIP, stores it privately, generates public preview audio, and links the store product to the protected package.')
    )),
    progress&&h('div',{className:'ingest-progress'},h('span',{className:'spinner'}),progress),
    h('div',{className:'row between wrap'},
      h(Button,{type:'button',onClick:()=>{setStage('pick');setTracks([]);setZipFile(null)}},'Choose Different ZIP'),
      h(Button,{type:'button',variant:'primary',icon:'archive',disabled:busy,onClick:finalize},busy?'Processing…':'Finalize & Publish Release')
    )
  );
  return h('div',{className:'modal-backdrop album-import-backdrop'},h('div',{className:'modal album-import-modal'},h('div',{className:'modal-head'},h('div',null,h('strong',null,'OneArtist Album Ingest'),h('div',{className:'small muted'},zipFile?zipFile.name:'ZIP → metadata → previews → protected package')),h(IconButton,{icon:'close',label:'Close importer',disabled:busy,onClick:onClose})),h('div',{className:'modal-body'},stage==='pick'?pick:editor)));
}

function ContentManager({type,search,show,createRequest,onCreateHandled}){
  const meta=TYPE_META[type], [items,setItems]=useState([]),[editing,setEditing]=useState(null),[importing,setImporting]=useState(false),[loading,setLoading]=useState(true),[selected,setSelected]=useState(new Set());
  const load=useCallback(()=>{setLoading(true);return api('admin/content?type='+type).then(d=>setItems(d.items||[])).catch(e=>show(e.message,true)).finally(()=>setLoading(false))},[type,show]);
  useEffect(()=>{load()},[load]);
  useEffect(()=>{if(createRequest?.type===type){setEditing(blankFor(type));onCreateHandled?.()}},[createRequest?.token,type]);
  const filtered=items.filter(x=>!search||`${x.title} ${x.slug} ${x.status}`.toLowerCase().includes(search.toLowerCase()));
  async function remove(x){if(!confirm(`Delete “${x.title}”? This cannot be undone.`))return;try{await api('admin/content/'+x.id,{method:'DELETE'});show('Deleted.');setSelected(s=>{const n=new Set(s);n.delete(x.id);return n});await load()}catch(e){show(e.message,true)}}
  async function toggleStatus(x){try{await api('admin/content/'+x.id,{method:'PUT',body:JSON.stringify({status:x.status==='published'?'draft':'published',featured:x.featured})});show(x.status==='published'?'Moved to draft.':'Published.');await load()}catch(e){show(e.message,true)}}
  async function bulkDelete(){if(!selected.size||!confirm(`Delete ${selected.size} selected item(s)? This cannot be undone.`))return;try{for(const itemId of selected)await api('admin/content/'+itemId,{method:'DELETE'});setSelected(new Set());show('Selected items deleted.');await load()}catch(e){show(e.message,true)}}
  const togglePick=id=>setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});
  const singular=meta.singular;
  return h(React.Fragment,null,
    h(PageHead,{title:meta.label,subtitle:`Create, edit, publish and delete ${meta.label.toLowerCase()} without touching code.`,actions:h(React.Fragment,null,selected.size>0&&h(Button,{icon:'trash',onClick:bulkDelete},`Delete ${selected.size}`),type==='release'&&h(Button,{icon:'archive',onClick:()=>setImporting(true)},'Import Album ZIP'),h(Button,{variant:'primary',icon:'plus',onClick:()=>setEditing(blankFor(type))},'Add '+singular))}),
    importing&&h(AlbumImporter,{show,onClose:()=>setImporting(false),onSaved:async()=>{setImporting(false);await load();}}),
    editing&&h(ContentEditor,{item:editing,type,onClose:()=>setEditing(null),onSaved:async()=>{setEditing(null);await load();show('Saved successfully.')}}),
    h('div',{className:'card table-wrap'},loading?h('div',{className:'empty'},'Loading…'):filtered.length?h('table',{className:'table crud-table'},
      h('thead',null,h('tr',null,h('th',null,''),h('th',null,'Title'),h('th',null,'Status'),h('th',null,'Date'),h('th',null,'Homepage'),h('th',null,'Actions'))),
      h('tbody',null,filtered.map(x=>h('tr',{key:x.id},
        h('td',null,h('input',{type:'checkbox',checked:selected.has(x.id),onChange:()=>togglePick(x.id),'aria-label':`Select ${x.title}`})),
        h('td',null,h('strong',null,x.title),h('div',{className:'small muted'},type==='track'&&x.data.trackNo?`Track ${x.data.trackNo} · `:'',x.slug||'')),
        h('td',null,h('button',{className:'status-btn '+x.status,onClick:()=>toggleStatus(x)},x.status)),
        h('td',null,fmtDate(x.sort_date)),
        h('td',null,x.featured?'Yes':'—'),
        h('td',null,h('div',{className:'row'},h(IconButton,{icon:'edit',label:'Edit',onClick:()=>setEditing({...x,sortDate:x.sort_date})}),h(IconButton,{icon:x.status==='published'?'eye':'check',label:x.status==='published'?'Move to draft':'Publish',onClick:()=>toggleStatus(x)}),h(IconButton,{icon:'trash',label:'Delete',onClick:()=>remove(x)})))
      )))
    ):h('div',{className:'empty empty-action'},h(Icon,{name:meta.icon,size:34}),h('strong',null,`No ${meta.label.toLowerCase()} yet.`),h(Button,{variant:'primary',icon:'plus',onClick:()=>setEditing(blankFor(type))},'Create '+singular)))
  )
}
function ContentEditor({item,type,onClose,onSaved}){
  const [form,setForm]=useState(JSON.parse(JSON.stringify(item))),[busy,setBusy]=useState(false),[refs,setRefs]=useState({releases:[]}),[youtubeBusy,setYoutubeBusy]=useState(false);
  const [toast,show]=useToast();
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setData=(k,v)=>setForm(f=>({...f,data:{...(f.data||{}),[k]:v}}));
  useEffect(()=>{if(type==='track')api('admin/content?type=release').then(d=>setRefs({releases:d.items||[]})).catch(()=>{})},[type]);
  async function fetchYouTube(){
    const url=form.data?.youtubeUrl||''; if(!youtubeIdFromUrl(url)){show('Enter a valid YouTube URL first.',true);return}
    setYoutubeBusy(true);
    try{const d=await api('admin/youtube',{method:'POST',body:JSON.stringify({url})});setForm(f=>({...f,title:f.title||d.title||'',data:{...(f.data||{}),youtubeId:d.youtubeId,thumbnail:d.thumbnail||'',youtubeUrl:url}}));show('YouTube details loaded.')}catch(e){show(e.message,true)}finally{setYoutubeBusy(false)}
  }
  async function save(e){
    e.preventDefault(); setBusy(true);
    try{
      const payload={...form,type,sortDate:form.sortDate||form.sort_date||'',slug:form.slug||'',featured:!!form.featured,data:{...(form.data||{})}};
      if(type==='video'){payload.data.youtubeId=youtubeIdFromUrl(payload.data.youtubeUrl);if(!payload.data.youtubeId)throw new Error('Enter a valid YouTube URL.');if(!payload.data.thumbnail)payload.data.thumbnail=`https://img.youtube.com/vi/${payload.data.youtubeId}/hqdefault.jpg`}
      if(type==='track'&&!payload.data.releaseId)throw new Error('Choose the release this track belongs to.');
      if(type==='track'&&!payload.data.audio)throw new Error('Preview audio URL is required.');
      if(type==='tour'&&!payload.data.venue)throw new Error('Venue is required.');
      if(type==='product'&&payload.data.price==='')throw new Error('Product price is required.');
      if(form.id) await api('admin/content/'+form.id,{method:'PUT',body:JSON.stringify(payload)});
      else await api('admin/content',{method:'POST',body:JSON.stringify(payload)});
      await onSaved();
    }catch(err){show(err.message,true)} finally{setBusy(false)}
  }
  const head=h('div',{className:'modal-head'},h('div',null,h('strong',null,(form.id?'Edit ':'New ')+TYPE_META[type].singular),h('div',{className:'small muted'},form.id?'Update the live CMS record.':'Create a new CMS record.')),h(IconButton,{type:'button',icon:'close',onClick:onClose}));
  const basic=h('div',{className:'grid2'},h(Field,{label:'Title'},h(Input,{required:true,value:form.title,onChange:e=>set('title',e.target.value),placeholder:type==='tour'?'Atlanta, GA':''})),h(Field,{label:'Slug'},h(Input,{value:form.slug||'',onChange:e=>set('slug',e.target.value),placeholder:'auto-from-title'})));
  const meta=h('div',{className:'grid3'},h(Field,{label:'Status'},h(Select,{value:form.status,onChange:e=>set('status',e.target.value)},h('option',{value:'published'},'Published'),h('option',{value:'draft'},'Draft'))),h(Field,{label:type==='tour'?'Show date':type==='release'?'Release date':'Date'},h(Input,{type:'date',value:(form.sortDate||form.sort_date||'').slice(0,10),onChange:e=>set('sortDate',e.target.value)})),h(Field,{label:'Homepage'},h('label',{className:'row checkbox-field'},h('input',{type:'checkbox',checked:!!form.featured,onChange:e=>set('featured',e.target.checked)}),'Feature this item')));
  const foot=h('div',{className:'row between wrap editor-foot'},h('span',{className:'small muted'},type==='page'?'HTML is sanitized server-side; scripts and unsafe handlers are removed.':'Saving writes directly to D1 through the authenticated API.'),h('div',{className:'row'},h(Button,{type:'button',onClick:onClose},'Cancel'),h(Button,{type:'submit',variant:'primary',icon:'save',disabled:busy},busy?'Saving…':form.status==='draft'?'Save Draft':'Publish / Save')));
  return h('div',{className:'modal-backdrop'},h('form',{className:'modal editor-modal',onSubmit:save},head,h('div',{className:'modal-body content-form'},basic,meta,h(TypeFields,{type,data:form.data||{},setData,releases:refs.releases,onFetchYouTube:fetchYouTube,youtubeBusy,show}),foot)),h(Toast,{toast}));
}
function VariantEditor({value,onChange}){
  const variants=normalizeVariants(value);
  const update=(i,key,val)=>{const next=variants.map((v,n)=>n===i?{...v,[key]:val}:v);onChange(next)};
  const add=()=>onChange([...variants,{id:`v-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,name:'',size:'',color:'',sku:'',inventory:'',price:''}]);
  const remove=i=>onChange(variants.filter((_,n)=>n!==i));
  return h('div',{className:'variant-editor'},h('div',{className:'row between wrap'},h('div',null,h('strong',null,'Product Variants'),h('div',{className:'small muted'},'Optional size/color/SKU inventory. If variants exist, buyers must choose one.')),h(Button,{type:'button',className:'compact',icon:'plus',onClick:add},'Add Variant')),variants.length?h('div',{className:'variant-list'},variants.map((v,i)=>h('div',{className:'variant-row card',key:v.id||i},h(Field,{label:'Name'},h(Input,{value:v.name||'',onChange:e=>update(i,'name',e.target.value),placeholder:'Black XL'})),h(Field,{label:'Size'},h(Input,{value:v.size||'',onChange:e=>update(i,'size',e.target.value),placeholder:'XL'})),h(Field,{label:'Color'},h(Input,{value:v.color||'',onChange:e=>update(i,'color',e.target.value),placeholder:'Black'})),h(Field,{label:'SKU'},h(Input,{value:v.sku||'',onChange:e=>update(i,'sku',e.target.value)})),h(Field,{label:'Inventory'},h(Input,{type:'number',min:0,value:v.inventory??'',onChange:e=>update(i,'inventory',e.target.value)})),h(Field,{label:'Price override'},h(Input,{type:'number',min:0,step:'.01',value:v.price??'',onChange:e=>update(i,'price',e.target.value),placeholder:'Base price'})),h(IconButton,{type:'button',icon:'trash',label:'Remove variant',onClick:()=>remove(i)})))):h('div',{className:'small muted variant-empty'},'No variants — the base product inventory will be used.'))
}

function TypeFields({type,data,setData,releases=[],onFetchYouTube,youtubeBusy=false,show}){
  if(type==='release')return h(React.Fragment,null,
    h('div',{className:'grid3'},h(Field,{label:'Release type'},h(Select,{value:data.releaseType||'Album',onChange:e=>setData('releaseType',e.target.value)},['Album','EP','Single','Mixtape','Compilation'].map(v=>h('option',{key:v},v)))),h(Field,{label:'Genre'},h(Input,{value:data.genre||'',onChange:e=>setData('genre',e.target.value)})),h(Field,{label:'Price (optional)'},h(Input,{type:'number',min:0,step:'.01',value:data.price??'',onChange:e=>setData('price',e.target.value)}))),
    h('div',{className:'grid2'},h(AssetField,{label:'Cover artwork',value:data.cover||'',onChange:v=>setData('cover',v),show,folder:'covers',kind:'image',placeholder:'Choose from Media Library, upload, or paste URL'}),h(Field,{label:'Catalog / UPC (optional)'},h(Input,{value:data.catalogNo||'',onChange:e=>setData('catalogNo',e.target.value)}))),
    h(Field,{label:'Description'},h(Textarea,{value:data.description||'',onChange:e=>setData('description',e.target.value)})),
    h('div',{className:'grid3'},h(Field,{label:'Spotify URL'},h(Input,{value:data.spotifyUrl||'',onChange:e=>setData('spotifyUrl',e.target.value)})),h(Field,{label:'Apple Music URL'},h(Input,{value:data.appleMusicUrl||'',onChange:e=>setData('appleMusicUrl',e.target.value)})),h(Field,{label:'YouTube Music URL'},h(Input,{value:data.youtubeMusicUrl||'',onChange:e=>setData('youtubeMusicUrl',e.target.value)})))
  );
  if(type==='track')return h(React.Fragment,null,
    h('div',{className:'grid2'},h(Field,{label:'Release'},h(Select,{required:true,value:data.releaseId||'',onChange:e=>setData('releaseId',e.target.value)},h('option',{value:''},'Choose release…'),releases.map(r=>h('option',{key:r.id,value:r.id},r.title)))),h(Field,{label:'Track number'},h(Input,{type:'number',min:1,value:data.trackNo||1,onChange:e=>setData('trackNo',Math.max(1,Number(e.target.value)||1))}))),
    h(Field,{label:'Preview audio URL'},h(Input,{required:true,value:data.audio||'',onChange:e=>setData('audio',e.target.value),placeholder:'/demo/higher-ground.wav or https://…'})),
    h('div',{className:'grid3'},h(AssetField,{label:'Track artwork',value:data.cover||'',onChange:v=>setData('cover',v),show,folder:'covers',kind:'image'}),h(Field,{label:'Duration seconds'},h(Input,{type:'number',min:0,value:data.duration||'',onChange:e=>setData('duration',Number(e.target.value)||0)})),h(Field,{label:'Track price (optional)'},h(Input,{type:'number',min:0,step:'.01',value:data.price??'',onChange:e=>setData('price',e.target.value)}))),
    h('label',{className:'row small'},h('input',{type:'checkbox',checked:!!data.explicit,onChange:e=>setData('explicit',e.target.checked)}),'Explicit content')
  );
  if(type==='video'){
    const yid=data.youtubeId||youtubeIdFromUrl(data.youtubeUrl);
    return h(React.Fragment,null,
      h('div',{className:'youtube-row'},h(Field,{label:'YouTube URL'},h(Input,{required:true,value:data.youtubeUrl||'',onChange:e=>{setData('youtubeUrl',e.target.value);setData('youtubeId',youtubeIdFromUrl(e.target.value))},placeholder:'https://youtube.com/watch?v=…'})),h(Button,{type:'button',icon:'video',onClick:onFetchYouTube,disabled:youtubeBusy},youtubeBusy?'Fetching…':'Fetch YouTube')),
      yid&&h('div',{className:'youtube-preview'},h('img',{src:data.thumbnail||`https://img.youtube.com/vi/${yid}/hqdefault.jpg`,alt:'YouTube thumbnail'}),h('div',{className:'play-overlay'},h(Icon,{name:'play',size:28}))),
      h(Field,{label:'Description'},h(Textarea,{value:data.description||'',onChange:e=>setData('description',e.target.value)}))
    );
  }
  if(type==='tour')return h(React.Fragment,null,
    h('div',{className:'grid2'},h(Field,{label:'Venue'},h(Input,{required:true,value:data.venue||'',onChange:e=>setData('venue',e.target.value)})),h(Field,{label:'Ticket URL'},h(Input,{value:data.ticketUrl||'',onChange:e=>setData('ticketUrl',e.target.value),placeholder:'https://…'}))),
    h('div',{className:'grid3'},h(Field,{label:'City'},h(Input,{value:data.city||'',onChange:e=>setData('city',e.target.value)})),h(Field,{label:'State / Region'},h(Input,{value:data.region||'',onChange:e=>setData('region',e.target.value)})),h(Field,{label:'Country'},h(Input,{value:data.country||'',onChange:e=>setData('country',e.target.value)}))),
    h('div',{className:'grid2'},h(Field,{label:'Show status'},h(Select,{value:data.status||'Tickets Available',onChange:e=>setData('status',e.target.value)},['Tickets Available','Sold Out','Cancelled','Private'].map(v=>h('option',{key:v},v)))),h(Field,{label:'Doors / Time'},h(Input,{value:data.doors||'',onChange:e=>setData('doors',e.target.value),placeholder:'7:00 PM'})))
  );
  if(type==='product')return h(React.Fragment,null,
    h('div',{className:'grid3'},h(Field,{label:'Base price'},h(Input,{required:true,type:'number',min:0,step:'.01',value:data.price??'',onChange:e=>setData('price',e.target.value)})),h(Field,{label:'Product type'},h(Select,{value:data.kind||'physical',onChange:e=>setData('kind',e.target.value)},h('option',{value:'physical'},'Physical merch'),h('option',{value:'digital'},'Digital download'))),h(Field,{label:'Base inventory'},h(Input,{type:'number',min:0,value:data.inventory??'',disabled:data.kind==='digital',onChange:e=>setData('inventory',e.target.value),placeholder:'Used when no variants'}))),
    h('div',{className:'grid2'},h(AssetField,{label:'Product image',value:data.image||'',onChange:v=>setData('image',v),show,folder:'products',kind:'image'}),h(Field,{label:'Base SKU'},h(Input,{value:data.sku||'',onChange:e=>setData('sku',e.target.value)}))),
    data.kind==='digital'&&h(React.Fragment,null,data.mediaObjectId&&h('div',{className:'managed-file-badge'},h(Icon,{name:'archive'}),h('div',null,h('strong',null,'Managed OneArtist package'),h('div',{className:'small muted'},data.downloadFilename||data.mediaObjectId))),h(Field,{label:'Legacy Dropbox path (optional fallback)'},h(Input,{value:data.dropboxPath||'',onChange:e=>setData('dropboxPath',e.target.value),placeholder:'/OneArtist/downloads/album.zip'}))),
    data.kind==='physical'&&h(VariantEditor,{value:data.variants,onChange:v=>setData('variants',v)}),
    h(Field,{label:'Description'},h(Textarea,{value:data.description||'',onChange:e=>setData('description',e.target.value)}))
  );
  if(type==='page')return h(React.Fragment,null,h('label',{className:'row small'},h('input',{type:'checkbox',checked:!!data.showInNav,onChange:e=>setData('showInNav',e.target.checked)}),'Show page in main navigation'),h(Field,{label:'HTML editor'},h(Textarea,{className:'textarea code-editor',value:data.html||'',onChange:e=>setData('html',e.target.value),spellCheck:false})));
  if(type==='media')return h(React.Fragment,null,h('div',{className:'grid2'},h(Field,{label:'Media type'},h(Select,{value:data.mediaType||'image',onChange:e=>setData('mediaType',e.target.value)},['image','audio','video','document'].map(v=>h('option',{key:v,value:v},v)))),h(Field,{label:'Media URL'},h(Input,{required:true,value:data.url||'',onChange:e=>setData('url',e.target.value),placeholder:'https://…'}))),h(Field,{label:'Alt text / description'},h(Input,{value:data.alt||'',onChange:e=>setData('alt',e.target.value)})));
  return null;
}

function Themes({show}){
  const [settings,setSettings]=useState(null),[busy,setBusy]=useState('');
  const themes=[
    {key:'midnight',name:'Midnight Cinema',desc:'Cinematic black, glass and luxury release presentation.',cls:'midnight'},
    {key:'os',name:'Artist OS',desc:'Futuristic app-like artist operating system.',cls:'os'},
    {key:'neon',name:'Neon Editorial',desc:'Bold asymmetrical neon editorial presentation.',cls:'neon'}
  ];
  useEffect(()=>{api('admin/settings').then(d=>setSettings(d.settings)).catch(e=>show(e.message,true))},[]);
  async function activate(key){
    if(!settings)return;
    setBusy(key);
    try{
      const site={...(settings.site||{}),publicTheme:key};
      const d=await api('admin/settings',{method:'PUT',body:JSON.stringify({settings:{site}})});
      setSettings(d.settings);
      show(`${themes.find(t=>t.key===key)?.name||'Theme'} activated. The public site changes immediately.`);
    }catch(e){show(e.message,true)}finally{setBusy('')}
  }
  if(!settings)return h('div',{className:'empty'},'Loading themes…');
  const active=settings.site?.publicTheme||'midnight';
  const cards=themes.map(t=>{
    const actions=h('div',{className:'row wrap'},
      h('a',{className:'btn',href:`/?themePreview=${t.key}`,target:'_blank',rel:'noopener'},h(Icon,{name:'eye'}),' Preview'),
      h(Button,{variant:active===t.key?'':'primary',icon:active===t.key?'check':'palette',disabled:active===t.key||!!busy,onClick:()=>activate(t.key)},busy===t.key?'Activating…':active===t.key?'Active':'Activate')
    );
    return h('article',{className:'theme-card card '+(active===t.key?'theme-active':''),key:t.key},
      h('div',{className:'theme-preview '+t.cls},
        h('div',{className:'theme-mini-nav'}),
        h('div',{className:'theme-mini-copy'},h('span'),h('strong',null,t.name),h('i'))
      ),
      h('div',{className:'card-copy'},
        h('div',{className:'row between'},h('h3',null,t.name),active===t.key&&h('span',{className:'pill success'},'Active')),
        h('p',{className:'small muted'},t.desc),
        actions
      )
    );
  });
  return h(React.Fragment,null,
    h(PageHead,{title:'Themes',subtitle:'Switch the public artist website instantly. No rebuild or redeploy required.',actions:h('a',{className:'btn',href:'/',target:'_blank',rel:'noopener'},h(Icon,{name:'external'}),' Open Live Site')}),
    h('div',{className:'theme-cards'},cards)
  );
}

function Orders({show}){
  const [orders,setOrders]=useState([]),[selected,setSelected]=useState(null),[edit,setEdit]=useState({fulfillmentStatus:'unfulfilled',trackingCarrier:'',trackingNumber:''}),[refundAmount,setRefundAmount]=useState(''),[busy,setBusy]=useState('');
  const load=()=>api('admin/orders').then(d=>setOrders(d.orders||[])).catch(e=>show(e.message,true)); useEffect(()=>{load()},[]);
  async function choose(o){setBusy('detail');try{const d=await api('admin/orders/'+o.id+'/detail');setSelected(d.order);setEdit({fulfillmentStatus:d.order.fulfillment_status||'unfulfilled',trackingCarrier:d.order.tracking_carrier||'',trackingNumber:d.order.tracking_number||''});setRefundAmount('')}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function save(){try{await api('admin/orders/'+selected.id,{method:'PUT',body:JSON.stringify(edit)});show('Fulfillment updated.');await load();const d=await api('admin/orders/'+selected.id+'/detail');setSelected(d.order)}catch(e){show(e.message,true)}}
  async function refund(){if(!confirm(`Issue a PayPal refund${refundAmount?` of ${refundAmount}`:' for the remaining order total'}?`))return;setBusy('refund');try{const d=await api('admin/orders/'+selected.id+'/refund',{method:'POST',body:JSON.stringify({amount:refundAmount})});show(d.pending?(d.message||'Refund is pending at PayPal.'):'Refund completed through PayPal.');await load();const detail=await api('admin/orders/'+selected.id+'/detail');setSelected(detail.order);if(!d.pending)setRefundAmount('')}catch(e){show(e.message,true)}finally{setBusy('')}}
  const rows=orders.map(o=>h('tr',{key:o.id},h('td',null,h('a',{href:'/order/'+o.public_id,target:'_blank',rel:'noopener'},o.public_id.slice(0,10)+'…')),h('td',null,o.customer_name||o.customer_email),h('td',null,fmtMoney(o.total,o.currency)),h('td',null,h('span',{className:'pill '+(o.status==='paid'?'success':o.status.includes('refund')?'warn':'')},o.status)),h('td',null,h('span',{className:'pill'},o.fulfillment_status||'unfulfilled')),h('td',null,new Date(o.created_at).toLocaleString()),h('td',null,h(Button,{className:'compact',icon:'edit',onClick:()=>choose(o),disabled:busy==='detail'},'Manage'))));
  const table=orders.length?h('table',{className:'table'},h('thead',null,h('tr',null,['Order','Customer','Total','Payment','Fulfillment','Date',''].map((x,i)=>h('th',{key:i},x)))),h('tbody',null,rows)):h('div',{className:'empty'},'Orders will appear here after PayPal purchases.'); let detail=null;
  if(selected){const addr=selected.shipping?.address||{},shipName=selected.shipping?.name?.full_name||selected.customer_name||'',address=selected.shipping&&Object.keys(selected.shipping).length?h('address',{className:'shipping-address'},shipName,h('br'),addr.address_line_1||'',addr.address_line_2&&h(React.Fragment,null,h('br'),addr.address_line_2),h('br'),[addr.admin_area_2,addr.admin_area_1,addr.postal_code].filter(Boolean).join(', '),h('br'),addr.country_code||''):h('p',{className:'muted'},'No physical shipping address on this order.'),remaining=Math.max(0,Number(selected.total||0)-Number(selected.refunded_amount||0));detail=h('section',{className:'card form-card order-detail'},h('div',{className:'row between wrap'},h('div',null,h('h3',null,selected.invoice_number||'Order'),h('p',{className:'small muted'},selected.customer_email,' · ',selected.status)),h(IconButton,{icon:'close',label:'Close order',onClick:()=>setSelected(null)})),h('div',{className:'order-items-admin'},selected.items?.map((i,n)=>h('div',{className:'commerce-row',key:n},h('div',null,h('strong',null,i.title),i.data?.selectedVariant&&h('div',{className:'small muted'},i.data.selectedVariant.name||[i.data.selectedVariant.size,i.data.selectedVariant.color].filter(Boolean).join(' / '))),h('span',null,`${i.quantity} × ${fmtMoney(i.unit_price,selected.currency)}`)))),h('div',{className:'grid2'},h('div',null,h('h4',null,'Shipping Address'),address),h('div',{className:'stack'},h(Field,{label:'Fulfillment status'},h(Select,{value:edit.fulfillmentStatus,onChange:e=>setEdit({...edit,fulfillmentStatus:e.target.value})},['unfulfilled','processing','shipped','delivered','not_required'].map(v=>h('option',{key:v,value:v},v.replace('_',' '))))),h(Field,{label:'Carrier'},h(Input,{value:edit.trackingCarrier,onChange:e=>setEdit({...edit,trackingCarrier:e.target.value}),placeholder:'USPS, UPS, FedEx…'})),h(Field,{label:'Tracking number'},h(Input,{value:edit.trackingNumber,onChange:e=>setEdit({...edit,trackingNumber:e.target.value})})),h(Button,{variant:'primary',icon:'save',onClick:save},'Save Fulfillment'))),h('div',{className:'refund-panel'},h('div',{className:'row between wrap'},h('div',null,h('strong',null,'PayPal Refund'),h('div',{className:'small muted'},`Refunded ${fmtMoney(selected.refunded_amount,selected.currency)} · Remaining ${fmtMoney(remaining,selected.currency)}`)),h('a',{className:'btn compact',href:'/order/'+selected.public_id,target:'_blank',rel:'noopener'},h(Icon,{name:'pages'}),' Receipt / Invoice')),remaining>0&&['paid','partially_refunded'].includes(selected.status)&&h('div',{className:'row wrap'},h(Field,{label:'Amount (blank = full remaining)'},h(Input,{type:'number',min:0.01,max:remaining,step:'.01',value:refundAmount,onChange:e=>setRefundAmount(e.target.value),placeholder:remaining.toFixed(2)})),h(Button,{className:'danger',icon:'dollar',onClick:refund,disabled:busy==='refund'},busy==='refund'?'Refunding…':'Issue Refund'))));}
  return h(React.Fragment,null,h(PageHead,{title:'Orders',subtitle:'PayPal orders, invoices, refunds and physical fulfillment.',actions:h(Button,{icon:'repeat',onClick:load},'Refresh')}),h('div',{className:'card table-wrap'},table),detail);
}
function Customers({show}){
  const [items,setItems]=useState([]);
  const load=()=>api('admin/customers').then(d=>setItems(d.customers||[])).catch(e=>show(e.message,true));
  useEffect(()=>{load()},[]);
  return h(React.Fragment,null,
    h(PageHead,{title:'Customers',subtitle:'Customer value and order activity are calculated from verified orders.',actions:h(Button,{icon:'repeat',onClick:load},'Refresh')}),
    h('div',{className:'card table-wrap'},
      items.length
        ? h('table',{className:'table'},
            h('thead',null,h('tr',null,['Customer','Email','Orders','Lifetime Value','Last Order'].map(x=>h('th',{key:x},x)))),
            h('tbody',null,items.map(x=>h('tr',{key:x.email},
              h('td',null,x.customer_name||'Customer'),
              h('td',null,x.email),
              h('td',null,x.order_count),
              h('td',null,fmtMoney(x.gross_value)),
              h('td',null,x.last_order?new Date(x.last_order).toLocaleString():'—')
            )))
          )
        : h('div',{className:'empty'},'Customers appear after verified purchases.')
    )
  );
}

function DownloadsAdmin({show}){
  const [items,setItems]=useState([]),[busy,setBusy]=useState('');
  const load=()=>api('admin/downloads').then(d=>setItems(d.downloads||[])).catch(e=>show(e.message,true));
  useEffect(()=>{load()},[]);
  async function reset(x){
    if(!confirm(`Reset download count for ${x.customer_email}?`))return;
    setBusy(x.id);
    try{
      await api('admin/downloads/'+x.id+'/reset',{method:'POST'});
      show('Download allowance reset.');
      await load();
    }catch(e){show(e.message,true)}finally{setBusy('')}
  }
  return h(React.Fragment,null,
    h(PageHead,{title:'Digital Downloads',subtitle:'Entitlements, usage limits and reset controls.',actions:h(Button,{icon:'repeat',onClick:load},'Refresh')}),
    h('div',{className:'card table-wrap'},
      items.length
        ? h('table',{className:'table'},
            h('thead',null,h('tr',null,['Product','Customer','Order','Used','Limit','Status',''].map(x=>h('th',{key:x},x)))),
            h('tbody',null,items.map(x=>h('tr',{key:x.id},
              h('td',null,x.title||x.product_id),
              h('td',null,x.customer_email),
              h('td',null,(x.public_id||'').slice(0,10)+'…'),
              h('td',null,x.downloads_used),
              h('td',null,x.downloads_max),
              h('td',null,x.status),
              h('td',null,h(Button,{className:'compact',icon:'repeat',onClick:()=>reset(x),disabled:busy===x.id},busy===x.id?'Resetting…':'Reset'))
            )))
          )
        : h('div',{className:'empty'},'Digital purchase entitlements appear here.')
    )
  );
}

function Settings({show,focus}){
  const [settings,setSettings]=useState(null),[ints,setInts]=useState([]),[paypal,setPaypal]=useState({clientId:'',clientSecret:'',environment:'sandbox',webhookId:''}),[paypalConnect,setPaypalConnect]=useState({available:false,status:'not_connected',merchantId:''}),[dropbox,setDropbox]=useState({accessToken:''}),[s3,setS3]=useState({endpoint:'',region:'us-east-1',bucket:'',accessKeyId:'',secretAccessKey:'',forcePathStyle:true}),[emailCfg,setEmailCfg]=useState({service:'resend',apiKey:'',apiToken:'',accountId:'',smtpHost:'',smtpPort:587,smtpSecure:false,smtpUser:'',smtpPassword:'',fromName:'',fromEmail:'',replyTo:'',configured:false,smtpAvailable:false}),[emailQueue,setEmailQueue]=useState([]),[prefs,setPrefs]=useState(null),[testTo,setTestTo]=useState(''),[webhooks,setWebhooks]=useState([]),[storage,setStorage]=useState({provider:'dropbox',r2Bound:false,dropboxConfigured:false,s3Configured:false,localAvailable:false}),[busy,setBusy]=useState('');
  const load=useCallback(()=>Promise.all([api('admin/settings'),api('admin/integrations'),api('admin/email/config'),api('admin/notification-preferences'),api('admin/paypal/config'),api('admin/webhooks'),api('admin/storage/status'),api('admin/paypal/connect/status'),api('admin/email/queue')]).then(([stg,i,e,n,p,w,st,pc,eq])=>{setSettings(stg.settings);setInts(i.integrations||[]);setEmailCfg(x=>({...x,...e,apiKey:'',apiToken:'',smtpPassword:''}));setPrefs(n.preferences);setTestTo(e.fromEmail||'');setPaypal(x=>({...x,clientId:p.clientId||'',environment:p.environment||'sandbox',webhookId:p.webhookId||'',clientSecret:''}));setWebhooks(w.events||[]);setStorage(st);setPaypalConnect(pc);setEmailQueue(eq.queue||[]);setS3(x=>({...x,endpoint:st.s3Endpoint||'',region:st.s3Region||'us-east-1',bucket:st.s3Bucket||'',accessKeyId:st.s3AccessKeyId||'',forcePathStyle:st.s3ForcePathStyle!==false,secretAccessKey:''}))}).catch(e=>show(e.message,true)),[show]);
  useEffect(()=>{load()},[load]); if(!settings||!prefs)return h('div',{className:'empty'},'Loading settings…');
  const artist=settings.artist||{},site=settings.site||{},commerce=settings.commerce||{};const update=(group,key,val)=>setSettings(s=>({...s,[group]:{...(s[group]||{}),[key]:val}}));
  async function save(){try{const d=await api('admin/settings',{method:'PUT',body:JSON.stringify({settings:{artist:settings.artist,site:settings.site,commerce:settings.commerce,socials:settings.socials}})});setSettings(d.settings);show('Settings saved.')}catch(e){show(e.message,true)}}
  async function saveInt(provider,obj){setBusy(provider);try{await api('admin/integrations',{method:'POST',body:JSON.stringify({provider,...obj})});show(provider==='email'?'Email provider connected securely.':provider+' connected securely.');await load()}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function savePrefs(){try{const d=await api('admin/notification-preferences',{method:'PUT',body:JSON.stringify(prefs)});setPrefs(d.preferences);show('Notification preferences saved.')}catch(e){show(e.message,true)}}
  async function testEmail(){setBusy('email-test');try{await api('admin/email/test',{method:'POST',body:JSON.stringify({to:testTo})});show('Test email sent.')}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function testPayPal(){setBusy('paypal-test');try{const d=await api('admin/paypal/test',{method:'POST'});show(`PayPal ${d.environment} credentials authenticated successfully.`)}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function testS3(){setBusy('s3-test');try{await api('admin/storage/s3/test',{method:'POST'});show('S3-compatible storage read/write/delete test passed.')}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function connectPayPal(){setBusy('paypal-connect');try{const d=await api('admin/paypal/connect/start',{method:'POST'});location.href=d.actionUrl}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function retryEmailQueue(){setBusy('email-retry');try{const d=await api('admin/email/queue/retry',{method:'POST'});show(`Retried ${d.processed||0} queued email(s).`);await load()}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function saveStorage(provider){setBusy('storage');try{const d=await api('admin/storage/config',{method:'PUT',body:JSON.stringify({provider})});setStorage(x=>({...x,provider:d.provider}));show(`${d.provider.toUpperCase()} is now the active media storage provider.`)}catch(e){show(e.message,true)}finally{setBusy('')}}
  const prefToggle=(key,label)=>h('label',{className:'notification-pref'},h('input',{type:'checkbox',checked:!!prefs[key],onChange:e=>setPrefs({...prefs,[key]:e.target.checked})}),h('span',null,label));
  const emailReady=emailCfg.configured;
  return h(React.Fragment,null,
    h(PageHead,{title:focus==='homepage'?'Homepage & Artist':'Settings',subtitle:'Brand, hero, commerce, storage, email and secure integrations.',actions:h(Button,{variant:'primary',icon:'save',onClick:save},'Save Settings')}),
    h('div',{className:'stack'},
      h('section',{className:'card form-card'},h('h3',null,'Artist Profile'),h('div',{className:'grid2'},h(Field,{label:'Artist / stage name'},h(Input,{value:artist.name||'',onChange:e=>update('artist','name',e.target.value)})),h(Field,{label:'Genre'},h(Input,{value:artist.genre||'',onChange:e=>update('artist','genre',e.target.value)})),h(Field,{label:'Location'},h(Input,{value:artist.location||'',onChange:e=>update('artist','location',e.target.value)})),h(AssetField,{label:'Profile image',value:artist.profileImage||'',onChange:v=>update('artist','profileImage',v),show,folder:'artist',kind:'image'})),h(Field,{label:'Biography'},h(Textarea,{value:artist.bio||'',onChange:e=>update('artist','bio',e.target.value)}))),
      h('section',{className:'card form-card'},h('h3',null,'Homepage Hero'),h('div',{className:'grid2'},h(Field,{label:'Site title'},h(Input,{value:site.title||'',onChange:e=>update('site','title',e.target.value)})),h(AssetField,{label:'Artist logo',value:site.logoUrl||'',onChange:v=>update('site','logoUrl',v),show,folder:'branding',kind:'image',placeholder:'Choose logo or paste URL'}),h(Field,{label:'Accent color'},h(Input,{type:'color',value:site.accent||'#b45cff',onChange:e=>update('site','accent',e.target.value)})),h(Field,{label:'Hero headline'},h(Input,{value:site.heroTitle||'',onChange:e=>update('site','heroTitle',e.target.value)})),h(AssetField,{label:'Hero image',value:site.heroImage||'',onChange:v=>update('site','heroImage',v),show,folder:'hero',kind:'image',placeholder:'Choose hero image or paste URL'})),h(Field,{label:'Hero subtitle'},h(Textarea,{value:site.heroSubtitle||'',onChange:e=>update('site','heroSubtitle',e.target.value)}))),
      h('section',{className:'card form-card'},h('h3',null,'Commerce'),h('div',{className:'grid3'},h(Field,{label:'Currency'},h(Input,{value:commerce.currency||'USD',onChange:e=>update('commerce','currency',e.target.value.toUpperCase().slice(0,3))})),h(Field,{label:'Flat physical shipping'},h(Input,{type:'number',step:'.01',min:0,value:commerce.flatShipping??0,onChange:e=>update('commerce','flatShipping',Number(e.target.value))})),h(Field,{label:'Digital download limit'},h(Input,{type:'number',min:1,max:50,value:commerce.downloadsMax??5,onChange:e=>update('commerce','downloadsMax',Number(e.target.value))})))),
      h('section',{className:'card form-card'},
        h('div',{className:'row between wrap'},h('div',null,h('h3',null,'Media Storage'),h('p',{className:'small muted'},'Album artwork, preview audio and protected release ZIPs are stored outside the database.')),h('span',{className:'pill success'},(storage.provider||'not configured').toUpperCase())),
        h('div',{className:'provider-grid'},
          h('button',{type:'button',className:'provider-card '+(storage.provider==='r2'?'active':''),disabled:!storage.r2Bound||busy==='storage',onClick:()=>saveStorage('r2')},h(Icon,{name:'archive'}),h('strong',null,'Cloudflare R2'),h('span',null,storage.r2Bound?'Bucket binding MEDIA detected':'Add an R2 bucket binding named MEDIA')),
          h('button',{type:'button',className:'provider-card '+(storage.provider==='dropbox'?'active':''),disabled:!storage.dropboxConfigured||busy==='storage',onClick:()=>saveStorage('dropbox')},h(Icon,{name:'download'}),h('strong',null,'Dropbox'),h('span',null,storage.dropboxConfigured?'Encrypted token configured':'Configure Dropbox below')),
          h('button',{type:'button',className:'provider-card '+(storage.provider==='s3'?'active':''),disabled:!storage.s3Configured||busy==='storage',onClick:()=>saveStorage('s3')},h(Icon,{name:'archive'}),h('strong',null,'S3 Compatible'),h('span',null,storage.s3Configured?'Encrypted S3 credentials configured':'Configure endpoint below')),
          storage.localAvailable&&h('button',{type:'button',className:'provider-card '+(storage.provider==='local'?'active':''),disabled:busy==='storage',onClick:()=>saveStorage('local')},h(Icon,{name:'archive'}),h('strong',null,'VPS Local Storage'),h('span',null,'Private server media directory'))
        ),
        h('p',{className:'small muted'},'The Album ZIP importer uses whichever provider is active here. Public previews are served through OneArtist; paid packages remain protected behind entitlement checks.')
      ),
      h('section',{className:'card form-card'},
        h('div',{className:'row between'},h('h3',null,'PayPal Direct Merchant API'),ints.some(x=>x.provider==='paypal')&&h('span',{className:'pill success'},'Configured')),
        h('p',{className:'small muted'},'Use the Client ID and Client Secret from your PayPal Developer Dashboard → Apps & Credentials. The secret is encrypted before storage and never returned to the browser.'),
        h('div',{className:'grid2'},h(Field,{label:'PayPal Client ID'},h(Input,{value:paypal.clientId,onChange:e=>setPaypal({...paypal,clientId:e.target.value})})),h(Field,{label:'Environment'},h(Select,{value:paypal.environment,onChange:e=>setPaypal({...paypal,environment:e.target.value})},h('option',{value:'sandbox'},'Sandbox / Testing'),h('option',{value:'live'},'Live')))),
        h('div',{className:'grid2'},h(Field,{label:'PayPal Client Secret'},h(Input,{type:'password',value:paypal.clientSecret,onChange:e=>setPaypal({...paypal,clientSecret:e.target.value}),placeholder:ints.some(x=>x.provider==='paypal')?'Leave blank to keep current secret':'Never stored in GitHub'})),h(Field,{label:'PayPal Webhook ID'},h(Input,{value:paypal.webhookId||'',onChange:e=>setPaypal({...paypal,webhookId:e.target.value}),placeholder:'From PayPal Developer Dashboard'}))),
        h(Field,{label:'Webhook listener URL'},h('div',{className:'copy-field'},h(Input,{readOnly:true,value:location.origin+'/api/paypal/webhook'}),h(Button,{type:'button',className:'compact',icon:'link',onClick:()=>navigator.clipboard?.writeText(location.origin+'/api/paypal/webhook')},'Copy'))),
        h('p',{className:'small muted'},'Direct merchant credentials remain supported. PayPal Connect can be enabled separately when your PayPal platform/partner credentials and OneArtist Connect service are ready.'),
        h('div',{className:'row wrap'},h(Button,{icon:'lock',disabled:busy==='paypal',onClick:()=>saveInt('paypal',paypal)},busy==='paypal'?'Saving…':'Save PayPal Securely'),h(Button,{icon:'check',disabled:busy==='paypal-test'||!ints.some(x=>x.provider==='paypal'),onClick:testPayPal},busy==='paypal-test'?'Testing…':'Test Connection'))
      ),
      h('section',{className:'card form-card'},h('div',{className:'row between wrap'},h('div',null,h('h3',null,'PayPal Connect — Partner Onboarding'),h('p',{className:'small muted'},'Optional seller-login onboarding through PayPal Partner Referrals. No universal partner secret is stored in customer OneArtist code.')),h('span',{className:'pill '+(paypalConnect.status==='connected'?'success':'')},paypalConnect.status==='connected'?'CONNECTED':paypalConnect.available?'READY':'NOT CONFIGURED')),paypalConnect.merchantId&&h('p',{className:'small muted'},`Merchant ID: ${paypalConnect.merchantId}`),h(Button,{icon:'link',disabled:busy==='paypal-connect'||!paypalConnect.available,onClick:connectPayPal},busy==='paypal-connect'?'Opening PayPal…':paypalConnect.status==='connected'?'Reconnect PayPal':'Connect PayPal'),!paypalConnect.available&&h('p',{className:'small muted'},'Set ONEARTIST_CONNECT_URL and ONEARTIST_CONNECT_TOKEN as deployment secrets after your central Connect service is deployed.')),
      h('section',{className:'card form-card'},h('div',{className:'row between wrap'},h('div',null,h('h3',null,'PayPal Webhook Health'),h('p',{className:'small muted'},paypal.webhookId?'Signed server-to-server events are enabled.':'Add the PayPal Webhook ID above before using Live checkout.')),h(Button,{className:'compact',icon:'repeat',onClick:load},'Refresh')),webhooks.length?h('div',{className:'webhook-events'},webhooks.slice(0,6).map(w=>h('div',{className:'webhook-row',key:w.event_id},h('span',{className:'webhook-state '+w.status},w.status),h('div',null,h('strong',null,w.event_type),h('div',{className:'small muted'},new Date(w.created_at).toLocaleString(),w.error?' · '+w.error:''))))):h('div',{className:'small muted'},'No verified webhook events received yet.')),
      h('section',{className:'card form-card'},h('div',{className:'row between'},h('h3',null,'S3-Compatible Storage'),storage.s3Configured&&h('span',{className:'pill success'},'Configured')),h('p',{className:'small muted'},'Works with Amazon S3 and S3-compatible providers using AWS Signature V4. Secrets are encrypted in the OneArtist integrations store.'),h('div',{className:'grid2'},h(Field,{label:'Endpoint URL'},h(Input,{value:s3.endpoint,onChange:e=>setS3({...s3,endpoint:e.target.value}),placeholder:'https://s3.us-east-1.amazonaws.com'})),h(Field,{label:'Region'},h(Input,{value:s3.region,onChange:e=>setS3({...s3,region:e.target.value}),placeholder:'us-east-1'})),h(Field,{label:'Bucket'},h(Input,{value:s3.bucket,onChange:e=>setS3({...s3,bucket:e.target.value})})),h(Field,{label:'Access Key ID'},h(Input,{value:s3.accessKeyId,onChange:e=>setS3({...s3,accessKeyId:e.target.value})})),h(Field,{label:'Secret Access Key'},h(Input,{type:'password',value:s3.secretAccessKey,onChange:e=>setS3({...s3,secretAccessKey:e.target.value}),placeholder:storage.s3Configured?'Leave blank to keep current secret':'Encrypted secret'})),h('label',{className:'notification-pref'},h('input',{type:'checkbox',checked:s3.forcePathStyle!==false,onChange:e=>setS3({...s3,forcePathStyle:e.target.checked})}),h('span',null,'Use path-style bucket URL'))),h('div',{className:'row wrap'},h(Button,{icon:'lock',disabled:busy==='s3',onClick:()=>saveInt('s3',s3)},busy==='s3'?'Saving…':'Save S3 Securely'),h(Button,{icon:'check',disabled:busy==='s3-test'||!storage.s3Configured,onClick:testS3},busy==='s3-test'?'Testing…':'Test Read / Write / Delete'))),
      h('section',{className:'card form-card'},h('div',{className:'row between'},h('h3',null,'Dropbox Storage'),ints.some(x=>x.provider==='dropbox')&&h('span',{className:'pill success'},'Configured')),h('p',{className:'small muted'},'Optional alternative to R2. OneArtist stores a protected storage key instead of exposing a permanent Dropbox URL.'),h(Field,{label:'Dropbox access token'},h(Input,{type:'password',value:dropbox.accessToken,onChange:e=>setDropbox({accessToken:e.target.value}),placeholder:'Encrypted in D1'})),h(Button,{icon:'lock',disabled:busy==='dropbox',onClick:()=>saveInt('dropbox',dropbox)},busy==='dropbox'?'Saving…':'Save Dropbox Securely')),
      h('section',{className:'card form-card email-settings'},
        h('div',{className:'row between wrap'},h('div',null,h('h3',null,'Email & Sales Notifications'),h('p',{className:'small muted'},'Use Resend on the free/serverless path, or Cloudflare Email Service when your account/domain is enabled for outbound sending. Credentials are encrypted in D1.')),emailReady&&h('span',{className:'pill success'},'Email Ready')),
        h('div',{className:'grid2'},
          h(Field,{label:'Provider'},h(Select,{value:emailCfg.service||'resend',onChange:e=>setEmailCfg({...emailCfg,service:e.target.value,configured:false})},h('option',{value:'resend'},'Resend'),h('option',{value:'brevo'},'Brevo'),h('option',{value:'cloudflare'},'Cloudflare Email Service'),h('option',{value:'smtp',disabled:!emailCfg.smtpAvailable},'SMTP (VPS / Self-hosted)'))),
          h(Field,{label:'From name'},h(Input,{value:emailCfg.fromName||'',onChange:e=>setEmailCfg({...emailCfg,fromName:e.target.value}),placeholder:'Artist Store'})),
          h(Field,{label:'From email'},h(Input,{type:'email',value:emailCfg.fromEmail||'',onChange:e=>setEmailCfg({...emailCfg,fromEmail:e.target.value}),placeholder:'sales@yourdomain.com'})),
          h(Field,{label:'Reply-to email'},h(Input,{type:'email',value:emailCfg.replyTo||'',onChange:e=>setEmailCfg({...emailCfg,replyTo:e.target.value}),placeholder:'artist@yourdomain.com'}))
        ),
        emailCfg.service==='cloudflare'?
          h('div',{className:'grid2'},h(Field,{label:'Cloudflare Account ID'},h(Input,{value:emailCfg.accountId||'',onChange:e=>setEmailCfg({...emailCfg,accountId:e.target.value}),placeholder:'Cloudflare account ID'})),h(Field,{label:'Cloudflare Email API token'},h(Input,{type:'password',value:emailCfg.apiToken||'',onChange:e=>setEmailCfg({...emailCfg,apiToken:e.target.value}),placeholder:emailReady?'Enter only to replace current token':'Encrypted secret'}))):emailCfg.service==='smtp'?
          h('div',{className:'grid2'},h(Field,{label:'SMTP host'},h(Input,{value:emailCfg.smtpHost||'',onChange:e=>setEmailCfg({...emailCfg,smtpHost:e.target.value}),placeholder:'smtp.yourhost.com'})),h(Field,{label:'SMTP port'},h(Input,{type:'number',value:emailCfg.smtpPort||587,onChange:e=>setEmailCfg({...emailCfg,smtpPort:Number(e.target.value)||587})})),h(Field,{label:'SMTP username'},h(Input,{value:emailCfg.smtpUser||'',onChange:e=>setEmailCfg({...emailCfg,smtpUser:e.target.value})})),h(Field,{label:'SMTP password'},h(Input,{type:'password',value:emailCfg.smtpPassword||'',onChange:e=>setEmailCfg({...emailCfg,smtpPassword:e.target.value}),placeholder:emailReady?'Leave blank to keep current password':'Encrypted secret'})),h('label',{className:'notification-pref'},h('input',{type:'checkbox',checked:!!emailCfg.smtpSecure,onChange:e=>setEmailCfg({...emailCfg,smtpSecure:e.target.checked})}),h('span',null,'Use implicit TLS / SMTPS'))):
          h(Field,{label:emailCfg.service==='brevo'?'Brevo API key':'Resend API key'},h(Input,{type:'password',value:emailCfg.apiKey||'',onChange:e=>setEmailCfg({...emailCfg,apiKey:e.target.value}),placeholder:emailReady?'Enter only to replace current key':emailCfg.service==='brevo'?'xkeysib-…':'re_…'})),
        emailCfg.service==='cloudflare'&&h('div',{className:'provider-note'},h(Icon,{name:'mail'}),h('div',null,h('strong',null,'Cloudflare sending note'),h('p',{className:'small muted'},'Your sending domain must use Cloudflare DNS. Sending to arbitrary customer addresses currently requires Workers Paid; verified destination addresses can be used for free testing.'))),
        h('div',{className:'row wrap'},h(Button,{icon:'lock',disabled:busy==='email',onClick:()=>saveInt('email',emailCfg)},busy==='email'?'Saving…':'Save Email Securely'),h(Field,{label:'Test recipient'},h(Input,{type:'email',value:testTo,onChange:e=>setTestTo(e.target.value),placeholder:'you@example.com'})),h(Button,{icon:'mail',onClick:testEmail,disabled:busy==='email-test'||!emailReady},busy==='email-test'?'Sending…':'Send Test Email')),
        h('div',{className:'provider-note'},h(Icon,{name:'repeat'}),h('div',null,h('strong',null,'Durable Email Queue'),h('p',{className:'small muted'},`${emailQueue.filter(x=>x.status==='retry'||x.status==='dead'||x.status==='pending').length} message(s) waiting or needing attention. Failed sends retry automatically with backoff.`),h(Button,{className:'compact',icon:'repeat',disabled:busy==='email-retry',onClick:retryEmailQueue},busy==='email-retry'?'Retrying…':'Retry Failed Now'))),
        h('div',{className:'notification-prefs'},prefToggle('new_order','Email artist for new orders'),prefToggle('digital_sale','Digital sale alerts'),prefToggle('physical_sale','Physical merch sale alerts'),prefToggle('shipping_updates','Customer shipping/tracking emails'),prefToggle('security_alerts','Security/account emails'),prefToggle('low_inventory','Low inventory alerts'),h(Field,{label:'Low inventory threshold'},h(Input,{type:'number',min:1,max:100,value:prefs.low_inventory_threshold||5,onChange:e=>setPrefs({...prefs,low_inventory_threshold:Number(e.target.value)||5})}))),h(Button,{icon:'save',onClick:savePrefs},'Save Notification Preferences')
      )
    )
  )
}
function SecurityPanel({show}){
  const [account,setAccount]=useState(null),[pw,setPw]=useState({currentPassword:'',newPassword:'',confirm:''}),[email,setEmail]=useState({email:'',currentPassword:''}),[busy,setBusy]=useState('');
  useEffect(()=>{api('admin/account').then(d=>{setAccount(d.user);setEmail(e=>({...e,email:d.user.email}))}).catch(e=>show(e.message,true))},[]);
  async function changePassword(e){e.preventDefault();if(pw.newPassword!==pw.confirm){show('New passwords do not match.',true);return}setBusy('password');try{await api('admin/account/password',{method:'POST',body:JSON.stringify(pw)});setPw({currentPassword:'',newPassword:'',confirm:''});show('Password changed. Other administrator sessions were signed out.')}catch(e){show(e.message,true)}finally{setBusy('')}}
  async function changeEmail(e){e.preventDefault();setBusy('email');try{const d=await api('admin/account/email',{method:'POST',body:JSON.stringify(email)});setAccount(d.user);setEmail({email:d.user.email,currentPassword:''});show('Administrator email changed. Security notifications were sent when email is configured.')}catch(e){show(e.message,true)}finally{setBusy('')}}
  return h(React.Fragment,null,h(PageHead,{title:'Security & Login',subtitle:'Password recovery, account identity and hardened sessions.'}),
    h('div',{className:'grid2 security-grid'},
      h('form',{className:'card form-card',onSubmit:changePassword},h('div',{className:'row'},h(Icon,{name:'key'}),h('h3',null,'Change Password')),h(Field,{label:'Current password'},h(Input,{type:'password',required:true,value:pw.currentPassword,onChange:e=>setPw({...pw,currentPassword:e.target.value})})),h(Field,{label:'New password (10+ characters)'},h(Input,{type:'password',required:true,minLength:10,value:pw.newPassword,onChange:e=>setPw({...pw,newPassword:e.target.value})})),h(Field,{label:'Confirm new password'},h(Input,{type:'password',required:true,minLength:10,value:pw.confirm,onChange:e=>setPw({...pw,confirm:e.target.value})})),h(Button,{type:'submit',variant:'primary',icon:'lock',disabled:busy==='password'},busy==='password'?'Changing…':'Change Password')),
      h('form',{className:'card form-card',onSubmit:changeEmail},h('div',{className:'row'},h(Icon,{name:'mail'}),h('h3',null,'Administrator Email')),h('p',{className:'small muted'},account?`Current: ${account.email}`:'Loading…'),h(Field,{label:'New email'},h(Input,{type:'email',required:true,value:email.email,onChange:e=>setEmail({...email,email:e.target.value})})),h(Field,{label:'Current password to confirm'},h(Input,{type:'password',required:true,value:email.currentPassword,onChange:e=>setEmail({...email,currentPassword:e.target.value})})),h(Button,{type:'submit',icon:'save',disabled:busy==='email'},busy==='email'?'Updating…':'Update Email'))
    ),
    h('div',{className:'grid2 security-notes'},[['shield','Secure Admin Sessions','HttpOnly, Secure, SameSite=Lax session cookies.'],['lock','Password Protection','PBKDF2-SHA256 with unique salts and 100,000 iterations.'],['mail','Forgot Password','One-time email reset tokens expire after 30 minutes and invalidate old sessions.'],['check','CSRF Protection','All authenticated writes require a session-bound CSRF token.'],['lock','Encrypted Secrets','PayPal, Dropbox and email credentials use AES-GCM before D1 storage.'],['pages','Sanitized Custom HTML','Scripts, iframes, inline event handlers and javascript: URLs are stripped.']].map(([i,t,d])=>h('div',{className:'card card-pad',key:t},h('div',{className:'row'},h(Icon,{name:i}),h('strong',null,t)),h('p',{className:'muted'},d))))
  )
}

function Player({tracks,current,setCurrent}){
  const audio=useRef(null),pendingAuto=useRef(false),counted=useRef(new Set());
  const [playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[volume,setVolume]=useState(()=>Number(localStorage.oah_volume??.85)),[shuffle,setShuffle]=useState(false),[repeat,setRepeat]=useState('off'),[expanded,setExpanded]=useState(false),[queueOpen,setQueueOpen]=useState(false),[favorite,setFavorite]=useState(()=>{try{return new Set(JSON.parse(localStorage.oah_favorites||'[]'))}catch{return new Set()}});
  const track=tracks[current]||null;
  useEffect(()=>{localStorage.oah_volume=String(volume);if(audio.current)audio.current.volume=volume},[volume]);
  useEffect(()=>{localStorage.oah_favorites=JSON.stringify([...favorite])},[favorite]);
  useEffect(()=>{const pause=()=>{audio.current?.pause();setPlaying(false)};addEventListener('oah:pause-player',pause);return()=>removeEventListener('oah:pause-player',pause)},[]);
  useEffect(()=>{if(!track||!audio.current)return;const a=audio.current;a.src=track.data.audio||'';a.load();setTime(0);setDuration(Number(track.data.duration)||0);if(pendingAuto.current){pendingAuto.current=false;a.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false))}else setPlaying(false)},[track?.id]);
  function toggle(){const a=audio.current;if(!a||!track)return;if(a.paused)a.play().then(()=>setPlaying(true)).catch(()=>{});else{a.pause();setPlaying(false)}}
  function go(i,auto=playing){if(!tracks.length)return;pendingAuto.current=auto;setCurrent((i+tracks.length)%tracks.length)}
  function next(auto=playing){if(!tracks.length)return;if(shuffle&&tracks.length>1){let i=current;while(i===current)i=Math.floor(Math.random()*tracks.length);go(i,auto);return}if(current===tracks.length-1&&repeat!=='all'){audio.current?.pause();setPlaying(false);return}go((current+1)%tracks.length,auto)}
  function prev(){if(audio.current&&audio.current.currentTime>4){audio.current.currentTime=0;return}go(current-1,playing)}
  function ended(){if(repeat==='one'){audio.current.currentTime=0;audio.current.play().catch(()=>{});return}next(true)}
  function tick(){const a=audio.current;if(!a)return;setTime(a.currentTime||0);setDuration(a.duration||Number(track?.data.duration)||0);if(track&&a.currentTime>=10&&!counted.current.has(track.id)){counted.current.add(track.id);api('analytics',{method:'POST',body:JSON.stringify({event:'play',objectType:'track',objectId:track.id})}).catch(()=>{})}}
  function cycleRepeat(){setRepeat(r=>r==='off'?'all':r==='all'?'one':'off')}
  function toggleFav(){if(!track)return;setFavorite(f=>{const n=new Set(f);n.has(track.id)?n.delete(track.id):n.add(track.id);return n})}
  if(!track)return null;
  const art=track.data.cover||'/art/neon-skies.svg', isFav=favorite.has(track.id);
  const controls=h('div',{className:'glass-controls'},
    h(IconButton,{icon:'shuffle',label:'Shuffle',className:shuffle?'active-control':'',onClick:()=>setShuffle(v=>!v)}),
    h(IconButton,{icon:'prev',onClick:prev,label:'Previous'}),
    h('button',{className:'glass-play','aria-label':playing?'Pause':'Play',onClick:toggle},h(Icon,{name:playing?'pause':'play',size:22})),
    h(IconButton,{icon:'next',onClick:()=>next(),label:'Next'}),
    h('button',{className:'icon-btn repeat-button '+(repeat!=='off'?'active-control':''),'aria-label':'Repeat',title:`Repeat: ${repeat}`,onClick:cycleRepeat},h(Icon,{name:'repeat'}),repeat==='one'&&h('span',{className:'repeat-one'},'1'))
  );
  const progress=h('div',{className:'glass-progress'},
    h('span',null,clock(time)),
    h('input',{type:'range',min:0,max:duration||1,step:.1,value:Math.min(time,duration||1),onChange:e=>{const v=Number(e.target.value);if(audio.current)audio.current.currentTime=v;setTime(v)},style:{'--progress':`${duration?Math.min(100,(time/duration)*100):0}%`}}),
    h('span',null,clock(duration))
  );
  const queueItems=tracks.map((t,i)=>h('button',{key:t.id,className:'queue-track '+(i===current?'active':''),onClick:()=>go(i,playing)},
    h('img',{src:t.data.cover||'/art/neon-skies.svg',alt:''}),
    h('span',null,h('strong',null,t.title),h('small',null,`Track ${t.data.trackNo||i+1}`)),
    i===current&&h(Icon,{name:playing?'pause':'play'})
  ));
  const queue=queueOpen?h('div',{className:'player-queue card'},
    h('div',{className:'row between'},h('strong',null,'Up Next'),h(IconButton,{icon:'close',label:'Close queue',onClick:()=>setQueueOpen(false)})),
    h('div',{className:'queue-list'},queueItems)
  ):null;
  const full=expanded?h('div',{className:'player-expanded'},
    h('div',{className:'player-expanded-glow'}),
    h('div',{className:'expanded-top'},h('span',null,'NOW PLAYING'),h(IconButton,{icon:'minimize',label:'Collapse player',onClick:()=>setExpanded(false)})),
    h('img',{className:'expanded-art',src:art,alt:''}),
    h('div',{className:'expanded-copy'},h('h2',null,track.title),h('p',null,'OneArtist Continuous Player')),
    progress,
    controls,
    h('div',{className:'expanded-actions'},h(IconButton,{icon:'heart',label:'Favorite',className:isFav?'active-control':'',onClick:toggleFav}),h(Button,{icon:'queue',onClick:()=>setQueueOpen(v=>!v)},'Queue'),h('div',{className:'expanded-volume'},h(Icon,{name:'volume'}),h('input',{type:'range',min:0,max:1,step:.01,value:volume,onChange:e=>setVolume(Number(e.target.value))}))),
    queue
  ):null;
  const bar=h('div',{className:'player-shell'},
    h('div',{className:'player glass-player'},
      h('button',{className:'player-track',onClick:()=>setExpanded(true)},h('img',{src:art,alt:''}),h('div',{style:{minWidth:0}},h('div',{className:'title'},track.title),h('div',{className:'artist small muted'},'OneArtist Player'))),
      h('div',{className:'player-center'},controls,progress),
      h('div',{className:'player-actions'},h(IconButton,{icon:'heart',label:'Favorite',className:isFav?'active-control':'',onClick:toggleFav}),h(IconButton,{icon:'queue',label:'Queue',onClick:()=>setQueueOpen(v=>!v)}),h('div',{className:'volume'},h(Icon,{name:'volume'}),h('input',{type:'range',min:0,max:1,step:.01,value:volume,onChange:e=>setVolume(Number(e.target.value))})),h(IconButton,{icon:'expand',label:'Expand player',onClick:()=>setExpanded(true)}))
    ),
    queue
  );
  return h(React.Fragment,null,h('audio',{ref:audio,onTimeUpdate:tick,onEnded:ended,onPlay:()=>setPlaying(true),onPause:()=>setPlaying(false),preload:'metadata'}),bar,full);
}
const clock=s=>{if(!Number.isFinite(s))return'0:00';const m=Math.floor(s/60),x=Math.floor(s%60);return `${m}:${String(x).padStart(2,'0')}`};
function PublicSite({path,nav}){
  const [data,setData]=useState(null),[video,setVideo]=useState(null),[current,setCurrent]=useState(0),[cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.oah_cart||'[]')}catch{return[]}}),[cartOpen,setCartOpen]=useState(false),[mobileNav,setMobileNav]=useState(false);
  const [toast,show]=useToast();
  useEffect(()=>{api('public/bootstrap').then(setData).catch(e=>show(e.message,true))},[]);
  useEffect(()=>{api('analytics',{method:'POST',body:JSON.stringify({event:'site_view',objectType:'page',objectId:location.pathname})}).catch(()=>{})},[path]);
  useEffect(()=>{localStorage.oah_cart=JSON.stringify(cart)},[cart]);
  if(!data)return h('div',{className:'auth-page'},h('div',{className:'auth-box card'},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo'}),h('p',{className:'lead'},'Loading artist website…')),h(Toast,{toast}));
  const s=data.settings||{},content=data.content||[],artist=s.artist||{},site=s.site||{};
  const previewTheme=new URLSearchParams(location.search).get('themePreview');
  const theme=['midnight','os','neon'].includes(previewTheme)?previewTheme:(site.publicTheme||'midnight');
  const tracks=content.filter(x=>x.type==='track').sort((a,b)=>(Number(a.data.trackNo)||0)-(Number(b.data.trackNo)||0));
  const allReleases=content.filter(x=>x.type==='release');
  const allVideos=content.filter(x=>x.type==='video');
  const allTours=content.filter(x=>x.type==='tour'&&(!x.sort_date||x.sort_date>=new Date().toISOString().slice(0,10))).sort((a,b)=>String(a.sort_date||'').localeCompare(String(b.sort_date||'')));
  const allProducts=content.filter(x=>x.type==='product');
  const homeReleases=allReleases.slice(0,3),homeVideos=allVideos.slice(0,3),homeTours=allTours.slice(0,3),homeProducts=allProducts.slice(0,4);
  const pages=content.filter(x=>x.type==='page'&&x.data.showInNav),route=location.pathname,custom=route.startsWith('/page/')?content.find(x=>x.type==='page'&&x.slug===route.split('/').pop()):null;
  const go=to=>{nav(to);setMobileNav(false)};
  const links=[['/music','Music'],['/videos','Videos'],['/tour','Tour'],['/shop','Shop'],['/account','My Account'],...pages.map(p=>['/page/'+p.slug,p.title])];
  function addCart(p,variant=null){const key=p.id+'::'+(variant?.id||'base'),price=variant&&variant.price!==''?Math.max(0,Number(variant.price)||0):Math.max(0,Number(p.data.price)||0),variantLabel=variant?(variant.name||[variant.size,variant.color].filter(Boolean).join(' / ')):'';setCart(c=>{const found=c.find(x=>x.key===key);return found?c.map(x=>x.key===key?{...x,qty:Math.min(20,x.qty+1)}:x):[...c,{key,id:p.id,variantId:variant?.id||'',variantLabel,title:p.title,price,qty:1,image:p.data.image||''}]});show('Added to cart.')}
  function openVideo(v){setVideo(v);api('analytics',{method:'POST',body:JSON.stringify({event:'video_view',objectType:'video',objectId:v.id})}).catch(()=>{})}
  function playTrackByRelease(rel){const i=tracks.findIndex(t=>t.data.releaseId===rel.id);if(i>=0)setCurrent(i);else show('No preview track has been added to this release yet.',true)}
  const brand=site.logoUrl?h('img',{src:site.logoUrl,alt:artist.name||site.title||'Artist',className:'public-artist-logo'}):h('span',{className:'public-artist-brand'},site.title||artist.name||'Artist');
  return h('div',{className:'public '+theme},
    previewTheme&&h('div',{className:'theme-preview-banner'},h(Icon,{name:'eye'}),` Previewing ${previewTheme==='os'?'Artist OS':previewTheme==='neon'?'Neon Editorial':'Midnight Cinema'} — activation is controlled from OneArtist Hub Admin.`),
    h('header',{className:'public-nav'},h('a',{href:'/',className:'public-brand-link',onClick:e=>{e.preventDefault();go('/')}},brand),h('nav',{className:'public-links'},links.map(([to,label])=>h('a',{key:to,href:to,onClick:e=>{e.preventDefault();go(to)}},label))),h(IconButton,{icon:mobileNav?'close':'menu',label:'Toggle navigation',className:'mobile-public-menu',onClick:()=>setMobileNav(v=>!v)})),
    mobileNav&&h('nav',{className:'mobile-public-panel'},links.map(([to,label])=>h('a',{key:to,href:to,onClick:e=>{e.preventDefault();go(to)}},label))),
    custom?h(CustomPage,{page:custom}):route==='/music'?h(MusicPage,{releases:allReleases,tracks,setCurrent}):route==='/videos'?h(VideosPage,{videos:allVideos,openVideo}):route==='/tour'?h(TourPage,{tours:allTours}):route==='/shop'?h(ShopPage,{products:allProducts,addCart}):h(HomePage,{theme,site,artist,releases:homeReleases,videos:homeVideos,tours:homeTours,products:homeProducts,openVideo,addCart,playTrackByRelease}),
    h('button',{className:'cart-fab',onClick:()=>setCartOpen(true),'aria-label':'Open cart'},h(Icon,{name:'cart'}),cart.reduce((n,x)=>n+x.qty,0)>0&&h('span',{className:'cart-count'},cart.reduce((n,x)=>n+x.qty,0))),
    tracks.length>0&&h(Player,{tracks,current,setCurrent}),video&&h(VideoModal,{video,onClose:()=>setVideo(null)}),cartOpen&&h(CartModal,{cart,setCart,onClose:()=>setCartOpen(false),show}),h(Toast,{toast})
  )
}

function HomePage({theme,site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease}){
  const common={site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease};
  if(theme==='os')return h(ArtistOSHome,common);
  if(theme==='neon')return h(NeonEditorialHome,common);
  return h(MidnightCinemaHome,common);
}
function MidnightCinemaHome({site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease}){
  const featured=releases[0];
  return h('main',{className:'theme-home midnight-home'},
    h('section',{className:'mc-hero',style:{backgroundImage:`linear-gradient(90deg,rgba(2,4,5,.78),rgba(2,4,5,.08)),url('${site.heroImage||featured?.data.cover||'/art/hero-aurora.svg'}')`}},
      h('div',{className:'mc-kicker'},artist.genre||'MUSIC FOR A BRIGHTER NIGHT'),
      h('div',{className:'mc-copy'},h('h1',null,site.heroTitle||artist.name||'ARTIST'),h('p',{className:'mc-quote'},site.heroSubtitle||artist.bio||'Some songs feel like places.'),h('div',{className:'mc-actions'},h(Button,{variant:'primary',icon:'play',onClick:()=>featured&&playTrackByRelease(featured)},'Listen To The New Album'),videos[0]&&h(Button,{icon:'play',onClick:()=>openVideo(videos[0])},'Watch The Film'))),
      h('div',{className:'mc-side-mantra'},'MUSIC',h('br'), 'PEOPLE',h('br'),'PLACES',h('br'),'A BRIGHTER NIGHT')),
    featured&&h('section',{className:'mc-feature-frame'},h('div',{className:'mc-feature-cover'},h('img',{src:featured.data.cover||'/art/neon-skies.svg',alt:featured.title})),h('div',{className:'mc-feature-copy'},h('span',{className:'mc-eyebrow'},'FEATURED RELEASE'),h('small',null,featured.data.releaseType||'NEW ALBUM'),h('h2',null,featured.title),h('p',null,featured.data.description||'A cinematic journey through the latest chapter.'),h('div',{className:'row wrap'},h(Button,{variant:'primary',icon:'play',onClick:()=>playTrackByRelease(featured)},'Listen Now'),h('a',{className:'btn',href:'/music'},'View Tracklist'))),h('blockquote',null,'“A soundtrack built for the rest of us.”')),
    h('div',{className:'mc-split'},h(VideoSection,{videos,onOpen:openVideo}),h(ProductSection,{products,onAdd:addCart})),
    h(TourSection,{tours}),
    h('section',{className:'mc-ending'},h('div',{style:{backgroundImage:`url('${site.heroImage||'/art/hero-aurora.svg'}')`}}),h('p',null,'GOOD MUSIC. BRIGHTER PEOPLE.'),h('strong',null,'A BRIGHTER NIGHT AHEAD.'))
  )
}
function ArtistOSHome({site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease}){
  const featured=releases[0];
  return h('main',{className:'theme-home os-home'},
    h('section',{className:'os-hero',style:{backgroundImage:`radial-gradient(circle at 44% 44%,rgba(77,129,255,.08),rgba(3,12,28,.64) 58%),url('${site.heroImage||featured?.data.cover||'/art/hero-aurora.svg'}')`}},
      h('div',{className:'os-identity'},h('span',{className:'os-eyebrow'},artist.genre||'ARTIST · PRODUCER · DREAMER'),h('h1',null,site.heroTitle||artist.name||'ARTIST'),h('p',null,site.heroSubtitle||artist.bio||'Sounds for a brighter tomorrow.'),h('div',{className:'row wrap'},h(Button,{variant:'primary',icon:'play',onClick:()=>featured&&playTrackByRelease(featured)},'Play Artist Mix'),h(Button,{icon:'heart'},'Follow'))),
      featured&&h('article',{className:'os-feature card'},h('small',null,'NEW ALBUM'),h('h2',null,featured.title),h('span',null,'OUT NOW'),h(IconButton,{icon:'arrow',label:'Play release',onClick:()=>playTrackByRelease(featured)})),
      h('aside',{className:'os-mantra'},'MUSIC',h('br'),'PEOPLE',h('br'),'PLANET',h('br'),'A BRIGHTER',h('br'),'TOMORROW')),
    h('section',{className:'os-grid'},
      h('div',{className:'os-panel'},h(ReleaseSection,{releases,onPlay:playTrackByRelease})),
      h('div',{className:'os-panel'},h(VideoSection,{videos,onOpen:openVideo})),
      h('div',{className:'os-panel'},h(TourSection,{tours})),
      h('div',{className:'os-panel os-merch'},h(ProductSection,{products,onAdd:addCart})),
      h('div',{className:'os-panel os-community'},h('span',{className:'os-eyebrow'},'COMMUNITY'),h('h2',null,'Join the Conversation'),h('div',{className:'os-avatar-stack'},[1,2,3,4,5].map(n=>h('i',{key:n}))),h('p',null,'Music brings people together. Stay close to the artist universe.')),
      h('div',{className:'os-panel os-quote',style:{backgroundImage:`linear-gradient(rgba(3,11,25,.2),rgba(3,11,25,.72)),url('${site.heroImage||'/art/hero-aurora.svg'}')`}},h('blockquote',null,'“A kinder planet sounds better anyway.”'))
    )
  )
}
function NeonEditorialHome({site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease}){
  const featured=releases[0];
  return h('main',{className:'theme-home neon-home'},
    h('section',{className:'ne-hero'},
      h('div',{className:'ne-copy'},h('span',{className:'ne-eyebrow'},artist.genre||'MUSIC LIVES LOUDER'),h('h1',null,site.heroTitle||artist.name||'SAME STARS DIFFERENT US'),h('p',null,site.heroSubtitle||artist.bio||'A sound for the dreamers, the outsiders, and everyone in between.'),h('div',{className:'row wrap'},h(Button,{variant:'primary',icon:'play',onClick:()=>featured&&playTrackByRelease(featured)},'Listen Now'),videos[0]&&h(Button,{icon:'play',onClick:()=>openVideo(videos[0])},'Watch The Film'))),
      h('div',{className:'ne-image',style:{backgroundImage:`url('${site.heroImage||featured?.data.cover||'/art/hero-aurora.svg'}')`}},h('span',null,'MUSIC',h('br'),'PEOPLE',h('br'),'PLACES',h('br'),'A BRIGHTER YOU')),
      h('aside',{className:'ne-brand'},h('strong',null,artist.name||site.title||'ARTIST'),h('span',null,'ALTERNATIVE',h('br'),'POP',h('br'),'FOR A LOUDER',h('br'),'TOMORROW'))),
    featured&&h('section',{className:'ne-feature'},h('div',null,h('span',{className:'ne-eyebrow'},'LATEST RELEASE'),h('h2',null,featured.title),h('p',null,featured.data.description||'A telepathic journey through late nights, bigger dreams and everything in between.'),h(Button,{variant:'primary',icon:'play',onClick:()=>playTrackByRelease(featured)},'Listen Now')),h('div',{className:'ne-cover'},h('img',{src:featured.data.cover||'/art/neon-skies.svg',alt:featured.title})),h('blockquote',null,'“Somewhere in the chaos we still find the music.”')),
    h(ReleaseSection,{releases,onPlay:playTrackByRelease}),
    h('div',{className:'ne-two'},h(VideoSection,{videos,onOpen:openVideo}),h(ProductSection,{products,onAdd:addCart})),
    h(TourSection,{tours}),
    h('section',{className:'ne-footer-poster'},h('strong',null,'MORE THAN MUSIC'),h('span',null,'ARTISTS BUILD BIGGER.'))
  )
}
function ReleaseSection({releases,onPlay}){return h('section',{className:'public-section',id:'releases'},h('div',{className:'section-title'},h('h2',null,'Latest Releases'),h('span',{className:'muted'},'Albums · EPs · Singles')),releases.length?h('div',{className:'release-grid'},releases.map(r=>h('article',{className:'release-card card',key:r.id,onClick:()=>onPlay(r)},h('div',{className:'cover'},h('img',{src:r.data.cover||'/art/neon-skies.svg',alt:r.title})),h('div',{className:'card-copy'},h('div',{className:'small muted'},r.data.releaseType||'Release'),h('h3',null,r.title),h('div',{className:'row between'},h('span',{className:'small'},fmtDate(r.sort_date)),h(Icon,{name:'play'})))))):h('div',{className:'empty'},'No releases yet.'))}
function VideoSection({videos,onOpen}){return h('section',{className:'public-section'},h('div',{className:'section-title'},h('h2',null,'Videos'),h('span',{className:'muted'},'Watch without leaving the site')),videos.length?h('div',{className:'video-grid'},videos.map(v=>h('article',{className:'video-card card',key:v.id,onClick:()=>onOpen(v)},h('div',{className:'cover'},h('img',{src:v.data.thumbnail||(v.data.youtubeId?`https://img.youtube.com/vi/${v.data.youtubeId}/hqdefault.jpg`:'/art/hero-aurora.svg'),alt:v.title})),h('div',{className:'card-copy'},h('h3',null,v.title),h('div',{className:'row'},h(Icon,{name:'play'}),h('span',{className:'small muted'},'Play Video')))))):h('div',{className:'empty'},'No videos yet.'))}
function ProductCard({product,onAdd}){const variants=normalizeVariants(product.data.variants),[variantId,setVariantId]=useState(variants[0]?.id||''),chosen=variants.find(v=>v.id===variantId)||null,price=chosen&&chosen.price!==''?chosen.price:product.data.price,stock=chosen?chosen.inventory:product.data.inventory,soldOut=product.data.kind==='physical'&&stock!==''&&stock!=null&&Number(stock)<=0;return h('article',{className:'product-card card'},h('div',{className:'cover'},h('img',{src:product.data.image||'/art/hoodie.svg',alt:product.title})),h('div',{className:'card-copy stack'},h('div',{className:'row between'},h('h3',null,product.title),h('strong',null,fmtMoney(price))),product.data.description&&h('p',{className:'small muted product-description'},product.data.description),variants.length>0&&h(Field,{label:'Choose option'},h(Select,{value:variantId,onChange:e=>setVariantId(e.target.value)},variants.map(v=>h('option',{key:v.id,value:v.id,disabled:v.inventory!==''&&Number(v.inventory)<=0},`${v.name||[v.size,v.color].filter(Boolean).join(' / ')||'Option'}${v.inventory!==''?` — ${Number(v.inventory)>0?`${v.inventory} left`:'Sold out'}`:''}`)))),h(Button,{variant:'primary',icon:'cart',disabled:soldOut||variants.length>0&&!chosen,onClick:()=>onAdd(product,chosen)},soldOut?'Sold Out':'Add to Cart')))}
function ProductSection({products,onAdd}){return h('section',{className:'public-section'},h('div',{className:'section-title'},h('h2',null,'Merch & Downloads'),h('span',{className:'muted'},'Official store')),products.length?h('div',{className:'product-grid'},products.map(p=>h(ProductCard,{key:p.id,product:p,onAdd}))):h('div',{className:'empty'},'No products yet.'))}
function TourSection({tours}){return h('section',{className:'public-section'},h('div',{className:'section-title'},h('h2',null,'Upcoming Tour Dates'),h('span',{className:'muted'},'See you on the road')),h('div',{className:'tour-list'},tours.length?tours.map(t=>h('div',{className:'tour-row',key:t.id},h('strong',null,fmtDate(t.sort_date)),h('div',null,h('strong',null,t.title),h('div',{className:'small muted'},t.data.venue||'')),t.data.ticketUrl&&h('a',{className:'btn',href:t.data.ticketUrl,target:'_blank',rel:'noopener'},'Tickets'))):h('div',{className:'empty'},'No upcoming shows.'))) }
function MusicPage({releases,tracks,setCurrent}){return h(React.Fragment,null,h('section',{className:'public-section'},h(PageHead,{title:'Music',subtitle:'Stream previews and explore the latest releases.'}),h('div',{className:'release-grid'},releases.map(r=>h('article',{className:'release-card card',key:r.id},h('div',{className:'cover'},h('img',{src:r.data.cover||'/art/neon-skies.svg'})),h('div',{className:'card-copy'},h('h3',null,r.title),h('p',{className:'small muted'},r.data.description||''),h(Button,{icon:'play',variant:'primary',onClick:()=>{const i=tracks.findIndex(t=>t.data.releaseId===r.id);if(i>=0)setCurrent(i)}},'Play')))))))}
function VideosPage({videos,openVideo}){return h('section',{className:'public-section'},h(PageHead,{title:'Videos',subtitle:'Official YouTube videos open in a responsive modal.'}),h(VideoSection,{videos,onOpen:openVideo}))}
function TourPage({tours}){return h('section',{className:'public-section'},h(PageHead,{title:'Tour',subtitle:'Upcoming live dates.'}),h(TourSection,{tours}))}
function ShopPage({products,addCart}){return h('section',{className:'public-section'},h(PageHead,{title:'Shop',subtitle:'Music downloads and official merchandise.'}),h(ProductSection,{products,onAdd:addCart}))}
function CustomPage({page}){return h('section',{className:'public-section'},h(PageHead,{title:page.title}),h('div',{className:'card card-pad',dangerouslySetInnerHTML:{__html:page.data.html||''}}))}
function VideoModal({video,onClose}){useEffect(()=>{dispatchEvent(new CustomEvent('oah:pause-player'))},[]);return h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)onClose()}},h('div',{className:'modal'},h('div',{className:'modal-head'},h('strong',null,video.title),h(IconButton,{icon:'close',onClick:onClose})),h('div',{className:'modal-body'},h('div',{className:'ratio'},h('iframe',{src:`https://www.youtube-nocookie.com/embed/${video.data.youtubeId}?autoplay=1&rel=0`,allow:'autoplay; encrypted-media; picture-in-picture',allowFullScreen:true,title:video.title})),video.data.description&&h('p',{className:'muted'},video.data.description))))}
function CartModal({cart,setCart,onClose,show}){
  const [paypalReady,setPaypalReady]=useState(false);
  const cartRef=useRef(cart);
  const total=cart.reduce((n,x)=>n+x.price*x.qty,0);
  useEffect(()=>{cartRef.current=cart},[cart]);
  useEffect(()=>{
    if(!cart.length)return;
    api('paypal/config').then(cfg=>{
      if(!cfg.configured)return;
      const renderButtons=()=>{
        setTimeout(()=>{
          const el=document.getElementById('oah-paypal-buttons');
          if(!el||el.dataset.ready||!window.paypal)return;
          el.dataset.ready='1';
          window.paypal.Buttons({
            createOrder:()=>api('paypal/create-order',{method:'POST',body:JSON.stringify({cart:cartRef.current})}).then(d=>d.paypalOrderId),
            onApprove:data=>api('paypal/capture',{method:'POST',body:JSON.stringify({paypalOrderId:data.orderID})}).then(d=>{
              setCart([]);
              onClose();
              if(d.pending){show(d.message||'PayPal is processing this payment. Your order will unlock after payment completes.');return}
              location.href='/order/'+d.order.publicId;
            }),
            onError:err=>show('PayPal checkout failed: '+(err.message||err),true)
          }).render('#oah-paypal-buttons');
        },100);
      };
      const load=()=>{
        if(window.paypal){setPaypalReady(true);renderButtons();return}
        const existing=document.querySelector('script[data-oah-paypal-sdk]');
        if(existing){existing.addEventListener('load',()=>{setPaypalReady(true);renderButtons()},{once:true});return}
        const script=document.createElement('script');
        script.dataset.oahPaypalSdk='1';
        script.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.clientId)}&currency=${encodeURIComponent(cfg.currency||'USD')}&intent=capture`;
        script.onload=()=>{setPaypalReady(true);renderButtons()};
        document.head.appendChild(script);
      };
      load();
    }).catch(()=>{});
  },[cart.length]);

  const changeQty=(item,delta)=>setCart(current=>current.map(x=>x.key===item.key?{...x,qty:Math.max(1,Math.min(20,x.qty+delta))}:x));
  const remove=item=>setCart(current=>current.filter(x=>(x.key||x.id)!==(item.key||item.id)));

  return h('div',{className:'modal-backdrop'},
    h('div',{className:'modal'},
      h('div',{className:'modal-head'},h('strong',null,'Your Cart'),h(IconButton,{icon:'close',onClick:onClose,label:'Close cart'})),
      h('div',{className:'modal-body stack'},
        cart.length
          ? cart.map(x=>h('div',{className:'cart-row',key:x.key||x.id},
              h('div',{className:'thumb'},h('img',{src:x.image||'/art/hoodie.svg',alt:''})),
              h('div',{className:'cart-copy'},
                h('strong',null,x.title),
                x.variantLabel&&h('div',{className:'small muted'},x.variantLabel),
                h('div',{className:'qty-control'},
                  h(IconButton,{icon:'minus',label:'Decrease quantity',onClick:()=>changeQty(x,-1)}),
                  h('span',null,x.qty),
                  h(IconButton,{icon:'plus',label:'Increase quantity',onClick:()=>changeQty(x,1)})
                )
              ),
              h('div',{className:'row'},
                h('strong',null,fmtMoney(x.price*x.qty)),
                h(IconButton,{icon:'trash',label:'Remove item',onClick:()=>remove(x)})
              )
            ))
          : h('div',{className:'empty'},'Your cart is empty.'),
        cart.length>0&&h(React.Fragment,null,
          h('div',{className:'row between'},h('strong',null,'Subtotal'),h('strong',null,fmtMoney(total))),
          h('div',{id:'oah-paypal-buttons'}),
          !paypalReady&&h('p',{className:'small muted'},'PayPal buttons appear here after PayPal is configured. Physical shipping is calculated server-side.')
        )
      )
    )
  );
}

function CustomerAccount({nav}){const [session,setSession]=useState(null),[orders,setOrders]=useState([]),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');const token=new URLSearchParams(location.search).get('token');const load=useCallback(()=>api('customer/me').then(d=>{setSession(d);return api('customer/orders')}).then(d=>setOrders(d.orders||[])).catch(()=>setSession(null)),[]);useEffect(()=>{if(token){setBusy(true);api('customer/consume',{method:'POST',body:JSON.stringify({token})}).then(()=>{history.replaceState({},'', '/account');return load()}).catch(e=>setMessage(e.message)).finally(()=>setBusy(false))}else load()},[]);async function send(e){e.preventDefault();setBusy(true);try{const d=await api('customer/magic-link',{method:'POST',body:JSON.stringify({email})});setMessage(d.message)}catch(e){setMessage(e.message)}finally{setBusy(false)}}async function logout(){await api('customer/logout',{method:'POST'});setSession(null);setOrders([])}async function download(ent){setMessage('Creating secure one-time download…');try{const d=await api('customer/download',{method:'POST',body:JSON.stringify({entitlementId:ent.id})});location.href=d.url}catch(e){setMessage(e.message)}}if(!session)return h('div',{className:'customer-account-page'},h('div',{className:'account-login card'},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo'}),h('h1',null,'My Account'),h('p',{className:'muted'},'No password needed. Enter the email used at checkout and we’ll send a secure one-time sign-in link.'),h('form',{onSubmit:send,className:'stack'},h(Field,{label:'Purchase email'},h(Input,{type:'email',required:true,value:email,onChange:e=>setEmail(e.target.value),placeholder:'you@example.com'})),h(Button,{type:'submit',variant:'primary',icon:'mail',disabled:busy},busy?'Please wait…':'Email Secure Sign-In Link')),message&&h('p',{className:'small'},message),h(Button,{onClick:()=>nav('/')},'Back to Site')));return h('div',{className:'customer-account-page'},h('div',{className:'account-head'},h('div',null,h('div',{className:'eyebrow'},'CUSTOMER PORTAL'),h('h1',null,'My Orders & Downloads'),h('p',{className:'muted'},session.email)),h('div',{className:'row wrap'},h(Button,{icon:'repeat',onClick:load},'Refresh'),h(Button,{icon:'logout',onClick:logout},'Sign Out'),h(Button,{onClick:()=>nav('/')},'Back to Site'))),message&&h('div',{className:'card card-pad account-message'},message),orders.length?h('div',{className:'account-orders'},orders.map(o=>h('section',{className:'account-order card',key:o.id},h('div',{className:'row between wrap account-order-head'},h('div',null,h('strong',null,o.invoice_number||'Invoice'),h('div',{className:'small muted'},new Date(o.created_at).toLocaleString())),h('div',{className:'row'},h('span',{className:'pill '+(o.status==='paid'?'success':'')},o.status),h('strong',null,fmtMoney(Number(o.total)-Number(o.refunded_amount||0),o.currency)))),h('div',{className:'account-items'},o.items.map((i,n)=>{const ent=o.entitlements.find(e=>e.product_id===i.product_id);return h('div',{className:'account-item',key:n},h('div',null,h('strong',null,i.title),i.data?.selectedVariant&&h('div',{className:'small muted'},i.data.selectedVariant.name||[i.data.selectedVariant.size,i.data.selectedVariant.color].filter(Boolean).join(' / ')),h('div',{className:'small muted'},`${i.quantity} × ${fmtMoney(i.unit_price,o.currency)}`)),i.kind==='digital'&&ent?h(Button,{className:'compact',icon:'download',disabled:ent.downloads_used>=ent.downloads_max,onClick:()=>download(ent)},ent.downloads_used>=ent.downloads_max?'Limit Reached':`Download ${ent.downloads_used}/${ent.downloads_max}`):h('span',{className:'small muted'},o.fulfillment_status==='shipped'?(o.tracking_number?`${o.tracking_carrier||'Tracking'} ${o.tracking_number}`:'Shipped'):o.fulfillment_status.replace('_',' ')))})),h('div',{className:'row between wrap account-order-foot'},h('span',{className:'small muted'},o.refunded_amount>0?`Refunded ${fmtMoney(o.refunded_amount,o.currency)}`:''),h('a',{className:'btn compact',href:'/order/'+o.public_id},h(Icon,{name:'pages'}),' View Invoice'))))):h('div',{className:'empty'},'No orders found for this account.'))}
function Receipt({publicId,nav}){const [order,setOrder]=useState(null),[err,setErr]=useState(''),[msg,setMsg]=useState('');useEffect(()=>{api('order/'+publicId).then(d=>setOrder(d.order)).catch(e=>setErr(e.message))},[publicId]);async function download(item){setMsg('Authorizing download…');try{const d=await api('downloads/request',{method:'POST',body:JSON.stringify({publicId,email:order.customer_email,productId:item.product_id})});setMsg('Download authorized.');location.href=d.url}catch(e){setMsg(e.message)}}if(err)return h('div',{className:'auth-page'},h('div',{className:'auth-box card'},h('h1',null,'Invoice unavailable'),h('p',null,err)));if(!order)return h('div',{className:'auth-page'},'Loading invoice…');const entitlementFor=id=>order.entitlements?.find(e=>e.product_id===id),captureTx=order.transactions?.find(t=>t.type==='capture'),transactionId=captureTx?.provider_id||order.paypal_order_id||'—';return h('div',{className:'receipt'},h('div',{className:'invoice-brand'},h('img',{src:order.branding?.logo||'/art/oneartist-logo.svg',style:{width:220}}),h('div',{className:'invoice-title'},h('strong',null,'PAID INVOICE / RECEIPT'),h('span',null,order.invoice_number||order.public_id))),h('div',{className:'invoice-meta'},h('div',null,h('span',null,'Invoice Status'),h('strong',null,order.status.toUpperCase())),h('div',null,h('span',null,'Purchase Date'),h('strong',null,new Date(order.created_at).toLocaleString())),h('div',null,h('span',null,'Customer'),h('strong',null,order.customer_name||order.customer_email)),h('div',null,h('span',null,'PayPal Transaction'),h('strong',{className:'mono'},transactionId))),h('table',null,h('thead',null,h('tr',null,h('th',null,'Item'),h('th',null,'Qty'),h('th',null,'Price'),h('th',{className:'no-print'},'Delivery'))),h('tbody',null,order.items.map((i,n)=>{const ent=entitlementFor(i.product_id);return h('tr',{key:n},h('td',null,i.title,i.data?.selectedVariant&&h('div',{className:'small muted'},i.data.selectedVariant.name||[i.data.selectedVariant.size,i.data.selectedVariant.color].filter(Boolean).join(' / '))),h('td',null,i.quantity),h('td',null,fmtMoney(i.unit_price*i.quantity,order.currency)),h('td',{className:'no-print'},i.kind==='digital'&&ent?h(Button,{className:'compact',icon:'download',disabled:ent.downloads_used>=ent.downloads_max,onClick:()=>download(i)},ent.downloads_used>=ent.downloads_max?'Limit Reached':'Download'):'Physical item'))})),h('tfoot',null,h('tr',null,h('td',{colSpan:2},'Subtotal'),h('td',null,fmtMoney(order.subtotal,order.currency)),h('td',{className:'no-print'})),h('tr',null,h('td',{colSpan:2},'Shipping'),h('td',null,fmtMoney(order.shipping,order.currency)),h('td',{className:'no-print'})),order.refunded_amount>0&&h('tr',null,h('td',{colSpan:2},'Refunded'),h('td',{className:'danger'},'-'+fmtMoney(order.refunded_amount,order.currency)),h('td',{className:'no-print'})),h('tr',null,h('td',{colSpan:2},h('strong',null,'Net Paid')),h('td',null,h('strong',null,fmtMoney(Math.max(0,Number(order.total)-Number(order.refunded_amount||0)),order.currency))),h('td',{className:'no-print'})))),order.fulfillment_status&&order.fulfillment_status!=='not_required'&&h('div',{className:'invoice-fulfillment'},h('strong',null,'Fulfillment: '),order.fulfillment_status,order.tracking_number?` · ${order.tracking_carrier||'Tracking'} ${order.tracking_number}`:''),order.branding?.supportEmail&&h('p',{className:'small muted'},'Support: ',order.branding.supportEmail),msg&&h('p',{className:'no-print small'},msg),h('div',{className:'row no-print wrap',style:{marginTop:20}},h(Button,{onClick:()=>print(),icon:'pages'},'Print / Save PDF'),h(Button,{onClick:()=>nav('/account'),icon:'user'},'My Account'),h(Button,{onClick:()=>nav('/')},'Back to Site')))}



function App(){const [path,nav]=usePath();const [status,setStatus]=useState(null),[user,setUser]=useState(null),[authChecked,setAuthChecked]=useState(false);const resetRoute=location.pathname==='/admin/reset-password';const isAdmin=location.pathname.startsWith('/admin')||location.pathname.startsWith('/setup');useEffect(()=>{api('status').then(setStatus).catch(e=>setStatus({installed:true,error:e.message}))},[]);useEffect(()=>{if(status?.installed&&isAdmin){api('auth/me').then(d=>{window.__OAH_CSRF=d.csrf;setUser(d.user)}).catch(()=>setUser(null)).finally(()=>setAuthChecked(true))}else if(status)setAuthChecked(true)},[status?.installed,isAdmin]);if(location.pathname.startsWith('/order/'))return h(Receipt,{publicId:location.pathname.split('/').pop(),nav});if(location.pathname==='/account')return h(CustomerAccount,{nav});if(!status)return h('div',{className:'auth-page'},h('div',{className:'auth-box card'},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo'}),h('p',{className:'lead'},'Starting OneArtist Hub…')));if(status.installed===false)return h(Setup,{onDone:()=>location.reload()});if(resetRoute)return h(ResetPassword,{onDone:()=>{history.replaceState({},'', '/admin');location.reload()}});if(isAdmin){if(!authChecked)return h('div',{className:'auth-page'},'Checking secure session…');return user?h(AdminShell,{user,onLogout:()=>setUser(null)}):h(Login,{onLogin:setUser})}return h(PublicSite,{path,nav})}

createRoot(document.getElementById('root')).render(h(App));
