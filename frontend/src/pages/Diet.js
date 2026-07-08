import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';

/* ═══════════════════════════════════════════════════════════════════════════
   DIET ENGINE  (mathematically accurate, ingredient-driven)
   ───────────────────────────────────────────────────────────────────────────
   Design:
     1. Every ingredient lives in NUTRI_DB with real per-unit macros.
     2. Meal templates declare ingredients as either FIXED (never scale)
        or DYNAMIC (scaled to hit remaining macro targets).
     3. Pipeline:
          BMR → TDEE → target {kcal,P,C,F}
          subtract fixed-food macros
          distribute remainder across dynamic foods by role weights
          round to realistic portions (per-food step & bounds)
          recompute + rebalance within tolerance
     4. UI reads `meal.items[]` and `meal.macros` — shape preserved.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Nutrition database ───────────────────────────────────────────────────
   `per` is the reference amount for the listed macros.
   For countable items (banana, eggs, roti, bread, whey, salad, curd, bowl)
   the reference is 1 piece / scoop / bowl / plate.
   For gram/ml items the reference is 100 (per 100 g or per 100 ml).            */
const NUTRI_DB = {
  // Carb sources (dynamic)
  oats:            { per: 100, unit: 'g',     p: 13,  c: 68, f: 7,   kcal: 380 },
  rice:            { per: 100, unit: 'g',     p: 2.7, c: 28, f: 0.3, kcal: 130 },  // cooked white
  brown_rice:      { per: 100, unit: 'g',     p: 2.6, c: 23, f: 0.9, kcal: 112 },
  roti:            { per: 1,   unit: 'pc',    p: 3.1, c: 15, f: 0.4, kcal: 80,  countable: true }, // 40g whole-wheat
  brown_bread:     { per: 1,   unit: 'slice', p: 2.5, c: 12, f: 1,   kcal: 70,  countable: true }, // ~30g
  boiled_potato:   { per: 100, unit: 'g',     p: 2,   c: 20, f: 0.1, kcal: 87 },
  banana:          { per: 1,   unit: 'pc',    p: 1.3, c: 27, f: 0.4, kcal: 105, countable: true },

  // Protein sources (dynamic)
  chicken:         { per: 100, unit: 'g',     p: 31,  c: 0,  f: 3.6, kcal: 165 }, // cooked breast
  eggs:            { per: 1,   unit: 'pc',    p: 6,   c: 0.6, f: 5,  kcal: 78,  countable: true },
  soya_chunks:     { per: 100, unit: 'g',     p: 52,  c: 33, f: 0.5, kcal: 345 }, // dry

  // Fat sources (dynamic)
  peanut_butter:   { per: 100, unit: 'g',     p: 25,  c: 20, f: 50,  kcal: 590 },
  almonds:         { per: 100, unit: 'g',     p: 21,  c: 22, f: 50,  kcal: 580 },
  mixed_seeds:     { per: 100, unit: 'g',     p: 20,  c: 20, f: 45,  kcal: 560 },
  mixed_nuts:      { per: 100, unit: 'g',     p: 20,  c: 20, f: 55,  kcal: 600 },

  // FIXED foods (never scale)
  paneer:          { per: 100, unit: 'g',     p: 18,  c: 3,  f: 20,  kcal: 265 },
  whey_protein:    { per: 1,   unit: 'scoop', p: 24,  c: 3,  f: 1.5, kcal: 120, countable: true }, // 30g
  milk:            { per: 100, unit: 'ml',    p: 3.3, c: 5,  f: 3.5, kcal: 62 },
  milk_lowfat:     { per: 100, unit: 'ml',    p: 3.4, c: 5,  f: 1.5, kcal: 45 },
  salad_plate:     { per: 1,   unit: 'plate', p: 2,   c: 8,  f: 0.3, kcal: 40,  countable: true }, // 150g
  curd_bowl:       { per: 1,   unit: 'bowl',  p: 22,  c: 24, f: 8,   kcal: 196, countable: true }, // 200g
  dal_sabzi_bowl:  { per: 1,   unit: 'bowl',  p: 12,  c: 30, f: 5,   kcal: 220, countable: true }, // ~250g
  sabzi_bowl:      { per: 1,   unit: 'bowl',  p: 4,   c: 16, f: 6,   kcal: 130, countable: true }, // ~200g mixed veg
  soup_bowl:       { per: 1,   unit: 'bowl',  p: 3,   c: 12, f: 1,   kcal: 70,  countable: true },
  green_tea:       { per: 1,   unit: 'cup',   p: 0,   c: 0,  f: 0,   kcal: 2,   countable: true },
};

/* ── Rounding rules per dynamic food (realistic portions) ─────────────── */
const ROUND_RULES = {
  oats:          { step: 5,  min: 20, max: 100 },
  rice:          { step: 25, min: 100, max: 400 },
  brown_rice:    { step: 25, min: 100, max: 350 },
  roti:          { step: 1,  min: 1,   max: 6 },
  brown_bread:   { step: 1,  min: 2,   max: 6 },
  boiled_potato: { step: 25, min: 100, max: 400 },
  banana:        { step: 1,  min: 1,   max: 3 },
  chicken:       { step: 20, min: 100, max: 300 },
  eggs:          { step: 1,  min: 2,   max: 6 },
  soya_chunks:   { step: 10, min: 20,  max: 80 },
  peanut_butter: { step: 5,  min: 5,   max: 40 },
  almonds:       { step: 5,  min: 5,   max: 40 },
  mixed_seeds:   { step: 5,  min: 5,   max: 30 },
  mixed_nuts:    { step: 5,  min: 10,  max: 40 },
};

/* ── Display metadata (name shown in UI + veg alternative) ────────────── */
const DISPLAY = {
  oats:            { name: 'Oats' },
  rice:            { name: 'Rice (cooked)' },
  brown_rice:      { name: 'Brown Rice (cooked)' },
  roti:            { name: 'Roti' },
  brown_bread:     { name: 'Brown Bread' },
  boiled_potato:   { name: 'Boiled Potato' },
  banana:          { name: 'Banana' },
  chicken:         { name: 'Chicken (cooked)', vegAlt: 'Paneer' },
  eggs:            { name: 'Eggs',             vegAlt: 'Soya Chunks' },
  soya_chunks:     { name: 'Soya Chunks' },
  peanut_butter:   { name: 'Peanut Butter' },
  almonds:         { name: 'Almonds' },
  mixed_seeds:     { name: 'Mixed Seeds' },
  mixed_nuts:      { name: 'Mixed Nuts' },
  paneer:          { name: 'Paneer' },
  whey_protein:    { name: 'Whey Protein' },
  milk:            { name: 'Milk' },
  milk_lowfat:     { name: 'Milk (low fat)' },
  salad_plate:     { name: 'Salad' },
  curd_bowl:       { name: 'Curd' },
  dal_sabzi_bowl:  { name: 'Dal / Rajma + Sabzi' },
  sabzi_bowl:      { name: 'Mixed Vegetables' },
  soup_bowl:       { name: 'Vegetable Soup' },
  green_tea:       { name: 'Green Tea' },
};

/* ── Role of each dynamic ingredient (governs macro-target distribution)  */
const ROLE = {
  oats: 'carb',          rice: 'carb',      brown_rice: 'carb',
  roti: 'carb',          brown_bread: 'carb', boiled_potato: 'carb',
  banana: 'carb',
  chicken: 'protein',    eggs: 'protein',   soya_chunks: 'protein',
  peanut_butter: 'fat',  almonds: 'fat',    mixed_seeds: 'fat', mixed_nuts: 'fat',
};

/* ── Meal templates ───────────────────────────────────────────────────────
   Every item is `{ key, fixed, amount?, weight? }`.
     • fixed=true  → amount is a literal (never scales).
     • fixed=false → weight controls its share of the remaining macro pool
                     for its role (defaults to 1).
                                                                            */
const MEAL_TEMPLATES = {
  muscle_gain: [
    { id: 'm1', name: 'Pre Workout',  time: '7:00 AM',  icon: '🥤',
      items: [
        { key: 'oats',          fixed: false, weight: 1.0 },
        { key: 'milk',          fixed: true,  amount: 250 },
        { key: 'banana',        fixed: false, weight: 0.6 },
        { key: 'almonds',       fixed: false, weight: 1.0 },
      ] },
    { id: 'm2', name: 'Post Workout', time: '9:30 AM',  icon: '💪',
      items: [
        { key: 'whey_protein',  fixed: true,  amount: 1 },
        { key: 'brown_bread',   fixed: false, weight: 1.0 },
        { key: 'peanut_butter', fixed: false, weight: 1.2 },
        { key: 'boiled_potato', fixed: false, weight: 1.3 },
      ] },
    { id: 'm3', name: 'Lunch',        time: '1:00 PM',  icon: '🍛',
      items: [
        { key: 'rice',            fixed: false, weight: 1.8 },
        { key: 'dal_sabzi_bowl',  fixed: true,  amount: 1 },
        { key: 'salad_plate',     fixed: true,  amount: 1 },
      ] },
    { id: 'm4', name: 'Evening',      time: '5:00 PM',  icon: '🥚',
      items: [
        { key: 'eggs',            vegSwap: 'soya_chunks', fixed: false, weight: 1.0 },
        { key: 'curd_bowl',       fixed: true,  amount: 1 },
      ] },
    { id: 'm5', name: 'Dinner',       time: '9:00 PM',  icon: '🍲',
      items: [
        { key: 'paneer',          fixed: true,  amount: 100 },
        { key: 'roti',            fixed: false, weight: 1.4 },
        { key: 'sabzi_bowl',      fixed: true,  amount: 1 },
        { key: 'salad_plate',     fixed: true,  amount: 1 },
      ] },
    { id: 'm6', name: 'Optional',     time: '10:30 PM', icon: '🌙',
      items: [
        { key: 'oats',            fixed: false, weight: 0.6 },
        { key: 'milk',            fixed: true,  amount: 250 },
        { key: 'mixed_seeds',     fixed: false, weight: 1.0 },
      ] },
  ],
  fat_loss: [
    { id: 'm1', name: 'Morning',      time: '7:00 AM',  icon: '🌅',
      items: [
        { key: 'oats',            fixed: false, weight: 1.0 },
        { key: 'milk_lowfat',     fixed: true,  amount: 250 },
        { key: 'banana',          fixed: false, weight: 0.7 },
      ] },
    { id: 'm2', name: 'Mid Morning',  time: '10:30 AM', icon: '🥗',
      items: [
        { key: 'eggs',            vegSwap: 'soya_chunks', fixed: false, weight: 1.0 },
        { key: 'salad_plate',     fixed: true,  amount: 1 },
      ] },
    { id: 'm3', name: 'Lunch',        time: '1:00 PM',  icon: '🍛',
      items: [
        { key: 'brown_rice',      fixed: false, weight: 1.0 },
        { key: 'dal_sabzi_bowl',  fixed: true,  amount: 1 },
        { key: 'chicken',         vegSwap: 'soya_chunks', fixed: false, weight: 1.2 },
        { key: 'salad_plate',     fixed: true,  amount: 1 },
      ] },
    { id: 'm4', name: 'Evening',      time: '5:00 PM',  icon: '🍵',
      items: [
        { key: 'green_tea',       fixed: true,  amount: 1 },
        { key: 'mixed_nuts',      fixed: false, weight: 1.0 },
      ] },
    { id: 'm5', name: 'Dinner',       time: '8:30 PM',  icon: '🥣',
      items: [
        { key: 'paneer',          fixed: true,  amount: 100 },
        { key: 'roti',            fixed: false, weight: 1.0 },
        { key: 'sabzi_bowl',      fixed: true,  amount: 1 },
        { key: 'soup_bowl',       fixed: true,  amount: 1 },
      ] },
  ],
};

/* ── Macro maths for an ingredient at a given amount ──────────────────── */
function macrosFor(key, amount) {
  const n = NUTRI_DB[key];
  const r = amount / n.per;
  return {
    protein:  n.p    * r,
    carbs:    n.c    * r,
    fat:      n.f    * r,
    calories: n.kcal * r,
  };
}

function zeroMacros() { return { protein: 0, carbs: 0, fat: 0, calories: 0 }; }
function addMacros(a, b) {
  return { protein: a.protein + b.protein, carbs: a.carbs + b.carbs,
           fat: a.fat + b.fat, calories: a.calories + b.calories };
}
function roundMacros(m) {
  return { protein: Math.round(m.protein), carbs: Math.round(m.carbs),
           fat: Math.round(m.fat), calories: Math.round(m.calories) };
}

/* ── BMR / TDEE / targets ─────────────────────────────────────────────── */
function computeTargets({ weight, height, age, gender, activity, goal }) {
  const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age, 10);
  const bmr = gender === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const tdee = bmr * (mult[activity] || 1.55);

  let calories, proteinPerKg, fatPct;
  if (goal === 'fat_loss') {
    calories = tdee - 400;
    proteinPerKg = 2.2;
    fatPct = 0.30;
  } else { // muscle_gain
    calories = tdee + 350;
    proteinPerKg = 2.0;
    fatPct = 0.25;
  }
  const protein = w * proteinPerKg;
  const fat     = (calories * fatPct) / 9;
  const carbs   = Math.max(0, (calories - protein * 4 - fat * 9) / 4);

  return {
    tdee: Math.round(tdee),
    calories: Math.round(calories),
    protein, carbs, fat,
  };
}

/* ── Rounding to realistic portions ───────────────────────────────────── */
function roundToStep(key, raw) {
  const r = ROUND_RULES[key];
  if (!r) return Math.max(1, Math.round(raw));
  const stepped = Math.round(raw / r.step) * r.step;
  return Math.min(r.max, Math.max(r.min, stepped));
}

/* ── Core: build a plan from user data ────────────────────────────────── */
function buildPlan(userInfo) {
  const goal = userInfo.goal;
  const isVeg = userInfo.dietType === 'veg';
  const target = computeTargets(userInfo);

  // Deep-clone template. Resolve veg swaps to the actual food key up-front
  // so ALL downstream maths uses correct nutrition, units, and rounding.
  const meals = MEAL_TEMPLATES[goal].map(m => ({
    ...m,
    items: m.items.map(it => {
      const key = isVeg && it.vegSwap ? it.vegSwap : it.key;
      return { ...it, key, displayKey: it.key };
    }),
  }));

  // 1. FIXED contribution -----------------------------------------------
  let fixedTotal = zeroMacros();
  meals.forEach(m => m.items.forEach(it => {
    if (it.fixed) {
      it.amount_final = it.amount;
      it.macros = macrosFor(it.key, it.amount);
      fixedTotal = addMacros(fixedTotal, it.macros);
    }
  }));

  // 2. Remaining macros for dynamic distribution ------------------------
  const remaining = {
    protein:  Math.max(0, target.protein  - fixedTotal.protein),
    carbs:    Math.max(0, target.carbs    - fixedTotal.carbs),
    fat:      Math.max(0, target.fat      - fixedTotal.fat),
    calories: Math.max(0, target.calories - fixedTotal.calories),
  };

  // 3. Bucket dynamic items by role -------------------------------------
  const buckets = { carb: [], protein: [], fat: [] };
  meals.forEach(m => m.items.forEach(it => {
    if (!it.fixed) buckets[ROLE[it.key]].push(it);
  }));
  const allDyn = [...buckets.protein, ...buckets.carb, ...buckets.fat];

  const sumWeights = arr => arr.reduce((s, it) => s + (it.weight ?? 1), 0);

  // 4. Initial allocation: solve amount so item hits its share of the
  //    remaining macro the item is primarily responsible for.
  function allocate(role, macroKey) {
    const arr = buckets[role];
    const wSum = sumWeights(arr) || 1;
    const pool = remaining[macroKey];
    arr.forEach(it => {
      const share = pool * (it.weight ?? 1) / wSum;
      const n = NUTRI_DB[it.key];
      const perUnit = n[macroKey === 'protein' ? 'p' : macroKey === 'carbs' ? 'c' : 'f'] / n.per;
      const raw = perUnit > 0 ? share / perUnit : 0;
      it.amount_final = roundToStep(it.key, raw);
      it.macros = macrosFor(it.key, it.amount_final);
    });
  }
  allocate('protein', 'protein');
  allocate('carb',    'carbs');
  allocate('fat',     'fat');

  // 5. Rebalance — pick the worst-off macro (including calories) and
  //    nudge the single item that best corrects it in one step, provided
  //    it doesn't push another macro further out of tolerance.
  const TOL      = { protein: 3, carbs: 5, fat: 3, calories: 40 };
  const TOL_HARD = { protein: 8, carbs: 12, fat: 6, calories: 100 };
  const KEYS = ['protein', 'carbs', 'fat', 'calories'];

  const totals = () => {
    let t = zeroMacros();
    meals.forEach(m => m.items.forEach(it => { t = addMacros(t, it.macros); }));
    return t;
  };

  for (let iter = 0; iter < 200; iter++) {
    const t = totals();
    const diff = {};
    KEYS.forEach(k => { diff[k] = target[k] - t[k]; });
    const withinSoft = KEYS.every(k => Math.abs(diff[k]) <= TOL[k]);
    if (withinSoft) break;

    const worst = KEYS.reduce((a, b) =>
      Math.abs(diff[a]) / TOL[a] > Math.abs(diff[b]) / TOL[b] ? a : b);
    const dir = diff[worst] > 0 ? +1 : -1;

    // Candidate items: can move in `dir` without exceeding bounds.
    let best = null, bestScore = -Infinity;
    for (const it of allDyn) {
      const r = ROUND_RULES[it.key]; const step = r?.step || 1;
      const next = it.amount_final + dir * step;
      if (next < (r?.min ?? 1) || next > (r?.max ?? 9999)) continue;
      const delta = macrosFor(it.key, dir * step); // signed
      // Score by movement on `worst`; penalise items that would blow a
      // currently-in-range macro past its hard tolerance.
      let score = Math.abs(delta[worst]);
      for (const k of KEYS) {
        if (k === worst) continue;
        const newDiff = diff[k] - delta[k];
        if (Math.abs(newDiff) > TOL_HARD[k] && Math.abs(newDiff) > Math.abs(diff[k])) {
          score -= 1e6; // effectively disqualify
        }
      }
      if (score > bestScore) { bestScore = score; best = it; }
    }
    if (!best) break;
    const step = (ROUND_RULES[best.key]?.step) || 1;
    best.amount_final += dir * step;
    best.macros = macrosFor(best.key, best.amount_final);
  }

  // 6. Materialize meals in the shape the UI + PDF expect --------------
  const outMeals = meals.map(m => {
    const items = m.items.map(it => {
      const disp = DISPLAY[it.key] || { name: it.key };
      return {
        name:   disp.name,
        unit:   NUTRI_DB[it.key].unit,
        amount: it.amount_final,
        macros: roundMacros(it.macros),
      };
    });
    const macros = items.reduce((acc, it) => addMacros(acc, it.macros), zeroMacros());
    return { id: m.id, name: m.name, time: m.time, icon: m.icon,
             items, macros: roundMacros(macros) };
  });

  const dayTotals = outMeals.reduce((acc, m) => addMacros(acc, m.macros), zeroMacros());

  return {
    meals: outMeals,
    tdee: target.tdee,
    targetCalories: target.calories,
    macros: {
      protein: Math.round(target.protein),
      carbs:   Math.round(target.carbs),
      fat:     Math.round(target.fat),
    },
    actual: roundMacros(dayTotals),
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   PDF Generator (unchanged behaviour — reads new `meal.items[]` shape)
   ═══════════════════════════════════════════════════════════════════════ */
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
      doc.setFillColor(240, 240, 240); doc.rect(margin + 4, y, cW - 4, 7, 'F');
      doc.setFillColor(...gold); doc.circle(margin + 7.5, y + 3.5, 1, 'F');
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(item.name, margin + 11, y + 5);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
      doc.text(`${item.amount} ${item.unit}`, W - margin - 4, y + 5, { align: 'right' }); y += 8.5;
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

/* ═══════════════════════════════════════════════════════════════════════════
   UI (unchanged)
   ═══════════════════════════════════════════════════════════════════════ */
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
              {meal.items.map((item, i) => (
                <div key={i} className="diet-meal-row">
                  <span>{item.name}</span>
                  <span className="diet-meal-qty">{item.amount} {item.unit}</span>
                </div>
              ))}
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

/* ═══════════════════════════════════════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════════════════════════════════ */
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
      const plan = buildPlan(formData);
      setPlanResult({
        meals: plan.meals,
        userInfo: formData,
        macros: plan.macros,
        targetCalories: plan.targetCalories,
        tdee: plan.tdee,
        actual: plan.actual,
      });
      setActiveTab(formData.goal);
      setShowSurvey(false);
      setLoading(false);
    }, 500);
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
