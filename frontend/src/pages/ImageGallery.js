/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from 'react';

/* ── LIGHTBOX ── */
const Lightbox = ({ images, index, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const img = images[index];
  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <button className="lightbox-arrow lightbox-prev" onClick={e => { e.stopPropagation(); onPrev(); }}>‹</button>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <img
          src={img.url} alt={img.label} className="lightbox-img"
          onError={e => { e.target.src = `https://via.placeholder.com/800x500/333/fff?text=${encodeURIComponent(img.label)}`; }}
        />
        <div className="lightbox-info">
          <div className="lightbox-label">{img.label}</div>
          {img.tag && <span className="lightbox-tag">{img.tag}</span>}
          <div className="lightbox-counter">{index + 1} / {images.length}</div>
        </div>
      </div>
      <button className="lightbox-arrow lightbox-next" onClick={e => { e.stopPropagation(); onNext(); }}>›</button>
      <div className="lightbox-dots">
        {images.map((_, i) => (
          <button key={i} className={`lightbox-dot ${i === index ? 'active' : ''}`} onClick={e => e.stopPropagation()} />
        ))}
      </div>
    </div>
  );
};

/* ── MAIN GALLERY ── same props as before, no Home.js changes needed ── */
const ImageGallery = ({ images = [], title = 'Gallery', subtitle = '' }) => {
  const [centerIdx, setCenterIdx] = useState(0);
  const [lightbox, setLightbox]   = useState({ open: false, index: 0 });

  const trackRef   = useRef(null);
  const wrapperRef = useRef(null);
  const drag       = useRef({ active: false, startX: 0, startOffset: 0, lastX: 0, velocity: 0, lastTime: 0 });
  const offsetRef  = useRef(0);   // current translateX in px

  const GAP = 18; // matches CSS gap (approximate)

  /* card width from DOM */
  const cardW = () => {
    const c = trackRef.current?.querySelector('.gallery-card');
    return c ? c.offsetWidth + GAP : 280;
  };

  /* total width of one full set */
  const setW = () => cardW() * images.length;

  /* apply transform to track */
  const applyTransform = (px, animated = false) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = animated
      ? 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none';
    el.style.transform = `translateX(${px}px)`;
  };

  /* wrap offset so we're always in the middle copy (-setW to -2*setW) */
  const normalizeOffset = (px) => {
    const sw = setW();
    // we start at -sw (middle copy of tripled array)
    let v = px;
    while (v > -sw) v -= sw;
    while (v < -sw * 2) v += sw;
    return v;
  };

  /* figure out which card is centered in the viewport */
  const calcCenter = useCallback((px) => {
    if (!wrapperRef.current) return 0;
    const mid = wrapperRef.current.offsetWidth / 2;
    const cw  = cardW();
    const sw  = setW();
    // offset within one set
    const localOffset = ((px + sw) % sw + sw) % sw;  // always positive distance into one set
    // index of card whose center is closest to viewport center
    // card i left edge = i * cw - |px|  (relative to wrapper left)
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < images.length; i++) {
      const cardCenter = i * cw + cw / 2 - GAP / 2 + px + sw;
      const dist = Math.abs(cardCenter - mid);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best;
  }, [images.length]);

  /* snap to nearest card after drag */
  const snapToNearest = useCallback((px) => {
    if (!wrapperRef.current) return px;
    const mid  = wrapperRef.current.offsetWidth / 2;
    const cw   = cardW();
    const sw   = setW();
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < images.length; i++) {
      const cardCenter = i * cw + cw / 2 - GAP / 2 + px + sw;
      const dist = Math.abs(cardCenter - mid);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    // what offset puts card `best` at center?
    const targetOffset = mid - (best * cw + cw / 2 - GAP / 2 + sw);
    return normalizeOffset(targetOffset);
  }, [images.length]);

  /* initialise offset on mount */
  useEffect(() => {
    const sw = setW();
    // start so card 0 of middle copy is centred
    const init = () => {
      if (!wrapperRef.current) return;
      const mid = wrapperRef.current.offsetWidth / 2;
      const cw  = cardW();
      const target = mid - (0 * cw + cw / 2 - GAP / 2 + sw);
      offsetRef.current = normalizeOffset(target);
      applyTransform(offsetRef.current, false);
      setCenterIdx(0);
    };
    const t = setTimeout(init, 80);
    return () => clearTimeout(t);
  }, [images.length]);

  /* ── POINTER EVENTS (mouse + touch) ── */
  const onPointerDown = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    drag.current = {
      active: true,
      startX: clientX,
      startOffset: offsetRef.current,
      lastX: clientX,
      velocity: 0,
      lastTime: Date.now(),
    };
    if (trackRef.current) trackRef.current.classList.add('is-dragging');
  };

  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const now = Date.now();
    const dt  = now - drag.current.lastTime || 1;
    drag.current.velocity = (clientX - drag.current.lastX) / dt;
    drag.current.lastX    = clientX;
    drag.current.lastTime = now;

    const delta = clientX - drag.current.startX;
    const raw   = drag.current.startOffset + delta;
    offsetRef.current = normalizeOffset(raw);
    applyTransform(offsetRef.current, false);
    setCenterIdx(calcCenter(offsetRef.current));
  };

  const onPointerUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (trackRef.current) trackRef.current.classList.remove('is-dragging');

    // momentum: fling a bit further based on velocity
    const momentum = drag.current.velocity * 120; // px to fling
    const raw      = normalizeOffset(offsetRef.current + momentum);
    const snapped  = snapToNearest(raw);
    offsetRef.current = snapped;
    applyTransform(snapped, true);
    setCenterIdx(calcCenter(snapped));
  };

  /* dot / programmatic jump */
  const jumpTo = useCallback((i) => {
    if (!wrapperRef.current) return;
    const mid = wrapperRef.current.offsetWidth / 2;
    const cw  = cardW();
    const sw  = setW();
    const target = mid - (i * cw + cw / 2 - GAP / 2 + sw);
    const snapped = normalizeOffset(target);
    offsetRef.current = snapped;
    applyTransform(snapped, true);
    setCenterIdx(i);
  }, [images.length]);

  /* card class */
  const cardClass = (i) => {
    const total = images.length;
    const diff  = ((i - centerIdx) % total + total) % total;
    const d     = diff > total / 2 ? diff - total : diff;
    let cls = 'gallery-card';
    if (d === 0)              cls += ' is-center';
    else if (Math.abs(d) === 1) { cls += ' is-near'; if (d < 0) cls += ' side-left'; }
    else if (d < 0)           cls += ' side-left';
    return cls;
  };

  /* lightbox */
  const openLightbox  = useCallback((i) => setLightbox({ open: true, index: i }), []);
  const closeLightbox = useCallback(() => setLightbox({ open: false, index: 0 }), []);
  const prevImg = useCallback(() => setLightbox(l => ({ ...l, index: (l.index - 1 + images.length) % images.length })), [images.length]);
  const nextImg = useCallback(() => setLightbox(l => ({ ...l, index: (l.index + 1) % images.length })), [images.length]);

  /* tripled for seamless loop */
  const tripled = [...images, ...images, ...images];

  return (
    <section className="gallery-section">
      {(title || subtitle) && (
        <div className="gallery-header">
          {title    && <h2 className="gallery-title">{title}</h2>}
          {subtitle && <p className="gallery-subtitle">{subtitle}</p>}
          <div className="gallery-hint">🖼️ Drag or swipe to browse photos</div>
        </div>
      )}

      <div
        className="gallery-carousel-wrapper"
        ref={wrapperRef}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        <div className="gallery-track" ref={trackRef}>
          {tripled.map((img, i) => {
            const realIdx = i % images.length;
            return (
              <div
                key={i}
                className={cardClass(realIdx)}
                onClick={() => {
                  // only open lightbox on click, not drag
                  if (Math.abs(drag.current.startX - drag.current.lastX) < 6) {
                    openLightbox(realIdx);
                  }
                }}
              >
                <img
                  src={img.url} alt={img.label}
                  className="gallery-card-img"
                  draggable={false}
                  onError={e => { e.target.src = `https://via.placeholder.com/400x530/222/fff?text=${encodeURIComponent(img.label)}`; }}
                />
                <div className="gallery-card-overlay">
                  <div className="gallery-card-label">{img.label}</div>
                  {img.tag && <span className="gallery-card-tag">{img.tag}</span>}
                </div>
                {img.tag && <div className="gallery-card-badge">{img.tag}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <div className="gallery-center-caption">
        <div className="gallery-center-caption-label">{images[centerIdx]?.label}</div>
        {images[centerIdx]?.tag && (
          <span className="gallery-center-caption-tag">{images[centerIdx].tag}</span>
        )}
      </div>

      {/* Dots */}
      <div className="gallery-dots">
        {images.map((_, i) => (
          <button
            key={i}
            className={`gallery-dot ${i === centerIdx ? 'active' : ''}`}
            onClick={() => jumpTo(i)}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>

      {/* View all */}
      <div className="gallery-footer">
        <button className="gallery-view-btn" onClick={() => openLightbox(centerIdx)}>
          🖼️ View All Photos
        </button>
      </div>

      {lightbox.open && (
        <Lightbox images={images} index={lightbox.index}
          onClose={closeLightbox} onPrev={prevImg} onNext={nextImg} />
      )}
    </section>
  );
};

export default ImageGallery;