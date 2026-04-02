const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email tələb olunur'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Düzgün email daxil edin']
  },
  password: {
    type: String,
    required: [true, 'Şifrə tələb olunur'],
    minlength: [6, 'Şifrə minimum 6 simvol olmalıdır'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Ad tələb olunur'],
    trim: true,
    maxlength: 50
  },
  avatar: {
    type: String,
    default: 'default-avatar.png'
  },
  userType: {
    type: String,
    enum: ['rider', 'passenger'],
    required: [true, 'İstifadəçi tipi tələb olunur']
  },
  age: {
    type: Number,
    min: 16,
    max: 99
  },
  bio: {
    type: String,
    maxlength: 300
  },

  // Motorcycle info (only for riders)
  motorcycle: {
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    engineCC: { type: Number },
    color: { type: String, trim: true },
    photo: { type: String }
  },

  // Stats
  totalKm: {
    type: Number,
    default: 0
  },
  dailyStats: [{
    date: { type: Date },
    km: { type: Number, default: 0 }
  }],

  // Real-time location
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    status: { type: String, maxlength: 200 },
    updatedAt: { type: Date }
  },
  isLocationSharing: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
