export const dietGoals = {
  'muscle-gain': {
    id: 'muscle-gain',
    label: 'Muscle Gain',
    emoji: '💪',
    color: '#ff4500',
    description: 'Build lean muscle mass with a caloric surplus and high protein intake.',
    calorieSurplus: 300,
    proteinMultiplier: 2.2,
    carbMultiplier: 4.5,
    fatMultiplier: 0.9,
    tips: [
      'Eat in a 200–400 kcal surplus above maintenance',
      'Hit 2.0–2.4g of protein per kg of bodyweight',
      'Prioritize whole foods — rice, chicken, eggs, oats',
      'Time carbs around your workouts for best performance'
    ],
    mealPlan: {
      breakfast: {
        title: 'Power Breakfast', emoji: '🌅',
        meals: [
          { name: 'Oatmeal Power Bowl', calories: 420, protein: 12, carbs: 78, fat: 8, ingredients: ['80g oats', '1 banana', '1 tbsp honey', '200ml whole milk', 'Handful of berries'] },
          { name: 'Egg White Omelette + Toast', calories: 380, protein: 32, carbs: 28, fat: 8, ingredients: ['6 egg whites', '2 whole eggs', '2 slices whole grain bread', 'Spinach', 'Cherry tomatoes'] },
          { name: 'Greek Yogurt Parfait', calories: 350, protein: 28, carbs: 42, fat: 6, ingredients: ['200g Greek yogurt 0%', '40g granola', 'Mixed berries', '1 tbsp almond butter'] },
        ]
      },
      lunch: {
        title: 'Fuel Lunch', emoji: '☀️',
        meals: [
          { name: 'Chicken Rice Bowl', calories: 620, protein: 52, carbs: 72, fat: 10, ingredients: ['200g chicken breast', '200g cooked rice', 'Broccoli', 'Bell peppers', 'Soy sauce'] },
          { name: 'Tuna Pasta', calories: 580, protein: 48, carbs: 68, fat: 9, ingredients: ['150g canned tuna', '150g pasta', 'Tomato sauce', 'Parmesan', 'Olive oil'] },
          { name: 'Beef Stir Fry + Rice', calories: 650, protein: 50, carbs: 60, fat: 14, ingredients: ['180g lean beef', '150g cooked rice', 'Mixed vegetables', 'Fresh ginger', 'Soy sauce'] },
        ]
      },
      dinner: {
        title: 'Recovery Dinner', emoji: '🌙',
        meals: [
          { name: 'Salmon + Sweet Potato', calories: 580, protein: 44, carbs: 52, fat: 18, ingredients: ['180g salmon fillet', '200g sweet potato', 'Asparagus', 'Olive oil', 'Lemon'] },
          { name: 'Turkey Meatballs + Pasta', calories: 620, protein: 48, carbs: 64, fat: 12, ingredients: ['200g turkey mince', '150g pasta', 'Tomato sauce', 'Garlic', 'Fresh basil'] },
          { name: 'Chicken + Cottage Cheese', calories: 520, protein: 58, carbs: 20, fat: 16, ingredients: ['200g chicken thighs', '150g cottage cheese', 'Roasted veg', 'Quinoa'] },
        ]
      },
      snacks: {
        title: 'Power Snacks', emoji: '⚡',
        meals: [
          { name: 'Protein Shake + Banana', calories: 280, protein: 30, carbs: 32, fat: 3, ingredients: ['30g whey protein', '1 banana', '300ml whole milk', 'Ice cubes'] },
          { name: 'Nuts & Cheese', calories: 320, protein: 16, carbs: 6, fat: 26, ingredients: ['30g mixed nuts', '50g cheddar cheese', 'Apple slices'] },
          { name: 'Rice Cakes + Peanut Butter', calories: 260, protein: 10, carbs: 28, fat: 12, ingredients: ['4 rice cakes', '2 tbsp peanut butter', 'Banana slices'] },
        ]
      }
    }
  },
  'fat-loss': {
    id: 'fat-loss',
    label: 'Fat Loss',
    emoji: '🔥',
    color: '#39ff14',
    description: 'Shed body fat while preserving muscle mass with a moderate caloric deficit.',
    calorieSurplus: -400,
    proteinMultiplier: 2.4,
    carbMultiplier: 2.5,
    fatMultiplier: 0.7,
    tips: [
      'Eat in a 300–500 kcal deficit — no more, no less',
      'Prioritize protein to preserve muscle during the cut',
      'Fill half your plate with vegetables for satiety',
      'Drink 2.5–3L of water daily to manage hunger'
    ],
    mealPlan: {
      breakfast: {
        title: 'Light Start', emoji: '🌅',
        meals: [
          { name: 'Egg White Scramble', calories: 280, protein: 30, carbs: 12, fat: 6, ingredients: ['6 egg whites', 'Spinach', 'Mushrooms', 'Cherry tomatoes', 'Black pepper'] },
          { name: 'Protein Oats', calories: 310, protein: 28, carbs: 40, fat: 5, ingredients: ['50g oats', '1 scoop protein powder', 'Almond milk', 'Cinnamon', 'Blueberries'] },
          { name: 'Greek Yogurt Bowl', calories: 250, protein: 24, carbs: 22, fat: 4, ingredients: ['200g Greek yogurt 0%', '100g mixed berries', '1 tsp honey', '15g flaxseeds'] },
        ]
      },
      lunch: {
        title: 'Lean Lunch', emoji: '☀️',
        meals: [
          { name: 'Grilled Chicken Salad', calories: 380, protein: 42, carbs: 18, fat: 12, ingredients: ['180g chicken breast', 'Large mixed salad', '100g chickpeas', 'Olive oil dressing', 'Feta cheese'] },
          { name: 'Tuna Lettuce Wraps', calories: 340, protein: 40, carbs: 14, fat: 8, ingredients: ['150g tuna', 'Romaine lettuce leaves', 'Avocado', 'Tomato', 'Lime juice'] },
          { name: 'Turkey & Veg Bowl', calories: 360, protein: 38, carbs: 24, fat: 9, ingredients: ['160g turkey breast', 'Roasted vegetables', '50g quinoa', 'Tzatziki sauce'] },
        ]
      },
      dinner: {
        title: 'Light Dinner', emoji: '🌙',
        meals: [
          { name: 'White Fish + Steamed Veg', calories: 340, protein: 38, carbs: 20, fat: 8, ingredients: ['200g cod or tilapia', 'Steamed broccoli', 'Cauliflower', 'Fresh herbs', 'Lemon'] },
          { name: 'Chicken Stir Fry (Low Carb)', calories: 360, protein: 44, carbs: 18, fat: 10, ingredients: ['200g chicken breast', 'Zucchini noodles', 'Bell peppers', 'Soy sauce', 'Ginger'] },
          { name: 'Egg White Omelette Dinner', calories: 280, protein: 30, carbs: 8, fat: 8, ingredients: ['7 egg whites', '1 whole egg', 'Feta cheese', 'Spinach', 'Fresh herbs'] },
        ]
      },
      snacks: {
        title: 'Smart Snacks', emoji: '💡',
        meals: [
          { name: 'Protein Shake (Water)', calories: 140, protein: 28, carbs: 4, fat: 2, ingredients: ['30g whey isolate', 'Cold water', 'Ice', 'Optional: cinnamon'] },
          { name: 'Cottage Cheese + Veg Sticks', calories: 180, protein: 20, carbs: 8, fat: 4, ingredients: ['150g cottage cheese', 'Cucumber sticks', 'Celery', 'Cherry tomatoes'] },
          { name: 'Apple + Almonds', calories: 200, protein: 6, carbs: 24, fat: 10, ingredients: ['1 medium apple', '20g almonds'] },
        ]
      }
    }
  },
  'bulk': {
    id: 'bulk',
    label: 'Dirty Bulk',
    emoji: '🍖',
    color: '#ffd700',
    description: 'Maximum caloric surplus for rapid size and strength gains. Expect some fat gain alongside serious muscle.',
    calorieSurplus: 700,
    proteinMultiplier: 2.0,
    carbMultiplier: 6.0,
    fatMultiplier: 1.2,
    tips: [
      'Eat in a 500–700 kcal surplus for rapid size gains',
      'Hit at least 2g of protein per kg of bodyweight',
      "Don't skip meals — consistency is key on a bulk",
      'Track your weight weekly; aim for 0.5–1kg gain/week'
    ],
    mealPlan: {
      breakfast: {
        title: 'Massive Breakfast', emoji: '🌅',
        meals: [
          { name: 'Big Breakfast Bowl', calories: 750, protein: 45, carbs: 90, fat: 22, ingredients: ['4 whole eggs', '100g oats', '2 bananas', '2 tbsp peanut butter', 'Whole milk'] },
          { name: 'Pancake Stack + Eggs', calories: 820, protein: 40, carbs: 100, fat: 24, ingredients: ['4 protein pancakes', '3 whole eggs', 'Maple syrup', 'Butter', 'Protein powder in batter'] },
          { name: 'Mass Gainer Shake', calories: 700, protein: 50, carbs: 88, fat: 14, ingredients: ['2 scoops protein powder', '100g oats (blended)', '2 bananas', '2 tbsp almond butter', 'Whole milk'] },
        ]
      },
      lunch: {
        title: 'Power Lunch', emoji: '☀️',
        meals: [
          { name: 'Double Chicken Rice', calories: 900, protein: 72, carbs: 110, fat: 16, ingredients: ['300g chicken breast', '300g cooked rice', 'Avocado', 'Broccoli', 'Olive oil'] },
          { name: 'Beef Pasta Bake', calories: 950, protein: 68, carbs: 100, fat: 26, ingredients: ['250g lean beef mince', '200g pasta', 'Cheese', 'Tomato sauce', 'Garlic bread'] },
          { name: 'Tuna Bagel Stack + Shake', calories: 880, protein: 62, carbs: 95, fat: 18, ingredients: ['2 bagels', '200g tuna', 'Mayonnaise', 'Cheese slices', 'Protein shake on the side'] },
        ]
      },
      dinner: {
        title: 'Mass Dinner', emoji: '🌙',
        meals: [
          { name: 'Steak + Baked Potato', calories: 900, protein: 62, carbs: 88, fat: 28, ingredients: ['250g ribeye or sirloin', '2 large baked potatoes', 'Butter', 'Sweet corn', 'Side salad'] },
          { name: 'Chicken Thighs + Rice', calories: 850, protein: 58, carbs: 96, fat: 24, ingredients: ['300g chicken thighs', '300g cooked rice', 'Roasted veg', 'Gravy', 'Cheese sauce'] },
          { name: 'Salmon Pasta', calories: 880, protein: 56, carbs: 92, fat: 26, ingredients: ['200g salmon fillet', '200g pasta', 'Cream sauce', 'Parmesan', 'Garlic bread'] },
        ]
      },
      snacks: {
        title: 'Calorie Bombs', emoji: '💣',
        meals: [
          { name: 'Mega Mass Shake', calories: 600, protein: 40, carbs: 80, fat: 14, ingredients: ['2 scoops protein powder', '1 cup oats', '2 tbsp peanut butter', '1 banana', 'Whole milk', 'Honey'] },
          { name: 'Peanut Butter Toast Stack', calories: 450, protein: 16, carbs: 50, fat: 22, ingredients: ['3 slices bread', '4 tbsp peanut butter', 'Jam', 'Glass of whole milk'] },
          { name: 'Nuts & Dried Fruit Mix', calories: 380, protein: 12, carbs: 38, fat: 22, ingredients: ['50g mixed nuts', '50g dried dates or raisins', 'Dark chocolate pieces'] },
        ]
      }
    }
  }
};
