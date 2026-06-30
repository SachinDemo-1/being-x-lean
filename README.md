# ⚡ BEING_X_LEAN v2.0

Elite fitness platform with workout plans, diet plans, exercise tracker, and Razorpay payments.

## 🚀 What's New in v2.0

### ✅ All Changes Implemented:

1. **3D Body Anatomy** — SVG anatomy with clickable muscles that turn RED on click. Works on iPhone/mobile (Three.js removed, replaced with pure SVG — no loading issues).

2. **Workout Page** — Only shown when user is signed in. 4-day & 5-day plans are LOCKED with "Coming Soon" message. 6-day plan shows level chooser (Beginner/Intermediate vs Advanced cards). Clicking a day scrolls to the workout.

3. **Exercise Tracker** — Full progress tracker at `/tracker`:
   - Log exercises with sets/reps/weight
   - Track daily calories, protein, carbs, fat
   - Set fitness goals
   - View 7-day history

4. **Hero Background** — Gym dumbbell dark atmospheric background with animated gradients.

5. **Auth Guard** — Workout, Diet, Tracker require sign-in. Clicking redirects to `/auth`.

6. **Auth Page** — Email/password + Phone/OTP toggle + Google, Facebook, Instagram social login buttons. Account creation available.

7. **Razorpay Payments** — `/pricing` page matches provided design:
   - Workout Plan: ₹99 (was ₹500)
   - Diet Plan: ₹99 (was ₹500)
   - Diet + Workout Combo: ₹149 (was ₹1000) — Best Value
   - Razorpay checkout opens on click

8. **Rotating Influencer Gallery** — Auto-scrolling gallery on home page.

9. **Footer** — About section, Instagram, email, YouTube, Telegram links.

---

## 🛠️ Setup

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Add your Razorpay key to .env
npm start
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in MongoDB URI, JWT secret, OAuth keys, Razorpay keys
node server.js
```

---

## 🔑 Required API Keys

| Service | Where to Get |
|---------|-------------|
| Razorpay | razorpay.com → Dashboard → API Keys |
| Google OAuth | console.cloud.google.com |
| Facebook OAuth | developers.facebook.com |
| MongoDB | mongodb.com/atlas (free tier) |

---

## 📱 iPhone Fix

Three.js / WebGL was causing loading issues on iOS. The 3D anatomy is now rendered as interactive SVG — works perfectly on all devices including iPhone.

---

## 📞 Support

- Email: beingxlean@gmail.com
- Instagram: @beingxlean
