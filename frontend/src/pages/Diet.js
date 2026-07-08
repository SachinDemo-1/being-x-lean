import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';

// ─── Base meal plans (reference ingredient amounts before per-user scaling) ──
const BASE_MEALS = {
  muscle_gain: [
    { id: 'meal1', name: 'Pre-Workout', time: '7:00 AM', icon: '🌅',
      items: [
        { name: 'Oats', base: 70, unit: 'g' },
        { name: 'Milk', base: 250, unit: 'ml' },
        { name: 'Banana', base: 1, unit: 'pc', countable: true },
        { name: 'Almonds (Badam) [15 pc]', base: 15, unit: 'g' },
      ],
      macros: { protein: 16, carbs: 70, fat: 18, calories: 520 }
    },
    { id: 'meal2', name: 'Post-Workout', time: '10:00 AM', icon: '💪',
      items: [
        { name: 'Whey Protein', base: 1, unit: 'scoop', countable: true },
        { name: 'Brown Bread', base: 60, unit: 'g' },
        { name: 'Peanut Butter', base: 1, unit: 'spoon', countable: true },
        { name: 'Boiled Potato', base: 2, unit: 'pc', countable: true },
      ],
      macros: { protein: 30, carbs: 55, fat: 12, calories: 460 }
    },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice / Roti', base: 250, unit: 'g' },
        { name: 'Dal / Rajma', base: 200, unit: 'g' },
        { name: 'Salad', base: 100, unit: 'g' },
      ],
      macros: { protein: 20, carbs: 90, fat: 6, calories: 500 }
    },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Soya Chunks', base: 30, unit: 'g' },
        { name: 'Curd', base: 200, unit: 'g' },
      ],
      macros: { protein: 23, carbs: 15, fat: 6, calories: 250 }
    },
    { id: 'meal5', name: 'Dinner', time: '9:00 PM', icon: '🍲',
      items: [
        { name: 'Rice / Roti', base: 200, unit: 'g' },
        { name: 'Dal / Rajma', base: 150, unit: 'g' },
        { name: 'Mix Veg', base: 100, unit: 'g' },
        { name: 'Paneer / Tofu', base: 100, unit: 'g' },
      ],
      macros: { protein: 24, carbs: 60, fat: 15, calories: 470 }
    },
  ],
  fat_loss: [
    { id: 'meal1', name: 'Pre-Workout', time: '6:30 AM', icon: '🌅',
      items: [
        { name: 'Upma / Poha', base: 150, unit: 'g' },
        { name: 'Curd', base: 150, unit: 'g' },
      ],
      macros: { protein: 10, carbs: 40, fat: 8, calories: 280 }
    },
    { id: 'meal2', name: 'Post-Workout', time: '8:00 AM', icon: '🥤',
      items: [
        { name: 'Oats', base: 40, unit: 'g' },
        { name: 'Whey Protein', base: 1, unit: 'scoop', countable: true },
        { name: 'Milk (low fat)', base: 200, unit: 'ml' },
        { name: 'Banana', base: 1, unit: 'pc', countable: true },
      ],
      macros: { protein: 32, carbs: 45, fat: 6, calories: 350 }
    },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice / Roti', base: 200, unit: 'g' },
        { name: 'Dal / Rajma', base: 150, unit: 'g' },
        { name: 'Sabzi (1 Bowl)', base: 100, unit: 'g' },
        { name: 'Soya Chunks', base: 30, unit: 'g' },
        { name: 'Salad', base: 100, unit: 'g' },
      ],
      macros: { protein: 26, carbs: 70, fat: 6, calories: 440 }
    },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Roasted Chana / Sprouts Moong Dal', base: 40, unit: 'g' },
        { name: 'Curd', base: 150, unit: 'g' },
      ],
      macros: { protein: 12, carbs: 18, fat: 2, calories: 155 }
    },
    { id: 'meal5', name: 'Dinner', time: '8:00 PM', icon: '🥣',
      items: [
        { name: 'Paneer / Tofu', base: 100, unit: 'g' },
        { name: 'Fried Rice / Roti', base: 150, unit: 'g' },
        { name: 'Mix Veg', base: 100, unit: 'g' },
        { name: 'Salad', base: 100, unit: 'g' },
      ],
      macros: { protein: 18, carbs: 45, fat: 15, calories: 390 }
    },
  ],
};

// ─── Optional bonus meal — shown at the end, NOT counted toward the day's
// calorie/protein/carb/fat target totals (purely an "if you need more" add-on)
const OPTIONAL_MEALS = {
  muscle_gain: [
    { id: 'optional1', name: 'Optional (If You Need More Calories)', time: 'Anytime', icon: '➕',
      items: [
        { name: 'Banana', base: 1, unit: 'pc', countable: true },
        { name: 'Oats', base: 40, unit: 'g' },
        { name: 'Milk', base: 200, unit: 'ml' },
        { name: 'Mixed Seeds', base: 15, unit: 'g' },
      ],
    },
  ],
};

function roundToNearest5(value) {
  return Math.round(value / 5) * 5;
}

// ─── Real nutrition data (per 100g/ml, or per single unit for countable items) ─
// Source: standard USDA-style reference values. This is what makes macros
// mathematically consistent — every number below is calculated FROM the
// actual ingredient + quantity shown, not a separately hand-typed guess.
const NUTRITION = {
  'Oats':                              { per100: { p: 16,  c: 66, f: 7,   cal: 389 } },
  'Milk':                              { per100: { p: 3.2, c: 4.8, f: 3,  cal: 60  } },
  'Milk (low fat)':                    { per100: { p: 3.4, c: 5,  f: 1.5, cal: 47  } },
  'Almonds (Badam) [15 pc]':           { per100: { p: 21,  c: 22, f: 50,  cal: 579 } },
  'Rice / Roti':                       { per100: { p: 3,   c: 22, f: 2,   cal: 115 } },
  'Fried Rice / Roti':                 { per100: { p: 3.5, c: 24, f: 6,   cal: 160 } },
  'Brown Bread':                       { per100: { p: 9,   c: 43, f: 3,   cal: 250 } },
  'Brown Rice':                        { per100: { p: 2.6, c: 23, f: 0.9, cal: 111 } },
  'Sabzi (1 Bowl)':                    { per100: { p: 2,   c: 8,  f: 3,   cal: 70  } },
  'Sabzi (light)':                     { per100: { p: 2,   c: 6,  f: 2,   cal: 55  } },
  'Chicken':                           { per100: { p: 31,  c: 0,  f: 3.6, cal: 165 } },
  'Grilled Chicken':                   { per100: { p: 31,  c: 0,  f: 3.6, cal: 165 } },
  'Paneer / Tofu':                     { per100: { p: 13,  c: 1.6, f: 12.4, cal: 170 } },
  'Soya Chunks':                       { per100: { p: 52,  c: 33, f: 0.5, cal: 345 } },
  'Curd':                              { per100: { p: 3.5, c: 4,  f: 4,   cal: 60  } },
  'Dal / Rajma / Chana':               { per100: { p: 7,   c: 20, f: 1,   cal: 120 } },
  'Dal / Rajma':                       { per100: { p: 7,   c: 20, f: 1,   cal: 120 } },
  'Dal':                               { per100: { p: 7,   c: 20, f: 1,   cal: 120 } },
  'Upma / Poha':                       { per100: { p: 3,   c: 25, f: 4,   cal: 150 } },
  'Roasted Chana / Sprouts Moong Dal': { per100: { p: 15, c: 45, f: 3, cal: 275 } },
  'Mixed Seeds':                       { per100: { p: 20,  c: 20, f: 45,  cal: 550 } },
  'Mix Veg':                           { per100: { p: 2,   c: 8,  f: 3,   cal: 70  } },
  'Salad':                             { per100: { p: 1.5, c: 5,  f: 0.2, cal: 25  } },
  'Mixed Nuts':                        { per100: { p: 20,  c: 20, f: 50,  cal: 600 } },
  'Vegetable Soup':                    { per100: { p: 1,   c: 5,  f: 0.5, cal: 30  } },
  // Countable / per-single-unit items
  'Banana':                            { perUnit: { p: 1.3, c: 27, f: 0.3, cal: 105 } },
  'Peanut Butter':                     { perUnit: { p: 4,   c: 3,  f: 8,   cal: 94  } },
  'Whey Protein':                      { perUnit: { p: 24,  c: 3,  f: 1.5, cal: 120 } },
  'Boiled Eggs':                       { perUnit: { p: 6,   c: 0.6, f: 5,  cal: 78  } },
  'Boiled Potato':                     { perUnit: { p: 3,   c: 26, f: 0.15, cal: 130 } },
  'Green Tea':                         { perUnit: { p: 0,   c: 0,  f: 0,   cal: 2   } },
};

function computeItemMacros(name, amount, isCountable) {
  const entry = NUTRITION[name];
  if (!entry) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  const ref = (isCountable && entry.perUnit) ? entry.perUnit : (entry.per100 || entry.perUnit);
  const factor = (isCountable && entry.perUnit) ? amount : amount / 100;
  const protein = ref.p * factor, carbs = ref.c * factor, fat = ref.f * factor;
  // Calories are ALWAYS derived from the macros themselves (4 kcal/g protein,
  // 4 kcal/g carbs, 9 kcal/g fat) rather than a separately-labeled number —
  // this is what guarantees that hitting the protein/carb/fat targets
  // automatically means the calorie target is hit too, with no separate
  // source of drift between them.
  const calories = protein * 4 + carbs * 4 + fat * 9;
  return { protein, carbs, fat, calories };
}

// ─── Scale meals from TARGET MACROS (not just a flat calorie ratio) ───────────
// Two-phase approach across ALL meals in the plan:
//  Phase A: work out, from each meal's OWN baseline ingredients, what share
//    of the day's protein / carbs / fat it can realistically carry. A meal
//    that's naturally protein-poor (e.g. oats+milk+banana) gets assigned a
//    small protein-share and a bigger carb/fat-share — no meal is ever asked
//    to hit a macro its food doesn't contain, which is what caused big drift.
//  Phase B: for each meal, scale + correct its ingredients to hit that
//    meal's own slice of the targets, then round for display. Every
//    ingredient's final macros come from its ACTUAL rounded quantity, so
//    meal totals are always the literal sum of what's on the plate, and day
//    totals are always the literal sum of the meals. No hardcoded numbers.
function scaleMeals(meals, targetMacros, isVeg) {
  // Resolve veg/non-veg items once per meal up front.
  const resolvedMeals = meals.map(meal => meal.items.map(item => {
    const useVeg = isVeg && item.vegAlt;
    return {
      ...item,
      name: useVeg ? item.vegAlt : item.name,
      base: useVeg ? item.vegBase : item.base,
      unit: useVeg ? (item.vegUnit || item.unit) : item.unit,
      countable: useVeg ? !!item.vegCountable : !!item.countable,
    };
  }));

  // Phase A — each meal's baseline macro totals, then its share of the day.
  const mealBaselines = resolvedMeals.map(items => {
    const b = items.map(it => computeItemMacros(it.name, it.base, it.countable));
    return b.reduce((acc, m) => ({
      protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat,
    }), { protein: 0, carbs: 0, fat: 0 });
  });
  const dayBaseline = mealBaselines.reduce((acc, m) => ({
    protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat,
  }), { protein: 0, carbs: 0, fat: 0 });

  const mealTargets = mealBaselines.map(mb => ({
    protein: dayBaseline.protein > 0 ? targetMacros.protein * (mb.protein / dayBaseline.protein) : targetMacros.protein / meals.length,
    carbs:   dayBaseline.carbs  > 0 ? targetMacros.carbs  * (mb.carbs  / dayBaseline.carbs)  : targetMacros.carbs  / meals.length,
    fat:     dayBaseline.fat   > 0 ? targetMacros.fat    * (mb.fat    / dayBaseline.fat)    : targetMacros.fat    / meals.length,
  }));

  // Phase B — scale + correct + round each meal against its own target slice.
  const builtMeals = meals.map((meal, mi) => {
    const resolved = resolvedMeals[mi];
    const mealTarget = mealTargets[mi];
    const baseline = resolved.map(it => computeItemMacros(it.name, it.base, it.countable));
    const baseTotal = mealBaselines[mi];

    const pScale = baseTotal.protein > 0 ? mealTarget.protein / baseTotal.protein : 1;
    const cScale = baseTotal.carbs  > 0 ? mealTarget.carbs  / baseTotal.carbs  : 1;
    const fScale = baseTotal.fat    > 0 ? mealTarget.fat    / baseTotal.fat    : 1;

    // STEP 1 — initial guess: macro-weighted blend per ingredient.
    let rawAmounts = resolved.map((it, i) => {
      const b = baseline[i];
      const macroSum = b.protein + b.carbs + b.fat;
      const itemScale = macroSum > 0
        ? (b.protein * pScale + b.carbs * cScale + b.fat * fScale) / macroSum
        : 1;
      return it.base * itemScale;
    });

    const density = resolved.map(it => computeItemMacros(it.name, it.countable ? 1 : 100, it.countable));

    // STEP 2 — correction pass: close the remaining gap on each macro using
    // the ingredient most associated with it. Repeated several times because
    // correcting one macro can slightly disturb another (e.g. peanut butter
    // carries both fat AND some carbs) — each extra pass cancels that out
    // further, converging toward an exact match on the pre-rounding numbers.
    for (let pass = 0; pass < 6; pass++) {
      ['protein', 'carbs', 'fat'].forEach(key => {
        const current = resolved.reduce((acc, it, i) => acc + computeItemMacros(it.name, rawAmounts[i], it.countable)[key], 0);
        const gap = mealTarget[key] - current;
        if (Math.abs(gap) < 0.01) return;

        let anchorIdx = -1, maxShare = 0;
        baseline.forEach((b, i) => { if (b[key] > maxShare) { maxShare = b[key]; anchorIdx = i; } });
        if (anchorIdx === -1) return;

        const perUnit = density[anchorIdx][key];
        if (!perUnit || perUnit <= 0) return;
        const unitsNeeded = resolved[anchorIdx].countable ? (gap / perUnit) : (gap / perUnit) * 100;
        rawAmounts[anchorIdx] = Math.max(0, rawAmounts[anchorIdx] + unitsNeeded);
      });
    }

    // STEP 3 — round for display and compute each item's FINAL real macros.
    const items = resolved.map((it, i) => {
      const amount = it.countable
        ? Math.max(1, Math.round(rawAmounts[i]))
        : Math.max(5, roundToNearest5(rawAmounts[i]));
      const macros = computeItemMacros(it.name, amount, it.countable);
      return { ...it, amount, macros };
    });

    // The meal's displayed macros are the literal sum of its ingredient rows.
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

  // Phase C — day-wide final correction. Per-meal correction (above) can
  // still leave a small day-level gap when the same ingredient gets pulled
  // in two directions across different meals. This pass looks across ALL
  // meals at once and nudges whichever ingredient is most associated with
  // any remaining protein/carbs/fat gap — preferring gram-based ingredients
  // (fine 5g adjustments) over countable ones (coarse whole-unit jumps,
  // e.g. a whey scoop swings protein by ~24g at a time) so the correction
  // can actually land close to the target instead of overshooting. Run
  // several times since fixing one macro can slightly disturb another.
  for (let pass = 0; pass < 5; pass++) {
    ['protein', 'carbs', 'fat'].forEach(key => {
      const daySum = builtMeals.reduce((acc, m) => acc + m.macros[key], 0);
      const gap = targetMacros[key] - daySum;
      if (Math.abs(gap) < 0.5) return;

      let bestMi = -1, bestIi = -1, bestContribution = 0;
      let bestCountableMi = -1, bestCountableIi = -1, bestCountableContribution = 0;
      builtMeals.forEach((m, mi) => {
        m.items.forEach((it, ii) => {
          if (it.countable) {
            if (it.macros[key] > bestCountableContribution) { bestCountableContribution = it.macros[key]; bestCountableMi = mi; bestCountableIi = ii; }
          } else if (it.macros[key] > bestContribution) {
            bestContribution = it.macros[key]; bestMi = mi; bestIi = ii;
          }
        });
      });
      // Prefer a gram-based ingredient (fine control); only fall back to a
      // countable one if nothing gram-based actually contains this macro.
      if (bestMi === -1) { bestMi = bestCountableMi; bestIi = bestCountableIi; }
      if (bestMi === -1) return;

      const item = builtMeals[bestMi].items[bestIi];
      const perUnit = computeItemMacros(item.name, item.countable ? 1 : 100, item.countable)[key];
      if (!perUnit || perUnit <= 0) return;
      const unitsNeeded = item.countable ? (gap / perUnit) : (gap / perUnit) * 100;
      const newAmount = item.countable
        ? Math.max(1, Math.round(item.amount + unitsNeeded))
        : Math.max(5, roundToNearest5(item.amount + unitsNeeded));

      const newMacros = computeItemMacros(item.name, newAmount, item.countable);
      const oldMacros = item.macros;
      builtMeals[bestMi].items[bestIi] = { ...item, amount: newAmount, macros: newMacros };
      builtMeals[bestMi].macros = {
        protein: Math.round(builtMeals[bestMi].macros.protein - oldMacros.protein + newMacros.protein),
        carbs: Math.round(builtMeals[bestMi].macros.carbs - oldMacros.carbs + newMacros.carbs),
        fat: Math.round(builtMeals[bestMi].macros.fat - oldMacros.fat + newMacros.fat),
        calories: Math.round(builtMeals[bestMi].macros.calories - oldMacros.calories + newMacros.calories),
      };
    });
  }

  return builtMeals;
}

// ─── Validate that the meal breakdown actually adds up to the target ─────────
// Small rounding drift is expected (ingredients round to whole units / nearest
// 50g), so a tolerance of ±2g for macros and ±5kcal for calories is allowed —
// beyond that, something in the scaling logic is actually wrong.
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
    Math.abs(diffs.protein) <= 2 &&
    Math.abs(diffs.carbs) <= 2 &&
    Math.abs(diffs.fat) <= 2 &&
    Math.abs(diffs.calories) <= 5;

  if (!valid) {
    console.warn('[Diet plan] Meal totals drifted from target beyond tolerance:', diffs);
  }
  return { valid, sum, diffs };
}

// ─── Optional bonus meal(s) — resolved with real macros for the user's own
// reference, but deliberately NEVER added into the day's target totals.
// Quantities are fixed reference amounts (not scaled to the user's macros)
// since this is an "extra, if you need it" add-on, not part of the plan.
function resolveOptionalMeals(goal, isVeg) {
  const meals = OPTIONAL_MEALS[goal] || [];
  return meals.map(meal => {
    const items = meal.items.map(item => {
      const useVeg = isVeg && item.vegAlt;
      const name = useVeg ? item.vegAlt : item.name;
      const amount = useVeg ? item.vegBase : item.base;
      const unit = useVeg ? (item.vegUnit || item.unit) : item.unit;
      const countable = useVeg ? !!item.vegCountable : !!item.countable;
      const macros = computeItemMacros(name, amount, countable);
      return { ...item, name, unit, countable, amount, macros };
    });
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
  doc.setFillColor(...gold); doc.roundedRect(margin, 178, cW, 6, 4, 4, 'F'); doc.rect(margin, 181, cW, 3, 'F');
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
      const MUSCLE_GAIN_SURPLUS = 400; // midpoint of the 300–500 kcal range
      const FAT_LOSS_DEFICIT = 500;
      const targetCalories = goal === 'fat_loss' ? tdee - FAT_LOSS_DEFICIT : tdee + MUSCLE_GAIN_SURPLUS;

      // 2. Macro targets — protein & fat driven directly by bodyweight,
      //    carbs fill whatever calories are left. This guarantees
      //    protein*4 + fat*9 + carbs*4 === targetCalories, exactly.
      const proteinG = Math.round(w * 2);
      const fatG = Math.round(w * 1);
      const remainingCal = targetCalories - (proteinG * 4) - (fatG * 9);
      const carbsG = Math.round(remainingCal / 4);
      const targetMacros = { protein: proteinG, carbs: carbsG, fat: fatG, calories: targetCalories };

      // 3+4+5. Split the day's targets across meals, then derive real
      // ingredient quantities that hit each meal's slice of those targets.
      const baseMeals = BASE_MEALS[goal] || BASE_MEALS.muscle_gain;
      const scaledMeals = scaleMeals(baseMeals, targetMacros, formData.dietType === 'veg');

      // 6. Validate: sum of all meals should equal the target within tolerance.
      const { sum } = validateDietPlan(scaledMeals, targetMacros);

      // Optional bonus meal(s) — shown separately, never counted in the totals above.
      const optionalMeals = resolveOptionalMeals(goal, formData.dietType === 'veg');

      const planData = {
        meals: scaledMeals,
        optionalMeals,
        userInfo: formData,
        macros: { protein: sum.protein, carbs: sum.carbs, fat: sum.fat },
        targetCalories,
        actualCalories: sum.calories,
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