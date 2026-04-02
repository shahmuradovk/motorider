const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Multer config for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Yalnız JPEG, PNG və WebP formatları qəbul edilir.'));
    }
  }
});

// PUT /api/users/profile - Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const allowedUpdates = ['name', 'age', 'bio', 'motorcycle'];
    const updates = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ message: 'Profil yeniləndi.', user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: messages.join(', ') });
    }
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// POST /api/users/avatar - Upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Şəkil yüklənmədi.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.file.filename },
      { new: true }
    );

    res.json({ message: 'Şəkil yükləndi.', user });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/users/:id - Get user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/users/nearby/riders - Get nearby active riders
router.get('/nearby/riders', auth, async (req, res) => {
  try {
    const riders = await User.find({
      userType: 'rider',
      isLocationSharing: true,
      isOnline: true,
      _id: { $ne: req.user._id }
    }).select('name avatar motorcycle currentLocation');

    res.json({ riders });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

module.exports = router;
