import * as ui from './modules/ui.js';
import * as posts from './modules/posts.js';
import * as friends from './modules/friends.js';
import * as chat from './modules/chat.js';
import * as auth from './modules/auth.js';
import * as api from './modules/api.js';

const AUTH_KEY = 'unisphere_auth';
let currentUser = {};

function getAuthInfo() {
    try {
        const authInfo = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
        return {
            username: authInfo.username || null,
            email: authInfo.email || null,
            role: authInfo.role || null,
            avatar_path: authInfo.avatar_path || null,
            avatarSeed: authInfo.avatarSeed || authInfo.username
        };
    } catch (e) {
        return { username: null, email: null, role: null, avatar_path: null, avatarSeed: null };
    }
}

function updateSidebarForRole(role) {
    const sidebarBtns = document.querySelectorAll('.sidebar .quick-action-btn');
    sidebarBtns.forEach(btn => {
        const postType = btn.dataset.postType;
        const isAdminOnly = postType === 'announcements' || postType === 'events';
        if (!role) {
            btn.style.display = 'none';
        } else if (role === 'admin') {
            btn.style.display = 'block';
        } else {
            btn.style.display = isAdminOnly ? 'none' : 'block';
        }
    });
}

function checkLoginStatus() {
    currentUser = getAuthInfo();
    posts.setCurrentUser(currentUser);
    friends.setCurrentUser(currentUser);
    chat.setCurrentUser(currentUser);
    updateSidebarForRole(currentUser.role);
    const authButtonsContainer = document.getElementById('auth-buttons');
    const friendsBtn = document.getElementById('friendsBtn');
    const messagesBtn = document.getElementById('messagesBtn');
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (authButtonsContainer) {
        if (currentUser.username) {
            const avatarUrl = ui.getAvatarDisplayUrl(currentUser);
            authButtonsContainer.innerHTML = `<button id="profileBtn" class="profile-btn-icon" title="Profile"><img src="${avatarUrl}" alt="Profile"></button>`;
            document.getElementById('profileBtn').addEventListener('click', () => window.location.href = 'profile.php');
            if (welcomeMessage) welcomeMessage.textContent = `Hello, ${currentUser.username}!`;
            if (friendsBtn) friendsBtn.style.display = 'inline-flex';
            if (messagesBtn) messagesBtn.style.display = 'inline-flex';
        } else {
            authButtonsContainer.innerHTML = `<a href="login.html" class="btn secondary">Login</a><a href="signup.html" class="btn">Sign Up</a>`;
            if (welcomeMessage) welcomeMessage.textContent = 'Welcome to UniSphere';
            if (friendsBtn) friendsBtn.style.display = 'none';
            if (messagesBtn) messagesBtn.style.display = 'none';
        }
    }
}

function initializeTheme() {
    const body = document.body;
    const savedTheme = localStorage.getItem('unisphere_theme');
    const themeToggleCheckbox = document.getElementById('checkbox');
    if (savedTheme === 'light') {
        body.classList.add('light-theme');
        if (themeToggleCheckbox) themeToggleCheckbox.checked = true;
    } else {
        body.classList.remove('light-theme');
        if (themeToggleCheckbox) themeToggleCheckbox.checked = false;
    }
    if (themeToggleCheckbox) {
        themeToggleCheckbox.addEventListener('change', () => {
            const isLight = body.classList.toggle('light-theme');
            localStorage.setItem('unisphere_theme', isLight ? 'light' : 'dark');
        });
    }
}

function initializeGlobalClosers() {
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            const openModal = document.querySelector('.modal.show');
            if (openModal) openModal.classList.remove('show');
        }
    });
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('show'));
    });
}

function initializeHomePage() {
    const tabs = document.querySelectorAll('.main-content .tabs .tab');
    if (!tabs.length) return;
    const initialTab = 'announcements';
    setActiveTab(initialTab);
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => setActiveTab(e.currentTarget.dataset.tab));
    });
    document.querySelectorAll('.sidebar .quick-action-btn').forEach(button => {
        button.addEventListener('click', (e) => ui.setupAndShowPostModal(e.target.dataset.postType));
    });
    if (ui.DOMElements.postForm) {
        ui.DOMElements.postForm.addEventListener('submit', handlePostFormSubmit);
    }
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                if (query.length > 2) {
                    try {
                        const data = await api.globalSearch(query);
                        renderGlobalSearchResults(data);
                    } catch (error) {
                        console.error("Global search failed:", error);
                    }
                }
            }
        });
    }
}

function renderGlobalSearchResults(data) {
    const modal = document.getElementById('globalSearchModal');
    const content = document.getElementById('globalSearchResultsContent');
    if (!modal || !content) return;
    let resultsHTML = '<h2>Global Search Results</h2>';
    if (data.posts.length > 0) {
        resultsHTML += '<h3>Posts</h3><div class="cards">';
        data.posts.forEach(post => {
            resultsHTML += `<article class="card"><div class="card-content"><h3>${post.title}</h3><p class="card-description">${post.description.substring(0, 100)}...</p></div></article>`;
        });
        resultsHTML += '</div>';
    }
    if (data.users.length > 0) {
        resultsHTML += '<h3>Users</h3>';
        data.users.forEach(user => {
            const avatarUrl = ui.getAvatarDisplayUrl(user);
            resultsHTML += `
            <a href="profile.php?username=${user.username}" style="text-decoration: none; color: inherit;">
                <article class="user-card"><img src="${avatarUrl}" alt="${user.username}"><div class="user-card-info"><h4>${user.username}</h4><p>${user.bio || 'No bio.'}</p></div></article>
            </a>`;
        });
    }
    if (data.posts.length === 0 && data.users.length === 0) {
        resultsHTML += '<p>No results found.</p>';
    }
    content.innerHTML = resultsHTML;
    modal.classList.add('show');
}

function initializeModals() {
    const friendsBtn = document.getElementById('friendsBtn');
    const friendsModal = document.getElementById('friendsModal');
    if (friendsBtn && friendsModal) {
        friends.initialize(); 
        friendsBtn.addEventListener('click', () => {
            friendsModal.classList.add('show');
            friendsModal.querySelector('.tabs .tab[data-tab="myFriends"]').click();
        });
    }
    chat.initialize();
}

function setActiveTab(tabName) {
    document.querySelectorAll('.main-content .tabs .tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
    });
    renderCategoryFilters(tabName);
    posts.fetchAndRenderPosts(tabName);
}

function renderCategoryFilters(tabName) {
    const categoryFiltersContainer = document.getElementById('categoryFilters');
    const searchInput = document.getElementById('searchInput');

    const filterConfig = {
        resources: { key: 'category', options: ['All', 'Lecture Notes', 'Textbooks', 'Exam Papers', 'Project Code', 'Other'] },
        lostfound: { key: 'status', options: ['All', 'Lost', 'Found'] },
        courses: { key: 'cost_type', options: ['All', 'Free', 'Paid'] }
    };

    const currentFilter = filterConfig[tabName];
    if (!currentFilter) {
        categoryFiltersContainer.innerHTML = '';
        categoryFiltersContainer.style.display = 'none';
        return;
    }

    categoryFiltersContainer.style.display = 'flex';
    categoryFiltersContainer.innerHTML = currentFilter.options.map(opt =>
        `<button class="filter-btn ${opt === 'All' ? 'active' : ''}" data-filter-value="${opt}">${opt}</button>`
    ).join('');

    categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const filterValue = e.currentTarget.dataset.filterValue;
            let filters = {};
            if (filterValue !== 'All') {
                filters[currentFilter.key] = filterValue;
            }
            const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
            if (search) {
                filters['search'] = search;
            }
            
            posts.fetchAndRenderPosts(tabName, filters);
        });
    });
}

async function handlePostFormSubmit(e) {
    e.preventDefault();
    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    const formData = new FormData(e.currentTarget);
    const postId = formData.get('postId');
    const isUpdate = !!postId;
    try {
        const data = isUpdate
            ? await api.updatePost({ id: postId, title: formData.get('title'), description: formData.get('description') })
            : await api.createPost(formData);
        if (data.success) {
            ui.DOMElements.postModal.classList.remove('show');
            ui.showToast(data.message);
            const newPostType = formData.get('postType');
            setActiveTab(newPostType);
        } else {
            ui.showToast(data.message || 'An error occurred.', 'error');
        }
    } catch (error) {
        ui.showToast('A network error occurred.', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

function initializeProfilePage() {
    if (typeof serverData === 'undefined') return;
    const avatarImg = document.getElementById('profileAvatarImg');
    avatarImg.src = ui.getAvatarDisplayUrl(serverData.user);

    if (serverData.isOwnProfile) {
        const fileInput = document.getElementById('avatarUploadInput');
        document.getElementById('uploadAvatarBtn').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const response = await fetch('upload-avatar.php', { method: 'POST', body: formData });
                const data = await response.json();
                if (data.success) {
                    let authUser = getAuthInfo();
                    authUser.avatar_path = data.filepath;
                    localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
                    location.reload();
                } else {
                    alert(data.message);
                }
            } catch (error) {
                alert('Upload failed.');
            }
        });

        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', () => {
                let authUser = getAuthInfo();
                const newSeed = Date.now().toString();
                authUser.avatarSeed = newSeed;
                authUser.avatar_path = null;
                localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));

                const formData = new FormData();
                formData.append('avatar_path_reset', 'true');
                fetch('update-profile.php', { method: 'POST', body: formData })
                    .then(() => location.reload());
            });
        }

        const editProfileBtn = document.getElementById('editProfileBtn');
        const editProfileModal = document.getElementById('editProfileModal');
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileBtn && editProfileModal) {
            editProfileBtn.addEventListener('click', () => {
                editProfileForm.querySelector('#username').value = serverData.user.username;
                editProfileForm.querySelector('#email').value = serverData.user.email;
                editProfileForm.querySelector('#bio').value = serverData.user.bio || '';
                editProfileModal.classList.add('show');
            });
            editProfileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(editProfileForm);
                try {
                    const response = await fetch('update-profile.php', { method: 'POST', body: formData });
                    const data = await response.json();
                    if (data.success) {
                        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
                        location.reload();
                    } else { alert(data.message); }
                } catch (error) { alert('An error occurred.'); }
            });
        }
    } else {
        const friendButtonContainer = document.querySelector('.friend-button-container');
        if (friendButtonContainer) {
            api.getFriendshipStatus(serverData.user.email).then(statusData => {
                friendButtonContainer.innerHTML = getFriendButtonHTML(statusData.status, statusData.action_user_email);
                friendButtonContainer.querySelectorAll('.friend-action-btn').forEach(btn => btn.addEventListener('click', handleFriendAction));
                friendButtonContainer.querySelectorAll('.start-chat-btn').forEach(btn => btn.addEventListener('click', (e) => {
                    const userEmail = e.currentTarget.dataset.userEmail;
                    chat.openChatWithUser(userEmail);
                }));
            });
        }
    }
}

function getFriendButtonHTML(status, actionUserEmail) {
    const currentUserEmail = getAuthInfo().email;
    switch(status) {
        case 'pending':
            if (actionUserEmail === currentUserEmail) {
                return '<button class="btn secondary friend-action-btn" data-action="cancel">Cancel Request</button>';
            } else {
                return `<button class="btn friend-action-btn" data-action="accept">Accept</button>
                        <button class="btn secondary friend-action-btn" data-action="decline">Decline</button>`;
            }
        case 'accepted':
            return `<button class="btn start-chat-btn" data-user-email="${serverData.user.email}">Message</button>
                    <button class="btn secondary friend-action-btn" data-action="remove">Remove</button>`;
        case 'not_friends':
        default:
            return '<button class="btn friend-action-btn" data-action="add">Add Friend</button>';
    }
}

async function handleFriendAction(e) {
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const userEmail = serverData.user.email;

    btn.textContent = '...';
    btn.disabled = true;

    try {
        await api.performFriendAction(action, userEmail);
        location.reload();
    } catch (error) {
        ui.showToast('Action failed. Please try again.', 'error');
        btn.disabled = false;
    }
}

function loadFooter() {
     const footerPlaceholder = document.getElementById('footer-placeholder');
      if (footerPlaceholder) {
        fetch('footer.php')
          .then(response => response.text())
          .then(data => {
            footerPlaceholder.innerHTML = data;
          });
      }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    checkLoginStatus();
    initializeGlobalClosers();
    initializeModals();
    auth.initialize();
    loadFooter();
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage === '' || currentPage === 'index.html') {
        initializeHomePage();
    } else if (currentPage === 'profile.php') {
        initializeProfilePage();
    }
});