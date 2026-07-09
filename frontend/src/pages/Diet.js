import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';

const BASE_CALORIES = 2700;

// ─── Base meal plans (60kg / 2700kcal reference) ─────────────────────────────
const BASE_MEALS = {
  muscle_gain: [
    { id: 'meal1', name: 'Morning Shake', time: '7:00 AM', icon: '🥤',
      items: [
        { name: 'Oats', base: 70, unit: 'g' },
        { name: 'Milk', base: 250, unit: 'ml' },
        { name: 'Banana', base: 1, unit: 'pc', countable: true },
        { name: 'Peanut Butter', base: 15, unit: 'g' },
        { name: 'Almonds (Badam)', base: 10, unit: 'g' },
      ],
      macros: { protein: 24, carbs: 75, fat: 22, calories: 600 }
    },
    { id: 'meal2', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice (cooked)', base: 250, unit: 'g' },
        { name: 'Sabzi / Vegetables', base: 175, unit: 'g' },
        { name: 'Chicken', base: 150, unit: 'g', vegAlt: 'Paneer', vegBase: 150 },
      ],
      macros: { protein: 38, carbs: 65, fat: 10, calories: 550 }
    },
    { id: 'meal3', name: 'Evening Snack', time: '4:30 PM', icon: '🥚',
      items: [
        { name: 'Eggs', base: 5, unit: 'pc', countable: true, vegAlt: 'Soya Chunks', vegBase: 35 },
        { name: 'Curd', base: 200, unit: 'g' },
        { name: 'Almonds', base: 15, unit: 'g' },
      ],
      macros: { protein: 30, carbs: 15, fat: 18, calories: 350 }
    },
    { id: 'meal4', name: 'Pre/Post Workout Shake', time: '7:00 PM', icon: '💪',
      items: [
        { name: 'Oats', base: 60, unit: 'g' },
        { name: 'Milk', base: 250, unit: 'ml' },
        { name: 'Banana', base: 1, unit: 'pc', countable: true },
        { name: 'Peanut Butter', base: 10, unit: 'g' },
        { name: 'Whey Protein', base: 1, unit: 'scoop', countable: true },
      ],
      macros: { protein: 42, carbs: 65, fat: 14, calories: 600 }
    },
    { id: 'meal5', name: 'Dinner', time: '9:00 PM', icon: '🍲',
      items: [
        { name: 'Rice (cooked)', base: 200, unit: 'g' },
        { name: 'Dal / Rajma / Chana', base: 225, unit: 'g' },
        { name: 'Curd', base: 200, unit: 'g' },
        { name: 'Sabzi', base: 175, unit: 'g' },
      ],
      macros: { protein: 22, carbs: 70, fat: 8, calories: 500 }
    },
  ],
  fat_loss: [
    { id: 'meal1', name: 'Morning', time: '7:00 AM', icon: '🌅',
      items: [
        { name: 'Oats', base: 60, unit: 'g' },
        { name: 'Milk (low fat)', base: 200, unit: 'ml' },
        { name: 'Banana', base: 1, unit: 'pc', countable: true },
      ],
      macros: { protein: 14, carbs: 55, fat: 6, calories: 350 }
    },
    { id: 'meal2', name: 'Mid Morning', time: '10:30 AM', icon: '🥗',
      items: [
        { name: 'Boiled Eggs', base: 3, unit: 'pc', countable: true, vegAlt: 'Paneer', vegBase: 100 },
        { name: 'Salad', base: 150, unit: 'g' },
      ],
      macros: { protein: 20, carbs: 5, fat: 10, calories: 200 }
    },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Brown Rice', base: 150, unit: 'g' },
        { name: 'Dal', base: 200, unit: 'g' },
        { name: 'Salad', base: 150, unit: 'g' },
        { name: 'Grilled Chicken', base: 120, unit: 'g', vegAlt: 'Soya Chunks', vegBase: 40 },
      ],
      macros: { protein: 35, carbs: 50, fat: 8, calories: 420 }
    },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Green Tea', base: 1, unit: 'cup', countable: true },
        { name: 'Mixed Nuts', base: 20, unit: 'g' },
      ],
      macros: { protein: 5, carbs: 8, fat: 12, calories: 160 }
    },
    { id: 'meal5', name: 'Dinner', time: '8:00 PM', icon: '🥣',
      items: [
        { name: 'Grilled Chicken', base: 150, unit: 'g', vegAlt: 'Paneer', vegBase: 150 },
        { name: 'Vegetable Soup', base: 250, unit: 'ml' },
        { name: 'Sabzi (light)', base: 200, unit: 'g' },
      ],
      macros: { protein: 32, carbs: 20, fat: 10, calories: 300 }
    },
  ],
};

// ─── Scale meals by calorie ratio ─────────────────────────────────────────────
function scaleMeals(meals, targetCalories) {
  // Scale against the actual sum of this plan's base meal calories, not a
  // hardcoded constant (which previously didn't match the real base total
  // and silently skewed every scaled meal away from the target calories).
  const baseTotal = meals.reduce((sum, meal) => sum + meal.macros.calories, 0) || BASE_CALORIES;
  const ratio = targetCalories / baseTotal;
  return meals.map(meal => ({
    ...meal,
    items: meal.items.map(item => ({
      ...item,
      amount: item.countable
        ? Math.max(1, Math.round(item.base * ratio))
        : Math.round(item.base * ratio),
    })),
    macros: {
      protein: Math.round(meal.macros.protein * ratio),
      carbs: Math.round(meal.macros.carbs * ratio),
      fat: Math.round(meal.macros.fat * ratio),
      calories: Math.round(meal.macros.calories * ratio),
    },
  }));
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generatePDF(meals, userInfo, macros, targetCalories, goalLabel) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, margin = 15, cW = W - margin * 2;
  const gold = [212, 175, 55], dark = [15, 15, 15], white = [255, 255, 255], gray = [160, 160, 160];
  let y = 0;

  function newPage() {
    doc.addPage(); y = 20;
    doc.setFillColor(...dark); doc.rect(0, 0, W, 12, 'F');
    doc.setFillColor(...gold); doc.rect(0, 12, W, 1.5, 'F');
    doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('BEING X LEAN', margin, 8);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal');
    doc.text('Personalized Diet Plan', W - margin, 8, { align: 'right' });
    y = 22;
  }

  function checkBreak(n = 20) { if (y + n > 270) newPage(); }

  // Cover
  doc.setFillColor(...dark); doc.rect(0, 0, W, 297, 'F');
  doc.setFillColor(...gold); doc.rect(0, 0, W, 3, 'F'); doc.rect(margin, 45, 1.5, 55, 'F');
  doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('BEING X LEAN', margin + 6, 30);
  doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('FITNESS & NUTRITION', margin + 6, 38);
  doc.setTextColor(...white); doc.setFont('helvetica', 'bold'); doc.setFontSize(28);
  doc.text(goalLabel.toUpperCase(), margin + 6, 65);
  doc.setFontSize(16); doc.setTextColor(...gold); doc.text('DIET PLAN', margin + 6, 78);
  doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Personalized for your body & goals', margin + 6, 90);

  // Stats box
  doc.setFillColor(28, 28, 28); doc.roundedRect(margin, 105, cW, 62, 4, 4, 'F');
  doc.setFillColor(...gold); doc.roundedRect(margin, 105, cW, 6, 4, 4, 'F'); doc.rect(margin, 108, cW, 3, 'F');
  doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('YOUR STATS', margin + 6, 112);
  const stats = [['Weight', `${userInfo.weight}kg`], ['Height', `${userInfo.height}cm`], ['Age', `${userInfo.age}yrs`], ['Gender', userInfo.gender], ['Diet', userInfo.dietType === 'veg' ? 'Vegetarian' : 'Non-Veg'], ['Activity', userInfo.activity.replace('_', ' ')]];
  const cw = cW / 3;
  stats.forEach(([lbl, val], i) => {
    const x = margin + 6 + (i % 3) * cw, sy = 122 + Math.floor(i / 3) * 22;
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(lbl.toUpperCase(), x, sy);
    doc.setTextColor(...white); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(val, x, sy + 7);
  });

  // Macros box
  doc.setFillColor(28, 28, 28); doc.roundedRect(margin, 178, cW, 52, 4, 4, 'F');
  doc.setFillColor(...gold); doc.roundedRect(margin, 178, cW, 6, 4, 4, 'F'); doc.rect(margin, 181, cW, 3, 'F');
  doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('DAILY TARGETS', margin + 6, 185);
  [['CALORIES', `${targetCalories}`, 'kcal'], ['PROTEIN', `${macros.protein}`, 'g'], ['CARBS', `${macros.carbs}`, 'g'], ['FAT', `${macros.fat}`, 'g']].forEach(([lbl, val, unit], i) => {
    const mx = margin + 6 + i * (cW / 4);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(lbl, mx, 198);
    doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(val, mx, 210);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(unit, mx, 218);
  });
  doc.setTextColor(70, 70, 70); doc.setFontSize(7);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })}  •  being-x-lean.com`, W / 2, 285, { align: 'center' });

  // Meals page
  newPage();
  doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('YOUR MEAL PLAN', margin, y); y += 3;
  doc.setFillColor(...gold); doc.rect(margin, y, 38, 0.8, 'F'); y += 10;
  doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Target: ${targetCalories} kcal  •  P:${macros.protein}g  •  C:${macros.carbs}g  •  F:${macros.fat}g`, margin, y); y += 10;

  meals.forEach((meal, idx) => {
    checkBreak(meal.items.length * 8 + 30);
    doc.setFillColor(...dark); doc.roundedRect(margin, y, cW, 10, 2, 2, 'F');
    doc.setFillColor(...gold); doc.rect(margin, y, 3, 10, 'F');
    doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(`${idx + 1}. ${meal.name}`, margin + 7, y + 6.5);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(meal.time, W - margin - 2, y + 6.5, { align: 'right' }); y += 14;

    meal.items.forEach(item => {
      checkBreak(8);
      const isVeg = userInfo.dietType === 'veg';
      const nm = isVeg && item.vegAlt ? item.vegAlt : item.name;
      const qty = item.amount;
      doc.setFillColor(240, 240, 240); doc.rect(margin + 4, y, cW - 4, 7, 'F');
      doc.setFillColor(...gold); doc.circle(margin + 7.5, y + 3.5, 1, 'F');
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(nm, margin + 11, y + 5);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
      doc.text(`${qty} ${item.unit}`, W - margin - 4, y + 5, { align: 'right' }); y += 8.5;
    });

    checkBreak(14);
    doc.setFillColor(245, 245, 245); doc.roundedRect(margin + 4, y, cW - 4, 10, 1, 1, 'F');
    [['P', `${meal.macros.protein}g`], ['C', `${meal.macros.carbs}g`], ['F', `${meal.macros.fat}g`], ['~', `${meal.macros.calories}kcal`]].forEach(([lbl, val], i) => {
      const mx2 = margin + 4 + i * ((cW - 4) / 4) + ((cW - 4) / 4) / 2;
      doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.text(lbl, mx2, y + 4, { align: 'center' });
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(val, mx2, y + 8.5, { align: 'center' });
    }); y += 16;
  });

  doc.save(`BeingXLean_${goalLabel.replace(/\s/g, '_')}_Plan.pdf`);
}

// ─── Survey Modal ─────────────────────────────────────────────────────────────
function SurveyModal({ planType, onClose, onSubmit, loading }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: 'moderate', dietType: 'nonveg' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const goalLabel = planType === 'fat_loss' ? 'Fat Loss / Recomp' : 'Muscle Gain';
  const valid1 = form.weight && form.height && form.age;

  return (
    <div className="diet-modal-overlay" onClick={onClose}>
      <div className="diet-modal" onClick={e => e.stopPropagation()}>
        <div className="diet-modal-header">
          <div>
            <div className="diet-modal-eyebrow">PERSONALIZE</div>
            <h2 className="diet-modal-title">{goalLabel} Plan</h2>
          </div>
          <button className="diet-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="diet-modal-steps">
          {[1,2,3].map(s => (
            <div key={s} className={`diet-step-dot ${s <= step ? 'active' : ''} ${s < step ? 'done' : ''}`}>
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>

        <div className="diet-modal-body">
          {step === 1 && (
            <>
              <h3 className="diet-modal-step-title">Your Body Stats</h3>
              <div className="diet-survey-grid">
                <div className="diet-survey-group">
                  <label>Weight (kg)</label>
                  <input type="number" placeholder="e.g. 70" value={form.weight} onChange={e => set('weight', e.target.value)} />
                </div>
                <div className="diet-survey-group">
                  <label>Height (cm)</label>
                  <input type="number" placeholder="e.g. 175" value={form.height} onChange={e => set('height', e.target.value)} />
                </div>
                <div className="diet-survey-group">
                  <label>Age</label>
                  <input type="number" placeholder="e.g. 25" value={form.age} onChange={e => set('age', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="diet-modal-step-title">Lifestyle</h3>
              <div className="diet-survey-group">
                <label>Gender</label>
                <div className="diet-radio-group">
                  {[['male','♂ Male'],['female','♀ Female']].map(([v,l]) => (
                    <button key={v} className={`diet-radio-btn ${form.gender===v?'active':''}`} onClick={() => set('gender', v)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="diet-survey-group" style={{marginTop:'1rem'}}>
                <label>Activity Level</label>
                <select value={form.activity} onChange={e => set('activity', e.target.value)}>
                  <option value="sedentary">Sedentary (desk job, no exercise)</option>
                  <option value="light">Light (1–2 workouts/week)</option>
                  <option value="moderate">Moderate (3–5 workouts/week)</option>
                  <option value="active">Active (6–7 workouts/week)</option>
                  <option value="very_active">Very Active (2x/day training)</option>
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="diet-modal-step-title">Diet Preference</h3>
              <div className="diet-pref-cards">
                {[
                  { val:'veg', icon:'🥦', label:'Vegetarian', desc:'Paneer, Soya, Dal' },
                  { val:'nonveg', icon:'🍗', label:'Non-Vegetarian', desc:'Chicken, Fish, Eggs' },
                ].map(d => (
                  <button key={d.val} className={`diet-pref-card ${form.dietType===d.val?'active':''}`} onClick={() => set('dietType', d.val)}>
                    <div style={{fontSize:32}}>{d.icon}</div>
                    <div className="diet-pref-label">{d.label}</div>
                    <div className="diet-pref-desc">{d.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="diet-modal-footer">
          {step > 1 && <button className="diet-btn-back" onClick={() => setStep(s => s-1)}>← Back</button>}
          {step < 3
            ? <button className="diet-btn-next" disabled={step===1 && !valid1} onClick={() => setStep(s => s+1)}>Next →</button>
            : <button className="diet-btn-generate" disabled={loading} onClick={() => onSubmit({ ...form, goal: planType })}>
                {loading ? '⏳ Generating...' : '⚡ Generate My Plan'}
              </button>
          }
        </div>
      </div>
    </div>
  );
}
//-------------------------------Locked Plan---------------
function LockedPlanCard({ plan }) {
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
// ─── Standard Plan View ─────────────────────────────── ────────────────────────
function StandardPlanView() {
  return (
    <div className="diet-standard-view diet-reveal">
      <div className="diet-standard-header">
        <span className="section-eyebrow">Standard Plan</span>
        <h2 className="section-title" style={{fontSize:'clamp(2rem,5vw,3.5rem)'}}>COMPLETE DIET GUIDE</h2>
        <p style={{color:'var(--text-secondary)',marginTop:'0.5rem'}}>Muscle Gain · Fat Loss · Body Recomposition — all in one guide</p>
      </div>

      <div className="diet-standard-cards">
        {[
          { icon:'💪', title:'Muscle Gain', cal:'2800–3200 kcal', protein:'1.6–2.2g/kg', color:'#ff4500', desc:'Calorie surplus + high protein to build lean mass fast.' },
          { icon:'🔥', title:'Fat Loss', cal:'TDEE − 300–500', protein:'2.0–2.4g/kg', color:'#39ff14', desc:'Moderate deficit while preserving muscle with high protein.' },
          { icon:'⚖️', title:'Body Recompotion', cal:'TDEE + 200–300', protein:'1.8–2.0g/kg', color:'#ffd700', desc:'Slow quality gains with whole foods. 0.25–0.5kg/week.' , locked: true },
        ].map(p => (
          <div key={p.title} className="diet-std-card" style={{borderColor: p.color + '44' , position: "relative",overflow: "hidden",}}>
            <span style={{fontSize:32}}>{p.icon}</span>
            <h3 style={{color: p.color, fontFamily:"'Bebas Neue',cursive", fontSize:'1.6rem', margin:'0.5rem 0'}}>{p.title}</h3>
            <div className="diet-std-row"><span>Calories</span><b>{p.cal}</b></div>
            <div className="diet-std-row"><span>Protein</span><b>{p.protein}</b></div>
            <p style={{color:'var(--text-secondary)', fontSize:'0.82rem', marginTop:'0.75rem', lineHeight:1.6}}>{p.desc}</p>
            {p.locked && <LockedPlanCard plan={{ label: p.title }} />}

          </div>
        ))}
      </div>

      <div className="diet-protein-table">
        <h3 className="section-eyebrow" style={{marginBottom:'1rem'}}>Best Indian Protein Sources</h3>
        <div className="diet-table-wrap">
          <table>
            <thead>
              <tr>{['Food','Protein / 100g','Cost','Best For'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {[
                ['Soya Chunks','52g','Very Low ₹','Muscle Gain'],
                ['Eggs','6g / egg','Very Low ₹','All Goals'],
                ['Paneer','18g','Medium ₹','Muscle Gain'],
                ['Chana / Chickpeas','19g','Low ₹','All Goals'],
                ['Dal (Lentils)','9g','Very Low ₹','Fat Loss'],
                ['Chicken Breast','31g','Medium ₹','All Goals'],
              ].map((r,i) => <tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="diet-tips-grid">
        {[
          {icon:'⏰', tip:'Eat protein + carbs within 45 min post-workout'},
          {icon:'💧', tip:'Drink 3–4 litres of water daily'},
          {icon:'😴', tip:'Sleep 7–9 hours — muscles grow during sleep'},
          {icon:'📈', tip:'Progressive overload every week in the gym'},
        ].map((t,i) => (
          <div key={i} className="diet-tip-pill">
            <span>{t.icon}</span><span>{t.tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dynamic Plan View ────────────────────────────────────────────────────────
function DynamicPlanView({ meals, userInfo, macros, targetCalories, tdee, onDownload }) {
  const goalLabel = userInfo.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain';
  return (
    <div className="diet-dynamic-view">
      <div className="diet-dynamic-hero diet-reveal">
        <div>
          <span className="section-eyebrow">{goalLabel} — Personalized</span>
          <h2 className="section-title" style={{fontSize:'clamp(1.8rem,5vw,3rem)'}}>YOUR PLAN</h2>
          <p style={{color:'var(--text-secondary)', fontSize:'0.9rem', marginTop:'0.3rem'}}>
            {userInfo.weight}kg · {userInfo.age}yrs · {userInfo.dietType === 'veg' ? '🥦 Veg' : '🍗 Non-Veg'} · TDEE: {tdee} kcal
          </p>
        </div>
        <button className="btn-primary" onClick={onDownload} style={{whiteSpace:'nowrap'}}>⬇ Download PDF</button>
      </div>

      <div className="diet-macro-bar">
        {[
          {label:'Calories', value:targetCalories, unit:'kcal', color:'var(--accent)'},
          {label:'Protein', value:`${macros.protein}g`, unit:'', color:'#00bfff'},
          {label:'Carbs', value:`${macros.carbs}g`, unit:'', color:'#ffd700'},
          {label:'Fat', value:`${macros.fat}g`, unit:'', color:'#39ff14'},
        ].map(m => (
          <div key={m.label} className="diet-macro-chip">
            <div className="calc-result-num" style={{color:m.color, fontSize:'1.8rem'}}>{m.value}</div>
            <div className="calc-result-label">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="diet-meals-list">
        {meals.map((meal, idx) => (
          <div key={meal.id} className="diet-meal-block diet-reveal">
            <div className="diet-meal-block-header">
              <span className="diet-meal-num">0{idx+1}</span>
              <div>
                <div className="diet-meal-block-name">{meal.name}</div>
                <div className="diet-meal-block-time">{meal.time}</div>
              </div>
              <span style={{fontSize:24, marginLeft:'auto'}}>{meal.icon}</span>
            </div>
            <div className="diet-meal-block-items">
              {meal.items.map((item, i) => {
                const isVeg = userInfo.dietType === 'veg';
                const nm = isVeg && item.vegAlt ? item.vegAlt : item.name;
                return (
                  <div key={i} className="diet-meal-row">
                    <span>{nm}</span>
                    <span className="diet-meal-qty">{item.amount} {item.unit}</span>
                  </div>
                );
              })}
            </div>
            <div className="diet-meal-block-macros">
              {[['P',meal.macros.protein,'g','#00bfff'],['C',meal.macros.carbs,'g','#ffd700'],['F',meal.macros.fat,'g','#39ff14'],['~',meal.macros.calories,'kcal','var(--accent)']].map(([l,v,u,c])=>(
                <div key={l} className="diet-meal-macro-chip">
                  <b style={{color:c}}>{v}{u}</b>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Diet Page ───────────────────────────────────────────────────────────
export default function Diet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('standard');
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyPlanType, setSurveyPlanType] = useState('muscle_gain');
  const [planResult, setPlanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    if (!hasPlan(user, 'diet')) { navigate('/pricing'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.diet-reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [activeTab, planResult]);

  function handleTabClick(tabId) {
    if (tabId === 'standard') { setActiveTab('standard'); return; }
    setSurveyPlanType(tabId);
    setShowSurvey(true);
  }

  function handleSurveySubmit(formData) {
    setLoading(true);
    setTimeout(() => {
      const { weight, height, age, gender, activity, goal } = formData;
      const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);

      // 1) BMR — Mifflin-St Jeor
      const bmr = gender === 'male' ? 10*w + 6.25*h - 5*a + 5 : 10*w + 6.25*h - 5*a - 161;

      // 2) TDEE — BMR x activity multiplier (applied ONCE)
      const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
      const tdee = Math.round(bmr * (actMult[activity] || 1.55));

      // 3) Target calories — a single, fixed adjustment on top of TDEE.
      //    Muscle gain: modest surplus (250-300 kcal) ONLY — never a multiplier on TDEE,
      //    and never added more than once.
      //    Fat loss: moderate deficit.
      const MUSCLE_GAIN_SURPLUS = 275; // within the recommended 250-300 kcal range
      const FAT_LOSS_DEFICIT = 400;
      const targetCalories = goal === 'fat_loss'
        ? tdee - FAT_LOSS_DEFICIT
        : tdee + MUSCLE_GAIN_SURPLUS;

      // 4) Macros — derived FROM the final target calories (not from TDEE, and not
      //    independently of each other). Protein and fat are set first, then carbs
      //    take up whatever calories remain, so protein + fat + carbs always add
      //    back up to targetCalories exactly (no phantom/extra calories).
      const protein = Math.round(w * 2.2); // ~2.2g/kg supports muscle gain & retention
      const fat = Math.round((targetCalories * 0.25) / 9); // 25% of target calories
      const proteinCalories = protein * 4;
      const fatCalories = fat * 9;
      const carbs = Math.round((targetCalories - proteinCalories - fatCalories) / 4);
      const baseMeals = BASE_MEALS[goal] || BASE_MEALS.muscle_gain;
      const scaledMeals = scaleMeals(baseMeals, targetCalories);
      setPlanResult({ meals: scaledMeals, userInfo: formData, macros: { protein, carbs, fat }, targetCalories, tdee });
      setActiveTab(goal);
      setShowSurvey(false);
      setLoading(false);
    }, 1000);
  }

  function handleDownload() {
    if (!planResult) return;
    const goalLabel = planResult.userInfo.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain';
    generatePDF(planResult.meals, planResult.userInfo, planResult.macros, planResult.targetCalories, goalLabel);
  }

  if (!user || !hasPlan(user, 'diet')) return null;

  const tabs = [
    { id: 'standard', label: 'Standard Plan', icon: '📋' },
    { id: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
    { id: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
  ];

  return (
    <div className="diet-page" style={{paddingBottom: 80}}>
      <div className="noise-overlay" />

      {/* Main Content */}
      <div className="diet-main-content">
        {activeTab === 'standard' && <StandardPlanView />}
        {activeTab !== 'standard' && planResult && (
          <DynamicPlanView
            meals={planResult.meals}
            userInfo={planResult.userInfo}
            macros={planResult.macros}
            targetCalories={planResult.targetCalories}
            tdee={planResult.tdee}
            onDownload={handleDownload}
          />
        )}
        {activeTab !== 'standard' && !planResult && (
          <div className="diet-empty-state">
            <div style={{fontSize:64, marginBottom:16}}>{activeTab === 'muscle_gain' ? '💪' : '🔥'}</div>
            <h2 style={{fontFamily:"'Bebas Neue',cursive", fontSize:'2.5rem', color:'var(--accent)'}}>
              {activeTab === 'muscle_gain' ? 'Muscle Gain Plan' : 'Fat Loss Plan'}
            </h2>
            <p style={{color:'var(--text-secondary)', margin:'1rem 0 2rem', maxWidth:340, textAlign:'center', lineHeight:1.7}}>
              Answer a few quick questions and we'll generate an exact meal plan with scaled food quantities for your body.
            </p>
            <button className="btn-primary" onClick={() => { setSurveyPlanType(activeTab); setShowSurvey(true); }}>
              ⚡ Start Survey
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navbar */}
      <nav className="diet-bottom-nav">
        {tabs.map(tab => (
          <button key={tab.id} className={`diet-nav-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => handleTabClick(tab.id)}>
            {activeTab === tab.id && <div className="diet-nav-indicator" />}
            <span className="diet-nav-icon">{tab.icon}</span>
            <span className="diet-nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {showSurvey && (
        <SurveyModal
          planType={surveyPlanType}
          onClose={() => setShowSurvey(false)}
          onSubmit={handleSurveySubmit}
          loading={loading}
        />
      )}
    </div>
  );
}