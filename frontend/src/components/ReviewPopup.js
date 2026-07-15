import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitReview, markReviewed, markPrompted } from '../context/reviews';
import './ReviewPopup.css';

const STAR_LABELS = ['', 'Not great', 'Okay', 'Good', 'Great', 'Amazing!'];

/**
 * Attractive full-screen review prompt.
 * Shown by Workout.js / Diet.js after the user has actually explored an
 * unlocked plan (see the `shouldShowReviewPopup` trigger in context/reviews.js).
 *
 * Props:
 *  - plan: 'workout' | 'diet' | 'combo'
 *  - onClose: () => void
 */
export default function ReviewPopup({ plan = 'general', onClose }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState('rate'); // rate -> write -> thanks
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleDismiss = () => {
    markPrompted(user);
    onClose();
  };

  const handlePickStar = (n) => {
    setRating(n);
    setStep('write');
  };

  const handleSkipWrite = async () => {
    await persistRatingOnly();
  };

  const persistRatingOnly = async () => {
    try {
      await submitReview({
        name: user?.name || 'Anonymous',
        email: user?.email || '',
        rating,
        comment: '',
        plan
      });
    } catch (e) { /* non-blocking */ }
    markReviewed(user);
    setStep('thanks');
  };

  const handleSubmitWritten = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await submitReview({
        name: user?.name || 'Anonymous',
        email: user?.email || '',
        rating,
        comment: comment.trim(),
        plan
      });
      markReviewed(user);
      setStep('thanks');
    } catch (e) {
      setError("Couldn't submit right now — please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rp-overlay" role="dialog" aria-modal="true" aria-label="Rate your experience">
      <div className="rp-backdrop" onClick={handleDismiss} />
      <div className="rp-card">
        <button className="rp-close" onClick={handleDismiss} aria-label="Close">✕</button>
        <div className="rp-glow" />

        {step === 'rate' && (
          <div className="rp-step rp-step-rate">
            <span className="rp-emoji-burst">🏆</span>
            <h2 className="rp-title">Loving your {plan === 'diet' ? 'diet' : plan === 'combo' ? 'workout & diet' : 'workout'} plan?</h2>
            <p className="rp-subtitle">Tell us how BEING_X_LEAN is working for you — it takes 10 seconds.</p>

            <div className="rp-stars" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`rp-star ${(hoverRating || rating) >= n ? 'active' : ''}`}
                  onMouseEnter={() => setHoverRating(n)}
                  onClick={() => handlePickStar(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                >★</button>
              ))}
            </div>
            <p className="rp-star-label">{STAR_LABELS[hoverRating] || '\u00A0'}</p>

            <button className="rp-later-link" onClick={handleDismiss}>Maybe later</button>
          </div>
        )}

        {step === 'write' && (
          <form className="rp-step rp-step-write" onSubmit={handleSubmitWritten}>
            <div className="rp-stars rp-stars-readonly">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={`rp-star ${rating >= n ? 'active' : ''}`}>★</span>
              ))}
            </div>
            <h2 className="rp-title rp-title-sm">
              {rating >= 4 ? "Awesome! What's been the biggest win?" : "Thanks — what should we improve?"}
            </h2>
            <textarea
              className="rp-textarea"
              placeholder={rating >= 4
                ? "e.g. The 6-day split finally got me consistent, and the diet plan made meal prep so easy..."
                : "Tell us what didn't work so we can fix it..."}
              rows={4}
              maxLength={800}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              autoFocus
            />
            {error && <p className="rp-error">{error}</p>}
            <div className="rp-actions">
              <button type="button" className="rp-btn-ghost" onClick={handleSkipWrite} disabled={submitting}>
                Skip, just send rating
              </button>
              <button type="submit" className="rp-btn-primary" disabled={submitting || !comment.trim()}>
                {submitting ? 'Sending…' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}

        {step === 'thanks' && (
          <div className="rp-step rp-step-thanks">
            <span className="rp-emoji-burst rp-emoji-burst-lg">🎉</span>
            <h2 className="rp-title">Thank you!</h2>
            <p className="rp-subtitle">Your feedback helps thousands of others find the right plan.</p>
            <button className="rp-btn-primary" onClick={onClose}>Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}