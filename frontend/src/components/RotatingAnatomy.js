import React, { useState } from 'react';
import bodyFront from '../assets/body-front.png';
import bodyBack from '../assets/body-back.png';
import './RotatingAnatomy.css';

// Hotspots positioned as % of the image (left, top, width, height).
// Each maps to a muscle group key used by muscleGroupExercises.
const FRONT_HOTSPOTS = [
  { group: 'chest',     left: 38, top: 22, w: 24, h: 10, label: 'Chest' },
  { group: 'shoulders', left: 22, top: 19, w: 14, h: 8,  label: 'Shoulder' },
  { group: 'shoulders', left: 64, top: 19, w: 14, h: 8,  label: 'Shoulder' },
  { group: 'arms',      left: 14, top: 28, w: 12, h: 12, label: 'Biceps' },
  { group: 'arms',      left: 74, top: 28, w: 12, h: 12, label: 'Biceps' },
  { group: 'core',      left: 38, top: 33, w: 24, h: 14, label: 'Abs' },
  { group: 'legs',      left: 30, top: 52, w: 18, h: 22, label: 'Quads' },
  { group: 'legs',      left: 52, top: 52, w: 18, h: 22, label: 'Quads' },
  { group: 'legs',      left: 32, top: 80, w: 14, h: 14, label: 'Calves' },
  { group: 'legs',      left: 54, top: 80, w: 14, h: 14, label: 'Calves' },
];

const BACK_HOTSPOTS = [
  { group: 'shoulders', left: 22, top: 19, w: 14, h: 8,  label: 'Rear Delt' },
  { group: 'shoulders', left: 64, top: 19, w: 14, h: 8,  label: 'Rear Delt' },
  { group: 'back',      left: 36, top: 22, w: 28, h: 8,  label: 'Traps' },
  { group: 'back',      left: 32, top: 30, w: 36, h: 16, label: 'Lats' },
  { group: 'arms',      left: 14, top: 28, w: 12, h: 12, label: 'Triceps' },
  { group: 'arms',      left: 74, top: 28, w: 12, h: 12, label: 'Triceps' },
  { group: 'legs',      left: 32, top: 47, w: 16, h: 8,  label: 'Glutes' },
  { group: 'legs',      left: 52, top: 47, w: 16, h: 8,  label: 'Glutes' },
  { group: 'legs',      left: 32, top: 58, w: 16, h: 18, label: 'Hamstrings' },
  { group: 'legs',      left: 52, top: 58, w: 16, h: 18, label: 'Hamstrings' },
  { group: 'legs',      left: 32, top: 80, w: 14, h: 14, label: 'Calves' },
  { group: 'legs',      left: 54, top: 80, w: 14, h: 14, label: 'Calves' },
];

export default function RotatingAnatomy({ onMuscleClick }) {
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={`rot-anatomy ${paused ? 'paused' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="rot-stage">
        <div className="rot-shadow" />
        <div className="rot-cube">
          {/* FRONT face */}
          <div className="rot-face rot-face-front">
            <img src={bodyFront} alt="Front muscle anatomy" className="rot-img" />
            {FRONT_HOTSPOTS.map((h, i) => (
              <button
                key={`f-${i}`}
                type="button"
                className="rot-hotspot"
                style={{ left: `${h.left}%`, top: `${h.top}%`, width: `${h.w}%`, height: `${h.h}%` }}
                title={`${h.label} — click for exercises`}
                onClick={(e) => { e.stopPropagation(); onMuscleClick(h.group); }}
              >
                <span className="rot-hot-label">{h.label}</span>
              </button>
            ))}
          </div>
          {/* BACK face */}
          <div className="rot-face rot-face-back">
            <img src={bodyBack} alt="Back muscle anatomy" className="rot-img" />
            {BACK_HOTSPOTS.map((h, i) => (
              <button
                key={`b-${i}`}
                type="button"
                className="rot-hotspot"
                style={{ left: `${h.left}%`, top: `${h.top}%`, width: `${h.w}%`, height: `${h.h}%` }}
                title={`${h.label} — click for exercises`}
                onClick={(e) => { e.stopPropagation(); onMuscleClick(h.group); }}
              >
                <span className="rot-hot-label">{h.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="rot-caption">
        <span className="rot-pulse" /> Auto-rotating 360° · Hover to pause · Click any muscle
      </div>
    </div>
  );
}
