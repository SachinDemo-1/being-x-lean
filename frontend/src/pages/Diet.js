import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Diet.css';

// ═══════════════════════════════════════════════════════════════════════════
// DIET CALCULATION ENGINE — v3 (complete redesign)
//
// WHY THIS EXISTS
//  v2 solved for dynamic-food quantities with an iterative "pick the biggest
//  contributor and nudge it" correction loop. That approach has no guarantee
//  of converging on the exact target, can oscillate, and gets harder to
//  reason about every time a food is added. v3 replaces it with an exact,
//  closed-form calculation: the amounts are the SOLUTION to a system of
//  equations, not the result of repeated guessing.
//
// THE MATH
//  For a given day, every FIXED food's macros are known constants. Subtract
//  them from the day's target once — never touched again — and what's left
//  (`remaining`) is the macro budget the DYNAMIC foods must cover exactly:
//
//      Σ x_i · protein_i  = remaining.protein
//      Σ x_i · carbs_i    = remaining.carbs
//      Σ x_i · fat_i      = remaining.fat
//
//  That's 3 equations. With more than 3 dynamic foods in the day (there
//  always are — 7 to 9), the system is under-determined: infinitely many
//  quantity combinations satisfy it exactly. To pick ONE sensible answer,
//  we choose the combination that deviates as little as possible — in
//  relative (%) terms — from each food's realistic reference portion
//  (`base`). That is a constrained least-squares problem:
//
//      minimize   Σ  ((x_i − base_i) / base_i)²
//      subject to Σ x_i · macro_i  =  remaining      (for protein, carbs, fat)
//
//  This has a closed-form solution via Lagrange multipliers: differentiate,
//  set to zero, substitute into the 3 constraint equations, and you get a
//  3×3 linear system for the multipliers (λ_protein, λ_carbs, λ_fat) that
//  can be solved directly (Gaussian elimination) — no iteration, no
//  approximation, an exact algebraic answer.
//
//  Quantities also have hard bounds — a floor (e.g. Soya Chunks ≥ 50g) or a
//  ceiling (e.g. no one eats 6 bananas). Bounded quadratic optimization is
//  solved with the standard ACTIVE-SET method: solve unconstrained, and if
//  any food's solution violates its bound, pin that food at the bound and
//  re-solve the (now smaller) system for everything else. This always
//  terminates in at most N steps (N = number of dynamic foods) and is a
//  textbook technique — not a heuristic.
//
//  Net effect: for any body stats / activity level / goal, the dynamic
//  foods land on the exact combination of quantities that hits the day's
//  macro target (or the closest feasible point, if bounds make an exact
//  hit impossible) — deterministically, in one pass, every time.
//
// ARCHITECTURE
//  1. FOOD_DB           — nutrition facts + unit type for every food.
//  2. MEAL_TEMPLATES    — per goal (muscle_gain / fat_loss) × diet
//                         (veg / nonveg), the meals and which foods in them
//                         are fixed vs dynamic, with each dynamic food's
//                         reference portion + realistic min/max bounds.
//  3. solveDynamicQuantities() — the constrained least-squares solver above.
//  4. generateDietPlan()       — orchestrates: subtract fixed macros → solve
//                                dynamic quantities for the WHOLE DAY at once
//                                (so a protein-light meal is still covered by
//                                protein elsewhere in the day) → round to
//                                realistic numbers → reassemble into meals.
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. FOOD DATABASE ───────────────────────────────────────────────────────
// Nutrition per 100g/100ml (gram-based foods) or per single countable unit
// (scoop / plate / bowl / slice / piece). Calories are always DERIVED from
// protein/carbs/fat (4/4/9 kcal per g), never hand-typed, so hitting the
// macro targets automatically means hitting calories too.
const FOOD_DB = {
  // Dynamic — quantities scale to fit the day's remaining macro budget
  'Oats':                              { per100: { p: 16,  c: 66, f: 7   } },
  'Rice':                              { per100: { p: 2.7, c: 28, f: 0.3 } },
  'Fried Rice':                        { per100: { p: 3.5, c: 24, f: 6   } },
  'Roti':                              { perUnit: { p: 3,   c: 18, f: 2.5 } }, // 1 roti (~40g)
  'Brown Bread':                       { perUnit: { p: 2.3, c: 11, f: 0.8 } }, // 1 slice
  'Boiled Potato':                     { per100: { p: 2,   c: 17, f: 0.1 } },
  'Banana':                            { perUnit: { p: 1.3, c: 27, f: 0.3 } },
  'Almonds':                           { per100: { p: 21,  c: 22, f: 50  } },
  'Peanut Butter':                     { per100: { p: 25,  c: 20, f: 50  } },
  'Soya Chunks':                       { per100: { p: 52,  c: 33, f: 0.5 } },
  'Mixed Seeds':                       { per100: { p: 20,  c: 20, f: 45  } },
  'Upma / Poha':                       { per100: { p: 3,   c: 25, f: 4   } },
  'Roasted Chana / Sprouts Moong Dal': { per100: { p: 15,  c: 45, f: 3   } },
  'Chicken':                           { per100: { p: 31,  c: 0,  f: 3.6 } },
  'Eggs':                              { perUnit: { p: 6,   c: 0.6, f: 5  } },
  // Fixed — quantity is always the same, no matter what the user's stats are
  'Paneer':                            { per100: { p: 18,  c: 1.2, f: 20 } },
  'Whey Protein':                      { perUnit: { p: 24,  c: 3,  f: 1.5 } }, // 1 scoop
  'Milk':                              { per100: { p: 3.2, c: 4.8, f: 3  } },
  'Salad':                             { perUnit: { p: 2,   c: 6,  f: 0.3 } }, // 1 plate
  'Curd':                              { perUnit: { p: 7,   c: 8,  f: 8   } }, // 1 bowl
  'Dal/Rajma + Sabzi':                 { perUnit: { p: 9,   c: 30, f: 5   } }, // 1 bowl (combined)
  'Mixed Vegetables':                  { perUnit: { p: 3,   c: 10, f: 4   } }, // 1 bowl
};

// Macro contribution per ONE UNIT of however this food is measured — per
// gram/ml for bulk foods, per piece/scoop/bowl/etc. for countable ones.
// This is the `a` vector the solver's equations are built from.
function unitDensity(name, countable) {
  const entry = FOOD_DB[name];
  if (!entry) return { p: 0, c: 0, f: 0 };
  if (countable) return entry.perUnit || entry.per100;
  const ref = entry.per100 || entry.perUnit;
  return { p: ref.p / 100, c: ref.c / 100, f: ref.f / 100 };
}

function computeItemMacros(name, amount, isCountable) {
  const d = unitDensity(name, isCountable);
  const protein = d.p * amount, carbs = d.c * amount, fat = d.f * amount;
  return { protein, carbs, fat, calories: protein * 4 + carbs * 4 + fat * 9 };
}

// ─── 2. MEAL TEMPLATES ──────────────────────────────────────────────────────
// Every item is tagged role:'fixed' (amount is permanent, identical for
// muscle_gain AND fat_loss, per spec: Paneer 100g / Whey 1 scoop / Milk
// 250ml / Salad 1 plate / Curd 1 bowl / Dal+Sabzi 1 bowl) or role:'dynamic'.
//
// Dynamic items carry:
//   base   — realistic reference portion (used as the solver's "anchor" —
//            the quantity it deviates from as little as possible)
//   min    — hard floor, never crossed even if the macro math wants less.
//            Only set where explicitly required (Soya Chunks ≥ 50g) — left
//            unset elsewhere so the solver can shrink a food toward zero
//            for extreme targets (e.g. a very low remaining carb budget)
//            instead of being forced to overshoot the day's target.
//   max    — hard ceiling, so the solver can never produce an unrealistic
//            quantity (e.g. 6 bananas) even for extreme targets
//   round  — realistic rounding step for display (25g rice/potato, 10g
//            oats, 5g toppings; countable foods round to whole units)
const MEAL_TEMPLATES = {
  muscle_gain: {
    veg: [
      { id: 'meal1', name: 'Pre-Workout', time: '7:00 AM', icon: '🌅',
        items: [
          { name: 'Oats', role: 'dynamic', unit: 'g', base: 60, max: 180, round: 10 },
          { name: 'Milk', role: 'fixed', unit: 'ml', amount: 250 },
          { name: 'Banana', role: 'dynamic', unit: 'pc', base: 1, max: 3, countable: true },
          { name: 'Almonds', role: 'dynamic', unit: 'g', base: 20, max: 70, round: 5 },
        ] },
      { id: 'meal2', name: 'Post-Workout', time: '10:00 AM', icon: '💪',
        items: [
          { name: 'Whey Protein', role: 'fixed', unit: 'scoop', amount: 1, countable: true },
          { name: 'Brown Bread', role: 'dynamic', unit: 'slice', base: 4, max: 12, countable: true },
          { name: 'Peanut Butter', role: 'dynamic', unit: 'g', base: 20, max: 70, round: 5 },
          { name: 'Boiled Potato', role: 'dynamic', unit: 'g', base: 250, max: 500, round: 25 },
        ] },
      { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
        items: [
          { name: 'Rice', role: 'dynamic', unit: 'g', base: 250, max: 600, round: 25 },
          { name: 'Dal/Rajma + Sabzi', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
          { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
        ] },
      { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
        items: [
          { name: 'Soya Chunks', role: 'dynamic', unit: 'g', base: 50, min: 50, max: 200, round: 5 },
          { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        ] },
      { id: 'meal5', name: 'Dinner', time: '9:00 PM', icon: '🍲',
        items: [
          { name: 'Paneer', role: 'fixed', unit: 'g', amount: 100 },
          { name: 'Roti', role: 'dynamic', unit: 'pc', base: 3, max: 9, countable: true },
          { name: 'Mixed Vegetables', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
          { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
        ] },
    ],
    nonveg: null, // built from veg + additions, see buildNonvegVariant() below
  },
  fat_loss: {
    veg: [
      { id: 'meal1', name: 'Pre-Workout', time: '6:30 AM', icon: '🌅',
        items: [
          { name: 'Upma / Poha', role: 'dynamic', unit: 'g', base: 150, max: 350, round: 25 },
          { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        ] },
      { id: 'meal2', name: 'Post-Workout', time: '8:00 AM', icon: '🥤',
        items: [
          { name: 'Oats', role: 'dynamic', unit: 'g', base: 40, max: 150, round: 10 },
          { name: 'Whey Protein', role: 'fixed', unit: 'scoop', amount: 1, countable: true },
          { name: 'Milk', role: 'fixed', unit: 'ml', amount: 250 },
          { name: 'Banana', role: 'dynamic', unit: 'pc', base: 1, max: 2, countable: true },
        ] },
      { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
        items: [
          { name: 'Rice', role: 'dynamic', unit: 'g', base: 200, max: 500, round: 25 },
          { name: 'Dal/Rajma + Sabzi', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
          { name: 'Soya Chunks', role: 'dynamic', unit: 'g', base: 30, min: 50, max: 200, round: 5 },
          { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
        ] },
      { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
        items: [
          { name: 'Roasted Chana / Sprouts Moong Dal', role: 'dynamic', unit: 'g', base: 40, max: 150, round: 10 },
          { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        ] },
      { id: 'meal5', name: 'Dinner', time: '8:00 PM', icon: '🥣',
        items: [
          { name: 'Paneer', role: 'fixed', unit: 'g', amount: 100 },
          { name: 'Fried Rice', role: 'dynamic', unit: 'g', base: 150, max: 400, round: 25 },
          { name: 'Mixed Vegetables', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
          { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
        ] },
    ],
    nonveg: null,
  },
};

// Non-vegetarian variants = the veg template + Chicken/Eggs woven into the
// meals where they realistically fit (breakfast eggs, lunch chicken),
// keeping every fixed food identical and every other dynamic food untouched.
// Built programmatically (rather than duplicated by hand) so the veg
// template stays the single source of truth for shared meals.
function buildNonvegVariant(goal) {
  const veg = MEAL_TEMPLATES[goal].veg;
  return veg.map(meal => {
    const items = meal.items.map(it => ({ ...it }));
    if (goal === 'muscle_gain') {
      if (meal.id === 'meal1') items.push({ name: 'Eggs', role: 'dynamic', unit: 'pc', base: 2, max: 6, countable: true });
      if (meal.id === 'meal3') items.push({ name: 'Chicken', role: 'dynamic', unit: 'g', base: 150, max: 400, round: 25 });
    } else {
      if (meal.id === 'meal2') items.push({ name: 'Eggs', role: 'dynamic', unit: 'pc', base: 2, max: 4, countable: true });
      if (meal.id === 'meal3') items.push({ name: 'Chicken', role: 'dynamic', unit: 'g', base: 120, max: 350, round: 25 });
    }
    return { ...meal, items };
  });
}
MEAL_TEMPLATES.muscle_gain.nonveg = buildNonvegVariant('muscle_gain');
MEAL_TEMPLATES.fat_loss.nonveg = buildNonvegVariant('fat_loss');

function getMealTemplate(goal, dietType) {
  const goalTemplates = MEAL_TEMPLATES[goal] || MEAL_TEMPLATES.muscle_gain;
  return goalTemplates[dietType] || goalTemplates.veg;
}

// ─── 3. THE SOLVER ──────────────────────────────────────────────────────────
// Solves a 3×3 linear system (protein/carbs/fat) via Gaussian elimination
// with partial pivoting.
function solveLinear3x3(matrix, rhs) {
  const A = matrix.map(row => row.slice());
  const b = rhs.slice();
  for (let col = 0; col < 3; col++) {
    let pivotRow = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[pivotRow][col])) pivotRow = r;
    }
    if (pivotRow !== col) {
      [A[col], A[pivotRow]] = [A[pivotRow], A[col]];
      [b[col], b[pivotRow]] = [b[pivotRow], b[col]];
    }
    if (Math.abs(A[col][col]) < 1e-9) continue; // this direction is degenerate — skip
    for (let r = col + 1; r < 3; r++) {
      const factor = A[r][col] / A[col][col];
      for (let c = col; c < 3; c++) A[r][c] -= factor * A[col][c];
      b[r] -= factor * b[col];
    }
  }
  const x = [0, 0, 0];
  for (let r = 2; r >= 0; r--) {
    let sum = b[r];
    for (let c = r + 1; c < 3; c++) sum -= A[r][c] * x[c];
    x[r] = Math.abs(A[r][r]) < 1e-9 ? 0 : sum / A[r][r];
  }
  return x;
}

// Constrained least-squares: choose x_i (i = each dynamic food, across the
// WHOLE DAY) minimizing Σ ((x_i-base_i)/base_i)² subject to Σ x_i·a_i =
// remaining[protein,carbs,fat], with each x_i bounded to [min_i, max_i].
// Solved exactly via Lagrange multipliers; bound violations are handled by
// the standard active-set method (pin the violating food at its bound,
// re-solve for everyone else — guaranteed to finish in ≤ N steps).
function solveDynamicQuantities(dynamicItems, remaining) {
  const n = dynamicItems.length;
  const densities = dynamicItems.map(it => {
    const d = unitDensity(it.name, !!it.countable);
    return [d.p, d.c, d.f];
  });
  const free = new Set(dynamicItems.map((_, i) => i));
  const boundValue = new Array(n).fill(null);
  const amounts = new Array(n).fill(0);

  for (let iter = 0; iter <= n; iter++) {
    const freeIdx = [...free];
    const adjRemaining = remaining.slice();
    for (let i = 0; i < n; i++) {
      if (boundValue[i] !== null) {
        const a = densities[i];
        for (let k = 0; k < 3; k++) adjRemaining[k] -= a[k] * boundValue[i];
        amounts[i] = boundValue[i];
      }
    }
    if (freeIdx.length === 0) break;

    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const rhs = adjRemaining.slice();
    for (const i of freeIdx) {
      const a = densities[i];
      const base = dynamicItems[i].base || 1e-6;
      const w = 1 / (base * base);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) M[r][c] += (a[r] * a[c]) / (2 * w);
      }
      for (let r = 0; r < 3; r++) rhs[r] -= a[r] * base;
    }
    const lambda = solveLinear3x3(M, rhs);

    let worstIdx = -1, worstMargin = 0, worstBound = 0;
    for (const i of freeIdx) {
      const a = densities[i];
      const base = dynamicItems[i].base || 1e-6;
      const w = 1 / (base * base);
      let dot = 0;
      for (let k = 0; k < 3; k++) dot += lambda[k] * a[k];
      const x = base + dot / (2 * w);
      amounts[i] = x;
      const lo = dynamicItems[i].min != null ? dynamicItems[i].min : 0;
      const hi = dynamicItems[i].max != null ? dynamicItems[i].max : Infinity;
      if (x < lo - 1e-6 && (lo - x) > worstMargin) { worstIdx = i; worstMargin = lo - x; worstBound = lo; }
      if (x > hi + 1e-6 && (x - hi) > worstMargin) { worstIdx = i; worstMargin = x - hi; worstBound = hi; }
    }
    if (worstIdx === -1) break; // every free food is within bounds — solved
    free.delete(worstIdx);
    boundValue[worstIdx] = worstBound;
  }
  return amounts;
}

// Round a raw solved quantity to a realistic, clean number for display —
// nearest 25g for bulk staples, 10g for oats-scale portions, 5g for small
// toppings, whole units for countable foods — then re-apply the hard
// min/max bounds as a final safety net (rounding could otherwise nudge a
// value a step outside its bound).
// Round a raw solved quantity to a realistic, clean number for display —
// nearest 25g for bulk staples, 10g for oats-scale portions, 5g for small
// toppings, whole units for countable foods. Deliberately NOT floored to
// "at least one step": if the day's remaining macro budget genuinely has no
// room for a food (e.g. carbs are nearly used up elsewhere), the realistic
// outcome is that the food doesn't appear that day — not a token 25g serving
// forced in regardless of the math. An explicit `min` (Soya Chunks' 50g
// floor) is still enforced as a hard safety net after rounding.
function roundQuantity(item, rawAmount) {
  let amount;
  if (item.countable) {
    amount = Math.max(0, Math.round(rawAmount));
  } else {
    const step = item.round || 10;
    amount = Math.max(0, Math.round(rawAmount / step) * step);
  }
  if (item.min != null && amount > 0) amount = Math.max(amount, item.min);
  if (item.max != null) amount = Math.min(amount, item.max);
  return amount;
}

// ─── 4. PLAN ASSEMBLY ───────────────────────────────────────────────────────
// STEP 1 (done by the caller): BMR → TDEE → target calories/protein/carbs/fat.
// STEP 2: sum every FIXED food's real macros and subtract from the target.
// STEP 3: solve the dynamic foods' quantities for the whole day at once
//         (so a meal with no protein-rich food isn't asked to hit an
//         impossible protein number alone — the day's protein need is met
//         by whichever dynamic foods across the day actually contain it).
// STEP 4: round to realistic numbers and reassemble into meals.
function generateDietPlan(mealTemplate, targetMacros) {
  const flat = [];
  mealTemplate.forEach((meal, mi) => {
    meal.items.forEach((item, ii) => flat.push({ ...item, mi, ii }));
  });

  // STEP 2 — fixed foods, permanently locked, subtracted once.
  const fixedItems = flat.filter(it => it.role === 'fixed').map(it => ({
    ...it, macros: computeItemMacros(it.name, it.amount, !!it.countable),
  }));
  const fixedTotal = fixedItems.reduce((acc, it) => ({
    protein: acc.protein + it.macros.protein,
    carbs: acc.carbs + it.macros.carbs,
    fat: acc.fat + it.macros.fat,
  }), { protein: 0, carbs: 0, fat: 0 });

  const remaining = [
    Math.max(0, targetMacros.protein - fixedTotal.protein),
    Math.max(0, targetMacros.carbs - fixedTotal.carbs),
    Math.max(0, targetMacros.fat - fixedTotal.fat),
  ];

  // STEP 3 — exact constrained solve across all dynamic foods in the day.
  const dynamicItems = flat.filter(it => it.role === 'dynamic');
  const rawAmounts = solveDynamicQuantities(dynamicItems, remaining);

  // STEP 4 — round + reassemble.
  const finalDynamic = dynamicItems.map((it, i) => {
    const amount = roundQuantity(it, rawAmounts[i]);
    return { ...it, amount, macros: computeItemMacros(it.name, amount, !!it.countable) };
  });

  return mealTemplate.map((meal, mi) => {
    const items = meal.items
      .map((item, ii) => {
        if (item.role === 'fixed') return fixedItems.find(f => f.mi === mi && f.ii === ii);
        return finalDynamic.find(d => d.mi === mi && d.ii === ii);
      })
      .filter(it => it.amount > 0); // a food the day's budget had no room for simply isn't served
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

// ─── Validate that the meal breakdown adds up to the target ────────────────
// With the v3 solver, any drift here comes ONLY from realistic-number
// rounding (and, rarely, from a bound like Soya Chunks' 50g floor making an
// exact hit infeasible) — never from solver error, since the pre-rounding
// solve is an exact algebraic solution.
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
    Math.abs(diffs.protein) <= 3 &&
    Math.abs(diffs.carbs) <= 4 &&
    Math.abs(diffs.fat) <= 3 &&
    Math.abs(diffs.calories) <= 25;

  if (!valid) {
    console.warn('[Diet plan] Meal totals drifted from target beyond rounding tolerance:', diffs);
  }
  return { valid, sum, diffs };
}

// ─── Optional bonus meal(s) — fixed reference amounts, never scaled, and
// deliberately excluded from the target totals above.
const OPTIONAL_MEALS = {
  muscle_gain: {
    veg: [
      { id: 'optional1', name: 'Optional (If You Need More Calories)', time: 'Anytime', icon: '➕',
        items: [
          { name: 'Oats', unit: 'g', amount: 40 },
          { name: 'Milk', unit: 'ml', amount: 250 },
          { name: 'Mixed Seeds', unit: 'g', amount: 15 },
        ] },
    ],
  },
};
OPTIONAL_MEALS.muscle_gain.nonveg = OPTIONAL_MEALS.muscle_gain.veg;

function resolveOptionalMeals(goal, dietType) {
  const meals = (OPTIONAL_MEALS[goal] && OPTIONAL_MEALS[goal][dietType]) || [];
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
    // which would go stale the moment MEAL_TEMPLATES is ever updated.
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
      const { weight, height, age, gender, activity, goal, dietType } = formData;
      const diet = dietType || 'nonveg';
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

      // 3+4+5. Pick the right meal template for this goal + diet preference,
      // then solve real ingredient quantities that hit the day's targets.
      const mealTemplate = getMealTemplate(goal, diet);
      const scaledMeals = generateDietPlan(mealTemplate, targetMacros);

      // 6. Validate: sum of all meals should equal the target within tolerance.
      const { sum } = validateDietPlan(scaledMeals, targetMacros);

      // Optional bonus meal(s) — shown separately, never counted in the totals above.
      const optionalMeals = resolveOptionalMeals(goal, diet);

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