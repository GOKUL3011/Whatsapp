const WebSocket = require('ws');
const MessageService = require('./services/MessageService');
const UserService = require('./services/UserService');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map of userId -> WebSocket connection
    this.initialize();
  }

  initialize() {
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection established');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('Error handling message:', error);
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        }
      });

      ws.on('close', () => {
        // Find and remove the disconnected client
        for (const [userId, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(userId);
            // Update user status to offline
            UserService.updateUserStatus(userId, 'offline').catch(console.error);
            console.log(`User ${userId} disconnected`);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  async handleMessage(ws, message) {
    const { type, payload } = message;

    switch (type) {
      case 'auth':
        // Authenticate user and store connection
        await this.handleAuth(ws, payload);
        break;

      case 'send_message':
        // Send a new message
        await this.handleSendMessage(ws, payload);
        break;

      case 'typing':
        // Notify other users that someone is typing
        await this.handleTyping(ws, payload);
        break;

      case 'message_read':
        // Mark message as read
        await this.handleMessageRead(ws, payload);
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
    }
  }

  async handleAuth(ws, payload) {
    const { userId } = payload;
    
    // Store the connection
    this.clients.set(userId, ws);
    
    // Update user status to online
    await UserService.updateUserStatus(userId, 'online');
    
    ws.send(JSON.stringify({
      type: 'auth_success',
      payload: { userId }
    }));

    // Notify all connected users about the new online user
    this.broadcastToAll({
      type: 'user_status',
      payload: { userId, status: 'online' }
    });

    console.log(`User ${userId} authenticated and online`);
  }

  async handleSendMessage(ws, payload) {
    const { chatId, senderId, content, messageType } = payload;

    console.log('Processing message from', senderId, 'in chat', chatId);

    // Save message to database
    const savedMessage = await MessageService.createMessage(
      chatId,
      senderId,
      content,
      messageType
    );

    // Get chat to find participants
    const ChatService = require('./services/ChatService');
    const chat = await ChatService.getChatById(chatId);

    console.log('Chat participants:', chat.participants.map(p => ({ id: p._id.toString(), username: p.username })));
    console.log('Connected clients:', Array.from(this.clients.keys()));

    // Send message to all participants
    const messagePayload = {
      type: 'new_message',
      payload: {
        messageId: savedMessage._id,
        chatId: savedMessage.chatId,
        sender: savedMessage.sender,
        content: savedMessage.content,
        messageType: savedMessage.messageType,
        status: savedMessage.status,
        createdAt: savedMessage.createdAt
      }
    };

    chat.participants.forEach((participant) => {
      const participantId = participant._id.toString();
      const participantWs = this.clients.get(participantId);
      
      console.log('Attempting to send to participant:', participantId, 'Connected:', !!participantWs);
      
      if (participantWs && participantWs.readyState === WebSocket.OPEN) {
        participantWs.send(JSON.stringify(messagePayload));
        console.log('Message sent to:', participantId);
      } else {
        console.log('Could not send to:', participantId, '- not connected or not ready');
      }
    });
  }

  async handleTyping(ws, payload) {
    const { chatId, userId, isTyping } = payload;

    // Get chat to find participants
    const ChatService = require('./services/ChatService');
    const chat = await ChatService.getChatById(chatId);

    // Notify other participants
    chat.participants.forEach((participant) => {
      const participantId = participant._id.toString();
      
      if (participantId !== userId) {
        const participantWs = this.clients.get(participantId);
        
        if (participantWs && participantWs.readyState === WebSocket.OPEN) {
          participantWs.send(JSON.stringify({
            type: 'user_typing',
            payload: { chatId, userId, isTyping }
          }));
        }
      }
    });
  }

  async handleMessageRead(ws, payload) {
    const { messageId } = payload;

    // Update message status
    const updatedMessage = await MessageService.updateMessageStatus(messageId, 'read');

    // Notify the sender
    const senderId = updatedMessage.sender._id.toString();
    const senderWs = this.clients.get(senderId);

    if (senderWs && senderWs.readyState === WebSocket.OPEN) {
      senderWs.send(JSON.stringify({
        type: 'message_status_updated',
        payload: {
          messageId: updatedMessage._id,
          status: updatedMessage.status
        }
      }));
    }
  }

  broadcastToAll(message) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  getOnlineUsers() {
    return Array.from(this.clients.keys());
  }
}

module.exports = WebSocketServer;
