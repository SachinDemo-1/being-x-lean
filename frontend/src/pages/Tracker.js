/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Tracker.css';

const STORAGE_KEY = 'bxl_tracker_v1';

const EXERCISES_LIST = [
  'Bench Press', 'Squat', 'Deadlift', 'Pull-ups', 'Barbell Row',
  'Overhead Press', 'Dumbbell Press', 'Lat Pulldown', 'Cable Fly',
  'Leg Press', 'Leg Extension', 'Hamstring Curl', 'Calf Raise',
  'Bicep Curl', 'Tricep Pushdown', 'Lateral Raise', 'Face Pull',
  'Hip Thrust', 'Romanian Deadlift', 'Dips', 'Other'
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function Tracker() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const today = getTodayKey();

  const [data, setData] = useState(loadData);
  const [activeTab, setActiveTab] = useState('today');
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', weight: '' });
  const [nutrition, setNutrition] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const [goalWeight, setGoalWeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [goalNote, setGoalNote] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const todayData = data[today] || {};
    if (todayData.nutrition) setNutrition(todayData.nutrition);
    if (todayData.weight) setCurrentWeight(todayData.weight);
    const goals = data.__goals__ || {};
    if (goals.goalWeight) setGoalWeight(goals.goalWeight);
    if (goals.note) setGoalNote(goals.note);
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const todayData = data[today] || { exercises: [], nutrition: {}, weight: '' };

  const saveExercise = () => {
    if (!newExercise.name) return;
    const updated = { ...data };
    if (!updated[today]) updated[today] = { exercises: [], nutrition: {}, weight: '' };
    updated[today].exercises = [...(updated[today].exercises || []), { ...newExercise, id: Date.now() }];
    setData(updated);
    saveData(updated);
    setNewExercise({ name: '', sets: '', reps: '', weight: '' });
    showToast('✅ Exercise logged!');
  };

  const removeExercise = (id) => {
    const updated = { ...data };
    updated[today].exercises = (updated[today].exercises || []).filter(e => e.id !== id);
    setData(updated);
    saveData(updated);
  };

  const saveNutrition = () => {
    const updated = { ...data };
    if (!updated[today]) updated[today] = { exercises: [], nutrition: {}, weight: '' };
    updated[today].nutrition = nutrition;
    updated[today].weight = currentWeight;
    setData(updated);
    saveData(updated);
    showToast('✅ Nutrition saved!');
  };

  const saveGoals = () => {
    const updated = { ...data, __goals__: { goalWeight, note: goalNote, savedAt: new Date().toISOString() } };
    setData(updated);
    saveData(updated);
    showToast('✅ Goals saved!');
  };

  // History: last 7 days
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return { key, label, data: data[key] };
  });

  // Weekly stats
  const weeklyExercises = history.reduce((acc, h) => acc + (h.data?.exercises?.length || 0), 0);
  const weeklyCalories = history.reduce((acc, h) => acc + (parseInt(h.data?.nutrition?.calories) || 0), 0);
  const weeklyProtein = history.reduce((acc, h) => acc + (parseInt(h.data?.nutrition?.protein) || 0), 0);

  if (authLoading) return null;
  if (!user) return null;

  return (
    <div className="tracker-page">
      <div className="noise-overlay" />
      <div className="tracker-header">
        <div className="th-bg"></div>
        <div className="th-content">
          <p className="section-eyebrow">Progress Dashboard</p>
          <h1 className="section-title" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>EXERCISE TRACKER</h1>
          <p className="tracker-subtitle">Track workouts, nutrition & goals daily</p>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="tracker-stats-row">
        <div className="tr-stat"><span className="tr-stat-num">{weeklyExercises}</span><span className="tr-stat-label">Exercises This Week</span></div>
        <div className="tr-stat"><span className="tr-stat-num">{Math.round(weeklyCalories / 7)}</span><span className="tr-stat-label">Avg Daily Calories</span></div>
        <div className="tr-stat"><span className="tr-stat-num">{Math.round(weeklyProtein / 7)}g</span><span className="tr-stat-label">Avg Daily Protein</span></div>
        <div className="tr-stat"><span className="tr-stat-num">{history.filter(h => h.data?.exercises?.length > 0).length}</span><span className="tr-stat-label">Active Days</span></div>
      </div>

      {/* Tabs */}
      <div className="tracker-tabs">
        {[['today', '🏋️ Today'], ['nutrition', '🥗 Nutrition'], ['goals', '🎯 Goals'], ['history', '📅 History']].map(([id, label]) => (
          <button key={id} className={`tracker-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      <div className="tracker-content">
        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <div className="tab-panel">
            <div className="add-exercise-form">
              <h3 className="tab-title">Log Exercise</h3>
              <div className="form-row">
                <select className="tracker-input" value={newExercise.name} onChange={e => setNewExercise(p => ({ ...p, name: e.target.value }))}>
                  <option value="">Select exercise…</option>
                  {EXERCISES_LIST.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>
              <div className="form-row-3">
                <input className="tracker-input" type="number" placeholder="Sets" value={newExercise.sets} onChange={e => setNewExercise(p => ({ ...p, sets: e.target.value }))} />
                <input className="tracker-input" type="number" placeholder="Reps" value={newExercise.reps} onChange={e => setNewExercise(p => ({ ...p, reps: e.target.value }))} />
                <input className="tracker-input" type="number" placeholder="Weight (kg)" value={newExercise.weight} onChange={e => setNewExercise(p => ({ ...p, weight: e.target.value }))} />
              </div>
              <button className="btn-primary" onClick={saveExercise} style={{ width: '100%' }}>+ Log Exercise</button>
            </div>

            <div className="exercise-log">
              <h3 className="tab-title">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              {(!todayData.exercises || todayData.exercises.length === 0) ? (
                <div className="empty-state">
                  <span>🏋️</span>
                  <p>No exercises logged today. Get after it!</p>
                </div>
              ) : (
                <div className="logged-exercises">
                  {todayData.exercises.map((ex, i) => (
                    <div key={ex.id || i} className="logged-exercise">
                      <div className="le-left">
                        <span className="le-num">{i + 1}</span>
                        <div>
                          <div className="le-name">{ex.name}</div>
                          <div className="le-detail">{ex.sets && `${ex.sets} sets`}{ex.reps && ` × ${ex.reps} reps`}{ex.weight && ` @ ${ex.weight}kg`}</div>
                        </div>
                      </div>
                      <button className="le-remove" onClick={() => removeExercise(ex.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NUTRITION TAB ── */}
        {activeTab === 'nutrition' && (
          <div className="tab-panel">
            <div className="nutrition-form">
              <h3 className="tab-title">Today's Nutrition</h3>
              <div className="nutrition-grid">
                {[
                  { key: 'calories', label: 'Calories', unit: 'kcal', icon: '🔥', color: '#ff4500' },
                  { key: 'protein', label: 'Protein', unit: 'g', icon: '💪', color: '#39ff14' },
                  { key: 'carbs', label: 'Carbs', unit: 'g', icon: '🍚', color: '#ffd700' },
                  { key: 'fat', label: 'Fat', unit: 'g', icon: '🥑', color: '#00bfff' },
                ].map(({ key, label, unit, icon, color }) => (
                  <div key={key} className="nutrition-card" style={{ '--n-color': color }}>
                    <div className="nutrition-card-header">
                      <span className="n-icon">{icon}</span>
                      <span className="n-label" style={{ color }}>{label}</span>
                    </div>
                    <div className="n-input-wrap">
                      <input className="tracker-input n-input" type="number" placeholder="0" value={nutrition[key]} onChange={e => setNutrition(p => ({ ...p, [key]: e.target.value }))} />
                      <span className="n-unit">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="weight-row">
                <label className="n-label">Body Weight (kg)</label>
                <input className="tracker-input" type="number" placeholder="e.g. 75.5" value={currentWeight} onChange={e => setCurrentWeight(e.target.value)} style={{ maxWidth: '200px' }} />
              </div>
              <button className="btn-primary" onClick={saveNutrition} style={{ width: '100%', marginTop: '1rem' }}>💾 Save Nutrition</button>
            </div>
            {todayData.nutrition?.calories && (
              <div className="nutrition-summary">
                <h4>Today's Summary</h4>
                <div className="ns-grid">
                  <div className="ns-item"><span className="ns-val" style={{ color: '#ff4500' }}>{todayData.nutrition.calories || 0}</span><span>Calories</span></div>
                  <div className="ns-item"><span className="ns-val" style={{ color: '#39ff14' }}>{todayData.nutrition.protein || 0}g</span><span>Protein</span></div>
                  <div className="ns-item"><span className="ns-val" style={{ color: '#ffd700' }}>{todayData.nutrition.carbs || 0}g</span><span>Carbs</span></div>
                  <div className="ns-item"><span className="ns-val" style={{ color: '#00bfff' }}>{todayData.nutrition.fat || 0}g</span><span>Fat</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GOALS TAB ── */}
        {activeTab === 'goals' && (
          <div className="tab-panel">
            <div className="goals-form">
              <h3 className="tab-title">My Fitness Goals</h3>
              <div className="goal-field">
                <label>Goal Body Weight (kg)</label>
                <input className="tracker-input" type="number" placeholder="e.g. 80" value={goalWeight} onChange={e => setGoalWeight(e.target.value)} />
              </div>
              <div className="goal-field">
                <label>My Goal / Notes</label>
                <textarea className="tracker-textarea" placeholder="Describe your fitness goal… e.g. Build 5kg of muscle by December, lose 10kg fat, run a 5k…" value={goalNote} onChange={e => setGoalNote(e.target.value)} rows={5}></textarea>
              </div>
              <button className="btn-primary" onClick={saveGoals} style={{ width: '100%' }}>🎯 Save Goals</button>
              {data.__goals__?.savedAt && (
                <p className="goal-saved-at">Last updated: {new Date(data.__goals__.savedAt).toLocaleDateString()}</p>
              )}
            </div>
            {currentWeight && goalWeight && (
              <div className="goal-progress">
                <h4>Weight Progress</h4>
                <div className="gp-bar-wrap">
                  <div className="gp-labels">
                    <span>0 kg</span>
                    <span>Goal: {goalWeight} kg</span>
                  </div>
                  <div className="gp-bar">
                    <div className="gp-fill" style={{ width: `${Math.min(100, (currentWeight / goalWeight) * 100)}%` }}></div>
                  </div>
                  <p className="gp-note">Current: {currentWeight}kg → Goal: {goalWeight}kg · {Math.abs(goalWeight - currentWeight).toFixed(1)}kg to go</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="tab-panel">
            <h3 className="tab-title">Last 7 Days</h3>
            <div className="history-list">
              {history.map(({ key, label, data: dayData }) => (
                <div key={key} className={`history-day ${dayData ? 'has-data' : 'no-data'}`}>
                  <div className="hd-header">
                    <span className="hd-label">{label}</span>
                    <div className="hd-badges">
                      {dayData?.exercises?.length > 0 && <span className="hd-badge badge-workout">🏋️ {dayData.exercises.length} exercises</span>}
                      {dayData?.nutrition?.calories && <span className="hd-badge badge-calories">🔥 {dayData.nutrition.calories} kcal</span>}
                      {dayData?.nutrition?.protein && <span className="hd-badge badge-protein">💪 {dayData.nutrition.protein}g protein</span>}
                      {!dayData && <span className="hd-badge badge-rest">😴 Rest day</span>}
                    </div>
                  </div>
                  {dayData?.exercises?.length > 0 && (
                    <div className="hd-exercises">
                      {dayData.exercises.map((ex, i) => (
                        <span key={i} className="hd-ex-chip">{ex.name}{ex.weight ? ` ${ex.weight}kg` : ''}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && <div className="tracker-toast">{toast}</div>}
    </div>
  );
}