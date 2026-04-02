const express = require('express');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// POST /api/rides/start - Start a new ride
router.post('/start', auth, async (req, res) => {
  try {
    // Check if user already has an active ride
    const activeRide = await Ride.findOne({ userId: req.user._id, isActive: true });
    if (activeRide) {
      return res.status(400).json({ error: 'Artıq aktiv sürüşünüz var.' });
    }

    const { lat, lng, title } = req.body;

    const ride = new Ride({
      userId: req.user._id,
      title: title || 'Sürüş',
      route: lat && lng ? [{ lat, lng }] : []
    });

    await ride.save();

    res.status(201).json({ message: 'Sürüş başladı.', ride });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// PUT /api/rides/:id/location - Add location point to active ride
router.put('/:id/location', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Koordinatlar tələb olunur.' });
    }

    const ride = await Ride.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!ride) {
      return res.status(404).json({ error: 'Aktiv sürüş tapılmadı.' });
    }

    ride.route.push({ lat, lng });
    await ride.save();

    res.json({ message: 'Lokasiya əlavə edildi.', pointsCount: ride.route.length });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// PUT /api/rides/:id/end - End a ride
router.put('/:id/end', auth, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isActive: true
    });

    if (!ride) {
      return res.status(404).json({ error: 'Aktiv sürüş tapılmadı.' });
    }

    // Add final location if provided
    if (req.body.lat && req.body.lng) {
      ride.route.push({ lat: req.body.lat, lng: req.body.lng });
    }

    // Calculate distance and duration
    ride.distanceKm = ride.calculateDistance();
    ride.endTime = new Date();
    ride.duration = Math.round((ride.endTime - ride.startTime) / 1000);
    ride.isActive = false;

    await ride.save();

    // Update user's total km and daily stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalKm: ride.distanceKm },
      $push: {
        dailyStats: {
          date: today,
          km: ride.distanceKm
        }
      }
    });

    res.json({
      message: 'Sürüş bitdi.',
      ride: {
        id: ride._id,
        distanceKm: ride.distanceKm,
        duration: ride.duration,
        startTime: ride.startTime,
        endTime: ride.endTime,
        routePoints: ride.route.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/rides/stats - Get ride statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const now = new Date();

    // Today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // This year
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [todayRides, monthRides, yearRides, totalRides] = await Promise.all([
      Ride.aggregate([
        { $match: { userId: user._id, isActive: false, startTime: { $gte: todayStart } } },
        { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, count: { $sum: 1 } } }
      ]),
      Ride.aggregate([
        { $match: { userId: user._id, isActive: false, startTime: { $gte: monthStart } } },
        { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, count: { $sum: 1 } } }
      ]),
      Ride.aggregate([
        { $match: { userId: user._id, isActive: false, startTime: { $gte: yearStart } } },
        { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, count: { $sum: 1 } } }
      ]),
      Ride.aggregate([
        { $match: { userId: user._id, isActive: false } },
        { $group: { _id: null, totalKm: { $sum: '$distanceKm' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      stats: {
        today: todayRides[0] || { totalKm: 0, count: 0 },
        month: monthRides[0] || { totalKm: 0, count: 0 },
        year: yearRides[0] || { totalKm: 0, count: 0 },
        total: {
          km: user.totalKm,
          rides: totalRides[0]?.count || 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/rides/history - Ride history
router.get('/history', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const rides = await Ride.find({ userId: req.user._id, isActive: false })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit)
      .select('title distanceKm duration startTime endTime');

    const total = await Ride.countDocuments({ userId: req.user._id, isActive: false });

    res.json({
      rides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/rides/active - Get active ride
router.get('/active', auth, async (req, res) => {
  try {
    const ride = await Ride.findOne({ userId: req.user._id, isActive: true });
    res.json({ ride });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

module.exports = router;
