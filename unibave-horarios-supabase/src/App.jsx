
import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

function IconCalendar() {
  return (<svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="#111" fill="none" strokeWidth="1.2"/></svg>);
}

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(r => { if (r?.data?.session) setSession(r.data.session) });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => listener?.subscription?.unsubscribe && listener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <div style={{minHeight:'100vh', background:'#fff'}}>
        <Routes>
          <Route path="/" element={<Home session={session} />} />
          <Route path="/app/*" element={<MainApp session={session} />} />
        </Routes>
      </div>
    </Router>
  );
}

function Home({ session }) {
  const navigate = useNavigate();
  useEffect(()=>{ if(session) navigate('/app/dashboard'); }, [session, navigate]);

  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh', padding:20}}>
      <div style={{width:480, padding:24, background:'#fff', borderRadius:12, boxShadow:'0 6px 18px rgba(15,23,42,0.06)'}}>
        <h1 style={{color:'#197749'}}>UNIBAVE - Gestão de Horários</h1>
        <p>Protótipo conectado ao Supabase. Faça login ou registre-se.</p>
        <AuthForms />
      </div>
    </div>
  );
}

function AuthForms() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message); else alert('Verifique seu e-mail para link de login (magic link).');
    setLoading(false);
  }
  return (
    <div style={{display:'grid', gap:8}}>
      <input placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} style={{padding:8}}/>
      <button onClick={signIn} style={{padding:8, background:'#197749', color:'#fff'}} disabled={loading}>Enviar link de login</button>
    </div>
  );
}

function MainApp({ session }) {
  return (
    <div style={{display:'flex', minHeight:'100vh'}}>
      <nav style={{width:260, padding:20, borderRight:'1px solid #eef2f7'}}>
        <div style={{marginBottom:20}}><div style={{color:'#197749', fontWeight:600}}>UNIBAVE</div><div style={{color:'#6b7280', fontSize:13}}>Gerenciamento</div></div>
        <ul style={{listStyle:'none', padding:0, margin:0, display:'grid', gap:8}}>
          <li><NavLink to="dashboard">Dashboard</NavLink></li>
          <li><NavLink to="config">Configurações</NavLink></li>
          <li><NavLink to="import">Importar</NavLink></li>
        </ul>
      </nav>
      <main style={{flex:1, padding:24}}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="config" element={<Config />} />
          <Route path="import" element={<Import />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

function NavLink({ to, children }) { return <Link to={to} style={{display:'block', padding:'8px 10px'}}>{children}</Link>; }

function Dashboard() {
  return (
    <div>
      <h3 style={{color:'#197749'}}>Painel</h3>
      <p>Este painel demonstra leitura/gravação mínima no Supabase.</p>
      <SaveScheduleDemo />
    </div>
  );
}

function SaveScheduleDemo() {
  const [course, setCourse] = useState('Administração');
  const [discipline, setDiscipline] = useState('Estatística');
  const [room, setRoom] = useState('B201');
  const [message, setMessage] = useState('');
  async function save() {
    setMessage('Salvando...');
    const { data, error } = await supabase.from('schedules').insert([{ course, discipline, room }]);
    if (error) setMessage('Erro: '+error.message); else setMessage('Registro salvo (id: '+(data?.[0]?.id||'')+')');
  }
  return (
    <div style={{maxWidth:600}}>
      <div style={{display:'grid', gap:8}}>
        <input value={course} onChange={e=>setCourse(e.target.value)} />
        <input value={discipline} onChange={e=>setDiscipline(e.target.value)} />
        <input value={room} onChange={e=>setRoom(e.target.value)} />
        <div style={{display:'flex', gap:8}}>
          <button onClick={save} style={{padding:8, background:'#197749', color:'#fff'}}>Salvar</button>
        </div>
        {message && <div>{message}</div>}
      </div>
    </div>
  );
}

function Config() {
  const fileRef = useRef();
  const [logoUrl, setLogoUrl] = useState('');
  async function uploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const { data, error } = await supabase.storage.from('public-logos').upload('logo-'+Date.now(), file, { upsert: true });
    if (error) return alert(error.message);
    const url = `${process.env.REACT_APP_SUPABASE_URL}/storage/v1/object/public/public-logos/${data.path}`;
    setLogoUrl(url);
    alert('Logo enviada com sucesso.');
  }
  return (
    <div style={{maxWidth:600}}>
      <h3>Configurações</h3>
      <div>
        <div>Upload de logo (será enviado ao bucket public-logos)</div>
        <input type="file" accept="image/*" onChange={uploadLogo} ref={fileRef} />
        {logoUrl && <div><img src={logoUrl} alt="logo" style={{height:64, marginTop:8}}/></div>}
      </div>
    </div>
  );
}

function Import() {
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      const raw = evt.target.result;
      const wb = XLSX.read(raw, {type:'binary'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, {defval:''});
      setPreview(json.slice(0,20));
      const errs = [];
      json.forEach((row, i) => {
        if (!row['Professor']) errs.push('Linha '+(i+2)+': Professor ausente');
        if (!row['Sala']) errs.push('Linha '+(i+2)+': Sala ausente');
      });
      setErrors(errs);
    };
    reader.readAsBinaryString(f);
  }

  async function saveImport() {
    const { data, error } = await supabase.from('imports').insert(preview.map(r=>({payload: r})));
    if (error) alert('Erro ao salvar import: '+error.message); else alert('Import salvo: '+(data.length||0)+' linhas');
  }

  return (
    <div style={{maxWidth:900}}>
      <h3>Importar planilha (.xlsx / .csv)</h3>
      <input type="file" accept=".csv,.xlsx" onChange={handleFile} />
      <div style={{marginTop:12}}>
        <h4>Preview</h4>
        <pre style={{maxHeight:200, overflow:'auto'}}>{JSON.stringify(preview, null, 2)}</pre>
        <div>
          <h4>Erros</h4>
          <ul>{errors.length===0 ? <li>Nenhum erro detectado</li> : errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
        </div>
        <div style={{marginTop:12}}>
          <button onClick={saveImport} style={{padding:8, background:'#197749', color:'#fff'}}>Salvar import (demo)</button>
        </div>
      </div>
    </div>
  );
}
