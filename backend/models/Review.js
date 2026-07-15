import mongoose from 'mongoose';

// Reviews collected from real users after they explore an unlocked plan.
// `approved` lets you moderate written reviews before they show publicly —
// star ratings alone are shown immediately (they feed the aggregate rating),
// but a written comment only appears on the site once approved=true.
const reviewSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, trim: true, lowercase: true, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 800, default: '' },
  plan: { type: String, enum: ['workout', 'diet', 'combo', 'general'], default: 'general' },
  verifiedPurchase: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Auto-approve clean, non-empty written reviews with 4-5 stars so the wall
// of reviews fills up fast; hold 1-3 star written reviews for manual
// moderation so you can follow up with the user before it goes public.
reviewSchema.pre('save', function (next) {
  if (this.isNew && !this.comment) {
    this.approved = true; // rating-only submissions don't need moderation
  } else if (this.isNew && this.rating >= 4) {
    this.approved = true;
  }
  next();
});

export default mongoose.model('Review', reviewSchema);