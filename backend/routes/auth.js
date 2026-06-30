import express from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// ── In-memory OTP store for email ──
const otpStore = {};

// ── Email sending (Brevo) ──
// Render blocks outbound SMTP ports (25/465/587), which is why nodemailer +
// Gmail SMTP fails with ENETUNREACH there. Brevo's transactional email API
// sends over a normal HTTPS POST call (port 443), which is not blocked, and
// its free plan allows 300 emails/day forever with no card required —
// higher than Resend's 100/day free limit, better suited for real traffic.
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  console.error('⚠️  BREVO_API_KEY is not set — email OTP will fail.');
} else {
  console.log('✅ Brevo email client ready');
}

// Sender identity: must be a verified sender/domain in your Brevo account
// (Settings → Senders & IP). Set EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME to override.
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'no-reply@beingxlean.com';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Being X Lean';

async function sendOtpEmail({ to, name, otp }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: EMAIL_FROM_ADDRESS, name: EMAIL_FROM_NAME },
      to: [{ email: to }],
      subject: 'Your OTP - Being X Lean',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:30px;background:#111;color:#fff;border-radius:12px;">
          <h2 style="color:#ff4500;">BEING X LEAN</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Your OTP to verify your email:</p>
          <h1 style="color:#ff4500;letter-spacing:8px;">${otp}</h1>
          <p style="color:#999;">Valid for 10 minutes. Do not share this with anyone.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || `Brevo API error (${response.status})`);
  }
}

// ── Generate 6-digit OTP ──
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── SEND EMAIL OTP ──
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });
    if (!BREVO_API_KEY) return res.status(500).json({ message: 'Email service not configured. Set BREVO_API_KEY in your environment.' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const otp = generateOTP();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };

    try {
      await sendOtpEmail({ to: email, name, otp });
    } catch (sendErr) {
      console.error('Brevo error:', sendErr);
      delete otpStore[email];
      return res.status(500).json({ message: sendErr.message || 'Failed to send OTP email' });
    }

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('send-email-otp error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── VERIFY EMAIL OTP + REGISTER ──
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    const record = otpStore[email];

    if (!record) return res.status(400).json({ message: 'OTP not sent or expired' });
    if (Date.now() > record.expires) {
      delete otpStore[email];
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    }
    if (record.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    delete otpStore[email];

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── REGISTER ──
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── LOGIN ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password)
      return res.status(400).json({ message: 'Invalid credentials' });
    const match = await user.comparePassword(password);
    if (!match)
      return res.status(400).json({ message: 'Invalid credentials' });
    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GOOGLE OAUTH ──
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

// ── FACEBOOK OAUTH ──
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
  }
);

export default router;