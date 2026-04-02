const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  route: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  distanceKm: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  title: {
    type: String,
    maxlength: 100
  }
}, {
  timestamps: true
});

// Calculate distance from route points using Haversine formula
rideSchema.methods.calculateDistance = function() {
  if (this.route.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < this.route.length; i++) {
    const prev = this.route[i - 1];
    const curr = this.route[i];
    totalDistance += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);
  }
  return Math.round(totalDistance * 100) / 100; // Round to 2 decimal places
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = mongoose.model('Ride', rideSchema);
