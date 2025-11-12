// localStorage-backed storage API for NiNo
// Replaces SQL-based DB for simple in-browser storage and easier file:// usage
(function(){
  const KEY = 'nino_data_v1';
  let state = null;

  function makeId(col){
    state.nextId[col] = (state.nextId[col] || 1) + 1;
    return state.nextId[col] - 1;
  }

  function seed(){
    state = {
      nextId: {groups:3, subjects:4, staff:3, timetable:3, assignments:2},
      groups: [ {id:1,name:'ИУ-101'}, {id:2,name:'ИУ-102'} ],
      subjects: [ {id:1,name:'Матан'}, {id:2,name:'Физика'}, {id:3,name:'ОП'} ],
      staff: [ {id:1,name:'Иванова А.А.',email:'ivanova@uni.edu'}, {id:2,name:'Петров П.П.',email:'petrov@uni.edu'} ],
      timetable: [ {id:1,group_id:1,subject_id:1,day:'mon',week:0,slot:'09:00-10:30'}, {id:2,group_id:1,subject_id:2,day:'mon',week:0,slot:'10:40-12:10'} ],
      assignments: [ {id:1,subject_id:1,title:'Листок №1',due_date:'2025-11-14',link:'https://example.com/task1'} ]
    };
    persist();
  }

  function load(){
    const raw = localStorage.getItem(KEY);
    if(raw){
      try{ state = JSON.parse(raw); }catch(e){ console.warn('nino: failed to parse storage, reseeding',e); seed(); }
    }else seed();
  }

  function persist(){
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  // API
  function getSubjects(){ return state.subjects.slice(); }
  function getGroups(){ return state.groups.slice(); }
  function getStaff(){ return state.staff.slice().sort((a,b)=>a.name.localeCompare(b.name)); }

  function getAssignments(subjectId){
    const rows = state.assignments
      .filter(a => subjectId==null || Number(subjectId)===Number(a.subject_id))
      .map(a => {
        const subj = state.subjects.find(s=>s.id===a.subject_id);
        return { subject: subj?.name||'', title: a.title, due_date: a.due_date||'', link: a.link||'' };
      });
    rows.sort((x,y)=> (x.due_date||'') > (y.due_date||'') ? 1 : -1);
    return rows;
  }

  function addAssignment({subject_id,title,due_date,link}){
    const id = makeId('assignments');
    state.assignments.push({id,subject_id:Number(subject_id),title,due_date:due_date||null,link:link||null});
    persist();
  }

  function addTimetable({group_id,subject_id,day,week,slot}){
    const id = makeId('timetable');
    state.timetable.push({id,group_id:Number(group_id),subject_id:Number(subject_id),day,week:Number(week||0),slot});
    persist();
  }

  function addStaffEntry({name,email}){
    const id = makeId('staff');
    state.staff.push({id,name,email});
    persist();
  }

  function getTimetable(groupId, day){
    return state.timetable
      .filter(t => Number(t.group_id)===Number(groupId) && t.day===day)
      .map(t => {
        const subj = state.subjects.find(s=>s.id===t.subject_id);
        return { subject: subj?.name||'', slot: t.slot };
      })
      .sort((a,b)=> a.slot > b.slot ? 1 : -1);
  }

  function exportData(){
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    return blob;
  }

  async function importDataFile(file){
    const txt = await file.text();
    try{
      const parsed = JSON.parse(txt);
      if(!parsed.nextId) throw new Error('invalid format');
      state = parsed; persist();
      return true;
    }catch(e){ throw e; }
  }

  load();

  // expose
  window.storageReady = Promise.resolve();
  window.getSubjects = getSubjects;
  window.getGroups = getGroups;
  window.getStaff = getStaff;
  window.getAssignments = getAssignments;
  window.addAssignment = addAssignment;
  window.addTimetable = addTimetable;
  window.addStaffEntry = addStaffEntry;
  window.getTimetable = getTimetable;
  window.exportData = exportData;
  window.importDataFile = importDataFile;
})();
