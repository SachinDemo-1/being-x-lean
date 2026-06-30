// Simple localStorage-based plan purchase tracker.
// Each user's purchases are namespaced by their email (or "guest").
// Plans: 'workout', 'diet'. Buying the combo unlocks both.

const KEY = 'bxl_purchases_v1';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function writeAll(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
  // Notify same-tab listeners
  window.dispatchEvent(new Event('bxl-purchases-changed'));
}

function userKey(user) {
  return (user && (user.email || user.id)) || 'guest';
}

export function getPurchases(user) {
  const all = readAll();
  return all[userKey(user)] || { workout: false, diet: false };
}

export function hasPlan(user, plan) {
  const p = getPurchases(user);
  if (plan === 'workout') return !!p.workout;
  if (plan === 'diet') return !!p.diet;
  return false;
}

export function grantPlan(user, planId) {
  const all = readAll();
  const key = userKey(user);
  const cur = all[key] || { workout: false, diet: false };
  if (planId === 'workout') cur.workout = true;
  else if (planId === 'diet') cur.diet = true;
  else if (planId === 'combo') { cur.workout = true; cur.diet = true; }
  all[key] = cur;
  writeAll(all);
  return cur;
}

export function resetPurchases(user) {
  const all = readAll();
  delete all[userKey(user)];
  writeAll(all);
}
