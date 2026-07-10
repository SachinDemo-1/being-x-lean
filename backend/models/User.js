import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  // email is NOT required because phone-only signups don't collect one.
  // `sparse: true` on the unique index means multiple users can have
  // email === undefined without triggering a duplicate-key error
  // (this was previously crashing the 2nd+ phone-only registration).
  email: { type: String, unique: true, sparse: true, lowercase: true },
  phone: { type: String, unique: true, sparse: true},
  password: { type: String },
  googleId: { type: String },
  facebookId: { type: String },
  avatar: { type: String, default: '' },
  purchases: {
    workout: { type: Boolean, default: false },
    diet: { type: Boolean, default: false },
  },
  theme: {
    type: String,
    default: 'dark-fire',
    enum: ['dark-fire', 'ocean-night', 'forest-beast', 'cyber-purple', 'gold-elite', 'arctic-steel', 'blood-moon', 'toxic-green', 'rose-warrior', 'midnight-blue']
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);