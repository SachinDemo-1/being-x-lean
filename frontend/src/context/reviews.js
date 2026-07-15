import axios from 'axios';

const API = process.env.REACT_APP_API_URL;
const SHOWN_KEY = 'bxl_review_prompted_v1';
const DONE_KEY = 'bxl_review_done_v1';

function userKey(user) {
  return (user && (user.email || user.id)) || 'guest';
}

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); }
  catch { return {}; }
}

// ── Local state: has this person already reviewed, or been prompted recently? ──
export function hasReviewed(user) {
  return !!readJSON(DONE_KEY)[userKey(user)];
}

export function markReviewed(user) {
  const all = readJSON(DONE_KEY);
  all[userKey(user)] = Date.now();
  localStorage.setItem(DONE_KEY, JSON.stringify(all));
}

// Returns true once per "cool-down" window (default 4 days) so a dismissed
// popup doesn't nag the user on every single visit.
export function wasPromptedRecently(user, cooldownDays = 4) {
  const all = readJSON(SHOWN_KEY);
  const last = all[userKey(user)];
  if (!last) return false;
  return Date.now() - last < cooldownDays * 24 * 60 * 60 * 1000;
}

export function markPrompted(user) {
  const all = readJSON(SHOWN_KEY);
  all[userKey(user)] = Date.now();
  localStorage.setItem(SHOWN_KEY, JSON.stringify(all));
}

// Central check used by Workout.js / Diet.js: only show the popup if the
// person hasn't already reviewed and hasn't seen the prompt recently.
export function shouldShowReviewPopup(user) {
  return !hasReviewed(user) && !wasPromptedRecently(user);
}

// ── API calls ──────────────────────────────────────────────────────────────
export async function fetchReviews(limit = 12) {
  const res = await axios.get(`${API}/reviews`, { params: { limit } });
  return res.data; // { reviews, summary }
}

export async function submitReview({ name, email, rating, comment, plan }) {
  const res = await axios.post(`${API}/reviews`, { name, email, rating, comment, plan });
  return res.data;
}