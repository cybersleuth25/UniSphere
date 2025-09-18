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
    { id: 'e2', title: 'Chunchana', desc: 'Two-day cultural fest with competitions.', date: '2025-11-12', venue: 'Campus Grounds', contact: 'https://aitckm.edu.in/facilities/chunchana/',image: 'Screenshot 2025-09-18 074227.png' },
    { id: 'e3', title: '6 days Add-on courses', desc: 'Join 6 days Add-on courses done by .', date: '2025-10-18', venue: 'Respective class', contact: 'csdept@ait.ac.in' }
  ],
  lostfound: [
    { id: 'l1', type: 'lost', item: 'Calculator', desc: 'Black Casio calc lost in the CSE block, possibly near Lab 3. It has a sticker of a star on the back.', date: '2025-09-15', location: 'CSE Block', contact: 'Mihir, mihir.s@ait.ac.in', image: 'https://via.placeholder.com/96x72.png?text=Calculator' },
    { id: 'l2', type: 'found', item: 'ID Card', desc: 'Found ID card of Suha Fatima near the library entrance. Please contact to claim.', date: '2025-09-16', location: 'Library Entrance', contact: 'Rohan, rohan.m@ait.ac.in', image: 'C:\VS code\AIT connect\ID card.jpg' },
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
const STORAGE_KEY = 'ait_connect_posts_v6';

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

  if (filtered.length === 0) { contentArea.innerHTML = '<p style="text-align:center; color:#6b7280;">No data found. Try creating a new post!</p>'; return; }

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

    return `
      <article class="card">
      ${imageHtml}
      <div style="flex:1">
        <h3>${escapeHtml(title)} ${x.urgent ? '<span class="urgent">URGENT</span>' : ''}</h3>
        <div class="meta">${x.date}${location ? ' • ' + escapeHtml(location) : ''}</div>
        <p style="margin:0 0 8px 0">${escapeHtml(x.desc)}</p>
        <div class="actions">
          ${contactChip}
        </div>
      </div>
      </article>`;
  }).join('');
  contentArea.innerHTML = cardContainer(cards);
}

function escapeHtml(s) { return s ? s.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

/**********************
* Modal & Form Handling
**********************/
const modal = document.getElementById('postModal');
const form = document.getElementById('postForm');
const postTypeInput = document.getElementById('postType');
const lostFoundTypeDiv = document.getElementById('lostFoundType');
const postTitleInput = document.getElementById('postTitle');
const postImageInput = document.getElementById('postImage');

const showModal = (type) => {
  postTypeInput.value = type;
  lostFoundTypeDiv.style.display = (type === 'lostfound') ? 'block' : 'none';
  postTitleInput.placeholder = {
    'lostfound': 'e.g., Laptop, Watch, Keys',
    'announcements': 'e.g., Exam Schedule Update',
    'events': 'e.g., Robotics Workshop',
    'resources': 'e.g., Selling 1st Year Books',
    'groups': 'e.g., Competitive Programming Club'
  }[type] || '';
  modal.classList.add('show');
};

document.getElementById('addPostBtn').addEventListener('click', () => showModal('lostfound'));
document.querySelectorAll('.sidebar .btn.secondary').forEach(button => {
  button.addEventListener('click', (e) => showModal(e.target.dataset.postType));
});

document.querySelector('.close-btn').addEventListener('click', () => modal.classList.remove('show'));
window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const type = postTypeInput.value;
  const title = postTitleInput.value;
  const desc = document.getElementById('postDesc').value;
  const contact = document.getElementById('postContact').value;
  const location = document.getElementById('postLocation').value;
  const itemType = document.getElementById('itemType').value;
  const imageFile = postImageInput.files[0];

  const newId = type[0] + Date.now();
  const date = new Date().toISOString().slice(0, 10);
  let newPost = { id: newId, date: date, desc: desc, contact: contact };

  if (type === 'lostfound') {
    newPost.type = itemType;
    newPost.item = title;
    newPost.location = location;
  } else {
    newPost.title = title;
    newPost.venue = location;
  }

  const addPostToState = (postData) => {
    state[type].unshift(postData);
    saveState(state);
    setActiveTab(type);
    modal.classList.remove('show');
    form.reset();
  };

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = (event) => {
      newPost.image = event.target.result;
      addPostToState(newPost);
    };
    reader.readAsDataURL(imageFile);
  } else {
    addPostToState(newPost);
  }
});

// Initial
setActiveTab('announcements');
searchInput.addEventListener('input', () => {
  const active = document.querySelector('.tab.active').dataset.tab;
  renderTab(active);
});