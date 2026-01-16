
const i18n = {
  ru: { departments:'Отделы', employees:'Сотрудники', date:'Дата', nature:'Бնույթ', reason:'Причина', status:'Статус' },
  hy: { departments:'Բաժիններ', employees:'Աշխատակիցներ', date:'Ամսաթիվ', nature:'Բնույթ', reason:'Պատճառ', status:'Կարգավիճակ' }
};

const state = {
  lang: localStorage.getItem('lang') || 'ru',
  currentDept: null,
  currentEmp: null,
  filters: { from:null, to:null, type:'all', status:'all', qEmp:'', qDept:'' }
};

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function t(key){ return i18n[state.lang][key] || key; }
function renderI18n(){
  $('[data-i18n="departments"]').textContent=t('departments');
  $('[data-i18n="employees"]').textContent=t('employees');
  $$('#absenceTable thead th').forEach(th=>{ const k=th.getAttribute('data-i18n'); if(k) th.textContent=t(k); });
}

async function api(path, opts){
  const res = await fetch(path, { headers:{'Content-Type':'application/json'}, ...opts });
  if(!res.ok) throw new Error(await res.text());
  return res.status===204 ? null : res.json();
}

async function loadDepts(){
  const list = await api('/api/departments');
  const ul = $('#deptList'); ul.innerHTML='';
  const q = state.filters.qDept.toLowerCase();
  list.filter(d=> (state.lang==='ru'?d.name_ru:d.name_hy).toLowerCase().includes(q)).forEach(d=>{
    const li = document.createElement('li');
    li.textContent = state.lang==='ru'?d.name_ru:d.name_hy;
    if(state.currentDept && state.currentDept.id===d.id) li.classList.add('active');
    li.onclick=()=>{ state.currentDept=d; state.currentEmp=null; render(); };
    ul.appendChild(li);
  });
  return list;
}

async function loadTypes(){
  const types = await api('/api/types');
  const sel = $('#typeFilter'); sel.innerHTML='';
  const optAll = document.createElement('option'); optAll.value='all'; optAll.textContent='Все типы'; sel.appendChild(optAll);
  types.forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent = state.lang==='ru'?t.name_ru:t.name_hy; sel.appendChild(o); });
  // dialog select
  const dsel = $('#fType'); dsel.innerHTML='';
  types.forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent = state.lang==='ru'?t.name_ru:t.name_hy; dsel.appendChild(o); });
  return types;
}

function formatName(e){ return state.lang==='ru' ? `${e.last_ru} ${e.first_ru}` : `${e.last_hy} ${e.first_hy}`; }

async function loadEmps(){
  const listEl = $('#empList'); listEl.innerHTML='';
  if(!state.currentDept){ listEl.innerHTML='<li class="muted">Выберите отдел</li>'; return []; }
  const q = state.filters.qEmp;
  const emps = await api(`/api/employees?department_id=${state.currentDept.id}&q=${encodeURIComponent(q)}`);
  emps.forEach(e=>{
    const li = document.createElement('li');
    li.textContent = formatName(e);
    if(state.currentEmp && state.currentEmp.id===e.id) li.classList.add('active');
    li.onclick=()=>{ state.currentEmp=e; renderAbsences(); };
    listEl.appendChild(li);
  });
  return emps;
}

async function renderAbsences(){
  const tbody = $('#absenceTable tbody'); tbody.innerHTML='';
  const btn = $('#addAbsence');
  if(!state.currentEmp){ btn.disabled=true; $('#empTitle').textContent='Выберите сотрудника'; return; }
  btn.disabled=false; $('#empTitle').textContent = formatName(state.currentEmp);
  const p = new URLSearchParams(); p.set('employee_id', state.currentEmp.id);
  if(state.filters.from) p.set('from', state.filters.from);
  if(state.filters.to) p.set('to', state.filters.to);
  if(state.filters.type!=='all') p.set('type', state.filters.type);
  if(state.filters.status!=='all') p.set('status', state.filters.status);
  const items = await api(`/api/absences?${p.toString()}`);
  items.forEach((a,idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${a.date}</td>
      <td data-type-id="${a.type_id}"></td>
      <td>${a.reason||''}</td>
      <td><span class="tag ${a.status}">${a.status}</span></td>
      <td>
        <button class="ghost" data-act="edit" data-id="${a.id}">✏️</button>
        <button class="ghost" data-act="del" data-id="${a.id}">🗑️</button>
        <button class="ghost" data-act="approve" data-id="${a.id}">✅</button>
      </td>`;
    tbody.appendChild(tr);
  });
  // resolve type names
  const types = await api('/api/types');
  $$('#absenceTable [data-type-id]').forEach(td=>{
    const t = types.find(x=> x.id==td.getAttribute('data-type-id'));
    td.textContent = state.lang==='ru'?t.name_ru:t.name_hy;
  });
}

async function exportCSV(){
  if(!state.currentEmp){ alert('Сначала выберите сотрудника'); return; }
  const p = new URLSearchParams(); p.set('employee_id', state.currentEmp.id);
  const items = await api(`/api/absences?${p.toString()}`);
  const rows = [["employee","date","type","reason","status"]];
  const types = await api('/api/types');
  items.forEach(a=>{
    const t = types.find(x=> x.id===a.type_id);
    rows.push([$('#empTitle').textContent, a.date, (state.lang==='ru'?t.name_ru:t.name_hy), a.reason||'', a.status]);
  });
  const csv = rows.map(r=> r.map(v=> '"'+String(v).replaceAll('"','"')+'"').join(',')).join('
');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='absences.csv'; a.click(); URL.revokeObjectURL(url);
}

function openDialog(edit){
  const dlg = document.getElementById('absenceDialog');
  if(edit){
    $('#dlgTitle').textContent='Редактировать';
    $('#fDate').value=edit.date; $('#fType').value=edit.type_id; $('#fReason').value=edit.reason||''; dlg.setAttribute('data-id', edit.id);
  }else{
    $('#dlgTitle').textContent='Новая запись';
    $('#fDate').value=''; $('#fReason').value=''; dlg.removeAttribute('data-id');
  }
  dlg.showModal();
}

function initEvents(){
  $('#langSelect').value = state.lang;
  $('#langSelect').onchange = e=>{ state.lang=e.target.value; localStorage.setItem('lang', state.lang); render(); };
  $('#deptSearch').oninput = e=>{ state.filters.qDept=e.target.value; render(); };
  $('#empSearch').oninput = e=>{ state.filters.qEmp=e.target.value; render(); };
  $('#fromDate').onchange = e=>{ state.filters.from=e.target.value||null; renderAbsences(); };
  $('#toDate').onchange = e=>{ state.filters.to=e.target.value||null; renderAbsences(); };
  $('#typeFilter').onchange = e=>{ state.filters.type=e.target.value; renderAbsences(); };
  $('#statusFilter').onchange = e=>{ state.filters.status=e.target.value; renderAbsences(); };
  $('#clearFilters').onclick=()=>{ state.filters={ from:null,to:null,type:'all',status:'all',qEmp:'',qDept:''};
    $('#fromDate').value=''; $('#toDate').value=''; $('#empSearch').value=''; $('#deptSearch').value=''; render(); };
  $('#addAbsence').onclick=()=> openDialog();
  $('#exportBtn').onclick=exportCSV;
  $('#absenceTable').onclick = async e=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.getAttribute('data-id'); const act = btn.getAttribute('data-act');
    if(act==='del'){ await api(`/api/absences/${id}`, {method:'DELETE'}); renderAbsences(); }
    if(act==='edit'){ const items = await api(`/api/absences?employee_id=${state.currentEmp.id}`); const a = items.find(x=> String(x.id)===id); openDialog(a); }
    if(act==='approve'){ await api(`/api/absences/${id}/approve`, {method:'POST'}); renderAbsences(); }
  };
  document.getElementById('absenceForm').onsubmit = async e=>{
    e.preventDefault();
    const dlg = document.getElementById('absenceDialog');
    const editId = dlg.getAttribute('data-id');
    const payload = { date: $('#fDate').value, type_id: parseInt($('#fType').value), reason: $('#fReason').value };
    if(!payload.date) return;
    if(editId){ await api(`/api/absences/${editId}`, {method:'PUT', body: JSON.stringify(payload)}); }
    else { await api('/api/absences', {method:'POST', body: JSON.stringify({ employee_id: state.currentEmp.id, ...payload })}); }
    dlg.close(); renderAbsences();
  };
}

async function render(){
  renderI18n(); await loadTypes(); await loadDepts(); await loadEmps(); await renderAbsences();
}

initEvents(); render();
