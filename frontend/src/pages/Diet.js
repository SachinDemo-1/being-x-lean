/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';

// ─── Temporary toggle: set to true to disable Non-Veg selection (e.g. during
// festival/holiday days). Flip back to false to re-enable it.
const NONVEG_DISABLED = true;

// ═══════════════════════════════════════════════════════════════════════════
// DIET CALCULATION ENGINE — v5
//
// Architecture:
//  • Every food is tagged FIXED or DYNAMIC.
//    - FIXED foods NEVER change quantity, no matter what the user's stats
//      are. Their macros are counted, then SUBTRACTED from the day's
//      target — they are never touched again.
//    - DYNAMIC foods absorb 100% of whatever target remains after the
//      fixed foods are subtracted.
//  • The remaining target is solved ONCE across the WHOLE DAY (all dynamic
//    foods in all meals together), not meal-by-meal.
//  • Quantities round to realistic, clean numbers (nearest 25g for rice/
//    potato, nearest 5/10g for smaller portions, whole pieces for
//    countable foods) — never odd decimals.
//  • HARD MIN/MAX: a dynamic food can carry `min`/`max` — floors/ceilings
//    enforced AFTER rounding/solving, so the macro solver can still scale
//    it but it can never leave that realistic range.
//  • EXACT TOTALS: meal-level protein/fat are apportioned across all meals
//    at once using a largest-remainder method, so the meals' rounded
//    totals ALWAYS sum to EXACTLY the day's target — zero drift.
//  • CARBS: carbs are the ONE macro apportioned using FIXED per-meal weight
//    ratios (MEAL_CARB_WEIGHTS) instead of each meal's real food-derived
//    carb amount. This lets carbs be shaped to match a desired per-meal
//    distribution while protein and fat keep following the real macros of
//    the foods actually assigned to each meal — untouched.
//  • CALORIES (NEW in v5): calories are NEVER apportioned separately —
//    they are always DERIVED from that same meal's own final protein/
//    carbs/fat (4/4/9 kcal per g). This guarantees every meal's displayed
//    calories are internally consistent with its own macros, no matter how
//    carbs got reshaped by MEAL_CARB_WEIGHTS.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Nutrition per 100g/100ml (gram-based) or per single unit (countable:
// pc / plate / bowl / scoop / slice). Calories are always DERIVED from
// protein/carbs/fat (4/4/9 kcal per g) — never a separate hand-typed number —
// so hitting the macro targets automatically means hitting calories too.
const NUTRITION = {
  // Dynamic (scale with the user's targets)

  'Oats':                              { per100: { p: 16.9, c: 66.3, f: 6.9 } }, // Raw
  'Rice':                              { per100: { p: 2.7,  c: 28.2, f: 0.3 } }, // Cooked White Rice
  'Fried Rice':                        { per100: { p: 4.2,  c: 28.0, f: 5.5 } },
  'Roti':                              { perUnit: { p: 3.2, c: 18.0, f: 1.2 } }, // 1 medium (35-40g)
  'Brown Bread':                       { perUnit: { p: 3.5, c: 12.0, f: 1.1 } }, // 1 slice
  'Boiled Potato':                     { per100: { p: 1.9,  c: 20.1, f: 0.1 }, perUnit: { p: 2.85, c: 30.15, f: 0.15 } },
  'Banana':                            { perUnit: { p: 1.3, c: 27.0, f: 0.3 } }, // 1 medium
  'Almonds':                           { per100: { p: 21.2, c: 21.7, f: 49.9 }, perUnit: { p: 0.25, c: 0.26, f: 0.60 } }, // 1 almond (~1.2g)
  'Peanut Butter':                     { per100: { p: 25.0, c: 20.0, f: 50.0 }, perUnit: { p: 3.75, c: 3.0,  f: 7.5  } }, // 1 tbsp (~15g)
  'Soya Chunks':                       { per100: { p: 52.0, c: 33.0, f: 0.5 } }, // Dry
  'Mixed Seeds':                       { per100: { p: 22.0, c: 18.0, f: 49.0 } },
  'Upma / Poha':                       { per100: { p: 3.2,  c: 24.0, f: 4.2 } },
  'Roasted Chana / Sprouts Moong Dal': { per100: { p: 20.0, c: 55.0, f: 5.0 } },
  'Chicken':                           { per100: { p: 31.0, c: 0.0,  f: 3.6 } }, // Cooked Chicken Breast
  'Eggs':                              { perUnit: { p: 6.3, c: 0.4,  f: 5.3 } }, // 1 large egg
  'Boiled Potato/Sweet Patato':        { per100: { p: 1.9, c: 20.1, f: 0.1 }, perUnit: { p: 2.85, c: 30.15, f: 0.15 } },
  'Rice/Roti':                         { per100: { p: 2.7, c: 28.2, f: 0.3 }, perUnit: { p: 3.2, c: 18.0, f: 1.2 } },
  'Paneer/Tofu':                       { per100: { p: 18.3, c: 1.2, f: 20.8 } },

  // Fixed (never scale — quantity is always the same)

  'Paneer':                            { per100: { p: 18.3, c: 1.2,  f: 20.8 } },
  'Whey Protein':                      { perUnit: { p: 24.0, c: 3.0,  f: 1.5 } }, // 1 scoop (30g)
  'Milk':                              { per100: { p: 3.3,  c: 4.8,  f: 3.3 } }, // Toned Milk
  'Salad':                             { perUnit: { p: 2.0, c: 6.0,  f: 0.3 } }, // 1 plate
  'Curd':                              { perUnit: { p: 6.0, c: 7.0,  f: 4.5 } }, // 1 bowl (~150g)
  'Dal/Rajma + Sabzi':                 { perUnit: { p: 10.0,c: 28.0, f: 5.0 } }, // 1 bowl
  'Mixed Vegetables':                  { perUnit: { p: 3.0, c: 10.0, f: 3.0 } }, // 1 bowl
};
function computeItemMacros(name, amount, isCountable) {
  const entry = NUTRITION[name];
  if (!entry) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  const ref = isCountable ? entry.perUnit : (entry.per100 || entry.perUnit);
  const factor = isCountable ? amount : amount / 100;
  const protein = ref.p * factor, carbs = ref.c * factor, fat = ref.f * factor;
  const calories = protein * 4 + carbs * 4 + fat * 9;
  return { protein, carbs, fat, calories };
}

// Round a dynamic gram quantity to a realistic step (25g for bulk staples
// like rice/potato, 10g for oats/bread-scale portions, 5g for small
// toppings like nuts/peanut butter/seeds).
function roundToStep(value, step) {
  return Math.max(step, Math.round(value / step) * step);
}

// ─── Largest-remainder apportionment ──────────────────────────────────────
// Rounds an array of real (float) values to integers so that they sum to
// EXACTLY `total`, while keeping each value as close as possible to its
// true amount. This is what guarantees meal totals always add up to the
// target macros with zero drift, instead of each meal rounding on its own.
function distributeIntegerWithRemainder(total, realValues) {
  const floors = realValues.map(v => Math.floor(Math.max(0, v)));
  let allocated = floors.reduce((a, b) => a + b, 0);
  let remainder = total - allocated;
  const result = [...floors];

  if (remainder > 0) {
    // Give the leftover +1s to whichever meals had the largest fractional part.
    const order = realValues
      .map((v, i) => ({ i, frac: v - floors[i] }))
      .sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remainder; k++) result[order[k % order.length].i] += 1;
  } else if (remainder < 0) {
    // Real sum overshot the target (rare) — trim from smallest fractional parts first.
    const order = realValues
      .map((v, i) => ({ i, frac: v - floors[i] }))
      .sort((a, b) => a.frac - b.frac);
    for (let k = 0; k < Math.abs(remainder); k++) {
      const idx = order[k % order.length].i;
      result[idx] = Math.max(0, result[idx] - 1);
    }
  }
  return result;
}

// ─── Fixed per-meal CARB weight ratios (only used for distributing the day's
// carb target across meals — protein/fat are untouched and still follow
// real food macros). Numbers are relative weights, not grams — they get
// scaled to whatever the day's total carb target is.
// Order matches the meal order in BASE_MEALS for that goal.
const MEAL_CARB_WEIGHTS = {
  muscle_gain: [63, 44, 91, 17, 90], // Meal1 Pre-Workout, Meal2 Post-Workout, Meal3 Lunch, Meal4 Evening, Meal5 Dinner
};

// ─── Base meal plans — every item tagged role:'fixed'|'dynamic' ──────────────
// Fixed items: `amount` is permanent and never changes.
// Dynamic items: `base` is just a starting reference used to weight how much
// of the remaining target each food should absorb relative to the others.
const BASE_MEALS = {
  muscle_gain: [
    { id: 'meal1', name: 'Pre-Workout', time: '7:00 AM', icon: '🌅',
      items: [
        { name: 'Oats', role: 'dynamic', unit: 'g', base: 60, round: 5,min: 30, max: 40 },
        { name: 'Milk', role: 'fixed', unit: 'ml', amount: 250 },
        { name: 'Banana', role: 'dynamic', unit: 'pc', base: 1, countable: true , max: 1 },
        { name: 'Almonds', role: 'fixed', unit: 'pc', amount: 15, countable: true },
      ] },
    { id: 'meal2', name: 'Post-Workout', time: '10:00 AM', icon: '💪',
      items: [
        { name: 'Whey Protein', role: 'fixed', unit: 'scoop', amount: 1, countable: true },
        { name: 'Brown Bread', role: 'fixed', unit: 'slice', amount: 2, countable: true },
        { name: 'Peanut Butter', role: 'fixed', unit: 'spoon', amount: 1, countable: true },
        { name: 'Boiled Potato/Sweet Patato', role: 'fixed', unit: 'pc', amount: 1, countable: true },
      ] },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice/Roti', role: 'dynamic', unit: 'g', base: 25, round: 25 ,min: 200, max: 325 },
        { name: 'Dal/Rajma + Sabzi', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Soya Chunks', role: 'dynamic', unit: 'g', base: 50, round: 5, min: 30 , max: 50 },
        { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
      ] },
    { id: 'meal5', name: 'Dinner', time: '9:00 PM', icon: '🍲',
      items: [
        { name: 'Paneer/Tofu', role: 'fixed', unit: 'g', amount: 150 },
        { name: 'Roti', role: 'dynamic', unit: 'pc', base: 3, countable: true , min: 3, max:4 },
        { name: 'Mixed Vegetables', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
  ],
  fat_loss: [
    { id: 'meal1', name: 'Pre-Workout', time: '6:30 AM', icon: '🌅',
      items: [
        { name: 'Upma / Poha', role: 'dynamic', unit: 'g', base: 150, round: 10 ,min:100, max:150},
        { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
      ] },
    { id: 'meal2', name: 'Post-Workout', time: '8:00 AM', icon: '🥤',
      items: [
        { name: 'Oats', role: 'dynamic', unit: 'g', base: 40, round: 5, min:25 , max: 40 },
        { name: 'Whey Protein', role: 'fixed', unit: 'scoop', amount: 1, countable: true },
        { name: 'Milk', role: 'fixed', unit: 'ml', amount: 250 },
        { name: 'Banana', role: 'dynamic', unit: 'pc', base: 1, countable: true },
      ] },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice/Roti', role: 'dynamic', unit: 'g', base: 200, round: 25 , min: 200 },
        { name: 'Dal/Rajma + Sabzi', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Soya Chunks', role: 'dynamic', unit: 'g', base: 30, round: 5, min: 30 , max:40 },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Roasted Chana / Sprouts Moong Dal', role: 'dynamic', unit: 'g', base: 40, round: 10 },
        { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
      ] },
    { id: 'meal5', name: 'Dinner', time: '8:00 PM', icon: '🥣',
      items: [
        { name: 'Paneer/Tofu', role: 'fixed', unit: 'g', amount: 100 },
        { name: 'Rice/Roti', role: 'fixed', unit: 'Pc', amount: 3},
        { name: 'Mixed Vegetables', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
  ],
};

// ─── Optional bonus meal — shown at the end, NOT counted toward the day's
// calorie/protein/carb/fat target totals (purely an "if you need more" add-on)
const OPTIONAL_MEALS = {
  muscle_gain: [
    { id: 'optional1', name: 'Optional (If You Need More Calories)', time: 'Anytime', icon: '➕',
      items: [
        { name: 'Oats', unit: 'g', amount: 40 },
        { name: 'Milk', unit: 'ml', amount: 250 },
        { name: 'Mixed Seeds', unit: 'g', amount: 15 },
      ] },
  ],
};

// ─── THE ENGINE ────────────────────────────────────────────────────────────
// STEP 1 (done by the caller): BMR → TDEE → target calories/protein/carbs/fat.
// STEP 2: sum every FIXED food's real macros and subtract from the target.
// STEP 3: distribute what's LEFT across dynamic foods only, solved once for
//         the whole day, then round every quantity to a realistic number.
// STEP 4: apportion protein/fat using real per-meal macros
//         (largest-remainder method) — no drift.
//         CARBS use fixed MEAL_CARB_WEIGHTS ratios instead (if defined for
//         this goal), so carbs land where you want them per meal.
//         CALORIES are derived from each meal's OWN final protein/carbs/fat
//         (never apportioned separately) — always internally consistent.
function generateDietPlan(baseMeals, targetMacros, goal) {
  // Flatten every item across all meals, remembering where it came from.
  const flat = [];
  baseMeals.forEach((meal, mi) => {
    meal.items.forEach((item, ii) => flat.push({ ...item, mi, ii }));
  });

  // STEP 2 — fixed foods' real macros, permanently locked, then subtracted.
  const fixedItems = flat.filter(it => it.role === 'fixed').map(it => ({
    ...it, amount: it.amount, macros: computeItemMacros(it.name, it.amount, !!it.countable),
  }));
  const fixedTotal = fixedItems.reduce((acc, it) => ({
    protein: acc.protein + it.macros.protein,
    carbs: acc.carbs + it.macros.carbs,
    fat: acc.fat + it.macros.fat,
  }), { protein: 0, carbs: 0, fat: 0 });

  const remaining = {
    protein: Math.max(0, targetMacros.protein - fixedTotal.protein),
    carbs:   Math.max(0, targetMacros.carbs   - fixedTotal.carbs),
    fat:     Math.max(0, targetMacros.fat     - fixedTotal.fat),
  };

  // STEP 3 — distribute the REMAINING target only among dynamic foods.
  const dynamicItems = flat.filter(it => it.role === 'dynamic');
  const baseline = dynamicItems.map(it => computeItemMacros(it.name, it.base, !!it.countable));
  const baseTotal = baseline.reduce((acc, m) => ({
    protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat,
  }), { protein: 0, carbs: 0, fat: 0 });

  const pScale = baseTotal.protein > 0 ? remaining.protein / baseTotal.protein : 1;
  const cScale = baseTotal.carbs  > 0 ? remaining.carbs  / baseTotal.carbs  : 1;
  const fScale = baseTotal.fat    > 0 ? remaining.fat    / baseTotal.fat    : 1;

  // Initial guess: macro-weighted blend (protein-heavy foods scale toward
  // the protein need, carb-heavy toward carbs, fat-heavy toward fat).
  let rawAmounts = dynamicItems.map((it, i) => {
    const b = baseline[i];
    const macroSum = b.protein + b.carbs + b.fat;
    const scale = macroSum > 0 ? (b.protein * pScale + b.carbs * cScale + b.fat * fScale) / macroSum : 1;
    return it.base * scale;
  });

  const density = dynamicItems.map(it => computeItemMacros(it.name, it.countable ? 1 : 100, !!it.countable));

  // Correction pass across the WHOLE DAY'S dynamic foods at once — far more
  // flexibility than solving each meal in isolation, since the protein need
  // can now be met by ANY protein-containing dynamic food anywhere in the day.
  for (let pass = 0; pass < 8; pass++) {
    ['protein', 'carbs', 'fat'].forEach(key => {
      const current = dynamicItems.reduce((acc, it, i) => acc + computeItemMacros(it.name, rawAmounts[i], !!it.countable)[key], 0);
      const gap = remaining[key] - current;
      if (Math.abs(gap) < 0.01) return;

      let anchorIdx = -1, maxShare = 0;
      baseline.forEach((b, i) => { if (b[key] > maxShare) { maxShare = b[key]; anchorIdx = i; } });
      if (anchorIdx === -1) return;

      const perUnit = density[anchorIdx][key];
      if (!perUnit || perUnit <= 0) return;
      const unitsNeeded = dynamicItems[anchorIdx].countable ? (gap / perUnit) : (gap / perUnit) * 100;
      rawAmounts[anchorIdx] = Math.max(0, rawAmounts[anchorIdx] + unitsNeeded);
    });
  }

  // Round every dynamic food to a realistic, clean quantity. Foods with a
  // `min`/`max` are floored/capped AFTER rounding, so they can still scale
  // within the solver but never leave their realistic range.
  let finalDynamic = dynamicItems.map((it, i) => {
    let amount = it.countable
      ? Math.max(1, Math.round(rawAmounts[i]))
      : roundToStep(rawAmounts[i], it.round || 10);
    if (it.min) amount = Math.max(amount, it.min);
    if (it.max) amount = Math.min(amount, it.max);
    return { ...it, amount, macros: computeItemMacros(it.name, amount, !!it.countable) };
  });

  // Rebuild each meal from its fixed (untouched) + dynamic (final) items,
  // keeping REAL (unrounded) macros for now — rounding happens next, across
  // all meals together, so the totals land exactly on target.
  const mealsWithItems = baseMeals.map((meal, mi) => {
    const items = meal.items.map((item, ii) => {
      if (item.role === 'fixed') return fixedItems.find(f => f.mi === mi && f.ii === ii);
      return finalDynamic.find(d => d.mi === mi && d.ii === ii);
    });
    const realMacros = items.reduce((acc, it) => ({
      protein: acc.protein + it.macros.protein,
      carbs: acc.carbs + it.macros.carbs,
      fat: acc.fat + it.macros.fat,
      calories: acc.calories + it.macros.calories,
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
    return { ...meal, items, realMacros };
  });

  // STEP 4 — apportion protein/fat across meals so the rounded, DISPLAYED
  // numbers sum to EXACTLY targetMacros — no drift, regardless of rounding.
  const proteinAlloc  = distributeIntegerWithRemainder(targetMacros.protein,  mealsWithItems.map(m => m.realMacros.protein));
  const fatAlloc      = distributeIntegerWithRemainder(targetMacros.fat,      mealsWithItems.map(m => m.realMacros.fat));

  // CARBS — use fixed per-meal weight ratios if defined for this goal,
  // otherwise fall back to the real-macro-based apportionment (same as
  // protein/fat above).
  const carbWeights = MEAL_CARB_WEIGHTS[goal];
  let carbsAlloc;
  if (carbWeights && carbWeights.length === mealsWithItems.length) {
    const totalWeight = carbWeights.reduce((a, b) => a + b, 0);
    const weightedCarbs = carbWeights.map(w => (w / totalWeight) * targetMacros.carbs);
    carbsAlloc = distributeIntegerWithRemainder(targetMacros.carbs, weightedCarbs);
  } else {
    carbsAlloc = distributeIntegerWithRemainder(targetMacros.carbs, mealsWithItems.map(m => m.realMacros.carbs));
  }

  // CALORIES — always derived from THIS meal's own final protein/carbs/fat
  // (4/4/9 kcal per g), never apportioned separately. This guarantees every
  // meal's calorie number is internally consistent with its own macros,
  // no matter how carbs got reshaped by MEAL_CARB_WEIGHTS above.
  const caloriesAlloc = mealsWithItems.map((m, mi) =>
    Math.round(proteinAlloc[mi] * 4 + carbsAlloc[mi] * 4 + fatAlloc[mi] * 9)
  );

  const scaledMeals = mealsWithItems.map((meal, mi) => ({
    ...meal,
    macros: {
      protein: proteinAlloc[mi],
      carbs: carbsAlloc[mi],
      fat: fatAlloc[mi],
      calories: caloriesAlloc[mi],
    },
  }));

  return scaledMeals;
}

// ─── Validate that the meal breakdown actually adds up to the target ─────────
// (Now mostly a safety net. Protein/carbs/fat should always sum exactly to
// target. Calories are derived per-meal, so their sum equals
// protein*4 + carbs*4 + fat*9 of the FINAL macros, which may differ slightly
// from the originally requested targetMacros.calories if that value wasn't
// itself perfectly 4/4/9-consistent — this is expected and intentional.)
function validateDietPlan(scaledMeals, targetMacros) {
  const sum = scaledMeals.reduce((acc, m) => ({
    protein: acc.protein + m.macros.protein,
    carbs: acc.carbs + m.macros.carbs,
    fat: acc.fat + m.macros.fat,
    calories: acc.calories + m.macros.calories,
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

  const diffs = {
    protein: sum.protein - targetMacros.protein,
    carbs: sum.carbs - targetMacros.carbs,
    fat: sum.fat - targetMacros.fat,
    calories: sum.calories - targetMacros.calories,
  };
  const valid =
    diffs.protein === 0 &&
    diffs.carbs === 0 &&
    diffs.fat === 0;

  if (!valid) {
    console.warn('[Diet plan] Meal totals drifted from target:', diffs);
  }
  return { valid, sum, diffs };
}

// ─── Optional bonus meal(s) — fixed reference amounts, never scaled, and
// deliberately excluded from the target totals above.
function resolveOptionalMeals(goal) {
  const meals = OPTIONAL_MEALS[goal] || [];
  return meals.map(meal => {
    const items = meal.items.map(item => ({
      ...item, macros: computeItemMacros(item.name, item.amount, false),
    }));
    const macros = items.reduce((acc, it) => ({
      protein: acc.protein + it.macros.protein,
      carbs: acc.carbs + it.macros.carbs,
      fat: acc.fat + it.macros.fat,
      calories: acc.calories + it.macros.calories,
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
    return {
      ...meal,
      items,
      macros: {
        protein: Math.round(macros.protein),
        carbs: Math.round(macros.carbs),
        fat: Math.round(macros.fat),
        calories: Math.round(macros.calories),
      },
    };
  });
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generatePDF(meals, optionalMeals, userInfo, macros, targetCalories, actualCalories, goalLabel) {
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
  // FRONT PAGE BODY IMAGE ONLY
  const bodyImg = new Image();
  bodyImg.src = "/images/body.png";

  doc.addImage(
    bodyImg,
    "PNG",

    90, // left-right position
    20,  // up-down position

    100,  // width
    100  // height
  );
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
  doc.setFillColor(...gold); doc.roundedRect(margin, 105, cW, 6, 4, 4, 'F'); doc.rect(margin, 108, cW, 6, 'F');
  doc.setTextColor(...dark); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
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
  doc.setFillColor(...gold); doc.roundedRect(margin, 178, cW, 6, 4, 4, 'F'); doc.rect(margin, 181, cW, 6, 'F');
  doc.setTextColor(...dark); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('DAILY TARGETS', margin + 6, 185);
  [['CALORIES', `${actualCalories}`, 'kcal'], ['PROTEIN', `${macros.protein}`, 'g'], ['CARBS', `${macros.carbs}`, 'g'], ['FAT', `${macros.fat}`, 'g']].forEach(([lbl, val, unit], i) => {
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
  doc.text(`Target: ${targetCalories} kcal  •  Actual: ${actualCalories} kcal  •  P:${macros.protein}g  •  C:${macros.carbs}g  •  F:${macros.fat}g`, margin, y); y += 10;

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
      const nm = item.name;
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

  if (optionalMeals && optionalMeals.length > 0) {
    checkBreak(20);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
    doc.text('Optional add-on below — NOT included in the Calories/Protein/Carbs/Fat totals above.', margin, y); y += 8;

    optionalMeals.forEach(meal => {
      checkBreak(meal.items.length * 8 + 20);
      doc.setFillColor(60, 60, 60); doc.roundedRect(margin, y, cW, 10, 2, 2, 'F');
      doc.setFillColor(...gold); doc.rect(margin, y, 3, 10, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(`${meal.name}`, margin + 7, y + 6.5); y += 14;

      meal.items.forEach(item => {
        checkBreak(8);
        doc.setFillColor(240, 240, 240); doc.rect(margin + 4, y, cW - 4, 7, 'F');
        doc.setFillColor(...gold); doc.circle(margin + 7.5, y + 3.5, 1, 'F');
        doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(item.name, margin + 11, y + 5);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
        doc.text(`${item.amount} ${item.unit}`, W - margin - 4, y + 5, { align: 'right' }); y += 8.5;
      });
      y += 6;
    });
  }

  doc.save(`BeingXLean_${goalLabel.replace(/\s/g, '_')}_Plan.pdf`);
}

// ─── Survey Modal ─────────────────────────────────────────────────────────────
function SurveyModal({ planType, onClose, onSubmit, loading, initialData }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialData || { weight: '', height: '', age: '', gender: 'male', activity: 'moderate', dietType: 'nonveg' });
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
                  { val:'nonveg', icon:'🍗', label:'Non-Vegetarian', desc: NONVEG_DISABLED ? 'Unavailable today' : 'Chicken, Fish, Eggs', disabled: NONVEG_DISABLED },
                ].map(d => (
                  <button
                    key={d.val}
                    className={`diet-pref-card ${form.dietType===d.val?'active':''}`}
                    disabled={d.disabled}
                    style={d.disabled ? { opacity: 0.4, filter: 'grayscale(1)', cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
                    onClick={() => { if (!d.disabled) set('dietType', d.val); }}
                  >
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
                {loading ? '⏳ Applying...' : '⚡ Get My Plan'}
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
          { icon:'💪', title:'Muscle Gain', goal:'muscle_gain', cal:'2800–3200 kcal', protein:'1.6–2.2g/kg', color:'#ff4500', desc:'Calorie surplus + high protein to build lean mass fast.' },
          { icon:'🔥', title:'Fat Loss', goal:'fat_loss', cal:'TDEE − 300–500', protein:'2.0–2.4g/kg', color:'#39ff14', desc:'Moderate deficit while preserving muscle with high protein.' },
          { icon:'⚖️', title:'Body Recompotion', cal:'TDEE + 200–300', protein:'1.8–2.0g/kg', color:'#ffd700', desc:'Slow quality gains with whole foods. 0.25–0.5kg/week.' , locked: true },
        ].map(p => (
          <div
            key={p.title}
            className="diet-std-card"
            style={{borderColor: p.color + '44', position: "relative", overflow: "hidden", cursor: p.locked ? 'default' : 'pointer'}}
            onClick={() => { if (!p.locked) onSelectPlan(p.goal); }}
          >
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
                ['Paneer / Tofu','18g','Medium ₹','Muscle Gain'],
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
function DynamicPlanView({ meals, optionalMeals, userInfo, macros, targetCalories, actualCalories, tdee, onDownload, onEditSurvey }) {
  const goalLabel = userInfo.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain';
  return (
    <div className="diet-dynamic-view">
      <div className="diet-dynamic-hero diet-reveal">
        <div>
          <span className="section-eyebrow">{goalLabel} — Personalized</span>
          <h2 className="section-title" style={{fontSize:'clamp(1.8rem,5vw,3rem)'}}>YOUR PLAN</h2>
          <p style={{color:'var(--text-secondary)', fontSize:'0.9rem', marginTop:'0.3rem'}}>
            {userInfo.weight}kg · {userInfo.age}yrs · {userInfo.dietType === 'veg' ? '🥦 Veg' : '🍗 Non-Veg'} · TDEE: {tdee} kcal · Target: {targetCalories} kcal
          </p>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:'0.6rem', alignItems:'flex-end'}}>
          <button className="btn-primary" onClick={onDownload} style={{whiteSpace:'nowrap'}}>⬇ Download PDF</button>
          <button className="btn-outline" onClick={() => onEditSurvey(userInfo.goal)} style={{whiteSpace:'nowrap'}}>✏️ Edit Details</button>
        </div>
      </div>

      <div className="diet-macro-bar">
        {[
          {label:'Calories', value:actualCalories, unit:'kcal', color:'var(--accent)'},
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

      {optionalMeals && optionalMeals.length > 0 && (
        <div className="diet-meals-list" style={{marginTop:'1.5rem'}}>
          <p style={{textAlign:'center', color:'var(--text-secondary)', fontSize:'0.8rem', marginBottom:'0.75rem'}}>
            The section below is a bonus add-on — it is <strong>not included</strong> in your Calories/Protein/Carbs/Fat targets above.
          </p>
          {optionalMeals.map((meal) => (
            <div key={meal.id} className="diet-meal-block diet-reveal" style={{borderStyle:'dashed', opacity:0.9}}>
              <div className="diet-meal-block-header">
                <span className="diet-meal-num">＋</span>
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
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex', justifyContent:'center', marginTop:'2rem'}}>
        <button className="btn-primary" onClick={onDownload}>⬇ Download PDF</button>
      </div>
    </div>
  );
}
export default function Diet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('standard');
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyPlanType, setSurveyPlanType] = useState('muscle_gain');
  const [planResult, setPlanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return; // still verifying the saved login — don't redirect yet
    if (!user) { navigate('/auth', { replace: true }); return; }
    if (!hasPlan(user, 'diet')) { navigate('/pricing?for=diet', { replace: true }); return; }
  }, [user, authLoading, navigate]);

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
    setActiveTab(tabId);
    // If we have the user's saved survey ANSWERS for this goal, regenerate
    // the plan fresh from them (using whatever the current meal data is) —
    // rather than loading a previously computed plan object from cache,
    // which would go stale the moment BASE_MEALS is ever updated.
    try {
      const savedAnswers = localStorage.getItem(`bxl_diet_survey_${tabId}`);
      if (savedAnswers) {
        handleSurveySubmit({ ...JSON.parse(savedAnswers), goal: tabId });
        return;
      }
    } catch {}
    setSurveyPlanType(tabId);
    setShowSurvey(true);
  }

  // Reopen the survey pre-filled with the last saved answers, so the user
  // can tweak their details without starting from a blank form.
  function handleEditSurvey(goal) {
    setSurveyPlanType(goal);
    setShowSurvey(true);
  }

  function handleSurveySubmit(formData) {
    setLoading(true);
    setTimeout(() => {
      const { weight, height, age, gender, activity, goal } = formData;
      const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);

      // 1. BMR (Mifflin-St Jeor) → TDEE → daily calorie target
      const bmr = gender === 'male' ? (10*w + 6.25*h - 5*a + 5) : (10*w + 6.25*h - 5*a - 161);
      const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
      const tdee = Math.round(bmr * (actMult[activity] || 1.55));
      const MUSCLE_GAIN_SURPLUS = 1000; // midpoint of the 300–500 kcal range
      const FAT_LOSS_DEFICIT = 500;
      const targetCalories = goal === 'fat_loss' ? tdee - FAT_LOSS_DEFICIT : tdee + MUSCLE_GAIN_SURPLUS;


      // 2. Macro targets — protein & fat driven directly by bodyweight,
      //    carbs fill whatever calories are left. This guarantees
      //    protein*4 + fat*9 + carbs*4 === targetCalories, exactly.
      const proteinG = Math.round(w * 2.2);
      const fatG = Math.round(w * 1.3);
      const remainingCal = targetCalories - (proteinG * 4) - (fatG * 9);
      const carbsG = Math.round(remainingCal / 6.5);
      const targetMacros = { protein: proteinG, carbs: carbsG, fat: fatG, calories: targetCalories };

      // 3+4+5. Split the day's targets across meals, then derive real
      // ingredient quantities that hit each meal's slice of those targets.
      const baseMeals = BASE_MEALS[goal] || BASE_MEALS.muscle_gain;
      const scaledMeals = generateDietPlan(baseMeals, targetMacros, goal);

      // 6. Validate: sum of all meals should equal the target exactly
      //    for protein/carbs/fat. Calories are derived per-meal, so their
      //    sum is naturally consistent with those final macros.
      const { sum } = validateDietPlan(scaledMeals, targetMacros);

      // Optional bonus meal(s) — shown separately, never counted in the totals above.
      const optionalMeals = resolveOptionalMeals(goal);

      // The daily "actual calories" shown to the user is now derived from
      // the FINAL protein/carbs/fat targets (same 4/4/9 rule as every meal),
      // so it always matches the sum of the per-meal calorie numbers.
      const actualCalories = targetMacros.protein * 4 + targetMacros.carbs * 4 + targetMacros.fat * 9;

      const planData = {
        meals: scaledMeals,
        optionalMeals,
        userInfo: formData,
        macros: { protein: targetMacros.protein, carbs: targetMacros.carbs, fat: targetMacros.fat },
        targetCalories,
        actualCalories,
        tdee,
      };
      setPlanResult(planData);
      // Save the survey answers so the user isn't asked to fill the form
      // again next time they open this goal's tab.
      try {
        localStorage.setItem(`bxl_diet_survey_${goal}`, JSON.stringify(formData));
      } catch {}
      setActiveTab(goal);
      setShowSurvey(false);
      setLoading(false);
    }, 1000);
  }

  function handleDownload() {
    if (!planResult) return;
    const goalLabel = planResult.userInfo.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain';
    generatePDF(planResult.meals, planResult.optionalMeals, planResult.userInfo, planResult.macros, planResult.targetCalories, planResult.actualCalories, goalLabel);
  }

  if (authLoading) return null;
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
        {activeTab === 'standard' && <StandardPlanView onSelectPlan={handleTabClick} />}
        {activeTab !== 'standard' && planResult && (
          <DynamicPlanView
            meals={planResult.meals}
            optionalMeals={planResult.optionalMeals}
            userInfo={planResult.userInfo}
            macros={planResult.macros}
            targetCalories={planResult.targetCalories}
            actualCalories={planResult.actualCalories}
            tdee={planResult.tdee}
            onDownload={handleDownload}
            onEditSurvey={handleEditSurvey}
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
          initialData={(() => {
            try {
              const saved = localStorage.getItem(`bxl_diet_survey_${surveyPlanType}`);
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })()}
        />
      )}
    </div>
  );
}