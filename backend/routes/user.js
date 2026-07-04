import express from 'express';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Get profile
router.get('/profile', protect, (req, res) => {
  res.json({ user: req.user });
});

// Update theme
router.put('/theme', protect, async (req, res) => {
  try {
    const { theme } = req.body;
    const validThemes = ['dark-fire', 'ocean-night', 'forest-beast', 'cyber-purple', 'gold-elite', 'arctic-steel', 'blood-moon', 'toxic-green', 'rose-warrior', 'midnight-blue'];
    if (!validThemes.includes(theme))
      return res.status(400).json({ message: 'Invalid theme' });
    req.user.theme = theme;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    if (name) req.user.name = name;
    if (avatar) req.user.avatar = avatar;
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Grant a plan purchase (called after successful payment / test-mode unlock)
router.put('/purchases', protect, async (req, res) => {
  try {
    const { planId } = req.body; // 'workout' | 'diet' | 'combo'
    if (!['workout', 'diet', 'combo'].includes(planId)) {
      return res.status(400).json({ message: 'Invalid planId' });
    }
    if (!req.user.purchases) req.user.purchases = { workout: false, diet: false };
    if (planId === 'workout') req.user.purchases.workout = true;
    else if (planId === 'diet') req.user.purchases.diet = true;
    else if (planId === 'combo') { req.user.purchases.workout = true; req.user.purchases.diet = true; }
    req.user.markModified('purchases');
    await req.user.save();
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;