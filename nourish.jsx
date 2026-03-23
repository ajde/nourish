import { useState, useEffect, useRef, useCallback } from "react";

// ─── Helpers ───────────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MEAL_TYPES = ["Breakfast","Snack 1","Lunch","Snack 2","Dinner"];
const TYPE_EMOJI = {"Breakfast":"🌅","Snack 1":"🍎","Lunch":"🥙","Snack 2":"🥜","Dinner":"🌙"};
const TYPE_COLOR = {"Breakfast":"#F4A261","Snack 1":"#52B788","Lunch":"#4895EF","Snack 2":"#52B788","Dinner":"#E07A5F"};

function calcTDEE(weight, height, age, sex, activity) {
  const bmr = sex === "male"
    ? 10*weight + 6.25*height - 5*age + 5
    : 10*weight + 6.25*height - 5*age - 161;
  const mult = {sedentary:1.2,light:1.375,moderate:1.55,active:1.725,very:1.9};
  return Math.round(bmr * (mult[activity]||1.55));
}
function goalCalories(tdee, goal) {
  if (goal==="bulk") return tdee+350;
  if (goal==="cut")  return tdee-400;
  return tdee;
}
function goalProtein(weight, goal) {
  if (goal==="bulk")  return Math.round(weight*2.2);
  if (goal==="cut")   return Math.round(weight*2.4);
  if (goal==="recomp")return Math.round(weight*2.2);
  return Math.round(weight*1.8);
}
function emptyWeekMeals() {
  return Object.fromEntries(DAYS.map(d=>[d,[]]));
}
function todayDayName() {
  return DAYS[new Date().getDay()===0?6:new Date().getDay()-1];
}

const GOAL_OPTIONS = [
  {value:"bulk",    label:"Bulk Up",   icon:"💪",desc:"Build muscle & gain weight"},
  {value:"cut",     label:"Lose Fat",  icon:"🔥",desc:"Reduce body fat, lean out"},
  {value:"maintain",label:"Maintain",  icon:"⚖️", desc:"Stay at current weight"},
  {value:"recomp",  label:"Recomp",    icon:"🔄",desc:"Build muscle, lose fat"},
];
const ACTIVITY_OPTIONS = [
  {value:"sedentary",label:"Sedentary",      desc:"Desk job, little exercise"},
  {value:"light",    label:"Lightly Active", desc:"Exercise 1–3×/week"},
  {value:"moderate", label:"Moderate",       desc:"Exercise 3–5×/week"},
  {value:"active",   label:"Very Active",    desc:"Hard training 6–7×/week"},
  {value:"very",     label:"Athlete",        desc:"Intense training daily"},
];
const DIET_OPTIONS = [
  {value:"none",       label:"No restrictions",icon:"🍽️"},
  {value:"halal",      label:"Halal",          icon:"☪️"},
  {value:"vegetarian", label:"Vegetarian",     icon:"🥦"},
  {value:"vegan",      label:"Vegan",          icon:"🌱"},
  {value:"gluten",     label:"Gluten-free",    icon:"🌾"},
  {value:"dairy",      label:"Dairy-free",     icon:"🥛"},
];
const ONBOARD_STEPS = ["welcome","basics","body","goal","activity","diet","summary"];

// ─── Micro-feedback (visual tap flash) ────────────────────────────────────
function useTap() {
  const [tapped, setTapped] = useState(null);
  const tap = useCallback((id) => {
    setTapped(id);
    setTimeout(()=>setTapped(null), 150);
  }, []);
  return [tapped, tap];
}

// ─── Arc Ring ──────────────────────────────────────────────────────────────
function Arc({value, max, size, stroke, color, bg, label, sub}) {
  const r = (size-stroke)/2;
  const circ = 2*Math.PI*r;
  const pct = Math.min(value/(max||1), 1);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"absolute"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${pct*circ} ${circ}`} strokeLinecap="round"
            style={{transition:"stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:size*0.2,fontWeight:800,color:"#EEF4F0",fontFamily:"'Outfit',sans-serif",lineHeight:1}}>{label}</div>
          <div style={{fontSize:size*0.125,color:"#7BA897",fontFamily:"'Outfit',sans-serif"}}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Sheet Modal ────────────────────────────────────────────────────
function BottomSheet({open, onClose, children, title}) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
      <div style={{
        position:"relative",background:"#0D2218",borderRadius:"24px 24px 0 0",
        padding:"0 0 env(safe-area-inset-bottom,20px)",
        maxHeight:"90vh",overflowY:"auto",
        boxShadow:"0 -8px 64px #000A",
        animation:"sheetUp 0.32s cubic-bezier(.32,1,.23,1)"
      }} onClick={e=>e.stopPropagation()}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px"}}>
          <div style={{width:36,height:4,background:"#2D5A48",borderRadius:99}}/>
        </div>
        {title && <div style={{padding:"0 20px 16px",fontFamily:"'Fraunces',serif",fontSize:20,color:"#EEF4F0",fontWeight:700}}>{title}</div>}
        <div style={{padding:"0 20px 24px"}}>{children}</div>
      </div>
    </div>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────
function Toast({msg}) {
  if (!msg) return null;
  return (
    <div style={{
      position:"fixed",top:"env(safe-area-inset-top,16px)",left:"50%",transform:"translateX(-50%)",
      marginTop:16,
      background:"#1A5C45",color:"#fff",padding:"10px 20px",borderRadius:32,
      fontWeight:700,fontSize:13,zIndex:9999,boxShadow:"0 8px 32px #0009",
      animation:"toastIn 0.25s ease",whiteSpace:"nowrap",fontFamily:"'Outfit',sans-serif"
    }}>{msg}</div>
  );
}

// ─── Shared input styles ───────────────────────────────────────────────────
const IS = {width:"100%",background:"#0A1A10",border:"1.5px solid #1A3A28",borderRadius:14,
  padding:"14px 16px",color:"#EEF4F0",fontSize:16,outline:"none",
  boxSizing:"border-box",fontFamily:"'Outfit',sans-serif",WebkitAppearance:"none"};
const LS = {display:"block",color:"#7BA897",fontSize:11,fontWeight:700,
  textTransform:"uppercase",letterSpacing:1,marginBottom:6};

function Field({label, value, onChange, placeholder, type="text"}) {
  return (
    <div style={{marginBottom:18}}>
      <label style={LS}>{label}</label>
      <input type={type} inputMode={type==="number"?"decimal":"text"}
        value={value} onChange={e=>onChange(e.target.value)}
        placeholder={placeholder} style={IS}/>
    </div>
  );
}

function StepHeader({title, subtitle}) {
  return (
    <div style={{marginBottom:28}}>
      <h2 style={{fontFamily:"'Fraunces',serif",fontSize:30,color:"#EEF4F0",margin:"0 0 8px",lineHeight:1.15}}>{title}</h2>
      {subtitle && <p style={{color:"#7BA897",fontSize:15,margin:0,lineHeight:1.5}}>{subtitle}</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]   = useState("loading");
  const [step, setStep]       = useState(0);
  const [profile, setProfile] = useState({
    name:"",age:"",sex:"male",height:"",weight:"",targetWeight:"",
    goal:"bulk",activity:"moderate",diet:[],timeline:""
  });
  const [meals, setMeals]         = useState(emptyWeekMeals());
  const [weightLog, setWeightLog] = useState([]);
  const [activeDay, setActiveDay] = useState(todayDayName());
  const [view, setView]           = useState("today");
  const [editingMeal, setEditingMeal] = useState(null);
  const [addingMeal, setAddingMeal]   = useState(false);
  const [editForm, setEditForm]       = useState({});
  const [newWeight, setNewWeight]     = useState("");
  const [toast, setToast]     = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [tapped, tap] = useTap();
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(null), 2200);
  };

  useEffect(()=>{
    (async()=>{
      try {
        const p = await window.storage.get("nt-profile");
        const m = await window.storage.get("nt-meals");
        const w = await window.storage.get("nt-weight");
        if (p) {
          const prof = JSON.parse(p.value);
          setProfile(prof);
          setWeightLog(w ? JSON.parse(w.value) : [{date:new Date().toISOString().split("T")[0],weight:+prof.weight}]);
          setMeals(m ? JSON.parse(m.value) : emptyWeekMeals());
          setScreen("app");
        } else { setScreen("onboard"); }
      } catch { setScreen("onboard"); }
    })();
  }, []);

  const save = async(prof,ml,wl)=>{
    try {
      if (prof) await window.storage.set("nt-profile", JSON.stringify(prof));
      if (ml)   await window.storage.set("nt-meals",   JSON.stringify(ml));
      if (wl)   await window.storage.set("nt-weight",  JSON.stringify(wl));
    } catch {}
  };

  // ── Computed ──
  const tdee       = profile.weight ? calcTDEE(+profile.weight,+profile.height,+profile.age,profile.sex,profile.activity) : 2200;
  const targetCal  = goalCalories(tdee, profile.goal);
  const targetProt = goalProtein(+profile.weight||75, profile.goal);
  const targetCarb = Math.round((targetCal*0.45)/4);
  const targetFat  = Math.round((targetCal*0.28)/9);
  const startWeight   = weightLog[0]?.weight || +profile.weight || 70;
  const currentWeight = weightLog.length ? weightLog[weightLog.length-1].weight : +profile.weight||70;
  const goalWeight    = +profile.targetWeight || currentWeight;
  const progress = goalWeight===startWeight ? 100 : ((currentWeight-startWeight)/(goalWeight-startWeight))*100;

  // ── AI Generate ──
  const generateMeals = async()=>{
    setGenerating(true); setAiError(null);
    const dietStr = profile.diet.filter(d=>d!=="none").length ? profile.diet.filter(d=>d!=="none").join(", ") : "no restrictions";
    const prompt = `Create a 7-day meal plan:
- Goal: ${profile.goal} (${GOAL_OPTIONS.find(g=>g.value===profile.goal)?.desc})
- Daily calories: ~${targetCal} kcal, protein ~${targetProt}g
- Dietary: ${dietStr}
Return ONLY valid JSON, no markdown:
{"Monday":[{"type":"Breakfast","name":"Name","desc":"Short description under 10 words","cal":400,"protein":25,"carbs":45,"fat":12},...5 meals],"Tuesday":[...],...all 7 days}
Meals: Breakfast, Snack 1, Lunch, Snack 2, Dinner. Total ~${targetCal} kcal/day.`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,
          messages:[{role:"user",content:prompt}]})
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||"").join("");
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      const withDone = Object.fromEntries(DAYS.map(d=>[d,(parsed[d]||[]).map((m,i)=>({...m,id:i,done:false}))]));
      setMeals(withDone); save(null,withDone,null);
      showToast("✨ Meal plan ready!");
    } catch { setAiError("Generation failed — add meals manually."); }
    setGenerating(false);
  };

  const finishOnboard = async()=>{
    const wl = [{date:new Date().toISOString().split("T")[0],weight:+profile.weight}];
    setWeightLog(wl);
    await save(profile, meals, wl);
    setScreen("app");
    setTimeout(()=>generateMeals(), 300);
  };

  const resetApp = async()=>{
    try {
      await window.storage.delete("nt-profile");
      await window.storage.delete("nt-meals");
      await window.storage.delete("nt-weight");
    } catch {}
    setProfile({name:"",age:"",sex:"male",height:"",weight:"",targetWeight:"",goal:"bulk",activity:"moderate",diet:[],timeline:""});
    setMeals(emptyWeekMeals()); setWeightLog([]); setStep(0); setScreen("onboard");
  };

  // ── Meal CRUD ──
  const todayMeals = meals[activeDay]||[];
  const doneMeals  = todayMeals.filter(m=>m.done);
  const doneCal    = doneMeals.reduce((s,m)=>s+m.cal,0);
  const doneProt   = doneMeals.reduce((s,m)=>s+m.protein,0);
  const doneCarb   = doneMeals.reduce((s,m)=>s+m.carbs,0);
  const doneFat    = doneMeals.reduce((s,m)=>s+m.fat,0);

  const toggleDone = (idx)=>{
    tap(`meal-${idx}`);
    const upd = {...meals,[activeDay]:meals[activeDay].map((m,i)=>i===idx?{...m,done:!m.done}:m)};
    setMeals(upd); save(null,upd,null);
    showToast(upd[activeDay][idx].done?"✅ Logged!":"↩️ Unmarked");
  };
  const openEdit = (day,idx)=>{ setEditingMeal({day,idx}); setEditForm({...meals[day][idx]}); setAddingMeal(false); };
  const openAdd  = ()=>{ setEditForm({type:"Breakfast",name:"",desc:"",cal:"",protein:"",carbs:"",fat:""}); setAddingMeal(true); setEditingMeal(null); };
  const saveEdit = ()=>{
    const m={...editForm,cal:+editForm.cal,protein:+editForm.protein,carbs:+editForm.carbs,fat:+editForm.fat};
    const upd={...meals,[editingMeal.day]:meals[editingMeal.day].map((x,i)=>i===editingMeal.idx?m:x)};
    setMeals(upd); save(null,upd,null); setEditingMeal(null); showToast("✏️ Updated!");
  };
  const saveAdd = ()=>{
    const m={...editForm,cal:+editForm.cal,protein:+editForm.protein,carbs:+editForm.carbs,fat:+editForm.fat,id:Date.now(),done:false};
    const upd={...meals,[activeDay]:[...(meals[activeDay]||[]),m]};
    setMeals(upd); save(null,upd,null); setAddingMeal(false); showToast("➕ Added!");
  };
  const deleteMeal = (day,idx)=>{
    const upd={...meals,[day]:meals[day].filter((_,i)=>i!==idx)};
    setMeals(upd); save(null,upd,null); setEditingMeal(null); showToast("🗑️ Deleted");
  };
  const addWeight = ()=>{
    if (!newWeight||isNaN(+newWeight)) return;
    const today = new Date().toISOString().split("T")[0];
    const upd = [...weightLog.filter(w=>w.date!==today),{date:today,weight:+newWeight}].sort((a,b)=>a.date.localeCompare(b.date));
    setWeightLog(upd); save(null,null,upd); setNewWeight(""); showToast("⚖️ Logged!");
  };

  const modalOpen = editingMeal!==null||addingMeal;
  const stepKey = ONBOARD_STEPS[step];
  const canNext = ()=>{
    if (stepKey==="basics") return profile.name&&profile.age&&profile.height;
    if (stepKey==="body")   return profile.weight&&profile.targetWeight;
    return true;
  };

  const FONTS = `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Fraunces:ital,wght@0,700;0,900;1,700&display=swap`;

  const baseStyle = {
    minHeight:"100vh", minHeight:"100dvh",
    background:"#080F0C",
    fontFamily:"'Outfit',sans-serif",
    WebkitFontSmoothing:"antialiased",
    MozOsxFontSmoothing:"grayscale",
    userSelect:"none",
    WebkitUserSelect:"none",
    WebkitTapHighlightColor:"transparent",
    touchAction:"manipulation",
    overscrollBehavior:"none",
  };

  // ════════ LOADING ════════
  if (screen==="loading") return (
    <div style={{...baseStyle,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <link href={FONTS} rel="stylesheet"/>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <div style={{fontSize:48}}>🥗</div>
        <div style={{width:32,height:32,border:"3px solid #1A5C45",borderTopColor:"#52B788",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ════════ ONBOARDING ════════
  if (screen==="onboard") {
    const pct = (step/(ONBOARD_STEPS.length-1))*100;
    return (
      <div style={{...baseStyle, backgroundImage:"radial-gradient(ellipse at 15% 15%, #0D2E1E 0%, transparent 55%)"}}>
        <link href={FONTS} rel="stylesheet"/>

        {/* Status bar spacer */}
        <div style={{height:"env(safe-area-inset-top,0px)"}}/>

        {/* Progress bar */}
        {step>0 && (
          <div style={{height:3,background:"#0D2218",position:"sticky",top:0,zIndex:10}}>
            <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#1A5C45,#52B788)",transition:"width 0.35s ease"}}/>
          </div>
        )}

        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:"calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))",overflowY:"auto"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"24px 24px 0"}}>

            {/* WELCOME */}
            {stepKey==="welcome" && (
              <div style={{textAlign:"center",animation:"fadeUp 0.5s ease"}}>
                <div style={{fontSize:80,marginBottom:20,filter:"drop-shadow(0 8px 24px #52B78840)"}}>🥗</div>
                <h1 style={{fontFamily:"'Fraunces',serif",fontSize:48,color:"#EEF4F0",margin:"0 0 14px",lineHeight:1}}>Nourish</h1>
                <p style={{color:"#7BA897",fontSize:17,lineHeight:1.65,margin:"0 0 0",maxWidth:300,marginLeft:"auto",marginRight:"auto"}}>
                  Your personal nutrition & body goal tracker — built around <em style={{color:"#52B788"}}>your</em> life.
                </p>
              </div>
            )}

            {/* BASICS */}
            {stepKey==="basics" && (
              <div style={{animation:"fadeUp 0.4s ease"}}>
                <StepHeader title="About You" subtitle="We'll use this to personalise your plan"/>
                <Field label="Your name" value={profile.name} onChange={v=>setProfile({...profile,name:v})} placeholder="e.g. Alex"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <Field label="Age" value={profile.age} onChange={v=>setProfile({...profile,age:v})} placeholder="25" type="number"/>
                  <Field label="Height (cm)" value={profile.height} onChange={v=>setProfile({...profile,height:v})} placeholder="175" type="number"/>
                </div>
                <div style={{marginBottom:18}}>
                  <label style={LS}>Biological Sex</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[["male","♂ Male"],["female","♀ Female"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setProfile({...profile,sex:v})} style={{
                        background:profile.sex===v?"#122B1E":"#0A1A10",
                        border:`2px solid ${profile.sex===v?"#2D8C72":"#1A3A28"}`,
                        borderRadius:14,padding:"15px 12px",cursor:"pointer",
                        color:profile.sex===v?"#EEF4F0":"#7BA897",fontWeight:700,fontSize:15,
                        fontFamily:"'Outfit',sans-serif",transition:"all 0.2s",
                        transform:tapped===`sex-${v}`?"scale(0.96)":"scale(1)"
                      }} onPointerDown={()=>tap(`sex-${v}`)}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BODY */}
            {stepKey==="body" && (
              <div style={{animation:"fadeUp 0.4s ease"}}>
                <StepHeader title="Body Stats" subtitle="Current & target weight"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <Field label="Current (kg)" value={profile.weight} onChange={v=>setProfile({...profile,weight:v})} placeholder="70" type="number"/>
                  <Field label="Target (kg)"  value={profile.targetWeight} onChange={v=>setProfile({...profile,targetWeight:v})} placeholder="80" type="number"/>
                </div>
                <Field label="Timeline (optional)" value={profile.timeline} onChange={v=>setProfile({...profile,timeline:v})} placeholder="e.g. 5–6 months"/>
              </div>
            )}

            {/* GOAL */}
            {stepKey==="goal" && (
              <div style={{animation:"fadeUp 0.4s ease"}}>
                <StepHeader title="Your Goal" subtitle="What are you working towards?"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {GOAL_OPTIONS.map(g=>(
                    <button key={g.value} onClick={()=>setProfile({...profile,goal:g.value})} style={{
                      background:profile.goal===g.value?"#122B1E":"#0A1A10",
                      border:`2px solid ${profile.goal===g.value?"#2D8C72":"#1A3A28"}`,
                      borderRadius:18,padding:"18px 14px",cursor:"pointer",textAlign:"left",
                      transition:"all 0.2s",
                      transform:tapped===`goal-${g.value}`?"scale(0.96)":"scale(1)"
                    }} onPointerDown={()=>tap(`goal-${g.value}`)}>
                      <div style={{fontSize:30,marginBottom:8}}>{g.icon}</div>
                      <div style={{color:"#EEF4F0",fontWeight:700,fontSize:15,fontFamily:"'Outfit',sans-serif"}}>{g.label}</div>
                      <div style={{color:"#7BA897",fontSize:12,marginTop:3,fontFamily:"'Outfit',sans-serif"}}>{g.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVITY */}
            {stepKey==="activity" && (
              <div style={{animation:"fadeUp 0.4s ease"}}>
                <StepHeader title="Activity Level" subtitle="How active are you day-to-day?"/>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {ACTIVITY_OPTIONS.map(a=>(
                    <button key={a.value} onClick={()=>setProfile({...profile,activity:a.value})} style={{
                      background:profile.activity===a.value?"#122B1E":"#0A1A10",
                      border:`2px solid ${profile.activity===a.value?"#2D8C72":"#1A3A28"}`,
                      borderRadius:14,padding:"15px 16px",cursor:"pointer",textAlign:"left",
                      display:"flex",justifyContent:"space-between",alignItems:"center",
                      transition:"all 0.2s",
                      transform:tapped===`act-${a.value}`?"scale(0.98)":"scale(1)"
                    }} onPointerDown={()=>tap(`act-${a.value}`)}>
                      <div>
                        <div style={{color:"#EEF4F0",fontWeight:700,fontSize:15,fontFamily:"'Outfit',sans-serif"}}>{a.label}</div>
                        <div style={{color:"#7BA897",fontSize:13,fontFamily:"'Outfit',sans-serif"}}>{a.desc}</div>
                      </div>
                      {profile.activity===a.value && <div style={{color:"#52B788",fontSize:20,fontWeight:800}}>✓</div>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* DIET */}
            {stepKey==="diet" && (
              <div style={{animation:"fadeUp 0.4s ease"}}>
                <StepHeader title="Dietary Preferences" subtitle="Select all that apply"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {DIET_OPTIONS.map(d=>{
                    const sel = profile.diet.includes(d.value);
                    return (
                      <button key={d.value} onClick={()=>{
                        const next = sel ? profile.diet.filter(x=>x!==d.value) : [...profile.diet,d.value];
                        setProfile({...profile,diet:next});
                      }} style={{
                        background:sel?"#122B1E":"#0A1A10",
                        border:`2px solid ${sel?"#2D8C72":"#1A3A28"}`,
                        borderRadius:14,padding:"15px 12px",cursor:"pointer",
                        display:"flex",alignItems:"center",gap:10,
                        transition:"all 0.2s",
                        transform:tapped===`diet-${d.value}`?"scale(0.96)":"scale(1)"
                      }} onPointerDown={()=>tap(`diet-${d.value}`)}>
                        <span style={{fontSize:24}}>{d.icon}</span>
                        <span style={{color:"#EEF4F0",fontWeight:600,fontSize:13,fontFamily:"'Outfit',sans-serif",flex:1,textAlign:"left"}}>{d.label}</span>
                        {sel&&<span style={{color:"#52B788",fontSize:14}}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUMMARY */}
            {stepKey==="summary" && (
              <div style={{animation:"fadeUp 0.4s ease"}}>
                <StepHeader title={`All set, ${profile.name}! 🎉`} subtitle="Your personalised daily targets"/>
                <div style={{background:"#0A1A10",borderRadius:20,padding:20,border:"1px solid #152A1E",marginBottom:20}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    {[["🔥","Calories",targetCal,"kcal","#F4A261"],["💪","Protein",targetProt,"g","#52B788"],
                      ["🌾","Carbs",targetCarb,"g","#4895EF"],["🫒","Fat",targetFat,"g","#E07A5F"]].map(([e,l,v,u,c])=>(
                      <div key={l} style={{background:"#0D2218",borderRadius:14,padding:"16px 12px",border:`1px solid ${c}25`}}>
                        <div style={{fontSize:24,marginBottom:4}}>{e}</div>
                        <div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
                        <div style={{fontSize:11,color:"#7BA897",fontFamily:"'Outfit',sans-serif"}}>{l} · {u}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:14,padding:"12px 14px",background:"#0D2218",borderRadius:12,border:"1px solid #152A1E"}}>
                    <div style={{color:"#EEF4F0",fontSize:14,fontWeight:600,fontFamily:"'Outfit',sans-serif"}}>
                      {profile.weight}kg → {profile.targetWeight}kg
                      {profile.timeline&&<span style={{color:"#7BA897",fontWeight:400}}> · {profile.timeline}</span>}
                    </div>
                    <div style={{color:"#7BA897",fontSize:12,marginTop:3,fontFamily:"'Outfit',sans-serif"}}>
                      {GOAL_OPTIONS.find(g=>g.value===profile.goal)?.label} · {ACTIVITY_OPTIONS.find(a=>a.value===profile.activity)?.label}
                    </div>
                  </div>
                </div>
                <p style={{color:"#7BA897",fontSize:14,textAlign:"center",margin:"0 0 20px"}}>
                  We'll generate your AI meal plan right away ✨
                </p>
              </div>
            )}
          </div>

          {/* Nav buttons — pinned to bottom */}
          <div style={{padding:"20px 24px",paddingBottom:`calc(20px + env(safe-area-inset-bottom,0px))`}}>
            {stepKey==="welcome" ? (
              <button onClick={()=>setStep(1)} style={{
                width:"100%",background:"linear-gradient(135deg,#1A5C45,#2D8C72)",
                color:"#fff",border:"none",borderRadius:18,padding:"18px",
                fontSize:18,fontWeight:800,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",
                boxShadow:"0 8px 32px #1A5C4550",
                transform:tapped==="start"?"scale(0.97)":"scale(1)",transition:"transform 0.15s"
              }} onPointerDown={()=>tap("start")}>Get Started →</button>
            ) : stepKey==="summary" ? (
              <div>
                <button onClick={finishOnboard} style={{
                  width:"100%",background:"linear-gradient(135deg,#1A5C45,#2D8C72)",
                  color:"#fff",border:"none",borderRadius:18,padding:"18px",
                  fontSize:18,fontWeight:800,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
                  boxShadow:"0 8px 32px #1A5C4540",marginBottom:12,
                  transform:tapped==="finish"?"scale(0.97)":"scale(1)",transition:"transform 0.15s"
                }} onPointerDown={()=>tap("finish")}>Build My Plan →</button>
                <button onClick={()=>setStep(step-1)} style={{
                  width:"100%",background:"transparent",color:"#7BA897",border:"none",
                  padding:"12px",fontSize:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif"
                }}>← Back</button>
              </div>
            ) : (
              <div style={{display:"flex",gap:12}}>
                <button onClick={()=>setStep(s=>s-1)} style={{
                  flex:1,background:"#0A1A10",border:"1.5px solid #1A3A28",borderRadius:16,
                  padding:"16px",color:"#7BA897",fontWeight:700,fontSize:16,cursor:"pointer",
                  fontFamily:"'Outfit',sans-serif"
                }}>←</button>
                <button onClick={canNext()?()=>setStep(s=>s+1):undefined} style={{
                  flex:3,background:canNext()?"linear-gradient(135deg,#1A5C45,#2D8C72)":"#0A1A10",
                  border:"none",borderRadius:16,padding:"16px",
                  color:canNext()?"#fff":"#7BA897",fontWeight:800,fontSize:16,
                  cursor:canNext()?"pointer":"default",fontFamily:"'Outfit',sans-serif",
                  opacity:canNext()?1:0.5,transition:"all 0.2s",
                  transform:tapped==="next"?"scale(0.97)":"scale(1)"
                }} onPointerDown={canNext()?()=>tap("next"):undefined}>Continue →</button>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
          @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
          * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
          input, select, button { font-family: 'Outfit', sans-serif; }
          input::placeholder { color: #3A6050; }
        `}</style>
      </div>
    );
  }

  // ════════ MAIN APP ════════
  const NAV_H = 64;

  return (
    <div style={{...baseStyle, display:"flex", flexDirection:"column",
      backgroundImage:"radial-gradient(ellipse at 20% 5%, #0D2E1E 0%, transparent 45%)"}}>
      <link href={FONTS} rel="stylesheet"/>
      <Toast msg={toast}/>

      {/* Safe area top spacer */}
      <div style={{height:"env(safe-area-inset-top,0px)",background:"#080F0C",flexShrink:0}}/>

      {/* Scrollable content */}
      <div style={{flex:1, overflowY:"auto", overflowX:"hidden",
        paddingBottom:`calc(${NAV_H}px + env(safe-area-inset-bottom,0px) + 8px)`,
        WebkitOverflowScrolling:"touch"}}>

        {/* ── Meal Edit / Add Bottom Sheet ── */}
        <BottomSheet open={modalOpen} onClose={()=>{setEditingMeal(null);setAddingMeal(false);}}
          title={addingMeal?"Add Meal":"Edit Meal"}>
          {["name","desc"].map(f=>(
            <div key={f} style={{marginBottom:14}}>
              <label style={LS}>{f==="name"?"Meal Name":"Description"}</label>
              <input value={editForm[f]||""} onChange={e=>setEditForm({...editForm,[f]:e.target.value})}
                placeholder={f==="name"?"e.g. Grilled Chicken Bowl":"Ingredients / notes"}
                style={IS}/>
            </div>
          ))}
          <div style={{marginBottom:14}}>
            <label style={LS}>Meal Type</label>
            <select value={editForm.type||"Breakfast"} onChange={e=>setEditForm({...editForm,type:e.target.value})}
              style={{...IS,WebkitAppearance:"none"}}>
              {MEAL_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>
            {["cal","protein","carbs","fat"].map(f=>(
              <div key={f}>
                <label style={LS}>{f==="cal"?"Calories":f.charAt(0).toUpperCase()+f.slice(1)}{f!=="cal"?" (g)":""}</label>
                <input type="number" inputMode="decimal" value={editForm[f]||""} onChange={e=>setEditForm({...editForm,[f]:e.target.value})} style={IS}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={addingMeal?saveAdd:saveEdit} style={{
              flex:1,background:"#1A5C45",color:"#fff",border:"none",borderRadius:14,
              padding:"15px",fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:"'Outfit',sans-serif"
            }}>Save</button>
            {!addingMeal&&(
              <button onClick={()=>deleteMeal(editingMeal.day,editingMeal.idx)} style={{
                background:"#2A0E0E",color:"#F28B82",border:"1px solid #4A1515",borderRadius:14,
                padding:"15px 16px",fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:"'Outfit',sans-serif"
              }}>Delete</button>
            )}
            <button onClick={()=>{setEditingMeal(null);setAddingMeal(false);}} style={{
              background:"#122B1E",color:"#7BA897",border:"1px solid #1A3A28",borderRadius:14,
              padding:"15px 16px",fontWeight:700,cursor:"pointer",fontSize:14,fontFamily:"'Outfit',sans-serif"
            }}>Cancel</button>
          </div>
        </BottomSheet>

        {/* ═══════ TODAY ═══════ */}
        {view==="today" && (
          <div style={{padding:"20px 16px 0"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:11,color:"#52B788",fontWeight:700,letterSpacing:3,textTransform:"uppercase"}}>Nourish</div>
                <h1 style={{fontFamily:"'Fraunces',serif",fontSize:26,color:"#EEF4F0",margin:"4px 0 2px"}}>
                  Hey, {profile.name} 👋
                </h1>
                <p style={{color:"#7BA897",fontSize:13,margin:0}}>
                  {GOAL_OPTIONS.find(g=>g.value===profile.goal)?.icon} {GOAL_OPTIONS.find(g=>g.value===profile.goal)?.label} · {currentWeight}kg → {goalWeight}kg
                </p>
              </div>
              <button onClick={resetApp} style={{
                background:"#0A1A10",border:"1px solid #1A3A28",borderRadius:12,
                padding:"8px 12px",color:"#7BA897",fontSize:12,cursor:"pointer",fontWeight:600,
                fontFamily:"'Outfit',sans-serif"
              }}>⚙️</button>
            </div>

            {/* Day scroller */}
            <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:18,scrollbarWidth:"none",msOverflowStyle:"none"}}>
              {DAYS.map(d=>{
                const cnt=(meals[d]||[]).filter(m=>m.done).length;
                const tot=(meals[d]||[]).length;
                const isToday=d===todayDayName();
                return (
                  <button key={d} onClick={()=>{tap(`day-${d}`);setActiveDay(d);}} style={{
                    flexShrink:0,padding:"10px 14px",borderRadius:14,border:"none",cursor:"pointer",
                    background:activeDay===d?"#1A5C45":"#0A1A10",
                    color:activeDay===d?"#fff":"#7BA897",
                    border:`1.5px solid ${activeDay===d?"#2D8C72":isToday?"#2D5A48":"#152A1E"}`,
                    fontWeight:700,fontSize:12,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                    fontFamily:"'Outfit',sans-serif",
                    transform:tapped===`day-${d}`?"scale(0.93)":"scale(1)",transition:"transform 0.12s"
                  }}>
                    <span>{d.slice(0,3)}</span>
                    <span style={{fontSize:10,opacity:0.8}}>{cnt}/{tot}</span>
                  </button>
                );
              })}
            </div>

            {/* Macro rings */}
            <div style={{background:"#0A1A10",borderRadius:22,padding:"18px 8px",marginBottom:18,border:"1px solid #0D2218",display:"flex",justifyContent:"space-around"}}>
              <Arc value={doneCal}  max={targetCal}  size={82} stroke={7} color="#F4A261" bg="#152A1E" label={doneCal}       sub="kcal"/>
              <Arc value={doneProt} max={targetProt} size={82} stroke={7} color="#52B788" bg="#152A1E" label={`${doneProt}g`} sub="protein"/>
              <Arc value={doneCarb} max={targetCarb} size={82} stroke={7} color="#4895EF" bg="#152A1E" label={`${doneCarb}g`} sub="carbs"/>
              <Arc value={doneFat}  max={targetFat}  size={82} stroke={7} color="#E07A5F" bg="#152A1E" label={`${doneFat}g`}  sub="fat"/>
            </div>

            {/* Generate button */}
            {todayMeals.length===0 && (
              <button onClick={()=>{tap("gen");generateMeals();}} disabled={generating} style={{
                width:"100%",marginBottom:16,
                background:"linear-gradient(135deg,#122B1E,#1A5C45)",
                border:"1.5px solid #2D8C72",borderRadius:18,padding:18,color:"#52B788",
                fontWeight:700,fontSize:15,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                fontFamily:"'Outfit',sans-serif",
                transform:tapped==="gen"?"scale(0.97)":"scale(1)",transition:"transform 0.15s"
              }}>
                {generating
                  ? <><span style={{display:"inline-block",animation:"spin 0.7s linear infinite",fontSize:18}}>⟳</span>Generating your meals...</>
                  : "✨ Generate AI Meal Plan"}
              </button>
            )}
            {aiError&&<div style={{color:"#F28B82",fontSize:12,textAlign:"center",marginBottom:12}}>{aiError}</div>}

            {/* Meal cards */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {todayMeals.map((m,i)=>(
                <div key={i} style={{
                  background:m.done?"#091509":"#0A1A10",
                  border:`1.5px solid ${m.done?"#2D8C72":"#152A1E"}`,
                  borderRadius:20,padding:"16px",
                  display:"flex",alignItems:"flex-start",gap:14,
                  opacity:m.done?0.82:1,
                  transform:tapped===`meal-${i}`?"scale(0.97)":"scale(1)",
                  transition:"transform 0.12s, opacity 0.2s"
                }}>
                  <div onClick={()=>toggleDone(i)} style={{
                    width:30,height:30,borderRadius:10,flexShrink:0,marginTop:1,cursor:"pointer",
                    background:m.done?"#1A5C45":"#0D2218",
                    border:`2px solid ${m.done?"#52B788":"#1A3A28"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"#52B788",
                    transition:"all 0.2s"
                  }}>{m.done?"✓":""}</div>
                  <div style={{flex:1,minWidth:0}} onClick={()=>toggleDone(i)}>
                    <div style={{fontSize:10,fontWeight:700,color:TYPE_COLOR[m.type]||"#52B788",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>
                      {TYPE_EMOJI[m.type]} {m.type}
                    </div>
                    <div style={{color:"#EEF4F0",fontWeight:700,fontSize:15,marginBottom:4,textDecoration:m.done?"line-through":"none"}}>{m.name}</div>
                    <div style={{color:"#7BA897",fontSize:12,marginBottom:10,lineHeight:1.45}}>{m.desc}</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      {[["🔥",m.cal,"kcal"],["💪",m.protein,"g"],["🌾",m.carbs,"g"],["🫒",m.fat,"g"]].map(([e,v,u])=>(
                        <span key={e+u} style={{fontSize:11,color:"#7BA897"}}>{e} <b style={{color:"#C0DDD3"}}>{v}</b>{u}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={()=>openEdit(activeDay,i)} style={{
                    background:"#0D2218",border:"1px solid #1A3A28",borderRadius:10,
                    padding:"8px 10px",color:"#7BA897",fontSize:13,cursor:"pointer",flexShrink:0
                  }}>✏️</button>
                </div>
              ))}
            </div>

            {/* Add / Regenerate */}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>{tap("add");openAdd();}} style={{
                flex:1,background:"#0A1A10",border:"2px dashed #1A3A28",borderRadius:18,
                padding:16,color:"#52B788",fontWeight:700,fontSize:14,cursor:"pointer",
                fontFamily:"'Outfit',sans-serif",
                transform:tapped==="add"?"scale(0.97)":"scale(1)",transition:"transform 0.12s"
              }}>➕ Add Meal</button>
              {todayMeals.length>0&&(
                <button onClick={()=>{tap("regen");generateMeals();}} disabled={generating} style={{
                  background:"#0A1A10",border:"1.5px solid #1A3A28",borderRadius:18,
                  padding:"16px 18px",color:"#7BA897",fontSize:14,cursor:"pointer",fontWeight:600,flexShrink:0,
                  fontFamily:"'Outfit',sans-serif",
                  transform:tapped==="regen"?"scale(0.97)":"scale(1)",transition:"transform 0.12s"
                }}>{generating?"⟳":"✨"}</button>
              )}
            </div>

            {/* Day total pill */}
            <div style={{background:"#0A1A10",borderRadius:18,padding:"14px 16px",marginTop:14,border:"1px solid #0D2218",display:"flex",justifyContent:"space-around"}}>
              {[["Cal",todayMeals.reduce((s,m)=>s+m.cal,0),targetCal,"#F4A261"],
                ["Prot",todayMeals.reduce((s,m)=>s+m.protein,0),targetProt,"#52B788"],
                ["Carbs",todayMeals.reduce((s,m)=>s+m.carbs,0),targetCarb,"#4895EF"],
                ["Fat",todayMeals.reduce((s,m)=>s+m.fat,0),targetFat,"#E07A5F"]
              ].map(([l,v,t,c])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:800,color:c,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
                  <div style={{fontSize:9,color:"#52B78860",fontFamily:"'Outfit',sans-serif"}}>/ {t}</div>
                  <div style={{fontSize:10,color:"#7BA897",fontFamily:"'Outfit',sans-serif"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════ WEEK ═══════ */}
        {view==="week" && (
          <div style={{padding:"20px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{fontFamily:"'Fraunces',serif",fontSize:26,color:"#EEF4F0",margin:0}}>This Week</h2>
              <button onClick={()=>{tap("regen-all");generateMeals();}} disabled={generating} style={{
                background:"#0A1A10",border:"1.5px solid #1A3A28",borderRadius:12,padding:"9px 14px",
                color:"#52B788",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
                transform:tapped==="regen-all"?"scale(0.95)":"scale(1)",transition:"transform 0.12s"
              }}>{generating?"⟳ ...":"✨ Regenerate"}</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {DAYS.map(day=>{
                const ms=meals[day]||[];
                const done=ms.filter(m=>m.done).length;
                const cal=ms.reduce((s,m)=>s+m.cal,0);
                const isToday=day===todayDayName();
                return (
                  <div key={day} onClick={()=>{tap(`week-${day}`);setActiveDay(day);setView("today");}} style={{
                    background:"#0A1A10",borderRadius:18,padding:"16px",
                    border:`1.5px solid ${isToday?"#2D8C72":"#152A1E"}`,cursor:"pointer",
                    transform:tapped===`week-${day}`?"scale(0.97)":"scale(1)",transition:"transform 0.12s"
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div>
                        <span style={{color:"#EEF4F0",fontWeight:800,fontSize:16,fontFamily:"'Outfit',sans-serif"}}>
                          {day} {isToday&&<span style={{fontSize:11,color:"#52B788",fontWeight:600}}> · Today</span>}
                        </span>
                        <div style={{color:"#7BA897",fontSize:12,marginTop:2}}>{done}/{ms.length} meals · {cal} kcal</div>
                      </div>
                      <div style={{color:"#7BA897",fontSize:20}}>›</div>
                    </div>
                    <div style={{background:"#152A1E",borderRadius:99,height:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${ms.length?done/ms.length*100:0}%`,background:"linear-gradient(90deg,#52B788,#95D5B2)",borderRadius:99,transition:"width 0.5s"}}/>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                      {ms.map((m,i)=>(
                        <span key={i} style={{
                          fontSize:11,padding:"3px 10px",borderRadius:20,fontFamily:"'Outfit',sans-serif",
                          background:m.done?"#1A5C45":"#0D2218",
                          color:m.done?"#95D5B2":"#7BA897",
                          border:`1px solid ${m.done?"#2D8C72":"#1A3A28"}`,fontWeight:600
                        }}>{TYPE_EMOJI[m.type]} {m.name.split(" ").slice(0,2).join(" ")}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════ PROGRESS ═══════ */}
        {view==="progress" && (
          <div style={{padding:"20px 16px 0"}}>
            <h2 style={{fontFamily:"'Fraunces',serif",fontSize:26,color:"#EEF4F0",margin:"0 0 20px"}}>Progress</h2>

            {/* Weight card */}
            <div style={{background:"#0A1A10",borderRadius:22,padding:"24px 20px",marginBottom:14,border:"1px solid #152A1E",textAlign:"center"}}>
              <div style={{fontSize:11,color:"#52B788",fontWeight:700,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>Weight</div>
              <div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:20,alignItems:"flex-end"}}>
                <div><div style={{fontSize:24,fontWeight:800,color:"#7BA897",fontFamily:"'Outfit',sans-serif"}}>{startWeight}</div><div style={{color:"#7BA897",fontSize:11}}>Start</div></div>
                <div><div style={{fontSize:44,fontWeight:900,color:"#52B788",fontFamily:"'Fraunces',serif",lineHeight:1}}>{currentWeight}</div><div style={{color:"#7BA897",fontSize:11}}>Now</div></div>
                <div><div style={{fontSize:24,fontWeight:800,color:"#F4A261",fontFamily:"'Outfit',sans-serif"}}>{goalWeight}</div><div style={{color:"#7BA897",fontSize:11}}>Goal</div></div>
              </div>
              <div style={{background:"#152A1E",borderRadius:99,height:10,overflow:"hidden",marginBottom:8,position:"relative"}}>
                <div style={{height:"100%",width:`${Math.min(Math.max(progress,0),100)}%`,background:"linear-gradient(90deg,#52B788,#95D5B2)",borderRadius:99,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{color:"#7BA897",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                {Math.round(Math.max(progress,0))}% · {Math.abs(goalWeight-currentWeight).toFixed(1)}kg remaining
              </div>
            </div>

            {/* Log weight */}
            <div style={{background:"#0A1A10",borderRadius:18,padding:16,marginBottom:14,border:"1px solid #152A1E"}}>
              <div style={{color:"#7BA897",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Log Weight</div>
              <div style={{display:"flex",gap:10}}>
                <input type="number" inputMode="decimal" value={newWeight} onChange={e=>setNewWeight(e.target.value)}
                  placeholder={`e.g. ${currentWeight}`} step="0.1"
                  style={{...IS,flex:1}}/>
                <button onClick={()=>{tap("log-w");addWeight();}} style={{
                  background:"#1A5C45",border:"none",borderRadius:14,padding:"14px 20px",
                  color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:"'Outfit',sans-serif",flexShrink:0,
                  transform:tapped==="log-w"?"scale(0.95)":"scale(1)",transition:"transform 0.12s"
                }}>Log</button>
              </div>
            </div>

            {/* Chart */}
            {weightLog.length>=2 && (
              <div style={{background:"#0A1A10",borderRadius:18,padding:16,marginBottom:14,border:"1px solid #152A1E"}}>
                <div style={{color:"#7BA897",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>Chart</div>
                {(()=>{
                  const W=300,H=100;
                  const minW=Math.min(...weightLog.map(w=>w.weight))-0.5;
                  const maxW=Math.max(...weightLog.map(w=>w.weight),goalWeight)+0.5;
                  const px=i=>(i/(weightLog.length-1))*W;
                  const py=w=>H-((w-minW)/(maxW-minW))*H;
                  const pts=weightLog.map((w,i)=>`${px(i)},${py(w.weight)}`).join(" ");
                  const goalY=py(goalWeight);
                  const areaPath=`M${weightLog.map((w,i)=>`${px(i)},${py(w.weight)}`).join(" L")} L${W},${H} L0,${H} Z`;
                  return (
                    <svg width="100%" viewBox={`-12 -12 ${W+24} ${H+30}`} style={{overflow:"visible"}}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#52B788" stopOpacity="0.25"/>
                          <stop offset="100%" stopColor="#52B788" stopOpacity="0"/>
                        </linearGradient>
                      </defs>
                      <path d={areaPath} fill="url(#areaGrad)"/>
                      <line x1={0} y1={goalY} x2={W} y2={goalY} stroke="#F4A261" strokeWidth={1} strokeDasharray="5 4" opacity={0.6}/>
                      <text x={W} y={goalY-5} textAnchor="end" fill="#F4A261" fontSize={9} fontFamily="Outfit">{goalWeight}kg</text>
                      <polyline points={pts} fill="none" stroke="#52B788" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"/>
                      {weightLog.map((w,i)=>(
                        <g key={i}>
                          <circle cx={px(i)} cy={py(w.weight)} r={5} fill="#52B788" stroke="#080F0C" strokeWidth={2}/>
                          {(i===0||i===weightLog.length-1)&&(
                            <text x={px(i)} y={py(w.weight)-10} textAnchor="middle" fill="#95D5B2" fontSize={9} fontFamily="Outfit">{w.weight}</text>
                          )}
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            )}

            {/* History list */}
            <div style={{background:"#0A1A10",borderRadius:18,padding:16,marginBottom:14,border:"1px solid #152A1E"}}>
              <div style={{color:"#7BA897",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>History</div>
              {[...weightLog].reverse().slice(0,8).map((w,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"1px solid #0D2218"}}>
                  <span style={{color:"#7BA897",fontSize:13,fontFamily:"'Outfit',sans-serif"}}>{w.date}</span>
                  <span style={{color:"#EEF4F0",fontWeight:700,fontSize:14,fontFamily:"'Outfit',sans-serif"}}>{w.weight} kg</span>
                </div>
              ))}
              {weightLog.length===0&&<div style={{color:"#7BA897",fontSize:13,textAlign:"center",padding:10,fontFamily:"'Outfit',sans-serif"}}>No entries yet</div>}
            </div>

            {/* Macro targets */}
            <div style={{background:"#0A1A10",borderRadius:18,padding:16,border:"1px solid #152A1E"}}>
              <div style={{color:"#7BA897",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Daily Targets</div>
              {[["🔥","Calories",targetCal,"kcal","#F4A261"],["💪","Protein",targetProt,"g","#52B788"],
                ["🌾","Carbs",targetCarb,"g","#4895EF"],["🫒","Fat",targetFat,"g","#E07A5F"]].map(([e,l,v,u,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #0D2218",alignItems:"center"}}>
                  <span style={{color:"#7BA897",fontSize:14,fontFamily:"'Outfit',sans-serif"}}>{e} {l}</span>
                  <span style={{color:c,fontWeight:800,fontSize:14,fontFamily:"'Outfit',sans-serif"}}>{v} {u}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Nav Bar ── */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:"rgba(8,15,12,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
        borderTop:"1px solid #152A1E",
        paddingBottom:"env(safe-area-inset-bottom,0px)",
        zIndex:100,display:"flex"
      }}>
        {[
          ["today","📋","Today"],
          ["week","📅","Week"],
          ["progress","📈","Progress"],
        ].map(([v,e,l])=>(
          <button key={v} onClick={()=>{tap(`nav-${v}`);setView(v);}} style={{
            flex:1,padding:"12px 4px 10px",border:"none",cursor:"pointer",
            background:"transparent",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            transform:tapped===`nav-${v}`?"scale(0.9)":"scale(1)",transition:"transform 0.12s"
          }}>
            <span style={{fontSize:20,lineHeight:1,filter:view===v?"none":"grayscale(1) opacity(0.5)"}}>{e}</span>
            <span style={{fontSize:10,fontWeight:700,fontFamily:"'Outfit',sans-serif",
              color:view===v?"#52B788":"#4A7A65",transition:"color 0.2s"}}>{l}</span>
            {view===v&&<div style={{width:20,height:2.5,background:"#52B788",borderRadius:99,marginTop:1}}/>}
          </button>
        ))}
      </div>

      <style>{`
        @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;}
        input,select,button{font-family:'Outfit',sans-serif;}
        input::placeholder{color:#3A6050;}
        select option{background:#0D2218;}
        ::-webkit-scrollbar{display:none;}
        body{overscroll-behavior:none;}
      `}</style>
    </div>
  );
}
