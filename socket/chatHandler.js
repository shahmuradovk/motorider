const Message = require('../models/Message');

module.exports = function(io, activeUsers) {

  io.on('connection', (socket) => {
    const user = socket.user;

    // ── Send Message ────────────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { receiverId, text, broadcastId } = data;

        if (!receiverId || !text) return;

        const message = new Message({
          senderId: user._id,
          receiverId,
          text,
          broadcastId
        });

        await message.save();
        await message.populate('senderId', 'name avatar');

        // Send to receiver if online
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message:receive', {
            message: {
              _id: message._id,
              senderId: {
                _id: user._id,
                name: user.name,
                avatar: user.avatar
              },
              receiverId,
              text,
              broadcastId,
              createdAt: message.createdAt
            }
          });
        }

        // Acknowledge to sender
        socket.emit('message:sent', {
          message: {
            _id: message._id,
            senderId: user._id,
            receiverId,
            text,
            broadcastId,
            createdAt: message.createdAt
          }
        });
      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('message:error', { error: 'Mesaj göndərilmədi.' });
      }
    });

    // ── Mark as Read ────────────────────────────────────────
    socket.on('message:read', async (data) => {
      try {
        const { senderId } = data;

        await Message.updateMany(
          {
            senderId,
            receiverId: user._id,
            isRead: false
          },
          { isRead: true }
        );

        // Notify sender
        const senderSocketId = activeUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message:read-confirm', {
            readBy: user._id
          });
        }
      } catch (error) {
        console.error('Message read error:', error);
      }
    });

    // ── Typing Indicator ────────────────────────────────────
    socket.on('message:typing', (data) => {
      const { receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:typing', {
          userId: user._id,
          name: user.name
        });
      }
    });

    socket.on('message:stop-typing', (data) => {
      const { receiverId } = data;
      const receiverSocketId = activeUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:stop-typing', {
          userId: user._id
        });
      }
    });
  });
};
