const express = require('express');
const Broadcast = require('../models/Broadcast');
const { auth } = require('../middleware/auth');
const router = express.Router();

// POST /api/broadcasts - Create broadcast
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.userType !== 'rider') {
      return res.status(403).json({ error: 'Yalnız sürücülər broadcast yarada bilər.' });
    }

    const { title, description, routeInfo, location, expiresInHours } = req.body;

    const broadcast = new Broadcast({
      riderId: req.user._id,
      title,
      description,
      routeInfo,
      location,
      expiresAt: expiresInHours
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : undefined
    });

    await broadcast.save();
    await broadcast.populate('riderId', 'name avatar motorcycle');

    res.status(201).json({ message: 'Broadcast yaradıldı.', broadcast });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/broadcasts - Get active broadcasts
router.get('/', auth, async (req, res) => {
  try {
    const broadcasts = await Broadcast.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
      .populate('riderId', 'name avatar motorcycle currentLocation')
      .populate('requests.passengerId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ broadcasts });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/broadcasts/my - Get my broadcasts
router.get('/my', auth, async (req, res) => {
  try {
    const broadcasts = await Broadcast.find({ riderId: req.user._id })
      .populate('requests.passengerId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ broadcasts });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// POST /api/broadcasts/:id/request - Request to join a broadcast
router.post('/:id/request', auth, async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);

    if (!broadcast || !broadcast.isActive) {
      return res.status(404).json({ error: 'Broadcast tapılmadı.' });
    }

    if (broadcast.riderId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Öz broadcast-ınıza müraciət edə bilməzsiniz.' });
    }

    // Check if already requested
    const existingRequest = broadcast.requests.find(
      r => r.passengerId.toString() === req.user._id.toString()
    );
    if (existingRequest) {
      return res.status(400).json({ error: 'Artıq müraciət etmisiniz.' });
    }

    broadcast.requests.push({
      passengerId: req.user._id,
      message: req.body.message || ''
    });

    await broadcast.save();

    res.json({ message: 'Müraciət göndərildi.' });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// PUT /api/broadcasts/:id/respond - Respond to a request
router.put('/:id/respond', auth, async (req, res) => {
  try {
    const { requestId, status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status "accepted" və ya "rejected" olmalıdır.' });
    }

    const broadcast = await Broadcast.findOne({
      _id: req.params.id,
      riderId: req.user._id
    });

    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast tapılmadı.' });
    }

    const request = broadcast.requests.id(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Müraciət tapılmadı.' });
    }

    request.status = status;
    await broadcast.save();

    res.json({
      message: status === 'accepted' ? 'Müraciət qəbul edildi.' : 'Müraciət rədd edildi.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// DELETE /api/broadcasts/:id - Cancel broadcast
router.delete('/:id', auth, async (req, res) => {
  try {
    const broadcast = await Broadcast.findOneAndUpdate(
      { _id: req.params.id, riderId: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast tapılmadı.' });
    }

    res.json({ message: 'Broadcast ləğv edildi.' });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

module.exports = router;
