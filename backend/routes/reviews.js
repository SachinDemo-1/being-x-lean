import express from 'express';
import jwt from 'jsonwebtoken';
import Review from '../models/Review.js';
import User from '../models/User.js';

const router = express.Router();

// Attach req.user if a valid token is present, but never block the request —
// reviews can be submitted by guests too.
async function optionalAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    // invalid/expired token — just proceed as guest
  }
  next();
}

// GET /api/reviews — public, approved reviews + aggregate rating
// Used both to render the on-site reviews wall and to feed the
// AggregateRating / Review JSON-LD schema on the homepage.
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const [reviews, agg] = await Promise.all([
      Review.find({ approved: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name rating comment plan verifiedPurchase createdAt'),
      Review.aggregate([
        { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
      ])
    ]);
    const summary = agg[0]
      ? { average: Math.round(agg[0].avgRating * 10) / 10, count: agg[0].count }
      : { average: 5, count: 0 };
    res.json({ reviews, summary });
  } catch (err) {
    res.status(500).json({ message: 'Could not load reviews', error: err.message });
  }
});

// POST /api/reviews — create a review (guest or logged-in)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { name, email, rating, comment, plan } = req.body;
    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'A rating between 1 and 5 is required' });
    }
    const review = await Review.create({
      name: (name || req.user?.name || 'Anonymous').slice(0, 60),
      email: email || req.user?.email || '',
      userId: req.user?._id || null,
      rating: numericRating,
      comment: (comment || '').slice(0, 800),
      plan: ['workout', 'diet', 'combo', 'general'].includes(plan) ? plan : 'general',
      verifiedPurchase: !!req.user
    });
    res.status(201).json({ message: 'Thanks for your feedback!', review });
  } catch (err) {
    res.status(500).json({ message: 'Could not submit review', error: err.message });
  }
});

export default router;