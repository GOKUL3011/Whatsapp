const express = require('express');
const router = express.Router();
const MessageService = require('../services/MessageService');

// Create a new message
router.post('/', async (req, res) => {
  try {
    const { chatId, senderId, content, messageType } = req.body;
    const message = await MessageService.createMessage(chatId, senderId, content, messageType);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const message = await MessageService.getMessageById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get chat messages
router.get('/chat/:chatId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = await MessageService.getChatMessages(req.params.chatId, limit);
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update message status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const message = await MessageService.updateMessageStatus(req.params.id, status);
    res.status(200).json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    await MessageService.deleteMessage(req.params.id);
    res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
