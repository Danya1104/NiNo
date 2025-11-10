export let db;
const DB_LOCAL_KEY="nino_sqlite_dump_v1";

async function initDB(){
  const SQL=await initSqlJs({
    locateFile:f=>`https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
  });
  const saved=localStorage.getItem(DB_LOCAL_KEY);
  if(saved){
    const bytes=Uint8Array.from(atob(saved),c=>c.charCodeAt(0));
    db=new SQL.Database(bytes);
  }else{
    db=new SQL.Database();
    bootstrapSchema(); seed(); persist();
  }
}
function bootstrapSchema(){
  db.run(`
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS groups(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY,name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS staff(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS timetable(
      id INTEGER PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES groups(id),
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      day TEXT NOT NULL, week INTEGER NOT NULL, slot TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assignments(
      id INTEGER PRIMARY KEY,
      subject_id INTEGER NOT NULL REFERENCES subjects(id),
      title TEXT NOT NULL,due_date TEXT,link TEXT
    );
  `);
}
function seed(){
  const ins=(sql,vals)=>{const st=db.prepare(sql);vals.forEach(v=>st.run(v));st.free();};
  ins("INSERT INTO groups(name) VALUES (?);",[["ИУ-101"],["ИУ-102"]]);
  ins("INSERT INTO subjects(name) VALUES (?);",[["Матан"],["Физика"],["ОП"]]);
  ins("INSERT INTO staff(name,email) VALUES (?,?);",[["Иванова А.А.","ivanova@uni.edu"],["Петров П.П.","petrov@uni.edu"]]);
  db.run(`INSERT INTO timetable(group_id,subject_id,day,week,slot)
          VALUES (1,1,'mon',0,'09:00-10:30'),(1,2,'mon',0,'10:40-12:10');`);
  db.run(`INSERT INTO assignments(subject_id,title,due_date,link)
          VALUES (1,'Листок №1','2025-11-14','https://example.com/task1');`);
}
export function persist(){const data=db.export();const b64=btoa(String.fromCharCode(...data));localStorage.setItem(DB_LOCAL_KEY,b64);}
export function query(sql,params=[]){const st=db.prepare(sql);st.bind(params);const rows=[];while(st.step())rows.push(st.getAsObject());st.free();return rows;}
export function exec(sql,params=[]){const st=db.prepare(sql);st.bind(params);st.step();st.free();persist();}
await initDB();
