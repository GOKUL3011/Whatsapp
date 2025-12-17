const Message = require('../models/Message');
const ChatService = require('./ChatService');

class MessageService {
  async createMessage(chatId, senderId, content, messageType = 'text') {
    try {
      const message = new Message({
        chatId,
        sender: senderId,
        content,
        messageType
      });
      
      await message.save();
      await ChatService.updateLastMessage(chatId, message._id);
      
      // Populate sender information
      await message.populate('sender', 'username');
      
      return message;
    } catch (error) {
      throw error;
    }
  }

  async getMessageById(messageId) {
    try {
      return await Message.findById(messageId)
        .populate('sender', 'username');
    } catch (error) {
      throw error;
    }
  }

  async getChatMessages(chatId, limit = 50) {
    try {
      return await Message.find({ chatId })
        .populate('sender', 'username')
        .sort({ createdAt: -1 })
        .limit(limit);
    } catch (error) {
      throw error;
    }
  }

  async updateMessageStatus(messageId, status) {
    try {
      return await Message.findByIdAndUpdate(
        messageId,
        { status },
        { new: true }
      ).populate('sender', 'username');
    } catch (error) {
      throw error;
    }
  }

  async deleteMessage(messageId) {
    try {
      return await Message.findByIdAndDelete(messageId);
    } catch (error) {
      throw error;
    }
  }

  async deleteAllChatMessages(chatId) {
    try {
      return await Message.deleteMany({ chatId });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new MessageService();
