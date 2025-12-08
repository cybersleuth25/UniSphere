import * as api from './api.js';
import * as ui from './ui.js';

let currentUser = {};
const friendsModal = document.getElementById('friendsModal');
const friendsContent = document.getElementById('friendsContent');

export function setCurrentUser(user) {
    currentUser = user;
}

export function initialize() {
    if (!friendsModal) return;

    friendsModal.querySelector('.close-btn').addEventListener('click', () => friendsModal.classList.remove('show'));

    friendsModal.querySelectorAll('.tabs .tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            friendsModal.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
            const clickedTab = e.currentTarget;
            clickedTab.classList.add('active');
            handleTabClick(clickedTab.dataset.tab);
        });
    });
}

function handleTabClick(tabName) {
    switch (tabName) {
        case 'myFriends':
            fetchAndRenderFriends();
            break;
        case 'pendingRequests':
            fetchAndRenderRequests();
            break;
        case 'findFriends':
            renderFindFriendsUI();
            break;
    }
}

async function fetchAndRenderFriends() {
    friendsContent.innerHTML = `<p>Loading...</p>`;
    try {
        const friends = await api.getFriends();
        renderUserList(friends, 'friends');
    } catch (error) {
        friendsContent.innerHTML = `<p class="error">Could not load friends.</p>`;
    }
}

async function fetchAndRenderRequests() {
    friendsContent.innerHTML = `<p>Loading...</p>`;
    try {
        const requests = await api.getFriendRequests();
        renderUserList(requests, 'requests');
    } catch (error) {
        friendsContent.innerHTML = `<p class="error">Could not load friend requests.</p>`;
    }
}

function renderFindFriendsUI() {
    friendsContent.innerHTML = `
        <div class="form-group" style="margin-top: 20px;">
            <input type="text" id="friendSearchInput" placeholder="Search for students...">
        </div>
        <div id="friendSearchResults"></div>`;

    const searchInput = document.getElementById('friendSearchInput');
    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.trim();
        const resultsContainer = document.getElementById('friendSearchResults');
        if (query.length > 1) {
            resultsContainer.innerHTML = `<p>Searching...</p>`;
            try {
                const users = await api.searchUsers(query);
                await renderUserSearchResults(users);
            } catch (error) {
                resultsContainer.innerHTML = `<p class="error">Search failed.</p>`;
            }
        } else {
            resultsContainer.innerHTML = '';
        }
    }, 300));
}

function renderUserList(users, type) {
    if (users.length === 0) {
        friendsContent.innerHTML = `<p style="text-align:center; padding: 20px 0;">No ${type === 'friends' ? 'friends' : 'pending requests'} found.</p>`;
        return;
    }

    friendsContent.innerHTML = users.map(user => createUserCardHTML(user, type)).join('');
    addFriendActionListeners();
}

async function renderUserSearchResults(users) {
    const resultsContainer = document.getElementById('friendSearchResults');
    if (users.length === 0) {
        resultsContainer.innerHTML = '<p>No users found.</p>';
        return;
    }

    const userCardsHTML = await Promise.all(users.map(async (user) => {
        const statusData = await api.getFriendshipStatus(user.email);
        return createUserCardHTML(user, 'search', statusData);
    }));

    resultsContainer.innerHTML = userCardsHTML.join('');
    addFriendActionListeners();
}

function createUserCardHTML(user, type, statusData = {}) {
    return `
        <div class="user-card" data-user-email="${user.email}">
            <img src="${ui.getAvatarDisplayUrl(user)}" alt="${user.username}">
            <div class="user-card-info">
                <h4><a href="profile.php?username=${user.username}">${user.username}</a></h4>
                <p>${user.branch || ''} - Sem ${user.semester || ''}</p>
            </div>
            <div class="friend-button-container">
                ${getFriendButtonHTML(type, statusData)}
            </div>
        </div>`;
}

function getFriendButtonHTML(type, statusData) {
    if (type === 'friends') {
        return `<button class="btn secondary friend-action-btn" data-action="remove">Remove</button>`;
    }
    if (type === 'requests') {
        return `
            <button class="btn friend-action-btn" data-action="accept">Accept</button>
            <button class="btn secondary friend-action-btn" data-action="decline">Decline</button>`;
    }
    if (type === 'search') {
        switch(statusData.status) {
            case 'pending':
                return `<button class="btn secondary friend-action-btn" data-action="cancel">Cancel Request</button>`;
            case 'accepted':
                return `<button class="btn secondary" disabled>Friends</button>`;
            default:
                return `<button class="btn friend-action-btn" data-action="add">Add Friend</button>`;
        }
    }
    return '';
}

function addFriendActionListeners() {
    friendsContent.querySelectorAll('.friend-action-btn').forEach(btn => {
        btn.addEventListener('click', handleFriendAction);
    });
}

async function handleFriendAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const userCard = btn.closest('.user-card');
    const email = userCard.dataset.userEmail;

    btn.textContent = '...';
    btn.disabled = true;

    try {
        await api.performFriendAction(action, email);
        const activeTab = friendsModal.querySelector('.tabs .tab.active')?.dataset.tab;
        if (activeTab) handleTabClick(activeTab);
    } catch (error) {
        ui.showToast('Action failed. Please try again.', 'error');
        btn.disabled = false;
    }
}

const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
};