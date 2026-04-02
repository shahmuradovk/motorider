const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');
const router = express.Router();

// POST /api/messages - Send a message
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, text, broadcastId } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ error: 'Alıcı və mesaj mətni tələb olunur.' });
    }

    const message = new Message({
      senderId: req.user._id,
      receiverId,
      text,
      broadcastId
    });

    await message.save();
    await message.populate('senderId', 'name avatar');

    res.status(201).json({ message: 'Mesaj göndərildi.', data: message });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/messages/conversations - Get all conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get last message from each conversation
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId },
            { receiverId: userId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$senderId', '$receiverId'] },
              { sender: '$senderId', receiver: '$receiverId' },
              { sender: '$receiverId', receiver: '$senderId' }
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    // Populate user details
    await Message.populate(conversations, [
      { path: 'lastMessage.senderId', select: 'name avatar', model: 'User' },
      { path: 'lastMessage.receiverId', select: 'name avatar', model: 'User' }
    ]);

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

// GET /api/messages/:userId - Get messages with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user._id }
      ]
    })
      .populate('senderId', 'name avatar')
      .populate('receiverId', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Mark messages as read
    await Message.updateMany(
      {
        senderId: req.params.userId,
        receiverId: req.user._id,
        isRead: false
      },
      { isRead: true }
    );

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Server xətası.' });
  }
});

module.exports = router;
