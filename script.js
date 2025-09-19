/**********************
* Seed data
**********************/
const seedData = {
  announcements: [
    { id: 'a1', title: 'Mid-Sem Timetable Released', desc: 'The timetable for mid-sems is uploaded. Check the portal for your schedule.', date: '2025-09-20', venue: 'Exam Cell', contact: 'examcell@ait.ac.in', urgent: false },
    { id: 'a2', title: 'Placement Drive: Infosys', desc: 'Infosys placement drive on 22nd Sept. All final year students are requested to register.', date: '2025-09-22', venue: 'Placement Cell', contact: 'placement@ait.ac.in', urgent: true },
    { id: 'a3', title: 'Holiday for Ganesh Chaturthi', desc: 'College will remain closed on 25th September for Ganesh Chaturthi.', date: '2025-09-23', venue: 'All Campus', contact: 'admin@ait.ac.in' },
  ],
  events: [
    { id: 'e1', title: 'Hackathon 2025', desc: '24-hour hackathon open to all branches. Cash prizes and goodies up for grabs!', date: '2025-10-05', venue: 'Auditorium', contact: 'hackathon@ait.ac.in' },
    { id: 'e2', title: 'Chunchana', desc: 'Two-day cultural fest with competitions.', date: '2025-11-12', venue: 'Campus Grounds', contact: 'https://aitckm.edu.in/facilities/chunchana/', image: 'cybersleuth25/unisphere/UniSphere-b219a4895dcae7ec19ae0367ef1ae6a5a8ba8e02/Screenshot 2025-09-18 074227.png' },
    { id: 'e3', title: '6 days Add-on courses', desc: 'Join 6 days Add-on courses done by .', date: '2025-10-18', venue: 'Respective class', contact: 'csdept@ait.ac.in' }
  ],
  lostfound: [
    { id: 'l1', type: 'lost', item: 'Calculator', desc: 'Black Casio calc lost in the CSE block, possibly near Lab 3. It has a sticker of a star on the back.', date: '2025-09-15', location: 'CSE Block', contact: 'Mihir, mihir.s@ait.ac.in', image: 'https://via.placeholder.com/96x72.png?text=Calculator' },
    { id: 'l2', type: 'found', item: 'ID Card', desc: 'Found ID card of Suha Fatima near the library entrance. Please contact to claim.', date: '2025-09-16', location: 'Library Entrance', contact: 'Rohan, rohan.m@ait.ac.in', image: 'https://i.ibb.co/L5hY52G/suha-id-card.jpg' },
    { id: 'l3', type: 'lost', item: 'Headphones', desc: 'Lost my black Sennheiser headphones in the cafeteria. Last seen around 2 PM.', date: '2025-09-17', location: 'Cafeteria', contact: 'Likith, 9876543210' },
  ],
  resources: [
    { id: 'r1', title: 'Operating System Notes', desc: 'Complete handwritten notes for 3rd sem. Willing to share soft copies.', date: '2025-09-14', contact: 'Arjun, arjun.v@ait.ac.in', image: 'https://via.placeholder.com/96x72.png?text=OS+Notes' },
    { id: 'r2', title: 'C Programming Book', desc: 'Available for borrow. Author: Balagurusamy. Contact me to pick it up.', date: '2025-09-12', contact: 'Sneha, sneha.k@ait.ac.in', image: 'https://via.placeholder.com/96x72.png?text=C+Book' },
    { id: 'r3', title: 'Physics & Maths Reference Books', desc: 'Selling my 1st year books. Good condition. Message for price.', date: '2025-09-18', contact: 'Kavya, kavya.b@ait.ac.in' },
  ],
  groups: [
    { id: 'g1', title: 'AI & ML Club', desc: 'Weekly discussions on AI, ML, and Data Science. Open to all students.', date: 'Every Friday', venue: 'Lab 204', contact: 'mlclub@ait.ac.in' },
    { id: 'g2', title: 'Photography Group', desc: 'For students interested in capturing memories. Join our weekend meetups and photo walks.', date: 'Weekend meetups', venue: 'Campus Lawn', contact: 'photo@ait.ac.in' },
    { id: 'g3', title: 'Study Group - 3rd Sem CSE', desc: 'Maths & DSA discussions. Looking for project partners.', date: 'Weekly', venue: 'Library Room 2', contact: 'Rohan R M, rohan.m@ait.ac.in' },
  ]
};

/**********************
* State & Helpers
**********************/
const STORAGE_KEY = 'unisphere_posts';
const THEME_KEY = 'unisphere_theme';
const AUTH_KEY = 'unisphere_auth';

let currentUser = { username: null, role: null };

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return JSON.parse(JSON.stringify(seedData));
  try { return JSON.parse(raw); } catch (e) { return JSON.parse(JSON.stringify(seedData)); }
}
function saveState(state) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();

/**********************
* Rendering
**********************/
const tabs = document.querySelectorAll('.tab');
const contentArea = document.getElementById('contentArea');
const searchInput = document.getElementById('searchInput');

function setActiveTab(tabName) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  renderTab(tabName);
}
tabs.forEach(t => t.addEventListener('click', () => setActiveTab(t.dataset.tab)));

function cardContainer(itemsHtml) { return `<div class="cards">${itemsHtml}</div>`; }

function renderTab(tab) {
  contentArea.innerHTML = '';
  const query = searchInput.value.trim().toLowerCase();

  let items = [];
  let label = '';
  let hasImage = false;

  if (tab === 'announcements') {
    items = state.announcements;
    label = 'ANN';
  } else if (tab === 'events') {
    items = state.events;
    label = 'EVT';
  } else if (tab === 'lostfound') {
    items = state.lostfound;
    label = 'LF';
    hasImage = true;
  } else if (tab === 'resources') {
    items = state.resources;
    label = 'RES';
    hasImage = true;
  } else if (tab === 'groups') {
    items = state.groups;
    label = 'GRP';
  }

  const filtered = items.filter(x =>
    (x.title || x.item || '').toLowerCase().includes(query) ||
    (x.desc || '').toLowerCase().includes(query) ||
    (x.venue || x.location || '').toLowerCase().includes(query) ||
    (x.contact || '').toLowerCase().includes(query)
  );

  if (filtered.length === 0) { contentArea.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No data found. Try creating a new post!</p>'; return; }

  const cards = filtered.map(x => {
    const title = x.title || (x.type === 'lost' ? 'Lost: ' : 'Found: ') + x.item;
    const location = x.venue || x.location || '';
    const imageHtml = x.image
      ? `<div class="thumb image" style="background-image:url('${escapeHtml(x.image)}')"></div>`
      : `<div class="thumb">${label}</div>`;

    let contactChip;
    if (x.contact.includes('@')) {
      contactChip = `<a href="mailto:${escapeHtml(x.contact)}" target="_blank" class="chip">${escapeHtml(x.contact)}</a>`;
    } else if (x.contact.startsWith('http')) {
      contactChip = `<a href="${escapeHtml(x.contact)}" target="_blank" class="chip">${escapeHtml(x.contact)}</a>`;
    } else if (x.contact.match(/^\d+$/) && x.contact.length >= 10) {
      contactChip = `<a href="tel:${escapeHtml(x.contact)}" class="chip">${escapeHtml(x.contact)}</a>`;
    } else {
      contactChip = `<span class="chip">${escapeHtml(x.contact)}</span>`;
    }

    const isAuthor = x.contact === currentUser.username;
    const isAdmin = currentUser.role === 'admin';
    const showEditDelete = isAdmin || (isAuthor && (tab !== 'announcements' && tab !== 'events'));

    return `
      <article class="card" data-post-id="${x.id}" data-post-type="${tab}">
      ${imageHtml}
      <div style="flex:1">
        <h3>${escapeHtml(title)} ${x.urgent ? '<span class="urgent">URGENT</span>' : ''}</h3>
        <div class="meta">${x.date}${location ? ' • ' + escapeHtml(location) : ''}</div>
        <p style="margin:0 0 8px 0">${escapeHtml(x.desc)}</p>
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
}

function escapeHtml(s) { return s ? s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

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

  const post = state[postType].find(p => p.id === postId);

  postTypeInput.value = postType;
  postIdInput.value = postId;
  
  if (postType === 'lostfound') {
    lostFoundTypeDiv.style.display = 'block';
    document.getElementById('itemType').value = post.type;
    postTitleInput.value = post.item;
    document.getElementById('postLocation').value = post.location;
  } else {
    lostFoundTypeDiv.style.display = 'none';
    postTitleInput.value = post.title;
    document.getElementById('postLocation').value = post.venue;
  }

  document.getElementById('postDesc').value = post.desc;
  document.getElementById('postContact').value = post.contact;

  modal.classList.add('show');
}

function handleDeleteClick(e) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  const card = e.target.closest('.card');
  const postId = card.dataset.postId;
  const postType = card.dataset.postType;

  state[postType] = state[postType].filter(p => p.id !== postId);
  saveState(state);
  renderTab(postType);
}

const showModal = (type) => {
  postTypeInput.value = type;
  postIdInput.value = ''; // Clear for new posts
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
    const title = postTitleInput.value;
    const desc = document.getElementById('postDesc').value;
    const contact = document.getElementById('postContact').value;
    const location = document.getElementById('postLocation').value;
    const itemType = document.getElementById('itemType').value;
    const imageFile = postImageInput.files[0];
    
    let newPost = { id: postId || (type[0] + Date.now()), date: new Date().toISOString().slice(0, 10), desc: desc, contact: contact };

    if (type === 'lostfound') {
      newPost.type = itemType;
      newPost.item = title;
      newPost.location = location;
    } else {
      newPost.title = title;
      newPost.venue = location;
    }

    const processPost = (postData) => {
      if (postId) {
        state[type] = state[type].map(p => p.id === postId ? { ...postData, image: postData.image || p.image } : p);
      } else {
        state[type].unshift(postData);
      }
      saveState(state);
      setActiveTab(type);
      modal.classList.remove('show');
      form.reset();
    };

    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        newPost.image = event.target.result;
        processPost(newPost);
      };
      reader.readAsDataURL(imageFile);
    } else {
      processPost(newPost);
    }
  });
}

/**********************
* Theme & Auth
**********************/
const themeToggleCheckbox = document.getElementById('checkbox');
const body = document.body;

function toggleTheme() {
  body.classList.toggle('light-theme');
  const isLight = body.classList.contains('light-theme');
  localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
}

if (themeToggleCheckbox) {
  themeToggleCheckbox.addEventListener('change', toggleTheme);
}

const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === 'light') {
  body.classList.add('light-theme');
  if (themeToggleCheckbox) themeToggleCheckbox.checked = true;
} else {
  if (themeToggleCheckbox) themeToggleCheckbox.checked = false;
}

const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const authButtonsContainer = document.getElementById('auth-buttons');

function checkLoginStatus() {
  const authInfo = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  currentUser.username = authInfo.username;
  currentUser.role = authInfo.role;
  const isLoggedIn = !!currentUser.username;
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

      // Hide or show sidebar buttons based on role
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

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const role = (username.toLowerCase() === 'admin') ? 'admin' : 'student';
    localStorage.setItem(AUTH_KEY, JSON.stringify({ username, role }));
    window.location.href = 'index.html';
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
      renderTab(active);
    });
  }
});