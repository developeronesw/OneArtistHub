import Database from 'better-sqlite3';

class SQLiteStatement{
  constructor(db,sql,args=[]){this.db=db;this.sql=String(sql);this.args=args}
  bind(...args){return new SQLiteStatement(this.db,this.sql,args)}
  async first(){return this.db.sqlite.prepare(this.sql).get(...this.args)||null}
  async all(){return {results:this.db.sqlite.prepare(this.sql).all(...this.args)}}
  async run(){const r=this.db.sqlite.prepare(this.sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes||0),last_row_id:Number(r.lastInsertRowid||0)}}}
}
export class SQLiteD1Adapter{
  constructor(file){this.sqlite=new Database(file);this.sqlite.pragma('journal_mode = WAL');this.sqlite.pragma('foreign_keys = ON')}
  prepare(sql){return new SQLiteStatement(this,sql)}
  async batch(statements){const tx=this.sqlite.transaction((list)=>list.map(st=>{const r=this.sqlite.prepare(st.sql).run(...st.args);return {success:true,meta:{changes:Number(r.changes||0),last_row_id:Number(r.lastInsertRowid||0)}}}));return tx(statements)}
  async exec(sql){this.sqlite.exec(String(sql));return {count:0,duration:0}}
  close(){this.sqlite.close()}
}
export async function createSQLiteAdapter({file}){return new SQLiteD1Adapter(file)}
