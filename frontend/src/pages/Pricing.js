import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { grantPlan, hasPlan } from '../context/purchases';
import './Pricing.css';

// ─── TEST MODE: prices are 0 so you can verify the unlock flow end-to-end.
// To set real prices later, edit the `price` field of each plan below.
// See README_PRICING.md (root of this zip) for the step-by-step guide.
const TEST_MODE_FREE = false;



//locked plan -----------------------------------------

function LockedPlanCard({ plan }) {
  return (
    <div className="locked-card-overlay">
      <div className="locked-badge">
        🔒
        <span>Coming Soon</span>
      </div>
    </div>
  );
}








const PLANS = [
  {
    id: 'workout',
    icon: '🏋️',
    title: 'BUY',
    subtitle: 'WORKOUT PLAN',
    originalPrice: 500,
    price: 0, // ← change me to your real price (e.g. 99) when going live
    color: '#ff4500',
    features: ['Gym Workout Plan', 'Exercise Guide', 'Sets, Reps & Rest Details', 'For All Fitness Levels'],
    razorpayLink: 'https://rzp.io/l/workout-plan',
    unlocks: 'workout',
    goTo: '/workout',
  },
  {
    id: 'diet',
    icon: '🥗',
    title: 'BUY',
    subtitle: 'DIET PLAN',
    originalPrice: 500,
    price: 149, // ← change me
    color: '#39ff14',
    features: ['Personalized Diet Plan', 'Meal Plan (Veg/Non-Veg)', 'Calorie & Macronutrient Guide', 'Healthy & Effective Nutrition'],
    razorpayLink: 'https://rzp.io/l/diet-plan',
    unlocks: 'diet',
    goTo: '/diet',
  },
  {
    id: 'combo',
    icon: '🏆',
    title: 'BUY',
    subtitle: 'DIET PLAN + WORKOUT PLAN',
    originalPrice: 1000,
    price: 299, // ← change me
    color: '#ffd700',
    best: true,
    locked: true,
    features: ['Complete Workout Plan', 'Personalized Diet Plan', 'Exercise + Nutrition Guide', 'Best Results, Faster Progress'],
    razorpayLink: 'https://rzp.io/l/combo-plan',
    unlocks: 'combo',
    goTo: '/workout',
  },
];

export default function Pricing() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);

  // 'for=workout' (came from Workout page) -> only Workout + Combo
  // 'for=diet'    (came from Diet page)    -> only Diet + Combo
  // no param      (visited Plans directly) -> show all three
  const focus = searchParams.get('for'); // 'workout' | 'diet' | null
  const visiblePlans = PLANS.filter(plan => {
    if (!focus) return true;
    if (plan.id === 'combo') return true;
    return plan.id === focus;
  });

  const handleBuy = async (plan) => {
    if (!user) { navigate('/auth'); return; }

    // FREE / TEST MODE — instantly unlock without payment.
    if (TEST_MODE_FREE || plan.price === 0) {
      try {
        const updatedUser = await grantPlan(plan.unlocks);
        setUser(updatedUser);
        alert(`✅ ${plan.subtitle} unlocked. Opening your plan…`);
        navigate(plan.goTo);
      } catch (e) {
        alert('Something went wrong unlocking your plan. Please try again.');
      }
      return;
    }

    setLoading(plan.id);

    // Razorpay integration (active once prices are > 0 and TEST_MODE_FREE = false)
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY || 'rzp_test_placeholder',
      amount: plan.price * 100,
      currency: 'INR',
      name: 'BEING_X_LEAN',
      description: plan.subtitle,
      prefill: { name: user.name || '', email: user.email || '' },
      theme: { color: plan.color },
      handler: async function(response) {
        try {
          const updatedUser = await grantPlan(plan.unlocks);
          setUser(updatedUser);
          alert(`✅ Payment successful! ID: ${response.razorpay_payment_id}\n${plan.subtitle} unlocked.`);
        } catch (e) {
          alert('Payment succeeded but we could not save your unlock. Please contact support with this payment ID: ' + response.razorpay_payment_id);
        }
        setLoading(null);
        navigate(plan.goTo);
      },
      modal: { ondismiss: () => setLoading(null) }
    };

    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      window.open(plan.razorpayLink, '_blank');
      setLoading(null);
    }
  };

  return (
    <div className="pricing-page">
      <div className="noise-overlay" />
      <div className="pricing-header">
        <div className="ph-bg"></div>
        <div className="ph-inner">
          <div className="ph-razorpay-logo">
            <span className="rzp-badge">⚡ Razorpay</span>
          </div>
          <h1 className="pricing-title">CHOOSE <span className="pricing-title-accent">YOUR PLAN</span></h1>
          <div className="pricing-trust">
            <span>✅ One-Time Payment</span>
            <span>🔒 Secure Payment</span>
            <span>⚡ Instant Access</span>
          </div>
        </div>
      </div>

      <div className="pricing-cards-wrap">
        {visiblePlans.map((plan, i) => (
          <div key={plan.id} className={`pricing-card ${plan.best ? 'pricing-card-best' : ''}`} style={{ '--plan-color': plan.color, position: 'relative',overflow: 'hidden',}}>
            {plan.best && <div className="best-value-badge">BEST VALUE</div>}
            <div className="pc-icon-wrap" style={{ background: `radial-gradient(circle, ${plan.color}22, transparent)`, border: `2px solid ${plan.color}` }}>
              <span className="pc-icon">{plan.icon}</span>
            </div>
            <div className="pc-title">{plan.title}</div>
            <div className="pc-subtitle" style={{ color: plan.color }}>{plan.subtitle}</div>
            <div className="pc-divider" style={{ background: plan.color }}></div>
            <ul className="pc-features">
              {plan.features.map((f, j) => (
                <li key={j} className="pc-feature">
                  <span className="pc-check" style={{ color: plan.color }}>✅</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="pc-price-wrap">
              <div className="pc-original">₹{plan.originalPrice}/-</div>
              <div className="pc-price" style={{ background: plan.best ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` : `linear-gradient(135deg, #ff4500, #ff8c00)` }}>
                {plan.price === 0 ? 'FREE For 100 Members' : <>₹{plan.price}/- <span className="pc-only">ONLY</span></>}
              </div>
            </div>
            <button
              className="pc-buy-btn"
              style={{ background: plan.best ? `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` : 'linear-gradient(135deg, #ff4500, #ff8c00)', boxShadow: `0 8px 25px ${plan.color}44` }}
              onClick={() => handleBuy(plan)}
              disabled={loading === plan.id}
            >
              {loading === plan.id
                ? '⏳ Processing...'
                : plan.price === 0
                  ? (hasPlan(user, plan.unlocks === 'combo' ? 'workout' : plan.unlocks) ? 'Open Plan →' : 'Get Free Access')
                  : `Buy Now — ₹${plan.price}`}
            </button>
            <div className="pc-trust">{plan.price === 0 ? '🧪 Test mode — instant unlock' : '🛡️ One-Time Payment'}</div>
            {plan.locked && <LockedPlanCard plan={plan} />}
          </div>
        ))}
      </div>

      <div className="pricing-security">
        <span>🛡️ Secured by Razorpay</span>
        <span>🔒 SSL Encrypted</span>
        <span>✅ 100% Safe & Secure Payments</span>
      </div>
    </div>
  );
}