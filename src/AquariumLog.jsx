import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Date helpers ─────────────────────────────────────────────────────────────
const TODAY_STR = new Date().toISOString().slice(0, 10);
const FOUR_WEEKS_AGO = (() => {
  const d = new Date(); d.setDate(d.getDate() - 28); return d.toISOString().slice(0, 10);
})();

// ─── Fallback tank list (used until DB loads) ─────────────────────────────────
const FALLBACK_TANKS = [
  { id: "5G Betta Tank",      name: "5G Betta Tank",      type: "freshwater", size: "5 Gal",  volume_gal: 5,  setup_date: "2024-04-07" },
  { id: "10G GloFish Tank",   name: "10G GloFish Tank",   type: "freshwater", size: "10 Gal", volume_gal: 10, setup_date: "2025-02-02" },
  { id: "20G Gold Fish Tank", name: "20G Gold Fish Tank", type: "freshwater", size: "20 Gal", volume_gal: 20, setup_date: "2025-02-20" },
  { id: "40G Community Tank", name: "40G Community Tank", type: "freshwater", size: "40 Gal", volume_gal: 40, setup_date: "2025-04-01" },
  { id: "IM20 Reef Tank",     name: "IM20 Reef Tank",     type: "saltwater",  size: "20 Gal", volume_gal: 20, setup_date: "2024-08-24" },
  { id: "RS250 Reef Tank",    name: "RS250 Reef Tank",    type: "saltwater",  size: "65 Gal", volume_gal: 65, setup_date: "2024-05-01" },
];

const TANK_COLOR_PALETTE = [
  "#38bdf8","#a78bfa","#fb923c","#4ade80","#f472b6","#fbbf24",
  "#34d399","#f87171","#818cf8","#e879f9","#facc15","#2dd4bf",
];

function getTankColor(tankName, tanks) {
  const idx = tanks.findIndex(t => (t.name||t.id) === tankName);
  return TANK_COLOR_PALETTE[idx % TANK_COLOR_PALETTE.length] || "#38bdf8";
}

const CAT_COLORS = {
  "Water Change":"#38bdf8","Maintenance":"#a78bfa","LiveStock":"#4ade80",
  "Dosage":"#fb923c","Feeding":"#fbbf24","Other":"#94a3b8",
};

const FW_PARAMS = ["nitrate","ph","alkalinity","ammonia"];
const SW_PARAMS = ["nitrate","phosphate","salinity","ph","alkalinity","calcium","magnesium"];
const LS_TYPES  = ["Freshwater Fish","Saltwater Fish","Saltwater Invert","Freshwater Invert","Corals","Live Plants","Other"];
const LS_EVENTS = ["Added","Died","Donated/Removed","Moved Between Tanks"];

const PARAM_LABELS = {
  nitrate:"Nitrate (ppm)",phosphate:"Phosphate (ppm)",salinity:"Salinity (ppt)",
  ph:"pH",alkalinity:"Alkalinity (dKH)",calcium:"Calcium (ppm)",
  magnesium:"Magnesium (ppm)",ammonia:"Ammonia (ppm)",
};
const PARAM_SAFE = {
  nitrate:   {min:0,   max:20,   color:"#4ade80"},
  phosphate: {min:0,   max:0.1,  color:"#f472b6"},
  salinity:  {min:33,  max:36,   color:"#38bdf8"},
  ph:        {min:7.2, max:8.4,  color:"#fbbf24"},
  alkalinity:{min:8,   max:12,   color:"#a78bfa"},
  calcium:   {min:380, max:450,  color:"#fb923c"},
  magnesium: {min:1250,max:1350, color:"#38bdf8"},
  ammonia:   {min:0,   max:0,    color:"#f87171"},
};

const NAV = [
  {id:"Dashboard",   icon:"📊"},
  {id:"Parameters",  icon:"💧"},
  {id:"Maintenance", icon:"🔧"},
  {id:"Livestock",   icon:"🐟"},
  {id:"My Tanks",    icon:"🪸"},
  {id:"Diary",       icon:"📓"},
  {id:"Manage Tanks",icon:"⚙️"},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return "";
  return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
}
function nowTs() {
  return new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function daysAlive(dateAdded) {
  if (!dateAdded) return 0;
  return Math.floor((new Date()-new Date(dateAdded))/86400000);
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  inp: {width:"100%",background:"#07111f",border:"1px solid #1e3a5f",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:14,outline:"none"},
  sel: {width:"100%",background:"#07111f",border:"1px solid #1e3a5f",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:14,outline:"none"},
  btn: {background:"linear-gradient(135deg,#0369a1,#0ea5e9)",border:"none",borderRadius:10,padding:"12px 28px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"},
  card:{background:"#0d1a2d",border:"1px solid #1e3a5f",borderRadius:14,padding:20},
};

function Field({label,children}) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

function Spinner({msg="Loading from database…"}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40,color:"#334155",fontSize:13}}>
      <div style={{width:22,height:22,border:"2px solid #1e3a5f",borderTopColor:"#38bdf8",borderRadius:"50%",marginRight:12,animation:"spin 0.8s linear infinite"}}/>
      {msg}
    </div>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { max-width: 100vw; overflow-x: hidden; }
  input, select, textarea { color-scheme: dark; font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d1526; }
  ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive grid helpers ── */
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-6 { display: grid; grid-template-columns: repeat(6,1fr); gap: 10px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
  .grid-2-1 { display: grid; grid-template-columns: 260px 1fr; gap: 16px; }

  @media (max-width: 768px) {
    .grid-3 { grid-template-columns: 1fr !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-6 { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
    .grid-4 { grid-template-columns: repeat(2,1fr) !important; }
    .grid-2-1 { grid-template-columns: 1fr !important; }
    .hide-mobile { display: none !important; }
    .nav-desktop { display: none !important; }
    .nav-mobile { display: flex !important; }
    .header-ts { display: none !important; }
    .ls-table-row { grid-template-columns: 1fr 1fr 60px 80px !important; }
    .ls-table-col-hide { display: none !important; }
  }
  @media (min-width: 769px) {
    .nav-mobile { display: none !important; }
  }
`;

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState("Dashboard");
  const [tanks, setTanks]       = useState(FALLBACK_TANKS);
  const [params, setParams]     = useState([]);
  const [diary, setDiary]       = useState([]);
  const [lsLog, setLsLog]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTank, setActiveTank] = useState("");
  const [toast, setToast]       = useState(null);
  const [toastType, setToastType] = useState("success");
  const [menuOpen, setMenuOpen] = useState(false);

  function showToast(msg, type="success") {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(null), 3200);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, pRes, dRes, lRes] = await Promise.all([
        supabase.from("tanks").select("*").order("setup_date", {ascending:true}),
        supabase.from("parameters").select("*").order("date", {ascending:true}),
        supabase.from("diary").select("*").order("date", {ascending:false}),
        supabase.from("livestock").select("*").order("date_added", {ascending:true}),
      ]);
      const tankData = (tRes.data && tRes.data.length > 0) ? tRes.data : FALLBACK_TANKS;
      setTanks(tankData);
      if (!activeTank && tankData.length > 0) setActiveTank(tankData[tankData.length-1].name || tankData[tankData.length-1].id);
      setParams(pRes.data || []);
      setDiary(dRes.data || []);
      setLsLog(lRes.data || []);
    } catch (err) {
      showToast("Load error: "+err.message, "error");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Set default active tank once tanks load
  useEffect(() => {
    if (!activeTank && tanks.length > 0) {
      setActiveTank(tanks[tanks.length-1].name || tanks[tanks.length-1].id);
    }
  }, [tanks]);

  function tankName(t) { return t.name || t.id; }

  const pageProps = { tanks, params, setParams, diary, setDiary, lsLog, setLsLog, activeTank, setActiveTank, showToast, setTanks, tankName, loadAll };

  return (
    <div style={{minHeight:"100vh",background:"#080d1a",color:"#e2e8f0",fontFamily:"'DM Sans','Segoe UI',sans-serif",maxWidth:"100vw",overflowX:"hidden"}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Desktop Header ── */}
      <header style={{background:"linear-gradient(135deg,#0a1628,#0d2040)",borderBottom:"1px solid #1e3a5f",padding:"0 16px",display:"flex",alignItems:"center",gap:12,height:52,position:"sticky",top:0,zIndex:100,maxWidth:"100vw"}}>
        <span style={{fontSize:22}}>🐠</span>
        <span style={{fontWeight:700,fontSize:16,color:"#7dd3fc",whiteSpace:"nowrap"}}>AquaLog</span>
        <span style={{color:"#334155"}} className="hide-mobile">|</span>

        {/* Desktop nav */}
        <nav className="nav-desktop" style={{display:"flex",gap:2,flexWrap:"nowrap",overflow:"hidden"}}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{background:page===n.id?"rgba(56,189,248,0.15)":"transparent",color:page===n.id?"#7dd3fc":"#64748b",border:page===n.id?"1px solid rgba(56,189,248,0.3)":"1px solid transparent",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>
              {n.icon} {n.id}
            </button>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button className="nav-mobile" onClick={() => setMenuOpen(v=>!v)}
          style={{background:"none",border:"1px solid #1e3a5f",borderRadius:8,color:"#7dd3fc",cursor:"pointer",padding:"6px 10px",fontSize:18,marginLeft:4}}>
          {menuOpen ? "✕" : "☰"}
        </button>

        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <button onClick={loadAll} style={{background:"none",border:"1px solid #1e3a5f",borderRadius:8,color:"#475569",cursor:"pointer",padding:"4px 10px",fontSize:12,whiteSpace:"nowrap"}}>↻</button>
          <span className="header-ts" style={{fontSize:10,color:"#334155",whiteSpace:"nowrap"}}>{nowTs()}</span>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div style={{background:"#0a1628",borderBottom:"1px solid #1e3a5f",padding:"8px 12px",display:"flex",flexDirection:"column",gap:4,position:"sticky",top:52,zIndex:99}}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => {setPage(n.id);setMenuOpen(false);}}
              style={{background:page===n.id?"rgba(56,189,248,0.15)":"transparent",color:page===n.id?"#7dd3fc":"#94a3b8",border:"none",borderRadius:8,padding:"10px 14px",cursor:"pointer",fontSize:14,fontWeight:600,textAlign:"left"}}>
              {n.icon} {n.id}
            </button>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:toastType==="error"?"#7f1d1d":"#0f7a4a",color:"#fff",padding:"10px 22px",borderRadius:10,fontWeight:600,zIndex:999,boxShadow:"0 8px 32px rgba(0,0,0,.5)",whiteSpace:"nowrap",maxWidth:"90vw",textOverflow:"ellipsis",overflow:"hidden"}}>
          {toastType==="error"?"⚠ ":"✓ "}{toast}
        </div>
      )}

      {/* Main content */}
      <main style={{maxWidth:1320,margin:"0 auto",padding:"16px",width:"100%"}}>
        {loading ? <Spinner/> : (
          <>
            {page==="Dashboard"    && <Dashboard    {...pageProps}/>}
            {page==="Parameters"   && <LogParams    {...pageProps}/>}
            {page==="Maintenance"  && <LogMaint     {...pageProps}/>}
            {page==="Livestock"    && <LogLivestock {...pageProps}/>}
            {page==="My Tanks"     && <MyTanks      {...pageProps}/>}
            {page==="Diary"        && <DiaryPage    {...pageProps}/>}
            {page==="Manage Tanks" && <ManageTanks  {...pageProps}/>}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({tanks,params,diary,lsLog,activeTank,setActiveTank,tankName}) {
  const tank  = tanks.find(t => (t.name||t.id)===activeTank);
  const isSW  = tank?.type==="saltwater";
  const pKeys = isSW ? SW_PARAMS : FW_PARAMS;
  const color = getTankColor(activeTank, tanks);

  const allTP      = params.filter(p=>p.tank===activeTank).sort((a,b)=>b.date.localeCompare(a.date));
  const latest     = allTP[0];
  const recent     = params.filter(p=>p.tank===activeTank&&p.date>=FOUR_WEEKS_AGO).sort((a,b)=>a.date.localeCompare(b.date));
  const recentDiary= diary.filter(d=>d.tank===activeTank&&d.date>=FOUR_WEEKS_AGO).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const liveTankLS = lsLog.filter(l=>l.tank===activeTank&&l.status==="Live");
  const totalLive  = liveTankLS.reduce((s,l)=>s+(l.qty||1),0);

  return (
    <div>
      {/* All tanks quick status */}
      <div style={{...S.card,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#cbd5e1"}}>All Tanks — Quick Status</div>
        <div className="grid-6">
          {tanks.map(t => {
            const tn    = tankName(t);
            const tc    = getTankColor(tn, tanks);
            const last  = params.filter(p=>p.tank===tn).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const liveC = lsLog.filter(l=>l.tank===tn&&l.status==="Live").reduce((s,l)=>s+(l.qty||1),0);
            const isAct = activeTank===tn;
            return (
              <button key={tn} onClick={()=>setActiveTank(tn)} style={{background:isAct?`${tc}18`:"#07111f",border:`1.5px solid ${isAct?tc:tc+"44"}`,borderRadius:12,padding:"10px 8px",cursor:"pointer",textAlign:"left",width:"100%"}}>
                <div style={{fontSize:16,marginBottom:2}}>{t.type==="saltwater"?"🪸":"🐡"}</div>
                <div style={{fontSize:11,fontWeight:700,color:tc,marginBottom:2,lineHeight:1.3,wordBreak:"break-word"}}>{tn}</div>
                <div style={{fontSize:10,color:"#475569",marginBottom:2}}>{t.volume_gal||t.size} · {liveC} live</div>
                {last?.nitrate!=null&&<div style={{fontSize:10,color:last.nitrate<=20?"#4ade80":"#f87171"}}>NO₃ {last.nitrate}{last.nitrate<=20?" ✓":" ⚠"}</div>}
                {last?.date&&<div style={{fontSize:9,color:"#334155",marginTop:1}}>Last: {fmt(last.date)}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tank strip */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {tanks.map(t=>{
          const tn=tankName(t), tc=getTankColor(tn,tanks);
          return (
            <button key={tn} onClick={()=>setActiveTank(tn)} style={{background:activeTank===tn?`${tc}22`:"#0d1a2d",border:`1.5px solid ${activeTank===tn?tc:"#1e3a5f"}`,borderRadius:10,padding:"6px 12px",cursor:"pointer",color:activeTank===tn?tc:"#64748b",fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>
              {t.type==="saltwater"?"🪸":"🐡"} {tn}
            </button>
          );
        })}
      </div>

      {/* 3 info cards */}
      <div className="grid-3" style={{marginBottom:14}}>
        {/* Tank info */}
        <div style={{...S.card,borderTop:`3px solid ${color}`}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Tank Info</div>
          <div style={{fontSize:17,fontWeight:700,color,marginBottom:2}}>{activeTank}</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:2}}>{isSW?"🐠 Saltwater":"🐟 Freshwater"} · {tank?.volume_gal ? tank.volume_gal+"G" : tank?.size}</div>
          {tank?.dimensions && <div style={{fontSize:11,color:"#475569",marginBottom:2}}>📐 {tank.dimensions}</div>}
          {tank?.brand      && <div style={{fontSize:11,color:"#475569",marginBottom:2}}>🏷 {tank.brand}</div>}
          {tank?.equipment  && <div style={{fontSize:11,color:"#64748b",marginBottom:2}}>⚙️ {tank.equipment}</div>}
          <div style={{fontSize:11,color:"#475569",marginBottom:10}}>Since {fmt(tank?.setup_date||tank?.setup)}</div>
          <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",marginBottom:5}}>Live ({totalLive})</div>
          <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:150,overflowY:"auto"}}>
            {liveTankLS.map((l,i)=>(
              <div key={l.id||i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",background:"#07111f",borderRadius:5,padding:"3px 8px"}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:6}}>{l.qty>1?`${l.qty}× `:""}{l.name}</span>
                <span style={{color:"#475569",fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>{daysAlive(l.date_added)}d</span>
              </div>
            ))}
            {liveTankLS.length===0&&<div style={{fontSize:11,color:"#334155"}}>No livestock recorded.</div>}
          </div>
        </div>

        {/* Latest readings */}
        <div style={S.card}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>
            Latest Readings {latest&&<span style={{color:"#475569",fontWeight:400}}>· {fmt(latest.date)}</span>}
          </div>
          {latest ? (
            <div className="grid-2">
              {pKeys.filter(p=>latest[p]!=null).map(p=>{
                const v=latest[p],safe=PARAM_SAFE[p],ok=v>=safe.min&&v<=safe.max;
                return (
                  <div key={p} style={{background:"#07111f",borderRadius:8,padding:"8px 10px"}}>
                    <div style={{fontSize:10,color:"#475569",marginBottom:2}}>{PARAM_LABELS[p]}</div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:16,fontWeight:700,color:ok?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>{v}</span>
                      <span style={{fontSize:11,color:ok?"#4ade80":"#f87171"}}>{ok?"✓":"⚠"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ):<div style={{color:"#475569",fontSize:13}}>No readings yet.</div>}
        </div>

        {/* Recent maintenance */}
        <div style={S.card}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Maintenance — Last 4 Weeks</div>
          {recentDiary.length>0 ? recentDiary.map((d,i)=>(
            <div key={d.id||i} style={{borderBottom:i<recentDiary.length-1?"1px solid #0f2035":"none",paddingBottom:6,marginBottom:6}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                <span style={{fontSize:10,background:`${CAT_COLORS[d.category]||"#64748b"}22`,color:CAT_COLORS[d.category]||"#64748b",borderRadius:4,padding:"1px 6px",fontWeight:600}}>{d.category}</span>
                <span style={{fontSize:10,color:"#334155"}}>{fmt(d.date)}</span>
              </div>
              <div style={{fontSize:11,color:"#94a3b8",lineHeight:1.4}}>{d.notes}</div>
            </div>
          )):<div style={{color:"#475569",fontSize:13}}>No activity in last 4 weeks.</div>}
        </div>
      </div>

      {/* Trend charts */}
      <div style={S.card}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:3,color:"#cbd5e1"}}>Parameter Trends — Last 4 Weeks</div>
        <div style={{fontSize:11,color:"#475569",marginBottom:14}}>{recent.length===0?"No readings in last 4 weeks.":`${recent.length} readings · ${fmt(recent[0]?.date)} → ${fmt(recent[recent.length-1]?.date)}`}</div>
        {recent.length>0 ? (
          <div className="grid-2">
            {pKeys.map(param=>{
              const data=recent.filter(p=>p[param]!=null).map(p=>({date:fmt(p.date),value:Number(p[param])}));
              if(!data.length) return null;
              const col=PARAM_SAFE[param]?.color||"#38bdf8";
              return (
                <div key={param}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:4}}>{PARAM_LABELS[param]}</div>
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={data} margin={{top:4,right:6,left:-24,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f2035"/>
                      <XAxis dataKey="date" tick={{fill:"#475569",fontSize:9}}/>
                      <YAxis tick={{fill:"#475569",fontSize:9}}/>
                      <Tooltip contentStyle={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:8,fontSize:11}}/>
                      <Line type="monotone" dataKey="value" stroke={col} strokeWidth={2} dot={{fill:col,r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        ):<div style={{color:"#334155",fontSize:13,padding:"12px 0"}}>Log readings to see trends.</div>}
      </div>
    </div>
  );
}

// ─── Log Parameters ───────────────────────────────────────────────────────────
function LogParams({tanks,params,setParams,showToast,tankName}) {
  const [tank,  setTank]  = useState("");
  const [date,  setDate]  = useState(TODAY_STR);
  const [vals,  setVals]  = useState({});
  const [notes, setNotes] = useState("");
  const [saving,setSaving]= useState(false);

  useEffect(()=>{ if(tanks.length&&!tank) setTank(tankName(tanks[0])); },[tanks]);

  const isSW  = tanks.find(t=>tankName(t)===tank)?.type==="saltwater";
  const pKeys = isSW ? SW_PARAMS : FW_PARAMS;
  const last  = params.filter(p=>p.tank===tank).sort((a,b)=>b.date.localeCompare(a.date))[0];

  async function submit() {
    setSaving(true);
    const entry={date,tank,notes:notes||null};
    pKeys.forEach(p=>{if(vals[p]!==""&&vals[p]!==undefined)entry[p]=parseFloat(vals[p]);});
    const {data,error}=await supabase.from("parameters").insert([entry]).select().single();
    if(error){showToast("Save failed: "+error.message,"error");}
    else{setParams(prev=>[...prev,data]);setVals({});setNotes("");showToast("Parameters saved!");}
    setSaving(false);
  }

  return (
    <div style={{maxWidth:720,width:"100%"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Parameters</div><div style={{fontSize:13,color:"#475569"}}>Record water chemistry readings</div></div>
      <div style={{...S.card,borderRadius:16,padding:20}}>
        <div className="grid-2" style={{marginBottom:16}}>
          <Field label="Tank"><select value={tank} onChange={e=>{setTank(e.target.value);setVals({});}} style={S.sel}>{tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{t.type==="saltwater"?"🪸":"🐡"} {tankName(t)}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp}/></Field>
        </div>
        <div style={{fontSize:11,color:"#334155",marginBottom:16,fontFamily:"'DM Mono',monospace"}}>📍 {nowTs()}</div>
        {last&&<div style={{background:"#07111f",borderRadius:8,padding:"8px 12px",marginBottom:16,fontSize:11,color:"#64748b"}}><span style={{fontWeight:600,color:"#475569"}}>Last:</span> {fmt(last.date)} · {pKeys.filter(p=>last[p]!=null).map(p=>`${p}: ${last[p]}`).join(" · ")}</div>}
        <div className="grid-2" style={{marginBottom:16}}>
          {pKeys.map(p=>{
            const v=vals[p],n=parseFloat(v),safe=PARAM_SAFE[p];
            const ok=v!==""&&v!==undefined&&!isNaN(n)?(n>=safe.min&&n<=safe.max):null;
            return (
              <Field key={p} label={PARAM_LABELS[p]}>
                <div style={{position:"relative"}}>
                  <input type="number" step="0.01" placeholder={`Safe: ${safe.min}–${safe.max}`} value={v||""} onChange={e=>setVals(prev=>({...prev,[p]:e.target.value}))} style={{...S.inp,borderColor:ok===false?"#f87171":ok===true?"#4ade80":"#1e3a5f",paddingRight:28}}/>
                  {ok!==null&&<span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13}}>{ok?"✓":"⚠"}</span>}
                </div>
              </Field>
            );
          })}
        </div>
        <Field label="Notes (optional)"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Observations..." style={{...S.inp,resize:"vertical",marginBottom:16}}/></Field>
        <button onClick={submit} disabled={saving} style={{...S.btn,opacity:saving?0.6:1,width:"100%"}}>{saving?"💾 Saving…":"💧 Save Parameters"}</button>
      </div>
    </div>
  );
}

// ─── Log Maintenance ──────────────────────────────────────────────────────────
function LogMaint({tanks,diary,setDiary,showToast,tankName}) {
  const [tank, setTank]   = useState("");
  const [date, setDate]   = useState(TODAY_STR);
  const [cat,  setCat]    = useState("Water Change");
  const [pct,  setPct]    = useState("");
  const [notes,setNotes]  = useState("");
  const [saving,setSaving]= useState(false);
  const CATS=["Water Change","Maintenance","LiveStock","Dosage","Feeding","Other"];

  useEffect(()=>{ if(tanks.length&&!tank) setTank(tankName(tanks[0])); },[tanks]);

  async function submit() {
    setSaving(true);
    const n=cat==="Water Change"&&pct?`${pct}% Water Changed. ${notes}`.trim():notes;
    const {data,error}=await supabase.from("diary").insert([{date,tank,category:cat,notes:n||null}]).select().single();
    if(error){showToast("Save failed: "+error.message,"error");}
    else{setDiary(prev=>[data,...prev]);setNotes("");setPct("");showToast("Maintenance logged!");}
    setSaving(false);
  }

  const recent=diary.filter(d=>d.tank===tank&&d.date>=FOUR_WEEKS_AGO).slice(0,6);

  return (
    <div style={{maxWidth:720,width:"100%"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Maintenance</div><div style={{fontSize:13,color:"#475569"}}>Record maintenance activities</div></div>
      <div style={{...S.card,borderRadius:16,padding:20}}>
        <div className="grid-2" style={{marginBottom:16}}>
          <Field label="Tank"><select value={tank} onChange={e=>setTank(e.target.value)} style={S.sel}>{tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{t.type==="saltwater"?"🪸":"🐡"} {tankName(t)}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp}/></Field>
        </div>
        <div style={{fontSize:11,color:"#334155",marginBottom:16,fontFamily:"'DM Mono',monospace"}}>📍 {nowTs()}</div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Category</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{CATS.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?`${CAT_COLORS[c]||"#64748b"}22`:"#07111f",border:`1.5px solid ${cat===c?CAT_COLORS[c]||"#64748b":"#1e3a5f"}`,color:cat===c?CAT_COLORS[c]||"#64748b":"#64748b",borderRadius:18,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>{c}</button>)}</div>
        </div>
        {cat==="Water Change"&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:7}}>Water Change %</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {[10,15,20,25,30,50,80,100].map(p=><button key={p} onClick={()=>setPct(p.toString())} style={{background:pct===p.toString()?"#1e3a5f":"#07111f",border:`1px solid ${pct===p.toString()?"#38bdf8":"#1e3a5f"}`,color:pct===p.toString()?"#7dd3fc":"#64748b",borderRadius:7,padding:"5px 9px",cursor:"pointer",fontSize:11,fontWeight:600}}>{p}%</button>)}
              <input type="number" placeholder="%" value={pct} onChange={e=>setPct(e.target.value)} style={{...S.inp,width:60}}/>
            </div>
          </div>
        )}
        <Field label="Notes"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="What did you do?" style={{...S.inp,resize:"vertical",marginBottom:16}}/></Field>
        <button onClick={submit} disabled={saving} style={{...S.btn,opacity:saving?0.6:1,width:"100%"}}>{saving?"💾 Saving…":"🔧 Save Log"}</button>
      </div>
      {recent.length>0&&(
        <div style={{...S.card,marginTop:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"#cbd5e1",marginBottom:10}}>Last 4 Weeks — {tank}</div>
          {recent.map((d,i)=>(
            <div key={d.id||i} style={{display:"flex",gap:8,borderBottom:"1px solid #0f2035",paddingBottom:6,marginBottom:6}}>
              <span style={{fontSize:10,background:`${CAT_COLORS[d.category]||"#64748b"}22`,color:CAT_COLORS[d.category]||"#64748b",borderRadius:4,padding:"2px 7px",fontWeight:600,whiteSpace:"nowrap",marginTop:1}}>{d.category}</span>
              <div><div style={{fontSize:10,color:"#475569",marginBottom:1}}>{fmt(d.date)}</div><div style={{fontSize:11,color:"#94a3b8"}}>{d.notes}</div></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Log Livestock ────────────────────────────────────────────────────────────
function LogLivestock({tanks,lsLog,setLsLog,showToast,tankName}) {
  const [tab,setTab]=useState("add");
  return (
    <div>
      <div style={{marginBottom:18}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Livestock</div><div style={{fontSize:13,color:"#475569"}}>Track additions, losses, and transfers</div></div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[["add","➕ Add Entry"],["view","📋 View All"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{background:tab===k?"rgba(56,189,248,0.15)":"#0d1a2d",border:`1.5px solid ${tab===k?"#38bdf8":"#1e3a5f"}`,color:tab===k?"#7dd3fc":"#64748b",borderRadius:10,padding:"7px 18px",cursor:"pointer",fontSize:13,fontWeight:700}}>{l}</button>
        ))}
      </div>
      {tab==="add"&&<LSAdd  tanks={tanks} lsLog={lsLog} setLsLog={setLsLog} showToast={showToast} tankName={tankName}/>}
      {tab==="view"&&<LSView tanks={tanks} lsLog={lsLog} setLsLog={setLsLog} showToast={showToast} tankName={tankName}/>}
    </div>
  );
}

function LSAdd({tanks,lsLog,setLsLog,showToast,tankName}) {
  const firstTank = tanks.length ? tankName(tanks[0]) : "";
  const blank={tank:firstTank,event:"Added",name:"",qty:1,type:"",dateAdded:TODAY_STR,dateDied:"",moveTo:"",comments:""};
  const [f,setF]=useState(blank);
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  useEffect(()=>{ if(tanks.length&&!f.tank) set("tank",tankName(tanks[0])); },[tanks]);

  const allNames=[...new Set(lsLog.map(l=>l.name))].sort();
  const tankLS=lsLog.filter(l=>l.tank===f.tank&&l.status==="Live");

  async function submit() {
    if(!f.name.trim()){showToast("Please enter a name","error");return;}
    setSaving(true);
    let error;
    if(f.event==="Added"){
      const res=await supabase.from("livestock").insert([{tank:f.tank,name:f.name.trim(),qty:Number(f.qty),type:f.type||"Unknown",date_added:f.dateAdded,status:"Live",comments:f.comments||null}]).select().single();
      error=res.error;
      if(!error){setLsLog(prev=>[...prev,res.data]);showToast(`${f.name} added!`);}
    } else if(f.event==="Died"||f.event==="Donated/Removed"){
      const status=f.event==="Died"?"Died":"Removed";
      const res=await supabase.from("livestock").update({status,date_died:f.dateDied||TODAY_STR}).eq("tank",f.tank).eq("name",f.name).eq("status","Live").select();
      error=res.error;
      if(!error){setLsLog(prev=>prev.map(l=>l.tank===f.tank&&l.name===f.name&&l.status==="Live"?{...l,status,date_died:f.dateDied||TODAY_STR}:l));showToast(`${f.name} marked as ${status}.`);}
    } else if(f.event==="Moved Between Tanks"&&f.moveTo){
      const res=await supabase.from("livestock").update({tank:f.moveTo,comments:`Moved from ${f.tank} on ${TODAY_STR}`}).eq("tank",f.tank).eq("name",f.name).eq("status","Live").select();
      error=res.error;
      if(!error){setLsLog(prev=>prev.map(l=>l.tank===f.tank&&l.name===f.name&&l.status==="Live"?{...l,tank:f.moveTo}:l));showToast(`${f.name} moved to ${f.moveTo}.`);}
    }
    if(error)showToast("Save failed: "+error.message,"error");
    setSaving(false); setF({...blank,tank:f.tank});
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div className="grid-2-1">
        <div style={{...S.card,borderRadius:14,padding:18}}>
          <Field label="Tank"><select value={f.tank} onChange={e=>set("tank",e.target.value)} style={S.sel}>{tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{t.type==="saltwater"?"🪸":"🐡"} {tankName(t)}</option>)}</select></Field>
          <div style={{fontSize:11,color:"#334155",fontFamily:"'DM Mono',monospace"}}>{nowTs()}</div>
        </div>
        <div style={{...S.card,borderRadius:14,padding:18}}>
          <div style={{fontSize:12,fontWeight:700,color:"#cbd5e1",marginBottom:10}}>🐟 Current Residents — <span style={{color:getTankColor(f.tank,tanks)}}>{f.tank}</span></div>
          {tankLS.length>0?(
            <div className="grid-2">
              {tankLS.map((l,i)=>(
                <div key={l.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#07111f",borderRadius:8,padding:"7px 10px"}}>
                  <div><div style={{fontSize:12,color:"#e2e8f0",fontWeight:600}}>{l.qty>1?`${l.qty}× `:""}{l.name}</div><div style={{fontSize:10,color:"#475569"}}>{l.type} · {daysAlive(l.date_added)}d</div></div>
                  <span style={{fontSize:10,background:"rgba(74,222,128,0.15)",color:"#4ade80",borderRadius:4,padding:"2px 6px",fontWeight:600,marginLeft:6,whiteSpace:"nowrap"}}>Live</span>
                </div>
              ))}
            </div>
          ):<div style={{fontSize:12,color:"#334155"}}>No live entries yet.</div>}
        </div>
      </div>

      <div style={{...S.card,borderRadius:14,padding:18}}>
        <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>Event Type</div>
        <div className="grid-4">
          {LS_EVENTS.map(e=>{
            const cols={Added:"#4ade80",Died:"#f87171","Donated/Removed":"#fb923c","Moved Between Tanks":"#a78bfa"};
            const icons={Added:"➕",Died:"💀","Donated/Removed":"📦","Moved Between Tanks":"🔄"};
            const c=cols[e]||"#64748b";
            return <button key={e} onClick={()=>set("event",e)} style={{background:f.event===e?`${c}22`:"#07111f",border:`2px solid ${f.event===e?c:"#1e3a5f"}`,color:f.event===e?c:"#64748b",borderRadius:12,padding:"12px 8px",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}><span style={{fontSize:20}}>{icons[e]}</span><span style={{textAlign:"center",lineHeight:1.3}}>{e}</span></button>;
          })}
        </div>
      </div>

      <div style={{...S.card,borderRadius:16,padding:20}}>
        <div className="grid-2">
          <Field label={f.event==="Died"||f.event==="Donated/Removed"?"Date of Event":"Date Added"}>
            <input type="date" value={f.event==="Died"||f.event==="Donated/Removed"?(f.dateDied||TODAY_STR):f.dateAdded} onChange={e=>f.event==="Died"||f.event==="Donated/Removed"?set("dateDied",e.target.value):set("dateAdded",e.target.value)} style={S.inp}/>
          </Field>
          <Field label="Type / Category"><select value={f.type} onChange={e=>set("type",e.target.value)} style={S.sel}><option value="">— select —</option>{LS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
        </div>
        <div className="grid-2">
          <Field label="Name"><input list="ls-names" value={f.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Ocellaris Clownfish" style={S.inp}/><datalist id="ls-names">{allNames.map(n=><option key={n} value={n}/>)}</datalist></Field>
          <Field label="Quantity"><input type="number" min="1" value={f.qty} onChange={e=>set("qty",e.target.value)} style={S.inp}/></Field>
        </div>
        {f.event==="Moved Between Tanks"&&<Field label="Move To Tank"><select value={f.moveTo} onChange={e=>set("moveTo",e.target.value)} style={S.sel}><option value="">— select —</option>{tanks.filter(t=>tankName(t)!==f.tank).map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}</select></Field>}
        <Field label="Comments"><textarea value={f.comments} onChange={e=>set("comments",e.target.value)} rows={2} placeholder="Notes…" style={{...S.inp,resize:"vertical",marginBottom:14}}/></Field>
        <button onClick={submit} disabled={saving} style={{...S.btn,width:"100%",opacity:saving?0.6:1,background:f.event==="Died"?"linear-gradient(135deg,#7f1d1d,#ef4444)":f.event==="Donated/Removed"?"linear-gradient(135deg,#7c2d12,#f97316)":f.event==="Moved Between Tanks"?"linear-gradient(135deg,#4c1d95,#8b5cf6)":"linear-gradient(135deg,#14532d,#22c55e)"}}>
          {saving?"💾 Saving…":f.event==="Added"?"➕ Add to Tank":f.event==="Died"?"💀 Record Death":f.event==="Donated/Removed"?"📦 Record Removal":"🔄 Move Tank"}
        </button>
      </div>
    </div>
  );
}

function LSView({lsLog,setLsLog,showToast,tanks,tankName}) {
  const [fTank,setFTank]=useState("All");
  const [fStatus,setFStatus]=useState("Live");
  const [confirmId,setConfirmId]=useState(null);
  const [saving,setSaving]=useState(false);
  const statusColor={Live:"#4ade80",Died:"#f87171",Removed:"#fb923c"};

  const list=lsLog.filter(l=>fTank==="All"||l.tank===fTank).filter(l=>fStatus==="All"||l.status===fStatus).sort((a,b)=>(a.tank+a.name).localeCompare(b.tank+b.name));

  async function markDead(id) {
    setSaving(true);
    const {error}=await supabase.from("livestock").update({status:"Died",date_died:TODAY_STR}).eq("id",id);
    if(error)showToast("Update failed: "+error.message,"error");
    else{setLsLog(prev=>prev.map(l=>l.id===id?{...l,status:"Died",date_died:TODAY_STR}:l));showToast("Marked as deceased.");}
    setConfirmId(null);setSaving(false);
  }

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <select value={fTank} onChange={e=>setFTank(e.target.value)} style={{...S.sel,width:"auto"}}>
          <option value="All">All Tanks</option>
          {tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}
        </select>
        <div style={{display:"flex",gap:5"}}>
          {["All","Live","Died","Removed"].map(s=>{const c=statusColor[s]||"#64748b";return<button key={s} onClick={()=>setFStatus(s)} style={{background:fStatus===s?`${c}22`:"#0d1a2d",border:`1.5px solid ${fStatus===s?c:"#1e3a5f"}`,color:fStatus===s?c:"#64748b",borderRadius:8,padding:"5px 11px",cursor:"pointer",fontSize:12,fontWeight:600}}>{s}</button>;})}
        </div>
        <span style={{fontSize:12,color:"#475569",marginLeft:"auto"}}>{list.length} entries</span>
      </div>
      <div className="grid-4" style={{marginBottom:16}}>
        {[{label:"Total Live",val:lsLog.filter(l=>l.status==="Live").reduce((s,l)=>s+(l.qty||1),0),color:"#4ade80"},{label:"Tanks",val:tanks.length,color:"#38bdf8"},{label:"Died",val:lsLog.filter(l=>l.status==="Died").length,color:"#f87171"},{label:"Removed",val:lsLog.filter(l=>l.status==="Removed").length,color:"#fb923c"}].map(({label,val,color})=>(
          <div key={label} style={{...S.card,borderTop:`2px solid ${color}`,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",marginBottom:3}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{...S.card,padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#07111f",fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em"}}>
            <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700}}>Name</th>
            <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700}} className="ls-table-col-hide">Tank</th>
            <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700}} className="ls-table-col-hide">Type</th>
            <th style={{padding:"9px 14px",textAlign:"center",fontWeight:700}}>Qty</th>
            <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700}}>Added</th>
            <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700}} className="ls-table-col-hide">Died</th>
            <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700}}>Status</th>
          </tr></thead>
          <tbody>
            {list.length===0&&<tr><td colSpan={7} style={{padding:24,color:"#334155",textAlign:"center"}}>No entries match filters.</td></tr>}
            {list.map((l,i)=>(
              <tr key={l.id||i} style={{borderBottom:"1px solid #0f2035",background:i%2===0?"transparent":"rgba(7,17,31,0.4)"}}>
                <td style={{padding:"9px 14px"}}>
                  <div style={{fontWeight:600,color:"#e2e8f0"}}>{l.name}</div>
                  <div style={{fontSize:10,color:getTankColor(l.tank,tanks),marginTop:1}} className="hide-desktop">{l.tank}</div>
                </td>
                <td style={{padding:"9px 14px",color:getTankColor(l.tank,tanks),fontWeight:600}} className="ls-table-col-hide">{l.tank}</td>
                <td style={{padding:"9px 14px",color:"#64748b"}} className="ls-table-col-hide">{l.type}</td>
                <td style={{padding:"9px 14px",textAlign:"center",color:"#94a3b8",fontFamily:"'DM Mono',monospace"}}>{l.qty}</td>
                <td style={{padding:"9px 14px",color:"#475569"}}>{fmt(l.date_added)}</td>
                <td style={{padding:"9px 14px",color:l.date_died?"#f87171":"#334155"}} className="ls-table-col-hide">{l.date_died?fmt(l.date_died):"—"}</td>
                <td style={{padding:"9px 14px"}}>
                  {l.status==="Live"?(confirmId===l.id?(
                    <span style={{display:"flex",gap:4}}>
                      <button onClick={()=>markDead(l.id)} disabled={saving} style={{fontSize:10,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontWeight:700}}>✓</button>
                      <button onClick={()=>setConfirmId(null)} style={{fontSize:10,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:5,padding:"3px 7px",cursor:"pointer"}}>✕</button>
                    </span>
                  ):(
                    <button onClick={()=>setConfirmId(l.id)} style={{fontSize:10,background:"rgba(74,222,128,0.15)",border:"1px solid #4ade80",color:"#4ade80",borderRadius:6,padding:"3px 9px",cursor:"pointer",fontWeight:700}}>Live</button>
                  )):(
                    <span style={{fontSize:10,background:`${statusColor[l.status]||"#94a3b8"}22`,color:statusColor[l.status]||"#94a3b8",borderRadius:6,padding:"3px 9px",fontWeight:700}}>{l.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── My Tanks ─────────────────────────────────────────────────────────────────
function MyTanks({tanks,params,diary,lsLog,tankName}) {
  const [exp,setExp]=useState(null);
  return (
    <div>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>My Tanks</div><div style={{fontSize:13,color:"#475569"}}>{tanks.length} tanks · {tanks.filter(t=>t.type==="freshwater").length} freshwater · {tanks.filter(t=>t.type==="saltwater").length} saltwater</div></div>
      <div className="grid-2">
        {tanks.map(t=>{
          const tn=tankName(t),tc=getTankColor(tn,tanks);
          const ls=lsLog.filter(l=>l.tank===tn&&l.status==="Live");
          const total=ls.reduce((s,l)=>s+(l.qty||1),0);
          const last=params.filter(p=>p.tank===tn).sort((a,b)=>b.date.localeCompare(a.date))[0];
          const lDiary=diary.filter(d=>d.tank===tn)[0];
          const open=exp===tn;
          return (
            <div key={tn} style={{background:"#0d1a2d",border:"1px solid #1e3a5f",borderRadius:16,overflow:"hidden",borderTop:`3px solid ${tc}`}}>
              <div style={{padding:"16px 20px",borderBottom:"1px solid #0f2035"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:tc,marginBottom:2}}>{tn}</div>
                    <div style={{fontSize:12,color:"#64748b"}}>{t.type==="saltwater"?"🐠 Saltwater":"🐟 Freshwater"} · {t.volume_gal ? t.volume_gal+"G" : t.size}</div>
                    {t.dimensions&&<div style={{fontSize:11,color:"#475569",marginTop:2}}>📐 {t.dimensions}</div>}
                    {t.brand&&<div style={{fontSize:11,color:"#475569"}}>🏷 {t.brand}</div>}
                    {t.equipment&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>⚙️ {t.equipment}</div>}
                    <div style={{fontSize:11,color:"#475569",marginTop:2}}>Setup {fmt(t.setup_date||t.setup)}</div>
                  </div>
                  <div style={{fontSize:22}}>{t.type==="saltwater"?"🪸":"🐡"}</div>
                </div>
              </div>
              <div style={{padding:"12px 20px",borderBottom:"1px solid #0f2035"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>Live ({total})</div>
                  {ls.length>4&&<button onClick={()=>setExp(open?null:tn)} style={{fontSize:11,color:"#38bdf8",background:"none",border:"none",cursor:"pointer",padding:0}}>{open?"▲ less":"▼ all"}</button>}
                </div>
                {(open?ls:ls.slice(0,4)).map((l,i)=>(
                  <div key={l.id||i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#94a3b8",padding:"2px 0",borderBottom:"1px solid #0a1628"}}>
                    <span>{l.qty>1?`${l.qty}× `:""}{l.name}</span>
                    <span style={{color:"#475569",fontFamily:"'DM Mono',monospace"}}>{daysAlive(l.date_added)}d</span>
                  </div>
                ))}
                {!open&&ls.length>4&&<div style={{fontSize:10,color:"#334155",marginTop:3}}>+{ls.length-4} more</div>}
                {ls.length===0&&<div style={{fontSize:11,color:"#334155"}}>No livestock recorded.</div>}
              </div>
              <div style={{padding:"10px 20px",display:"flex",gap:20,flexWrap:"wrap"}}>
                <div><div style={{fontSize:9,color:"#334155",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Last Parameters</div><div style={{fontSize:11,color:"#64748b"}}>{last?fmt(last.date):"None"}</div></div>
                <div><div style={{fontSize:9,color:"#334155",fontWeight:600,textTransform:"uppercase",marginBottom:2}}>Last Maintenance</div><div style={{fontSize:11,color:"#64748b"}}>{lDiary?`${fmt(lDiary.date)} · ${lDiary.category}`:"None"}</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Diary ────────────────────────────────────────────────────────────────────
function DiaryPage({tanks,diary,tankName}) {
  const [fTank,setFTank]=useState("All");
  const [fCat,setFCat]=useState("All");
  const [only4w,setOnly4w]=useState(false);
  const cats=["All",...Array.from(new Set(diary.map(d=>d.category)))];
  const list=diary.filter(d=>fTank==="All"||d.tank===fTank).filter(d=>fCat==="All"||d.category===fCat).filter(d=>!only4w||d.date>=FOUR_WEEKS_AGO).sort((a,b)=>b.date.localeCompare(a.date));
  const grp={};list.forEach(d=>{if(!grp[d.date])grp[d.date]=[];grp[d.date].push(d);});
  return (
    <div>
      <div style={{marginBottom:18,display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:10}}>
        <div><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Maintenance Diary</div><div style={{fontSize:13,color:"#475569"}}>{list.length} entries</div></div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={()=>setOnly4w(v=>!v)} style={{background:only4w?"rgba(56,189,248,0.15)":"#0d1a2d",border:`1px solid ${only4w?"#38bdf8":"#1e3a5f"}`,color:only4w?"#7dd3fc":"#64748b",borderRadius:8,padding:"5px 11px",cursor:"pointer",fontSize:12,fontWeight:600}}>{only4w?"4 Weeks ✓":"4 Weeks"}</button>
          <select value={fTank} onChange={e=>setFTank(e.target.value)} style={{...S.sel,width:"auto"}}><option value="All">All Tanks</option>{tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}</select>
          <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{...S.sel,width:"auto"}}>{cats.map(c=><option key={c} value={c}>{c}</option>)}</select>
        </div>
      </div>
      {Object.entries(grp).map(([date,entries])=>(
        <div key={date} style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#475569",letterSpacing:".05em",textTransform:"uppercase",marginBottom:7,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#1e3a5f",display:"inline-block"}}></span>
            {new Date(date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {entries.map((e,i)=>(
              <div key={e.id||i} style={{background:"#0d1a2d",border:"1px solid #1e3a5f",borderRadius:10,padding:"10px 14px",display:"flex",gap:10,alignItems:"flex-start",borderLeft:`3px solid ${getTankColor(e.tank,tanks)||"#334155"}`}}>
                <div style={{minWidth:95}}>
                  <div style={{fontSize:11,fontWeight:700,color:getTankColor(e.tank,tanks)||"#94a3b8",marginBottom:2}}>{e.tank}</div>
                  <span style={{fontSize:10,background:`${CAT_COLORS[e.category]||"#64748b"}22`,color:CAT_COLORS[e.category]||"#64748b",borderRadius:4,padding:"2px 6px",fontWeight:600}}>{e.category}</span>
                </div>
                <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.5}}>{e.notes}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Manage Tanks ─────────────────────────────────────────────────────────────
function ManageTanks({tanks,setTanks,showToast,tankName,params,diary,lsLog}) {
  const blank={name:"",type:"freshwater",volume_gal:"",dimensions:"",brand:"",location:"",equipment:"",notes:"",setup_date:TODAY_STR};
  const [form,setForm]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [delConfirm,setDelConfirm]=useState(null);
  const [deleting,setDeleting]=useState(false);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  async function addTank() {
    if(!form.name.trim()){showToast("Tank name is required","error");return;}
    if(tanks.find(t=>tankName(t)===form.name.trim())){showToast("A tank with that name already exists","error");return;}
    setSaving(true);
    const entry={name:form.name.trim(),type:form.type,volume_gal:form.volume_gal?Number(form.volume_gal):null,dimensions:form.dimensions||null,brand:form.brand||null,location:form.location||null,equipment:form.equipment||null,notes:form.notes||null,setup_date:form.setup_date||TODAY_STR};
    const {data,error}=await supabase.from("tanks").insert([entry]).select().single();
    if(error){showToast("Save failed: "+error.message,"error");}
    else{setTanks(prev=>[...prev,data]);setForm(blank);showToast(`${data.name} added!`);}
    setSaving(false);
  }

  async function deleteTank(tn) {
    setDeleting(true);
    const {error}=await supabase.from("tanks").delete().eq("name",tn);
    if(error){showToast("Delete failed: "+error.message,"error");}
    else{setTanks(prev=>prev.filter(t=>tankName(t)!==tn));showToast(`${tn} removed.`);}
    setDelConfirm(null);setDeleting(false);
  }

  const typeOptions=[
    {val:"freshwater",label:"🐟 Freshwater"},
    {val:"saltwater", label:"🐠 Saltwater / Reef"},
    {val:"brackish",  label:"🌊 Brackish"},
    {val:"planted",   label:"🌱 Planted"},
    {val:"quarantine",label:"🏥 Quarantine"},
  ];

  return (
    <div>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Manage Tanks</div><div style={{fontSize:13,color:"#475569"}}>Add new tanks or remove existing ones</div></div>

      {/* Add new tank form */}
      <div style={{...S.card,borderRadius:16,padding:22,marginBottom:20,borderTop:"3px solid #38bdf8"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#7dd3fc",marginBottom:18}}>➕ Add New Tank</div>

        <div className="grid-2">
          <Field label="Tank Name *">
            <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. 75G Planted Tank" style={S.inp}/>
          </Field>
          <Field label="Type *">
            <select value={form.type} onChange={e=>set("type",e.target.value)} style={S.sel}>
              {typeOptions.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid-2">
          <Field label="Volume (Gallons)">
            <input type="number" value={form.volume_gal} onChange={e=>set("volume_gal",e.target.value)} placeholder="e.g. 75" style={S.inp}/>
          </Field>
          <Field label="Setup Date">
            <input type="date" value={form.setup_date} onChange={e=>set("setup_date",e.target.value)} style={S.inp}/>
          </Field>
        </div>

        <div className="grid-2">
          <Field label="Dimensions (L × W × H)">
            <input value={form.dimensions} onChange={e=>set("dimensions",e.target.value)} placeholder='e.g. 48" × 18" × 21"' style={S.inp}/>
          </Field>
          <Field label="Brand / Model">
            <input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder="e.g. Red Sea Reefer 250, Innovative Marine 20" style={S.inp}/>
          </Field>
        </div>

        <div className="grid-2">
          <Field label="Location in Home">
            <input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="e.g. Living Room, Office" style={S.inp}/>
          </Field>
          <Field label="Brand / Model">
            <input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder="e.g. Red Sea Reefer 250, Innovative Marine 20" style={S.inp}/>
          </Field>
        </div>

        <Field label="Equipment">
          <textarea value={form.equipment} onChange={e=>set("equipment",e.target.value)} rows={2}
            placeholder="e.g. Heater, Protein Skimmer, Return Pump, Wavemaker, Dosing Pump, UV Sterilizer…"
            style={{...S.inp,resize:"vertical"}}/>
        </Field>

        <Field label="Notes">
          <input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any other notes about this tank" style={S.inp}/>
        </Field>

        <button onClick={addTank} disabled={saving} style={{...S.btn,opacity:saving?0.6:1,marginTop:4,width:"100%"}}>
          {saving?"💾 Saving…":"➕ Add Tank"}
        </button>
      </div>

      {/* Existing tanks */}
      <div style={{fontSize:14,fontWeight:700,color:"#cbd5e1",marginBottom:14}}>Existing Tanks ({tanks.length})</div>
      <div className="grid-2">
        {tanks.map(t=>{
          const tn=tankName(t),tc=getTankColor(tn,tanks);
          const liveCount=lsLog.filter(l=>l.tank===tn&&l.status==="Live").reduce((s,l)=>s+(l.qty||1),0);
          const paramCount=params.filter(p=>p.tank===tn).length;
          const diaryCount=diary.filter(d=>d.tank===tn).length;
          return (
            <div key={tn} style={{...S.card,borderRadius:14,borderLeft:`3px solid ${tc}`,padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:tc,marginBottom:2}}>{tn}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{t.type==="saltwater"?"🐠 Saltwater":t.type==="brackish"?"🌊 Brackish":t.type==="planted"?"🌱 Planted":t.type==="quarantine"?"🏥 Quarantine":"🐟 Freshwater"} · {t.volume_gal?t.volume_gal+"G":t.size||"—"}</div>
                  {t.dimensions&&<div style={{fontSize:11,color:"#475569",marginTop:2}}>📐 {t.dimensions}</div>}
                  {t.brand&&<div style={{fontSize:11,color:"#475569"}}>🏷 {t.brand}</div>}
                  {t.location&&<div style={{fontSize:11,color:"#475569"}}>📍 {t.location}</div>}
                  <div style={{fontSize:11,color:"#475569",marginTop:2}}>Setup: {fmt(t.setup_date||t.setup)}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                  <div style={{display:"flex",gap:8,fontSize:10,color:"#475569"}}>
                    <span>🐟 {liveCount} live</span>
                    <span>💧 {paramCount} readings</span>
                    <span>🔧 {diaryCount} logs</span>
                  </div>
                  {delConfirm===tn ? (
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:11,color:"#f87171"}}>Delete all data?</span>
                      <button onClick={()=>deleteTank(tn)} disabled={deleting} style={{fontSize:11,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700}}>{deleting?"…":"Yes, delete"}</button>
                      <button onClick={()=>setDelConfirm(null)} style={{fontSize:11,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 10px",cursor:"pointer"}}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={()=>setDelConfirm(tn)} style={{fontSize:11,background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",color:"#f87171",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontWeight:600}}>🗑 Remove Tank</button>
                  )}
                </div>
              </div>
              {t.equipment&&<div style={{fontSize:11,color:"#64748b",background:"#07111f",borderRadius:6,padding:"6px 10px",marginTop:6}}><span style={{color:"#475569",fontWeight:600}}>⚙️ Equipment: </span>{t.equipment}</div>}
              {t.notes&&<div style={{fontSize:11,color:"#475569",background:"#07111f",borderRadius:6,padding:"6px 10px",marginTop:4}}>{t.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
