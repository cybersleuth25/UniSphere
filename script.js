const AUTH_KEY = 'unisphere_auth';
let currentUser = { username: null, email: null, role: null, avatarSeed: null, avatar_path: null };
const imagePreviewModal = document.getElementById('imagePreviewModal');
const fullSizeImage = document.getElementById('fullSizeImage');
let messagePollingInterval = null;


function getAuthInfo() {
  try {
    const authInfo = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    return {
      username: authInfo.username || null, email: authInfo.email || null,
      role: authInfo.role || null, avatarSeed: authInfo.avatarSeed || authInfo.username,
      avatar_path: authInfo.avatar_path || null
    };
  } catch (e) { return { username: null, email: null, role: null, avatarSeed: null, avatar_path: null }; }
}

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

function generateAvatarUrl(username, seed) {
    const seedValue = seed || username;
    return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(seedValue)}`;
}
function getAvatarDisplayUrl(user) {
    if (user.avatar_path) return `${user.avatar_path}?t=${new Date().getTime()}`;
    return generateAvatarUrl(user.username, user.avatarSeed);
}
const tabs = document.querySelectorAll('.tab');
const contentArea = document.getElementById('contentArea');
const searchInput = document.getElementById('searchInput');
const categoryFiltersContainer = document.getElementById('categoryFilters');

function setActiveTab(tabName) {
  if (!tabs) return;
  const mainTabs = document.querySelectorAll('.main-content .tabs .tab');
  mainTabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  const placeholderText = `Search in ${tabName}... (Press Enter for Global Search)`;
  if (searchInput) searchInput.placeholder = placeholderText;

  const filterableTabs = ['resources', 'lostfound', 'courses'];
  if (filterableTabs.includes(tabName)) {
      renderFilters(tabName);
      categoryFiltersContainer.style.display = 'flex';
  } else {
      categoryFiltersContainer.style.display = 'none';
  }
  
  fetchPostsAndRender(tabName);
}

function renderFilters(tabName) {
    const filterConfig = {
        resources: { key: 'category', options: ['All', 'Lecture Notes', 'Textbooks', 'Exam Papers', 'Project Code', 'Other'] },
        lostfound: { key: 'status', options: ['All', 'Lost', 'Found'] },
        courses: { key: 'cost_type', options: ['All', 'Free', 'Paid'] }
    };

    const currentFilter = filterConfig[tabName];
    if (!currentFilter) {
        categoryFiltersContainer.innerHTML = '';
        return;
    }

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
                const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
                if(search) filters['search'] = search;
                filters[currentFilter.key] = filterValue;
            }
            fetchPostsAndRender(tabName, filters);
        });
    });
}


function fetchPostsAndRender(tab, filters = {}) {
  if (!contentArea) return;
  let skeletonHTML = '';
  for (let i = 0; i < 4; i++) {
      skeletonHTML += `<div class="skeleton-card"><div class="skeleton-thumb"></div><div style="flex:1;"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div></div>`;
  }
  contentArea.innerHTML = `<div class="cards">${skeletonHTML}</div>`;
  
  let url = `api.php?postType=${tab}`;
  for (const key in filters) {
      if (filters[key]) {
          url += `&${key}=${encodeURIComponent(filters[key])}`;
      }
  }

  setTimeout(() => {
    fetch(url)
      .then(response => response.json())
      .then(allPosts => {
        if (allPosts.length === 0) {
          contentArea.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);"><i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 16px;"></i><p>No posts found.</p><p>Why not create one?</p></div>';
          return;
        }
        const cardsHTML = allPosts.map(x => {
            const isAuthor = currentUser.email && x.author === currentUser.email;
            const isAdmin = currentUser.role === 'admin';
            const showEditDelete = isAdmin || isAuthor;
            const imageHtml = x.image ? `<div class="thumb image" style="background-image: url('${x.image}')"></div>` : `<div class="thumb">${x.postType.slice(0, 3).toUpperCase()}</div>`;
            
            let statusTag = '';
            if (x.postType === 'lostfound' && x.status) {
                statusTag = `<div class="status-tag ${x.status.toLowerCase()}">${x.status}</div>`;
            } else if (x.postType === 'courses' && x.cost_type) {
                statusTag = `<div class="status-tag" style="background-color: var(--accent-color);">${x.cost_type}</div>`;
            }
            
            const unsafeHtml = x.description ? marked.parse(x.description) : '';
            const descriptionHtml = DOMPurify.sanitize(unsafeHtml);

            return `<article class="card ${x.postType}" data-post-id="${x.id}" data-post-raw='${JSON.stringify(x)}'>
                ${statusTag}
                ${imageHtml}
                <div class="card-content">
                    <h3>${x.title}</h3>
                    <div class="description-wrapper">
                        <div class="card-description">${descriptionHtml}</div>
                        <button class="read-more-btn" style="display:none;">Read More</button>
                    </div>
                    <div class="post-meta">
                        <button class="like-btn ${x.liked_by_user ? 'liked' : ''}" data-post-id="${x.id}"><i class="fas fa-thumbs-up"></i> <span class="like-count">${x.likes || 0}</span></button>
                    </div>
                    ${showEditDelete ? `<div class="actions"><button class="btn secondary edit-btn">Edit</button><button class="btn secondary delete-btn">Delete</button></div>` : ''}
                </div>
            </article>`;
        }).join('');
        contentArea.innerHTML = `<div class="cards">${cardsHTML}</div>`;

        document.querySelectorAll('.card').forEach(card => {
            const description = card.querySelector('.card-description');
            const readMoreBtn = card.querySelector('.read-more-btn');
            if (description.scrollHeight > description.clientHeight) {
                readMoreBtn.style.display = 'block';
            }
            readMoreBtn.addEventListener('click', () => {
                description.classList.toggle('expanded');
                readMoreBtn.textContent = description.classList.contains('expanded') ? 'Read Less' : 'Read More';
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
        document.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', handleLikeClick));
        document.querySelectorAll('.thumb.image').forEach(thumb => {
          thumb.addEventListener('click', (e) => {
            const card = e.target.closest('.card');
            const postData = JSON.parse(card.dataset.postRaw);
            if (postData.image && imagePreviewModal) {
              fullSizeImage.src = postData.image;
              imagePreviewModal.classList.add('show');
            }
          });
        });
      }).catch(error => {
          contentArea.innerHTML = '<p style="text-align:center; color:var(--urgent-red);">Could not load posts. Please try again later.</p>';
          console.error('Fetch error:', error);
      });
  }, 500);
}

function handleLikeClick(e) {
    const btn = e.currentTarget;
    const postId = btn.dataset.postId;
    const formData = new FormData();
    formData.append('likePostId', postId);
    fetch('api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if(data.success) {
                btn.querySelector('.like-count').textContent = data.likes;
                btn.classList.toggle('liked');
            }
        });
}

const postModal = document.getElementById('postModal');

function handleEditClick(e) {
    const card = e.target.closest('.card'); 
    const postData = JSON.parse(card.dataset.postRaw);
    
    setupPostModal(postData.postType, true);

    document.getElementById('postId').value = postData.id;
    document.getElementById('postTitle').value = postData.title; 
    document.getElementById('postDesc').value = postData.description;
    
    if (document.getElementById('postStatus') && postData.status) {
        document.getElementById('postStatus').value = postData.status;
    }
    if (document.getElementById('postCategory') && postData.category) {
        document.getElementById('postCategory').value = postData.category;
    }
     if (document.getElementById('postCostType') && postData.cost_type) {
        document.getElementById('postCostType').value = postData.cost_type;
    }
    
    if(postModal) postModal.classList.add('show');
}

function handleDeleteClick(e) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const card = e.target.closest('.card'); 
    const postId = card.dataset.postId;
    fetch(`api.php?id=${postId}`, { method: 'DELETE' }).then(res => res.json()).then(data => {
        if (data.success) { 
            showToast(data.message);
            const activeTab = document.querySelector('.main-content .tab.active')?.dataset.tab; 
            if (activeTab) fetchPostsAndRender(activeTab); 
        } else { 
            alert(data.message || 'Failed to delete post.'); 
        }
    });
}

if (postModal) {
    const postForm = document.getElementById('postForm');
    const submitBtn = postForm.querySelector('button[type="submit"]');

    postForm.addEventListener('submit', e => {
        e.preventDefault(); 
        
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const postId = document.getElementById('postId').value; 
        const isUpdate = !!postId;
        const formData = new FormData(postForm);
        
        if (isUpdate) {
            const postData = { id: postId, title: formData.get('title'), description: formData.get('description') };
            fetch('api.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) })
            .then(res => res.json())
            .then(data => {
                if (data.success) { 
                    postModal.classList.remove('show'); 
                    const activeTab = document.querySelector('.main-content .tab.active')?.dataset.tab; 
                    if (activeTab) fetchPostsAndRender(activeTab); 
                    showToast(data.message); 
                } else { 
                    alert(data.message || 'An error occurred while updating.'); 
                }
            })
            .catch(error => {
                console.error('Update Error:', error);
                alert('A network error occurred during update.');
            })
            .finally(() => {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            });
        } else {
            fetch('api.php', { method: 'POST', body: formData })
            .then(res => {
                if (!res.ok) {
                    return res.text().then(text => { throw new Error(text || `HTTP error! status: ${res.status}`) });
                }
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return res.json();
                } else {
                    return res.text().then(text => { throw new Error("Server did not return valid JSON. Response: " + text) });
                }
            })
            .then(data => {
                if (data.success) {
                    postModal.classList.remove('show');
                    const newPostType = formData.get('postType');
                    setActiveTab(newPostType);
                    showToast(data.message);
                } else {
                    alert(data.message || 'An error occurred while creating the post.');
                }
            })
            .catch(error => {
                console.error('Create Post Error:', error);
                alert('An error occurred. Check the console (F12) for more details.');
            })
            .finally(() => {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            });
        }
    });
    document.querySelector('#postModal .close-btn')?.addEventListener('click', () => postModal.classList.remove('show'));
}

if (imagePreviewModal) {
    imagePreviewModal.querySelector('.close-btn').addEventListener('click', () => imagePreviewModal.classList.remove('show'));
    imagePreviewModal.addEventListener('click', (e) => {
        if (e.target === imagePreviewModal) {
            imagePreviewModal.classList.remove('show');
        }
    });
}

const themeToggleCheckbox = document.getElementById('checkbox');
const body = document.body;
function toggleTheme() {
  body.classList.toggle('light-theme'); const isLight = body.classList.contains('light-theme');
  localStorage.setItem('unisphere_theme', isLight ? 'light' : 'dark');
}

if (themeToggleCheckbox) themeToggleCheckbox.addEventListener('change', toggleTheme);
const savedTheme = localStorage.getItem('unisphere_theme');
if (savedTheme === 'light') { body.classList.add('light-theme'); if (themeToggleCheckbox) themeToggleCheckbox.checked = true; }

function checkLoginStatus() {
  currentUser = getAuthInfo(); const isLoggedIn = !!currentUser.username;
  const authButtonsContainer = document.getElementById('auth-buttons');
  const friendsBtn = document.getElementById('friendsBtn');
  const messagesBtn = document.getElementById('messagesBtn');
  const welcomeMessage = document.getElementById('welcomeMessage');

  if (authButtonsContainer) {
    if (isLoggedIn) {
        const avatarUrl = getAvatarDisplayUrl(currentUser);
        authButtonsContainer.innerHTML = `<button id="profileBtn" class="profile-btn-icon" title="Profile"><img src="${avatarUrl}" alt="Profile"></button>`;
        document.getElementById('profileBtn').addEventListener('click', () => window.location.href = 'profile.php');
        if (welcomeMessage) welcomeMessage.textContent = `Hello, ${currentUser.username}!`;
        if (friendsBtn) friendsBtn.style.display = 'inline-flex';
        if (messagesBtn) messagesBtn.style.display = 'inline-flex';
        updateSidebarForRole(currentUser.role);
    } else {
        authButtonsContainer.innerHTML = `<button id="loginBtn" class="btn secondary">Login</button><a href="signup.html" class="btn">Sign Up</a>`;
        const loginBtn = document.getElementById('loginBtn'); if (loginBtn) loginBtn.addEventListener('click', () => window.location.href = 'login.html');
        if (welcomeMessage) welcomeMessage.textContent = 'Welcome to UniSphere';
        if (friendsBtn) friendsBtn.style.display = 'none';
        if (messagesBtn) messagesBtn.style.display = 'none';
        updateSidebarForRole(null);
    }
  }
}

function updateSidebarForRole(role) {
    const sidebarBtns = document.querySelectorAll('.sidebar .quick-action-btn');
    if (!sidebarBtns) return;

    sidebarBtns.forEach(btn => {
        const postType = btn.dataset.postType;
        const isAdminOnly = postType === 'announcements' || postType === 'events';

        if (!role) {
            btn.style.display = 'none';
        } else if (role === 'admin') {
            btn.style.display = 'block';
        } else if (role === 'student') {
            if (isAdminOnly) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'block';
            }
        }
    });
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) { return; }
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); const formData = new FormData(loginForm);
    fetch('login.php', { method: 'POST', body: formData }).then(response => response.json()).then(data => {
        if (data.success) { 
            localStorage.setItem(AUTH_KEY, JSON.stringify(data.user)); 
            showToast(data.message);
            setTimeout(() => {
                window.location.href = 'index.html'; 
            }, 1000);
        }
        else { alert(data.message); }
    });
  });
}

const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault(); const formData = new FormData(signupForm);
    fetch('signup.php', { method: 'POST', body: formData }).then(response => response.json()).then(data => {
        if (data.success) { localStorage.setItem(AUTH_KEY, JSON.stringify(data.user)); showToast(data.message); setTimeout(() => { window.location.href = 'index.html'; }, 1000); }
        else { alert(data.message); }
    });
  });
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

function renderGlobalSearchResults(data) {
    const modal = document.getElementById('globalSearchModal');
    const content = document.getElementById('globalSearchResultsContent');
    let resultsHTML = '';
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
            const avatarUrl = user.avatar_path ? user.avatar_path : generateAvatarUrl(user.username);
            resultsHTML += `
            <a href="profile.php?username=${user.username}" style="text-decoration: none; color: inherit;">
                <article class="user-card">
                    <img src="${avatarUrl}" alt="${user.username}">
                    <div class="user-card-info">
                        <h4>${user.username}</h4>
                        <p>${user.bio || 'No bio available.'}</p>
                    </div>
                </article>
            </a>`;
        });
    }
    if (data.posts.length === 0 && data.users.length === 0) {
        resultsHTML += '<p>No results found.</p>';
    }
    content.innerHTML = resultsHTML;
    modal.classList.add('show');
}

function handleFriendsTabClick(tab) {
    if (tab === 'myFriends' || tab === 'pendingRequests') {
        const contentDiv = document.getElementById('friendsContent');
        contentDiv.innerHTML = '<p>Loading...</p>';
        const endpoint = tab === 'myFriends' ? 'friends' : 'requests';

        fetch(`api.php?fetch=${endpoint}`)
            .then(res => res.json())
            .then(data => renderFriendsList(data, tab))
            .catch(err => contentDiv.innerHTML = '<p>Could not load friends.</p>');
    } else if (tab === 'findFriends') {
        renderFindFriendsUI();
    }
}

function renderFriendsList(users, tab) {
    const contentDiv = document.getElementById('friendsContent');
    let usersHTML = '';

    if (users.length === 0) {
        usersHTML = `<p style="text-align:center; padding: 20px 0; color: var(--text-muted);">No ${tab === 'myFriends' ? 'friends' : 'pending requests'} found.</p>`;
    } else {
        usersHTML = users.map(user => `
            <div class="user-card">
                <img src="${getAvatarDisplayUrl(user)}" alt="${user.username}">
                <div class="user-card-info">
                    <h4><a href="profile.php?username=${user.username}">${user.username}</a></h4>
                    <p>${user.branch || ''} - Semester ${user.semester || ''}</p>
                </div>
                <div class="friend-button-container" data-user-email="${user.email}">
                    ${tab === 'myFriends' ? `
                        <button class="btn start-chat-btn" data-user-email="${user.email}">Message</button>
                        <button class="btn secondary friend-action-btn" data-action="remove">Remove</button>
                    ` : ''}
                    ${tab === 'pendingRequests' ? `
                        <button class="btn friend-action-btn" data-action="accept">Accept</button>
                        <button class="btn secondary friend-action-btn" data-action="decline">Decline</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    contentDiv.innerHTML = usersHTML;
    document.querySelectorAll('#friendsContent .friend-action-btn').forEach(btn => btn.addEventListener('click', handleFriendAction));
    document.querySelectorAll('#friendsContent .start-chat-btn').forEach(btn => btn.addEventListener('click', handleStartChat));
}

function renderFindFriendsUI() {
    const contentDiv = document.getElementById('friendsContent');
    contentDiv.innerHTML = `
        <div class="form-group" style="margin-top: 20px;">
            <input type="text" id="friendSearchInput" placeholder="Search for students by name...">
        </div>
        <div id="friendSearchResults"></div>
    `;

    const friendSearchInput = document.getElementById('friendSearchInput');
    const debouncedFriendSearch = debounce(() => {
        const query = friendSearchInput.value.trim();
        if (query.length > 1) {
            fetch(`api.php?searchUsers=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(renderUserSearchResults);
        } else {
            document.getElementById('friendSearchResults').innerHTML = '';
        }
    }, 300);
    friendSearchInput.addEventListener('input', debouncedFriendSearch);
}

function renderUserSearchResults(users) {
    const resultsDiv = document.getElementById('friendSearchResults');
    if (!resultsDiv) return;

    if (users.length === 0) {
        resultsDiv.innerHTML = '<p>No users found.</p>';
        return;
    }
    resultsDiv.innerHTML = users.map(user => `
         <div class="user-card">
            <img src="${getAvatarDisplayUrl(user)}" alt="${user.username}">
            <div class="user-card-info">
                 <h4><a href="profile.php?username=${user.username}">${user.username}</a></h4>
                 <p>${user.branch || ''} - Semester ${user.semester || ''}</p>
            </div>
            <div class="friend-button-container" data-user-email="${user.email}">
                <button class="btn loading-btn" disabled>...</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('#friendSearchResults .friend-button-container').forEach(container => {
        const userEmail = container.dataset.userEmail;
        fetch(`api.php?checkFriendshipStatus=${userEmail}`)
            .then(res => res.json())
            .then(statusData => {
                container.innerHTML = getFriendButtonHTML(statusData.status, statusData.action_user_email);
                container.querySelectorAll('.friend-action-btn').forEach(btn => btn.addEventListener('click', handleFriendAction));
            });
    });
}


function handleFriendAction(e) {
    const btn = e.currentTarget;
    const container = btn.closest('.friend-button-container');
    const userEmail = container.dataset.userEmail;
    const action = btn.dataset.action;

    const formData = new FormData();
    formData.append('friendAction', action);
    formData.append('email', userEmail);

    btn.textContent = '...';
    btn.disabled = true;

    fetch('api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const activeFriendTab = document.querySelector('#friendsModal .tab.active')?.dataset.tab;
                 if (activeFriendTab === 'findFriends') {
                    const query = document.getElementById('friendSearchInput').value.trim();
                    if (query) {
                        fetch(`api.php?searchUsers=${encodeURIComponent(query)}`)
                            .then(res => res.json())
                            .then(renderUserSearchResults);
                    }
                } else if (activeFriendTab) {
                    handleFriendsTabClick(activeFriendTab);
                }
            } else {
                alert(data.message || 'An error occurred.');
                btn.textContent = action.charAt(0).toUpperCase() + action.slice(1);
                btn.disabled = false;
            }
        });
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
            return '<button class="btn secondary friend-action-btn" data-action="remove">Friends</button>';
        case 'not_friends':
        default:
            return '<button class="btn friend-action-btn" data-action="add">Add Friend</button>';
    }
}

function handleStartChat(e) {
    const userEmail = e.currentTarget.dataset.userEmail;
    const formData = new FormData();
    formData.append('action', 'startConversation');
    formData.append('email', userEmail);

    fetch('api.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const friendsModal = document.getElementById('friendsModal');
                const chatModal = document.getElementById('chatModal');
                if (friendsModal) friendsModal.classList.remove('show');
                if (chatModal) chatModal.classList.add('show');
                
                fetchConversations().then(() => {
                    const convoItem = document.querySelector(`.conversation-item[data-conversation-id='${data.conversation_id}']`);
                    if (convoItem) {
                        convoItem.click();
                    } else {
                        fetchConversations(true);
                    }
                });
            } else {
                alert(data.message || "Could not start conversation.");
            }
        });
}


function fetchConversations(andSelectId = null) {
    const container = document.getElementById('conversation-items');
    container.innerHTML = '<p style="padding:16px; text-align:center;">Loading...</p>';
    return fetch('api.php?fetch=conversations')
        .then(res => res.json())
        .then(conversations => {
            renderConversations(conversations);
            if(andSelectId){
                 const convoItem = document.querySelector(`.conversation-item[data-conversation-id='${andSelectId}']`);
                 if(convoItem) convoItem.click();
            }
        })
        .catch(error => {
            console.error('Failed to load conversations:', error);
            container.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--urgent-red);">Could not load conversations.</p>';
        });
}


function renderConversations(conversations, isNewConversationUI = false) {
    const container = document.getElementById('conversation-items');
    const header = document.querySelector('.conversations-list .chat-header h3');
    const backBtn = document.getElementById('backToConversationsBtn');
    const newBtn = document.getElementById('newConversationBtn');

    if (isNewConversationUI) {
        header.textContent = 'Start Conversation';
        backBtn.style.display = 'inline-flex';
        newBtn.style.display = 'none';

        container.innerHTML = '<p style="padding: 16px; text-align: center;">Loading...</p>';

        fetch('api.php?fetch=friends')
            .then(res => res.json())
            .then(friends => {
                if (friends.length === 0) {
                    container.innerHTML = '<p style="padding: 16px; text-align: center;">You have no friends to message.</p>';
                } else {
                    container.innerHTML = friends.map(friend => `
                        <div class="conversation-item new" data-user-email="${friend.email}">
                             <img src="${getAvatarDisplayUrl(friend)}" alt="${friend.username}">
                             <div class="conversation-info">
                                <p class="username">${friend.username}</p>
                             </div>
                        </div>
                    `).join('');
                     document.querySelectorAll('.conversation-item.new').forEach(item => {
                        item.addEventListener('click', (e) => handleStartChat(e));
                    });
                }
            })
            .catch(error => {
                console.error('Failed to load friends list:', error);
                container.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--urgent-red);">Could not load friends.</p>';
            });
    } else {
        header.textContent = 'Conversations';
        backBtn.style.display = 'none';
        newBtn.style.display = 'inline-flex';
        if (conversations.length === 0) {
            container.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-muted);">No active chats. Start a new one!</p>';
            return;
        }
        container.innerHTML = conversations.map(convo => `
            <div class="conversation-item" data-conversation-id="${convo.conversation_id}" data-other-user='${JSON.stringify(convo.other_user)}'>
                <img src="${getAvatarDisplayUrl(convo.other_user)}" alt="${convo.other_user.username}">
                <div class="conversation-info">
                    <p class="username">${convo.other_user.username}</p>
                    <p class="last-message">${convo.last_message ? convo.last_message.substring(0, 25) + (convo.last_message.length > 25 ? '...' : '') : 'No messages yet'}</p>
                </div>
                ${convo.unread_count > 0 ? `<div class="unread-count">${convo.unread_count}</div>` : ''}
            </div>
        `).join('');

        document.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', handleConversationClick);
        });
    }
}


function handleConversationClick(e) {
    const item = e.currentTarget;
    const conversationId = item.dataset.conversationId;
    const otherUser = JSON.parse(item.dataset.otherUser);

    document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    document.getElementById('chat-area-header').innerHTML = `<h3>Chat with ${otherUser.username}</h3>`;
    document.getElementById('conversationId').value = conversationId;
    document.querySelector('.chat-area').style.display = 'flex';
    document.querySelector('.chat-placeholder').style.display = 'none';

    if (messagePollingInterval) clearInterval(messagePollingInterval);
    
    fetchMessages(conversationId);

    messagePollingInterval = setInterval(() => {
        if (document.getElementById('chatModal').classList.contains('show')) {
            fetchMessages(conversationId, true);
        } else {
            clearInterval(messagePollingInterval);
        }
    }, 3000);
}

function fetchMessages(conversationId, isUpdate = false) {
    if (!conversationId) return;
    
    fetch(`api.php?fetch=messages&conversation_id=${conversationId}`)
        .then(res => res.json())
        .then(messages => {
            renderMessages(messages, isUpdate);
            if (!isUpdate) {
                fetchConversations(); 
            }
        })
        .catch(console.error);
}

function renderMessages(messages, isUpdate) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const wasScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 5;

    container.innerHTML = messages.map(msg => {
        const sanitizedMessage = msg.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
            <div class="message-bubble ${msg.sender_email === currentUser.email ? 'message-sent' : 'message-received'}">
                ${sanitizedMessage}
            </div>
        `;
    }).join('');

    if (!isUpdate || wasScrolledToBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

const sendMessageForm = document.getElementById('sendMessageForm');
if (sendMessageForm) {
    sendMessageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const conversationId = document.getElementById('conversationId').value;
        const messageInput = document.getElementById('messageInput');
        const submitBtn = sendMessageForm.querySelector('button[type="submit"]');
        
        if (!conversationId || !messageInput.value.trim()) return;

        const formData = new FormData(sendMessageForm);
        formData.append('action', 'sendMessage');
        
        messageInput.disabled = true;
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        fetch('api.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    messageInput.value = '';
                    fetchMessages(conversationId, true);
                } else {
                    alert("Failed to send message.");
                }
            }).finally(() => {
                messageInput.disabled = false;
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
                messageInput.focus();
            });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    loadFooter();
    checkLoginStatus();
    
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === '' || currentPage === 'index.html') {
        setActiveTab('announcements');
        if (tabs) tabs.forEach(t => t.addEventListener('click', (e) => setActiveTab(e.currentTarget.dataset.tab)));
        if (searchInput) { 
            const debouncedSearch = debounce(() => {
                const activeTab = document.querySelector('.main-content .tab.active')?.dataset.tab;
                if (activeTab) {
                    const activeFilterBtn = categoryFiltersContainer.querySelector('.filter-btn.active');
                    const filterValue = activeFilterBtn ? activeFilterBtn.dataset.filterValue : 'All';
                    
                    const filterConfig = {
                        resources: 'category',
                        lostfound: 'status',
                        courses: 'cost_type'
                    };
                    const filterKey = filterConfig[activeTab];

                    let filters = { search: searchInput.value.trim() };
                    if (filterKey && filterValue !== 'All') {
                        filters[filterKey] = filterValue;
                    }
                    
                    fetchPostsAndRender(activeTab, filters);
                }
            }, 500);
            
            searchInput.addEventListener('input', debouncedSearch);

            searchInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query.length > 2) {
                         fetch(`api.php?globalSearch=${encodeURIComponent(query)}`)
                        .then(response => response.json())
                        .then(data => renderGlobalSearchResults(data));
                    }
                }
            });
        }
        
        const sidebarBtns = document.querySelectorAll('.sidebar .quick-action-btn');
        sidebarBtns.forEach(button => {
            button.addEventListener('click', (e) => {
                const postType = e.target.dataset.postType;
                setupPostModal(postType, false);
                if (postModal) postModal.classList.add('show');
            });
        });
    }

    if (currentPage.includes('profile.php') && typeof serverData !== 'undefined') {
        const avatarImg = document.getElementById('profileAvatarImg');
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const changeBtn = document.getElementById('changeAvatarBtn');
        const fileInput = document.getElementById('avatarUploadInput');
        const editProfileBtn = document.getElementById('editProfileBtn');
        const editProfileModal = document.getElementById('editProfileModal');
        const editProfileForm = document.getElementById('editProfileForm');
        
        const user = serverData.user;
        avatarImg.src = getAvatarDisplayUrl(user);

        if(serverData.isOwnProfile) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', () => {
                const file = fileInput.files[0]; if (!file) return;
                const formData = new FormData(); formData.append('avatar', file);
                fetch('upload-avatar.php', { method: 'POST', body: formData }).then(res => res.json()).then(data => {
                    if (data.success) {
                        let authUser = getAuthInfo(); 
                        authUser.avatar_path = data.filepath;
                        localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
                        location.reload(); 
                    } else { alert(data.message); }
                });
            });

            changeBtn.addEventListener('click', () => {
                let authUser = getAuthInfo(); const newSeed = Date.now().toString();
                authUser.avatarSeed = newSeed; authUser.avatar_path = null; 
                localStorage.setItem(AUTH_KEY, JSON.stringify(authUser));
                
                const formData = new FormData(); 
                formData.append('avatar_path', 'NULL'); 
                fetch('update-profile.php', { method: 'POST', body: formData}).then(() => {
                    location.reload(); 
                });
            });

            editProfileBtn.addEventListener('click', () => {
                if(!editProfileModal) return;
                const authUser = getAuthInfo();
                editProfileForm.querySelector('#username').value = user.username;
                editProfileForm.querySelector('#email').value = user.email;
                editProfileForm.querySelector('#bio').value = user.bio || '';
                editProfileModal.classList.add('show');
            });

            if(editProfileModal) {
              editProfileModal.querySelector('.close-btn').addEventListener('click', () => editProfileModal.classList.remove('show'));
            }

            if(editProfileForm){
              editProfileForm.addEventListener('submit', (e) => {
                  e.preventDefault(); const formData = new FormData(editProfileForm);
                  fetch('update-profile.php', { method: 'POST', body: formData }).then(res => res.json()).then(data => {
                      if (data.success) {
                          localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
                          location.reload(); 
                      } else { alert(data.message); }
                  });
              });
            }
        } else {
            const friendButtonContainer = document.querySelector('.friend-button-container');
            if (friendButtonContainer) {
                const userEmail = friendButtonContainer.dataset.userEmail;
                fetch(`api.php?checkFriendshipStatus=${userEmail}`)
                    .then(res => res.json())
                    .then(statusData => {
                        friendButtonContainer.innerHTML = getFriendButtonHTML(statusData.status, statusData.action_user_email);
                        friendButtonContainer.querySelectorAll('.friend-action-btn').forEach(btn => btn.addEventListener('click', handleFriendAction));
                    });
            }
        }
    }
    
    const friendsBtn = document.getElementById('friendsBtn');
    const friendsModal = document.getElementById('friendsModal');
    if (friendsBtn && friendsModal) {
        friendsBtn.addEventListener('click', () => {
            friendsModal.classList.add('show');
            friendsModal.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'myFriends'));
            handleFriendsTabClick('myFriends');
        });
        friendsModal.querySelector('.close-btn').addEventListener('click', () => friendsModal.classList.remove('show'));
        friendsModal.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                friendsModal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                handleFriendsTabClick(e.currentTarget.dataset.tab);
            });
        });
    }
    
    const messagesBtn = document.getElementById('messagesBtn');
    const chatModal = document.getElementById('chatModal');
    if (messagesBtn && chatModal) {
        messagesBtn.addEventListener('click', () => {
            fetchConversations();
            document.querySelector('.chat-area').style.display = 'none';
            document.querySelector('.chat-placeholder').style.display = 'flex';
            chatModal.classList.add('show');
        });
        chatModal.querySelector('.close-btn').addEventListener('click', () => {
             chatModal.classList.remove('show');
             if(messagePollingInterval) clearInterval(messagePollingInterval);
        });
    }
    
    const newConversationBtn = document.getElementById('newConversationBtn');
    if(newConversationBtn){
        newConversationBtn.addEventListener('click', () => renderConversations([], true));
    }
    const backToConversationsBtn = document.getElementById('backToConversationsBtn');
    if(backToConversationsBtn){
         backToConversationsBtn.addEventListener('click', () => fetchConversations());
    }

    const globalSearchModal = document.getElementById('globalSearchModal');
    if(globalSearchModal) {
        globalSearchModal.querySelector('.close-btn').addEventListener('click', () => {
             globalSearchModal.classList.remove('show');
        });
    }
});

function setupPostModal(postType, isEditing) {
    const postForm = document.getElementById('postForm');
    const statusGroup = document.getElementById('lostFoundStatusGroup');
    const categoryGroup = document.getElementById('resourceCategoryGroup');
    const courseGroup = document.getElementById('courseCostGroup');
    const title = postModal.querySelector('h2');
    const submitBtnSpan = postModal.querySelector('button[type="submit"] span');

    statusGroup.classList.add('hidden');
    categoryGroup.classList.add('hidden');
    courseGroup.classList.add('hidden');

    document.getElementById('postType').value = postType;

    if (isEditing) {
        title.textContent = `Edit ${postType.charAt(0).toUpperCase() + postType.slice(1)}`;
        submitBtnSpan.textContent = 'Save Changes';
    } else {
        postForm.reset();
        document.getElementById('postId').value = '';
        title.textContent = `Create New ${postType.charAt(0).toUpperCase() + postType.slice(1)}`;
        submitBtnSpan.textContent = 'Submit Post';
    }
    
    if (postType === 'lostfound') {
        statusGroup.classList.remove('hidden');
    } else if (postType === 'resources') {
        categoryGroup.classList.remove('hidden');
    } else if (postType === 'courses') {
        courseGroup.classList.remove('hidden');
    }
}


const forgotPasswordForm = document.getElementById('forgotPasswordForm');
if (forgotPasswordForm) {
  forgotPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(forgotPasswordForm);
    const email = formData.get('email');
    fetch('forgot-password.php', { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(data.message);
          window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}`;
        } else {
          alert(data.message);
        }
      });
  });
}

const verifyOtpForm = document.getElementById('verifyOtpForm');
if (verifyOtpForm) {
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  if (email) {
    document.getElementById('email').value = email;
  }

  verifyOtpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(verifyOtpForm);
    fetch('verify-otp.php', { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(data.message);
          window.location.href = 'reset-password.html';
        } else {
          alert(data.message);
        }
      });
  });
}

const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const formData = new FormData(resetPasswordForm);
    fetch('reset-password.php', { method: 'POST', body: formData })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(data.message);
          window.location.href = 'login.html';
        } else {
          alert(data.message);
        }
      });
  });
}