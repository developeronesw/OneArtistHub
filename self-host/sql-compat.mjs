export function sqlForMySQL(sql){
  let q=String(sql).trim();
  q=q.replace(/INSERT\s+OR\s+IGNORE/gi,'INSERT IGNORE');
  q=q.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi,'REPLACE INTO');
  q=q.replace(/datetime\('now'\)/gi,"DATE_FORMAT(UTC_TIMESTAMP(3),'%Y-%m-%dT%H:%i:%s.000Z')");
  q=q.replace(/datetime\('now','-(\d+) minutes?'\)/gi,(_,n)=>`DATE_FORMAT(DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${Number(n)} MINUTE),'%Y-%m-%dT%H:%i:%s.000Z')`);
  q=q.replace(/datetime\('now','-(\d+) days?'\)/gi,(_,n)=>`DATE_FORMAT(DATE_SUB(UTC_TIMESTAMP(3), INTERVAL ${Number(n)} DAY),'%Y-%m-%dT%H:%i:%s.000Z')`);
  q=q.replace(/date\('now'\)/gi,"DATE_FORMAT(UTC_DATE(),'%Y-%m-%d')");
  q=q.replace(/ON\s+CONFLICT\s*\(key\)\s+DO\s+UPDATE\s+SET\s+value=excluded\.value,updated_at=excluded\.updated_at/gi,'ON DUPLICATE KEY UPDATE value=VALUES(value),updated_at=VALUES(updated_at)');
  q=q.replace(/ON\s+CONFLICT\s*\(provider\)\s+DO\s+UPDATE\s+SET\s+data_enc=excluded\.data_enc,updated_at=excluded\.updated_at/gi,'ON DUPLICATE KEY UPDATE data_enc=VALUES(data_enc),updated_at=VALUES(updated_at)');
  return q;
}

export function assertMySQLCompatibleSQL(sql){
  const q=sqlForMySQL(sql);
  const unsupported=[/INSERT\s+OR\s+IGNORE/i,/INSERT\s+OR\s+REPLACE/i,/ON\s+CONFLICT\s*\(/i,/datetime\('now'/i,/date\('now'\)/i];
  const hit=unsupported.find(r=>r.test(q));
  if(hit)throw new Error(`Untranslated SQLite SQL remains: ${q}`);
  return q;
}
