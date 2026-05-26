import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, ReferenceLine, Legend } from "recharts";

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
  alkalinity:{min:8,   max:12,   color:"#a78bfa"}, // saltwater dKH
  calcium:   {min:380, max:450,  color:"#fb923c"},
  magnesium: {min:1250,max:1350, color:"#38bdf8"},
  ammonia:   {min:0,   max:0,    color:"#f87171"},
};

// Freshwater alkalinity safe range is 3–10 dKH (after ppm→dKH conversion)
const ALK_SAFE_FW = {min:3, max:10, color:"#a78bfa"};

// Returns the correct safe range object for a param, accounting for FW/SW alk
function getSafe(param, isSW) {
  if (param === "alkalinity" && !isSW) return ALK_SAFE_FW;
  return PARAM_SAFE[param];
}

// ─── Grouped navigation ───────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {id:"Dashboard",    icon:"📊"},
    ]
  },
  {
    label: "Log Data",
    items: [
      {id:"Parameters",   icon:"💧"},
      {id:"Maintenance",  icon:"🔧"},
      {id:"Livestock",    icon:"🐟"},
    ]
  },
  {
    label: "AI & Analysis",
    items: [
      {id:"Insights",     icon:"🧠"},
      {id:"Bioload",      icon:"⚖️"},
    ]
  },
  {
    label: "Planning",
    items: [
      {id:"Scheduler",    icon:"📅"},
      {id:"Diary",        icon:"📓"},
    ]
  },
  {
    label: "Tanks",
    items: [
      {id:"My Tanks",     icon:"🪸"},
      {id:"Manage Tanks", icon:"⚙️"},
    ]
  },
];
// Flat list for mobile menu and routing
const NAV = NAV_GROUPS.flatMap(g => g.items);

// ─── Multi-axis chart pairs (correlated parameters) ───────────────────────────
const CHART_PAIRS = {
  freshwater: [
    { keys:["nitrate"],            label:"Nitrate" },
    { keys:["ph","alkalinity"],    label:"pH vs Alkalinity" },
    { keys:["ammonia"],            label:"Ammonia" },
  ],
  saltwater: [
    { keys:["nitrate","phosphate"],label:"Nitrate vs Phosphate" },
    { keys:["ph","alkalinity"],    label:"pH vs Alkalinity" },
    { keys:["calcium","magnesium"],label:"Calcium vs Magnesium" },
    { keys:["salinity"],           label:"Salinity" },
  ],
};

// ─── Date range options ───────────────────────────────────────────────────────
const DATE_RANGES = [
  {label:"7d",  days:7},
  {label:"30d", days:30},
  {label:"90d", days:90},
  {label:"All", days:9999},
];

// ─── Task categories ──────────────────────────────────────────────────────────
const TASK_CATS = ["Water Change","Filter","Skimmer","Dosing","Testing","Equipment","Coral","Other"];
const TASK_FREQS = [
  {label:"Daily",    days:1},
  {label:"Every 3d", days:3},
  {label:"Weekly",   days:7},
  {label:"Biweekly", days:14},
  {label:"Monthly",  days:30},
  {label:"Every 3mo",days:90},
  {label:"Custom",   days:0},
];

// ─── Statistics helpers ───────────────────────────────────────────────────────
function mean(arr) { return arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : 0; }
function stddev(arr) {
  if(arr.length<2) return 0;
  const m=mean(arr);
  return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/(arr.length-1));
}
function zScore(val,arr) {
  const sd=stddev(arr);
  return sd===0 ? 0 : Math.abs((val-mean(arr))/sd);
}
function linearRegression(points) {
  // points: [{x:dayIndex, y:value}]
  if(points.length<2) return null;
  const n=points.length;
  const sumX=points.reduce((s,p)=>s+p.x,0);
  const sumY=points.reduce((s,p)=>s+p.y,0);
  const sumXY=points.reduce((s,p)=>s+p.x*p.y,0);
  const sumX2=points.reduce((s,p)=>s+p.x**2,0);
  const denom=n*sumX2-sumX**2;
  if(denom===0) return null;
  const slope=(n*sumXY-sumX*sumY)/denom;
  const intercept=(sumY-slope*sumX)/n;
  return {slope,intercept};
}
function stabilityScore(values) {
  if(values.length<2) return null;
  const sd=stddev(values);
  const m=mean(values);
  if(m===0) return 100;
  const cv=(sd/m)*100; // coefficient of variation
  const score=Math.max(0,Math.min(100,100-cv*3));
  return Math.round(score);
}
function trendForecast(readings,param,daysAhead=7) {
  const vals=readings.filter(r=>r[param]!=null).map((r,i)=>({x:i,y:Number(r[param]),date:r.date}));
  if(vals.length<3) return null;
  const reg=linearRegression(vals);
  if(!reg) return null;
  const forecast=reg.intercept+reg.slope*(vals.length-1+daysAhead);
  const targetDate=new Date();
  targetDate.setDate(targetDate.getDate()+daysAhead);
  const dayName=targetDate.toLocaleDateString("en-US",{weekday:"long"});
  return {value:Math.round(forecast*100)/100, dayName, slope:reg.slope, daysAhead};
}
function rateOfChange(readings,param) {
  // Returns % change per reading over last 3 readings
  const vals=readings.filter(r=>r[param]!=null).map(r=>Number(r[param])).slice(-4);
  if(vals.length<2) return null;
  const recent=vals.slice(-2);
  const older=vals.slice(0,-2);
  if(!older.length) return null;
  const avgRecent=mean(recent);
  const avgOlder=mean(older);
  if(avgOlder===0) return null;
  return ((avgRecent-avgOlder)/avgOlder)*100;
}

// ─── Anomaly detection ────────────────────────────────────────────────────────
function detectAnomalies(tankReadings, param, newVal, isSW) {
  if(!newVal || isNaN(parseFloat(newVal))) return null;
  let v = parseFloat(newVal);
  // Convert FW alkalinity input (ppm) to dKH for comparison
  if(param === "alkalinity" && !isSW) v = Math.round(v * 0.056 * 100) / 100;
  const history = tankReadings.filter(r=>r[param]!=null).map(r=>{
    let val = Number(r[param]);
    if(param === "alkalinity" && !isSW) val = Math.round(val * 0.056 * 100) / 100;
    return val;
  });
  if(history.length < 3) return null;
  const z = zScore(v, history);
  const m = mean(history);
  const pct = m !== 0 ? Math.abs((v-m)/m)*100 : 0;
  if(z > 3) return { level:"critical", z:Math.round(z*10)/10, pct:Math.round(pct), avg:Math.round(m*100)/100 };
  if(z > 2) return { level:"warning",  z:Math.round(z*10)/10, pct:Math.round(pct), avg:Math.round(m*100)/100 };
  return null;
}

// ─── Smart AI Summary (calls Vercel proxy → Anthropic) ───────────────────────
async function fetchAISummary(tank, recentReadings, diaryEntries, lsLog) {
  const isSW = tank.type === "saltwater";
  const pKeys = isSW ? SW_PARAMS : FW_PARAMS;

  // Convert readings: for FW tanks, alkalinity ppm → dKH before any calculations
  const convertedReadings = recentReadings.map(r => {
    if (isSW || r.alkalinity == null) return r;
    return { ...r, alkalinity: Math.round(Number(r.alkalinity) * 0.056 * 100) / 100 };
  });

  const paramSummary = pKeys.map(p=>{
    const vals=convertedReadings.filter(r=>r[p]!=null).map(r=>Number(r[p]));
    if(!vals.length) return null;
    const forecast=trendForecast(convertedReadings,p,7);
    const stability=stabilityScore(vals);
    const roc=rateOfChange(convertedReadings,p);
    const safe=getSafe(p,isSW);
    const latest=vals[vals.length-1];
    return {
      param:p, label:PARAM_LABELS[p],
      latest:Math.round(latest*100)/100,
      stability, forecast,
      roc:roc?Math.round(roc*10)/10:null,
      outOfRange:latest<safe.min||latest>safe.max,
      safe:`${safe.min}–${safe.max}`,
      unit: p==="alkalinity" ? "dKH" : ""
    };
  }).filter(Boolean);

  const livestock=lsLog.filter(l=>l.tank===tank.name&&l.status==="Live").map(l=>l.name);
  const recentMaint=diaryEntries.filter(d=>d.tank===tank.name).slice(0,5).map(d=>`${d.date}: ${d.category} — ${d.notes}`).join("\n");

  const prompt = `You are an expert aquarium advisor. Analyze this tank data and give practical, specific advice in 3-4 bullet points. Be direct, conversational, and mention specific values. Focus on what needs attention.

Tank: ${tank.name} (${tank.type}, ${tank.volume_gal||"?"}G)
Live inhabitants: ${livestock.join(", ")||"unknown"}

Recent parameter data:
${paramSummary.map(p=>`- ${p.label}${p.unit?` (${p.unit})`:""}: latest=${p.latest}, avg=${p.avg}, stable=${p.stability}%${p.roc?`, trend=${p.roc>0?"+":""}${p.roc}%`:""}${p.outOfRange?" ⚠️ OUT OF RANGE":""}${p.forecast?`, forecast=${p.forecast.value} by ${p.forecast.dayName}`:""} (safe: ${p.safe})`).join("\n")}

Recent maintenance:
${recentMaint||"None logged"}

Instructions:
- Mention specific parameter values and what they mean for the inhabitants
- If any parameter is trending toward the danger zone, warn with the forecast
- If things look great, say so but suggest proactive steps
- Keep advice under 120 words total, use bullet points (•)
- Do NOT use markdown headers or bold`;

  const response = await fetch("/api/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d) {
  if (!d) return "";
  return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function fmtShort(d) {
  if (!d) return "";
  return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

// ─── Alkalinity conversion: freshwater measures in ppm, display as dKH ────────
// ppm × 0.056 = dKH
function alkDisplay(val, isSaltwater) {
  if (val == null) return null;
  if (isSaltwater) return { val: Number(val), unit: "dKH" };
  const dkh = Math.round(Number(val) * 0.056 * 100) / 100;
  return { val: dkh, unit: "dKH", raw: Number(val), rawUnit: "ppm" };
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

const TANK_ORDER = [
  "5G Betta Tank","10G GloFish Tank","20G Gold Fish Tank",
  "40G Community Tank","IM20 Reef Tank","RS250 Reef Tank",
];
function sortTanks(tanks) {
  return [...tanks].sort((a,b) => {
    const ai = TANK_ORDER.indexOf(a.name||a.id);
    const bi = TANK_ORDER.indexOf(b.name||b.id);
    if (ai === -1 && bi === -1) return (a.name||a.id).localeCompare(b.name||b.id);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { max-width: 100vw; overflow-x: hidden; }
  input, select, textarea { color-scheme: dark; font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d1526; }
  ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  nav::-webkit-scrollbar { display: none; }

  /* ── Responsive grid helpers ── */
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-6 { display: grid; grid-template-columns: repeat(6,1fr); gap: 10px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
  .grid-2-1 { display: grid; grid-template-columns: 260px 1fr; gap: 16px; }
  .sched-grid { display: grid; grid-template-columns: 1fr 380px; gap: 18px; align-items: start; }

  @media (max-width: 900px) {
    .sched-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 768px) {
    .grid-3 { grid-template-columns: 1fr !important; }
    .grid-2 { grid-template-columns: 1fr !important; }
    .grid-6 { grid-template-columns: repeat(2,1fr) !important; gap: 8px !important; }
    .grid-4 { grid-template-columns: repeat(2,1fr) !important; }
    .grid-2-1 { grid-template-columns: 1fr !important; }
    .sched-grid { grid-template-columns: 1fr !important; }
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

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:"100vh",background:"#080d1a",color:"#e2e8f0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"sans-serif"}}>
          <div style={{fontSize:40,marginBottom:16}}>🐠</div>
          <div style={{fontSize:18,fontWeight:700,color:"#f87171",marginBottom:8}}>Something went wrong</div>
          <div style={{fontSize:12,color:"#475569",background:"#07111f",borderRadius:8,padding:"12px 16px",maxWidth:400,wordBreak:"break-all",marginBottom:16}}>
            {this.state.error.message}
          </div>
          <button onClick={()=>window.location.reload()} style={{background:"#0369a1",border:"none",borderRadius:8,color:"#fff",padding:"10px 24px",cursor:"pointer",fontSize:14,fontWeight:700}}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState("Dashboard");
  const [tanks, setTanks]       = useState(FALLBACK_TANKS);
  const [params, setParams]     = useState([]);
  const [diary, setDiary]       = useState([]);
  const [lsLog, setLsLog]       = useState([]);
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeTank, setActiveTank] = useState(FALLBACK_TANKS[FALLBACK_TANKS.length-1].id);
  const [toast, setToast]       = useState(null);
  const [toastType, setToastType] = useState("success");
  const [menuOpen, setMenuOpen] = useState(false);

  function showToast(msg, type="success") {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(null), 3200);
  }

  // ── Request notification permission and schedule daily reminders ──
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Fire notifications for due/overdue tasks once per session ──
  useEffect(() => {
    if (!tasks.length) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const sessionKey = "aqualog_notified_" + TODAY_STR;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    const due   = tasks.filter(t => t.active && t.next_due === TODAY_STR);
    const overdue = tasks.filter(t => t.active && t.next_due && t.next_due < TODAY_STR);
    if (due.length > 0) {
      new Notification("🐠 AquaLog — Tasks Due Today", {
        body: due.map(t => `• ${t.title} (${t.tank})`).join("\n"),
        tag: "aqualog-due",
      });
    }
    if (overdue.length > 0) {
      setTimeout(() => {
        new Notification("⚠️ AquaLog — Overdue Tasks", {
          body: overdue.map(t => `• ${t.title} (${t.tank}) — ${Math.abs(Math.ceil((new Date(t.next_due+"T12:00:00")-new Date())/(1000*60*60*24)))}d overdue`).join("\n"),
          tag: "aqualog-overdue",
        });
      }, 2000);
    }
  }, [tasks]);

  const loadAll = useCallback(async () => {
    try {
      const [tRes, pRes, dRes, lRes, tkRes] = await Promise.all([
        supabase.from("tanks").select("*").order("setup_date", {ascending:true}),
        supabase.from("parameters").select("*").order("date", {ascending:true}),
        supabase.from("diary").select("*").order("date", {ascending:false}),
        supabase.from("livestock").select("*").order("date_added", {ascending:true}),
        supabase.from("tasks").select("*").order("next_due", {ascending:true}),
      ]);
      const tankData = (tRes.data && tRes.data.length > 0) ? sortTanks(tRes.data) : FALLBACK_TANKS;
      setTanks(tankData);
      setActiveTank(prev => {
        const exists = tankData.find(t => (t.name||t.id) === prev);
        return exists ? prev : (tankData[tankData.length-1].name || tankData[tankData.length-1].id);
      });
      setParams(pRes.data || []);
      setDiary(dRes.data || []);
      setLsLog(lRes.data || []);
      setTasks(tkRes.data || []);
    } catch (err) {
      showToast("Load error: "+err.message, "error");
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function tankName(t) { return t.name || t.id; }

  const pageProps = { tanks, params, setParams, diary, setDiary, lsLog, setLsLog, tasks, setTasks, activeTank, setActiveTank, showToast, setTanks, tankName, loadAll };

  return (
    <ErrorBoundary>
    <div style={{minHeight:"100vh",width:"100%",background:"#080d1a",color:"#e2e8f0",fontFamily:"'DM Sans','Segoe UI',sans-serif",overflowX:"hidden"}}>
      <style>{GLOBAL_CSS}</style>

      {/* ── Desktop Header ── */}
      <header style={{background:"linear-gradient(135deg,#0a1628,#0d2040)",borderBottom:"1px solid #1e3a5f",padding:"0 16px",display:"flex",alignItems:"center",gap:12,height:52,position:"sticky",top:0,zIndex:100,width:"100%"}}>
        <span style={{fontSize:22}}>🐠</span>
        <span style={{fontWeight:700,fontSize:16,color:"#7dd3fc",whiteSpace:"nowrap"}}>AquaLog</span>
        <span style={{color:"#334155"}} className="hide-mobile">|</span>

        {/* Desktop nav — grouped */}
        <nav className="nav-desktop" style={{display:"flex",gap:6,flexWrap:"nowrap",overflowX:"auto",overflowY:"hidden",scrollbarWidth:"none",msOverflowStyle:"none",flex:1,alignItems:"center"}}>
          {NAV_GROUPS.map((group,gi) => (
            <div key={group.label} style={{display:"flex",alignItems:"center",gap:1,background:"#07111f",borderRadius:9,padding:"2px",border:"1px solid #1e3a5f",flexShrink:0}}>
              {group.items.map(n => (
                <button key={n.id} onClick={() => setPage(n.id)} style={{
                  background:page===n.id?"rgba(56,189,248,0.2)":"transparent",
                  color:page===n.id?"#7dd3fc":"#64748b",
                  border:"none",
                  borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",
                  transition:"all .15s"
                }}>
                  {n.icon} {n.id}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button className="nav-mobile" onClick={() => setMenuOpen(v=>!v)}
          style={{background:"none",border:"1px solid #1e3a5f",borderRadius:8,color:"#7dd3fc",cursor:"pointer",padding:"6px 10px",fontSize:18,marginLeft:4}}>
          {menuOpen ? "✕" : "☰"}
        </button>

        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginLeft:8}}>
          <button onClick={loadAll} title="Refresh" style={{background:"none",border:"1px solid #1e3a5f",borderRadius:8,color:"#475569",cursor:"pointer",padding:"4px 10px",fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>↻</button>
          <span className="header-ts" style={{fontSize:10,color:"#334155",whiteSpace:"nowrap"}}>{nowTs()}</span>
        </div>
      </header>

      {/* Mobile dropdown menu — grouped */}
      {menuOpen && (
        <div style={{background:"#0a1628",borderBottom:"1px solid #1e3a5f",padding:"10px 14px",position:"sticky",top:52,zIndex:99}}>
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{marginBottom:8}}>
              <div style={{fontSize:10,color:"#334155",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginBottom:4,paddingLeft:6}}>{group.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {group.items.map(n => (
                  <button key={n.id} onClick={() => {setPage(n.id);setMenuOpen(false);}}
                    style={{background:page===n.id?"rgba(56,189,248,0.15)":"#07111f",color:page===n.id?"#7dd3fc":"#94a3b8",border:`1px solid ${page===n.id?"rgba(56,189,248,0.3)":"#1e3a5f"}`,borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:600}}>
                    {n.icon} {n.id}
                  </button>
                ))}
              </div>
            </div>
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
      <main style={{maxWidth:"100%",margin:"0 auto",padding:"16px 20px",width:"100%",boxSizing:"border-box"}}>
        <>
          {page==="Dashboard"    && <Dashboard    {...pageProps}/>}
          {page==="Insights"     && <Insights     {...pageProps}/>}
          {page==="Parameters"   && <LogParams    {...pageProps}/>}
          {page==="Maintenance"  && <LogMaint     {...pageProps}/>}
          {page==="Livestock"    && <LogLivestock {...pageProps}/>}
          {page==="Scheduler"    && <Scheduler    {...pageProps}/>}
          {page==="Bioload"      && <Bioload      {...pageProps}/>}
          {page==="My Tanks"     && <MyTanks      {...pageProps}/>}
          {page==="Diary"        && <DiaryPage    {...pageProps}/>}
          {page==="Manage Tanks" && <ManageTanks  {...pageProps}/>}
        </>
      </main>
    </div>
    </ErrorBoundary>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({tanks,params,diary,lsLog,tasks,activeTank,setActiveTank,tankName}) {
  const [rangeDays,setRangeDays]=useState(30);
  const tank =tanks.find(t=>(t.name||t.id)===activeTank);
  const isSW =tank?.type==="saltwater";
  const color=getTankColor(activeTank,tanks);
  const cutoff=(()=>{const d=new Date();d.setDate(d.getDate()-rangeDays);return d.toISOString().slice(0,10);})();
  const allTP=params.filter(p=>p.tank===activeTank).sort((a,b)=>b.date.localeCompare(a.date));
  const latest=allTP[0];
  const recent=params.filter(p=>p.tank===activeTank&&(rangeDays===9999||p.date>=cutoff)).sort((a,b)=>a.date.localeCompare(b.date));
  const recentDiary=diary.filter(d=>d.tank===activeTank&&d.date>=FOUR_WEEKS_AGO).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const liveTankLS=lsLog.filter(l=>l.tank===activeTank&&l.status==="Live");
  const totalLive=liveTankLS.reduce((s,l)=>s+(l.qty||1),0);
  const dueTasks=tasks.filter(t=>t.tank===activeTank&&t.active&&t.next_due&&t.next_due<=TODAY_STR);
  const chartPairs=isSW?CHART_PAIRS.saltwater:CHART_PAIRS.freshwater;
  // Convert latest reading for display — FW alk ppm → dKH
  const latestDisplay = latest ? {
    ...latest,
    alkalinity: (latest.alkalinity!=null && !isSW)
      ? Math.round(Number(latest.alkalinity)*0.056*100)/100
      : latest.alkalinity
  } : null;

  const alerts = latestDisplay ? Object.keys(PARAM_SAFE).filter(k=>{
    const v = latestDisplay[k];
    const safe = getSafe(k, isSW);
    return v!=null && (v<safe.min || v>safe.max);
  }).map(k => [k, getSafe(k, isSW)]) : [];

  return (
    <div>
      {alerts.length>0&&(
        <div style={{background:"rgba(248,113,113,0.08)",border:"1px solid #f87171",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{fontSize:12,fontWeight:700,color:"#f87171"}}>Parameter Alert — {activeTank}</span>
          {alerts.map(([k,safe])=>{
            const v=latestDisplay[k],over=v>safe.max;
            const unit=k==="alkalinity"?" dKH":"";
            return(
              <span key={k} style={{fontSize:11,background:"rgba(248,113,113,0.15)",color:"#f87171",borderRadius:6,padding:"2px 10px",fontWeight:600}}>
                {PARAM_LABELS[k]}{unit?` (${unit.trim()})`:""}: {v}{unit} {over?"↑ above":"↓ below"} {over?safe.max:safe.min}
              </span>
            );
          })}
        </div>
      )}
      {dueTasks.length>0&&(
        <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid #fbbf24",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
          <span style={{fontSize:16}}>📅</span>
          <span style={{fontSize:12,fontWeight:700,color:"#fbbf24"}}>{dueTasks.length} task{dueTasks.length>1?"s":""} overdue</span>
          {dueTasks.map(t=><span key={t.id} style={{fontSize:11,background:"rgba(251,191,36,0.15)",color:"#fbbf24",borderRadius:6,padding:"2px 10px",fontWeight:600}}>{t.title}</span>)}
        </div>
      )}

      <div style={{...S.card,marginBottom:14}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:"#cbd5e1"}}>All Tanks — Quick Status</div>
        <div className="grid-6">
          {tanks.map(t=>{
            const tn=tankName(t),tc=getTankColor(tn,tanks);
            const last=params.filter(p=>p.tank===tn).sort((a,b)=>b.date.localeCompare(a.date))[0];
            const liveC=lsLog.filter(l=>l.tank===tn&&l.status==="Live").reduce((s,l)=>s+(l.qty||1),0);
            const isAct=activeTank===tn;
            const isTankSW = t.type==="saltwater";
            const lastDisplay = last ? {
              ...last,
              alkalinity: (last.alkalinity!=null && !isTankSW)
                ? Math.round(Number(last.alkalinity)*0.056*100)/100
                : last.alkalinity
            } : null;
            const hasAlert=lastDisplay&&Object.keys(PARAM_SAFE).some(k=>{
              const safe=getSafe(k,isTankSW);
              return lastDisplay[k]!=null&&(lastDisplay[k]<safe.min||lastDisplay[k]>safe.max);
            });
            const dueC=tasks.filter(t=>t.tank===tn&&t.active&&t.next_due&&t.next_due<=TODAY_STR).length;
            return(
              <button key={tn} onClick={()=>setActiveTank(tn)} style={{background:isAct?`${tc}18`:"#07111f",border:`1.5px solid ${isAct?tc:tc+"44"}`,borderRadius:12,padding:"10px 8px",cursor:"pointer",textAlign:"left",width:"100%",position:"relative"}}>
                {hasAlert&&<span style={{position:"absolute",top:5,right:5,fontSize:10}}>⚠️</span>}
                {dueC>0&&!hasAlert&&<span style={{position:"absolute",top:5,right:5,fontSize:10}}>📅</span>}
                <div style={{fontSize:16,marginBottom:2}}>{t.type==="saltwater"?"🪸":"🐡"}</div>
                <div style={{fontSize:11,fontWeight:700,color:tc,marginBottom:2,lineHeight:1.3,wordBreak:"break-word"}}>{tn}</div>
                <div style={{fontSize:10,color:"#475569",marginBottom:2}}>{t.volume_gal||t.size}·{liveC} live</div>
                {last?.nitrate!=null&&<div style={{fontSize:10,color:last.nitrate<=20?"#4ade80":"#f87171"}}>NO₃ {last.nitrate}{last.nitrate<=20?" ✓":" ⚠"}</div>}
                {last?.date&&<div style={{fontSize:9,color:"#334155",marginTop:1}}>Last: {fmt(last.date)}</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {tanks.map(t=>{const tn=tankName(t),tc=getTankColor(tn,tanks);return(
          <button key={tn} onClick={()=>setActiveTank(tn)} style={{background:activeTank===tn?`${tc}22`:"#0d1a2d",border:`1.5px solid ${activeTank===tn?tc:"#1e3a5f"}`,borderRadius:10,padding:"6px 12px",cursor:"pointer",color:activeTank===tn?tc:"#64748b",fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>
            {t.type==="saltwater"?"🪸":"🐡"} {tn}
          </button>
        );})}
      </div>

      <div className="grid-3" style={{marginBottom:14}}>
        <div style={{...S.card,borderTop:`3px solid ${color}`}}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Tank Info</div>
          <div style={{fontSize:17,fontWeight:700,color,marginBottom:2}}>{activeTank}</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:2}}>{isSW?"🐠 Saltwater":"🐟 Freshwater"}·{tank?.volume_gal?tank.volume_gal+"G":tank?.size}</div>
          {tank?.dimensions&&<div style={{fontSize:11,color:"#475569",marginBottom:2}}>📐 {tank.dimensions}</div>}
          {tank?.brand&&<div style={{fontSize:11,color:"#475569",marginBottom:2}}>🏷 {tank.brand}</div>}
          {tank?.equipment&&<div style={{fontSize:11,color:"#64748b",marginBottom:2}}>⚙️ {tank.equipment}</div>}
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

        <div style={S.card}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>
            Latest Readings <span style={{color:"#475569",fontWeight:400,textTransform:"none"}}>(most recent per parameter)</span>
          </div>
          {allTP.length>0?(
            <div className="grid-2">
              {(isSW?SW_PARAMS:FW_PARAMS).map(p=>{
                // find the latest reading that has this parameter
                const rec=allTP.find(r=>r[p]!=null);
                if(!rec) return null;
                const raw=rec[p];
                const alk=p==="alkalinity"?alkDisplay(raw,isSW):null;
                const displayVal=alk?alk.val:Number(raw);
                const safe=getSafe(p,isSW),ok=displayVal>=safe.min&&displayVal<=safe.max;
                return(
                  <div key={p} style={{background:"#07111f",borderRadius:8,padding:"8px 10px",border:`1px solid ${ok?"transparent":"#f87171"}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:2}}>
                      <div style={{fontSize:10,color:"#475569"}}>{PARAM_LABELS[p]}</div>
                      <div style={{fontSize:9,color:"#334155"}}>{fmtShort(rec.date)}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <span style={{fontSize:16,fontWeight:700,color:ok?"#4ade80":"#f87171",fontFamily:"'DM Mono',monospace"}}>{displayVal}</span>
                      {alk&&alk.raw&&<span style={{fontSize:9,color:"#334155"}}>({alk.raw} ppm)</span>}
                      <span style={{fontSize:11}}>{ok?"✓":"⚠️"}</span>
                    </div>
                    <div style={{fontSize:9,color:"#334155",marginTop:1}}>Safe: {safe.min}–{safe.max}</div>
                  </div>
                );
              }).filter(Boolean)}
            </div>
          ):<div style={{color:"#475569",fontSize:13}}>No readings yet.</div>}
        </div>

        <div style={S.card}>
          <div style={{fontSize:11,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",marginBottom:8}}>Maintenance — Last 4 Weeks</div>
          {recentDiary.length>0?recentDiary.map((d,i)=>(
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

      <div style={S.card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#cbd5e1",marginBottom:2}}>Parameter Trends</div>
            <div style={{fontSize:11,color:"#475569"}}>{recent.length===0?"No readings in range.":`${recent.length} readings · ${fmt(recent[0]?.date)} → ${fmt(recent[recent.length-1]?.date)}`}</div>
          </div>
          <div style={{display:"flex",gap:5}}>
            {DATE_RANGES.map(r=>(
              <button key={r.label} onClick={()=>setRangeDays(r.days)} style={{background:rangeDays===r.days?"rgba(56,189,248,0.2)":"#07111f",border:`1px solid ${rangeDays===r.days?"#38bdf8":"#1e3a5f"}`,color:rangeDays===r.days?"#7dd3fc":"#64748b",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {recent.length>0?(
          <div className="grid-2">
            {chartPairs.map(pair=>{
              const data=recent.map(p=>({date:fmt(p.date),...Object.fromEntries(pair.keys.map(k=>[k,p[k]!=null?Number(p[k]):null]))})).filter(d=>pair.keys.some(k=>d[k]!=null));
              if(!data.length) return null;
              const isMulti=pair.keys.length>1;
              return(
                <div key={pair.label}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                    {pair.label}
                    {isMulti&&pair.keys.map(k=><span key={k} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:10}}><span style={{width:10,height:2,background:PARAM_SAFE[k]?.color||"#38bdf8",display:"inline-block",borderRadius:1}}/>{k}</span>)}
                  </div>
                  <ResponsiveContainer width="100%" height={150}>
                    <ComposedChart data={data} margin={{top:4,right:isMulti?12:6,left:-22,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0f2035"/>
                      <XAxis dataKey="date" tick={{fill:"#475569",fontSize:9}}/>
                      <YAxis yAxisId="left" tick={{fill:"#475569",fontSize:9}}/>
                      {isMulti&&<YAxis yAxisId="right" orientation="right" tick={{fill:"#475569",fontSize:9}}/>}
                      <Tooltip contentStyle={{background:"#0a1628",border:"1px solid #1e3a5f",borderRadius:8,fontSize:11}}/>
                      {pair.keys.map((k,ki)=>{const safe=PARAM_SAFE[k],yId=ki===0?"left":"right";return[
                        <ReferenceLine key={k+"min"} yAxisId={yId} y={safe.min} stroke={safe.color} strokeDasharray="4 2" strokeOpacity={0.35}/>,
                        <ReferenceLine key={k+"max"} yAxisId={yId} y={safe.max} stroke={safe.color} strokeDasharray="4 2" strokeOpacity={0.35}/>,
                      ];})}
                      {pair.keys.map((k,ki)=>(
                        <Line key={k} yAxisId={ki===0?"left":"right"} type="monotone" dataKey={k} stroke={PARAM_SAFE[k]?.color||"#38bdf8"} strokeWidth={2} dot={{fill:PARAM_SAFE[k]?.color||"#38bdf8",r:3}} activeDot={{r:5}} connectNulls/>
                      ))}
                    </ComposedChart>
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
  const [tank,  setTank]    = useState("");
  const [date,  setDate]    = useState(TODAY_STR);
  const [vals,  setVals]    = useState({});
  const [notes, setNotes]   = useState("");
  const [saving,setSaving]  = useState(false);
  const [page,  setPage]    = useState(1);
  const [editRow, setEditRow] = useState(null);  // id of row being edited
  const [editVals,setEditVals]= useState({});
  const [editDate,setEditDate]= useState("");
  const [delConfirm,setDelConfirm]=useState(null);
  const PER_PAGE = 10;

  useEffect(()=>{ if(tanks.length&&!tank) setTank(tankName(tanks[0])); },[tanks]);

  const isSW  = tanks.find(t=>tankName(t)===tank)?.type==="saltwater";
  const pKeys = isSW ? SW_PARAMS : FW_PARAMS;
  const tankParams = params.filter(p=>p.tank===tank).sort((a,b)=>b.date.localeCompare(a.date));
  const last  = tankParams[0];
  const totalPages = Math.ceil(tankParams.length/PER_PAGE);
  const pageRows   = tankParams.slice((page-1)*PER_PAGE, page*PER_PAGE);

  async function submit() {
    setSaving(true);
    const entry={date,tank,notes:notes||null};
    pKeys.forEach(p=>{if(vals[p]!==""&&vals[p]!==undefined)entry[p]=parseFloat(vals[p]);});
    const {data,error}=await supabase.from("parameters").insert([entry]).select().single();
    if(error){showToast("Save failed: "+error.message,"error");}
    else{setParams(prev=>[...prev,data]);setVals({});setNotes("");setPage(1);showToast("Parameters saved!");}
    setSaving(false);
  }

  function startEdit(row) {
    setEditRow(row.id);
    setEditDate(row.date);
    const v={};
    pKeys.forEach(p=>{ v[p]=row[p]!=null?row[p]:""; });
    setEditVals(v);
  }

  async function saveEdit(id) {
    setSaving(true);
    const updates={date:editDate};
    pKeys.forEach(p=>{ updates[p]=editVals[p]!==""&&editVals[p]!==undefined?parseFloat(editVals[p]):null; });
    const {data,error}=await supabase.from("parameters").update(updates).eq("id",id).select().single();
    if(error){showToast("Update failed: "+error.message,"error");}
    else{setParams(prev=>prev.map(r=>r.id===id?data:r));setEditRow(null);showToast("Reading updated!");}
    setSaving(false);
  }

  async function deleteRow(id) {
    const {error}=await supabase.from("parameters").delete().eq("id",id);
    if(error){showToast("Delete failed: "+error.message,"error");}
    else{setParams(prev=>prev.filter(r=>r.id!==id));setDelConfirm(null);showToast("Reading deleted.");}
  }

  function displayAlk(row) {
    if(row.alkalinity==null) return null;
    const a=alkDisplay(row.alkalinity,isSW);
    return a;
  }

  return (
    <div style={{width:"100%"}}>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Log Parameters</div><div style={{fontSize:13,color:"#475569"}}>Record water chemistry readings</div></div>

      {/* ── Entry form ── */}
      <div style={{...S.card,borderRadius:16,padding:20,marginBottom:20}}>
        <div className="grid-2" style={{marginBottom:16}}>
          <Field label="Tank"><select value={tank} onChange={e=>{setTank(e.target.value);setVals({});setPage(1);}} style={S.sel}>{tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{t.type==="saltwater"?"🪸":"🐡"} {tankName(t)}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={S.inp}/></Field>
        </div>
        <div style={{fontSize:11,color:"#334155",marginBottom:16,fontFamily:"'DM Mono',monospace"}}>📍 {nowTs()}</div>
        {last&&<div style={{background:"#07111f",borderRadius:8,padding:"8px 12px",marginBottom:16,fontSize:11,color:"#64748b"}}><span style={{fontWeight:600,color:"#475569"}}>Last reading:</span> {fmt(last.date)} · {pKeys.filter(p=>last[p]!=null).map(p=>`${p}: ${last[p]}`).join(" · ")}</div>}
        {!isSW&&<div style={{background:"rgba(56,189,248,0.06)",border:"1px solid #1e3a5f",borderRadius:8,padding:"7px 12px",marginBottom:14,fontSize:11,color:"#64748b"}}>💡 Enter Alkalinity in <strong style={{color:"#7dd3fc"}}>ppm</strong> — it will be displayed as dKH (×0.056)</div>}
        <div className="grid-2" style={{marginBottom:16}}>
          {pKeys.map(p=>{
            const v=vals[p],n=parseFloat(v);
            // For FW alkalinity: input is ppm, convert to dKH for range check
            const checkVal = (p==="alkalinity"&&!isSW&&!isNaN(n)) ? Math.round(n*0.056*100)/100 : n;
            const safe=getSafe(p,isSW);
            const ok=v!==""&&v!==undefined&&!isNaN(n)?(checkVal>=safe.min&&checkVal<=safe.max):null;
            const anomaly=v&&!isNaN(n)?detectAnomalies(params.filter(r=>r.tank===tank),p,v,isSW):null;
            const alkHint = p==="alkalinity"&&!isSW&&v?` → ${Math.round(parseFloat(v)*0.056*100)/100} dKH`:"";
            return (
              <Field key={p} label={`${PARAM_LABELS[p]}${p==="alkalinity"&&!isSW?" (ppm)":""}`}>
                <div style={{position:"relative"}}>
                  <input type="number" step="0.01"
                    placeholder={p==="alkalinity"&&!isSW?`ppm (e.g. 180 = ${(180*0.056).toFixed(1)} dKH)`:`Safe: ${safe.min}–${safe.max}`}
                    value={v||""} onChange={e=>setVals(prev=>({...prev,[p]:e.target.value}))}
                    style={{...S.inp,borderColor:anomaly?.level==="critical"?"#f97316":ok===false?"#f87171":ok===true?"#4ade80":"#1e3a5f",paddingRight:28}}/>
                  {ok!==null&&!anomaly&&<span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13}}>{ok?"✓":"⚠"}</span>}
                  {anomaly&&<span style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",fontSize:13}}>🤔</span>}
                </div>
                {alkHint&&<div style={{fontSize:10,color:"#38bdf8",marginTop:3}}>{alkHint}</div>}
                {anomaly&&(
                  <div style={{marginTop:5,background:anomaly.level==="critical"?"rgba(249,115,22,0.12)":"rgba(251,191,36,0.1)",border:`1px solid ${anomaly.level==="critical"?"#f97316":"#fbbf24"}`,borderRadius:7,padding:"7px 10px",fontSize:11}}>
                    <div style={{fontWeight:700,color:anomaly.level==="critical"?"#fb923c":"#fbbf24",marginBottom:2}}>{anomaly.level==="critical"?"⚠️ Possible Typo":"🤔 Unusual Value"}</div>
                    <div style={{color:"#94a3b8"}}>This is <strong style={{color:"#e2e8f0"}}>{anomaly.pct}% {parseFloat(v)>anomaly.avg?"above":"below"}</strong> your avg of <strong style={{color:"#e2e8f0"}}>{anomaly.avg}</strong> (z={anomaly.z}). Did you mean <strong style={{color:"#7dd3fc"}}>{Math.round(anomaly.avg*10)/10}</strong>?</div>
                  </div>
                )}
              </Field>
            );
          })}
        </div>
        <Field label="Notes (optional)"><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Observations..." style={{...S.inp,resize:"vertical",marginBottom:16}}/></Field>
        <button onClick={submit} disabled={saving} style={{...S.btn,opacity:saving?0.6:1,width:"100%"}}>{saving?"💾 Saving…":"💧 Save Parameters"}</button>
      </div>

      {/* ── History table ── */}
      {tankParams.length>0&&(
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:13,fontWeight:700,color:"#cbd5e1"}}>Previous Readings — {tank}</div>
            <div style={{fontSize:12,color:"#475569"}}>{tankParams.length} total · page {page} of {totalPages}</div>
          </div>

          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}>
              <thead>
                <tr style={{background:"#07111f",fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:".06em"}}>
                  <th style={{padding:"8px 12px",textAlign:"left",fontWeight:700,whiteSpace:"nowrap"}}>Date</th>
                  {pKeys.map(p=><th key={p} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,whiteSpace:"nowrap"}}>{p==="alkalinity"?"Alk (dKH)":p.toUpperCase()}</th>)}
                  <th style={{padding:"8px 12px",textAlign:"left",fontWeight:700}}>Notes</th>
                  <th style={{padding:"8px 12px",textAlign:"center",fontWeight:700}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row,i)=>{
                  const isEdit=editRow===row.id;
                  return(
                    <tr key={row.id||i} style={{borderBottom:"1px solid #0f2035",background:i%2===0?"transparent":"rgba(7,17,31,0.4)"}}>
                      {isEdit?(
                        <>
                          <td style={{padding:"8px 12px"}}>
                            <input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} style={{...S.inp,padding:"4px 8px",fontSize:12,width:140}}/>
                          </td>
                          {pKeys.map(p=>(
                            <td key={p} style={{padding:"6px 8px"}}>
                              <input type="number" step="0.01" value={editVals[p]||""} onChange={e=>setEditVals(prev=>({...prev,[p]:e.target.value}))}
                                style={{...S.inp,padding:"4px 8px",fontSize:12,width:80,textAlign:"right"}}/>
                            </td>
                          ))}
                          <td style={{padding:"6px 8px"}}><span style={{fontSize:10,color:"#475569"}}>—</span></td>
                          <td style={{padding:"6px 12px"}}>
                            <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                              <button onClick={()=>saveEdit(row.id)} disabled={saving} style={{fontSize:11,background:"linear-gradient(135deg,#14532d,#22c55e)",border:"none",color:"#fff",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:700}}>{saving?"…":"Save"}</button>
                              <button onClick={()=>setEditRow(null)} style={{fontSize:11,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 8px",cursor:"pointer"}}>✕</button>
                            </div>
                          </td>
                        </>
                      ):(
                        <>
                          <td style={{padding:"8px 12px",color:"#94a3b8",whiteSpace:"nowrap"}}>{fmt(row.date)}</td>
                          {pKeys.map(p=>{
                            let display=row[p]!=null?Number(row[p]):null;
                            let extra=null;
                            if(p==="alkalinity"&&row[p]!=null){const a=alkDisplay(row[p],isSW);display=a.val;extra=!isSW?<div style={{fontSize:9,color:"#334155"}}>{a.raw}ppm</div>:null;}
                            const safe=getSafe(p,isSW);
                            const ok=display!=null?(display>=safe.min&&display<=safe.max):null;
                            return(
                              <td key={p} style={{padding:"8px 10px",textAlign:"right"}}>
                                {display!=null?(
                                  <div>
                                    <span style={{fontWeight:600,color:ok===false?"#f87171":ok===true?"#4ade80":"#94a3b8",fontFamily:"'DM Mono',monospace"}}>{display}</span>
                                    {extra}
                                  </div>
                                ):<span style={{color:"#1e3a5f"}}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{padding:"8px 12px",color:"#475569",fontSize:11,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.notes||"—"}</td>
                          <td style={{padding:"8px 12px"}}>
                            <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                              <button onClick={()=>startEdit(row)} style={{fontSize:11,background:"rgba(56,189,248,0.1)",border:"1px solid #38bdf8",color:"#38bdf8",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>✏️</button>
                              {delConfirm===row.id?(
                                <span style={{display:"flex",gap:3}}>
                                  <button onClick={()=>deleteRow(row.id)} style={{fontSize:11,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:5,padding:"3px 7px",cursor:"pointer",fontWeight:700}}>✓</button>
                                  <button onClick={()=>setDelConfirm(null)} style={{fontSize:11,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:5,padding:"3px 7px",cursor:"pointer"}}>✕</button>
                                </span>
                              ):(
                                <button onClick={()=>setDelConfirm(row.id)} style={{fontSize:11,background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",color:"#f87171",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>🗑</button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages>1&&(
            <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginTop:14}}>
              <button onClick={()=>setPage(1)} disabled={page===1} style={{fontSize:12,background:"#07111f",border:"1px solid #1e3a5f",color:page===1?"#334155":"#64748b",borderRadius:7,padding:"5px 10px",cursor:page===1?"default":"pointer"}}>«</button>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{fontSize:12,background:"#07111f",border:"1px solid #1e3a5f",color:page===1?"#334155":"#64748b",borderRadius:7,padding:"5px 10px",cursor:page===1?"default":"pointer"}}>‹</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                let p=page-2+i;
                if(p<1) p=i+1;
                if(p>totalPages) p=totalPages-4+i;
                p=Math.max(1,Math.min(totalPages,p));
                return(
                  <button key={p} onClick={()=>setPage(p)} style={{fontSize:12,background:page===p?"rgba(56,189,248,0.2)":"#07111f",border:`1px solid ${page===p?"#38bdf8":"#1e3a5f"}`,color:page===p?"#7dd3fc":"#64748b",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontWeight:page===p?700:400}}>{p}</button>
                );
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{fontSize:12,background:"#07111f",border:"1px solid #1e3a5f",color:page===totalPages?"#334155":"#64748b",borderRadius:7,padding:"5px 10px",cursor:page===totalPages?"default":"pointer"}}>›</button>
              <button onClick={()=>setPage(totalPages)} disabled={page===totalPages} style={{fontSize:12,background:"#07111f",border:"1px solid #1e3a5f",color:page===totalPages?"#334155":"#64748b",borderRadius:7,padding:"5px 10px",cursor:page===totalPages?"default":"pointer"}}>»</button>
            </div>
          )}
        </div>
      )}
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
  const [editId,setEditId]=useState(null);
  const [editVals,setEditVals]=useState({});
  const statusColor={Live:"#4ade80",Died:"#f87171",Removed:"#fb923c"};

  const list=lsLog.filter(l=>fTank==="All"||l.tank===fTank).filter(l=>fStatus==="All"||l.status===fStatus).sort((a,b)=>(a.tank+a.name).localeCompare(b.tank+b.name));

  function startEdit(l) {
    setEditId(l.id);
    setEditVals({date_added:l.date_added||"",date_died:l.date_died||"",status:l.status||"Live",qty:l.qty||1,tank:l.tank,comments:l.comments||""});
  }

  async function saveEdit(id) {
    setSaving(true);
    const updates={date_added:editVals.date_added||null,date_died:editVals.date_died||null,status:editVals.status,qty:Number(editVals.qty),tank:editVals.tank,comments:editVals.comments||null};
    const {data,error}=await supabase.from("livestock").update(updates).eq("id",id).select().single();
    if(error){showToast("Update failed: "+error.message,"error");}
    else{setLsLog(prev=>prev.map(l=>l.id===id?data:l));setEditId(null);showToast("Record updated!");}
    setSaving(false);
  }

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
        <div style={{display:"flex",gap:5}}>
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

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {list.length===0&&<div style={{...S.card,padding:24,color:"#334155",textAlign:"center",fontSize:13}}>No entries match filters.</div>}
        {list.map((l,i)=>{
          const tc=getTankColor(l.tank,tanks);
          const isEdit=editId===l.id;
          return (
            <div key={l.id||i} style={{...S.card,padding:0,overflow:"hidden",borderLeft:`3px solid ${tc}`}}>
              {/* Normal row */}
              {!isEdit&&(
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 50px 90px 90px 70px 80px",gap:0,padding:"10px 14px",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:13,color:"#e2e8f0",fontWeight:600}}>{l.qty>1?`${l.qty}× `:""}{l.name}</div>
                    <div style={{fontSize:10,color:"#475569"}}>{l.type}</div>
                  </div>
                  <div style={{fontSize:11,color:tc,fontWeight:600}}>{l.tank}</div>
                  <div style={{fontSize:11,color:"#64748b"}}>{l.type}</div>
                  <div style={{fontSize:12,color:"#94a3b8",fontFamily:"'DM Mono',monospace",textAlign:"center"}}>{l.qty}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{fmt(l.date_added)}</div>
                  <div style={{fontSize:11,color:l.date_died?"#f87171":"#334155"}}>{l.date_died?fmt(l.date_died):"—"}</div>
                  <div>
                    {l.status==="Live"?(confirmId===l.id?(
                      <span style={{display:"flex",gap:3}}>
                        <button onClick={()=>markDead(l.id)} disabled={saving} style={{fontSize:10,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:5,padding:"3px 6px",cursor:"pointer",fontWeight:700}}>✓</button>
                        <button onClick={()=>setConfirmId(null)} style={{fontSize:10,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:5,padding:"3px 6px",cursor:"pointer"}}>✕</button>
                      </span>
                    ):(
                      <button onClick={()=>setConfirmId(l.id)} style={{fontSize:10,background:"rgba(74,222,128,0.15)",border:"1px solid #4ade80",color:"#4ade80",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:700}}>Live</button>
                    )):(
                      <span style={{fontSize:10,background:`${statusColor[l.status]||"#94a3b8"}22`,color:statusColor[l.status]||"#94a3b8",borderRadius:6,padding:"3px 8px",fontWeight:700}}>{l.status}</span>
                    )}
                  </div>
                  <div>
                    <button onClick={()=>startEdit(l)} style={{fontSize:10,background:"rgba(56,189,248,0.1)",border:"1px solid #38bdf8",color:"#38bdf8",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontWeight:600}}>✏️ Edit</button>
                  </div>
                </div>
              )}
              {/* Edit row */}
              {isEdit&&(
                <div style={{padding:16,background:"#07111f"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#7dd3fc",marginBottom:12}}>✏️ Editing: <span style={{color:"#e2e8f0"}}>{l.name}</span></div>
                  <div className="grid-2" style={{marginBottom:12}}>
                    <Field label="Status">
                      <select value={editVals.status} onChange={e=>setEditVals(p=>({...p,status:e.target.value}))} style={S.sel}>
                        <option value="Live">Live</option>
                        <option value="Died">Died</option>
                        <option value="Removed">Removed</option>
                      </select>
                    </Field>
                    <Field label="Quantity">
                      <input type="number" min="1" value={editVals.qty} onChange={e=>setEditVals(p=>({...p,qty:e.target.value}))} style={S.inp}/>
                    </Field>
                  </div>
                  <div className="grid-2" style={{marginBottom:12}}>
                    <Field label="Date Added">
                      <input type="date" value={editVals.date_added} onChange={e=>setEditVals(p=>({...p,date_added:e.target.value}))} style={S.inp}/>
                    </Field>
                    <Field label="Date Died / Removed">
                      <input type="date" value={editVals.date_died} onChange={e=>setEditVals(p=>({...p,date_died:e.target.value}))} style={S.inp}/>
                    </Field>
                  </div>
                  <Field label="Tank">
                    <select value={editVals.tank} onChange={e=>setEditVals(p=>({...p,tank:e.target.value}))} style={S.sel}>
                      {tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}
                    </select>
                  </Field>
                  <Field label="Comments">
                    <input value={editVals.comments} onChange={e=>setEditVals(p=>({...p,comments:e.target.value}))} placeholder="Notes…" style={S.inp}/>
                  </Field>
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    <button onClick={()=>saveEdit(l.id)} disabled={saving} style={{...S.btn,padding:"8px 20px",fontSize:13,opacity:saving?0.6:1}}>{saving?"💾 Saving…":"💾 Save"}</button>
                    <button onClick={()=>setEditId(null)} style={{background:"none",border:"1px solid #334155",color:"#64748b",borderRadius:8,padding:"8px 16px",cursor:"pointer",fontSize:13}}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
  const [editTank,setEditTank]=useState(null);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  function startEdit(t) {
    setEditTank(tankName(t));
    setForm({name:t.name||t.id||"",type:t.type||"freshwater",volume_gal:t.volume_gal||"",dimensions:t.dimensions||"",brand:t.brand||"",location:t.location||"",equipment:t.equipment||"",notes:t.notes||"",setup_date:t.setup_date||t.setup||TODAY_STR});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function cancelEdit(){setEditTank(null);setForm(blank);}

  async function addTank() {
    if(!form.name.trim()){showToast("Tank name is required","error");return;}
    if(tanks.find(t=>tankName(t)===form.name.trim())){showToast("A tank with that name already exists","error");return;}
    setSaving(true);
    const entry={name:form.name.trim(),type:form.type,volume_gal:form.volume_gal?Number(form.volume_gal):null,dimensions:form.dimensions||null,brand:form.brand||null,location:form.location||null,equipment:form.equipment||null,notes:form.notes||null,setup_date:form.setup_date||TODAY_STR};
    const {data,error}=await supabase.from("tanks").insert([entry]).select().single();
    if(error){showToast("Save failed: "+error.message,"error");}
    else{setTanks(prev=>sortTanks([...prev,data]));setForm(blank);showToast(`${data.name} added!`);}
    setSaving(false);
  }

  async function saveTankEdit() {
    setSaving(true);
    const updates={type:form.type,volume_gal:form.volume_gal?Number(form.volume_gal):null,dimensions:form.dimensions||null,brand:form.brand||null,location:form.location||null,equipment:form.equipment||null,notes:form.notes||null,setup_date:form.setup_date||TODAY_STR};
    const {data,error}=await supabase.from("tanks").update(updates).eq("name",editTank).select().single();
    if(error){showToast("Update failed: "+error.message,"error");}
    else{setTanks(prev=>sortTanks(prev.map(t=>tankName(t)===editTank?data:t)));cancelEdit();showToast("Tank updated!");}
    setSaving(false);
  }

  async function deleteTank(tn) {
    setDeleting(true);
    const {error}=await supabase.from("tanks").delete().eq("name",tn);
    if(error){showToast("Delete failed: "+error.message,"error");}
    else{setTanks(prev=>prev.filter(t=>tankName(t)!==tn));showToast(`${tn} removed.`);}
    setDelConfirm(null);setDeleting(false);
  }

  const typeOptions=[{val:"freshwater",label:"🐟 Freshwater"},{val:"saltwater",label:"🐠 Saltwater / Reef"},{val:"brackish",label:"🌊 Brackish"},{val:"planted",label:"🌱 Planted"},{val:"quarantine",label:"🏥 Quarantine"}];
  const isEditing=!!editTank;

  return (
    <div>
      <div style={{marginBottom:20}}><div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Manage Tanks</div><div style={{fontSize:13,color:"#475569"}}>Add, edit or remove tanks</div></div>
      <div style={{...S.card,borderRadius:16,padding:22,marginBottom:20,borderTop:`3px solid ${isEditing?"#fbbf24":"#38bdf8"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontSize:14,fontWeight:700,color:isEditing?"#fbbf24":"#7dd3fc"}}>{isEditing?`✏️ Editing: ${editTank}`:"➕ Add New Tank"}</div>
          {isEditing&&<button onClick={cancelEdit} style={{fontSize:12,background:"none",border:"1px solid #334155",color:"#64748b",borderRadius:8,padding:"4px 12px",cursor:"pointer"}}>✕ Cancel</button>}
        </div>
        <div className="grid-2">
          <Field label="Tank Name *"><input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. 75G Planted Tank" style={{...S.inp,opacity:isEditing?0.5:1}} readOnly={isEditing}/></Field>
          <Field label="Type *"><select value={form.type} onChange={e=>set("type",e.target.value)} style={S.sel}>{typeOptions.map(o=><option key={o.val} value={o.val}>{o.label}</option>)}</select></Field>
        </div>
        <div className="grid-2">
          <Field label="Volume (Gallons)"><input type="number" value={form.volume_gal} onChange={e=>set("volume_gal",e.target.value)} placeholder="e.g. 75" style={S.inp}/></Field>
          <Field label="Setup Date"><input type="date" value={form.setup_date} onChange={e=>set("setup_date",e.target.value)} style={S.inp}/></Field>
        </div>
        <div className="grid-2">
          <Field label="Dimensions (L × W × H)"><input value={form.dimensions} onChange={e=>set("dimensions",e.target.value)} placeholder='e.g. 48" × 18" × 21"' style={S.inp}/></Field>
          <Field label="Brand / Model"><input value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder="e.g. Red Sea Reefer 250" style={S.inp}/></Field>
        </div>
        <div className="grid-2">
          <Field label="Location in Home"><input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="e.g. Living Room" style={S.inp}/></Field>
          <Field label="Notes"><input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any other notes" style={S.inp}/></Field>
        </div>
        <Field label="Equipment"><textarea value={form.equipment} onChange={e=>set("equipment",e.target.value)} rows={2} placeholder="e.g. Heater, Protein Skimmer, Return Pump, Wavemaker, Dosing Pump…" style={{...S.inp,resize:"vertical"}}/></Field>
        <button onClick={isEditing?saveTankEdit:addTank} disabled={saving} style={{...S.btn,opacity:saving?0.6:1,marginTop:8,width:"100%",background:isEditing?"linear-gradient(135deg,#92400e,#f59e0b)":undefined}}>
          {saving?"💾 Saving…":isEditing?"💾 Save Changes":"➕ Add Tank"}
        </button>
      </div>

      <div style={{fontSize:14,fontWeight:700,color:"#cbd5e1",marginBottom:14}}>Existing Tanks ({tanks.length})</div>
      <div className="grid-2">
        {tanks.map(t=>{
          const tn=tankName(t),tc=getTankColor(tn,tanks);
          const liveCount=lsLog.filter(l=>l.tank===tn&&l.status==="Live").reduce((s,l)=>s+(l.qty||1),0);
          const paramCount=params.filter(p=>p.tank===tn).length;
          const diaryCount=diary.filter(d=>d.tank===tn).length;
          const isBeingEdited=editTank===tn;
          return (
            <div key={tn} style={{...S.card,borderRadius:14,borderLeft:`3px solid ${isBeingEdited?"#fbbf24":tc}`,padding:18,opacity:editTank&&!isBeingEdited?0.5:1,transition:"opacity .2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:isBeingEdited?"#fbbf24":tc,marginBottom:2}}>{tn}{isBeingEdited&&<span style={{fontSize:10,color:"#fbbf24",marginLeft:6}}>✏️ editing</span>}</div>
                  <div style={{fontSize:12,color:"#64748b"}}>{t.type==="saltwater"?"🐠 Saltwater":t.type==="brackish"?"🌊 Brackish":t.type==="planted"?"🌱 Planted":t.type==="quarantine"?"🏥 Quarantine":"🐟 Freshwater"} · {t.volume_gal?t.volume_gal+"G":t.size||"—"}</div>
                  {t.dimensions&&<div style={{fontSize:11,color:"#475569",marginTop:1}}>📐 {t.dimensions}</div>}
                  {t.brand&&<div style={{fontSize:11,color:"#475569"}}>🏷 {t.brand}</div>}
                  {t.location&&<div style={{fontSize:11,color:"#475569"}}>📍 {t.location}</div>}
                  <div style={{fontSize:11,color:"#475569",marginTop:1}}>Setup: {fmt(t.setup_date||t.setup)}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
                  <div style={{display:"flex",gap:6,fontSize:10,color:"#475569"}}><span>🐟{liveCount}</span><span>💧{paramCount}</span><span>🔧{diaryCount}</span></div>
                  <div style={{display:"flex",gap:5}}>
                    <button onClick={()=>isBeingEdited?cancelEdit():startEdit(t)} style={{fontSize:11,background:isBeingEdited?"rgba(251,191,36,0.1)":"rgba(56,189,248,0.1)",border:`1px solid ${isBeingEdited?"#fbbf24":"#38bdf8"}`,color:isBeingEdited?"#fbbf24":"#38bdf8",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>{isBeingEdited?"✕ Cancel":"✏️ Edit"}</button>
                    {delConfirm===tn?(<div style={{display:"flex",gap:4}}><button onClick={()=>deleteTank(tn)} disabled={deleting} style={{fontSize:11,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontWeight:700}}>{deleting?"…":"Confirm"}</button><button onClick={()=>setDelConfirm(null)} style={{fontSize:11,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:6,padding:"4px 8px",cursor:"pointer"}}>✕</button></div>):(<button onClick={()=>setDelConfirm(tn)} style={{fontSize:11,background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",color:"#f87171",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>🗑</button>)}
                  </div>
                </div>
              </div>
              {t.equipment&&<div style={{fontSize:11,color:"#64748b",background:"#07111f",borderRadius:6,padding:"5px 10px",marginTop:4}}>⚙️ {t.equipment}</div>}
              {t.notes&&<div style={{fontSize:11,color:"#475569",background:"#07111f",borderRadius:6,padding:"5px 10px",marginTop:4}}>{t.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
function Scheduler({tanks,tasks,setTasks,showToast,tankName}) {
  const blank={tank:"",title:"",category:"Maintenance",frequency_days:7,customDays:"",last_done:"",notes:""};
  const [form,setForm]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [filterTank,setFilterTank]=useState("All");
  const [confirmId,setConfirmId]=useState(null);
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));

  useEffect(()=>{ if(tanks.length&&!form.tank) set("tank",tankName(tanks[0])); },[tanks]);

  function calcNextDue(lastDone,freqDays) {
    if(!lastDone) { const d=new Date(); return d.toISOString().slice(0,10); }
    const d=new Date(lastDone+"T12:00:00");
    d.setDate(d.getDate()+freqDays);
    return d.toISOString().slice(0,10);
  }

  async function addTask() {
    if(!form.title.trim()){showToast("Task title is required","error");return;}
    const freq=form.frequency_days===0?Number(form.customDays):Number(form.frequency_days);
    if(!freq||freq<1){showToast("Please set a valid frequency","error");return;}
    setSaving(true);
    const entry={tank:form.tank,title:form.title.trim(),category:form.category,frequency_days:freq,last_done:form.last_done||null,next_due:calcNextDue(form.last_done,freq),notes:form.notes||null,active:true};
    const {data,error}=await supabase.from("tasks").insert([entry]).select().single();
    if(error){showToast("Save failed: "+error.message,"error");}
    else{setTasks(prev=>[...prev,data]);setForm({...blank,tank:form.tank});showToast("Task scheduled!");}
    setSaving(false);
  }

  async function markDone(task) {
    const today=TODAY_STR;
    const nextDue=calcNextDue(today,task.frequency_days);
    const {data,error}=await supabase.from("tasks").update({last_done:today,next_due:nextDue}).eq("id",task.id).select().single();
    if(error){showToast("Update failed: "+error.message,"error");}
    else{setTasks(prev=>prev.map(t=>t.id===task.id?data:t));showToast(`"${task.title}" marked done! Next due: ${fmt(nextDue)}`);}
  }

  async function deleteTask(id) {
    const {error}=await supabase.from("tasks").delete().eq("id",id);
    if(error){showToast("Delete failed: "+error.message,"error");}
    else{setTasks(prev=>prev.filter(t=>t.id!==id));showToast("Task removed.");setConfirmId(null);}
  }

  async function toggleActive(task) {
    const {data,error}=await supabase.from("tasks").update({active:!task.active}).eq("id",task.id).select().single();
    if(!error) setTasks(prev=>prev.map(t=>t.id===task.id?data:t));
  }

  const filtered=tasks.filter(t=>filterTank==="All"||t.tank===filterTank).sort((a,b)=>{
    if(!a.next_due) return 1; if(!b.next_due) return -1;
    return a.next_due.localeCompare(b.next_due);
  });

  const overdue=filtered.filter(t=>t.active&&t.next_due&&t.next_due<TODAY_STR);
  const dueToday=filtered.filter(t=>t.active&&t.next_due===TODAY_STR);
  const upcoming=filtered.filter(t=>t.active&&t.next_due>TODAY_STR);
  const inactive=filtered.filter(t=>!t.active);

  function daysUntil(dateStr) {
    if(!dateStr) return null;
    const diff=Math.ceil((new Date(dateStr+"T12:00:00")-new Date())/(1000*60*60*24));
    return diff;
  }

  function TaskRow({t,showTank}) {
    const days=daysUntil(t.next_due);
    const isOverdue=days!==null&&days<0;
    const isToday=days===0;
    const tc=getTankColor(t.tank,tanks);
    return(
      <div style={{...S.card,padding:"12px 14px",borderLeft:`3px solid ${isOverdue?"#f87171":isToday?"#fbbf24":tc}`,opacity:t.active?1:0.45}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{t.title}</span>
              <span style={{fontSize:10,background:`${CAT_COLORS[t.category]||"#64748b"}22`,color:CAT_COLORS[t.category]||"#64748b",borderRadius:4,padding:"1px 7px",fontWeight:600}}>{t.category}</span>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:10,color:"#475569"}}>
              {showTank&&<span style={{color:tc,fontWeight:600}}>{t.tank}</span>}
              <span>🔁 Every {t.frequency_days}d</span>
              {t.last_done&&<span>Last: {fmt(t.last_done)}</span>}
              {t.next_due&&<span style={{color:isOverdue?"#f87171":isToday?"#fbbf24":"#64748b",fontWeight:isOverdue||isToday?700:400}}>
                {isOverdue?`⚠️ ${Math.abs(days)}d overdue`:isToday?"📅 Due today":`Next: ${fmt(t.next_due)} (${days}d)`}
              </span>}
              {t.notes&&<span style={{color:"#334155"}}>· {t.notes}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexShrink:0,flexWrap:"wrap"}}>
            <button onClick={()=>markDone(t)} style={{fontSize:11,background:"rgba(74,222,128,0.15)",border:"1px solid #4ade80",color:"#4ade80",borderRadius:7,padding:"5px 10px",cursor:"pointer",fontWeight:700,whiteSpace:"nowrap"}}>✓ Done</button>
            <button onClick={()=>toggleActive(t)} style={{fontSize:11,background:"#07111f",border:"1px solid #1e3a5f",color:"#64748b",borderRadius:7,padding:"5px 8px",cursor:"pointer"}}>{t.active?"Pause":"Resume"}</button>
            {confirmId===t.id?(
              <span style={{display:"flex",gap:4}}>
                <button onClick={()=>deleteTask(t.id)} style={{fontSize:11,background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:6,padding:"5px 8px",cursor:"pointer",fontWeight:700}}>Confirm</button>
                <button onClick={()=>setConfirmId(null)} style={{fontSize:11,background:"#1e3a5f",border:"none",color:"#94a3b8",borderRadius:6,padding:"5px 8px",cursor:"pointer"}}>✕</button>
              </span>
            ):(
              <button onClick={()=>setConfirmId(t.id)} style={{fontSize:11,background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",color:"#f87171",borderRadius:7,padding:"5px 8px",cursor:"pointer"}}>🗑</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const PRESET_TASKS=[
    {title:"RO/DI Filter Change",     category:"Filter",    frequency_days:90},
    {title:"Protein Skimmer Cup",      category:"Skimmer",   frequency_days:7},
    {title:"Carbon/GFO Replace",       category:"Filter",    frequency_days:30},
    {title:"Water Change",             category:"Water Change",frequency_days:7},
    {title:"Filter Pad/Sock Replace",  category:"Filter",    frequency_days:14},
    {title:"Test Parameters",          category:"Testing",   frequency_days:7},
    {title:"Clean Return Pump",        category:"Equipment", frequency_days:90},
    {title:"Dose Two-Part/Kalkwasser", category:"Dosing",    frequency_days:1},
    {title:"Feed Coral",               category:"Coral",     frequency_days:3},
    {title:"Scrape Algae",             category:"Maintenance",frequency_days:7},
  ];

  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  async function requestNotifications() {
    if (typeof Notification === "undefined") { showToast("Notifications not supported in Safari browser — use the Home Screen app instead","error"); return; }
    const perm = await Notification.requestPermission();
    setNotifStatus(perm);
    if (perm === "granted") {
      showToast("Notifications enabled! You'll be reminded on task due dates.");
      new Notification("🐠 AquaLog Notifications", { body:"You'll be notified when tasks are due. Open the app each day to trigger reminders.", tag:"aqualog-test" });
    } else {
      showToast("Notifications blocked. Enable in iPhone Settings → Safari → Notifications","error");
    }
  }

  return(
    <div>
      <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>Maintenance Scheduler</div>
          <div style={{fontSize:13,color:"#475569"}}>Set recurring reminders for tank maintenance tasks</div>
        </div>
        {/* Notification toggle */}
        <button onClick={notifStatus==="granted"?null:requestNotifications}
          style={{background:notifStatus==="granted"?"rgba(74,222,128,0.1)":"rgba(56,189,248,0.1)",border:`1px solid ${notifStatus==="granted"?"#4ade80":"#38bdf8"}`,color:notifStatus==="granted"?"#4ade80":"#7dd3fc",borderRadius:10,padding:"8px 16px",cursor:notifStatus==="granted"?"default":"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
          {notifStatus==="granted"?"🔔 Notifications On":notifStatus==="denied"?"🔕 Blocked in Settings":"🔔 Enable Notifications"}
        </button>
      </div>

      {/* Summary pills */}
      <div className="grid-4" style={{marginBottom:20}}>
        {[{label:"Overdue",val:tasks.filter(t=>t.active&&t.next_due&&t.next_due<TODAY_STR).length,color:"#f87171"},
          {label:"Due Today",val:tasks.filter(t=>t.active&&t.next_due===TODAY_STR).length,color:"#fbbf24"},
          {label:"Upcoming",val:tasks.filter(t=>t.active&&t.next_due>TODAY_STR).length,color:"#4ade80"},
          {label:"Total Tasks",val:tasks.filter(t=>t.active).length,color:"#38bdf8"},
        ].map(({label,val,color})=>(
          <div key={label} style={{...S.card,borderTop:`2px solid ${color}`,padding:"12px 14px"}}>
            <div style={{fontSize:10,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",marginBottom:3}}>{label}</div>
            <div style={{fontSize:22,fontWeight:700,color,fontFamily:"'DM Mono',monospace"}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Add task form + presets — FULL WIDTH ON TOP */}
      <div style={{...S.card,borderRadius:16,padding:20,marginBottom:20,borderTop:"3px solid #38bdf8"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:"#7dd3fc"}}>➕ Add Task</div>
          {/* Quick presets inline */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {PRESET_TASKS.slice(0,5).map(p=>(
              <button key={p.title} onClick={()=>setForm(prev=>({...prev,title:p.title,category:p.category,frequency_days:p.frequency_days}))}
                style={{background:"#07111f",border:"1px solid #1e3a5f",borderRadius:7,padding:"4px 10px",cursor:"pointer",fontSize:11,color:"#64748b",whiteSpace:"nowrap"}}>
                {p.title}
              </button>
            ))}
          </div>
        </div>
        <div className="grid-2">
          <Field label="Tank">
            <select value={form.tank} onChange={e=>set("tank",e.target.value)} style={S.sel}>
              {tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}
            </select>
          </Field>
          <Field label="Task Name">
            <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Clean protein skimmer cup" style={S.inp}/>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="Category">
            <select value={form.category} onChange={e=>set("category",e.target.value)} style={S.sel}>
              {TASK_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Last Done (optional)">
            <input type="date" value={form.last_done} onChange={e=>set("last_done",e.target.value)} style={S.inp}/>
          </Field>
        </div>
        <Field label="Frequency">
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:form.frequency_days===0?8:0}}>
            {TASK_FREQS.map(f=>(
              <button key={f.label} onClick={()=>set("frequency_days",f.days)} style={{background:form.frequency_days===f.days?"rgba(56,189,248,0.2)":"#07111f",border:`1px solid ${form.frequency_days===f.days?"#38bdf8":"#1e3a5f"}`,color:form.frequency_days===f.days?"#7dd3fc":"#64748b",borderRadius:7,padding:"4px 9px",cursor:"pointer",fontSize:11,fontWeight:600}}>{f.label}</button>
            ))}
          </div>
          {form.frequency_days===0&&<input type="number" min="1" value={form.customDays} onChange={e=>set("customDays",e.target.value)} placeholder="Enter days" style={S.inp}/>}
        </Field>
        <Field label="Notes">
          <input value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Any notes…" style={S.inp}/>
        </Field>
        <button onClick={addTask} disabled={saving} style={{...S.btn,width:"100%",opacity:saving?0.6:1,marginTop:4}}>
          {saving?"💾 Saving…":"📅 Schedule Task"}
        </button>
      </div>

      {/* Task list — FULL WIDTH BELOW */}
      <div>
        <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#cbd5e1"}}>Scheduled Tasks</div>
          <select value={filterTank} onChange={e=>setFilterTank(e.target.value)} style={{...S.sel,width:"auto",marginLeft:"auto"}}>
            <option value="All">All Tanks</option>
            {tanks.map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}
          </select>
        </div>

        {overdue.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#f87171",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>⚠️ Overdue ({overdue.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>{overdue.map(t=><TaskRow key={t.id} t={t} showTank={filterTank==="All"}/>)}</div>
          </div>
        )}
        {dueToday.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#fbbf24",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>📅 Due Today ({dueToday.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>{dueToday.map(t=><TaskRow key={t.id} t={t} showTank={filterTank==="All"}/>)}</div>
          </div>
        )}
        {upcoming.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#4ade80",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>✅ Upcoming ({upcoming.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>{upcoming.map(t=><TaskRow key={t.id} t={t} showTank={filterTank==="All"}/>)}</div>
          </div>
        )}
        {inactive.length>0&&(
          <div>
            <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>⏸ Paused ({inactive.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>{inactive.map(t=><TaskRow key={t.id} t={t} showTank={filterTank==="All"}/>)}</div>
          </div>
        )}
        {filtered.length===0&&<div style={{...S.card,padding:24,color:"#334155",textAlign:"center",fontSize:13}}>No tasks yet. Add one above ↑</div>}
      </div>
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────
function Insights({tanks,params,diary,lsLog,activeTank,setActiveTank,tankName}) {
  const [tank,  setTankSel] = useState(activeTank||"");
  const [aiText,setAiText]  = useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState("");
  const [ranOnce,setRanOnce]=useState(false);

  useEffect(()=>{ if(!tank&&tanks.length) setTankSel(activeTank||tankName(tanks[0])); },[tanks,activeTank]);

  const tankObj  = tanks.find(t=>(t.name||t.id)===tank);
  const isSW     = tankObj?.type==="saltwater";
  const pKeys    = isSW ? SW_PARAMS : FW_PARAMS;
  const readings = params.filter(p=>p.tank===tank).sort((a,b)=>a.date.localeCompare(b.date));
  const latest   = readings[readings.length-1];
  const color    = getTankColor(tank,tanks);

  async function runSummary() {
    if(!tankObj||!readings.length){setAiError("Not enough data to analyse yet.");return;}
    setAiLoading(true);setAiText("");setAiError("");setRanOnce(true);
    try {
      const text=await fetchAISummary(tankObj,readings,diary,lsLog);
      setAiText(text);
    } catch(e) {
      setAiError("AI error: "+e.message+". Check your VITE_ANTHROPIC_KEY env var.");
    }
    setAiLoading(false);
  }

  // ── Per-parameter analytics — convert FW alkalinity ppm→dKH first ──
  const convertedReadings = readings.map(r => {
    if (isSW || r.alkalinity == null) return r;
    return { ...r, alkalinity: Math.round(Number(r.alkalinity) * 0.056 * 100) / 100 };
  });

  const analytics = pKeys.map(p=>{
    const vals=convertedReadings.filter(r=>r[p]!=null).map(r=>Number(r[p]));
    if(!vals.length) return null;
    const safe=getSafe(p,isSW);
    const latest_v=vals[vals.length-1];
    const stability=stabilityScore(vals);
    const forecast=trendForecast(convertedReadings,p,7);
    const roc=rateOfChange(convertedReadings,p);
    const inRange=latest_v>=safe.min&&latest_v<=safe.max;
    const pctFromSafe=latest_v<safe.min?(((safe.min-latest_v)/safe.min)*100).toFixed(1):latest_v>safe.max?(((latest_v-safe.max)/safe.max)*100).toFixed(1):0;
    const rising=roc!==null&&roc>5;
    const falling=roc!==null&&roc<-5;
    const forecastOORange=forecast&&(forecast.value<safe.min||forecast.value>safe.max);
    const alkNote = p==="alkalinity"&&!isSW ? " (dKH)" : "";
    const avg = Math.round(mean(vals) * 100) / 100;
    return {p,label:PARAM_LABELS[p]+alkNote,latest:latest_v,avg,stability,forecast,roc,inRange,pctFromSafe,rising,falling,forecastOORange,color:safe.color};
  }).filter(Boolean);

  function StabilityBar({score}) {
    if(score===null) return null;
    const col=score>=80?"#4ade80":score>=60?"#fbbf24":"#f87171";
    const label=score>=80?"High":score>=60?"Moderate":"Low";
    return(
      <div style={{marginTop:4}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:10,color:"#475569"}}>Stability</span>
          <span style={{fontSize:10,color:col,fontWeight:700}}>{score}% — {label}</span>
        </div>
        <div style={{height:4,background:"#0f2035",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${score}%`,background:col,borderRadius:2,transition:"width .4s"}}/>
        </div>
      </div>
    );
  }

  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>🧠 AI Insights</div>
        <div style={{fontSize:13,color:"#475569"}}>Smart analysis, anomaly detection, trend forecasts, and stability scores</div>
      </div>

      {/* Tank selector */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        {tanks.map(t=>{const tn=tankName(t),tc=getTankColor(tn,tanks);return(
          <button key={tn} onClick={()=>{setTankSel(tn);setActiveTank(tn);setAiText("");setRanOnce(false);}}
            style={{background:tank===tn?`${tc}22`:"#0d1a2d",border:`1.5px solid ${tank===tn?tc:"#1e3a5f"}`,borderRadius:10,padding:"6px 14px",cursor:"pointer",color:tank===tn?tc:"#64748b",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>
            {t.type==="saltwater"?"🪸":"🐡"} {tn}
          </button>
        );})}
      </div>

      {/* ── Smart AI Summary Card ── */}
      <div style={{...S.card,borderTop:`3px solid ${color}`,marginBottom:18}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:2}}>🤖 Smart Summary — {tank}</div>
            <div style={{fontSize:11,color:"#475569"}}>AI-powered advice based on your actual parameter history</div>
          </div>
          <button onClick={runSummary} disabled={aiLoading||!readings.length}
            style={{...S.btn,padding:"8px 20px",fontSize:13,opacity:aiLoading||!readings.length?0.6:1,background:"linear-gradient(135deg,#581c87,#7c3aed)"}}>
            {aiLoading?"🧠 Analysing…":"✨ Generate Summary"}
          </button>
        </div>
        {aiLoading&&(
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0",color:"#64748b",fontSize:13}}>
            <div style={{width:18,height:18,border:"2px solid #1e3a5f",borderTopColor:"#7c3aed",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            Analysing {readings.length} readings across {pKeys.length} parameters…
          </div>
        )}
        {aiError&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171"}}>{aiError}</div>}
        {aiText&&(
          <div style={{background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:10,padding:"14px 16px"}}>
            {aiText.split("\n").filter(Boolean).map((line,i)=>(
              <div key={i} style={{fontSize:13,color:"#cbd5e1",lineHeight:1.6,marginBottom:line.startsWith("•")?6:0}}>
                {line.startsWith("•")?<><span style={{color:"#a78bfa",marginRight:6}}>•</span>{line.slice(1).trim()}</>:line}
              </div>
            ))}
          </div>
        )}
        {!ranOnce&&!aiLoading&&(
          <div style={{fontSize:12,color:"#334155",padding:"8px 0"}}>
            Click "Generate Summary" to get AI advice tailored to your {tank} data.
          </div>
        )}
      </div>

      {/* ── Per-parameter analytics grid ── */}
      <div style={{fontSize:13,fontWeight:700,color:"#cbd5e1",marginBottom:14}}>Parameter Analytics — {tank}</div>
      {analytics.length===0&&<div style={{...S.card,padding:24,color:"#334155",fontSize:13,textAlign:"center"}}>No parameter data yet for this tank.</div>}
      <div className="grid-2">
        {analytics.map(a=>(
          <div key={a.p} style={{...S.card,borderLeft:`3px solid ${a.color}`,padding:18,borderTop:a.forecastOORange?"2px solid #f87171":a.rising&&!a.inRange?"1px solid #f97316":"1px solid #1e3a5f"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontSize:12,color:"#64748b",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>{a.label}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                  <span style={{fontSize:28,fontWeight:700,color:a.inRange?"#e2e8f0":"#f87171",fontFamily:"'DM Mono',monospace"}}>{a.latest}</span>
                  {!a.inRange&&<span style={{fontSize:11,color:"#f87171",fontWeight:600}}>{a.pctFromSafe}% out of range</span>}
                </div>
                <div style={{fontSize:11,color:"#475569",marginTop:2}}>avg {a.avg} · safe {PARAM_SAFE[a.p].min}–{PARAM_SAFE[a.p].max}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <span style={{fontSize:18}}>{a.inRange?"✅":a.pctFromSafe>20?"🚨":"⚠️"}</span>
                {a.roc!==null&&(
                  <span style={{fontSize:11,color:Math.abs(a.roc)<5?"#475569":a.roc>0?"#f87171":"#38bdf8",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>
                    {a.roc>0?"↑":"↓"}{Math.abs(a.roc)}%
                  </span>
                )}
              </div>
            </div>

            <StabilityBar score={a.stability}/>

            {/* Rate of change alert */}
            {a.roc!==null&&Math.abs(a.roc)>10&&(
              <div style={{marginTop:8,background:a.roc>0?"rgba(248,113,113,0.08)":"rgba(56,189,248,0.08)",border:`1px solid ${a.roc>0?"#f87171":"#38bdf8"}`,borderRadius:7,padding:"6px 10px",fontSize:11,color:a.roc>0?"#f87171":"#38bdf8"}}>
                ⚡ {a.label} is <strong>{a.roc>0?"rising":"falling"} faster than usual</strong> ({a.roc>0?"+":""}{a.roc}% vs prior readings)
              </div>
            )}

            {/* Trend forecast */}
            {a.forecast&&(
              <div style={{marginTop:8,background:a.forecastOORange?"rgba(248,113,113,0.08)":"rgba(56,189,248,0.06)",border:`1px solid ${a.forecastOORange?"rgba(248,113,113,0.4)":"#1e3a5f"}`,borderRadius:7,padding:"6px 10px",fontSize:11}}>
                <span style={{color:"#64748b"}}>📈 Forecast: </span>
                <span style={{color:a.forecastOORange?"#f87171":"#7dd3fc",fontWeight:600}}>{a.forecast.value}</span>
                <span style={{color:"#475569"}}> by {a.forecast.dayName}</span>
                {a.forecastOORange&&<span style={{color:"#f87171",marginLeft:4,fontWeight:600}}>⚠️ heading out of range</span>}
                {a.forecast.slope!==0&&(
                  <span style={{color:"#334155",marginLeft:6}}>
                    ({a.forecast.slope>0?"↑":"↓"}{Math.abs(Math.round(a.forecast.slope*100)/100)}/reading)
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bioload & Compatibility AI ───────────────────────────────────────────────
function Bioload({tanks,lsLog,params,showToast,tankName,activeTank,setActiveTank}) {
  const [tank,    setTankSel]   = useState(activeTank||"");
  const [aiText,  setAiText]    = useState("");
  const [aiLoading,setAiLoading]= useState(false);
  const [aiError, setAiError]   = useState("");
  const [mode,    setMode]      = useState("bioload"); // "bioload" | "compatibility" | "move"
  const [moveTo,  setMoveTo]    = useState("");
  const [moveItem,setMoveItem]  = useState("");

  useEffect(()=>{ if(!tank&&tanks.length) setTankSel(activeTank||tankName(tanks[0])); },[tanks,activeTank]);

  const tankObj  = tanks.find(t=>(t.name||t.id)===tank);
  const isSW     = tankObj?.type==="saltwater";
  const color    = getTankColor(tank,tanks);
  const liveTank = lsLog.filter(l=>l.tank===tank&&l.status==="Live");
  const totalQty = liveTank.reduce((s,l)=>s+(l.qty||1),0);
  const latest   = params.filter(p=>p.tank===tank).sort((a,b)=>b.date.localeCompare(a.date))[0];

  function buildTankContext(tn) {
    const t = tanks.find(x=>(x.name||x.id)===tn);
    const ls = lsLog.filter(l=>l.tank===tn&&l.status==="Live");
    const p  = params.filter(x=>x.tank===tn).sort((a,b)=>b.date.localeCompare(a.date))[0];
    return {
      name: tn,
      type: t?.type||"unknown",
      volume: t?.volume_gal||"unknown",
      livestock: ls.map(l=>`${l.qty>1?l.qty+"× ":""}${l.name} (${l.type||"unknown"}, ${daysAlive(l.date_added)} days)`).join(", ")||"empty",
      params: p ? Object.entries(PARAM_LABELS).filter(([k])=>p[k]!=null).map(([k,label])=>`${label}: ${p[k]}`).join(", ") : "no recent readings",
    };
  }

  async function runAnalysis() {
    if(!tankObj){showToast("Select a tank first","error");return;}
    setAiLoading(true);setAiText("");setAiError("");
    const ctx = buildTankContext(tank);
    let prompt = "";

    if(mode==="bioload") {
      prompt = `You are an expert marine and freshwater aquarium biologist. Analyze this tank's bioload capacity and stocking level.

Tank: ${ctx.name}
Type: ${ctx.type} | Volume: ${ctx.volume} gallons
Current inhabitants: ${ctx.livestock}
Latest water parameters: ${ctx.params}

Please provide:
• Overall bioload assessment: Understocked / Appropriately stocked / Overstocked
• Estimated bioload percentage used (e.g. "~60% of capacity")
• Which species contribute most to bioload
• Water quality impact based on current parameters
• Specific recommendations:
  - If understocked: What species would be good additions (compatible, appropriate for tank size and type)
  - If overstocked: What to consider removing or rehoming
  - Coral/plant additions if a reef tank
• Maximum safe stocking recommendation for this tank size

Be specific with numbers and species names. Keep response under 200 words, use bullet points (•).`;
    }
    else if(mode==="compatibility") {
      prompt = `You are an expert aquarium biologist specializing in fish and coral compatibility.

Tank: ${ctx.name}
Type: ${ctx.type} | Volume: ${ctx.volume} gallons
Current inhabitants: ${ctx.livestock}
Latest parameters: ${ctx.params}

Please analyze:
• Are all current tank inhabitants compatible with each other? Flag any issues.
• Aggression/territorial concerns between current species
• Parameter compatibility (do all species share similar requirements?)
• Any predator/prey risks currently in the tank
• Top 3 species that would be GOOD additions (with reasons)
• Top 3 species to AVOID adding (with reasons)

Be specific. Use bullet points (•). Under 200 words.`;
    }
    else if(mode==="move" && moveTo && moveItem) {
      const destCtx = buildTankContext(moveTo);
      prompt = `You are an expert aquarium biologist. Analyze whether moving a livestock item between tanks is safe.

MOVE REQUEST: Move "${moveItem}" from ${ctx.name} to ${moveTo}

SOURCE TANK (${ctx.name}):
Type: ${ctx.type} | Volume: ${ctx.volume}G
Inhabitants: ${ctx.livestock}
Parameters: ${ctx.params}

DESTINATION TANK (${destCtx.name}):
Type: ${destCtx.type} | Volume: ${destCtx.volume}G
Inhabitants: ${destCtx.livestock}
Parameters: ${destCtx.params}

Please analyze:
• Is this move SAFE or RISKY? (clear recommendation)
• Compatibility with existing inhabitants in destination tank
• Water parameter compatibility (salinity, pH, temperature needs)
• Bioload impact on destination tank
• Acclimation advice if the move is safe
• Any specific risks or concerns

Be direct with a clear Safe/Risky verdict. Use bullet points (•). Under 200 words.`;
    }
    else {
      showToast(mode==="move"?"Select destination tank and item to move":"Unknown mode","error");
      setAiLoading(false);return;
    }

    try {
      const response = await fetch("/api/summary", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt}),
      });
      const data = await response.json();
      if(data.error) throw new Error(data.error);
      setAiText(data.text);
    } catch(e) {
      setAiError("AI error: "+e.message);
    }
    setAiLoading(false);
  }

  const destTankObj = tanks.find(t=>(t.name||t.id)===moveTo);
  const destLive    = lsLog.filter(l=>l.tank===moveTo&&l.status==="Live");

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:20,fontWeight:700,color:"#e2e8f0",marginBottom:3}}>⚖️ Bioload & Compatibility</div>
        <div style={{fontSize:13,color:"#475569"}}>AI analysis of stocking levels, species compatibility, and safe moves between tanks</div>
      </div>

      {/* Tank selector */}
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {tanks.map(t=>{const tn=tankName(t),tc=getTankColor(tn,tanks);return(
          <button key={tn} onClick={()=>{setTankSel(tn);setActiveTank(tn);setAiText("");}}
            style={{background:tank===tn?`${tc}22`:"#0d1a2d",border:`1.5px solid ${tank===tn?tc:"#1e3a5f"}`,borderRadius:10,padding:"6px 14px",cursor:"pointer",color:tank===tn?tc:"#64748b",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>
            {t.type==="saltwater"?"🪸":"🐡"} {tn}
          </button>
        );})}
      </div>

      <div className="grid-2" style={{marginBottom:18,alignItems:"start"}}>
        {/* Left — tank snapshot */}
        <div style={{...S.card,borderTop:`3px solid ${color}`}}>
          <div style={{fontSize:12,fontWeight:700,color:"#cbd5e1",marginBottom:12}}>
            {isSW?"🪸":"🐡"} {tank} — Current Stock
          </div>
          <div style={{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{background:"#07111f",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:color,fontFamily:"'DM Mono',monospace"}}>{totalQty}</div>
              <div style={{fontSize:10,color:"#475569"}}>Total Inhabitants</div>
            </div>
            <div style={{background:"#07111f",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#38bdf8",fontFamily:"'DM Mono',monospace"}}>{tankObj?.volume_gal||"?"}</div>
              <div style={{fontSize:10,color:"#475569"}}>Gallons</div>
            </div>
            <div style={{background:"#07111f",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#a78bfa",fontFamily:"'DM Mono',monospace"}}>
                {tankObj?.volume_gal?Math.round(totalQty/(tankObj.volume_gal)*10)/10:"?"}
              </div>
              <div style={{fontSize:10,color:"#475569"}}>Fish per Gallon</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {liveTank.map((l,i)=>(
              <div key={l.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#07111f",borderRadius:7,padding:"6px 10px"}}>
                <div>
                  <div style={{fontSize:12,color:"#e2e8f0",fontWeight:600}}>{l.qty>1?`${l.qty}× `:""}{l.name}</div>
                  <div style={{fontSize:10,color:"#475569"}}>{l.type} · {daysAlive(l.date_added)}d</div>
                </div>
              </div>
            ))}
            {liveTank.length===0&&<div style={{fontSize:12,color:"#334155",padding:8}}>No livestock recorded.</div>}
          </div>
          {latest&&(
            <div style={{marginTop:10,background:"#07111f",borderRadius:7,padding:"8px 10px",fontSize:11,color:"#64748b"}}>
              <span style={{fontWeight:600,color:"#475569"}}>Latest params: </span>
              {(isSW?SW_PARAMS:FW_PARAMS).filter(p=>latest[p]!=null).map(p=>`${p}: ${latest[p]}`).join(" · ")}
            </div>
          )}
        </div>

        {/* Right — analysis type + run */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Mode selector */}
          <div style={{...S.card,borderRadius:14}}>
            <div style={{fontSize:12,fontWeight:700,color:"#cbd5e1",marginBottom:12}}>Analysis Type</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {k:"bioload",     icon:"⚖️", label:"Bioload Assessment",      desc:"How loaded is this tank? What can I add or should remove?"},
                {k:"compatibility",icon:"🤝",label:"Compatibility Check",      desc:"Are current inhabitants compatible? What's safe to add?"},
                {k:"move",        icon:"🔄", label:"Move Between Tanks",       desc:"Is it safe to move a fish/coral to another tank?"},
              ].map(m=>(
                <button key={m.k} onClick={()=>{setMode(m.k);setAiText("");}}
                  style={{background:mode===m.k?"rgba(56,189,248,0.1)":"#07111f",border:`1.5px solid ${mode===m.k?"#38bdf8":"#1e3a5f"}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:16}}>{m.icon}</span>
                    <span style={{fontSize:13,fontWeight:700,color:mode===m.k?"#7dd3fc":"#94a3b8"}}>{m.label}</span>
                  </div>
                  <div style={{fontSize:11,color:"#475569",marginLeft:24}}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Move config */}
          {mode==="move"&&(
            <div style={{...S.card,borderRadius:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#cbd5e1",marginBottom:10}}>Move Details</div>
              <Field label="Item to Move">
                <select value={moveItem} onChange={e=>setMoveItem(e.target.value)} style={S.sel}>
                  <option value="">— select from {tank} —</option>
                  {liveTank.map(l=><option key={l.id} value={l.name}>{l.qty>1?`${l.qty}× `:""}{l.name}</option>)}
                </select>
              </Field>
              <Field label="Destination Tank">
                <select value={moveTo} onChange={e=>setMoveTo(e.target.value)} style={S.sel}>
                  <option value="">— select destination —</option>
                  {tanks.filter(t=>tankName(t)!==tank).map(t=><option key={tankName(t)} value={tankName(t)}>{tankName(t)}</option>)}
                </select>
              </Field>
              {moveTo&&(
                <div style={{background:"#07111f",borderRadius:7,padding:"8px 10px",fontSize:11,color:"#64748b",marginTop:4}}>
                  <span style={{fontWeight:600,color:"#475569"}}>Destination: </span>
                  {destTankObj?.type==="saltwater"?"🪸":"🐡"} {moveTo} · {destTankObj?.volume_gal||"?"}G · {destLive.length} species
                </div>
              )}
            </div>
          )}

          {/* Run button */}
          <button onClick={runAnalysis} disabled={aiLoading||!liveTank.length}
            style={{...S.btn,width:"100%",opacity:aiLoading||!liveTank.length?0.6:1,
              background:"linear-gradient(135deg,#581c87,#7c3aed)",fontSize:14,padding:"14px"}}>
            {aiLoading?"🧠 Analysing…":
             mode==="bioload"?"⚖️ Analyse Bioload":
             mode==="compatibility"?"🤝 Check Compatibility":
             "🔄 Check Move Safety"}
          </button>
        </div>
      </div>

      {/* AI Result */}
      {(aiText||aiError||aiLoading)&&(
        <div style={{...S.card,borderTop:"3px solid #7c3aed"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#a78bfa",marginBottom:14}}>
            {mode==="bioload"?"⚖️ Bioload Analysis":mode==="compatibility"?"🤝 Compatibility Report":"🔄 Move Safety Analysis"} — {tank}
            {mode==="move"&&moveTo&&<span style={{color:"#64748b"}}> → {moveTo}</span>}
          </div>
          {aiLoading&&(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"16px 0",color:"#64748b",fontSize:13}}>
              <div style={{width:18,height:18,border:"2px solid #1e3a5f",borderTopColor:"#7c3aed",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              Consulting AI aquarium expert…
            </div>
          )}
          {aiError&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid #f87171",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#f87171"}}>{aiError}</div>}
          {aiText&&(
            <div style={{background:"rgba(124,58,237,0.06)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:10,padding:"16px 18px"}}>
              {aiText.split("\n").filter(Boolean).map((line,i)=>{
                const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
                const isSafe   = line.toLowerCase().includes("safe") && !line.toLowerCase().includes("not safe") && !line.toLowerCase().includes("unsafe");
                const isRisky  = line.toLowerCase().includes("risky") || line.toLowerCase().includes("risk") || line.toLowerCase().includes("overstocked") || line.toLowerCase().includes("unsafe");
                const lineColor = isSafe?"#4ade80":isRisky?"#f87171":"#cbd5e1";
                return(
                  <div key={i} style={{fontSize:13,color:lineColor,lineHeight:1.7,marginBottom:isBullet?5:0}}>
                    {isBullet
                      ? <><span style={{color:"#a78bfa",marginRight:6}}>•</span>{line.replace(/^[•\-]\s*/,"")}</>
                      : <span style={{fontWeight:line.length<60?700:400}}>{line}</span>
                    }
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
