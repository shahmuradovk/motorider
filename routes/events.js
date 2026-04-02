const express = require('express');
const Event = require('../models/Event');
const { auth } = require('../middleware/auth');
const router = express.Router();

// POST /api/events - Create event
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, date, endDate, location, category, maxAttendees } = req.body;

    const event = new Event({
      creatorId: req.user._id,
      title,
      description,
      date,
      endDate,
      location,
      category,
      maxAttendees,
      attendees: [{
        userId: req.user._id,
        status: 'going'
      }]
    });

    await event.save();
    await event.populate('creatorId', 'name avatar');

    res.status(201).json({ message: 'Tədbir yaradıldı.', event });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/events - Get upcoming events
router.get('/', auth, async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      isActive: true,
      date: { $gte: new Date() }
    };

    if (category) {
      filter.category = category;
    }

    const events = await Event.find(filter)
      .populate('creatorId', 'name avatar')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(filter);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/events/:id - Get event details
router.get('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creatorId', 'name avatar')
      .populate('attendees.userId', 'name avatar');

    if (!event) {
      return res.status(404).json({ error: 'Tədbir tapılmadı.' });
    }

    res.json({ event });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// POST /api/events/:id/attend - Attend or show interest in event
router.post('/:id/attend', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'going' or 'interested'

    if (!['going', 'interested'].includes(status)) {
      return res.status(400).json({ error: 'Status "going" və ya "interested" olmalıdır.' });
    }

    const event = await Event.findById(req.params.id);

    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Tədbir tapılmadı.' });
    }

    // Check max attendees
    if (status === 'going' && event.maxAttendees) {
      const goingCount = event.attendees.filter(a => a.status === 'going').length;
      if (goingCount >= event.maxAttendees) {
        return res.status(400).json({ error: 'Tədbir dolub.' });
      }
    }

    // Check if already attending
    const existingIndex = event.attendees.findIndex(
      a => a.userId.toString() === req.user._id.toString()
    );

    if (existingIndex >= 0) {
      event.attendees[existingIndex].status = status;
    } else {
      event.attendees.push({
        userId: req.user._id,
        status
      });
    }

    await event.save();

    const statusMsg = status === 'going' ? 'Qoşuldunuz' : 'Maraqlanırsınız';
    res.json({ message: `${statusMsg} tədbirdə.` });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// DELETE /api/events/:id/attend - Leave event
router.delete('/:id/attend', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Tədbir tapılmadı.' });
    }

    event.attendees = event.attendees.filter(
      a => a.userId.toString() !== req.user._id.toString()
    );

    await event.save();

    res.json({ message: 'Tədbirlərindən çıxdınız.' });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

module.exports = router;
