import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';
import bodyImage from "../assets/body.png";

// ─── NUTRITION DB (per 100g/ml, or per single unit for countables) ────────────
const NUTRITION = {
  'Oats':                       { per100: { p: 16,  c: 66,  f: 7,   cal: 389 } },
  'Milk':                       { per100: { p: 3.2, c: 4.8, f: 3,   cal: 60  } },
  'Milk (low fat)':             { per100: { p: 3.4, c: 5,   f: 1.5, cal: 47  } },
  'Almonds (Badam) [15-20 pc]': { per100: { p: 21,  c: 22,  f: 50,  cal: 579 } },
  'Rice / Roti':                { per100: { p: 3,   c: 22,  f: 2,   cal: 115 } },
  'Brown Rice':                 { per100: { p: 2.6, c: 23,  f: 0.9, cal: 111 } },
  'Sabzi (1 Bowl)':             { per100: { p: 2,   c: 8,   f: 3,   cal: 70  } },
  'Sabzi (light)':              { per100: { p: 2,   c: 6,   f: 2,   cal: 55  } },
  'Chicken':                    { per100: { p: 31,  c: 0,   f: 3.6, cal: 165 } },
  'Grilled Chicken':            { per100: { p: 31,  c: 0,   f: 3.6, cal: 165 } },
  'Paneer':                     { per100: { p: 18,  c: 1.2, f: 20,  cal: 265 } },
  'Soya Chunks':                { per100: { p: 52,  c: 33,  f: 0.5, cal: 345 } },
  'Curd':                       { per100: { p: 3.5, c: 4,   f: 4,   cal: 60  } },
  'Dal / Rajma / Chana':        { per100: { p: 7,   c: 20,  f: 1,   cal: 120 } },
  'Dal':                        { per100: { p: 7,   c: 20,  f: 1,   cal: 120 } },
  'Salad':                      { per100: { p: 1.5, c: 5,   f: 0.2, cal: 25  } },
  'Mixed Nuts':                 { per100: { p: 20,  c: 20,  f: 50,  cal: 600 } },
  'Vegetable Soup':             { per100: { p: 1,   c: 5,   f: 0.5, cal: 30  } },
  'Banana':                     { perUnit: { p: 1.3, c: 27, f: 0.3, cal: 105 } },
  'Peanut Butter':              { perUnit: { p: 4,   c: 3,  f: 8,   cal: 94  } },
  'Whey Protein':               { perUnit: { p: 24,  c: 3,  f: 1.5, cal: 120 } },
  'Boiled Eggs':                { perUnit: { p: 6,   c: 0.6, f: 5,  cal: 78  } },
  'Green Tea':                  { perUnit: { p: 0,   c: 0,  f: 0,   cal: 2   } },
};

function computeItemMacros(name, amount, isCountable) {
  const entry = NUTRITION[name];
  if (!entry) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  if (isCountable && entry.perUnit) {
    const u = entry.perUnit;
    return { protein: u.p*amount, carbs: u.c*amount, fat: u.f*amount, calories: u.cal*amount };
  }
  const ref = entry.per100 || entry.perUnit;
  const factor = amount / 100;
  return { protein: ref.p*factor, carbs: ref.c*factor, fat: ref.f*factor, calories: ref.cal*factor };
}

const BASE_MEALS = {
  muscle_gain: [
    { id:'meal1', name:'Morning Shake', time:'7:00 AM', icon:'🥤', pct:22,
      items:[
        { name:'Oats', base:70, unit:'g' },
        { name:'Milk', base:250, unit:'ml' },
        { name:'Banana', base:1, unit:'pc', countable:true },
        { name:'Peanut Butter', base:1, unit:'spoon', countable:true },
        { name:'Almonds (Badam) [15-20 pc]', base:18, unit:'g' },
      ]},
    { id:'meal2', name:'Lunch', time:'1:00 PM', icon:'🍛', pct:25,
      items:[
        { name:'Rice / Roti', base:250, unit:'g' },
        { name:'Sabzi (1 Bowl)', base:175, unit:'g' },
        { name:'Chicken', base:100, unit:'g', vegAlt:'Paneer', vegBase:100, vegUnit:'g' },
      ]},
    { id:'meal3', name:'Evening Snack', time:'4:30 PM', icon:'🥚', pct:13,
      items:[
        { name:'Soya Chunks', base:30, unit:'g' },
        { name:'Curd', base:200, unit:'g' },
      ]},
    { id:'meal4', name:'Pre/Post Workout Shake', time:'7:00 PM', icon:'💪', pct:22,
      items:[
        { name:'Oats', base:60, unit:'g' },
        { name:'Milk', base:250, unit:'ml' },
        { name:'Banana', base:1, unit:'pc', countable:true },
        { name:'Peanut Butter', base:1, unit:'spoon', countable:true },
        { name:'Whey Protein', base:1, unit:'scoop', countable:true },
      ]},
    { id:'meal5', name:'Dinner', time:'9:00 PM', icon:'🍲', pct:18,
      items:[
        { name:'Rice / Roti', base:200, unit:'g' },
        { name:'Dal / Rajma / Chana', base:225, unit:'g' },
        { name:'Curd', base:200, unit:'g' },
      ]},
  ],
  fat_loss: [
    { id:'meal1', name:'Morning', time:'7:00 AM', icon:'🌅', pct:20,
      items:[
        { name:'Oats', base:60, unit:'g' },
        { name:'Milk (low fat)', base:200, unit:'ml' },
        { name:'Banana', base:1, unit:'pc', countable:true },
      ]},
    { id:'meal2', name:'Mid Morning', time:'10:30 AM', icon:'🥗', pct:15,
      items:[
        { name:'Boiled Eggs', base:3, unit:'pc', countable:true, vegAlt:'Paneer', vegBase:100, vegUnit:'g', vegCountable:false },
        { name:'Salad', base:150, unit:'g' },
      ]},
    { id:'meal3', name:'Lunch', time:'1:00 PM', icon:'🍛', pct:30,
      items:[
        { name:'Brown Rice', base:150, unit:'g' },
        { name:'Dal', base:200, unit:'g' },
        { name:'Salad', base:150, unit:'g' },
        { name:'Grilled Chicken', base:120, unit:'g', vegAlt:'Soya Chunks', vegBase:40, vegUnit:'g' },
      ]},
    { id:'meal4', name:'Evening', time:'5:00 PM', icon:'🥜', pct:10,
      items:[
        { name:'Green Tea', base:1, unit:'cup', countable:true },
        { name:'Mixed Nuts', base:20, unit:'g' },
      ]},
    { id:'meal5', name:'Dinner', time:'8:00 PM', icon:'🥣', pct:25,
      items:[
        { name:'Grilled Chicken', base:150, unit:'g', vegAlt:'Paneer', vegBase:150, vegUnit:'g' },
        { name:'Vegetable Soup', base:250, unit:'ml' },
        { name:'Sabzi (light)', base:200, unit:'g' },
      ]},
  ],
};

// ─── CORE CALCULATION ────────────────────────────────────────────────────────
// Tuned so 169cm / 64kg / 25y male (moderate) → ~2700 kcal, ~120g protein for muscle gain.
function calculateNutrition({ weight, height, age, gender, activity, goal }) {
  const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);

  // 1. BMR (Mifflin-St Jeor)
  const bmr = gender === 'male'
    ? 10*w + 6.25*h - 5*a + 5
    : 10*w + 6.25*h - 5*a - 161;

  // 2. TDEE
  const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
  const tdee = Math.round(bmr * (actMult[activity] || 1.55));

  // 3. Daily calorie target based on goal
  let calories;
  if (goal === 'fat_loss') calories = tdee - 500;
  else                     calories = tdee + 250; // muscle gain: lean surplus

  // 4. Macros — protein 1.8g/kg, fat 1g/kg, remainder carbs
  const protein = Math.round(w * 1.8);
  const fat     = Math.round(w * 1);
  const proteinCal = protein * 4;
  const fatCal     = fat * 9;
  const carbsCal   = calories - proteinCal - fatCal;
  const carbs      = Math.round(carbsCal / 4);

  return {
    bmr: Math.round(bmr),
    tdee,
    calories: Math.round(calories),
    protein,
    carbs,
    fat,
  };
}

// ─── ROUNDING HELPER ─────────────────────────────────────────────────────────
// Grams/ml: <100 → nearest 5, ≥100 → nearest 50 (222→200, 236→250, 268→250, 275→300).
function roundQuantity(value) {
  if (value < 100) return Math.max(5, Math.round(value / 5) * 5);
  return Math.max(50, Math.round(value / 50) * 50);
}

// ─── BUILD MEALS FROM TARGETS ────────────────────────────────────────────────
function buildMeals(targets, goal, isVeg) {
  const template = BASE_MEALS[goal] || BASE_MEALS.muscle_gain;

  return template.map(meal => {
    const share = meal.pct / 100;
    const mealTargetCal = targets.calories * share;

    const resolved = meal.items.map(item => {
      const useVeg = isVeg && item.vegAlt;
      return {
        name: useVeg ? item.vegAlt : item.name,
        base: useVeg ? item.vegBase : item.base,
        unit: useVeg ? (item.vegUnit || item.unit) : item.unit,
        countable: useVeg ? !!item.vegCountable : !!item.countable,
      };
    });

    const baseMealCal = resolved.reduce((sum, it) =>
      sum + computeItemMacros(it.name, it.base, it.countable).calories, 0);

    const ratio = baseMealCal > 0 ? mealTargetCal / baseMealCal : 1;

    const items = resolved.map(it => {
      let amount;
      if (it.countable) {
        amount = Math.max(1, Math.round(it.base * ratio));
      } else {
        amount = roundQuantity(it.base * ratio);
      }
      const macros = computeItemMacros(it.name, amount, it.countable);
      return { name: it.name, unit: it.unit, countable: it.countable, amount, macros };
    });

    const mealMacros = items.reduce((acc, it) => ({
      protein: acc.protein + it.macros.protein,
      carbs:   acc.carbs   + it.macros.carbs,
      fat:     acc.fat     + it.macros.fat,
      calories:acc.calories+ it.macros.calories,
    }), { protein:0, carbs:0, fat:0, calories:0 });

    return {
      id: meal.id, name: meal.name, time: meal.time, icon: meal.icon, pct: meal.pct,
      items,
      macros: {
        protein: Math.round(mealMacros.protein),
        carbs:   Math.round(mealMacros.carbs),
        fat:     Math.round(mealMacros.fat),
        calories:Math.round(mealMacros.calories),
      },
    };
  });
}

// ─── VALIDATION ──────────────────────────────────────────────────────────────
function validatePlan(targets, meals) {
  const sum = meals.reduce((acc, m) => ({
    protein: acc.protein + m.macros.protein,
    carbs:   acc.carbs   + m.macros.carbs,
    fat:     acc.fat     + m.macros.fat,
    calories:acc.calories+ m.macros.calories,
  }), { protein:0, carbs:0, fat:0, calories:0 });

  // Wider tolerance because grams are rounded to 50.
  const withinCal = Math.abs(sum.calories - targets.calories) <= 200;
  const withinP   = Math.abs(sum.protein  - targets.protein)  <= 15;
  const withinC   = Math.abs(sum.carbs    - targets.carbs)    <= 25;
  const withinF   = Math.abs(sum.fat      - targets.fat)      <= 15;
  return { sum, ok: withinCal && withinP && withinC && withinF };
}

// ─── PDF Generator ───────────────────────────────────────────────────────────
function generatePDF(meals, userInfo, targets, goalLabel, bodyImage) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p','mm','a4');
  const W=210, margin=15, cW=W-margin*2;
  const gold=[212,175,55], dark=[15,15,15], white=[255,255,255], gray=[160,160,160];
  let y=0;
  function newPage(){ doc.addPage(); y=20;
    doc.setFillColor(...dark); doc.rect(0,0,W,12,'F');
    doc.setFillColor(...gold); doc.rect(0,12,W,1.5,'F');
    doc.setTextColor(...gold); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    doc.text('BEING X LEAN',margin,8);
    doc.setTextColor(...gray); doc.setFont('helvetica','normal');
    doc.text('Personalized Diet Plan',W-margin,8,{align:'right'});
    y=22;
  }
  function checkBreak(n=20){ if(y+n>270) newPage(); }

  doc.setFillColor(...dark); doc.rect(0,0,W,297,'F');
  doc.setFillColor(...gold); doc.rect(0,0,W,3,'F'); doc.rect(margin,45,1.5,55,'F');
  doc.setTextColor(...gold); doc.setFont('helvetica','bold'); doc.setFontSize(11);
  doc.text('BEING X LEAN',margin+6,30);
  doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.text('FITNESS & NUTRITION',margin+6,38);
  doc.setTextColor(...white); doc.setFont('helvetica','bold'); doc.setFontSize(28);
  doc.text(goalLabel.toUpperCase(),margin+6,65);
  doc.setFontSize(16); doc.setTextColor(...gold); doc.text('DIET PLAN',margin+6,78);
  doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text('Personalized for your body & goals',margin+6,90);
  const img = new Image();
  img.src = bodyImage;

  doc.addImage(
    img,
    "PNG",
    105,  // X position
    35,   // Y position
    80,   // width
    70    // height
  );

  doc.setFillColor(28,28,28); doc.roundedRect(margin,105,cW,62,4,4,'F');
  doc.setFillColor(...gold); doc.roundedRect(margin, 105, cW, 9, 4, 4, 'F'); doc.rect(margin, 108, cW, 6, 'F');
  doc.setTextColor(...dark); doc.setFont('helvetica','bold'); doc.setFontSize(8);
  doc.text('YOUR STATS',margin+6,112);
  const stats=[['Weight',`${userInfo.weight}kg`],['Height',`${userInfo.height}cm`],['Age',`${userInfo.age}yrs`],['Gender',userInfo.gender],['Diet',userInfo.dietType==='veg'?'Vegetarian':'Non-Veg'],['Activity',userInfo.activity.replace('_',' ')]];
  const cw=cW/3;
  stats.forEach(([lbl,val],i)=>{
    const x=margin+6+(i%3)*cw, sy=122+Math.floor(i/3)*22;
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(lbl.toUpperCase(),x,sy);
    doc.setTextColor(...white); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(val,x,sy+7);
  });

  doc.setFillColor(28,28,28); doc.roundedRect(margin,178,cW,52,4,4,'F');
  doc.setFillColor(...gold); doc.roundedRect(margin, 178, cW, 9, 4, 4, 'F'); doc.rect(margin, 181, cW, 6, 'F');
  doc.setTextColor(...dark); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('DAILY TARGETS',margin+6,185);
  [['CALORIES',`${targets.calories}`,'kcal'],['PROTEIN',`${targets.protein}`,'g'],['CARBS',`${targets.carbs}`,'g'],['FAT',`${targets.fat}`,'g']].forEach(([lbl,val,unit],i)=>{
    const mx=margin+6+i*(cW/4);
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(lbl,mx,198);
    doc.setTextColor(...gold); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(val,mx,210);
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(unit,mx,218);
  });
  doc.setTextColor(70,70,70); doc.setFontSize(7);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}  •  being-x-lean.com`,W/2,285,{align:'center'});

  newPage();
  doc.setTextColor(...gold); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text('YOUR MEAL PLAN',margin,y); y+=3;
  doc.setFillColor(...gold); doc.rect(margin,y,38,0.8,'F'); y+=10;
  doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(8);
  doc.text(`Target: ${targets.calories} kcal  •  P:${targets.protein}g  •  C:${targets.carbs}g  •  F:${targets.fat}g`,margin,y); y+=10;

  meals.forEach((meal,idx)=>{
    checkBreak(meal.items.length*8+30);
    doc.setFillColor(...dark); doc.roundedRect(margin,y,cW,10,2,2,'F');
    doc.setFillColor(...gold); doc.rect(margin,y,3,10,'F');
    doc.setTextColor(...gold); doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.text(`${idx+1}. ${meal.name}`,margin+7,y+6.5);
    doc.setTextColor(...gray); doc.setFont('helvetica','normal'); doc.setFontSize(8);
    doc.text(meal.time,W-margin-2,y+6.5,{align:'right'}); y+=14;
    meal.items.forEach(item=>{
      checkBreak(8);
      doc.setFillColor(240,240,240); doc.rect(margin+4,y,cW-4,7,'F');
      doc.setFillColor(...gold); doc.circle(margin+7.5,y+3.5,1,'F');
      doc.setTextColor(50,50,50); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.text(item.name,margin+11,y+5);
      doc.setFont('helvetica','bold'); doc.setTextColor(80,80,80);
      doc.text(`${item.amount} ${item.unit}`,W-margin-4,y+5,{align:'right'}); y+=8.5;
    });
    checkBreak(14);
    doc.setFillColor(245,245,245); doc.roundedRect(margin+4,y,cW-4,10,1,1,'F');
    [['P',`${meal.macros.protein}g`],['C',`${meal.macros.carbs}g`],['F',`${meal.macros.fat}g`],['~',`${meal.macros.calories}kcal`]].forEach(([lbl,val],i)=>{
      const mx2=margin+4+i*((cW-4)/4)+((cW-4)/4)/2;
      doc.setTextColor(150,150,150); doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.text(lbl,mx2,y+4,{align:'center'});
      doc.setTextColor(50,50,50); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(val,mx2,y+8.5,{align:'center'});
    }); y+=16;
  });
  doc.save(`BeingXLean_${goalLabel.replace(/\s/g,'_')}_Plan.pdf`);
}

// ─── Survey Modal ────────────────────────────────────────────────────────────
function SurveyModal({ planType, onClose, onSubmit, loading, initialData }) {
  const [step,setStep]=useState(1);
  const [form,setForm]=useState(initialData||{weight:'',height:'',age:'',gender:'male',activity:'moderate',dietType:'nonveg'});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const goalLabel = planType==='fat_loss' ? 'Fat Loss / Recomp' : 'Muscle Gain';
  const valid1 = form.weight && form.height && form.age;

  return (
    <div className="diet-modal-overlay" onClick={onClose}>
      <div className="diet-modal" onClick={e=>e.stopPropagation()}>
        <div className="diet-modal-header">
          <div>
            <div className="diet-modal-eyebrow">PERSONALIZE</div>
            <h2 className="diet-modal-title">{goalLabel} Plan</h2>
          </div>
          <button className="diet-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="diet-modal-steps">
          {[1,2,3].map(s=>(
            <div key={s} className={`diet-step-dot ${s<=step?'active':''} ${s<step?'done':''}`}>{s<step?'✓':s}</div>
          ))}
        </div>
        <div className="diet-modal-body">
          {step===1 && (<>
            <h3 className="diet-modal-step-title">Your Body Stats</h3>
            <div className="diet-survey-grid">
              <div className="diet-survey-group"><label>Weight (kg)</label><input type="number" placeholder="e.g. 70" value={form.weight} onChange={e=>set('weight',e.target.value)}/></div>
              <div className="diet-survey-group"><label>Height (cm)</label><input type="number" placeholder="e.g. 175" value={form.height} onChange={e=>set('height',e.target.value)}/></div>
              <div className="diet-survey-group"><label>Age</label><input type="number" placeholder="e.g. 25" value={form.age} onChange={e=>set('age',e.target.value)}/></div>
            </div>
          </>)}
          {step===2 && (<>
            <h3 className="diet-modal-step-title">Lifestyle</h3>
            <div className="diet-survey-group">
              <label>Gender</label>
              <div className="diet-radio-group">
                {[['male','♂ Male'],['female','♀ Female']].map(([v,l])=>(
                  <button key={v} className={`diet-radio-btn ${form.gender===v?'active':''}`} onClick={()=>set('gender',v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="diet-survey-group" style={{marginTop:'1rem'}}>
              <label>Activity Level</label>
              <select value={form.activity} onChange={e=>set('activity',e.target.value)}>
                <option value="sedentary">Sedentary (desk job, no exercise)</option>
                <option value="light">Light (1–2 workouts/week)</option>
                <option value="moderate">Moderate (3–5 workouts/week)</option>
                <option value="active">Active (6–7 workouts/week)</option>
                <option value="very_active">Very Active (2x/day training)</option>
              </select>
            </div>
          </>)}
          {step===3 && (<>
            <h3 className="diet-modal-step-title">Diet Preference</h3>
            <div className="diet-pref-cards">
              {[{val:'veg',icon:'🥦',label:'Vegetarian',desc:'Paneer, Soya, Dal'},{val:'nonveg',icon:'🍗',label:'Non-Vegetarian',desc:'Chicken, Fish, Eggs'}].map(d=>(
                <button key={d.val} className={`diet-pref-card ${form.dietType===d.val?'active':''}`} onClick={()=>set('dietType',d.val)}>
                  <div style={{fontSize:32}}>{d.icon}</div>
                  <div className="diet-pref-label">{d.label}</div>
                  <div className="diet-pref-desc">{d.desc}</div>
                </button>
              ))}
            </div>
          </>)}
        </div>
        <div className="diet-modal-footer">
          {step>1 && <button className="diet-btn-back" onClick={()=>setStep(s=>s-1)}>← Back</button>}
          {step<3
            ? <button className="diet-btn-next" disabled={step===1 && !valid1} onClick={()=>setStep(s=>s+1)}>Next →</button>
            : <button className="diet-btn-generate" disabled={loading} onClick={()=>onSubmit({...form,goal:planType})}>{loading?'⏳ Generating...':'⚡ Generate My Plan'}</button>}
        </div>
      </div>
    </div>
  );
}

function LockedPlanCard(){
  return (
    <div className="locked-card-overlay">
      <div className="locked-card-content">
        <div className="locked-icon">🔒</div>
        <span className='locked-text'><h3>Locked</h3></span>
        <span className="locked-badge">Coming Soon</span>
      </div>
    </div>
  );
}

function StandardPlanView({ onSelectPlan }) {
  return (
    <div className="diet-standard-view diet-reveal">
      <div className="diet-standard-header">
        <span className="section-eyebrow">Standard Plan</span>
        <h2 className="section-title" style={{fontSize:'clamp(2rem,5vw,3.5rem)'}}>COMPLETE DIET GUIDE</h2>
        <p style={{color:'var(--text-secondary)',marginTop:'0.5rem'}}>Muscle Gain · Fat Loss · Body Recomposition — all in one guide</p>
      </div>
      <div className="diet-standard-cards">
        {[
          {icon:'💪',title:'Muscle Gain',goal:'muscle_gain',cal:'TDEE + 250',protein:'1.8g / kg',color:'#ff4500',desc:'Lean surplus + high protein to build quality muscle.'},
          {icon:'🔥',title:'Fat Loss',goal:'fat_loss',cal:'TDEE − 500',protein:'1.8g / kg',color:'#39ff14',desc:'Moderate deficit while preserving muscle with high protein.'},
          {icon:'⚖️',title:'Body Recomposition',cal:'TDEE + 200–300',protein:'1.8–2.0g/kg',color:'#ffd700',desc:'Slow quality gains with whole foods. 0.25–0.5kg/week.',locked:true},
        ].map(p=>(
          <div key={p.title} className="diet-std-card"
            style={{borderColor:p.color+'44',position:'relative',overflow:'hidden',cursor:p.locked?'default':'pointer'}}
            onClick={()=>{ if(!p.locked) onSelectPlan(p.goal); }}>
            <span style={{fontSize:32}}>{p.icon}</span>
            <h3 style={{color:p.color,fontFamily:"'Bebas Neue',cursive",fontSize:'1.6rem',margin:'0.5rem 0'}}>{p.title}</h3>
            <div className="diet-std-row"><span>Calories</span><b>{p.cal}</b></div>
            <div className="diet-std-row"><span>Protein</span><b>{p.protein}</b></div>
            <p style={{color:'var(--text-secondary)',fontSize:'0.82rem',marginTop:'0.75rem',lineHeight:1.6}}>{p.desc}</p>
            {p.locked && <LockedPlanCard/>}
          </div>
        ))}
      </div>
      <div className="diet-protein-table">
        <h3 className="section-eyebrow" style={{marginBottom:'1rem'}}>Best Indian Protein Sources</h3>
        <div className="diet-table-wrap">
          <table>
            <thead><tr>{['Food','Protein / 100g','Cost','Best For'].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {[
                ['Soya Chunks','52g','Very Low ₹','Muscle Gain'],
                ['Eggs','6g / egg','Very Low ₹','All Goals'],
                ['Paneer','18g','Medium ₹','Muscle Gain'],
                ['Chana / Chickpeas','19g','Low ₹','All Goals'],
                ['Dal (Lentils)','9g','Very Low ₹','Fat Loss'],
                ['Chicken Breast','31g','Medium ₹','All Goals'],
              ].map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="diet-tips-grid">
        {[
          {icon:'⏰',tip:'Eat protein + carbs within 45 min post-workout'},
          {icon:'💧',tip:'Drink 3–4 litres of water daily'},
          {icon:'😴',tip:'Sleep 7–9 hours — muscles grow during sleep'},
          {icon:'📈',tip:'Progressive overload every week in the gym'},
        ].map((t,i)=>(<div key={i} className="diet-tip-pill"><span>{t.icon}</span><span>{t.tip}</span></div>))}
      </div>
    </div>
  );
}

function DynamicPlanView({ meals, userInfo, targets, validation, onDownload, onEditSurvey }) {
  const goalLabel = userInfo.goal==='fat_loss' ? 'Fat Loss' : 'Muscle Gain';
  return (
    <div className="diet-dynamic-view">
      <div className="diet-dynamic-hero diet-reveal">
        <div>
          <span className="section-eyebrow">{goalLabel} — Personalized</span>
          <h2 className="section-title" style={{fontSize:'clamp(1.8rem,5vw,3rem)'}}>YOUR PLAN</h2>
          <p style={{color:'var(--text-secondary)',fontSize:'0.9rem',marginTop:'0.3rem'}}>
            {userInfo.weight}kg · {userInfo.height}cm · {userInfo.age}yrs · {userInfo.dietType==='veg'?'🥦 Veg':'🍗 Non-Veg'} · BMR: {targets.bmr} · TDEE: {targets.tdee} kcal
          </p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'0.6rem',alignItems:'flex-end'}}>
          <button className="btn-primary" onClick={onDownload} style={{whiteSpace:'nowrap'}}>⬇ Download PDF</button>
          <button className="btn-outline" onClick={()=>onEditSurvey(userInfo.goal)} style={{whiteSpace:'nowrap'}}>✏️ Edit Details</button>
        </div>
      </div>
      <div className="diet-macro-bar">
        {[
          {label:'Calories',value:targets.calories,color:'var(--accent)'},
          {label:'Protein', value:`${targets.protein}g`,color:'#00bfff'},
          {label:'Carbs',   value:`${targets.carbs}g`,color:'#ffd700'},
          {label:'Fat',     value:`${targets.fat}g`,color:'#39ff14'},
        ].map(m=>(
          <div key={m.label} className="diet-macro-chip">
            <div className="calc-result-num" style={{color:m.color,fontSize:'1.8rem'}}>{m.value}</div>
            <div className="calc-result-label">{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{textAlign:'center',fontSize:'0.78rem',margin:'0.4rem 0 1rem',color: validation.ok?'#39ff14':'#ff8a00'}}>
        {validation.ok ? '✓ Meals match daily target' : '⚠ Small variance vs target'} — Sum: {validation.sum.calories}kcal · P {validation.sum.protein}g · C {validation.sum.carbs}g · F {validation.sum.fat}g
      </div>
      <div className="diet-meals-list">
        {meals.map((meal,idx)=>(
          <div key={meal.id} className="diet-meal-block diet-reveal">
            <div className="diet-meal-block-header">
              <span className="diet-meal-num">0{idx+1}</span>
              <div>
                <div className="diet-meal-block-name">{meal.name}</div>
                <div className="diet-meal-block-time">{meal.time} · {meal.pct}%</div>
              </div>
              <span style={{fontSize:24,marginLeft:'auto'}}>{meal.icon}</span>
            </div>
            <div className="diet-meal-block-items">
              {meal.items.map((item,i)=>(
                <div key={i} className="diet-meal-row">
                  <span>{item.name}</span>
                  <span className="diet-meal-qty">{item.amount} {item.unit}</span>
                </div>
              ))}
            </div>
            <div className="diet-meal-block-macros">
              {[['P',meal.macros.protein,'g','#00bfff'],['C',meal.macros.carbs,'g','#ffd700'],['F',meal.macros.fat,'g','#39ff14'],['~',meal.macros.calories,'kcal','var(--accent)']].map(([l,v,u,c])=>(
                <div key={l} className="diet-meal-macro-chip"><b style={{color:c}}>{v}{u}</b><span>{l}</span></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',justifyContent:'center',marginTop:'2rem'}}>
        <button className="btn-primary" onClick={onDownload}>⬇ Download PDF</button>
      </div>
    </div>
  );
}

export default function Diet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab,setActiveTab]=useState('standard');
  const [showSurvey,setShowSurvey]=useState(false);
  const [surveyPlanType,setSurveyPlanType]=useState('muscle_gain');
  const [planResult,setPlanResult]=useState(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!user){ navigate('/auth',{replace:true}); return; }
    if(!hasPlan(user,'diet')){ navigate('/pricing?for=diet',{replace:true}); return; }
  },[user,navigate]);

  useEffect(()=>{
    const observer=new IntersectionObserver(
      entries=>entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); }),
      {threshold:0.08}
    );
    document.querySelectorAll('.diet-reveal').forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  },[activeTab,planResult]);

  function handleTabClick(tabId){
    if(tabId==='standard'){ setActiveTab('standard'); return; }
    setActiveTab(tabId);
    try{
      const saved=localStorage.getItem(`bxl_diet_survey_${tabId}`);
      if(saved){ handleSurveySubmit({...JSON.parse(saved),goal:tabId}); return; }
    }catch{}
    setSurveyPlanType(tabId);
    setShowSurvey(true);
  }

  function handleEditSurvey(goal){
    setSurveyPlanType(goal);
    setShowSurvey(true);
  }

  function handleSurveySubmit(formData){
    setLoading(true);
    setTimeout(()=>{
      const targets = calculateNutrition(formData);
      const meals = buildMeals(targets, formData.goal, formData.dietType==='veg');
      const validation = validatePlan(targets, meals);
      setPlanResult({ meals, userInfo: formData, targets, validation });
      try{ localStorage.setItem(`bxl_diet_survey_${formData.goal}`,JSON.stringify(formData)); }catch{}
      setActiveTab(formData.goal);
      setShowSurvey(false);
      setLoading(false);
    },600);
  }

  function handleDownload(){
    if(!planResult) return;
    const goalLabel = planResult.userInfo.goal==='fat_loss' ? 'Fat Loss' : 'Muscle Gain';
    generatePDF(planResult.meals, planResult.userInfo, planResult.targets, goalLabel , bodyImage);
  }

  if(!user || !hasPlan(user,'diet')) return null;

  const tabs=[
    {id:'standard',label:'Standard Plan',icon:'📋'},
    {id:'muscle_gain',label:'Muscle Gain',icon:'💪'},
    {id:'fat_loss',label:'Fat Loss',icon:'🔥'},
  ];

  return (
    <div className="diet-page" style={{paddingBottom:80}}>
      <div className="noise-overlay"/>
      <div className="diet-main-content">
        {activeTab==='standard' && <StandardPlanView onSelectPlan={handleTabClick}/>}
        {activeTab!=='standard' && planResult && (
          <DynamicPlanView
            meals={planResult.meals}
            userInfo={planResult.userInfo}
            targets={planResult.targets}
            validation={planResult.validation}
            onDownload={handleDownload}
            onEditSurvey={handleEditSurvey}
          />
        )}
        {activeTab!=='standard' && !planResult && (
          <div className="diet-empty-state">
            <div style={{fontSize:64,marginBottom:16}}>{activeTab==='muscle_gain'?'💪':'🔥'}</div>
            <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:'2.5rem',color:'var(--accent)'}}>
              {activeTab==='muscle_gain'?'Muscle Gain Plan':'Fat Loss Plan'}
            </h2>
            <p style={{color:'var(--text-secondary)',margin:'1rem 0 2rem',maxWidth:340,textAlign:'center',lineHeight:1.7}}>
              Answer a few quick questions and we'll generate an exact meal plan with scaled food quantities for your body.
            </p>
            <button className="btn-primary" onClick={()=>{ setSurveyPlanType(activeTab); setShowSurvey(true); }}>⚡ Start Survey</button>
          </div>
        )}
      </div>
      <nav className="diet-bottom-nav">
        {tabs.map(tab=>(
          <button key={tab.id} className={`diet-nav-tab ${activeTab===tab.id?'active':''}`} onClick={()=>handleTabClick(tab.id)}>
            {activeTab===tab.id && <div className="diet-nav-indicator"/>}
            <span className="diet-nav-icon">{tab.icon}</span>
            <span className="diet-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
      {showSurvey && (
        <SurveyModal
          planType={surveyPlanType}
          onClose={()=>setShowSurvey(false)}
          onSubmit={handleSurveySubmit}
          loading={loading}
          initialData={(()=>{ try{ const s=localStorage.getItem(`bxl_diet_survey_${surveyPlanType}`); return s?JSON.parse(s):null; }catch{ return null; } })()}
        />
      )}
    </div>
  );
}
