import { unzipSync, zipSync } from 'fflate';

const TE=new TextEncoder();
const TD=new TextDecoder();
const clean=v=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,'').trim();
const safeName=v=>clean(v).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').replace(/^\.+|\.+$/g,'').slice(0,160)||'track';

function syncsafeToInt(a,b,c,d){return ((a&0x7f)<<21)|((b&0x7f)<<14)|((c&0x7f)<<7)|(d&0x7f)}
function intToSyncsafe(n){return new Uint8Array([(n>>21)&0x7f,(n>>14)&0x7f,(n>>7)&0x7f,n&0x7f])}
function be32(n){return new Uint8Array([(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255])}
function concat(...parts){const len=parts.reduce((n,p)=>n+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
function decodeText(data){if(!data?.length)return'';const enc=data[0],raw=data.subarray(1);try{if(enc===0)return new TextDecoder('iso-8859-1').decode(raw).replace(/\0+$/,'');if(enc===1||enc===2)return new TextDecoder('utf-16').decode(raw).replace(/\0+$/,'');return TD.decode(raw).replace(/\0+$/,'')}catch{return TD.decode(raw).replace(/\0+$/,'')}}

export function inspectMp3(bytes,name=''){
  const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);const meta={title:'',artist:'',album:'',trackNo:'',year:'',genre:'',id3Version:'',filename:name,cover:null};
  if(u.length<10||TD.decode(u.subarray(0,3))!=='ID3')return meta;
  const major=u[3],size=syncsafeToInt(u[6],u[7],u[8],u[9]);meta.id3Version=`2.${major}`;let p=10,end=Math.min(u.length,10+size);
  while(p+10<=end){const id=TD.decode(u.subarray(p,p+4));if(!/^[A-Z0-9]{4}$/.test(id))break;let frameSize=major===4?syncsafeToInt(u[p+4],u[p+5],u[p+6],u[p+7]):((u[p+4]<<24)|(u[p+5]<<16)|(u[p+6]<<8)|u[p+7])>>>0;if(!frameSize||p+10+frameSize>end)break;const data=u.subarray(p+10,p+10+frameSize);const val=decodeText(data);if(id==='TIT2')meta.title=val;if(id==='TPE1')meta.artist=val;if(id==='TALB')meta.album=val;if(id==='TRCK')meta.trackNo=val.split('/')[0];if(id==='TDRC'||id==='TYER')meta.year=val;if(id==='TCON')meta.genre=val;if(id==='APIC'&&data.length>5&&!meta.cover){const enc=data[0];let q=1;while(q<data.length&&data[q]!==0)q++;const mime=TD.decode(data.subarray(1,q))||'image/jpeg';q++;if(q<data.length)q++;if(enc===1||enc===2){while(q+1<data.length&&(data[q]!==0||data[q+1]!==0))q+=2;q=Math.min(data.length,q+2)}else{while(q<data.length&&data[q]!==0)q++;q=Math.min(data.length,q+1)}if(q<data.length)meta.cover={bytes:data.slice(q),mime};}p+=10+frameSize;
  }
  return meta;
}

export function stripId3(bytes){
  const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);let start=0,end=u.length;
  if(u.length>=10&&TD.decode(u.subarray(0,3))==='ID3'){const size=syncsafeToInt(u[6],u[7],u[8],u[9]),footer=u[3]===4&&(u[5]&0x10)?10:0;start=Math.min(u.length,10+size+footer)}
  if(end-start>=128&&TD.decode(u.subarray(end-128,end-125))==='TAG')end-=128;
  return u.subarray(start,end);
}
function textFrame(id,value){if(value===undefined||value===null||String(value)==='')return new Uint8Array();const payload=concat(new Uint8Array([3]),TE.encode(clean(value)));return concat(TE.encode(id),intToSyncsafe(payload.length),new Uint8Array([0,0]),payload)}
function apicFrame(imageBytes,mime='image/jpeg'){if(!imageBytes?.length)return new Uint8Array();const payload=concat(new Uint8Array([3]),TE.encode(mime),new Uint8Array([0,3,0]),imageBytes);return concat(TE.encode('APIC'),intToSyncsafe(payload.length),new Uint8Array([0,0]),payload)}
export function writeMp3Metadata(bytes,{title,artist,album,trackNo,year,genre,coverBytes,coverMime='image/jpeg'}){
  const frames=concat(textFrame('TIT2',title),textFrame('TPE1',artist),textFrame('TALB',album),textFrame('TRCK',trackNo),textFrame('TDRC',year),textFrame('TCON',genre),apicFrame(coverBytes,coverMime));
  const header=concat(TE.encode('ID3'),new Uint8Array([4,0,0]),intToSyncsafe(frames.length));return concat(header,frames,stripId3(bytes));
}

export async function unpackReleaseZip(file){
  const raw=new Uint8Array(await file.arrayBuffer()),entries=unzipSync(raw),tracks=[],images=[];let embeddedCover=null;
  for(const [path,data] of Object.entries(entries)){
    if(path.endsWith('/'))continue;const lower=path.toLowerCase();
    if(lower.endsWith('.mp3')){const meta=inspectMp3(data,path),base=path.split('/').pop().replace(/\.mp3$/i,'');if(!embeddedCover&&meta.cover?.bytes?.length)embeddedCover={path:`${path}#embedded`,name:'embedded-cover',bytes:meta.cover.bytes,mime:meta.cover.mime};const num=(base.match(/^\s*(\d{1,3})[\s._-]+/)||[])[1]||meta.trackNo||'';const guessed=base.replace(/^\s*\d{1,3}[\s._-]+/,'').trim();tracks.push({id:crypto.randomUUID(),path,name:path.split('/').pop(),bytes:data,title:meta.title||guessed||base,artist:meta.artist||'',album:meta.album||'',trackNo:Number(num)||tracks.length+1,year:meta.year||'',genre:meta.genre||''})}
    else if(/\.(jpe?g|png|webp)$/i.test(lower))images.push({path,name:path.split('/').pop(),bytes:data,mime:lower.endsWith('.png')?'image/png':lower.endsWith('.webp')?'image/webp':'image/jpeg'});
  }
  tracks.sort((a,b)=>(a.trackNo||999)-(b.trackNo||999)||a.name.localeCompare(b.name));tracks.forEach((t,i)=>t.trackNo=i+1);
  const cover=images.find(x=>/cover|folder|front|artwork|album/i.test(x.name))||images[0]||embeddedCover||null;
  return {tracks,cover,images};
}

function wavHeader(dataLength,sampleRate,channels){const b=new ArrayBuffer(44),v=new DataView(b),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));w(0,'RIFF');v.setUint32(4,36+dataLength,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,dataLength,true);return new Uint8Array(b)}
export async function makePreviewWav(bytes,{seconds=30,start=0}={}){
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw new Error('This browser does not support audio preview generation.');const ctx=new Ctx();
  try{const ab=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),audio=await ctx.decodeAudioData(ab),sr=audio.sampleRate,ch=Math.min(2,audio.numberOfChannels),startFrame=Math.max(0,Math.min(audio.length-1,Math.floor(start*sr))),frames=Math.min(Math.floor(seconds*sr),audio.length-startFrame),pcm=new Uint8Array(frames*ch*2),view=new DataView(pcm.buffer);let o=0;for(let i=0;i<frames;i++){for(let c=0;c<ch;c++){const s=Math.max(-1,Math.min(1,audio.getChannelData(c)[startFrame+i]||0));view.setInt16(o,s<0?s*32768:s*32767,true);o+=2}}return {bytes:concat(wavHeader(pcm.length,sr,ch),pcm),duration:Number(audio.duration||0),previewDuration:frames/sr}}finally{ctx.close().catch(()=>{})}
}

export function buildReleaseZip(tracks,{artist,album,year,genre,cover=null}){
  const files={};tracks.forEach((t,i)=>{const no=String(i+1).padStart(2,'0'),title=clean(t.title)||`Track ${i+1}`,tagged=writeMp3Metadata(t.bytes,{title,artist,album,trackNo:`${i+1}/${tracks.length}`,year,genre,coverBytes:cover?.bytes,coverMime:cover?.mime});files[`${no} - ${safeName(title)}.mp3`]=tagged});if(cover?.bytes)files[`cover.${cover.mime==='image/png'?'png':cover.mime==='image/webp'?'webp':'jpg'}`]=cover.bytes;return zipSync(files,{level:6})
}
export function releaseZipFilename(artist,album){return `${safeName(artist||'Artist')} - ${safeName(album||'Release')}.zip`}
export function bytesToFile(bytes,name,type='application/octet-stream'){return new File([bytes],name,{type})}
