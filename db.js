// db.js — SQLite + авторизация (sql.js + localStorage)
export let db;
const DB_LOCAL_KEY = "nino_sqlite_dump_v1";
const SESSION_KEY = "nino_current_user_v1"; // хранит JSON {id,login,role}

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
  });

  const saved = localStorage.getItem(DB_LOCAL_KEY);
  if (saved) {
    const bytes = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
    db = new SQL.Database(bytes);
  } else {
    db = new SQL.Database();
    bootstrapSchema();
    seed();
    persist();
  }
}

function bootstrapSchema() {
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
    /* таблица пользователей */
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL -- admin | user
    );
  `);
}

function seed() {
  const ins = (sql, vals) => { const st = db.prepare(sql); vals.forEach(v => st.run(v)); st.free(); };
  ins("INSERT INTO groups(name) VALUES (?);", [["ИУ-101"], ["ИУ-102"]]);
  ins("INSERT INTO subjects(name) VALUES (?);", [["Матан"], ["Физика"], ["ОП"]]);
  ins("INSERT INTO staff(name,email) VALUES (?,?);", [
    ["Иванова А.А.", "ivanova@uni.edu"],
    ["Петров П.П.", "petrov@uni.edu"]
  ]);
  db.run(`INSERT INTO timetable(group_id,subject_id,day,week,slot)
          VALUES (1,1,'mon',0,'09:00-10:30'),(1,2,'mon',0,'10:40-12:10');`);
  db.run(`INSERT INTO assignments(subject_id,title,due_date,link)
          VALUES (1,'Листок №1','2025-11-14','https://example.com/task1');`);
  // админ по умолчанию
  const adminHash = hash("123");
  db.run(`INSERT OR IGNORE INTO users(login,password_hash,role) VALUES ('admin', ?, 'admin');`, [adminHash]);
}

export function persist() {
  const data = db.export();
  const b64 = btoa(String.fromCharCode(...data));
  localStorage.setItem(DB_LOCAL_KEY, b64);
}

export function query(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}

export function exec(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params);
  st.step();
  st.free();
  persist();
}

// простой учебный “хэш” для пароля
export function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
  return String(h);
}

// ===== регистрация, вход и сессия =====
export function registerUser(login, password) {
  login = (login || "").trim();
  if (!login || !password) throw new Error("Укажите логин и пароль");
  const exists = query("SELECT id FROM users WHERE login=?;", [login]);
  if (exists.length) throw new Error("Логин уже занят");
  const ph = hash(password);
  exec("INSERT INTO users(login,password_hash,role) VALUES (?,?,?)", [login, ph, "user"]);
  const user = query("SELECT id, login, role FROM users WHERE login=?;", [login])[0];
  setSession(user);
  return user;
}

export function loginUser(login, password) {
  const rows = query("SELECT id, login, password_hash, role FROM users WHERE login=?;", [login]);
  if (!rows.length) throw new Error("Пользователь не найден");
  if (rows[0].password_hash !== hash(password)) throw new Error("Неверный пароль");
  const user = { id: rows[0].id, login: rows[0].login, role: rows[0].role };
  setSession(user);
  return user;
}

export function logoutUser() { localStorage.removeItem(SESSION_KEY); }

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

export function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

await initDB();
