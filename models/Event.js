const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Tədbir başlığı tələb olunur'],
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    required: [true, 'Tədbir təsviri tələb olunur'],
    maxlength: 2000
  },
  date: {
    type: Date,
    required: [true, 'Tədbir tarixi tələb olunur']
  },
  endDate: {
    type: Date
  },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: {
      type: String,
      required: [true, 'Ünvan tələb olunur']
    }
  },
  coverImage: {
    type: String,
    default: 'default-event.png'
  },
  category: {
    type: String,
    enum: ['group_ride', 'meetup', 'festival', 'race', 'workshop', 'other'],
    default: 'meetup'
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['going', 'interested'],
      default: 'interested'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxAttendees: {
    type: Number
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
