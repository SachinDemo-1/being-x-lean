# 💰 How to Set Real Prices for the Plans

The site is currently in **TEST MODE** — every plan is set to ₹0 and clicking
the button instantly unlocks the plan without going through Razorpay. This
lets you verify the full purchase → unlock flow before charging real money.

## What you'll edit

Open this file:

```
frontend/src/pages/Pricing.js
```

At the top you'll see:

```js
const TEST_MODE_FREE = true;

const PLANS = [
  { id: 'workout', ..., price: 0, ... },
  { id: 'diet',    ..., price: 0, ... },
  { id: 'combo',   ..., price: 0, ... },
];
```

## Step-by-step

### 1. Turn off test mode

Change:
```js
const TEST_MODE_FREE = true;
```
to:
```js
const TEST_MODE_FREE = false;
```

### 2. Set your real prices (in ₹)

Update each `price` field. Example:

```js
{ id: 'workout', ..., price: 199, ... },
{ id: 'diet',    ..., price: 199, ... },
{ id: 'combo',   ..., price: 299, ... },
```

That's it for the UI — the cards will now display `₹199/- ONLY` and the
button will read `Buy Now — ₹199`.

### 3. Add your Razorpay key

In `frontend/.env` (copy from `.env.example` if missing):

```
REACT_APP_RAZORPAY_KEY=rzp_live_xxxxxxxxxxxx
```

Use `rzp_test_...` while testing, then switch to `rzp_live_...` for
production. Restart `npm start` after editing `.env`.

### 4. (Optional) Strike-through "original" price

Each plan also has `originalPrice` (the crossed-out number shown above the
real price). Tweak it to whatever discount story you want:

```js
{ id: 'workout', originalPrice: 999, price: 199, ... }
```

### 5. Test the flow

1. Open `/pricing`
2. Click **Buy Now** on the Workout plan → Razorpay modal opens → pay
3. After success you should be redirected to `/workout` and the plan unlocks
4. Going back to `/diet` should still bounce you to `/pricing` (until you also
   buy Diet or the Combo)

## How unlocks are stored

Purchases are saved in the browser's `localStorage` under the key
`bxl_purchases_v1`, scoped to the signed-in user's email. The combo plan
unlocks **both** workout and diet at once.

> ⚠️ For production you should also persist purchases on your backend
> (a `purchases` collection on the User model) and verify the Razorpay
> payment signature server-side before granting access. The current
> implementation is intentionally simple so you can demo and iterate.
