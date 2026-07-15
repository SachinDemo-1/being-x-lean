/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { exerciseDB, workoutPlans, generalGuidelines } from '../context/workoutData';
import { useAuth } from '../context/AuthContext';
import { hasPlan } from '../context/purchases';
import './Workout.css';
import latPulldownGif from '../assets/gifs/latpulldown.gif';
import setedcablerow from '../assets/gifs/setedcablerow.gif';
import pullups from '../assets/gifs/pullups.gif';
import facepullups from '../assets/gifs/facepullups.gif';
import barbelshoulderpress from '../assets/gifs/barbelshoulderpress.gif';
import oneArmLatralraises from '../assets/gifs/oneArmLatralraises.gif';
import DumbbellBenchPress from '../assets/gifs/DumbbellBenchPress.gif';
import Inclinedumbelloress from '../assets/gifs/Inclinedumbelloress.gif';
import ChestPressMachine from '../assets/gifs/ChestPressMachine.gif';
import upperanchestfly from '../assets/gifs/upperanchestfly.gif';
import chest_fly from '../assets/gifs/chest_fly.gif';
import Triceps_Dips from '../assets/gifs/Triceps_Dips.gif';
import BarbellCurl from '../assets/gifs/BarbellCurl.gif';
import Hammer_Curl from '../assets/gifs/Hammer_Curl.gif';
import InclineDumbbellCurl from '../assets/gifs/InclineDumbbellCurl.gif';
import KneelingCableAbsCrunches from '../assets/gifs/KneelingCableAbsCrunches.gif';
import overheadext from '../assets/gifs/overhead-ext.gif';
import legpress from '../assets/gifs/leg-press.gif';
import hangginglegraises from '../assets/gifs/hangginglegraises.gif';
import squats from '../assets/gifs/squats.gif';
import Leg_Extensions from '../assets/gifs/Leg_Extensions.gif';
import Lying_Leg_Curls from '../assets/gifs/Lying_Leg_Curls.gif';
import Barbell_Seated_Calf_Raise from '../assets/gifs/Barbell_Seated_Calf_Raise.gif';
import Barbell_Deadlift from '../assets/gifs/Barbell_Deadlift.gif';
import Barbell_Hip_Thrust from '../assets/gifs/Barbell_Hip_Thrust.gif';
import RopeTricepsPushdown from '../assets/gifs/RopeTricepsPushdown.gif';
import onehandtri from '../assets/gifs/onehandtri.gif';
import reardelt from '../assets/gifs/reardelt.gif';
import reversepecdec1 from '../assets/gifs/reversepecdec1.gif';
import oneArmTricepPushDown from '../assets/gifs/oneArmTricepPushDown.gif';


import SEO, { buildBreadcrumbSchema, buildFAQSchema, buildSoftwareApplicationSchema } from '../components/SEO';
import ReviewPopup from '../components/ReviewPopup';
import { shouldShowReviewPopup, markPrompted } from '../context/reviews';

// ── Exercise GIF URLs ──────────────────────────────────────────────────────────
// Using free-exercise-db (public domain) images from GitHub CDN
// These are static JPG exercise demonstration images that load reliably
const EXERCISE_GIFS = {
  // Back
  'lat-pulldown':          latPulldownGif,
  'seated-row':            setedcablerow,
  'pullup':                pullups,         // using reversefly as closest available
  // Shoulders
  'ohp':                   barbelshoulderpress,
  'lateral-raise':         oneArmLatralraises,
  'reverse-fly':           reversepecdec1,
  'rear-delt-cable-fly':   reardelt,
  'facepull':              facepullups,
  // Chest
  'incline-db-press':      Inclinedumbelloress,
  'chest-fly':             chest_fly,
  'cable-fly':             upperanchestfly,
  'db-press':              DumbbellBenchPress,
  'machine-press':         ChestPressMachine,
  'dips':                  Triceps_Dips,
  // Arms - Biceps
  'hammer-curl':           Hammer_Curl,
  'barbell-curl':          BarbellCurl,
  'incline-curl':          InclineDumbbellCurl,
  // Arms - Triceps
  'tricep-pushdown':       RopeTricepsPushdown,
  'overhead-ext':          onehandtri,
  'single-arm-tricep-ext': oneArmTricepPushDown,
  // Legs
  'squat':                 squats,
  'leg-press':             legpress,
  'leg-ext':               Leg_Extensions,
  'ham-curl':              Lying_Leg_Curls,
  'calf-raise':            Barbell_Seated_Calf_Raise,
  'rdl':                   Barbell_Deadlift,
  'hip-thrust':            Barbell_Hip_Thrust,
  // Core
  'hanging-leg-raise':     hangginglegraises,
  'cable-crunch':          KneelingCableAbsCrunches,
};

// ── Exercise GIF Component ────────────────────────────────────────────────────
function ExerciseGif({ exerciseId, emoji, name, dayColor }) {
  const [frame, setFrame] = useState(0);
  const [loaded0, setLoaded0] = useState(false);
  const [loaded1, setLoaded1] = useState(false);
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const baseUrl = EXERCISE_GIFS[exerciseId];
  const frame0 = baseUrl;
  const frame1 = baseUrl ? baseUrl.replace('/0.jpg', '/1.jpg') : null;

  useEffect(() => {
    if (!baseUrl) return;
    if (loaded0 && loaded1) {
      // Animate between frame 0 and 1 like a GIF
      intervalRef.current = setInterval(() => {
        setFrame(f => 1 - f);
      }, 700);
    }
    return () => clearInterval(intervalRef.current);
  }, [loaded0, loaded1, baseUrl]);

  if (error || !baseUrl) {
    return (
      <div className="ex-gif-placeholder" style={{ borderColor: dayColor }}>
        <span className="ex-gif-emoji">{emoji}</span>
      </div>
    );
  }

  return (
    <div className="ex-gif-wrap" style={{ borderColor: dayColor }}>
      {(!loaded0) && (
        <div className="ex-gif-loading">
          <span className="ex-gif-emoji">{emoji}</span>
          <span className="gif-loading-dot"></span>
        </div>
      )}
      {/* Frame 0 */}
      <img
        src={frame0}
        alt={`${name} - frame 1`}
        className={`ex-gif-img ex-gif-frame ${loaded0 && frame === 0 ? 'active-frame' : ''}`}
        onLoad={() => setLoaded0(true)}
        onError={() => setError(true)}
        loading="lazy"
      />
      {/* Frame 1 */}
      {frame1 && (
        <img
          src={frame1}
          alt={`${name} - frame 2`}
          className={`ex-gif-img ex-gif-frame ${loaded0 && frame === 1 ? 'active-frame' : ''}`}
          onLoad={() => setLoaded1(true)}
          onError={() => { /* frame 1 optional */ }}
          loading="lazy"
        />
      )}
    </div>
  );
}

// ── Exercise Card ──────────────────────────────────────────────────────────────
function ExerciseCard({ exercise, dayColor }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`exercise-card ${expanded ? 'expanded' : ''}`} style={{ '--day-color': dayColor }}>
      <div className="ex-card-main" onClick={() => setExpanded(!expanded)}>
        <ExerciseGif
          exerciseId={exercise.id}
          emoji={exercise.emoji}
          name={exercise.name}
          dayColor={dayColor}
        />
        <div className="ex-info">
          <div className="ex-header">
            <div>
              <h3 className="ex-name">{exercise.name}</h3>
              <span className="ex-muscle">{exercise.muscle}</span>
            </div>
            <div className="ex-sets-reps">
              <span className="ex-sets">{exercise.detail}</span>
              <span className="ex-reps" style={{ color: dayColor }}>{exercise.reps}</span>
            </div>
          </div>
          <div className="ex-muscles">{exercise.targetMuscles.map(m => <span key={m} className="muscle-tag">{m}</span>)}</div>
          <button className="expand-btn" style={{ color: dayColor }}>{expanded ? '▲ Hide Tips' : '▼ Form Tips & Instructions'}</button>
        </div>
      </div>
      {expanded && (
        <div className="ex-expanded-content">
          <h4 className="tips-title">📋 How to Perform</h4>
          <ul className="tips-list">
            {exercise.tips.map((tip, i) => (
              <li key={i} className="tip-item">
                <span className="tip-num" style={{ background: dayColor }}>{i + 1}</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <a href={exercise.youtubeUrl} target="_blank" rel="noopener noreferrer" className="yt-btn">
            ▶ Watch on YouTube
          </a>
        </div>
      )}
    </div>
  );
}

// ── Locked Plan Card ───────────────────────────────────────────────────────────
function LockedPlanCard({ plan, onClose }) {
  return (
    <div className="locked-modal-overlay">
      <div className="locked-modal">
        <button className="locked-modal-close" onClick={onClose} aria-label="Go back">← Back</button>
        <span className="locked-icon">🔒</span>
        <h3>Plan Locked</h3>
        <p>The <strong>{plan.label}</strong> is not available yet. Stay tuned for updates!</p>
        <div className="locked-badge">Coming Soon</div>
      </div>
    </div>
  );
}

// ── 6-Day Level Cards ──────────────────────────────────────────────────────────
function SixDayLevelCards({ onSelect }) {
  return (
    <div className="six-day-level-section">
      <p className="section-eyebrow" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Choose Your Level</p>
      <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>6-DAY ELITE PPL</h2>
      <div className="level-cards-grid" style={{display: "flex", justifyContent: "center",alignItems: "center",}}>
        <div className="level-card level-card-advanced">
          <div className="level-card-badge">Push-Pull-Leg</div>
          <div className="level-card-icon">💀</div>
          <h3>Ultimate Workout Plan</h3>
          <p>High frequency, Normal volume PPL for lifters who have built a strong base. Just for beginners.</p>
          <ul className="level-features">
            <li>✅ 7–8 exercises per day</li>
            <li>✅ 9–12 rep range with light work</li>
            <li>✅ 6–12 rep range with heavy work</li>
            <li>✅ 90–120s rest periods</li>
            <li>✅ Basic techniques</li>
          </ul>
          <div className="level-note">⚠️ Warning! This Trainnig Will Make You Beast 💪</div>
          <button className="btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => onSelect('advanced')}>Start Workout Plan</button>
        </div>
      </div>
    </div>
  );
}

// ── Plan Selector ──────────────────────────────────────────────────────────────
function PlanSelector({ currentDays, onSelect }) {
  const plans = Object.values(workoutPlans).filter(p => p.days !== 3);
  const badges = { 4: 'Intermediate', 5: 'Advanced', 6: 'Elite' };
  const badgeColors = { 4: '#39ff14', 5: '#ffd700', 6: '#ff4500' };
  const locked = { 4: true, 5: true };

  const handleDownloadPlan = (e, days) => {
    e.stopPropagation();
    if (locked[days]) return;
    const link = document.createElement('a');
    link.href = '/WorkoutPlan_6Day.pdf';
    link.download = `BeingXLean_${days}Day_WorkoutPlan.pdf`;
    link.click();
  };

  return (
    <div className="plan-selector-section">
      <div className="plan-selector-inner">
        <p className="section-eyebrow" style={{ textAlign: 'center' }}>Choose Your Training Frequency</p>
        <h2 className="section-title plan-selector-title">SELECT YOUR SPLIT</h2>
        <div className="plan-selector-grid">
          {plans.map(plan => (
            <div key={plan.days} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className={`plan-select-card ${currentDays === plan.days ? 'active' : ''} ${locked[plan.days] ? 'locked-card' : ''}`}
                style={{ '--plan-color': plan.color, borderColor: currentDays === plan.days ? plan.color : undefined, boxShadow: currentDays === plan.days ? `0 0 25px ${plan.color}44` : undefined }}
                onClick={() => onSelect(plan.days)}>
                {locked[plan.days] && <div className="lock-badge">🔒</div>}
                <span className="psc-badge" style={{ color: badgeColors[plan.days], background: `${badgeColors[plan.days]}18`, border: `1px solid ${badgeColors[plan.days]}44` }}>{badges[plan.days]}</span>
                <div className="psc-num" style={{ color: plan.color }}>{plan.days}</div>
                <div className="psc-label">{plan.label}</div>
                <div className="psc-sub">{plan.subtitle}</div>
              </button>
              {locked[plan.days] ? (
                <button className="plan-dl-btn plan-dl-locked" disabled>
                  🔒 PDF Locked
                </button>
              ) : (
                <button
                  className="plan-dl-btn plan-dl-active"
                  style={{ borderColor: plan.color, color: plan.color }}
                  onClick={(e) => handleDownloadPlan(e, plan.days)}
                >
                  ⬇️ Download PDF
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Workout Page ──────────────────────────────────────────────────────────
export default function Workout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const daysParam = parseInt(searchParams.get('days')) || 6;
  const [selectedDays, setSelectedDays] = useState([4, 5, 6].includes(daysParam) ? daysParam : 6);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [lockedPlan, setLockedPlan] = useState(null);
  const [sixDayLevel, setSixDayLevel] = useState(null);
  const workoutRef = useRef(null);
  const dayTabsRef = useRef(null);
  const contentAnchorRef = useRef(null);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    if (!hasPlan(user, 'workout')) { navigate('/pricing?for=workout', { replace: true }); return; }
  }, [user, authLoading, navigate]);

  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const unlocked = !!user && hasPlan(user, 'workout');

  useEffect(() => {
    if (!unlocked) return;
    if (!shouldShowReviewPopup(user)) return;
    const timer = setTimeout(() => setShowReviewPopup(true), 45000); // 45s after unlock
    return () => clearTimeout(timer);
  }, [unlocked, user]);

  const plan = workoutPlans[selectedDays];
  
  const activeSchedule = (selectedDays === 6 && sixDayLevel === 'advanced' && plan.advancedSchedule)
    ? plan.advancedSchedule
    : plan.schedule;
  const activeDay = activeSchedule[activeDayIndex];
  const planSectionRef = useRef(null);

  useEffect(() => { setActiveDayIndex(0); }, [selectedDays]);

  // Scroll to plan section when page loads with a days param (from Home "6 Day Split" click)
  useEffect(() => {
    if (daysParam && [4,5,6].includes(daysParam)) {
      const timer = setTimeout(() => {
        planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectDays = (days) => {
    if (days === 4 || days === 5) {
      setLockedPlan(workoutPlans[days]);
      return;
    }
    setLockedPlan(null);
    if (days === 6) setSixDayLevel(null);
    setSelectedDays(days);
    setSearchParams({ days });
    // Scroll straight to the level card / plan content that appears below,
    // instead of just the top selector row (user shouldn't have to hunt for it).
    setTimeout(() => {
      contentAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSixDayLevelSelect = (level) => {
    setSixDayLevel(level);
    // Scroll down to the day tabs / plan content once it renders,
    // instead of the card just disappearing and the page jumping.
    setTimeout(() => {
      dayTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDaySelect = (i) => {
    setActiveDayIndex(i);
    setTimeout(() => workoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/WorkoutPlan_6Day.pdf';
    link.download = 'BeingXLean_6Day_WorkoutPlan.pdf';
    link.click();
  };

  if (authLoading) return null;
  if (!user || !hasPlan(user, 'workout')) return null;

  return (
    <div className="workout-page">
      <div className="noise-overlay" />
      <div className="workout-header">
        <div className="wh-bg"><div className="wh-orb" style={{ background: plan.color }}></div></div>
        <div className="wh-content">
          <p className="section-eyebrow">Push · Pull · Legs Program</p>
          <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}>WORKOUT PLAN</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Select your training split, then click any exercise to expand form tips</p>
          <button className="btn-outline download-btn" onClick={handleDownload}>⬇️ Download PDF Plan</button>
        </div>
      </div>

      <div ref={planSectionRef}>
        <PlanSelector currentDays={selectedDays} onSelect={handleSelectDays} />
      </div>

      <div ref={contentAnchorRef}>
        {/* 6-Day Level Selection */}
        {selectedDays === 6 && sixDayLevel === null && (
          <SixDayLevelCards onSelect={handleSixDayLevelSelect} />
        )}

        {/* Day Tabs (shown when not in level-select mode for 6-day) */}
        {(selectedDays !== 6 || sixDayLevel !== null) && (
          <>
            {selectedDays === 6 && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Mode: <strong style={{ color: 'var(--accent)' }}>{sixDayLevel === 'advanced' ? '💀 Advanced' : '🌱 Beginner/Intermediate'}</strong>
                </span>
                <button className="btn-outline" style={{ marginLeft: '1rem', padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => setSixDayLevel(null)}>Change Level</button>
              </div>
            )}
            <div className="day-tabs-wrap" ref={dayTabsRef}>
              <div className="day-tabs">
                {activeSchedule.map((day, i) => (
                  <button key={i} className={`day-tab ${activeDayIndex === i ? 'active' : ''}`}
                    style={activeDayIndex === i ? { borderColor: day.color, color: day.color } : {}}
                    onClick={() => handleDaySelect(i)}>
                    <span className="tab-emoji">{day.emoji}</span>
                    <div>
                      <span className="tab-day">{day.day}</span>
                      <span className="tab-name">{day.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="workout-content" ref={workoutRef}>
              <div className="day-intro" style={{ borderColor: activeDay.color }}>
                <div className="day-intro-header">
                  <span className="day-big-emoji">{activeDay.emoji}</span>
                  <div>
                    <h2 className="day-intro-title">{activeDay.day}: {activeDay.title}</h2>
                    <p className="day-intro-desc">{plan.description}</p>
                  </div>
                </div>
                <div className="day-meta">
                  <span>📊 {activeDay.exercises.length} Exercises</span>
                  <span>🔁 9–12 Reps</span>
                  <span>⏱️ 60–90s Rest</span>
                  <span>🎯 {activeDay.focus}</span>
                </div>
              </div>

              <div className="exercises-grid">
                {activeDay.exercises.map((exId, i) => {
                  const ex = exerciseDB[exId];
                  if (!ex) return null;
                  return (
                    <div key={ex.id} style={{ animationDelay: `${i * 0.08}s`, animation: 'fadeInUp 0.5s ease both' }}>
                      <ExerciseCard exercise={ex} dayColor={activeDay.color} />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Locked plan modal */}
      {lockedPlan && <LockedPlanCard plan={lockedPlan} onClose={() => setLockedPlan(null)} />}
      {lockedPlan && <div className="locked-backdrop" onClick={() => setLockedPlan(null)}></div>}

      <div className="workout-guidelines">
        <h3 className="section-title" style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>TRAINING GUIDELINES</h3>
        <div className="guidelines-grid-wk">
          {generalGuidelines.map((g, i) => (
            <div key={i} className="guideline-item">
              <span className="gi-icon">{g.icon}</span>
              <div><h4 className="gi-title">{g.title}</h4><p className="gi-text">{g.text}</p></div>
            </div>
          ))}
        </div>
      </div>

      {showReviewPopup && (
        <ReviewPopup
          plan="workout"
          onClose={() => { markPrompted(user); setShowReviewPopup(false); }}
        />
      )}
    </div>
  );
}