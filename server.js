
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'data.json');

let db = {
  departments: [
    {id:1, name_ru:'Финансовый отдел', name_hy:'Ֆինանսական Բաժին'},
    {id:2, name_ru:'Технологический отдел', name_hy:'Տեխնոլոգիական բաժին'},
    {id:3, name_ru:'HR отдел', name_hy:'HR Բաժին'},
    {id:4, name_ru:'Склад', name_hy:'Պահեստներ'}
  ],
  employees: [
    {id:101, first_ru:'Харут', last_ru:'Айрапетян', first_hy:'Հարութ', last_hy:'Հայրապետյան', department_id:2},
    {id:102, first_ru:'Галуст', last_ru:'Петросян', first_hy:'Գալուստ', last_hy:'Պետրոսյան', department_id:2},
    {id:103, first_ru:'Эдгар', last_ru:'Вахрадян', first_hy:'Էդգար', last_hy:'Վահրադյան', department_id:1},
    {id:104, first_ru:'Лиза', last_ru:'Текнежян', first_hy:'Լիզա', last_hy:'Թեքնեջյան', department_id:4}
  ],
  types: [
    {id:1, code:'ANZ', name_ru:'Личные (Անձնական)', name_hy:'Անձնական', category:'personal'},
    {id:2, code:'GRZ', name_ru:'Служебные (Գործնական)', name_hy:'Գործնական', category:'business'},
    {id:3, code:'SICK', name_ru:'Больничный', name_hy:'Հիվանդանոցային', category:'personal'}
  ],
  absences: [
    {id:1001, employee_id:101, date:'2026-01-10', type_id:2, reason:'Командировка', status:'approved'},
    {id:1002, employee_id:101, date:'2026-01-15', type_id:1, reason:'Личные дела', status:'pending'},
    {id:1003, employee_id:103, date:'2026-01-05', type_id:3, reason:'ОРВИ', status:'approved'}
  ]
};

function load(){
  try{ const raw = fs.readFileSync(DATA_FILE, 'utf-8'); db = JSON.parse(raw); }
  catch(e){ /* first run */ save(); }
}
function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
load();

// --- API ---
app.get('/api/departments', (req,res)=> res.json(db.departments));
app.get('/api/types', (req,res)=> res.json(db.types));

app.get('/api/employees', (req,res)=>{
  const { department_id, q } = req.query;
  let list = [...db.employees];
  if(department_id) list = list.filter(e=> String(e.department_id)===String(department_id));
  if(q){ const s = String(q).toLowerCase();
    list = list.filter(e=> `${e.last_ru} ${e.first_ru} ${e.last_hy} ${e.first_hy}`.toLowerCase().includes(s));
  }
  res.json(list);
});

app.get('/api/absences', (req,res)=>{
  const { employee_id, from, to, type, status } = req.query;
  let list = [...db.absences];
  if(employee_id) list = list.filter(a=> String(a.employee_id)===String(employee_id));
  if(from) list = list.filter(a=> a.date>=from);
  if(to) list = list.filter(a=> a.date<=to);
  if(type && type!=='all') list = list.filter(a=> String(a.type_id)===String(type));
  if(status && status!=='all') list = list.filter(a=> a.status===status);
  list.sort((a,b)=> a.date.localeCompare(b.date));
  res.json(list);
});

app.post('/api/absences', (req,res)=>{
  const { employee_id, date, type_id, reason } = req.body;
  if(!employee_id || !date || !type_id) return res.status(400).json({error:'employee_id, date, type_id are required'});
  const id = Math.max(0,...db.absences.map(a=>a.id)) + 1;
  const item = { id, employee_id, date, type_id, reason: reason||'', status:'draft' };
  db.absences.push(item); save();
  res.status(201).json(item);
});

app.put('/api/absences/:id', (req,res)=>{
  const id = Number(req.params.id);
  const idx = db.absences.findIndex(a=> a.id===id);
  if(idx<0) return res.status(404).json({error:'not found'});
  const { date, type_id, reason, status } = req.body;
  db.absences[idx] = { ...db.absences[idx], ...(date?{date}:{}) , ...(type_id?{type_id}:{}) , ...(reason!==undefined?{reason}:{}) , ...(status?{status}:{}) };
  save(); res.json(db.absences[idx]);
});

app.post('/api/absences/:id/approve', (req,res)=>{
  const id = Number(req.params.id);
  const item = db.absences.find(a=> a.id===id);
  if(!item) return res.status(404).json({error:'not found'});
  item.status = 'approved'; save(); res.json(item);
});

app.delete('/api/absences/:id', (req,res)=>{
  const id = Number(req.params.id);
  const len = db.absences.length;
  db.absences = db.absences.filter(a=> a.id!==id);
  if(db.absences.length===len) return res.status(404).json({error:'not found'});
  save(); res.status(204).end();
});

// Static
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req,res)=> res.sendFile(path.join(__dirname,'public','index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on :${PORT}`));
