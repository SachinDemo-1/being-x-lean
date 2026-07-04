// Plan purchase tracker — reads/writes plan ownership on the user's own
// account record (stored in MongoDB via the backend), NOT localStorage.
// This is what makes a purchase follow the user across devices: logging in
// on a new phone/browser fetches the same `user.purchases` from the server.
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

export function getPurchases(user) {
  return (user && user.purchases) || { workout: false, diet: false };
}

export function hasPlan(user, plan) {
  const p = getPurchases(user);
  if (plan === 'workout') return !!p.workout;
  if (plan === 'diet') return !!p.diet;
  return false;
}

// Persists the purchase on the backend and returns the updated user object
// (the caller should pass this into setUser(...) from AuthContext so the
// rest of the app immediately sees the unlocked plan).
export async function grantPlan(planId) {
  const res = await axios.put(`${API}/user/purchases`, { planId });
  return res.data.user;
}