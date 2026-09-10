import mysql from 'mysql2/promise';

import {sqlForMySQL} from './sql-compat.mjs';
class Statement{
  constructor(db,sql,args=[]){this.db=db;this.sql=sqlForMySQL(sql);this.args=args}
  bind(...args){return new Statement(this.db,this.sql,args)}
  async first(){const [rows]=await this.db.pool.execute(this.sql,this.args);return Array.isArray(rows)?(rows[0]||null):null}
  async all(){const [rows]=await this.db.pool.execute(this.sql,this.args);return {results:Array.isArray(rows)?rows:[]}}
  async run(){const [r]=await this.db.pool.execute(this.sql,this.args);return {success:true,meta:{changes:Number(r.affectedRows||0),last_row_id:Number(r.insertId||0)}}}
  async _runOn(conn){const [r]=await conn.execute(this.sql,this.args);return {success:true,meta:{changes:Number(r.affectedRows||0),last_row_id:Number(r.insertId||0)}}}
}

export class MySQLD1Adapter{
  constructor(pool){this.pool=pool}
  prepare(sql){return new Statement(this,sql)}
  async batch(statements){const conn=await this.pool.getConnection();try{await conn.beginTransaction();const out=[];for(const st of statements)out.push(await st._runOn(conn));await conn.commit();return out}catch(e){await conn.rollback();throw e}finally{conn.release()}}
  async exec(){return {count:0,duration:0};}
}

export async function createMySQLAdapter(config){
  const pool=mysql.createPool({host:config.host||'127.0.0.1',port:Number(config.port||3306),user:config.user,password:config.password,database:config.database,waitForConnections:true,connectionLimit:Number(config.connectionLimit||10),charset:'utf8mb4'});
  await pool.query('SELECT 1');
  return new MySQLD1Adapter(pool);
}

export {sqlForMySQL as translateSQLForTest} from './sql-compat.mjs';
