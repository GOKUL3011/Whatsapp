class ChatApp {
    constructor() {
        this.ws = null;
        this.currentUser = null;
        this.activeChat = null;
        this.users = [];
        this.chats = [];
        this.typingTimeout = null;
        
        this.initialize();
    }

    initialize() {
        // Get DOM elements - Auth
        this.authScreen = document.getElementById('authScreen');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        
        // Login elements
        this.loginUsername = document.getElementById('loginUsername');
        this.loginPassword = document.getElementById('loginPassword');
        this.loginBtn = document.getElementById('loginBtn');
        this.loginError = document.getElementById('loginError');
        this.showRegisterLink = document.getElementById('showRegister');
        
        // Register elements
        this.registerUsername = document.getElementById('registerUsername');
        this.registerEmail = document.getElementById('registerEmail');
        this.registerPassword = document.getElementById('registerPassword');
        this.registerConfirmPassword = document.getElementById('registerConfirmPassword');
        this.registerBtn = document.getElementById('registerBtn');
        this.registerError = document.getElementById('registerError');
        this.registerSuccess = document.getElementById('registerSuccess');
        this.showLoginLink = document.getElementById('showLogin');
        
        // Chat elements
        this.chatInterface = document.getElementById('chatInterface');
        this.currentUsername = document.getElementById('currentUsername');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.usersList = document.getElementById('usersList');
        this.chatsList = document.getElementById('chatsList');
        this.noChatSelected = document.getElementById('noChatSelected');
        this.activeChatWindow = document.getElementById('activeChatWindow');
        this.chatWithUsername = document.getElementById('chatWithUsername');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');

        // Auth event listeners
        this.loginBtn.addEventListener('click', () => this.handleLogin());
        this.loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.registerBtn.addEventListener('click', () => this.handleRegister());
        this.registerConfirmPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleRegister();
        });
        
        // Toggle forms
        this.showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.loginForm.style.display = 'none';
            this.registerForm.style.display = 'block';
            this.clearErrors();
        });
        this.showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.registerForm.style.display = 'none';
            this.loginForm.style.display = 'block';
            this.clearErrors();
        });

        // Chat event listeners
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        this.messageInput.addEventListener('input', () => this.handleTyping());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Check for saved session
        this.checkSession();
    }

    checkSession() {
        const savedUser = localStorage.getItem('chatUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.connectWebSocket();
            this.showChatInterface();
            this.loadUsers();
            this.loadChats();
        }
    }

    async handleLogin() {
        const username = this.loginUsername.value.trim();
        const password = this.loginPassword.value;
        
        if (!username || !password) {
            this.showLoginError('Please enter username and password');
            return;
        }

        try {
            const response = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.data;
                localStorage.setItem('chatUser', JSON.stringify(this.currentUser));
                this.connectWebSocket();
                this.showChatInterface();
                this.loadUsers();
                this.loadChats();
            } else {
                this.showLoginError(data.message);
            }
        } catch (error) {
            this.showLoginError('Failed to connect to server');
            console.error('Login error:', error);
        }
    }

    async handleRegister() {
        const username = this.registerUsername.value.trim();
        const email = this.registerEmail.value.trim();
        const password = this.registerPassword.value;
        const confirmPassword = this.registerConfirmPassword.value;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showRegisterError('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            this.showRegisterError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            this.showRegisterError('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showRegisterSuccess('Registration successful! Please login.');
                this.registerUsername.value = '';
                this.registerEmail.value = '';
                this.registerPassword.value = '';
                this.registerConfirmPassword.value = '';
                
                // Switch to login form after 2 seconds
                setTimeout(() => {
                    this.registerForm.style.display = 'none';
                    this.loginForm.style.display = 'block';
                    this.loginUsername.value = username;
                    this.clearErrors();
                }, 2000);
            } else {
                this.showRegisterError(data.message);
            }
        } catch (error) {
            this.showRegisterError('Failed to connect to server');
            console.error('Register error:', error);
        }
    }

    handleLogout() {
        if (this.ws) {
            this.ws.close();
        }
        localStorage.removeItem('chatUser');
        this.currentUser = null;
        this.activeChat = null;
        this.authScreen.style.display = 'flex';
        this.chatInterface.style.display = 'none';
        this.loginUsername.value = '';
        this.loginPassword.value = '';
        this.clearErrors();
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            // Authenticate
            this.ws.send(JSON.stringify({
                type: 'auth',
                payload: { userId: this.currentUser._id }
            }));
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            setTimeout(() => this.connectWebSocket(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    handleWebSocketMessage(message) {
        const { type, payload } = message;

        switch (type) {
            case 'auth_success':
                console.log('Authenticated successfully');
                break;

            case 'new_message':
                this.handleNewMessage(payload);
                break;

            case 'user_typing':
                this.handleUserTyping(payload);
                break;

            case 'user_status':
                this.updateUserStatus(payload);
                break;

            case 'message_status_updated':
                this.updateMessageStatus(payload);
                break;

            case 'error':
                console.error('WebSocket error:', payload.message);
                break;
        }
    }

    handleNewMessage(payload) {
        const { chatId, sender, content, createdAt } = payload;

        // Add message to UI if we're viewing this chat
        if (this.activeChat && this.activeChat._id === chatId) {
            this.appendMessage({
                sender,
                content,
                createdAt,
                isSent: sender._id === this.currentUser._id
            });
        }

        // Update chat list
        this.loadChats();
    }

    handleUserTyping(payload) {
        const { chatId, isTyping } = payload;

        if (this.activeChat && this.activeChat._id === chatId) {
            if (isTyping) {
                this.typingIndicator.textContent = 'typing...';
            } else {
                this.typingIndicator.textContent = '';
            }
        }
    }

    updateUserStatus(payload) {
        const { userId, status } = payload;
        this.loadUsers();
    }

    updateMessageStatus(payload) {
        // Update message status in UI if needed
        console.log('Message status updated:', payload);
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();

            if (data.success) {
                this.users = data.data.filter(u => u._id !== this.currentUser._id);
                this.renderUsers();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    async loadChats() {
        try {
            const response = await fetch(`/api/chats/user/${this.currentUser._id}`);
            const data = await response.json();

            if (data.success) {
                this.chats = data.data;
                this.renderChats();
            }
        } catch (error) {
            console.error('Failed to load chats:', error);
        }
    }

    renderUsers() {
        this.usersList.innerHTML = '';

        this.users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <span>${user.username}</span>
                <span class="user-status ${user.status}"></span>
            `;
            userItem.addEventListener('click', () => this.startChat(user));
            this.usersList.appendChild(userItem);
        });
    }

    renderChats() {
        this.chatsList.innerHTML = '';

        this.chats.forEach(chat => {
            const otherParticipant = chat.participants.find(p => p._id !== this.currentUser._id);
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            
            if (this.activeChat && this.activeChat._id === chat._id) {
                chatItem.classList.add('active');
            }

            const lastMessageText = chat.lastMessage ? 
                (chat.lastMessage.sender.username === this.currentUser.username ? 'You: ' : '') + 
                chat.lastMessage.content.substring(0, 30) + '...' : 
                'No messages yet';

            chatItem.innerHTML = `
                <div>
                    <strong>${otherParticipant.username}</strong>
                    <div style="font-size: 12px; color: #666;">${lastMessageText}</div>
                </div>
            `;
            chatItem.addEventListener('click', () => this.openChat(chat));
            this.chatsList.appendChild(chatItem);
        });
    }

    async startChat(user) {
        try {
            const response = await fetch('/api/chats/direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user1Id: this.currentUser._id,
                    user2Id: user._id
                })
            });

            const data = await response.json();

            if (data.success) {
                this.activeChat = data.data;
                this.openChat(data.data);
                this.loadChats();
            }
        } catch (error) {
            console.error('Failed to start chat:', error);
        }
    }

    async openChat(chat) {
        this.activeChat = chat;
        this.noChatSelected.style.display = 'none';
        this.activeChatWindow.style.display = 'flex';

        const otherParticipant = chat.participants.find(p => p._id !== this.currentUser._id);
        this.chatWithUsername.textContent = otherParticipant.username;

        // Load messages
        await this.loadMessages(chat._id);
        this.renderChats();
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/messages/chat/${chatId}`);
            const data = await response.json();

            if (data.success) {
                this.messagesContainer.innerHTML = '';
                // Messages come in reverse order (newest first), so reverse them
                data.data.reverse().forEach(message => {
                    this.appendMessage({
                        sender: message.sender,
                        content: message.content,
                        createdAt: message.createdAt,
                        isSent: message.sender._id === this.currentUser._id
                    });
                });
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    sendMessage() {
        const content = this.messageInput.value.trim();

        if (!content || !this.activeChat) return;

        // Send via WebSocket
        this.ws.send(JSON.stringify({
            type: 'send_message',
            payload: {
                chatId: this.activeChat._id,
                senderId: this.currentUser._id,
                content,
                messageType: 'text'
            }
        }));

        this.messageInput.value = '';
        this.typingIndicator.textContent = '';
    }

    handleTyping() {
        if (!this.activeChat) return;

        // Send typing indicator
        this.ws.send(JSON.stringify({
            type: 'typing',
            payload: {
                chatId: this.activeChat._id,
                userId: this.currentUser._id,
                isTyping: true
            }
        }));

        // Clear previous timeout
        clearTimeout(this.typingTimeout);

        // Set timeout to stop typing indicator
        this.typingTimeout = setTimeout(() => {
            this.ws.send(JSON.stringify({
                type: 'typing',
                payload: {
                    chatId: this.activeChat._id,
                    userId: this.currentUser._id,
                    isTyping: false
                }
            }));
        }, 1000);
    }

    appendMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.isSent ? 'sent' : 'received'}`;

        const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.innerHTML = `
            ${!message.isSent ? `<div class="message-sender">${message.sender.username}</div>` : ''}
            <div class="message-content">${this.escapeHtml(message.content)}</div>
            <div class="message-time">${time}</div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showChatInterface() {
        this.authScreen.style.display = 'none';
        this.chatInterface.style.display = 'flex';
        this.currentUsername.textContent = this.currentUser.username;
    }

    showLoginError(message) {
        this.loginError.textContent = message;
        setTimeout(() => {
            this.loginError.textContent = '';
        }, 3000);
    }

    showRegisterError(message) {
        this.registerError.textContent = message;
        this.registerSuccess.textContent = '';
        setTimeout(() => {
            this.registerError.textContent = '';
        }, 3000);
    }

    showRegisterSuccess(message) {
        this.registerSuccess.textContent = message;
        this.registerError.textContent = '';
    }

    clearErrors() {
        this.loginError.textContent = '';
        this.registerError.textContent = '';
        this.registerSuccess.textContent = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
