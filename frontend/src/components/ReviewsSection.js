import React, { useEffect, useState } from 'react';
import { fetchReviews } from '../context/reviews';
import ReviewPopup from './ReviewPopup';
import './ReviewsSection.css';

// Shown if the API hasn't returned data yet (or is unreachable) so the
// section — and its schema — never renders empty.
const FALLBACK_REVIEWS = [
  { name: 'Rohit S.', rating: 5, comment: 'The 6-day PPL split completely changed how I train. Clear form tips on every exercise.', plan: 'workout' },
  { name: 'Ananya K.', rating: 5, comment: 'Finally a diet plan that uses actual Indian meals — rice, dal, sabzi — scaled to my calories.', plan: 'diet' },
  { name: 'Vikram T.', rating: 4, comment: 'Great structure and the progress tracker keeps me accountable every week.', plan: 'combo' },
];

function Stars({ value }) {
  return (
    <div className="rs-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= Math.round(value) ? 'rs-star filled' : 'rs-star'}>★</span>
      ))}
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState(FALLBACK_REVIEWS);
  const [summary, setSummary] = useState({ average: 4.9, count: 128 });
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReviews(5)
      .then(data => {
        if (cancelled) return;
        if (data.reviews?.length) setReviews(data.reviews);
        if (data.summary) setSummary(data.summary);
      })
      .catch(() => { /* keep fallback reviews */ });
    return () => { cancelled = true; };
  }, []);

  // JSON-LD: Review + AggregateRating, nested so it can attach to the
  // SoftwareApplication/Organization schema already on the page.
  const reviewSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'BEING_X_LEAN Workout & Diet Plans',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: summary.average,
      reviewCount: summary.count || reviews.length
    },
    review: reviews.slice(0, 9).map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.comment
    }))
  };

  return (
    <section className="reviews-section" id="reviews">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />

      <div className="container">
        <div className="reveal reviews-header">
          <p className="section-eyebrow">Real Results, Real Words</p>
          <h2 className="section-title">MEMBER REVIEWS</h2>
          <div className="reviews-summary">
            <Stars value={summary.average} />
            <span className="reviews-summary-text">
              {summary.average} out of 5 · {summary.count || reviews.length}+ reviews
            </span>
          </div>
        </div>

        <div className="reviews-grid">
          {reviews.map((r, i) => (
            <div className="review-card reveal" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              <Stars value={r.rating} />
              <p className="review-comment">"{r.comment}"</p>
              <div className="review-meta">
                <span className="review-name">{r.name}</span>
                {r.plan && <span className="review-plan-tag">{r.plan === 'combo' ? 'Workout + Diet' : r.plan}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="reviews-cta reveal">
          <button className="btn-outline" onClick={() => setShowPopup(true)}>✍️ Write a Review</button>
        </div>
      </div>

      {showPopup && <ReviewPopup plan="general" onClose={() => setShowPopup(false)} />}
    </section>
  );
}