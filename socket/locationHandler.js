const User = require('../models/User');

module.exports = function(io) {
  // Store active socket connections: { userId: socketId }
  const activeUsers = new Map();

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🏍️  ${user.name} bağlandı (${user.userType})`);

    // Register user as online
    activeUsers.set(user._id.toString(), socket.id);
    User.findByIdAndUpdate(user._id, { isOnline: true }).catch(() => {});

    // ── Location Update ─────────────────────────────────────
    socket.on('location:update', async (data) => {
      try {
        const { lat, lng, status } = data;

        if (!lat || !lng) return;

        // Update user's location in DB
        await User.findByIdAndUpdate(user._id, {
          currentLocation: {
            lat,
            lng,
            status: status || '',
            updatedAt: new Date()
          },
          isLocationSharing: true
        });

        // Broadcast to all connected users
        socket.broadcast.emit('location:rider-updated', {
          userId: user._id,
          name: user.name,
          avatar: user.avatar,
          motorcycle: user.motorcycle,
          location: { lat, lng },
          status: status || '',
          userType: user.userType
        });
      } catch (error) {
        console.error('Location update error:', error);
      }
    });

    // ── Stop Location Sharing ───────────────────────────────
    socket.on('location:stop', async () => {
      try {
        await User.findByIdAndUpdate(user._id, {
          isLocationSharing: false,
          currentLocation: null
        });

        socket.broadcast.emit('location:rider-offline', {
          userId: user._id
        });
      } catch (error) {
        console.error('Location stop error:', error);
      }
    });

    // ── Status Update ───────────────────────────────────────
    socket.on('status:update', async (data) => {
      try {
        const { status } = data;

        await User.findByIdAndUpdate(user._id, {
          'currentLocation.status': status
        });

        socket.broadcast.emit('status:updated', {
          userId: user._id,
          status
        });
      } catch (error) {
        console.error('Status update error:', error);
      }
    });

    // ── Get Nearby Riders ───────────────────────────────────
    socket.on('location:get-nearby', async () => {
      try {
        const riders = await User.find({
          isLocationSharing: true,
          isOnline: true,
          _id: { $ne: user._id }
        }).select('name avatar motorcycle currentLocation userType');

        socket.emit('location:nearby-riders', {
          riders: riders.map(r => ({
            userId: r._id,
            name: r.name,
            avatar: r.avatar,
            motorcycle: r.motorcycle,
            location: r.currentLocation,
            userType: r.userType
          }))
        });
      } catch (error) {
        console.error('Get nearby error:', error);
      }
    });

    // ── Disconnect ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`👋 ${user.name} ayrıldı`);
      activeUsers.delete(user._id.toString());

      await User.findByIdAndUpdate(user._id, {
        isOnline: false,
        isLocationSharing: false
      }).catch(() => {});

      socket.broadcast.emit('location:rider-offline', {
        userId: user._id
      });
    });
  });

  return { activeUsers };
};
