import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

export class LocalStorageAdapter{
  constructor(root){this.root=path.resolve(root)}
  file(key){const clean=String(key).replace(/^\/+/, '');const target=path.resolve(this.root,clean);if(!target.startsWith(this.root+path.sep))throw new Error('Invalid media path.');return target}
  async put(key,bytes,meta={}){const target=this.file(key);await mkdir(path.dirname(target),{recursive:true});const tmp=target+'.tmp-'+Date.now();await writeFile(tmp,Buffer.from(bytes));const {rename}=await import('node:fs/promises');await rename(tmp,target);await writeFile(target+'.meta.json',JSON.stringify(meta));}
  async get(key){try{const target=this.file(key),body=await readFile(target);let meta={};try{meta=JSON.parse(await readFile(target+'.meta.json','utf8'))}catch{}return {body,contentType:meta.contentType||'application/octet-stream'} }catch(e){if(e?.code==='ENOENT')return null;throw e}}
}
