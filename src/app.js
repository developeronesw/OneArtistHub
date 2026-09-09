import React, {useEffect,useMemo,useRef,useState,useCallback} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

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
  check:'m5 12 4 4L19 6'
};
function Icon({name,size=20,className=''}){const path=ICONS[name]||ICONS.home;return h('svg',{className:'oah-icon '+className,width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true'},h('path',{d:path}))}
function Button({children,icon,variant='',className='',...props}){return h('button',{className:`btn ${variant} ${className}`.trim(),...props},icon&&h(Icon,{name:icon}),children)}
function IconButton({icon,label,...props}){return h('button',{className:'icon-btn','aria-label':label||icon,title:label||icon,...props},h(Icon,{name:icon}))}
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
  const res=await fetch('/api/'+path,{credentials:'same-origin',headers:{'content-type':'application/json',...(window.__OAH_CSRF?{'x-csrf-token':window.__OAH_CSRF}:{}),...(opts.headers||{})},...opts});
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data.error||data.message||`Request failed (${res.status})`);return data;
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
function Login({onLogin}){const [login,setLogin]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [toast,show]=useToast();async function submit(e){e.preventDefault();setBusy(true);try{const d=await api('auth/login',{method:'POST',body:JSON.stringify({login,password})});window.__OAH_CSRF=d.csrf;onLogin(d.user)}catch(err){show(err.message,true)}finally{setBusy(false)}}return h('div',{className:'auth-page'},h('form',{className:'auth-box card',onSubmit:submit},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo',alt:'OneArtist Hub'}),h('h1',null,'Artist Admin'),h('p',{className:'lead'},'Sign in to manage your music, store and website.'),h('div',{className:'stack'},h(Field,{label:'Username or email'},h(Input,{value:login,onChange:e=>setLogin(e.target.value),required:true,autoComplete:'username'})),h(Field,{label:'Password'},h(Input,{type:'password',value:password,onChange:e=>setPassword(e.target.value),required:true,autoComplete:'current-password'})),h(Button,{type:'submit',variant:'primary',icon:'lock',disabled:busy},busy?'Signing in…':'Sign in'))),h(Toast,{toast}))}

const NAV=[['dashboard','Dashboard','home'],['homepage','Homepage','pages'],['release','Releases','music'],['track','Tracks','music'],['video','Videos','video'],['tour','Tour Dates','calendar'],['product','Store','bag'],['orders','Orders','cart'],['page','Pages','pages'],['media','Media Library','image'],['themes','Themes','palette'],['settings','Settings','settings'],['security','Security','shield']];
function AdminShell({user,onLogout}){
  const [active,setActive]=useState('dashboard'),[menu,setMenu]=useState(false),[search,setSearch]=useState('');const [toast,show]=useToast();
  const select=k=>{setActive(k);setMenu(false)};
  async function logout(){try{await api('auth/logout',{method:'POST'});}catch{}window.__OAH_CSRF='';onLogout()}
  return h('div',{className:'admin-shell'},
    h('aside',{className:'sidebar '+(menu?'open':'')},h('div',{className:'brand'},h('img',{src:'/art/oneartist-logo.svg',alt:'OneArtist Hub'})),h('nav',{className:'nav'},NAV.map(([k,l,i])=>h('button',{key:k,className:active===k?'active':'',onClick:()=>select(k)},h(Icon,{name:i}),h('span',null,l)))),h('div',{className:'side-footer'},h('div',{className:'row'},h('div',{className:'avatar'},user.username.slice(0,1).toUpperCase()),h('div',{style:{minWidth:0}},h('strong',null,user.username),h('div',{className:'small muted'},'Artist Admin'))),h(Button,{icon:'logout',className:'compact',style:{marginTop:12,width:'100%'},onClick:logout},'Sign out'))),
    h('main',{className:'admin-main'},h('header',{className:'topbar'},h(IconButton,{icon:'menu',label:'Open menu',className:'mobile-menu',onClick:()=>setMenu(!menu)}),h('div',{className:'search'},h(Icon,{name:'search'}),h(Input,{value:search,onChange:e=>setSearch(e.target.value),onKeyDown:e=>{if(e.key==='Enter'){const m=NAV.find(([,l])=>l.toLowerCase().includes(search.toLowerCase()));if(m){select(m[0]);setSearch('')}}},placeholder:'Search section or current list…'})),h(IconButton,{icon:'bell',label:'Notifications',onClick:()=>show('No new notifications.')}),h('div',{className:'profile-chip'},h('div',{className:'avatar'},user.username.slice(0,1).toUpperCase()),h('div',{className:'meta'},h('strong',null,user.username),h('div',{className:'small muted'},'Artist Account')))),
      h('div',{className:'admin-content'},h(AdminView,{active,search,select,show})),
      h('nav',{className:'mobile-dock'},[['dashboard','Home','home'],['release','Music','music'],['product','Store','bag'],['orders','Orders','cart'],['settings','More','menu']].map(([k,l,i])=>h('button',{key:k,className:active===k?'active':'',onClick:()=>select(k)},h(Icon,{name:i,size:18}),l)))
    ),h(Toast,{toast}))
}
function AdminView({active,search,select,show}){
  if(active==='dashboard')return h(Dashboard,{select,show});
  if(['release','track','video','tour','product','page','media'].includes(active))return h(ContentManager,{type:active,search,show});
  if(active==='orders')return h(Orders,{show});
  if(active==='themes')return h(Themes,{show});
  if(active==='security')return h(SecurityPanel);
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
function Dashboard({select,show}){
  const [d,setD]=useState(null),[updated,setUpdated]=useState(null);
  const load=useCallback(()=>api('admin/dashboard').then(x=>{setD(x);setUpdated(new Date())}).catch(e=>show(e.message,true)),[show]);
  useEffect(()=>{load();const timer=setInterval(load,30000);return()=>clearInterval(timer)},[load]);
  if(!d)return h('div',{className:'empty'},'Loading Aurora dashboard…');
  const k=d.kpis||{};
  return h(React.Fragment,null,
    h(PageHead,{title:'Dashboard',subtitle:'Aurora Glass Studio — your music business at a glance.',actions:h('div',{className:'row wrap'},h('span',{className:'small muted'},updated?`Updated ${updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:''),h(Button,{icon:'repeat',onClick:load},'Refresh'),h(Button,{variant:'primary',icon:'plus',onClick:()=>select('release')},'New Release'))}),
    h('section',{className:'aurora-hero card'},h('div',{className:'copy'},h('div',{className:'eyebrow'},'Good evening'),h('h2',null,'Welcome Back.'),h('p',{className:'muted'},'Create. Release. Connect. Grow.'),h('div',{className:'row wrap'},h(Button,{variant:'primary',icon:'music',onClick:()=>select('release')},'New Release'),h(Button,{icon:'video',onClick:()=>select('video')},'Upload Video'),h(Button,{icon:'calendar',onClick:()=>select('tour')},'Add Tour Date')))),
    h('div',{className:'kpis'},h(Kpi,{label:'Revenue',value:fmtMoney(k.revenue),icon:'dollar',glow:'#ff55c8'}),h(Kpi,{label:'Orders',value:k.orders||0,icon:'cart',glow:'#9d5cff'}),h(Kpi,{label:'Releases',value:k.releases||0,icon:'music',glow:'#54e9ff'}),h(Kpi,{label:'Verified Plays',value:k.plays||0,icon:'play',glow:'#68f3b0'}),h(Kpi,{label:'Downloads',value:k.downloads||0,icon:'download',glow:'#ff9c55'}),h(Kpi,{label:'Site Views',value:k.views||0,icon:'eye',glow:'#5aa8ff'})),
    h('div',{className:'dashboard-grid'},
      h('div',{className:'card card-pad span2'},h('div',{className:'row between'},h('strong',null,'30-Day Engagement'),h('span',{className:'pill'},'Server verified')),h(TrendChart,{series:d.series||{}})),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Upcoming Tour Dates'),h(Button,{className:'compact',onClick:()=>select('tour')},'View all')),d.tours?.length?d.tours.map(x=>h('div',{className:'list-row',key:x.id},h('div',{className:'pill'},fmtDate(x.sort_date).split(',')[0]),h('div',null,h('strong',null,x.title),h('div',{className:'small muted'},x.data.venue||'')),h(Icon,{name:'calendar'}))):h('div',{className:'empty'},'No upcoming shows')),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Recent Releases'),h(Button,{className:'compact',onClick:()=>select('release')},'Manage')),d.recentReleases?.length?d.recentReleases.map(x=>h('div',{className:'list-row',key:x.id},h('div',{className:'thumb'},h('img',{src:x.data.cover||'/art/neon-skies.svg'})),h('div',null,h('strong',null,x.title),h('div',{className:'small muted'},`${x.data.releaseType||'Release'} · ${fmtDate(x.sort_date)}`)),h(Icon,{name:'music'}))):h('div',{className:'empty'},'No releases')),
      h('div',{className:'card card-pad'},h('div',{className:'row between'},h('strong',null,'Recent Orders'),h(Button,{className:'compact',onClick:()=>select('orders')},'View all')),d.recentOrders?.length?d.recentOrders.map(o=>h('div',{className:'list-row',key:o.public_id},h('div',{className:'avatar'},(o.customer_name||'C').slice(0,1)),h('div',null,h('strong',null,o.customer_name||'Customer'),h('div',{className:'small muted'},new Date(o.created_at).toLocaleString())),h('strong',null,fmtMoney(o.total)))):h('div',{className:'empty'},'No orders yet'))
    )
  )
}

function ContentManager({type,search,show}){const meta=TYPE_META[type], [items,setItems]=useState([]),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false);const load=()=>api('admin/content?type='+type).then(d=>setItems(d.items||[])).catch(e=>show(e.message,true));useEffect(load,[type]);const filtered=items.filter(x=>!search||`${x.title} ${x.slug}`.toLowerCase().includes(search.toLowerCase()));async function remove(x){if(!confirm(`Delete “${x.title}”?`))return;try{await api('admin/content/'+x.id,{method:'DELETE'});show('Deleted.');load()}catch(e){show(e.message,true)}}return h(React.Fragment,null,h(PageHead,{title:meta.label,subtitle:'Manage '+meta.label.toLowerCase()+' without touching code.',actions:h(Button,{variant:'primary',icon:'plus',onClick:()=>setEditing(blankFor(type))},'Add '+meta.label.replace(/s$/,''))}),editing&&h(ContentEditor,{item:editing,type,onClose:()=>setEditing(null),onSaved:()=>{setEditing(null);load();show('Saved successfully.')}}),h('div',{className:'card table-wrap'},filtered.length?h('table',{className:'table'},h('thead',null,h('tr',null,h('th',null,'Title'),h('th',null,'Status'),h('th',null,'Date'),h('th',null,'Featured'),h('th',null,'Actions'))),h('tbody',null,filtered.map(x=>h('tr',{key:x.id},h('td',null,h('strong',null,x.title),h('div',{className:'small muted'},x.slug||'')),h('td',null,h('span',{className:'pill'},x.status)),h('td',null,fmtDate(x.sort_date)),h('td',null,x.featured?'Yes':'—'),h('td',null,h('div',{className:'row'},h(IconButton,{icon:'edit',label:'Edit',onClick:()=>setEditing({...x,sortDate:x.sort_date})}),h(IconButton,{icon:'trash',label:'Delete',onClick:()=>remove(x)}))))))):h('div',{className:'empty'},`No ${meta.label.toLowerCase()} yet.`))) }
function ContentEditor({item,type,onClose,onSaved}){
  const [form,setForm]=useState(JSON.parse(JSON.stringify(item)));
  const [busy,setBusy]=useState(false);
  const [toast,show]=useToast();
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setData=(k,v)=>setForm(f=>({...f,data:{...(f.data||{}),[k]:v}}));
  async function save(e){
    e.preventDefault(); setBusy(true);
    try{
      const payload={...form,sortDate:form.sortDate||form.sort_date||'',slug:form.slug||'',featured:!!form.featured};
      if(form.id) await api('admin/content/'+form.id,{method:'PUT',body:JSON.stringify(payload)});
      else await api('admin/content',{method:'POST',body:JSON.stringify(payload)});
      onSaved();
    }catch(err){show(err.message,true)} finally{setBusy(false)}
  }
  const head=h('div',{className:'modal-head'},
    h('strong',null,(form.id?'Edit ':'New ')+TYPE_META[type].label.replace(/s$/,'')),
    h(IconButton,{type:'button',icon:'close',onClick:onClose})
  );
  const basic=h('div',{className:'grid2'},
    h(Field,{label:'Title'},h(Input,{required:true,value:form.title,onChange:e=>set('title',e.target.value)})),
    h(Field,{label:'Slug'},h(Input,{value:form.slug||'',onChange:e=>set('slug',e.target.value),placeholder:'auto-from-title'}))
  );
  const meta=h('div',{className:'grid3'},
    h(Field,{label:'Status'},h(Select,{value:form.status,onChange:e=>set('status',e.target.value)},h('option',{value:'published'},'Published'),h('option',{value:'draft'},'Draft'))),
    h(Field,{label:'Date'},h(Input,{type:'date',value:(form.sortDate||form.sort_date||'').slice(0,10),onChange:e=>set('sortDate',e.target.value)})),
    h(Field,{label:'Homepage'},h('label',{className:'row',style:{minHeight:44}},h('input',{type:'checkbox',checked:!!form.featured,onChange:e=>set('featured',e.target.checked)}),'Featured'))
  );
  const foot=h('div',{className:'row between wrap'},
    h('span',{className:'small muted'},type==='page'?'HTML is sanitized server-side; scripts and event handlers are removed.':'Changes publish through the secure API.'),
    h('div',{className:'row'},h(Button,{type:'button',onClick:onClose},'Cancel'),h(Button,{type:'submit',variant:'primary',icon:'save',disabled:busy},busy?'Saving…':'Save'))
  );
  return h('div',{className:'modal-backdrop'},
    h('form',{className:'modal',onSubmit:save},
      head,
      h('div',{className:'modal-body content-form'},basic,meta,h(TypeFields,{type,data:form.data||{},setData}),foot)
    ),
    h(Toast,{toast})
  );
}
function TypeFields({type,data,setData}){if(type==='release')return h(React.Fragment,null,h('div',{className:'grid2'},h(Field,{label:'Release type'},h(Select,{value:data.releaseType||'Album',onChange:e=>setData('releaseType',e.target.value)},['Album','EP','Single','Mixtape','Compilation'].map(v=>h('option',{key:v},v)))),h(Field,{label:'Price'},h(Input,{type:'number',min:0,step:'.01',value:data.price??'',onChange:e=>setData('price',e.target.value)}))),h(Field,{label:'Cover image URL'},h(Input,{value:data.cover||'',onChange:e=>setData('cover',e.target.value),placeholder:'/art/neon-skies.svg or https://…'})),h(Field,{label:'Description'},h(Textarea,{value:data.description||'',onChange:e=>setData('description',e.target.value)})));
if(type==='track')return h(React.Fragment,null,h('div',{className:'grid2'},h(Field,{label:'Release ID'},h(Input,{value:data.releaseId||'',onChange:e=>setData('releaseId',e.target.value),placeholder:'rel-…'})),h(Field,{label:'Track number'},h(Input,{type:'number',min:1,value:data.trackNo||1,onChange:e=>setData('trackNo',Number(e.target.value))}))),h(Field,{label:'Preview audio URL'},h(Input,{required:true,value:data.audio||'',onChange:e=>setData('audio',e.target.value),placeholder:'/demo/higher-ground.wav or media URL'})),h('div',{className:'grid2'},h(Field,{label:'Cover URL'},h(Input,{value:data.cover||'',onChange:e=>setData('cover',e.target.value)})),h(Field,{label:'Duration seconds'},h(Input,{type:'number',value:data.duration||'',onChange:e=>setData('duration',Number(e.target.value))}))));
if(type==='video')return h(React.Fragment,null,h(Field,{label:'YouTube URL'},h(Input,{required:true,value:data.youtubeUrl||'',onChange:e=>setData('youtubeUrl',e.target.value),placeholder:'https://youtube.com/watch?v=…'})),data.youtubeId&&h('div',{className:'ratio'},h('img',{src:`https://img.youtube.com/vi/${data.youtubeId}/hqdefault.jpg`,style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}})),h(Field,{label:'Description'},h(Textarea,{value:data.description||'',onChange:e=>setData('description',e.target.value)})));
if(type==='tour')return h(React.Fragment,null,h('div',{className:'grid2'},h(Field,{label:'Venue'},h(Input,{value:data.venue||'',onChange:e=>setData('venue',e.target.value)})),h(Field,{label:'Ticket URL'},h(Input,{value:data.ticketUrl||'',onChange:e=>setData('ticketUrl',e.target.value)}))),h(Field,{label:'Show status'},h(Select,{value:data.status||'Tickets Available',onChange:e=>setData('status',e.target.value)},['Tickets Available','Sold Out','Cancelled','Private'].map(v=>h('option',{key:v},v)))));
if(type==='product')return h(React.Fragment,null,h('div',{className:'grid3'},h(Field,{label:'Price'},h(Input,{type:'number',min:0,step:'.01',value:data.price??'',onChange:e=>setData('price',e.target.value)})),h(Field,{label:'Product type'},h(Select,{value:data.kind||'physical',onChange:e=>setData('kind',e.target.value)},h('option',{value:'physical'},'Physical merch'),h('option',{value:'digital'},'Digital download'))),h(Field,{label:'Inventory'},h(Input,{type:'number',min:0,value:data.inventory??'',onChange:e=>setData('inventory',e.target.value)}))),h(Field,{label:'Product image URL'},h(Input,{value:data.image||'',onChange:e=>setData('image',e.target.value)})),data.kind==='digital'&&h(Field,{label:'Dropbox file path (private)'},h(Input,{value:data.dropboxPath||'',onChange:e=>setData('dropboxPath',e.target.value),placeholder:'/OneArtist/downloads/album.zip'})),h(Field,{label:'Description'},h(Textarea,{value:data.description||'',onChange:e=>setData('description',e.target.value)})));
if(type==='page')return h(React.Fragment,null,h('label',{className:'row small'},h('input',{type:'checkbox',checked:!!data.showInNav,onChange:e=>setData('showInNav',e.target.checked)}),'Show page in main navigation'),h(Field,{label:'HTML editor'},h(Textarea,{className:'textarea code-editor',value:data.html||'',onChange:e=>setData('html',e.target.value),spellCheck:false})));
if(type==='media')return h(React.Fragment,null,h(Field,{label:'Media URL'},h(Input,{required:true,value:data.url||'',onChange:e=>setData('url',e.target.value)})),h(Field,{label:'Alt text / description'},h(Input,{value:data.alt||'',onChange:e=>setData('alt',e.target.value)})));
return null}

function Orders({show}){
  const [orders,setOrders]=useState([]),[selected,setSelected]=useState(null),[edit,setEdit]=useState({fulfillmentStatus:'unfulfilled',trackingCarrier:'',trackingNumber:''});
  const load=()=>api('admin/orders').then(d=>setOrders(d.orders||[])).catch(e=>show(e.message,true));
  useEffect(()=>{load()},[]);
  function choose(o){setSelected(o);setEdit({fulfillmentStatus:o.fulfillment_status||'unfulfilled',trackingCarrier:o.tracking_carrier||'',trackingNumber:o.tracking_number||''})}
  async function save(){try{await api('admin/orders/'+selected.id,{method:'PUT',body:JSON.stringify(edit)});show('Fulfillment updated.');await load();setSelected(null)}catch(e){show(e.message,true)}}
  const rows=orders.map(o=>h('tr',{key:o.id},
    h('td',null,h('a',{href:'/order/'+o.public_id,target:'_blank',rel:'noopener'},o.public_id.slice(0,10)+'…')),
    h('td',null,o.customer_name||o.customer_email),
    h('td',null,fmtMoney(o.total,o.currency)),
    h('td',null,h('span',{className:'pill success'},o.status)),
    h('td',null,h('span',{className:'pill'},o.fulfillment_status||'unfulfilled')),
    h('td',null,new Date(o.created_at).toLocaleString()),
    h('td',null,h(Button,{className:'compact',icon:'edit',onClick:()=>choose(o)},'Manage'))
  ));
  const table=orders.length?h('table',{className:'table'},
    h('thead',null,h('tr',null,['Order','Customer','Total','Payment','Fulfillment','Date',''].map((x,i)=>h('th',{key:i},x)))),
    h('tbody',null,rows)
  ):h('div',{className:'empty'},'Orders will appear here after PayPal purchases.');
  let detail=null;
  if(selected){
    const addr=selected.shipping?.address||{}, shipName=selected.shipping?.name?.full_name||selected.customer_name||'';
    const address=selected.shipping&&Object.keys(selected.shipping).length?h('address',{className:'shipping-address'},
      shipName,h('br'),addr.address_line_1||'',addr.address_line_2&&h(React.Fragment,null,h('br'),addr.address_line_2),h('br'),[addr.admin_area_2,addr.admin_area_1,addr.postal_code].filter(Boolean).join(', '),h('br'),addr.country_code||''
    ):h('p',{className:'muted'},'No physical shipping address on this order.');
    detail=h('section',{className:'card form-card order-detail'},
      h('div',{className:'row between wrap'},h('div',null,h('h3',null,'Fulfillment — ',selected.public_id.slice(0,12),'…'),h('p',{className:'small muted'},selected.customer_email)),h(IconButton,{icon:'close',label:'Close order',onClick:()=>setSelected(null)})),
      h('div',{className:'grid2'},
        h('div',null,h('h4',null,'Shipping Address'),address),
        h('div',{className:'stack'},
          h(Field,{label:'Fulfillment status'},h(Select,{value:edit.fulfillmentStatus,onChange:e=>setEdit({...edit,fulfillmentStatus:e.target.value})},['unfulfilled','processing','shipped','delivered','not_required'].map(v=>h('option',{key:v,value:v},v.replace('_',' '))))),
          h(Field,{label:'Carrier'},h(Input,{value:edit.trackingCarrier,onChange:e=>setEdit({...edit,trackingCarrier:e.target.value}),placeholder:'USPS, UPS, FedEx…'})),
          h(Field,{label:'Tracking number'},h(Input,{value:edit.trackingNumber,onChange:e=>setEdit({...edit,trackingNumber:e.target.value})})),
          h(Button,{variant:'primary',icon:'save',onClick:save},'Save Fulfillment')
        )
      )
    );
  }
  return h(React.Fragment,null,
    h(PageHead,{title:'Orders',subtitle:'PayPal orders, receipts and physical-fulfillment controls.',actions:h(Button,{icon:'repeat',onClick:load},'Refresh')}),
    h('div',{className:'card table-wrap'},table),detail
  );
}

function Settings({show,focus}){const [settings,setSettings]=useState(null),[ints,setInts]=useState([]),[paypal,setPaypal]=useState({clientId:'',clientSecret:'',environment:'sandbox'}),[dropbox,setDropbox]=useState({accessToken:''});useEffect(()=>{Promise.all([api('admin/settings'),api('admin/integrations')]).then(([s,i])=>{setSettings(s.settings);setInts(i.integrations||[])}).catch(e=>show(e.message,true))},[]);if(!settings)return h('div',{className:'empty'},'Loading settings…');const artist=settings.artist||{},site=settings.site||{},commerce=settings.commerce||{};const update=(group,key,val)=>setSettings(s=>({...s,[group]:{...(s[group]||{}),[key]:val}}));async function save(){try{const d=await api('admin/settings',{method:'PUT',body:JSON.stringify({settings:{artist:settings.artist,site:settings.site,commerce:settings.commerce,socials:settings.socials}})});setSettings(d.settings);show('Settings saved.')}catch(e){show(e.message,true)}}async function saveInt(provider,obj){try{await api('admin/integrations',{method:'POST',body:JSON.stringify({provider,...obj})});show(provider+' connected securely.');const i=await api('admin/integrations');setInts(i.integrations||[])}catch(e){show(e.message,true)}}return h(React.Fragment,null,h(PageHead,{title:focus==='homepage'?'Homepage & Artist':'Settings',subtitle:'Brand, hero, commerce and secure integrations.',actions:h(Button,{variant:'primary',icon:'save',onClick:save},'Save Settings')}),h('div',{className:'stack'},h('section',{className:'card form-card'},h('h3',null,'Artist Profile'),h('div',{className:'grid2'},h(Field,{label:'Artist / stage name'},h(Input,{value:artist.name||'',onChange:e=>update('artist','name',e.target.value)})),h(Field,{label:'Genre'},h(Input,{value:artist.genre||'',onChange:e=>update('artist','genre',e.target.value)})),h(Field,{label:'Location'},h(Input,{value:artist.location||'',onChange:e=>update('artist','location',e.target.value)})),h(Field,{label:'Profile image URL'},h(Input,{value:artist.profileImage||'',onChange:e=>update('artist','profileImage',e.target.value)}))),h(Field,{label:'Biography'},h(Textarea,{value:artist.bio||'',onChange:e=>update('artist','bio',e.target.value)}))),h('section',{className:'card form-card'},h('h3',null,'Homepage Hero'),h('div',{className:'grid2'},h(Field,{label:'Site title'},h(Input,{value:site.title||'',onChange:e=>update('site','title',e.target.value)})),h(Field,{label:'Artist logo SVG URL'},h(Input,{value:site.logoUrl||'',onChange:e=>update('site','logoUrl',e.target.value),placeholder:'/images/artist-logo.svg'})),h(Field,{label:'Accent color'},h(Input,{type:'color',value:site.accent||'#b45cff',onChange:e=>update('site','accent',e.target.value)})),h(Field,{label:'Hero headline'},h(Input,{value:site.heroTitle||'',onChange:e=>update('site','heroTitle',e.target.value)})),h(Field,{label:'Hero image URL'},h(Input,{value:site.heroImage||'',onChange:e=>update('site','heroImage',e.target.value)}))),h(Field,{label:'Hero subtitle'},h(Textarea,{value:site.heroSubtitle||'',onChange:e=>update('site','heroSubtitle',e.target.value)}))),h('section',{className:'card form-card'},h('h3',null,'Commerce'),h('div',{className:'grid3'},h(Field,{label:'Currency'},h(Input,{value:commerce.currency||'USD',onChange:e=>update('commerce','currency',e.target.value.toUpperCase().slice(0,3))})),h(Field,{label:'Flat physical shipping'},h(Input,{type:'number',step:'.01',min:0,value:commerce.flatShipping??0,onChange:e=>update('commerce','flatShipping',Number(e.target.value))})),h(Field,{label:'Digital download limit'},h(Input,{type:'number',min:1,max:50,value:commerce.downloadsMax??5,onChange:e=>update('commerce','downloadsMax',Number(e.target.value))})))),h('section',{className:'card form-card'},h('div',{className:'row between'},h('h3',null,'PayPal'),ints.some(x=>x.provider==='paypal')&&h('span',{className:'pill success'},'Configured')),h('p',{className:'small muted'},'The Client ID is public-capable; the Client Secret is encrypted before storage and never returned.'),h('div',{className:'grid2'},h(Field,{label:'PayPal Client ID'},h(Input,{value:paypal.clientId,onChange:e=>setPaypal({...paypal,clientId:e.target.value})})),h(Field,{label:'Environment'},h(Select,{value:paypal.environment,onChange:e=>setPaypal({...paypal,environment:e.target.value})},h('option',{value:'sandbox'},'Sandbox / Testing'),h('option',{value:'live'},'Live')))),h(Field,{label:'PayPal Client Secret'},h(Input,{type:'password',value:paypal.clientSecret,onChange:e=>setPaypal({...paypal,clientSecret:e.target.value}),placeholder:'Never stored in GitHub'})),h(Button,{icon:'lock',onClick:()=>saveInt('paypal',paypal)},'Save PayPal Securely')),h('section',{className:'card form-card'},h('div',{className:'row between'},h('h3',null,'Dropbox Digital Delivery'),ints.some(x=>x.provider==='dropbox')&&h('span',{className:'pill success'},'Configured')),h(Field,{label:'Dropbox access token'},h(Input,{type:'password',value:dropbox.accessToken,onChange:e=>setDropbox({accessToken:e.target.value}),placeholder:'Encrypted in D1'})),h(Button,{icon:'lock',onClick:()=>saveInt('dropbox',dropbox)},'Save Dropbox Securely')))) }
function SecurityPanel(){return h(React.Fragment,null,h(PageHead,{title:'Security',subtitle:'OneArtist Hub FOUNDATION security controls.'}),h('div',{className:'grid2'},[['shield','Secure Admin Sessions','HttpOnly, Secure, SameSite=Lax session cookies.'],['lock','Password Protection','PBKDF2-SHA256 with unique salts and 210,000 iterations.'],['check','CSRF Protection','All authenticated writes require a session-bound CSRF token.'],['lock','Encrypted Secrets','PayPal and Dropbox credentials use AES-GCM before D1 storage.'],['shield','Setup Lock','The setup route locks after the first successful installation.'],['pages','Sanitized Custom HTML','Scripts, iframes, inline event handlers and javascript: URLs are stripped.']].map(([i,t,d])=>h('div',{className:'card card-pad',key:t},h('div',{className:'row'},h(Icon,{name:i}),h('strong',null,t)),h('p',{className:'muted'},d))))) }

function Player({tracks,current,setCurrent}){const audio=useRef(null),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[volume,setVolume]=useState(.85),counted=useRef(new Set());const track=tracks[current]||null;useEffect(()=>{if(!audio.current)return;audio.current.volume=volume},[volume]);useEffect(()=>{if(!track||!audio.current)return;audio.current.src=track.data.audio||'';audio.current.load();setTime(0);setPlaying(false)},[track?.id]);function toggle(){if(!audio.current||!track)return;if(audio.current.paused){audio.current.play().then(()=>setPlaying(true)).catch(()=>{})}else{audio.current.pause();setPlaying(false)}}function next(){if(tracks.length)setCurrent((current+1)%tracks.length)}function prev(){if(tracks.length)setCurrent((current-1+tracks.length)%tracks.length)}function tick(){const a=audio.current;if(!a)return;setTime(a.currentTime||0);setDuration(a.duration||Number(track?.data.duration)||0);if(track&&a.currentTime>=10&&!counted.current.has(track.id)){counted.current.add(track.id);api('analytics',{method:'POST',body:JSON.stringify({event:'play',objectType:'track',objectId:track.id})}).catch(()=>{})}}if(!track)return null;return h('div',{className:'player'},h('audio',{ref:audio,onTimeUpdate:tick,onEnded:next,onPlay:()=>setPlaying(true),onPause:()=>setPlaying(false)}),h('div',{className:'player-track'},h('img',{src:track.data.cover||'/art/neon-skies.svg',alt:''}),h('div',{style:{minWidth:0}},h('div',{className:'title'},track.title),h('div',{className:'artist small muted'},'Now Playing'))),h('div',{className:'player-center'},h('div',{className:'controls'},h(IconButton,{icon:'shuffle',className:'secondary'}),h(IconButton,{icon:'prev',onClick:prev}),h(IconButton,{icon:playing?'pause':'play',onClick:toggle,label:playing?'Pause':'Play'}),h(IconButton,{icon:'next',onClick:next}),h(IconButton,{icon:'repeat',className:'secondary'})),h('div',{className:'progress'},h('span',null,clock(time)),h('input',{type:'range',min:0,max:duration||1,step:.1,value:Math.min(time,duration||1),onChange:e=>{const v=Number(e.target.value);audio.current.currentTime=v;setTime(v)}}),h('span',null,clock(duration)))),h('div',{className:'volume'},h(Icon,{name:'volume'}),h('input',{type:'range',min:0,max:1,step:.01,value:volume,onChange:e=>setVolume(Number(e.target.value))}))) }
const clock=s=>{if(!Number.isFinite(s))return'0:00';const m=Math.floor(s/60),x=Math.floor(s%60);return `${m}:${String(x).padStart(2,'0')}`};
function PublicSite({path,nav}){
  const [data,setData]=useState(null),[video,setVideo]=useState(null),[current,setCurrent]=useState(0),[cart,setCart]=useState(()=>{try{return JSON.parse(localStorage.oah_cart||'[]')}catch{return[]}}),[cartOpen,setCartOpen]=useState(false),[mobileNav,setMobileNav]=useState(false);
  const [toast,show]=useToast();
  useEffect(()=>{api('public/bootstrap').then(setData).catch(e=>show(e.message,true))},[]);
  useEffect(()=>{api('analytics',{method:'POST',body:JSON.stringify({event:'site_view',objectType:'page',objectId:location.pathname})}).catch(()=>{})},[path]);
  useEffect(()=>{localStorage.oah_cart=JSON.stringify(cart)},[cart]);
  if(!data)return h('div',{className:'auth-page'},h('div',{className:'auth-box card'},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo'}),h('p',{className:'lead'},'Loading artist website…')),h(Toast,{toast}));
  const s=data.settings||{},content=data.content||[],artist=s.artist||{},site=s.site||{},theme=site.publicTheme||'midnight',tracks=content.filter(x=>x.type==='track'),releases=content.filter(x=>x.type==='release').slice(0,3),videos=content.filter(x=>x.type==='video').slice(0,3),tours=content.filter(x=>x.type==='tour'&&(!x.sort_date||x.sort_date>=new Date().toISOString().slice(0,10))).slice(0,3),products=content.filter(x=>x.type==='product').slice(0,4),pages=content.filter(x=>x.type==='page'&&x.data.showInNav),route=location.pathname,custom=route.startsWith('/page/')?content.find(x=>x.type==='page'&&x.slug===route.split('/').pop()):null;
  const go=to=>{nav(to);setMobileNav(false)};
  const links=[['/music','Music'],['/videos','Videos'],['/tour','Tour'],['/shop','Shop'],...pages.map(p=>['/page/'+p.slug,p.title])];
  function addCart(p){setCart(c=>{const found=c.find(x=>x.id===p.id);return found?c.map(x=>x.id===p.id?{...x,qty:Math.min(20,x.qty+1)}:x):[...c,{id:p.id,title:p.title,price:Math.max(0,Number(p.data.price)||0),qty:1,image:p.data.image||''}]});show('Added to cart.')}
  function openVideo(v){setVideo(v);api('analytics',{method:'POST',body:JSON.stringify({event:'video_view',objectType:'video',objectId:v.id})}).catch(()=>{})}
  function playTrackByRelease(rel){const i=tracks.findIndex(t=>t.data.releaseId===rel.id);if(i>=0)setCurrent(i)}
  const brand=site.logoUrl?h('img',{src:site.logoUrl,alt:artist.name||site.title||'Artist',className:'public-artist-logo'}):h('span',{className:'public-artist-brand'},site.title||artist.name||'Artist');
  return h('div',{className:'public '+theme},
    h('header',{className:'public-nav'},h('a',{href:'/',className:'public-brand-link',onClick:e=>{e.preventDefault();go('/')}},brand),h('nav',{className:'public-links'},links.map(([to,label])=>h('a',{key:to,href:to,onClick:e=>{e.preventDefault();go(to)}},label))),h(IconButton,{icon:mobileNav?'close':'menu',label:'Toggle navigation',className:'mobile-public-menu',onClick:()=>setMobileNav(v=>!v)})),
    mobileNav&&h('nav',{className:'mobile-public-panel'},links.map(([to,label])=>h('a',{key:to,href:to,onClick:e=>{e.preventDefault();go(to)}},label))),
    custom?h(CustomPage,{page:custom}):route==='/music'?h(MusicPage,{releases,tracks,setCurrent}):route==='/videos'?h(VideosPage,{videos,openVideo}):route==='/tour'?h(TourPage,{tours}):route==='/shop'?h(ShopPage,{products,addCart}):h(HomePage,{site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease}),
    h('button',{className:'cart-fab',onClick:()=>setCartOpen(true),'aria-label':'Open cart'},h(Icon,{name:'cart'}),cart.reduce((n,x)=>n+x.qty,0)>0&&h('span',{className:'cart-count'},cart.reduce((n,x)=>n+x.qty,0))),
    tracks.length>0&&h(Player,{tracks,current,setCurrent}),video&&h(VideoModal,{video,onClose:()=>setVideo(null)}),cartOpen&&h(CartModal,{cart,setCart,onClose:()=>setCartOpen(false),show}),h(Toast,{toast})
  )
}

function HomePage({site,artist,releases,videos,tours,products,openVideo,addCart,playTrackByRelease}){return h(React.Fragment,null,h('section',{className:'public-hero',style:{backgroundImage:`linear-gradient(90deg,rgba(2,3,8,.9),rgba(2,3,8,.25)),url('${site.heroImage||'/art/hero-aurora.svg'}')`}},h('div',{className:'hero-copy'},h('div',{className:'pill'},artist.genre||'Independent Artist'),h('h1',null,site.heroTitle||artist.name||'OneArtist Hub'),h('p',null,site.heroSubtitle||artist.bio||''),h('div',{className:'row wrap'},h(Button,{variant:'primary',icon:'play',onClick:()=>releases[0]&&playTrackByRelease(releases[0])},'Listen Now'),h('a',{className:'btn',href:'#releases'},'Explore Releases')))),h(ReleaseSection,{releases,onPlay:playTrackByRelease}),h(VideoSection,{videos,onOpen:openVideo}),h(ProductSection,{products,onAdd:addCart}),h(TourSection,{tours}))}
function ReleaseSection({releases,onPlay}){return h('section',{className:'public-section',id:'releases'},h('div',{className:'section-title'},h('h2',null,'Latest Releases'),h('span',{className:'muted'},'Albums · EPs · Singles')),releases.length?h('div',{className:'release-grid'},releases.map(r=>h('article',{className:'release-card card',key:r.id,onClick:()=>onPlay(r)},h('div',{className:'cover'},h('img',{src:r.data.cover||'/art/neon-skies.svg',alt:r.title})),h('div',{className:'card-copy'},h('div',{className:'small muted'},r.data.releaseType||'Release'),h('h3',null,r.title),h('div',{className:'row between'},h('span',{className:'small'},fmtDate(r.sort_date)),h(Icon,{name:'play'})))))):h('div',{className:'empty'},'No releases yet.'))}
function VideoSection({videos,onOpen}){return h('section',{className:'public-section'},h('div',{className:'section-title'},h('h2',null,'Videos'),h('span',{className:'muted'},'Watch without leaving the site')),videos.length?h('div',{className:'video-grid'},videos.map(v=>h('article',{className:'video-card card',key:v.id,onClick:()=>onOpen(v)},h('div',{className:'cover'},h('img',{src:v.data.youtubeId?`https://img.youtube.com/vi/${v.data.youtubeId}/hqdefault.jpg`:'/art/hero-aurora.svg',alt:v.title})),h('div',{className:'card-copy'},h('h3',null,v.title),h('div',{className:'row'},h(Icon,{name:'play'}),h('span',{className:'small muted'},'Play Video')))))):h('div',{className:'empty'},'No videos yet.'))}
function ProductSection({products,onAdd}){return h('section',{className:'public-section'},h('div',{className:'section-title'},h('h2',null,'Merch & Downloads'),h('span',{className:'muted'},'Official store')),products.length?h('div',{className:'product-grid'},products.map(p=>h('article',{className:'product-card card',key:p.id},h('div',{className:'cover'},h('img',{src:p.data.image||'/art/hoodie.svg',alt:p.title})),h('div',{className:'card-copy'},h('div',{className:'row between'},h('h3',null,p.title),h('strong',null,fmtMoney(p.data.price))),h(Button,{variant:'primary',icon:'cart',onClick:()=>onAdd(p)},'Add to Cart'))))):h('div',{className:'empty'},'No products yet.'))}
function TourSection({tours}){return h('section',{className:'public-section'},h('div',{className:'section-title'},h('h2',null,'Upcoming Tour Dates'),h('span',{className:'muted'},'See you on the road')),h('div',{className:'tour-list'},tours.length?tours.map(t=>h('div',{className:'tour-row',key:t.id},h('strong',null,fmtDate(t.sort_date)),h('div',null,h('strong',null,t.title),h('div',{className:'small muted'},t.data.venue||'')),t.data.ticketUrl&&h('a',{className:'btn',href:t.data.ticketUrl,target:'_blank',rel:'noopener'},'Tickets'))):h('div',{className:'empty'},'No upcoming shows.'))) }
function MusicPage({releases,tracks,setCurrent}){return h(React.Fragment,null,h('section',{className:'public-section'},h(PageHead,{title:'Music',subtitle:'Stream previews and explore the latest releases.'}),h('div',{className:'release-grid'},releases.map(r=>h('article',{className:'release-card card',key:r.id},h('div',{className:'cover'},h('img',{src:r.data.cover||'/art/neon-skies.svg'})),h('div',{className:'card-copy'},h('h3',null,r.title),h('p',{className:'small muted'},r.data.description||''),h(Button,{icon:'play',variant:'primary',onClick:()=>{const i=tracks.findIndex(t=>t.data.releaseId===r.id);if(i>=0)setCurrent(i)}},'Play')))))))}
function VideosPage({videos,openVideo}){return h('section',{className:'public-section'},h(PageHead,{title:'Videos',subtitle:'Official YouTube videos open in a responsive modal.'}),h(VideoSection,{videos,onOpen:openVideo}))}
function TourPage({tours}){return h('section',{className:'public-section'},h(PageHead,{title:'Tour',subtitle:'Upcoming live dates.'}),h(TourSection,{tours}))}
function ShopPage({products,addCart}){return h('section',{className:'public-section'},h(PageHead,{title:'Shop',subtitle:'Music downloads and official merchandise.'}),h(ProductSection,{products,onAdd:addCart}))}
function CustomPage({page}){return h('section',{className:'public-section'},h(PageHead,{title:page.title}),h('div',{className:'card card-pad',dangerouslySetInnerHTML:{__html:page.data.html||''}}))}
function VideoModal({video,onClose}){return h('div',{className:'modal-backdrop',onClick:e=>{if(e.target===e.currentTarget)onClose()}},h('div',{className:'modal'},h('div',{className:'modal-head'},h('strong',null,video.title),h(IconButton,{icon:'close',onClick:onClose})),h('div',{className:'modal-body'},h('div',{className:'ratio'},h('iframe',{src:`https://www.youtube-nocookie.com/embed/${video.data.youtubeId}?autoplay=1&rel=0`,allow:'autoplay; encrypted-media; picture-in-picture',allowFullScreen:true,title:video.title})),video.data.description&&h('p',{className:'muted'},video.data.description))))}
function CartModal({cart,setCart,onClose,show}){const [paypalReady,setPaypalReady]=useState(false);const cartRef=useRef(cart);const total=cart.reduce((n,x)=>n+x.price*x.qty,0);useEffect(()=>{cartRef.current=cart},[cart]);useEffect(()=>{if(!cart.length)return;api('paypal/config').then(cfg=>{if(!cfg.configured)return;const load=()=>{if(window.paypal){setPaypalReady(true);renderButtons();return}const existing=document.querySelector('script[data-oah-paypal-sdk]');if(existing){existing.addEventListener('load',()=>{setPaypalReady(true);renderButtons()},{once:true});return}const s=document.createElement('script');s.dataset.oahPaypalSdk='1';s.src=`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(cfg.clientId)}&currency=${encodeURIComponent(cfg.currency||'USD')}&intent=capture`;s.onload=()=>{setPaypalReady(true);renderButtons()};document.head.appendChild(s)};load();function renderButtons(){setTimeout(()=>{const el=document.getElementById('oah-paypal-buttons');if(!el||el.dataset.ready||!window.paypal)return;el.dataset.ready='1';window.paypal.Buttons({createOrder:()=>api('paypal/create-order',{method:'POST',body:JSON.stringify({cart:cartRef.current})}).then(d=>d.paypalOrderId),onApprove:data=>api('paypal/capture',{method:'POST',body:JSON.stringify({paypalOrderId:data.orderID})}).then(d=>{setCart([]);onClose();location.href='/order/'+d.order.publicId}),onError:err=>show('PayPal checkout failed: '+(err.message||err),true)}).render('#oah-paypal-buttons')},100)}}).catch(()=>{})},[cart.length]);return h('div',{className:'modal-backdrop'},h('div',{className:'modal'},h('div',{className:'modal-head'},h('strong',null,'Your Cart'),h(IconButton,{icon:'close',onClick:onClose})),h('div',{className:'modal-body stack'},cart.length?cart.map(x=>h('div',{className:'list-row',key:x.id},h('div',{className:'thumb'},h('img',{src:x.image||'/art/hoodie.svg'})),h('div',null,h('strong',null,x.title),h('div',{className:'small muted'},`Qty ${x.qty}`)),h('div',{className:'row'},h('strong',null,fmtMoney(x.price*x.qty)),h(IconButton,{icon:'trash',onClick:()=>setCart(cart.filter(y=>y.id!==x.id))})))):h('div',{className:'empty'},'Your cart is empty.'),cart.length>0&&h(React.Fragment,null,h('div',{className:'row between'},h('strong',null,'Subtotal'),h('strong',null,fmtMoney(total))),h('div',{id:'oah-paypal-buttons'}),!paypalReady&&h('p',{className:'small muted'},'PayPal buttons appear here after PayPal is configured in OneArtist Hub Settings. Physical shipping is added server-side.'))))) }
function Receipt({publicId,nav}){
  const [order,setOrder]=useState(null),[err,setErr]=useState(''),[msg,setMsg]=useState('');
  useEffect(()=>{api('order/'+publicId).then(d=>setOrder(d.order)).catch(e=>setErr(e.message))},[publicId]);
  async function download(item){
    setMsg('Authorizing download…');
    try{
      const d=await api('downloads/request',{method:'POST',body:JSON.stringify({publicId,email:order.customer_email,productId:item.product_id})});
      setMsg('Download authorized.'); location.href=d.url;
    }catch(e){setMsg(e.message)}
  }
  if(err)return h('div',{className:'auth-page'},h('div',{className:'auth-box card'},h('h1',null,'Receipt unavailable'),h('p',null,err)));
  if(!order)return h('div',{className:'auth-page'},'Loading receipt…');
  return h('div',{className:'receipt'},
    h('img',{src:'/art/oneartist-logo.svg',style:{width:220,filter:'invert(1)'}}),
    h('div',{className:'row between wrap'},h('div',null,h('h1',null,'Purchase Receipt'),h('div',null,'Order: ',h('span',{className:'mono'},order.public_id))),h('div',null,h('strong',null,order.status.toUpperCase()),h('div',null,new Date(order.created_at).toLocaleString()))),
    h('hr'),h('p',null,h('strong',null,'Customer: '),order.customer_name||order.customer_email),
    h('table',null,
      h('thead',null,h('tr',null,h('th',null,'Item'),h('th',null,'Qty'),h('th',null,'Price'),h('th',{className:'no-print'},'Delivery'))),
      h('tbody',null,order.items.map(i=>h('tr',{key:i.product_id},h('td',null,i.title),h('td',null,i.quantity),h('td',null,fmtMoney(i.unit_price*i.quantity,order.currency)),h('td',{className:'no-print'},i.kind==='digital'?h(Button,{className:'compact',icon:'download',onClick:()=>download(i)},'Download'):'Physical item')))),
      h('tfoot',null,h('tr',null,h('td',{colSpan:2},'Subtotal'),h('td',null,fmtMoney(order.subtotal,order.currency)),h('td',{className:'no-print'})),h('tr',null,h('td',{colSpan:2},'Shipping'),h('td',null,fmtMoney(order.shipping,order.currency)),h('td',{className:'no-print'})),h('tr',null,h('td',{colSpan:2},h('strong',null,'Total')),h('td',null,h('strong',null,fmtMoney(order.total,order.currency))),h('td',{className:'no-print'})))
    ),
    order.fulfillment_status&&order.fulfillment_status!=='not_required'&&h('p',null,h('strong',null,'Fulfillment: '),order.fulfillment_status,order.tracking_number?` · ${order.tracking_carrier||'Tracking'} ${order.tracking_number}`:''),
    msg&&h('p',{className:'no-print small'},msg),
    h('div',{className:'row no-print',style:{marginTop:20}},h(Button,{onClick:()=>print(),icon:'pages'},'Print / Save PDF'),h(Button,{onClick:()=>nav('/')},'Back to Site'))
  );
}


function App(){const [path,nav]=usePath();const [status,setStatus]=useState(null),[user,setUser]=useState(null),[authChecked,setAuthChecked]=useState(false);const isAdmin=location.pathname.startsWith('/admin')||location.pathname.startsWith('/setup');useEffect(()=>{api('status').then(setStatus).catch(e=>setStatus({installed:true,error:e.message}))},[]);useEffect(()=>{if(status?.installed&&isAdmin){api('auth/me').then(d=>{window.__OAH_CSRF=d.csrf;setUser(d.user)}).catch(()=>setUser(null)).finally(()=>setAuthChecked(true))}else if(status)setAuthChecked(true)},[status?.installed,isAdmin]);if(location.pathname.startsWith('/order/'))return h(Receipt,{publicId:location.pathname.split('/').pop(),nav});if(!status)return h('div',{className:'auth-page'},h('div',{className:'auth-box card'},h('img',{src:'/art/oneartist-logo.svg',className:'auth-logo'}),h('p',{className:'lead'},'Starting OneArtist Hub…')));if(status.installed===false)return h(Setup,{onDone:()=>location.reload()});if(isAdmin){if(!authChecked)return h('div',{className:'auth-page'},'Checking secure session…');return user?h(AdminShell,{user,onLogout:()=>setUser(null)}):h(Login,{onLogin:setUser})}return h(PublicSite,{path,nav})}

createRoot(document.getElementById('root')).render(h(App));
