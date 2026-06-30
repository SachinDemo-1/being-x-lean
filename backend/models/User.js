import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true },
  password: { type: String },
  googleId: { type: String },
  facebookId: { type: String },
  avatar: { type: String, default: '' },
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
