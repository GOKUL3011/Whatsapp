const Chat = require('../models/Chat');
const Message = require('../models/Message');
const mongoose = require('mongoose');

class ChatService {
  async createChat(participantIds, isGroupChat = false, groupName = null) {
    try {
      // Convert to ObjectIds if they're strings
      const objectIdParticipants = participantIds.map(id => 
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
      
      const chat = new Chat({
        participants: objectIdParticipants,
        isGroupChat,
        groupName
      });
      await chat.save();
      console.log('Created new chat:', chat._id, 'with participants:', objectIdParticipants);
      return await chat.populate('participants', 'username status');
    } catch (error) {
      throw error;
    }
  }

  async getChatById(chatId) {
    try {
      return await Chat.findById(chatId)
        .populate('participants', 'username status')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: 'username' }
        });
    } catch (error) {
      throw error;
    }
  }

  async getUserChats(userId) {
    try {
      return await Chat.find({ participants: userId })
        .populate('participants', 'username status')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: 'username' }
        })
        .sort({ updatedAt: -1 });
    } catch (error) {
      throw error;
    }
  }

  async findOrCreateDirectChat(user1Id, user2Id) {
    try {
      // Convert to ObjectIds if they're strings
      const id1 = typeof user1Id === 'string' ? new mongoose.Types.ObjectId(user1Id) : user1Id;
      const id2 = typeof user2Id === 'string' ? new mongoose.Types.ObjectId(user2Id) : user2Id;
      
      console.log('Finding chat between:', id1.toString(), 'and', id2.toString());
      
      // Check if a direct chat already exists between these two users
      let chat = await Chat.findOne({
        isGroupChat: false,
        $and: [
          { participants: id1 },
          { participants: id2 }
        ]
      }).populate('participants', 'username status');

      if (chat) {
        console.log('Found existing chat:', chat._id);
      } else {
        console.log('No existing chat found, creating new one');
        chat = await this.createChat([id1, id2], false);
      }

      return chat;
    } catch (error) {
      throw error;
    }
  }

  async updateLastMessage(chatId, messageId) {
    try {
      return await Chat.findByIdAndUpdate(
        chatId,
        { lastMessage: messageId, updatedAt: Date.now() },
        { new: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async deleteChat(chatId) {
    try {
      // Delete all messages in the chat
      await Message.deleteMany({ chatId });
      // Delete the chat
      return await Chat.findByIdAndDelete(chatId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ChatService();
