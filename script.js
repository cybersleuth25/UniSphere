/**********************
* State & Helpers
**********************/
const AUTH_KEY = 'unisphere_auth';
let currentUser = { username: null, email: null, role: null };

// Function to safely get user data from localStorage
function getAuthInfo() {
  try {
    const authInfo = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    return {
      username: authInfo.username || null,
      email: authInfo.email || null,
      role: authInfo.role || null
    };
  } catch (e) {
    console.error("Failed to parse auth info from localStorage", e);
    return { username: null, email: null, role: null };
  }
}

/**********************
* Rendering
**********************/
const tabs = document.querySelectorAll('.tab');
const contentArea = document.getElementById('contentArea');
const searchInput = document.getElementById('searchInput');

function setActiveTab(tabName) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  fetchPostsAndRender(tabName);
}
tabs.forEach(t => t.addEventListener('click', () => setActiveTab(t.dataset.tab)));

function cardContainer(itemsHtml) {
  return `<div class="cards">${itemsHtml}</div>`;
}

function fetchPostsAndRender(tab) {
  contentArea.innerHTML = '';
  const query = searchInput.value.trim().toLowerCase();

  fetch('api.php')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(allPosts => {
      let filtered = allPosts.filter(x => x.postType === tab);

      filtered = filtered.filter(x =>
        (x.title || x.item || '').toLowerCase().includes(query) ||
        (x.description || '').toLowerCase().includes(query) ||
        (x.location || '').toLowerCase().includes(query) ||
        (x.contact || '').toLowerCase().includes(query)
      );

      if (filtered.length === 0) {
        contentArea.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No data found. Try creating a new post!</p>';
        return;
      }

      const cards = filtered.map(x => {
        const title = x.title || (x.itemType === 'lost' ? 'Lost: ' : 'Found: ') + x.item;
        const location = x.location || '';
        const imageHtml = x.image ?
          `<div class="thumb image" style="background-image:url('${escapeHtml(x.image)}')"></div>` :
          `<div class="thumb">${tab.slice(0, 3).toUpperCase()}</div>`;

        let contactChip = `<span class="chip">${escapeHtml(x.contact)}</span>`;

        const isAuthor = currentUser.email && x.author && x.author === currentUser.email;
        const isAdmin = currentUser.role === 'admin';
        const showEditDelete = isAdmin || isAuthor;

        return `
          <article class="card" data-post-id="${x.id}" data-post-type="${tab}">
          ${imageHtml}
          <div style="flex:1">
            <h3>${escapeHtml(title)} ${x.urgent ? '<span class="urgent">URGENT</span>' : ''}</h3>
            <div class="meta">${x.date}${location ? ' • ' + escapeHtml(location) : ''}</div>
            <p style="margin:0 0 8px 0">${escapeHtml(x.description)}</p>
            <div class="actions">
              ${contactChip}
              ${showEditDelete ? `<button class="btn secondary edit-btn">Edit</button> <button class="btn secondary delete-btn">Delete</button>` : ''}
            </div>
          </div>
          </article>`;
      }).join('');

      contentArea.innerHTML = cardContainer(cards);

      document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
      document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
    })
    .catch(error => {
      console.error("Error fetching or rendering posts:", error);
      contentArea.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Failed to load posts. Please try again later.</p>';
    });
}

function escapeHtml(s) {
  return s ? s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : '';
}

/**********************
* Modal & Form Handling
**********************/
const modal = document.getElementById('postModal');
const form = document.getElementById('postForm');
const postTypeInput = document.getElementById('postType');
const postIdInput = document.getElementById('postId');
const lostFoundTypeDiv = document.getElementById('lostFoundType');
const postTitleInput = document.getElementById('postTitle');
const postImageInput = document.getElementById('postImage');

function handleEditClick(e) {
  const card = e.target.closest('.card');
  const postId = card.dataset.postId;
  const postType = card.dataset.postType;

  // Fetch the specific post data from the server
  fetch('api.php')
    .then(response => response.json())
    .then(allPosts => {
      const post = allPosts.find(p => p.id === postId);
      if (!post) {
        alert('Post not found.');
        return;
      }

      postTypeInput.value = postType;
      postIdInput.value = postId;

      if (postType === 'lostfound') {
        lostFoundTypeDiv.style.display = 'block';
        document.getElementById('itemType').value = post.itemType;
        postTitleInput.value = post.title;
        document.getElementById('postLocation').value = post.location;
      } else {
        lostFoundTypeDiv.style.display = 'none';
        postTitleInput.value = post.title;
        document.getElementById('postLocation').value = post.location;
      }
      document.getElementById('postDesc').value = post.description;
      document.getElementById('postContact').value = post.contact;
      modal.classList.add('show');
    })
    .catch(error => console.error('Error fetching post for edit:', error));
}

function handleDeleteClick(e) {
  if (!window.confirm('Are you sure you want to delete this post?')) return;

  const card = e.target.closest('.card');
  const postId = card.dataset.postId;
  const postType = card.dataset.postType;

  fetch(`api.php?id=${postId}`, { method: 'DELETE' })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(data.message);
        fetchPostsAndRender(postType);
      } else {
        alert(data.message);
      }
    })
    .catch(error => {
      console.error("Error deleting post:", error);
      alert('An error occurred while deleting the post.');
    });
}

const showModal = (type) => {
  postTypeInput.value = type;
  postIdInput.value = '';
  lostFoundTypeDiv.style.display = (type === 'lostfound') ? 'block' : 'none';
  postTitleInput.placeholder = {
    'lostfound': 'e.g., Laptop, Watch, Keys',
    'announcements': 'e.g., Exam Schedule Update',
    'events': 'e.g., Robotics Workshop',
    'resources': 'e.g., Selling 1st Year Books',
    'groups': 'e.g., Competitive Programming Club'
  }[type] || '';
  form.reset();
  modal.classList.add('show');
};

const addPostBtn = document.getElementById('addPostBtn');
if (addPostBtn) {
  addPostBtn.addEventListener('click', () => showModal('lostfound'));
}

const sidebarBtns = document.querySelectorAll('.sidebar .btn.secondary');
if (sidebarBtns) {
  sidebarBtns.forEach(button => {
    button.addEventListener('click', (e) => showModal(e.target.dataset.postType));
  });
}

const closeBtn = document.querySelector('.close-btn');
if (closeBtn) {
  closeBtn.addEventListener('click', () => modal.classList.remove('show'));
}
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
  }
});

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = postTypeInput.value;
    const postId = postIdInput.value;
    const isNewPost = !postId;
    
    const postData = {
      postType: type,
      title: postTitleInput.value,
      description: document.getElementById('postDesc').value,
      contact: document.getElementById('postContact').value,
      location: document.getElementById('postLocation').value,
      image: 'https://placehold.co/96x72' // Using placeholder for now, image upload requires more complex logic
    };

    if (type === 'lostfound') {
      postData.itemType = document.getElementById('itemType').value;
      postData.title = postTitleInput.value;
    }

    const method = isNewPost ? 'POST' : 'PUT';
    const url = 'api.php';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert(data.message);
          modal.classList.remove('show');
          fetchPostsAndRender(type);
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
      });
  });
}

/**********************
* Theme & Auth
**********************/
const themeToggleCheckbox = document.getElementById('checkbox');
const body = document.body;
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtn = document.getElementById('logoutBtn');
const authButtonsContainer = document.getElementById('auth-buttons');
const userProfileEmail = document.getElementById('userProfileEmail');

function toggleTheme() {
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  localStorage.setItem('unisphere_theme', isLight ? 'light' : 'dark');
}

if (themeToggleCheckbox) {
  themeToggleCheckbox.addEventListener('change', toggleTheme);
}

const savedTheme = localStorage.getItem('unisphere_theme');
if (savedTheme === 'light') {
  body.classList.add('light-theme');
  if (themeToggleCheckbox) themeToggleCheckbox.checked = true;
} else {
  if (themeToggleCheckbox) themeToggleCheckbox.checked = false;
}

function checkLoginStatus() {
  currentUser = getAuthInfo();
  const isLoggedIn = !!currentUser.email;
  const currentPage = window.location.pathname.split('/').pop();

  if (currentPage === 'login.html') {
    if (isLoggedIn) {
      window.location.href = 'index.html';
    }
    return;
  }
  
  if (currentPage === 'profile.html') {
    if (!isLoggedIn) {
      window.location.href = 'login.html';
    } else {
      const profileEmail = document.querySelector('.profile-info p strong');
      if (profileEmail) profileEmail.textContent = currentUser.email;
      const profileUsername = document.querySelector('.profile-header h2');
      if (profileUsername) profileUsername.textContent = `Welcome, ${currentUser.username}!`;
    }
    return;
  }
  
  const addPostBtn = document.getElementById('addPostBtn');
  const sidebarButtons = document.querySelectorAll('.sidebar .student-post, .sidebar .admin-only-post');

  if (authButtonsContainer) {
    if (isLoggedIn) {
      authButtonsContainer.innerHTML = `<button id="profileBtn" class="btn secondary">Profile</button>`;
      if (addPostBtn) addPostBtn.style.display = 'block';
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn) {
        profileBtn.addEventListener('click', () => {
          window.location.href = 'profile.html';
        });
      }

      sidebarButtons.forEach(btn => {
        if (currentUser.role === 'admin') {
          btn.style.display = 'block';
        } else {
          if (btn.classList.contains('admin-only-post')) {
            btn.style.display = 'none';
          } else {
            btn.style.display = 'block';
          }
        }
      });
    } else {
      authButtonsContainer.innerHTML = `
        <button id="loginBtn" class="btn secondary">Login</button>
        <a href="signup.html" class="btn secondary">Sign Up</a>
      `;
      if (addPostBtn) addPostBtn.style.display = 'none';
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          window.location.href = 'login.html';
        });
      }
      sidebarButtons.forEach(btn => btn.style.display = 'none');
    }
  }
}

// Handle Login Form Submission
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    fetch('login.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
          window.location.href = 'index.html';
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
      });
  });
}

// Handle Signup Form Submission
if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newUsername = document.getElementById('newUsername').value;
    const newEmail = document.getElementById('newEmail').value;
    const newPassword = document.getElementById('newPassword').value;

    const formData = new FormData();
    formData.append('newUsername', newUsername);
    formData.append('newEmail', newEmail);
    formData.append('newPassword', newPassword);

    fetch('signup.php', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
          window.location.href = 'profile.html'; // Redirect to profile after signup
        } else {
          alert(data.message);
        }
      })
      .catch(error => {
        console.error('Signup error:', error);
        alert('An error occurred during signup. Please try again.');
      });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'login.html';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkLoginStatus();
  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage === '' || currentPage === 'index.html') {
    setActiveTab('announcements');
    searchInput.addEventListener('input', () => {
      const active = document.querySelector('.tab.active').dataset.tab;
      fetchPostsAndRender(active);
    });
  }
});