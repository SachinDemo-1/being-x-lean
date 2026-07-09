// ═══════════════════════════════════════════════════════════════════════════
// DIET CALCULATION ENGINE v3 — COMPLETE REWRITE
//
// ARCHITECTURE:
//   • CLEAN SEPARATION: Fixed foods and dynamic foods are handled separately
//   • MATHEMATICAL PRECISION: Multi-pass optimization with constraints
//   • REALISTIC PORTIONS: Intelligent rounding with sensible defaults
//   • SELF-VALIDATING: Automatic correction within tolerance
//   • MODULAR: Each function has a single, clear responsibility
// ═══════════════════════════════════════════════════════════════════════════

// ─── NUTRITION DATABASE ────────────────────────────────────────────────────
// All nutrition data is per 100g (or per unit for countable items)
// Calories are ALWAYS calculated from macros: (P*4 + C*4 + F*9)

const NUTRITION = {
  // DYNAMIC FOODS (scale with user)
  'Oats': { per100: { p: 16, c: 66, f: 7 } },
  'Rice': { per100: { p: 2.7, c: 28, f: 0.3 } },
  'Fried Rice': { per100: { p: 3.5, c: 24, f: 6 } },
  'Roti': { perUnit: { p: 3, c: 18, f: 2.5 } },
  'Brown Bread': { perUnit: { p: 2.3, c: 11, f: 0.8 } },
  'Boiled Potato': { per100: { p: 2, c: 17, f: 0.1 } },
  'Banana': { perUnit: { p: 1.3, c: 27, f: 0.3 } },
  'Almonds': { per100: { p: 21, c: 22, f: 50 } },
  'Peanut Butter': { per100: { p: 25, c: 20, f: 50 } },
  'Soya Chunks': { per100: { p: 52, c: 33, f: 0.5 } },
  'Mixed Seeds': { per100: { p: 20, c: 20, f: 45 } },
  'Upma / Poha': { per100: { p: 3, c: 25, f: 4 } },
  'Roasted Chana / Sprouts Moong Dal': { per100: { p: 15, c: 45, f: 3 } },
  'Chicken': { per100: { p: 31, c: 0, f: 3.6 } },
  'Eggs': { perUnit: { p: 6, c: 0.6, f: 5 } },
  
  // FIXED FOODS (never scale)
  'Paneer': { per100: { p: 18, c: 1.2, f: 20 } },
  'Whey Protein': { perUnit: { p: 24, c: 3, f: 1.5 } },
  'Milk': { per100: { p: 3.2, c: 4.8, f: 3 } },
  'Salad': { perUnit: { p: 2, c: 6, f: 0.3 } },
  'Curd': { perUnit: { p: 7, c: 8, f: 8 } },
  'Dal/Rajma + Sabzi': { perUnit: { p: 9, c: 30, f: 5 } },
  'Mixed Vegetables': { perUnit: { p: 3, c: 10, f: 4 } },
};

// ─── FOOD CONFIGURATION ──────────────────────────────────────────────────
// Defines how each dynamic food should be rounded and constrained

const FOOD_CONFIG = {
  'Oats': { roundTo: 10, min: 20, max: 120 },
  'Rice': { roundTo: 25, min: 100, max: 400 },
  'Fried Rice': { roundTo: 25, min: 100, max: 350 },
  'Roti': { roundTo: 1, min: 2, max: 6, countable: true },
  'Brown Bread': { roundTo: 1, min: 2, max: 6, countable: true },
  'Boiled Potato': { roundTo: 25, min: 100, max: 350 },
  'Banana': { roundTo: 1, min: 0, max: 3, countable: true },
  'Almonds': { roundTo: 5, min: 5, max: 40 },
  'Peanut Butter': { roundTo: 5, min: 5, max: 40 },
  'Soya Chunks': { roundTo: 5, min: 30, max: 80 },
  'Mixed Seeds': { roundTo: 5, min: 5, max: 30 },
  'Upma / Poha': { roundTo: 25, min: 80, max: 300 },
  'Roasted Chana / Sprouts Moong Dal': { roundTo: 10, min: 20, max: 80 },
  'Chicken': { roundTo: 25, min: 100, max: 300 },
  'Eggs': { roundTo: 1, min: 2, max: 6, countable: true },
};

// ─── BASE MEAL PLANS ─────────────────────────────────────────────────────
// Each meal specifies which foods it contains and their role

const BASE_MEALS = {
  muscle_gain: [
    { id: 'meal1', name: 'Pre-Workout', time: '7:00 AM', icon: '🌅',
      items: [
        { name: 'Oats', role: 'dynamic', unit: 'g', base: 60 },
        { name: 'Milk', role: 'fixed', unit: 'ml', amount: 250 },
        { name: 'Banana', role: 'dynamic', unit: 'pc', base: 1, countable: true },
        { name: 'Almonds', role: 'dynamic', unit: 'g', base: 20 },
      ] },
    { id: 'meal2', name: 'Post-Workout', time: '10:00 AM', icon: '💪',
      items: [
        { name: 'Whey Protein', role: 'fixed', unit: 'scoop', amount: 1, countable: true },
        { name: 'Brown Bread', role: 'dynamic', unit: 'slice', base: 4, countable: true },
        { name: 'Peanut Butter', role: 'dynamic', unit: 'g', base: 20 },
        { name: 'Boiled Potato', role: 'dynamic', unit: 'g', base: 250 },
      ] },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice', role: 'dynamic', unit: 'g', base: 250 },
        { name: 'Dal/Rajma + Sabzi', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Soya Chunks', role: 'dynamic', unit: 'g', base: 50 },
        { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
      ] },
    { id: 'meal5', name: 'Dinner', time: '9:00 PM', icon: '🍲',
      items: [
        { name: 'Paneer', role: 'fixed', unit: 'g', amount: 100 },
        { name: 'Roti', role: 'dynamic', unit: 'pc', base: 3, countable: true },
        { name: 'Mixed Vegetables', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
  ],
  fat_loss: [
    { id: 'meal1', name: 'Pre-Workout', time: '6:30 AM', icon: '🌅',
      items: [
        { name: 'Upma / Poha', role: 'dynamic', unit: 'g', base: 150 },
        { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
      ] },
    { id: 'meal2', name: 'Post-Workout', time: '8:00 AM', icon: '🥤',
      items: [
        { name: 'Oats', role: 'dynamic', unit: 'g', base: 40 },
        { name: 'Whey Protein', role: 'fixed', unit: 'scoop', amount: 1, countable: true },
        { name: 'Milk', role: 'fixed', unit: 'ml', amount: 250 },
        { name: 'Banana', role: 'dynamic', unit: 'pc', base: 1, countable: true },
      ] },
    { id: 'meal3', name: 'Lunch', time: '1:00 PM', icon: '🍛',
      items: [
        { name: 'Rice', role: 'dynamic', unit: 'g', base: 200 },
        { name: 'Dal/Rajma + Sabzi', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Soya Chunks', role: 'dynamic', unit: 'g', base: 30 },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
    { id: 'meal4', name: 'Evening', time: '5:00 PM', icon: '🥜',
      items: [
        { name: 'Roasted Chana / Sprouts Moong Dal', role: 'dynamic', unit: 'g', base: 40 },
        { name: 'Curd', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
      ] },
    { id: 'meal5', name: 'Dinner', time: '8:00 PM', icon: '🥣',
      items: [
        { name: 'Paneer', role: 'fixed', unit: 'g', amount: 100 },
        { name: 'Fried Rice', role: 'dynamic', unit: 'g', base: 150 },
        { name: 'Mixed Vegetables', role: 'fixed', unit: 'bowl', amount: 1, countable: true },
        { name: 'Salad', role: 'fixed', unit: 'plate', amount: 1, countable: true },
      ] },
  ],
};

// ─── OPTIONAL BONUS MEALS ────────────────────────────────────────────────
// These are shown separately and NOT counted toward daily targets

const OPTIONAL_MEALS = {
  muscle_gain: [
    { id: 'optional1', name: 'Optional (If You Need More Calories)', time: 'Anytime', icon: '➕',
      items: [
        { name: 'Oats', unit: 'g', amount: 40 },
        { name: 'Milk', unit: 'ml', amount: 250 },
        { name: 'Mixed Seeds', unit: 'g', amount: 15 },
      ] },
  ],
  fat_loss: [],
};

// ─── CORE UTILITY FUNCTIONS ──────────────────────────────────────────────

// Calculate macros for a given food and quantity
function calculateMacros(name, quantity, isCountable = false) {
  const entry = NUTRITION[name];
  if (!entry) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
  
  const ref = isCountable ? entry.perUnit : entry.per100;
  const factor = isCountable ? quantity : quantity / 100;
  
  const protein = ref.p * factor;
  const carbs = ref.c * factor;
  const fat = ref.f * factor;
  const calories = protein * 4 + carbs * 4 + fat * 9;
  
  return { protein, carbs, fat, calories };
}

// Round to nearest step (for gram-based foods)
function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

// Clamp value between min and max
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Get food configuration with defaults
function getFoodConfig(name) {
  return FOOD_CONFIG[name] || { roundTo: 10, min: 0, max: 9999, countable: false };
}

// Check if a food is countable (units vs grams)
function isCountableFood(name) {
  const config = getFoodConfig(name);
  return config.countable || false;
}

// ─── STEP 1: CALCULATE TARGET MACROS ────────────────────────────────────

function calculateTargets(userData) {
  const { weight, height, age, gender, activity, goal } = userData;
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age);
  
  // BMR using Mifflin-St Jeor
  const bmr = gender === 'male' 
    ? (10 * w + 6.25 * h - 5 * a + 5)
    : (10 * w + 6.25 * h - 5 * a - 161);
  
  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };
  
  const tdee = Math.round(bmr * (activityMultipliers[activity] || 1.55));
  
  // Calorie target based on goal
  const calorieTarget = goal === 'fat_loss' 
    ? tdee - 500  // Fat loss deficit
    : tdee + 400; // Muscle gain surplus
  
  // Protein: 2g per kg bodyweight (both goals)
  const proteinTarget = Math.round(w * 2);
  
  // Fat: 0.8-1g per kg bodyweight
  const fatTarget = Math.round(w * 0.9);
  
  // Carbs: fill remaining calories
  const remainingCalories = calorieTarget - (proteinTarget * 4) - (fatTarget * 9);
  const carbTarget = Math.max(50, Math.round(remainingCalories / 4));
  
  return {
    calories: Math.round(calorieTarget),
    protein: proteinTarget,
    carbs: carbTarget,
    fat: fatTarget,
    tdee
  };
}

// ─── STEP 2: CALCULATE FIXED FOOD CONTRIBUTIONS ────────────────────────

function calculateFixedFoods(meals) {
  const fixedItems = [];
  let total = { protein: 0, carbs: 0, fat: 0, calories: 0 };
  
  meals.forEach((meal, mealIndex) => {
    meal.items.forEach((item, itemIndex) => {
      if (item.role === 'fixed') {
        const isCountable = !!item.countable || isCountableFood(item.name);
        const macros = calculateMacros(item.name, item.amount, isCountable);
        
        fixedItems.push({
          ...item,
          mealIndex,
          itemIndex,
          macros
        });
        
        total.protein += macros.protein;
        total.carbs += macros.carbs;
        total.fat += macros.fat;
        total.calories += macros.calories;
      }
    });
  });
  
  return { fixedItems, total };
}

// ─── STEP 3: DISTRIBUTE REMAINING MACROS TO DYNAMIC FOODS ─────────────

function distributeDynamicFoods(meals, remainingTargets) {
  // Collect all dynamic items with their base quantities
  const dynamicItems = [];
  meals.forEach((meal, mealIndex) => {
    meal.items.forEach((item, itemIndex) => {
      if (item.role === 'dynamic') {
        const isCountable = !!item.countable || isCountableFood(item.name);
        const baseMacros = calculateMacros(item.name, item.base, isCountable);
        const config = getFoodConfig(item.name);
        
        dynamicItems.push({
          ...item,
          mealIndex,
          itemIndex,
          isCountable,
          baseMacros,
          config,
          currentAmount: item.base,
          priority: calculateFoodPriority(item.name)
        });
      }
    });
  });
  
  if (dynamicItems.length === 0) return dynamicItems;
  
  // Calculate total base macros
  const baseTotal = dynamicItems.reduce((acc, item) => ({
    protein: acc.protein + item.baseMacros.protein,
    carbs: acc.carbs + item.baseMacros.carbs,
    fat: acc.fat + item.baseMacros.fat,
    calories: acc.calories + item.baseMacros.calories
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
  
  // Calculate initial scaling factors
  const scaleFactors = {
    protein: baseTotal.protein > 0 ? remainingTargets.protein / baseTotal.protein : 1,
    carbs: baseTotal.carbs > 0 ? remainingTargets.carbs / baseTotal.carbs : 1,
    fat: baseTotal.fat > 0 ? remainingTargets.fat / baseTotal.fat : 1
  };
  
  // Initial amounts based on macro-weighted scaling
  dynamicItems.forEach(item => {
    const totalMacro = item.baseMacros.protein + item.baseMacros.carbs + item.baseMacros.fat;
    if (totalMacro > 0) {
      const weightedScale = (
        (item.baseMacros.protein / totalMacro) * scaleFactors.protein +
        (item.baseMacros.carbs / totalMacro) * scaleFactors.carbs +
        (item.baseMacros.fat / totalMacro) * scaleFactors.fat
      );
      item.currentAmount = item.base * weightedScale;
    } else {
      item.currentAmount = item.base;
    }
  });
  
  // Multi-pass correction to hit targets
  for (let pass = 0; pass < 10; pass++) {
    let currentTotal = calculateDynamicTotal(dynamicItems);
    const gaps = {
      protein: remainingTargets.protein - currentTotal.protein,
      carbs: remainingTargets.carbs - currentTotal.carbs,
      fat: remainingTargets.fat - currentTotal.fat
    };
    
    // Check if we're within tolerance
    if (Math.abs(gaps.protein) < 0.5 && 
        Math.abs(gaps.carbs) < 0.5 && 
        Math.abs(gaps.fat) < 0.5) {
      break;
    }
    
    // Adjust each macro
    ['protein', 'carbs', 'fat'].forEach(macro => {
      if (Math.abs(gaps[macro]) < 0.5) return;
      
      // Find the best item to adjust
      const candidate = findBestAdjustmentItem(dynamicItems, macro, gaps[macro] > 0);
      if (!candidate) return;
      
      // Calculate adjustment
      const perUnitMacro = candidate.baseMacros[macro] / candidate.base;
      if (perUnitMacro <= 0) return;
      
      const adjustment = gaps[macro] / (perUnitMacro);
      const newAmount = candidate.currentAmount + adjustment;
      
      // Apply constraints
      const config = candidate.config;
      candidate.currentAmount = clamp(newAmount, config.min || 0, config.max || 9999);
    });
  }
  
  // Round all amounts
  dynamicItems.forEach(item => {
    const config = item.config;
    if (item.isCountable) {
      item.currentAmount = Math.max(1, Math.round(item.currentAmount));
    } else {
      const step = config.roundTo || 10;
      item.currentAmount = roundToStep(item.currentAmount, step);
      item.currentAmount = clamp(item.currentAmount, config.min || 0, config.max || 9999);
    }
  });
  
  return dynamicItems;
}

// Calculate total macros from dynamic items
function calculateDynamicTotal(items) {
  return items.reduce((acc, item) => {
    const macros = calculateMacros(item.name, item.currentAmount, item.isCountable);
    return {
      protein: acc.protein + macros.protein,
      carbs: acc.carbs + macros.carbs,
      fat: acc.fat + macros.fat,
      calories: acc.calories + macros.calories
    };
  }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
}

// Find best item to adjust for a specific macro
function findBestAdjustmentItem(items, macro, increase) {
  return items
    .filter(item => {
      const perUnit = item.baseMacros[macro] / item.base;
      return perUnit > 0;
    })
    .sort((a, b) => {
      const aPerUnit = a.baseMacros[macro] / a.base;
      const bPerUnit = b.baseMacros[macro] / b.base;
      
      // Prefer items with higher macro density
      if (increase) {
        return bPerUnit - aPerUnit;
      } else {
        return aPerUnit - bPerUnit;
      }
    })[0] || null;
}

// Calculate priority for food (higher = more important for protein)
function calculateFoodPriority(name) {
  const priorities = {
    'Soya Chunks': 5,
    'Chicken': 5,
    'Eggs': 4,
    'Paneer': 4,
    'Whey Protein': 5,
    'Peanut Butter': 3,
    'Almonds': 3,
    'Mixed Seeds': 3,
    'Rice': 2,
    'Roti': 2,
    'Oats': 3,
    'Boiled Potato': 1,
    'Banana': 1
  };
  return priorities[name] || 2;
}

// ─── STEP 4: BUILD MEAL PLAN ────────────────────────────────────────────

function buildMealPlan(baseMeals, fixedItems, dynamicItems) {
  return baseMeals.map((meal, mealIndex) => {
    const items = meal.items.map((item, itemIndex) => {
      if (item.role === 'fixed') {
        const fixed = fixedItems.find(f => f.mealIndex === mealIndex && f.itemIndex === itemIndex);
        const macros = fixed ? fixed.macros : calculateMacros(item.name, item.amount, !!item.countable);
        return { ...item, amount: item.amount, macros };
      } else {
        const dynamic = dynamicItems.find(d => d.mealIndex === mealIndex && d.itemIndex === itemIndex);
        const amount = dynamic ? dynamic.currentAmount : item.base;
        const macros = calculateMacros(item.name, amount, !!item.countable);
        return { ...item, amount, macros };
      }
    });
    
    // Sum meal macros
    const mealMacros = items.reduce((acc, item) => ({
      protein: acc.protein + item.macros.protein,
      carbs: acc.carbs + item.macros.carbs,
      fat: acc.fat + item.macros.fat,
      calories: acc.calories + item.macros.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
    
    return {
      ...meal,
      items,
      macros: {
        protein: Math.round(mealMacros.protein),
        carbs: Math.round(mealMacros.carbs),
        fat: Math.round(mealMacros.fat),
        calories: Math.round(mealMacros.calories)
      }
    };
  });
}

// ─── STEP 5: VALIDATE AND CORRECT ──────────────────────────────────────

function validateAndCorrect(meals, targetMacros, maxAttempts = 5) {
  let attempt = 0;
  let currentMeals = meals;
  
  while (attempt < maxAttempts) {
    // Calculate totals
    const total = currentMeals.reduce((acc, meal) => ({
      protein: acc.protein + meal.macros.protein,
      carbs: acc.carbs + meal.macros.carbs,
      fat: acc.fat + meal.macros.fat,
      calories: acc.calories + meal.macros.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
    
    // Check tolerance
    const diffs = {
      protein: total.protein - targetMacros.protein,
      carbs: total.carbs - targetMacros.carbs,
      fat: total.fat - targetMacros.fat,
      calories: total.calories - targetMacros.calories
    };
    
    if (Math.abs(diffs.protein) <= 2 &&
        Math.abs(diffs.carbs) <= 3 &&
        Math.abs(diffs.fat) <= 2 &&
        Math.abs(diffs.calories) <= 20) {
      return { meals: currentMeals, valid: true, totals: total, diffs };
    }
    
    // Try to correct by adjusting dynamic foods
    const dynamicItems = [];
    currentMeals.forEach((meal, mealIndex) => {
      meal.items.forEach((item, itemIndex) => {
        if (item.role === 'dynamic') {
          const isCountable = !!item.countable || isCountableFood(item.name);
          dynamicItems.push({
            ...item,
            mealIndex,
            itemIndex,
            isCountable,
            currentAmount: item.amount,
            baseMacros: calculateMacros(item.name, item.amount, isCountable)
          });
        }
      });
    });
    
    if (dynamicItems.length === 0) break;
    
    // Calculate adjustments
    const gaps = {
      protein: targetMacros.protein - total.protein,
      carbs: targetMacros.carbs - total.carbs,
      fat: targetMacros.fat - total.fat
    };
    
    // Only adjust if gap is significant
    if (Math.abs(gaps.protein) > 0.5 || Math.abs(gaps.carbs) > 0.5 || Math.abs(gaps.fat) > 0.5) {
      // Find the best item for each macro gap
      ['protein', 'carbs', 'fat'].forEach(macro => {
        if (Math.abs(gaps[macro]) < 0.5) return;
        
        const item = findBestAdjustmentItem(
          dynamicItems.map(d => ({
            ...d,
            baseMacros: d.baseMacros,
            base: d.currentAmount
          })),
          macro,
          gaps[macro] > 0
        );
        
        if (!item) return;
        
        // Find the actual dynamic item
        const target = dynamicItems.find(d => 
          d.mealIndex === item.mealIndex && 
          d.itemIndex === item.itemIndex
        );
        if (!target) return;
        
        // Calculate adjustment
        const perUnitMacro = target.baseMacros[macro] / target.currentAmount;
        if (perUnitMacro <= 0) return;
        
        const adjustment = gaps[macro] / perUnitMacro;
        const config = getFoodConfig(target.name);
        const newAmount = target.currentAmount + adjustment * 0.5; // Conservative adjustment
        
        target.currentAmount = clamp(
          target.isCountable ? Math.round(newAmount) : roundToStep(newAmount, config.roundTo || 10),
          config.min || 0,
          config.max || 9999
        );
      });
      
      // Rebuild meals with adjusted amounts
      currentMeals = currentMeals.map((meal, mealIndex) => {
        const items = meal.items.map((item, itemIndex) => {
          if (item.role === 'dynamic') {
            const dynamic = dynamicItems.find(d => 
              d.mealIndex === mealIndex && d.itemIndex === itemIndex
            );
            const amount = dynamic ? dynamic.currentAmount : item.amount;
            const macros = calculateMacros(item.name, amount, !!item.countable);
            return { ...item, amount, macros };
          }
          return item;
        });
        
        // Recalculate meal macros
        const mealMacros = items.reduce((acc, item) => ({
          protein: acc.protein + item.macros.protein,
          carbs: acc.carbs + item.macros.carbs,
          fat: acc.fat + item.macros.fat,
          calories: acc.calories + item.macros.calories
        }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
        
        return {
          ...meal,
          items,
          macros: {
            protein: Math.round(mealMacros.protein),
            carbs: Math.round(mealMacros.carbs),
            fat: Math.round(mealMacros.fat),
            calories: Math.round(mealMacros.calories)
          }
        };
      });
    }
    
    attempt++;
  }
  
  // Final calculation
  const total = currentMeals.reduce((acc, meal) => ({
    protein: acc.protein + meal.macros.protein,
    carbs: acc.carbs + meal.macros.carbs,
    fat: acc.fat + meal.macros.fat,
    calories: acc.calories + meal.macros.calories
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
  
  return {
    meals: currentMeals,
    valid: false,
    totals: total,
    diffs: {
      protein: total.protein - targetMacros.protein,
      carbs: total.carbs - targetMacros.carbs,
      fat: total.fat - targetMacros.fat,
      calories: total.calories - targetMacros.calories
    }
  };
}

// ─── MAIN GENERATION FUNCTION ────────────────────────────────────────────

function generateDietPlan(baseMeals, targetMacros) {
  // Step 1: Calculate fixed foods contributions
  const { fixedItems, total: fixedTotal } = calculateFixedFoods(baseMeals);
  
  // Step 2: Calculate remaining targets
  const remainingTargets = {
    protein: Math.max(0, targetMacros.protein - fixedTotal.protein),
    carbs: Math.max(0, targetMacros.carbs - fixedTotal.carbs),
    fat: Math.max(0, targetMacros.fat - fixedTotal.fat),
    calories: Math.max(0, targetMacros.calories - fixedTotal.calories)
  };
  
  // Step 3: Distribute remaining macros to dynamic foods
  const dynamicItems = distributeDynamicFoods(baseMeals, remainingTargets);
  
  // Step 4: Build meal plan
  let meals = buildMealPlan(baseMeals, fixedItems, dynamicItems);
  
  // Step 5: Validate and correct
  const result = validateAndCorrect(meals, targetMacros);
  
  return result.meals;
}

// ─── OPTIONAL MEALS ─────────────────────────────────────────────────────

function resolveOptionalMeals(goal) {
  const meals = OPTIONAL_MEALS[goal] || [];
  return meals.map(meal => {
    const items = meal.items.map(item => {
      const macros = calculateMacros(item.name, item.amount, false);
      return { ...item, macros };
    });
    
    const mealMacros = items.reduce((acc, item) => ({
      protein: acc.protein + item.macros.protein,
      carbs: acc.carbs + item.macros.carbs,
      fat: acc.fat + item.macros.fat,
      calories: acc.calories + item.macros.calories
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });
    
    return {
      ...meal,
      items,
      macros: {
        protein: Math.round(mealMacros.protein),
        carbs: Math.round(mealMacros.carbs),
        fat: Math.round(mealMacros.fat),
        calories: Math.round(mealMacros.calories)
      }
    };
  });
}

// ─── EXPORT FOR USE IN DIET.JS ─────────────────────────────────────────

// Note: The following functions are kept for backward compatibility
// with the existing Diet.js component structure

export {
  NUTRITION,
  BASE_MEALS,
  OPTIONAL_MEALS,
  generateDietPlan,
  resolveOptionalMeals,
  calculateTargets,
  calculateMacros,
  isCountableFood,
  getFoodConfig,
  roundToStep,
  clamp
};