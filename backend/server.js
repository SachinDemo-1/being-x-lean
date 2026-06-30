import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import './middleware/passport.js';

dotenv.config();
import dns from 'dns';
dns.setServers(["1.1.1.1" , "8.8.8.8"]);
// Render's network does not support outbound IPv6, which caused
// "connect ENETUNREACH ...::465" errors when nodemailer tried to reach
// Gmail's SMTP server. Forcing IPv4-first resolution fixes this.
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Render (and most hosts) sit behind a reverse proxy that terminates HTTPS
// and forwards plain HTTP internally. Without this, Express/Passport think
// every request is "http", which made Google OAuth send
// redirect_uri=http://... instead of https://..., causing redirect_uri_mismatch.
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,https://being-x-lean.vercel.app').split(',').map(s=>s.trim());
app.use(cors({
  origin: function(origin, cb){
    if(!origin) return cb(null, true);
    if(allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    return cb(null, true); // dev: allow all
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin']
}));
app.options('*', cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fitppl_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'FitPPL API running 💪' }));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));