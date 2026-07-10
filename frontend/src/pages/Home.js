/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { generalGuidelines, muscleGroupExercises, exerciseDB } from '../context/workoutData';
import './Home.css';
import beingxleanimg from '../assets/gifs/beingxleanimg.png';
import ImageGallery from './ImageGallery';
import './ImageGallery.css';

// ─── MUSCLE COLORS ────────────────────────────────────────────────────────────
const MC = {
  chest:'#e8516a', pec_minor:'#c94060', shoulder:'#e8874a', delt_ant:'#d4763a',
  bicep:'#5b9bd5', bicep_lh:'#4a88c2', forearm:'#b07a3c', forearm2:'#c98840',
  abs:'#e85c3a', oblique:'#d4472e', serratus:'#c94030', neck:'#d4b896',
  trap:'#7ab87a', lat:'#5a9e7a', rhomboid:'#4a8e6a', teres:'#3a7e5a',
  infrasp:'#6aae8a', tricep:'#8a6ab8', tricep_lh:'#7a5aa8', forearm_b:'#a07838',
  glute_max:'#e8a84a', glute_med:'#d49838', quad:'#9b59b6', quad2:'#8e4da8',
  vl:'#b06ec0', vm:'#9a5eb0', rf:'#a060b8', ham:'#e87a3a', ham2:'#d86a2a',
  calf:'#5ab8d8', calf2:'#4aa8c8', tibialis:'#6ac8e8', it_band:'#c8a050',
  adductor:'#7888c8', skin:'#d4956a', bone:'#e8d8b0', erector:'#6a9868', thoraco:'#5a8858',
};

const CLICKED_COLOR = '#ff3030';

// ─── GALLERY IMAGES ───────────────────────────────────────────────────────────
const GALLERY_IMAGES = [
  { url: '/images/mainbeing.PNG', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being2.jpeg', label: 'Photo Two', tag: '' },
  { url: '/images/being3.PNG', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being41.jpeg', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being5.PNG', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being6.PNG', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being8.PNG', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being9.PNG', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
  { url: '/images/being10.jpeg', label: 'Bᴇɪɴɢ_Ӽ_ʟᴇᴀɴ', tag: '' },
];

// ─── FRONT BODY SVG ──────────────────────────────────────────────────────────
function FrontBody({ onHover, onClickMuscle, hoveredGroup, clickedGroup }) {
  const isH = (g) => hoveredGroup === g || clickedGroup === g;
  const getColor = (g, base) => clickedGroup === g ? CLICKED_COLOR : base;
  const opacity = (g) => isH(g) ? 1 : 0.88;
  const filter = (g) => isH(g) ? 'url(#glow)' : 'none';
  const mk = (g) => ({
    onMouseEnter: () => onHover(g), onMouseLeave: () => onHover(null),
    onClick: () => onClickMuscle(g), style: { cursor: 'pointer' }
  });

  return (
    <svg viewBox="0 0 220 520" xmlns="http://www.w3.org/2000/svg" className="body-svg">
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="110" cy="32" rx="26" ry="30" fill={MC.skin} stroke="#b07050" strokeWidth="0.8"/>
      <ellipse cx="110" cy="14" rx="26" ry="16" fill="#3a2a1a"/>
      <ellipse cx="110" cy="20" rx="26" ry="8" fill="#3a2a1a"/>
      <rect x="101" y="59" width="18" height="20" rx="4" fill={MC.skin} stroke="#b07050" strokeWidth="0.6" {...mk('neck')}/>
      <path d="M84,62 Q95,56 110,60 Q125,56 136,62 Q130,78 110,80 Q90,78 84,62Z" fill={getColor('back', MC.trap)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <ellipse cx="80" cy="96" rx="20" ry="18" fill={getColor('shoulders', MC.shoulder)} opacity={opacity('shoulders')} filter={filter('shoulders')} {...mk('shoulders')}/>
      <ellipse cx="80" cy="90" rx="15" ry="12" fill={getColor('shoulders', MC.delt_ant)} opacity={opacity('shoulders')} filter={filter('shoulders')} {...mk('shoulders')}/>
      <ellipse cx="140" cy="96" rx="20" ry="18" fill={getColor('shoulders', MC.shoulder)} opacity={opacity('shoulders')} filter={filter('shoulders')} {...mk('shoulders')}/>
      <ellipse cx="140" cy="90" rx="15" ry="12" fill={getColor('shoulders', MC.delt_ant)} opacity={opacity('shoulders')} filter={filter('shoulders')} {...mk('shoulders')}/>
      <path d="M87,80 Q88,78 110,82 L110,116 Q96,120 84,112 Q80,102 87,80Z" fill={getColor('chest', MC.chest)} opacity={opacity('chest')} filter={filter('chest')} {...mk('chest')}/>
      <path d="M133,80 Q132,78 110,82 L110,116 Q124,120 136,112 Q140,102 133,80Z" fill={getColor('chest', MC.chest)} opacity={opacity('chest')} filter={filter('chest')} {...mk('chest')}/>
      <path d="M83,110 Q80,124 82,140 Q88,136 90,122Z" fill={getColor('chest', MC.serratus)} opacity={opacity('chest')} {...mk('chest')}/>
      <path d="M137,110 Q140,124 138,140 Q132,136 130,122Z" fill={getColor('chest', MC.serratus)} opacity={opacity('chest')} {...mk('chest')}/>
      <rect x="96" y="118" width="28" height="82" rx="6" fill={getColor('core', MC.abs)} opacity={opacity('core')} filter={filter('core')} {...mk('core')}/>
      {[0,1,2].map(i=>(
        <React.Fragment key={i}>
          <rect x="97" y={120+i*26} width="12" height="22" rx="3" fill={getColor('core',MC.abs)} stroke="#c04030" strokeWidth="0.6" opacity={opacity('core')} {...mk('core')}/>
          <rect x="111" y={120+i*26} width="12" height="22" rx="3" fill={getColor('core',MC.abs)} stroke="#c04030" strokeWidth="0.6" opacity={opacity('core')} {...mk('core')}/>
        </React.Fragment>
      ))}
      <line x1="110" y1="118" x2="110" y2="200" stroke="#a03020" strokeWidth="0.8" opacity="0.6"/>
      <path d="M83,118 Q88,118 96,122 L96,200 Q85,188 80,168 Q78,148 83,118Z" fill={getColor('core',MC.oblique)} opacity={opacity('core')} filter={filter('core')} {...mk('core')}/>
      <path d="M137,118 Q132,118 124,122 L124,200 Q135,188 140,168 Q142,148 137,118Z" fill={getColor('core',MC.oblique)} opacity={opacity('core')} filter={filter('core')} {...mk('core')}/>
      <path d="M62,90 Q60,88 56,96 Q52,110 54,126 Q58,134 66,134 Q74,130 76,116 Q78,100 72,90Z" fill={getColor('arms',MC.bicep)} opacity={opacity('arms')} filter={filter('arms')} {...mk('arms')}/>
      <path d="M158,90 Q160,88 164,96 Q168,110 166,126 Q162,134 154,134 Q146,130 144,116 Q142,100 148,90Z" fill={getColor('arms',MC.bicep)} opacity={opacity('arms')} filter={filter('arms')} {...mk('arms')}/>
      <path d="M54,134 Q48,140 44,158 Q42,172 46,186 Q50,190 56,188 Q62,184 64,168 Q66,150 66,136Z" fill={getColor('arms',MC.forearm)} opacity={opacity('arms')} filter={filter('arms')} {...mk('arms')}/>
      <path d="M166,134 Q172,140 176,158 Q178,172 174,186 Q170,190 164,188 Q158,184 156,168 Q154,150 154,136Z" fill={getColor('arms',MC.forearm)} opacity={opacity('arms')} filter={filter('arms')} {...mk('arms')}/>
      <ellipse cx="49" cy="196" rx="9" ry="14" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <ellipse cx="171" cy="196" rx="9" ry="14" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <path d="M88,200 Q95,196 110,198 Q125,196 132,200 Q138,210 136,222 Q124,228 110,230 Q96,228 84,222 Q82,210 88,200Z" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <path d="M96,230 Q91,236 88,260 Q86,284 88,308 Q92,320 98,322 Q106,318 108,300 Q110,276 108,250 Q106,234 96,230Z" fill={getColor('legs',MC.rf)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M89,232 Q82,242 78,268 Q76,292 80,314 Q84,322 90,322 Q94,314 94,296 Q94,270 90,248Z" fill={getColor('legs',MC.vl)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M104,294 Q108,296 110,308 Q108,320 102,324 Q97,322 96,312 Q95,300 104,294Z" fill={getColor('legs',MC.vm)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M124,230 Q129,236 132,260 Q134,284 132,308 Q128,320 122,322 Q114,318 112,300 Q110,276 112,250 Q114,234 124,230Z" fill={getColor('legs',MC.rf)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M131,232 Q138,242 142,268 Q144,292 140,314 Q136,322 130,322 Q126,314 126,296 Q126,270 130,248Z" fill={getColor('legs',MC.vl)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M116,294 Q112,296 110,308 Q112,320 118,324 Q123,322 124,312 Q125,300 116,294Z" fill={getColor('legs',MC.vm)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <ellipse cx="94" cy="328" rx="14" ry="10" fill="#c8b898" stroke="#a09070" strokeWidth="0.6"/>
      <ellipse cx="126" cy="328" rx="14" ry="10" fill="#c8b898" stroke="#a09070" strokeWidth="0.6"/>
      <path d="M82,338 Q78,350 78,368 Q80,386 84,398 Q88,408 94,408 Q100,406 102,392 Q104,374 100,354 Q96,340 88,336Z" fill={getColor('legs',MC.calf)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M100,338 Q104,352 104,370 Q104,386 102,400 Q98,402 96,398 Q94,378 94,358 Q94,344 98,338Z" fill={getColor('legs',MC.tibialis)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M138,338 Q142,350 142,368 Q140,386 136,398 Q132,408 126,408 Q120,406 118,392 Q116,374 120,354 Q124,340 132,336Z" fill={getColor('legs',MC.calf)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M120,338 Q116,352 116,370 Q116,386 118,400 Q122,402 124,398 Q126,378 126,358 Q126,344 122,338Z" fill={getColor('legs',MC.tibialis)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <ellipse cx="91" cy="416" rx="13" ry="7" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <ellipse cx="129" cy="416" rx="13" ry="7" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <text x="33" y="90" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Shoulders</text>
      <line x1="63" y1="92" x2="44" y2="90" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="168" y="98" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Arms</text>
      <line x1="162" y1="108" x2="176" y2="102" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="150" y="82" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Chest</text>
      <line x1="120" y1="96" x2="152" y2="84" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="14" y="148" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Core</text>
      <line x1="96" y1="150" x2="32" y2="150" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="10" y="270" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Legs</text>
      <line x1="78" y1="268" x2="28" y2="270" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="4" y="376" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Calves</text>
      <line x1="80" y1="370" x2="26" y2="374" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  );
}

// ─── BACK BODY SVG ───────────────────────────────────────────────────────────
function BackBody({ onHover, onClickMuscle, hoveredGroup, clickedGroup }) {
  const isH = (g) => hoveredGroup === g || clickedGroup === g;
  const getColor = (g, base) => clickedGroup === g ? CLICKED_COLOR : base;
  const opacity = (g) => isH(g) ? 1 : 0.88;
  const filter = (g) => isH(g) ? 'url(#glowB)' : 'none';
  const mk = (g) => ({
    onMouseEnter: () => onHover(g), onMouseLeave: () => onHover(null),
    onClick: () => onClickMuscle(g), style: { cursor: 'pointer' }
  });

  return (
    <svg viewBox="0 0 220 520" xmlns="http://www.w3.org/2000/svg" className="body-svg">
      <defs>
        <filter id="glowB" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="110" cy="32" rx="26" ry="30" fill={MC.skin} stroke="#b07050" strokeWidth="0.8"/>
      <ellipse cx="110" cy="14" rx="26" ry="16" fill="#3a2a1a"/>
      <ellipse cx="110" cy="22" rx="26" ry="10" fill="#3a2a1a"/>
      <rect x="101" y="59" width="18" height="20" rx="4" fill={MC.skin} stroke="#b07050" strokeWidth="0.6"/>
      <path d="M84,62 Q95,56 110,60 Q125,56 136,62 Q140,80 138,96 Q130,108 110,110 Q90,108 82,96 Q80,80 84,62Z" fill={getColor('back',MC.trap)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <ellipse cx="80" cy="96" rx="20" ry="18" fill={getColor('shoulders',MC.shoulder)} opacity={opacity('shoulders')} filter={filter('shoulders')} {...mk('shoulders')}/>
      <ellipse cx="140" cy="96" rx="20" ry="18" fill={getColor('shoulders',MC.shoulder)} opacity={opacity('shoulders')} filter={filter('shoulders')} {...mk('shoulders')}/>
      <path d="M84,98 Q90,96 108,98 L108,116 Q96,120 84,116Z" fill={getColor('back',MC.rhomboid)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <path d="M112,98 Q118,96 136,98 L136,116 Q124,120 112,116Z" fill={getColor('back',MC.rhomboid)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <path d="M82,116 Q84,118 88,126 Q90,144 88,164 Q86,176 88,190 Q92,196 96,196 Q100,188 100,170 Q100,148 98,128 Q96,118 90,116Z" fill={getColor('back',MC.lat)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <path d="M138,116 Q136,118 132,126 Q130,144 132,164 Q134,176 132,190 Q128,196 124,196 Q120,188 120,170 Q120,148 122,128 Q124,118 130,116Z" fill={getColor('back',MC.lat)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <rect x="104" y="118" width="7" height="76" rx="3" fill={getColor('back',MC.erector)} opacity={opacity('back')} filter={filter('back')} {...mk('back')}/>
      <rect x="109" y="118" width="7" height="76" rx="3" fill={getColor('back',MC.erector)} opacity={opacity('back')} {...mk('back')}/>
      <path d="M63,90 Q58,92 54,108 Q52,124 56,136 Q60,142 66,140 Q72,136 74,122 Q76,106 72,94Z" fill={getColor('arms',MC.tricep)} opacity={opacity('arms')} filter={filter('arms')} {...mk('arms')}/>
      <path d="M157,90 Q162,92 166,108 Q168,124 164,136 Q160,142 154,140 Q148,136 146,122 Q144,106 148,94Z" fill={getColor('arms',MC.tricep)} opacity={opacity('arms')} filter={filter('arms')} {...mk('arms')}/>
      <path d="M54,140 Q50,148 46,164 Q44,180 48,192 Q52,196 58,194 Q64,190 66,174 Q66,156 64,142Z" fill={getColor('arms',MC.forearm_b)} opacity={opacity('arms')} {...mk('arms')}/>
      <path d="M166,140 Q170,148 174,164 Q176,180 172,192 Q168,196 162,194 Q156,190 154,174 Q154,156 156,142Z" fill={getColor('arms',MC.forearm_b)} opacity={opacity('arms')} {...mk('arms')}/>
      <ellipse cx="49" cy="200" rx="9" ry="12" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <ellipse cx="171" cy="200" rx="9" ry="12" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <path d="M88,224 Q82,228 80,244 Q80,258 86,268 Q92,274 100,272 Q108,268 110,254 Q110,238 104,228 Q96,222 88,224Z" fill={getColor('legs',MC.glute_max)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M132,224 Q138,228 140,244 Q140,258 134,268 Q128,274 120,272 Q112,268 110,254 Q110,238 116,228 Q124,222 132,224Z" fill={getColor('legs',MC.glute_max)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M80,274 Q76,290 76,314 Q78,330 84,336 Q90,338 94,328 Q96,310 94,286 Q92,274 86,272Z" fill={getColor('legs',MC.ham)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M96,272 Q100,278 102,296 Q102,318 100,330 Q96,338 92,334 Q94,314 94,290 Q94,278 96,272Z" fill={getColor('legs',MC.ham2)} opacity={opacity('legs')} {...mk('legs')}/>
      <path d="M140,274 Q144,290 144,314 Q142,330 136,336 Q130,338 126,328 Q124,310 126,286 Q128,274 134,272Z" fill={getColor('legs',MC.ham)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M124,272 Q120,278 118,296 Q118,318 120,330 Q124,338 128,334 Q126,314 126,290 Q126,278 124,272Z" fill={getColor('legs',MC.ham2)} opacity={opacity('legs')} {...mk('legs')}/>
      <ellipse cx="90" cy="338" rx="14" ry="10" fill="#c8b898" stroke="#a09070" strokeWidth="0.6"/>
      <ellipse cx="130" cy="338" rx="14" ry="10" fill="#c8b898" stroke="#a09070" strokeWidth="0.6"/>
      <path d="M78,348 Q74,362 74,378 Q76,396 82,406 Q88,414 94,412 Q100,408 102,394 Q104,374 100,356 Q96,342 88,340 Q82,340 78,348Z" fill={getColor('legs',MC.calf)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <path d="M142,348 Q146,362 146,378 Q144,396 138,406 Q132,414 126,412 Q120,408 118,394 Q116,374 120,356 Q124,342 132,340 Q138,340 142,348Z" fill={getColor('legs',MC.calf)} opacity={opacity('legs')} filter={filter('legs')} {...mk('legs')}/>
      <ellipse cx="90" cy="420" rx="13" ry="7" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <ellipse cx="130" cy="420" rx="13" ry="7" fill={MC.skin} stroke="#a06840" strokeWidth="0.6"/>
      <text x="148" y="78" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Back</text>
      <line x1="136" y1="88" x2="152" y2="80" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="148" y="140" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Triceps</text>
      <line x1="155" y1="110" x2="158" y2="136" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="4" y="160" fontSize="5" fill="var(--text-secondary)" fontFamily="Barlow Condensed">Lats</text>
      <line x1="88" y1="148" x2="22" y2="158" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="148" y="248" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Glutes</text>
      <line x1="134" y1="256" x2="150" y2="250" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="148" y="306" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Hamstrings</text>
      <line x1="140" y1="304" x2="152" y2="306" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
      <text x="4" y="380" fontSize="6" fill="var(--text-secondary)" fontFamily="Barlow Condensed" fontWeight="600">Calves</text>
      <line x1="76" y1="374" x2="26" y2="378" stroke="var(--text-secondary)" strokeWidth="0.5" opacity="0.5"/>
    </svg>
  );
}

// ─── MUSCLE MODAL ─────────────────────────────────────────────────────────────
function MuscleModal({ muscleGroup, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const data = muscleGroupExercises[muscleGroup];
  const exercises = data.exercises.map(id => exerciseDB[id]).filter(Boolean);
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="muscle-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderColor: data.color }}>
          <div className="modal-title-row">
            <span className="modal-icon">{data.icon}</span>
            <div>
              <p className="modal-eyebrow">Muscle Group</p>
              <h2 className="modal-title" style={{ color: data.color }}>{data.label.toUpperCase()} EXERCISES</h2>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-exercises">
          {exercises.map(ex => (
            <div className="modal-exercise-card" key={ex.id} style={{ '--ex-color': data.color }}>
              <div className="mec-left"><span className="mec-emoji">{ex.emoji}</span></div>
              <div className="mec-body">
                <div className="mec-header">
                  <div>
                    <h3 className="mec-name">{ex.name}</h3>
                    <span className="mec-muscle">{ex.muscle}</span>
                  </div>
                  <div className="mec-meta">
                    <span className="mec-sets">{ex.detail}</span>
                    <span className="mec-reps" style={{ color: data.color }}>{ex.reps}</span>
                  </div>
                </div>
                <div className="mec-tips">
                  {ex.tips.slice(0, 2).map((tip, i) => <span key={i} className="mec-tip">• {tip}</span>)}
                </div>
                <div className="mec-muscles">
                  {ex.targetMuscles.map(m => <span key={m} className="muscle-chip">{m}</span>)}
                </div>
                <a href={ex.youtubeUrl} target="_blank" rel="noopener noreferrer" className="yt-link">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 6.19a3.02 3.02 0 00-2.13-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.37.55A3.02 3.02 0 00.5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 002.13 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.37-.55a3.02 3.02 0 002.13-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
                  </svg>
                  Watch on YouTube
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <Link to={user ? "/workout" : "/auth"} className="btn-primary" onClick={onClose} style={{ background: `linear-gradient(135deg,${data.color},${data.color}99)` }}>
            View Full Workout Plan →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── INFLUENCER GALLERY ────────────────────────────────────────────────────────
const INFLUENCERS = [
  { name: 'Arnold Classic', emoji: '🏆', color: '#ff4500', desc: 'Legendary Physique' },
  { name: 'Chris Bumstead', emoji: '👑', color: '#ffd700', desc: 'Classic Physique GOAT' },
  { name: 'Jeff Nippard', emoji: '🔬', color: '#00bfff', desc: 'Science-Based Training' },
  { name: 'Mike Mentzer', emoji: '⚡', color: '#bf00ff', desc: 'HIT Training Pioneer' },
  { name: 'Ronnie Coleman', emoji: '💪', color: '#ff3b6b', desc: '8x Mr. Olympia' },
  { name: 'Frank Zane', emoji: '🎯', color: '#39ff14', desc: 'Aesthetic Icon' },
  { name: 'Larry Wheels', emoji: '🔥', color: '#ff8c00', desc: 'Strength Legend' },
  { name: 'David Laid', emoji: '✨', color: '#5b9bd5', desc: 'Natural Aesthetic' },
];

function InfluencerGallery() {
  const trackRef = useRef(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let x = 0;
    const speed = 0.5;
    let rafId;
    const animate = () => {
      x -= speed;
      const total = track.scrollWidth / 2;
      if (Math.abs(x) >= total) x = 0;
      track.style.transform = `translateX(${x}px)`;
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const doubled = [...INFLUENCERS, ...INFLUENCERS];

  return (
    <section className="gallery-section">
      <div className="gallery-header">
        <p className="section-eyebrow">Hall of Fame</p>
        <h2 className="section-title">LEGENDS OF IRON</h2>
        <p className="section-desc">Inspired by the greatest physiques ever built</p>
      </div>
      <div className="gallery-track-container">
        <div className="gallery-fade-left"></div>
        <div className="gallery-fade-right"></div>
        <div className="gallery-track" ref={trackRef}>
          {doubled.map((inf, i) => (
            <div className="gallery-card" key={i} style={{ '--inf-color': inf.color }}>
              <div className="gallery-emoji-wrap" style={{ background: `radial-gradient(circle, ${inf.color}33, transparent)` }}>
                <span className="gallery-emoji">{inf.emoji}</span>
              </div>
              <h4 className="gallery-name">{inf.name}</h4>
              <p className="gallery-desc">{inf.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── MOTIVATIONAL STATS STRIP ─────────────────────────────────────────────────
function StatsStrip() {
  const stats = [
    { num: '10,000+', label: 'Workouts Tracked', icon: '🏋️' },
    { num: '500+', label: 'Active Members', icon: '💪' },
    { num: '95%', label: 'Goal Achievement Rate', icon: '🎯' },
    { num: '6', label: 'Training Splits', icon: '📋' },
  ];
  return (
    <section className="stats-strip">
      <div className="stats-strip-inner">
        {stats.map((s, i) => (
          <div className="strip-stat" key={i}>
            <span className="strip-icon">{s.icon}</span>
            <span className="strip-num">{s.num}</span>
            <span className="strip-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── PLAN CARDS (with auth guard) ─────────────────────────────────────────────
const PLAN_CARDS = [
  { days: 4, label: '4 Day Split', badge: 'Intermediate', color: '#39ff14', emoji: '⚡', desc: 'Upper/Lower Hybrid — 4 days for more volume.', locked: true },
  { days: 5, label: '5 Day Split', badge: 'Advanced', color: '#ffd700', emoji: '🔥', desc: 'High Frequency — 5 days for serious gains.', locked: true },
  { days: 6, label: '6 Day Split', badge: 'Elite', color: '#ff4500', emoji: '👑', desc: 'Elite Double PPL — 6 days for advanced athletes.' },
];

// ─── BRAND NAME ───────────────────────────────────────────────────────────────
function BrandName() {
  return (
    <div className="brand-name-container">
      <div className="brand-line">
        {'BEING'.split('').map((l, i) => <span key={i} className="brand-letter" style={{ animationDelay: `${i * 0.09}s` }}>{l}</span>)}
        <span className="brand-x">_X_</span>
        {'LEAN'.split('').map((l, i) => <span key={i} className="brand-letter brand-letter-2" style={{ animationDelay: `${(i + 6) * 0.09}s` }}>{l}</span>)}
      </div>
    </div>
  );
}

// ─── MAIN HOME ────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeMuscle, setActiveMuscle] = useState(null);
  const [hoveredGroup, setHoveredGroup] = useState(null);
  const [clickedGroup, setClickedGroup] = useState(null);
  const [view, setView] = useState('front');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleMuscleClick = (group) => {
    setClickedGroup(group);
    setActiveMuscle(group);
    setHoveredGroup(null);
  };

  const handleAuthGuardedNav = (path) => {
    if (!user) { navigate('/auth'); return; }
    navigate(path);
  };

  return (
    <div className="home">
      <div className="noise-overlay" />

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-video-bg">
          <div className="hero-gym-bg"></div>
          <div className="hero-overlay"></div>
        </div>

        <div className="hero-layout" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <div className="hero-text" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <div className="hero-badge-pill">Just · One · More · Rep</div>
            <BrandName />
            <p className="hero-subtitle">
              Elite workout & diet plans engineered for peak performance.
              Train smarter, eat with purpose, dominate your goals.
            </p>
            <div className="hero-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-primary hero-btn" onClick={() => handleAuthGuardedNav('/workout')}>🏋️ Workout Plans</button>
              <button className="btn-outline hero-btn" onClick={() => handleAuthGuardedNav('/diet')}>🥗 Diet Plans</button>
            </div>
            <div className="hero-stats" style={{ justifyContent: 'center' }}>
              <div className="stat"><span className="stat-num">3</span><span className="stat-label">Splits</span></div>
              <div className="stat-divider"></div>
              <div className="stat"><span className="stat-num">21</span><span className="stat-label">Exercises</span></div>
              <div className="stat-divider"></div>
              <div className="stat"><span className="stat-num">3</span><span className="stat-label">Diet Plans</span></div>
            </div>
          </div>
        </div>
      </section>
      {/* ── IMAGE GALLERY ── */}
      <ImageGallery
        images={GALLERY_IMAGES}
        title="My Gallery"
        subtitle="Click any photo to view"
      />

      {/* ── FEATURES ── */}
      <section className="features-section">
        <div className="container">
          <div className="features-grid">
            {[
              { icon: '🏋️', title: 'Workout Plans', desc: 'Structured PPL splits from 3-6 days/week', action: () => handleAuthGuardedNav('/workout') },
              { icon: '🥗', title: 'Diet Plans', desc: 'Personalized nutrition for your goals', action: () => handleAuthGuardedNav('/diet') },
              { icon: '📊', title: 'Progress Tracker', desc: 'Track workouts, calories & protein daily', action: () => handleAuthGuardedNav('/tracker') },
            ].map((f, i) => (
              <div key={i} className="feature-card reveal" style={{ animationDelay: `${i * 0.15}s` }} onClick={f.action}>
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <span className="feature-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <StatsStrip />

      {/* ── GUIDELINES ── */}
      <section className="guidelines-section">
        <div className="container">
          <div className="reveal">
            <p className="section-eyebrow">Rules to Live By</p>
            <h2 className="section-title">TRAINING PRINCIPLES</h2>
          </div>
          <div className="guidelines-grid">
            {generalGuidelines.map((g, i) => (
              <div className="guideline-card reveal" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="guideline-icon">{g.icon}</span>
                <h4 className="guideline-title">{g.title}</h4>
                <p className="guideline-text">{g.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-box reveal">
            <div className="cta-orb"></div>
            <h2 className="section-title">FORGE YOUR LEGACY</h2>
            <p>Elite workout plans designed for peak performance. Track your progress, master your form, dominate your goals.</p>
            <div className="cta-buttons">
              <button className="btn-primary" onClick={() => handleAuthGuardedNav('/workout')}>🏋️ Start Training</button>
              {!user && <Link to="/auth" className="btn-outline">Create Free Account</Link>}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-box reveal">
            <div className="cta-orb"></div>
            <h3 className="section-title"><div className='brand-x'>BEING_X_LEAN</div></h3>
            <div className="cta-buttons">
              <img src={beingxleanimg} alt="Workout" className="cta-image" />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">⚡ BEING_X_LEAN</span>
            <p className="footer-tagline">Built for those who don't quit.</p>
          </div>
          <div className="footer-about">
            <h4>About the Creator</h4>
            <p>This platform is created by a passionate fitness enthusiast dedicated to helping you build your best physique through science-backed training and nutrition.</p>
          </div>
          <div className="footer-contact">
            <h4>Connect With Us</h4>
            <div className="footer-links">
              <a href="https://mail.google.com/mail/u/0/?tab=rm&ogbl#search/prashantgola2017%40gmail.com?compose=new" className="footer-link"><img src="/images/gmail.png" alt="gmail" style={{ width: '18px', height: '18px', verticalAlign: 'middle', marginRight: '4px' }} />prashantgola2017@gmail.com</a>
              <a href="https://www.instagram.com/being_x_lean/" target="_blank" rel="noopener noreferrer" className="footer-link"><img src="/images/instagram.png" alt="Instagram" style={{ width: '18px', height: '18px', verticalAlign: 'middle', marginRight: '4px' }} /> @beingxlean</a>
              <a href="https://www.youtube.com/@Getfitwithprashant" target="_blank" rel="noopener noreferrer" className="footer-link"><img src="/images/youtube.png" alt="youtube" style={{ width: '18px', height: '18px', verticalAlign: 'middle', marginRight: '4px' }} /> YouTube</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 BEING_X_LEAN · All Rights Reserved · Powered by dedication & iron</p>
        </div>
      </footer>

      {/* ── MUSCLE MODAL ── */}
      {activeMuscle && muscleGroupExercises[activeMuscle] && (
        <MuscleModal
          muscleGroup={activeMuscle}
          onClose={() => { setActiveMuscle(null); setClickedGroup(null); }}
        />
      )}

    </div>
  );
}