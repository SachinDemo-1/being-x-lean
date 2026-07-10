// ============================================================================
// DIET ENGINE — v2
// ----------------------------------------------------------------------------
// A complete rewrite of the meal-generation math.
//
// OLD APPROACH (removed): pick one "base" 2700kcal meal plan and multiply
// every ingredient by (targetCalories / 2700). This produced ugly quantities
// (83g oats, 2.7 slices of bread) and — worse — scaled foods that should
// never move (Paneer, Whey, Milk, Curd, Salad, Dal/Sabzi).
//
// NEW APPROACH:
//   STEP 1  Calculate BMR → TDEE → target Calories/Protein/Carbs/Fat.
//   STEP 2  Build the meal template. Some ingredients are FIXED (constant,
//           real-world serving sizes that never change). Sum up exactly how
//           many calories/protein/carbs/fat those fixed foods contribute.
//   STEP 3  Subtract the fixed contribution from the targets → whatever is
//           left over is the "remaining macro budget" that the DYNAMIC foods
//           (oats, rice, roti, chicken, etc.) are responsible for filling.
//   STEP 4  Each dynamic food is tagged with the macro it is primarily
//           responsible for (protein / carbs / fat) and a share (weight) of
//           that day's remaining budget for that macro. Its quantity is
//           solved directly from that share — not scaled from a base plan.
//   STEP 5  Round every quantity to a realistic, human portion size (nearest
//           5g/10g/25g, whole slices, whole pieces) and clamp to sane
//           min/max bounds.
//   STEP 6  Recalculate every ingredient's real nutrition from its final
//           quantity, sum every meal, sum the whole day, and compare against
//           target. If any macro is outside tolerance, nudge ONLY the single
//           dynamic food most responsible for that macro (one bounded
//           correction per macro — not an iterative rescale loop) and
//           recalculate again.
//
// Nothing here ever touches UI, PDF, or CSS. This module is pure data/math
// and returns plain objects in the exact shape the existing Diet.js views
// already expect: { meals, macros, targetCalories, tdee, bmr }.
// ============================================================================

// ─────────────────────────────────────────────────────────────────────────
// FOOD DATABASE
// Every food's macros are defined for a fixed reference amount (`per`,
// expressed in the same `unit`). Actual nutrition for any quantity is
// derived as (macro / per) * quantity — never hardcoded per meal.
//
// `fixed: true`   → this food's quantity is constant. It NEVER scales.
// `role`          → for dynamic foods, which macro this food is solved from.
// `weight`        → this food's share (0–1) of the day's remaining budget
//                    for its role. All dynamic foods sharing a role must
//                    have weights that sum to 1.0 across the whole template.
// `step/min/max`  → rounding increment and realistic bounds for that food.
// ─────────────────────────────────────────────────────────────────────────
export const FOODS = {
  // ── Fixed foods (never change quantity, any goal, any diet type) ────────
  paneer:      { name: 'Paneer',               unit: 'g',     per: 100, calories: 265, protein: 18,  carbs: 6,  fat: 20,  fixed: true, amount: 100 },
  whey:        { name: 'Whey Protein',         unit: 'scoop', per: 1,   calories: 120, protein: 24,  carbs: 3,  fat: 2,   fixed: true, amount: 1 },
  milk:        { name: 'Milk',                 unit: 'ml',    per: 250, calories: 150, protein: 8,   carbs: 12, fat: 8,   fixed: true, amount: 250 },
  salad:       { name: 'Salad',                unit: 'plate', per: 1,   calories: 50,  protein: 2,   carbs: 10, fat: 0.5, fixed: true, amount: 1 },
  curd:        { name: 'Curd',                 unit: 'bowl',  per: 1,   calories: 120, protein: 7,   carbs: 9,  fat: 6,   fixed: true, amount: 1 },
  dalSabzi:    { name: 'Dal / Rajma + Sabzi',   unit: 'bowl',  per: 1,   calories: 220, protein: 10,  carbs: 30, fat: 7,   fixed: true, amount: 1 },
  mixedVeg:    { name: 'Mixed Vegetables',      unit: 'bowl',  per: 1,   calories: 100, protein: 3,   carbs: 12, fat: 4,   fixed: true, amount: 1 },
  boiledPotato:{ name: 'Boiled Potato',         unit: 'pc',    per: 1,   calories: 118, protein: 2.5, carbs: 27, fat: 0.15,fixed: true, amount: 2 },

  // ── Dynamic foods (quantities are solved from remaining macro budget) ───
  oats:         { name: 'Oats',            unit: 'g',     per: 100, calories: 380, protein: 13.5, carbs: 68, fat: 6.5,  role: 'carbs',   step: 5,  min: 20,  max: 100 },
  banana:       { name: 'Banana',          unit: 'pc',    per: 1,   calories: 105, protein: 1.3,  carbs: 27, fat: 0.4,  role: 'carbs',   step: 1,  min: 1,   max: 3,   countable: true },
  almonds:      { name: 'Almonds (Badam)', unit: 'g',     per: 10,  calories: 58,  protein: 2.1,  carbs: 2.2, fat: 5,   role: 'fat',     step: 5,  min: 10,  max: 40 },
  brownBread:   { name: 'Brown Bread',     unit: 'slice', per: 1,   calories: 75,  protein: 3,    carbs: 13, fat: 1,    role: 'carbs',   step: 1,  min: 2,   max: 6,   countable: true },
  peanutButter: { name: 'Peanut Butter',   unit: 'g',     per: 10,  calories: 60,  protein: 2.5,  carbs: 2,  fat: 5,    role: 'fat',     step: 5,  min: 10,  max: 40 },
  rice:         { name: 'Rice (cooked)',   unit: 'g',     per: 100, calories: 130, protein: 2.7,  carbs: 28, fat: 0.3,  role: 'carbs',   step: 25, min: 100, max: 400 },
  roti:         { name: 'Roti',            unit: 'pc',    per: 1,   calories: 90,  protein: 3,    carbs: 18, fat: 1.5,  role: 'carbs',   step: 1,  min: 2,   max: 6,   countable: true },
  soyaChunks:   { name: 'Soya Chunks',     unit: 'g',     per: 10,  calories: 34.5,protein: 5.2,  carbs: 2.9, fat: 0.05,role: 'protein', step: 5,  min: 15,  max: 100 },
  mixedSeeds:   { name: 'Mixed Seeds',     unit: 'g',     per: 10,  calories: 55,  protein: 2.5,  carbs: 3,  fat: 4.5,  role: 'fat',     step: 5,  min: 10,  max: 30 },
  chicken:      { name: 'Chicken (cooked)',unit: 'g',     per: 100, calories: 165, protein: 31,   carbs: 0,  fat: 3.6,  role: 'protein', step: 25, min: 75,  max: 300 },
  eggs:         { name: 'Eggs (boiled)',   unit: 'pc',    per: 1,   calories: 78,  protein: 6.3,  carbs: 0.6,fat: 5.3,  role: 'protein', step: 1,  min: 1,   max: 5,   countable: true },
};

// ─────────────────────────────────────────────────────────────────────────
// MEAL TEMPLATE
// Same structure for BOTH goals — only the *quantities* of dynamic foods
// differ, because they're solved from the (different) remaining macro
// budget for each goal. `weight` values for foods sharing a role always
// sum to 1.0 across the whole day.
// ─────────────────────────────────────────────────────────────────────────
function buildTemplate(dietType) {
  const eveningProtein = dietType === 'veg'
    ? { food: 'soyaChunks', role: 'protein', weight: 1.0 }
    : { food: 'chicken', role: 'protein', weight: 1.0 };

  return [
    {
      id: 'preworkout', name: 'Pre-Workout', time: '6:30 AM', icon: '🌅',
      items: [
        { food: 'milk', fixed: true },
        { food: 'oats', role: 'carbs', weight: 0.12 },
        { food: 'banana', role: 'carbs', weight: 0.05 },
        { food: 'almonds', role: 'fat', weight: 0.30 },
      ],
    },
    {
      id: 'postworkout', name: 'Post-Workout', time: '8:30 AM', icon: '💪',
      items: [
        { food: 'whey', fixed: true },
        { food: 'boiledPotato', fixed: true },
        { food: 'brownBread', role: 'carbs', weight: 0.13 },
        { food: 'peanutButter', role: 'fat', weight: 0.45 },
      ],
    },
    {
      id: 'lunch', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { food: 'rice', role: 'carbs', weight: 0.45 },
        { food: 'dalSabzi', fixed: true },
        { food: 'salad', fixed: true },
      ],
    },
    {
      id: 'evening', name: 'Evening', time: '4:30 PM', icon: '🥣',
      items: [
        eveningProtein,
        { food: 'curd', fixed: true },
      ],
    },
    {
      id: 'dinner', name: 'Dinner', time: '8:30 PM', icon: '🍲',
      items: [
        { food: 'paneer', fixed: true },
        { food: 'roti', role: 'carbs', weight: 0.15 },
        { food: 'mixedVeg', fixed: true },
        { food: 'salad', fixed: true },
      ],
    },
    {
      id: 'optional', name: 'Optional', time: '10:00 PM', icon: '🌙',
      items: [
        { food: 'oats', role: 'carbs', weight: 0.10 },
        { food: 'milk', fixed: true },
        { food: 'mixedSeeds', role: 'fat', weight: 0.25 },
      ],
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 1 — BMR / TDEE / Targets
// ─────────────────────────────────────────────────────────────────────────
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_SETTINGS = {
  muscle_gain: { calorieAdjust: 300, proteinPerKg: 2.0, fatPercent: 0.25 },
  fat_loss:    { calorieAdjust: -400, proteinPerKg: 2.0, fatPercent: 0.28 },
};

export function calculateBMR(gender, weightKg, heightCm, age) {
  // Mifflin-St Jeor equation
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr, activity) {
  return bmr * (ACTIVITY_MULTIPLIERS[activity] || ACTIVITY_MULTIPLIERS.moderate);
}

export function calculateTargets({ weight, height, age, gender, activity, goal }) {
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);
  const settings = GOAL_SETTINGS[goal] || GOAL_SETTINGS.muscle_gain;

  const bmr = calculateBMR(gender, w, h, a);
  const tdee = calculateTDEE(bmr, activity);
  const targetCalories = tdee + settings.calorieAdjust;

  const protein = w * settings.proteinPerKg;
  const fat = (targetCalories * settings.fatPercent) / 9;
  const carbs = (targetCalories - protein * 4 - fat * 9) / 4;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    targetProtein: Math.round(protein),
    targetCarbs: Math.round(carbs),
    targetFat: Math.round(fat),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers: nutrition math, rounding
// ─────────────────────────────────────────────────────────────────────────
function nutritionFor(foodKey, quantity) {
  const f = FOODS[foodKey];
  const ratio = quantity / f.per;
  return {
    calories: f.calories * ratio,
    protein: f.protein * ratio,
    carbs: f.carbs * ratio,
    fat: f.fat * ratio,
  };
}

// How much of `macro` does one unit (1g / 1ml / 1pc) of this food provide?
function macroPerUnit(foodKey, macro) {
  const f = FOODS[foodKey];
  return f[macro] / f.per;
}

function roundToStep(value, step, min, max) {
  let rounded = Math.round(value / step) * step;
  if (min != null) rounded = Math.max(min, rounded);
  if (max != null) rounded = Math.min(max, rounded);
  // avoid floating point artifacts like 59.999999
  return Math.round(rounded * 100) / 100;
}

// Solve a dynamic food's raw quantity from its share of the remaining
// macro budget, then round to a realistic portion size.
function solveQuantity(foodKey, allocatedMacroAmount) {
  const f = FOODS[foodKey];
  const perUnit = macroPerUnit(foodKey, f.role);
  const rawQuantity = perUnit > 0 ? allocatedMacroAmount / perUnit : f.min;
  return roundToStep(rawQuantity, f.step, f.min, f.max);
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 2 & 3 — Fixed contribution, remaining budget
// ─────────────────────────────────────────────────────────────────────────
function sumFixedContribution(template) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  template.forEach(meal => {
    meal.items.forEach(item => {
      if (item.fixed) {
        const f = FOODS[item.food];
        const n = nutritionFor(item.food, f.amount);
        totals.calories += n.calories;
        totals.protein += n.protein;
        totals.carbs += n.carbs;
        totals.fat += n.fat;
      }
    });
  });
  return totals;
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 4 & 5 — Allocate dynamic quantities, round to realistic portions
//
// This is done in two passes rather than one:
//   PASS 1: solve every "carbs" and "fat" role food directly from its share
//           of the remaining carb/fat budget (unchanged math).
//   PASS 2: solve "protein" role foods from the TRUE leftover protein need
//           — i.e. target protein minus what's ALREADY covered by fixed
//           foods plus whatever protein the carb/fat foods happen to bring
//           along as a side effect (rice, oats, bread, potato, almonds,
//           peanut butter all carry real protein too).
//
// Solving protein last, from the true residual, is what keeps a food like
// Soya Chunks / Chicken / Eggs at a realistic, stable serving instead of
// swinging wildly — if it were solved from the full remaining protein
// budget up front (ignoring the protein carbs/fat foods already supply),
// it would overshoot, get slashed back down by the validation pass, and
// often bottom out at its minimum. Solving it last removes that double-count.
// ─────────────────────────────────────────────────────────────────────────
function allocateDynamicQuantities(template, remaining) {
  const quantities = {};

  // Pass 1 — carbs & fat role foods, solved directly from their budgets.
  template.forEach(meal => {
    meal.items.forEach(item => {
      if (item.fixed || item.role === 'protein') return;
      const budget = remaining[item.role] * item.weight;
      quantities[`${meal.id}:${item.food}`] = solveQuantity(item.food, budget);
    });
  });

  // How much protein do the pass-1 foods contribute as a side effect?
  let proteinFromPass1 = 0;
  template.forEach(meal => {
    meal.items.forEach(item => {
      if (item.fixed || item.role === 'protein') return;
      const key = `${meal.id}:${item.food}`;
      proteinFromPass1 += nutritionFor(item.food, quantities[key]).protein;
    });
  });

  // Pass 2 — protein role foods, solved from the TRUE leftover need.
  template.forEach(meal => {
    meal.items.forEach(item => {
      if (item.fixed || item.role !== 'protein') return;
      const budget = Math.max(0, remaining.protein - proteinFromPass1) * item.weight;
      quantities[`${meal.id}:${item.food}`] = solveQuantity(item.food, budget);
    });
  });

  return quantities;
}

// ─────────────────────────────────────────────────────────────────────────
// Build the final resolved meal objects from a quantities map
// ─────────────────────────────────────────────────────────────────────────
function buildMeals(template, quantities) {
  return template.map(meal => {
    const items = meal.items.map(item => {
      const f = FOODS[item.food];
      const amount = item.fixed ? f.amount : quantities[`${meal.id}:${item.food}`];
      const n = nutritionFor(item.food, amount);
      return {
        name: f.name,
        amount: f.countable ? Math.round(amount) : Math.round(amount * 100) / 100,
        unit: f.unit,
        calories: Math.round(n.calories),
        protein: Math.round(n.protein * 10) / 10,
        carbs: Math.round(n.carbs * 10) / 10,
        fat: Math.round(n.fat * 10) / 10,
        foodKey: item.food,
        role: item.role || null,
        fixed: !!item.fixed,
      };
    });
    const macros = items.reduce((acc, it) => ({
      calories: acc.calories + it.calories,
      protein: acc.protein + it.protein,
      carbs: acc.carbs + it.carbs,
      fat: acc.fat + it.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      id: meal.id,
      name: meal.name,
      time: meal.time,
      icon: meal.icon,
      items,
      macros: {
        calories: Math.round(macros.calories),
        protein: Math.round(macros.protein),
        carbs: Math.round(macros.carbs),
        fat: Math.round(macros.fat),
      },
    };
  });
}

function sumDaily(meals) {
  return meals.reduce((acc, m) => ({
    calories: acc.calories + m.macros.calories,
    protein: acc.protein + m.macros.protein,
    carbs: acc.carbs + m.macros.carbs,
    fat: acc.fat + m.macros.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 6 — Validation & exact rebalance
//
// Why a linear solve instead of "fix protein, then fix carbs, then fix fat"?
// Every food contributes to more than one macro (rice has some protein,
// peanut butter has some carbs, soya has some fat, etc). Correcting protein
// by adjusting a protein-food changes carbs and fat too, so fixing macros
// one at a time in sequence makes each subsequent fix undo part of the
// previous one — it never actually converges within tolerance.
//
// Instead: pick exactly one dynamic food that is the primary carrier of
// each macro (protein / carbs / fat), and solve the 3×3 system
//
//   [ p1 p2 p3 ]   [ Δfood1 ]   [ diffProtein ]
//   [ c1 c2 c3 ] · [ Δfood2 ] = [ diffCarbs   ]
//   [ f1 f2 f3 ]   [ Δfood3 ]   [ diffFat     ]
//
// where column i is food i's per-unit (protein, carbs, fat). This gives the
// exact quantity change needed for each of the three foods to close all
// three gaps SIMULTANEOUSLY, in one deterministic calculation — not a loop.
// Only these three dynamic foods are touched; everything else (fixed foods,
// and the smaller dynamic sides like oats/banana/almonds/roti) is untouched.
// ─────────────────────────────────────────────────────────────────────────
const TOLERANCE = { calories: 40, protein: 5, carbs: 8, fat: 5 };

function primaryFoodForRole(template, role) {
  let best = null;
  template.forEach(meal => {
    meal.items.forEach(item => {
      if (!item.fixed && item.role === role) {
        if (!best || item.weight > best.weight) {
          best = { mealId: meal.id, food: item.food, weight: item.weight };
        }
      }
    });
  });
  return best;
}

// Solve a 3x3 linear system A·x = b via Cramer's rule.
function solve3x3(A, b) {
  const det = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const D = det(A);
  if (Math.abs(D) < 1e-9) return null; // degenerate — cannot solve, caller should skip

  const replaceCol = (m, col, vec) =>
    m.map((row, r) => row.map((v, c) => (c === col ? vec[r] : v)));

  const Dx = det(replaceCol(A, 0, b));
  const Dy = det(replaceCol(A, 1, b));
  const Dz = det(replaceCol(A, 2, b));

  return [Dx / D, Dy / D, Dz / D];
}

function rebalance(template, quantities, target) {
  let meals = buildMeals(template, quantities);
  let actual = sumDaily(meals);

  const proteinFood = primaryFoodForRole(template, 'protein');
  const carbFood = primaryFoodForRole(template, 'carbs');
  const fatFood = primaryFoodForRole(template, 'fat');

  const isWithinTolerance = (a) =>
    Math.abs(target.targetProtein - a.protein) <= TOLERANCE.protein &&
    Math.abs(target.targetCarbs - a.carbs) <= TOLERANCE.carbs &&
    Math.abs(target.targetFat - a.fat) <= TOLERANCE.fat;

  if (proteinFood && carbFood && fatFood) {
    const solvers = [proteinFood, carbFood, fatFood];
    const A = [
      solvers.map(s => macroPerUnit(s.food, 'protein')),
      solvers.map(s => macroPerUnit(s.food, 'carbs')),
      solvers.map(s => macroPerUnit(s.food, 'fat')),
    ];

    // Up to 2 rounds: if a solver food hits its min/max clamp on round 1,
    // round 2 re-solves against the new (post-clamp) actual, giving the
    // still-free foods a chance to close whatever gap remains.
    for (let round = 0; round < 2 && !isWithinTolerance(actual); round++) {
      const b = [
        target.targetProtein - actual.protein,
        target.targetCarbs - actual.carbs,
        target.targetFat - actual.fat,
      ];
      const deltas = solve3x3(A, b);
      if (!deltas) break;

      solvers.forEach((s, i) => {
        const key = `${s.mealId}:${s.food}`;
        const f = FOODS[s.food];
        quantities[key] = roundToStep(quantities[key] + deltas[i], f.step, f.min, f.max);
      });
      meals = buildMeals(template, quantities);
      actual = sumDaily(meals);
    }
  }

  // Rounding to realistic portions can leave a small residual. If calories
  // alone are still outside tolerance, nudge the carb solver food by the
  // small remaining amount (rounding error only — typically a few grams).
  const calDiff = target.targetCalories - actual.calories;
  if (Math.abs(calDiff) > TOLERANCE.calories && carbFood) {
    const key = `${carbFood.mealId}:${carbFood.food}`;
    const f = FOODS[carbFood.food];
    const deltaUnits = calDiff / (f.calories / f.per);
    quantities[key] = roundToStep(quantities[key] + deltaUnits, f.step, f.min, f.max);
    meals = buildMeals(template, quantities);
    actual = sumDaily(meals);
  }

  return { meals, actual };
}

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC API — generateMealPlan
// ─────────────────────────────────────────────────────────────────────────
function minimumPossibleCalories(template) {
  const fixed = sumFixedContribution(template).calories;
  let dynamicFloor = 0;
  template.forEach(meal => meal.items.forEach(item => {
    if (!item.fixed) dynamicFloor += nutritionFor(item.food, FOODS[item.food].min).calories;
  }));
  return fixed + dynamicFloor;
}

export function generateMealPlan(userInfo) {
  const target = calculateTargets(userInfo);
  const dietType = userInfo.dietType === 'veg' ? 'veg' : 'nonveg';
  let template = buildTemplate(dietType);

  // The "Optional" meal is, by design, the one meal that can be dropped
  // entirely — every other meal contains at least one of the always-fixed
  // foods (Paneer, Whey, Milk, Salad, Curd, Dal/Sabzi, Boiled Potato) which
  // must never be removed. If even the realistic minimum quantities of
  // every food don't fit under a low target (common for smaller/older/
  // less active users on a fat-loss deficit), drop Optional first rather
  // than forcing unrealistic (too-small) portions elsewhere.
  if (target.targetCalories < minimumPossibleCalories(template)) {
    template = template.filter(meal => meal.id !== 'optional');
  }

  const fixedTotals = sumFixedContribution(template);

  const remaining = {
    calories: Math.max(0, target.targetCalories - fixedTotals.calories),
    protein: Math.max(0, target.targetProtein - fixedTotals.protein),
    carbs: Math.max(0, target.targetCarbs - fixedTotals.carbs),
    fat: Math.max(0, target.targetFat - fixedTotals.fat),
  };

  const quantities = allocateDynamicQuantities(template, remaining);
  const { meals, actual } = rebalance(template, quantities, target);

  return {
    meals,
    macros: { protein: actual.protein, carbs: actual.carbs, fat: actual.fat },
    targetCalories: actual.calories,
    tdee: target.tdee,
    bmr: target.bmr,
    // raw computed targets, kept for anyone who wants the "ideal" numbers
    // vs. the "actual, sum-of-real-ingredients" numbers above
    computedTarget: {
      calories: target.targetCalories,
      protein: target.targetProtein,
      carbs: target.targetCarbs,
      fat: target.targetFat,
    },
  };
}