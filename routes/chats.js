const express = require('express');
const router = express.Router();
const ChatService = require('../services/ChatService');

// Create a new chat
router.post('/', async (req, res) => {
  try {
    const { participantIds, isGroupChat, groupName } = req.body;
    const chat = await ChatService.createChat(participantIds, isGroupChat, groupName);
    res.status(201).json({ success: true, data: chat });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get chat by ID
router.get('/:id', async (req, res) => {
  try {
    const chat = await ChatService.getChatById(req.params.id);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }
    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's chats
router.get('/user/:userId', async (req, res) => {
  try {
    const chats = await ChatService.getUserChats(req.params.userId);
    res.status(200).json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Find or create direct chat
router.post('/direct', async (req, res) => {
  try {
    const { user1Id, user2Id } = req.body;
    const chat = await ChatService.findOrCreateDirectChat(user1Id, user2Id);
    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete chat
router.delete('/:id', async (req, res) => {
  try {
    await ChatService.deleteChat(req.params.id);
    res.status(200).json({ success: true, message: 'Chat deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
