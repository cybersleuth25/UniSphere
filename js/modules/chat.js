import * as api from './api.js';
import * as ui from './ui.js';

let currentUser = {};
let messagePollingInterval = null;

const chatModal = document.getElementById('chatModal');
const conversationsList = document.getElementById('conversation-items');
const chatArea = document.querySelector('.chat-area');
const chatPlaceholder = document.querySelector('.chat-placeholder');
const chatHeader = document.getElementById('chat-area-header');
const chatMessages = document.getElementById('chat-messages');
const sendMessageForm = document.getElementById('sendMessageForm');
const conversationIdInput = document.getElementById('conversationId');

export function setCurrentUser(user) {
    currentUser = user;
}

export function initialize() {
    if (!chatModal) return;

    document.getElementById('messagesBtn').addEventListener('click', openChatModal);
    chatModal.querySelector('.close-btn').addEventListener('click', closeChatModal);
    sendMessageForm.addEventListener('submit', handleSendMessage);
}

function openChatModal() {
    chatModal.classList.add('show');
    chatArea.style.display = 'none';
    chatPlaceholder.style.display = 'flex';
    fetchAndRenderConversations();
}

function closeChatModal() {
    chatModal.classList.remove('show');
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }
}

async function fetchAndRenderConversations() {
    conversationsList.innerHTML = `<p>Loading...</p>`;
    try {
        const conversations = await api.getConversations();
        if (conversations.length === 0) {
            conversationsList.innerHTML = `<p style="padding: 16px; text-align: center;">No active chats.</p>`;
            return;
        }
        conversationsList.innerHTML = conversations.map(createConversationHTML).join('');
        conversationsList.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', handleConversationClick);
        });
    } catch (error) {
        conversationsList.innerHTML = `<p class="error">Could not load conversations.</p>`;
    }
}

function createConversationHTML(convo) {
    const user = convo.other_user;
    return `
        <div class="conversation-item" data-conversation-id="${convo.conversation_id}" data-other-user='${JSON.stringify(user)}'>
            <img src="${user.avatar_path || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${user.username}`}" alt="${user.username}">
            <div class="conversation-info">
                <p class="username">${user.username}</p>
                <p class="last-message">${convo.last_message ? convo.last_message.substring(0, 25) : 'No messages'}</p>
            </div>
            ${convo.unread_count > 0 ? `<div class="unread-count">${convo.unread_count}</div>` : ''}
        </div>`;
}

function handleConversationClick(e) {
    const item = e.currentTarget;
    const conversationId = item.dataset.conversationId;
    const otherUser = JSON.parse(item.dataset.otherUser);

    document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    chatHeader.innerHTML = `<h3>Chat with ${otherUser.username}</h3>`;
    conversationIdInput.value = conversationId;
    chatArea.style.display = 'flex';
    chatPlaceholder.style.display = 'none';

    if (messagePollingInterval) clearInterval(messagePollingInterval);

    fetchAndRenderMessages(conversationId);
    messagePollingInterval = setInterval(() => {
        if (chatModal.classList.contains('show')) {
            fetchAndRenderMessages(conversationId, true);
        } else {
            clearInterval(messagePollingInterval);
        }
    }, 3000);
}

async function fetchAndRenderMessages(conversationId, isUpdate = false) {
    try {
        const messages = await api.getMessages(conversationId);
        renderMessages(messages, isUpdate);
        if (!isUpdate) {
            fetchAndRenderConversations();
        }
    } catch (error) {
        console.error("Failed to fetch messages:", error);
    }
}

function renderMessages(messages, isUpdate) {
    const wasScrolledToBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 5;
    chatMessages.innerHTML = messages.map(msg => `
        <div class="message-bubble ${msg.sender_email === currentUser.email ? 'message-sent' : 'message-received'}">
            ${msg.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </div>
    `).join('');

    if (!isUpdate || wasScrolledToBottom) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

async function handleSendMessage(e) {
    e.preventDefault();
    const conversationId = conversationIdInput.value;
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    if (!conversationId || !message) return;

    const submitBtn = sendMessageForm.querySelector('button[type="submit"]');
    messageInput.disabled = true;
    submitBtn.disabled = true;

    try {
        const data = await api.sendMessage(conversationId, message);
        if (data.success) {
            messageInput.value = '';
            fetchAndRenderMessages(conversationId, true);
        }
    } catch (error) {
        ui.showToast('Failed to send message.', 'error');
    } finally {
        messageInput.disabled = false;
        submitBtn.disabled = false;
        messageInput.focus();
    }
}