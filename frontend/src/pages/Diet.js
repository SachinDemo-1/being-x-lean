/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';

import SEO, { buildBreadcrumbSchema, buildFAQSchema, buildSoftwareApplicationSchema } from '../components/SEO';
import ReviewPopup from '../components/ReviewPopup';
import { shouldShowReviewPopup, markPrompted } from '../context/reviews';

// ─── Temporary toggle: set to true to disable Non-Veg selection (e.g. during
// festival/holiday days). Flip back to false to re-enable it.
const NONVEG_DISABLED = true;

// ═══════════════════════════════════════════════════════════════════════════
// DIET CALCULATION ENGINE — v11 (FIXED MEAL STRUCTURE + MATH SOLVER)
//
// The MEALS and their FOOD ITEMS are exactly as specified — nothing added,
// nothing removed, nothing renamed:
//
//   MUSCLE GAIN
//     Pre-Workout   → Oats, Milk, Banana, Almonds
//     Post-Workout  → Whey Protein, Brown Bread, Peanut Butter,
//                      Boiled Potato / Sweet Potato
//     Lunch         → Rice (or Roti), Dal / Rajma, Mixed Vegetables, Salad
//     Evening Snack → Soya Chunks, Curd
//     Dinner        → Paneer (or Tofu), Roti, Mixed Vegetables, Salad
//     Optional      → Oats, Milk, Mixed Seeds   (not counted in totals)
//
//   FAT LOSS
//     Pre-Workout   → Upma / Poha, Curd
//     Post-Workout  → Oats, Whey Protein, Milk, Banana
//     Lunch         → Rice / Roti, Dal / Rajma, Mixed Vegetables,
//                      Soya Chunks, Salad
//     Evening Snack → Roasted Chana / Sprouted Moong Dal, Curd
//     Dinner        → Paneer / Tofu, Rice / Roti, Mixed Vegetables, Salad
//
// What changed from the very first version is ONLY how much of each item is
// used. Instead of one hand-picked number per weight bracket, every food's
// QUANTITY is solved mathematically: target Calories/Protein/Carbs/Fat are
// derived from the person's TDEE + goal, then each food is nudged up/down
// in realistic steps (rice in 50g steps, roti/bowl/plate as whole pieces,
// etc.) until the day's real totals land within tolerance of the target:
//   Calories ±30 kcal · Protein ±5g · Carbs ±10g · Fat ±5g
// Every nutrition number below is a standard reference value (per 100g or
// per realistic unit) — nothing is invented, and no quantity can ever come
// out as something unrealistic like "83g rice".
// ═══════════════════════════════════════════════════════════════════════════

// ─── Weight brackets — used only to LABEL the plan (e.g. "61–70 kg") and to
// look up the reference target-range chart below. They no longer dictate
// meal quantities directly; the solver computes those from real targets.
const WEIGHT_BRACKETS = [
  { key: '40_50', min: 0,  max: 50,  label: '40–50 kg' },
  { key: '51_60', min: 51, max: 60,  label: '51–60 kg' },
  { key: '61_70', min: 61, max: 70,  label: '61–70 kg' },
  { key: '71_80', min: 71, max: Infinity, label: '71–80 kg' },
];

function getBracket(weight) {
  const w = Number(weight) || 0;
  return WEIGHT_BRACKETS.find(b => w <= b.max) || WEIGHT_BRACKETS[WEIGHT_BRACKETS.length - 1];
}

// ─── Reference daily-target ranges by bracket (from the original chart).
// Shown as an informational "target range for your weight" alongside the
// ACTUAL numbers computed from the real, solved meal plan — never overrides
// the real computed macros. Falls back to a tolerance-band around the
// mathematically-derived target when a bracket has no chart entry.
const TARGET_RANGES = {
  muscle_gain: {
    '40_50': { calories: [2600, 2800], protein: [120, 140], carbs: [330, 360], fat: [65, 70] },
    '51_60': { calories: [2900, 3100], protein: [145, 165], carbs: [380, 400], fat: [75, 85] },
    '61_70': { calories: [3300, 3450], protein: [175, 185], carbs: [440, 450], fat: [85, 90] },
    '71_80': { calories: [3500, 3700], protein: [185, 200], carbs: [470, 500], fat: [90, 100] },
  },
  // No reference chart was provided for fat_loss — the tolerance-derived
  // range is used instead (see resolveTargetRange below).
};

// ─── Nutrition per 100g/100ml (gram-based) or per single realistic unit
// (countable: scoop / slice / tbsp / bowl / plate / pc). These are standard
// reference values — nothing invented. Each entry also carries step/min/max
// so the solver only ever moves it in realistic increments (e.g. rice in
// 50g jumps, roti as whole pieces).
const FOODS = {
  oats:         { name: 'Oats',                              per100: { cal: 389, p: 16.9, c: 66.3, f: 6.9 }, step: 10, min: 30,  max: 90,  unit: 'g' },
  milk:         { name: 'Milk',                               per100: { cal: 60,  p: 3.3,  c: 4.8,  f: 3.3 }, step: 50, min: 100, max: 350, unit: 'ml' },
  banana:       { name: 'Banana',        perUnit: { cal: 89,  p: 1.3,  c: 27,   f: 0.3 }, step: 1,  min: 1,  max: 2,   unit: 'medium', countable: true },
  almonds:      { name: 'Almonds',       perUnit: { cal: 6.9, p: 0.25, c: 0.26, f: 0.60 }, step: 5, min: 10,  max: 25,  unit: 'pcs',     countable: true },

  wheyProtein:  { name: 'Whey Protein',  perUnit: { cal: 118, p: 24,   c: 3,    f: 1.5 }, step: 1,  min: 1,  max: 2,   unit: 'scoop',   countable: true },
  brownBread:   { name: 'Brown Bread',   perUnit: { cal: 70,  p: 3.5,  c: 12,   f: 1.1 }, step: 1,  min: 2,  max: 6,   unit: 'slice',   countable: true },
  peanutButter: { name: 'Peanut Butter', perUnit: { cal: 96,  p: 4,    c: 3.2,  f: 8   }, step: 1,  min: 1,  max: 2,   unit: 'tbsp',    countable: true },
  boiledPotato: { name: 'Boiled Potato/Sweet Potato', per100: { cal: 87, p: 1.9, c: 20.1, f: 0.1 }, step: 50, min: 50, max: 350, unit: 'g' },

  rice:         { name: 'Rice',          per100: { cal: 130, p: 2.7,  c: 28.2, f: 0.3 }, step: 50, min: 150,  max: 400, unit: 'g' },
  dalRajma:     { name: 'Dal/Rajma',     perUnit: { cal: 172, p: 10,   c: 28,   f: 5   }, step: 1,  min: 1,  max: 1.5,   unit: 'bowl',    countable: true },
  mixedVeg:     { name: 'Mixed Vegetables', perUnit: { cal: 79, p: 3,  c: 10,   f: 3   }, step: 1,  min: 1,  max: 2,   unit: 'bowl',    countable: true },
  salad:        { name: 'Salad',         perUnit: { cal: 30,  p: 2,    c: 6,    f: 0.3 }, step: 1,  min: 1,  max: 2,   unit: 'plate',   countable: true },

  soyaChunks:   { name: 'Soya Chunks',   per100: { cal: 345, p: 52,   c: 33,   f: 0.5 }, step: 10, min: 40,  max: 60, unit: 'g' },
  curd:         { name: 'Curd',          per100: { cal: 61,  p: 3.5,  c: 4.7,  f: 3.3 }, step: 50, min: 100,  max: 250, unit: 'g' },

  paneerTofu:   { name: 'Paneer/Tofu',   per100: { cal: 265, p: 18.3, c: 1.2,  f: 20.8 }, step: 50, min: 50, max: 150, unit: 'g' },
  roti:         { name: 'Roti',          perUnit: { cal: 120, p: 3.2, c: 18,   f: 1.2 }, step: 1,  min: 1,  max: 5,   unit: 'medium',  countable: true },

  upmaPoha:     { name: 'Upma / Poha',   per100: { cal: 150, p: 3.2,  c: 24,   f: 4.2 }, step: 10, min: 50,  max: 250, unit: 'g' },
  roastedChana: { name: 'Roasted Chana / Sprouted Moong Dal', per100: { cal: 340, p: 20, c: 55, f: 5 }, step: 10, min: 20, max: 100, unit: 'g' },

  mixedSeeds:   { name: 'Mixed Seeds',   per100: { cal: 550, p: 22,   c: 18,   f: 49  }, step: 5,  min: 0,   max: 30,  unit: 'g' },
};

function computeFoodMacros(key, amount) {
  const food = FOODS[key];
  if (!food || !amount) return { cal: 0, p: 0, c: 0, f: 0 };
  if (food.perUnit) {
    return {
      cal: food.perUnit.cal * amount,
      p: food.perUnit.p * amount,
      c: food.perUnit.c * amount,
      f: food.perUnit.f * amount,
    };
  }
  const factor = amount / 100;
  return {
    cal: food.per100.cal * factor,
    p: food.per100.p * factor,
    c: food.per100.c * factor,
    f: food.per100.f * factor,
  };
}

// ─── FIXED MEAL STRUCTURE — exactly the meals/items requested. The solver
// below only ever changes QUANTITIES of these exact items; it never adds,
// removes, or substitutes an item.
const MEAL_TEMPLATES = {
  muscle_gain: [
    { name: 'Pre-Workout',   time: '7:00 AM',  icon: '🌅', slots: ['oats', 'milk', 'banana', 'almonds'] },
    { name: 'Post-Workout',  time: '10:00 AM', icon: '💪', slots: ['wheyProtein', 'brownBread', 'peanutButter', 'boiledPotato'] },
    { name: 'Lunch',         time: '1:00 PM',  icon: '🍛', slots: ['rice', 'dalRajma', 'mixedVeg', 'salad'], notes: { rice: 'or Roti' } },
    { name: 'Evening Snack', time: '5:00 PM',  icon: '🥜', slots: ['soyaChunks', 'curd'] },
    { name: 'Dinner',        time: '9:00 PM',  icon: '🍲', slots: ['paneerTofu', 'roti', 'mixedVeg', 'salad'], notes: { paneerTofu: 'or Tofu' } },
  ],
  fat_loss: [
    { name: 'Pre-Workout',   time: '6:30 AM',  icon: '🥣', slots: ['upmaPoha', 'curd'] },
    { name: 'Post-Workout',  time: '8:00 AM',  icon: '💪', slots: ['oats', 'wheyProtein', 'milk', 'banana'] },
    { name: 'Lunch',         time: '1:00 PM',  icon: '🍛', slots: ['rice', 'dalRajma', 'mixedVeg', 'soyaChunks', 'salad'], notes: { rice: 'or Roti' } },
    { name: 'Evening Snack', time: '5:00 PM',  icon: '🥜', slots: ['roastedChana', 'curd'] },
    { name: 'Dinner',        time: '8:00 PM',  icon: '🍽️', slots: ['paneerTofu', 'rice', 'mixedVeg', 'salad'], notes: { paneerTofu: 'or Tofu', rice: 'or Roti' } },
  ],
};

// ─── Optional bonus meal — shown at the end, NOT counted toward the day's
// calorie/protein/carb/fat totals (purely an "if you need more" add-on).
const OPTIONAL_MEALS = {
  muscle_gain: [
    { name: 'Optional (If You Need More Calories)', time: 'Anytime', icon: '➕', slots: [
      { key: 'oats', amount: 50 },
      { key: 'milk', amount: 250 },
      { key: 'mixedSeeds', amount: 15 },
    ] },
  ],
};

// ─── Target macro calculation ──────────────────────────────────────────────
// Protein target: grams per kg bodyweight, goal-dependent (higher in a
// deficit to preserve muscle). Fat target: percentage of total calories.
// Carbs: whatever calories remain after protein and fat are accounted for.
// Every number is derived with a formula from the person's own TDEE/target
// calories — nothing is a hardcoded lookup.
const PROTEIN_PER_KG = { muscle_gain: 2.0, fat_loss: 2.2 };
const FAT_PERCENT_OF_CALORIES = { muscle_gain: 0.25, fat_loss: 0.25 };

function computeTargetMacros(goal, weightKg, targetCalories) {
  const proteinPerKg = PROTEIN_PER_KG[goal] || 2.0;
  const fatPercent = FAT_PERCENT_OF_CALORIES[goal] || 0.25;

  const protein = Math.round(weightKg * proteinPerKg);
  const fat = Math.round((targetCalories * fatPercent) / 9);
  const carbsCalories = Math.max(targetCalories - protein * 4 - fat * 9, 0);
  const carbs = Math.round(carbsCalories / 4);

  return { calories: targetCalories, protein, carbs, fat };
}

// ─── THE SOLVER ─────────────────────────────────────────────────────────────
// Starts every food slot (across the fixed meal structure above) at its
// minimum realistic quantity, then repeatedly applies whichever single
// step — on any slot, up or down — moves the day's totals closest to the
// target, recalculating real macros after every step. Stops once
// Calories/Protein/Carbs/Fat are all within tolerance, or once no further
// step can improve things.
const TOLERANCE = { calories: 30, protein: 5, carbs: 10, fat: 5 };

function withinTolerance(totals, target) {
  return (
    Math.abs(target.calories - totals.cal) <= TOLERANCE.calories &&
    Math.abs(target.protein - totals.p) <= TOLERANCE.protein &&
    Math.abs(target.carbs - totals.c) <= TOLERANCE.carbs &&
    Math.abs(target.fat - totals.f) <= TOLERANCE.fat
  );
}

function errorScore(totals, target) {
  const dCal = (target.calories - totals.cal) / TOLERANCE.calories;
  const dP = (target.protein - totals.p) / TOLERANCE.protein;
  const dC = (target.carbs - totals.c) / TOLERANCE.carbs;
  const dF = (target.fat - totals.f) / TOLERANCE.fat;
  return dCal * dCal + dP * dP + dC * dC + dF * dF;
}

function solveMealPlan(goal, targetMacros) {
  const template = MEAL_TEMPLATES[goal] || MEAL_TEMPLATES.muscle_gain;

  // Flatten every meal's slots into one list of {mealIdx, key} the solver
  // can adjust independently. Duplicate items across meals (e.g. Rice or
  // Mixed Vegetables appearing twice) are tracked separately per meal.
  const slots = [];
  template.forEach((meal, mi) => {
    meal.slots.forEach(key => slots.push({ mealIdx: mi, key }));
  });

  const qty = slots.map(s => FOODS[s.key].min);

  function totals() {
    let cal = 0, p = 0, c = 0, f = 0;
    slots.forEach((s, i) => {
      const m = computeFoodMacros(s.key, qty[i]);
      cal += m.cal; p += m.p; c += m.c; f += m.f;
    });
    return { cal, p, c, f };
  }

  let current = totals();
  const MAX_ITERATIONS = 800;

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    if (withinTolerance(current, targetMacros)) break;

    let bestIdx = -1, bestDir = 0, bestScore = errorScore(current, targetMacros);

    slots.forEach((s, i) => {
      const food = FOODS[s.key];

      // Try increasing this food by one realistic step.
      if (qty[i] + food.step <= food.max) {
        const d = computeFoodMacros(s.key, food.step);
        const trial = { cal: current.cal + d.cal, p: current.p + d.p, c: current.c + d.c, f: current.f + d.f };
        const score = errorScore(trial, targetMacros);
        if (score < bestScore) { bestScore = score; bestIdx = i; bestDir = 1; }
      }

      // Try decreasing this food by one realistic step.
      if (qty[i] - food.step >= food.min) {
        const d = computeFoodMacros(s.key, -food.step);
        const trial = { cal: current.cal + d.cal, p: current.p + d.p, c: current.c + d.c, f: current.f + d.f };
        const score = errorScore(trial, targetMacros);
        if (score < bestScore) { bestScore = score; bestIdx = i; bestDir = -1; }
      }
    });

    if (bestIdx === -1) break; // no single step improves things further
    qty[bestIdx] += bestDir * FOODS[slots[bestIdx].key].step;
    current = totals();
  }

  // Build the display meal objects — quantities are exactly what the solver
  // landed on, macros are the real sum of those quantities. Item order
  // within each meal always matches the fixed template order.
  const meals = template.map((mealDef, mi) => {
    const mealItems = [];
    slots.forEach((s, i) => {
      if (s.mealIdx !== mi) return;
      const food = FOODS[s.key];
      const m = computeFoodMacros(s.key, qty[i]);
      const note = mealDef.notes && mealDef.notes[s.key] ? mealDef.notes[s.key] : undefined;
      mealItems.push({
        name: food.name,
        amount: qty[i],
        unit: food.unit,
        countable: !!food.countable,
        note,
        macros: { protein: m.p, carbs: m.c, fat: m.f, calories: m.cal },
      });
    });

    const raw = mealItems.reduce((acc, it) => ({
      protein: acc.protein + it.macros.protein,
      carbs: acc.carbs + it.macros.carbs,
      fat: acc.fat + it.macros.fat,
    }), { protein: 0, carbs: 0, fat: 0 });

    const protein = Math.round(raw.protein);
    const carbs = Math.round(raw.carbs);
    const fat = Math.round(raw.fat);
    const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

    return {
      id: `meal${mi + 1}`,
      name: mealDef.name,
      time: mealDef.time,
      icon: mealDef.icon,
      items: mealItems,
      macros: { protein, carbs, fat, calories },
    };
  });

  const actualTotals = meals.reduce((acc, m) => ({
    protein: acc.protein + m.macros.protein,
    carbs: acc.carbs + m.macros.carbs,
    fat: acc.fat + m.macros.fat,
    calories: acc.calories + m.macros.calories,
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

  return { meals, actualTotals };
}

// ─── Optional bonus meal(s) — fixed reference amounts, never solved for,
// and deliberately excluded from the day's totals.
function resolveOptionalMeals(goal) {
  const defs = OPTIONAL_MEALS[goal] || [];
  return defs.map((meal, idx) => {
    const items = meal.slots.map(({ key, amount }) => {
      const food = FOODS[key];
      const m = computeFoodMacros(key, amount);
      return {
        name: food.name,
        amount,
        unit: food.unit,
        countable: !!food.countable,
        macros: { protein: m.p, carbs: m.c, fat: m.f, calories: m.cal },
      };
    });
    return { id: `optional${idx + 1}`, name: meal.name, time: meal.time, icon: meal.icon, items };
  });
}

function resolveTargetRange(goal, bracketKey, targetMacros) {
  const chart = (TARGET_RANGES[goal] || {})[bracketKey];
  if (chart) return chart;
  return {
    calories: [targetMacros.calories - TOLERANCE.calories, targetMacros.calories + TOLERANCE.calories],
    protein: [targetMacros.protein - TOLERANCE.protein, targetMacros.protein + TOLERANCE.protein],
    carbs: [targetMacros.carbs - TOLERANCE.carbs, targetMacros.carbs + TOLERANCE.carbs],
    fat: [targetMacros.fat - TOLERANCE.fat, targetMacros.fat + TOLERANCE.fat],
  };
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generatePDF(meals, optionalMeals, userInfo, macros, targetCalories, actualCalories, goalLabel, bracketLabel, targetRange) {
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
  const bodyImg = new Image();
  bodyImg.src = "/images/body.png";
  doc.addImage(bodyImg, "PNG", 90, 20, 100, 100);
  doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('BEING X LEAN', margin + 6, 30);
  doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text('FITNESS & NUTRITION', margin + 6, 38);
  doc.setTextColor(...white); doc.setFont('helvetica', 'bold'); doc.setFontSize(28);
  doc.text(goalLabel.toUpperCase(), margin + 6, 65);
  doc.setFontSize(16); doc.setTextColor(...gold); doc.text('DIET PLAN', margin + 6, 78);
  doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Personalized for ${bracketLabel}`, margin + 6, 90);

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
  doc.setTextColor(...dark); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('DAILY TARGETS (ACTUAL)', margin + 6, 185);
  [['CALORIES', `${actualCalories}`, 'kcal'], ['PROTEIN', `${macros.protein}`, 'g'], ['CARBS', `${macros.carbs}`, 'g'], ['FAT', `${macros.fat}`, 'g']].forEach(([lbl, val, unit], i) => {
    const mx = margin + 6 + i * (cW / 4);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(lbl, mx, 198);
    doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(val, mx, 210);
    doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(unit, mx, 218);
  });
  if (targetRange) {
    doc.setTextColor(120, 120, 120); doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
    doc.text(
      `Reference range for ${bracketLabel}: ${targetRange.calories[0]}-${targetRange.calories[1]} kcal, P ${targetRange.protein[0]}-${targetRange.protein[1]}g, C ${targetRange.carbs[0]}-${targetRange.carbs[1]}g, F ${targetRange.fat[0]}-${targetRange.fat[1]}g`,
      margin + 6, 226
    );
  }
  doc.setTextColor(70, 70, 70); doc.setFontSize(7);
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })}  •  being-x-lean.com`, W / 2, 285, { align: 'center' });

  // Meals page
  newPage();
  doc.setTextColor(...gold); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('YOUR MEAL PLAN', margin, y); y += 3;
  doc.setFillColor(...gold); doc.rect(margin, y, 38, 0.8, 'F'); y += 10;
  doc.setTextColor(...gray); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`${bracketLabel}  •  Target: ${targetCalories} kcal  •  Actual: ${actualCalories} kcal  •  P:${macros.protein}g  •  C:${macros.carbs}g  •  F:${macros.fat}g`, margin, y); y += 10;

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
      const qtyText = `${item.amount} ${item.unit}` + (item.note ? ` (${item.note})` : '');
      doc.setFillColor(240, 240, 240); doc.rect(margin + 4, y, cW - 4, 7, 'F');
      doc.setFillColor(...gold); doc.circle(margin + 7.5, y + 3.5, 1, 'F');
      doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text(nm, margin + 11, y + 5);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
      doc.text(qtyText, W - margin - 4, y + 5, { align: 'right' }); y += 8.5;
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

  doc.save(`BeingXLean_${goalLabel.replace(/\s/g, '_')}_${bracketLabel.replace(/[^\d]/g, '')}_Plan.pdf`);
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
function DynamicPlanView({ meals, optionalMeals, userInfo, macros, targetCalories, actualCalories, tdee, bracketLabel, targetRange, onDownload, onEditSurvey }) {
  const goalLabel = userInfo.goal === 'fat_loss' ? 'Fat Loss' : 'Muscle Gain';
  return (
    <div className="diet-dynamic-view">
      <div className="diet-dynamic-hero diet-reveal">
        <div>
          <span className="section-eyebrow">{goalLabel} — {bracketLabel}</span>
          <h2 className="section-title" style={{fontSize:'clamp(1.8rem,5vw,3rem)'}}>YOUR PLAN</h2>
          <p style={{color:'var(--text-secondary)', fontSize:'0.9rem', marginTop:'0.3rem'}}>
            {userInfo.weight}kg · {userInfo.age}yrs · {userInfo.dietType === 'veg' ? '🥦 Veg' : '🍗 Non-Veg'} · TDEE: {tdee} kcal · Target: {targetCalories} kcal
          </p>
          {targetRange && (
            <p style={{color:'var(--text-secondary)', fontSize:'0.78rem', marginTop:'0.2rem', opacity:0.8}}>
              Reference range for {bracketLabel}: {targetRange.calories[0]}–{targetRange.calories[1]} kcal · P {targetRange.protein[0]}–{targetRange.protein[1]}g · C {targetRange.carbs[0]}–{targetRange.carbs[1]}g · F {targetRange.fat[0]}–{targetRange.fat[1]}g
            </p>
          )}
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
                  <span className="diet-meal-qty">
                    {item.amount} {item.unit}
                    {item.note && <em style={{opacity:0.6, fontSize:'0.8em', marginLeft:4}}>({item.note})</em>}
                  </span>
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

  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const unlocked = !!user && hasPlan(user, 'diet');

  useEffect(() => {
    if (!unlocked) return;
    if (!shouldShowReviewPopup(user)) return;
    const timer = setTimeout(() => setShowReviewPopup(true), 10000);
    return () => clearTimeout(timer);
  }, [unlocked, user]);

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

  function handleEditSurvey(goal) {
    setSurveyPlanType(goal);
    setShowSurvey(true);
  }

  function handleSurveySubmit(formData) {
    setLoading(true);
    setTimeout(() => {
      const { weight, height, age, gender, activity, goal } = formData;
      const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age);

      // BMR (Mifflin-St Jeor) → TDEE → reference calorie target — same
      // formula as before.
      const bmr = gender === 'male' ? (10*w + 6.25*h - 5*a + 5) : (10*w + 6.25*h - 5*a - 161);
      const actMult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, very_active:1.9 };
      const tdee = Math.round(bmr * (actMult[activity] || 1.55));
      const MUSCLE_GAIN_SURPLUS = 400;
      const FAT_LOSS_DEFICIT = 500;
      const targetCalories = goal === 'fat_loss' ? tdee - FAT_LOSS_DEFICIT : tdee + MUSCLE_GAIN_SURPLUS;

      // Derive target protein/carbs/fat mathematically from the calorie
      // target, then solve the FIXED meal structure's food quantities to
      // land within tolerance of all four numbers at once.
      const targetMacros = computeTargetMacros(goal, w, targetCalories);
      const { meals: scaledMeals, actualTotals } = solveMealPlan(goal, targetMacros);
      const optionalMeals = resolveOptionalMeals(goal);

      const bracket = getBracket(w);
      const targetRange = resolveTargetRange(goal, bracket.key, targetMacros);

      const planData = {
        meals: scaledMeals,
        optionalMeals,
        userInfo: formData,
        macros: { protein: actualTotals.protein, carbs: actualTotals.carbs, fat: actualTotals.fat },
        targetCalories,
        actualCalories: actualTotals.calories,
        tdee,
        bracketLabel: bracket.label,
        targetRange,
      };
      setPlanResult(planData);
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
    generatePDF(
      planResult.meals,
      planResult.optionalMeals,
      planResult.userInfo,
      planResult.macros,
      planResult.targetCalories,
      planResult.actualCalories,
      goalLabel,
      planResult.bracketLabel,
      planResult.targetRange
    );
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
            bracketLabel={planResult.bracketLabel}
            targetRange={planResult.targetRange}
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
              Answer a few quick questions and we'll generate an exact meal plan matched to your weight bracket.
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
      {showReviewPopup && (
        <ReviewPopup
          plan="diet"
          onClose={() => { markPrompted(user); setShowReviewPopup(false); }}
        />
      )}
    </div>
  );
}