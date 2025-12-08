import * as api from './api.js';
import * as ui from './ui.js';

let currentUser = {};

export function setCurrentUser(user) {
    currentUser = user;
}

export async function fetchAndRenderPosts(tab, filters = {}) {
    ui.renderSkeletons();
    try {
        const allPosts = await api.getPosts(tab, filters);
        if (allPosts.length === 0) {
            ui.DOMElements.contentArea.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);"><p>No posts found.</p></div>';
            return;
        }

        const cardsHTML = allPosts.map(post => createPostCardHTML(post)).join('');
        ui.DOMElements.contentArea.innerHTML = `<div class="cards">${cardsHTML}</div>`;
        
        addPostEventListeners();

    } catch (error) {
        ui.DOMElements.contentArea.innerHTML = '<p style="text-align:center; color:var(--urgent-red);">Could not load posts.</p>';
    }
}

function createPostCardHTML(post) {
    const isAuthor = currentUser.email && post.author === currentUser.email;
    const isAdmin = currentUser.role === 'admin';
    const showEditDelete = isAdmin || isAuthor;

    const unsafeHtml = post.description ? marked.parse(post.description) : '';
    const descriptionHtml = DOMPurify.sanitize(unsafeHtml);

    let tagHTML = '';
    if (post.postType === 'lostfound' && post.status) {
        tagHTML = `<div class="status-tag ${post.status.toLowerCase()}">${post.status}</div>`;
    } else if (post.postType === 'courses' && post.cost_type) {
        const tagColor = post.cost_type === 'Free' ? 'var(--status-found)' : 'var(--accent-color)';
        tagHTML = `<div class="status-tag" style="background-color: ${tagColor};">${post.cost_type}</div>`;
    }
    
    const imageHtml = post.image 
        ? `<div class="thumb image" style="background-image: url('${post.image}')"></div>` 
        : `<div class="thumb">${post.postType.slice(0, 3).toUpperCase()}</div>`;
    
    const fileDownloadLink = post.file_path
        ? `<a href="${post.file_path}" target="_blank" download class="btn secondary file-download-btn">
               <i class="fas fa-download"></i> Download
           </a>`
        : '';

    const editDeleteButtons = showEditDelete ? `
        <div class="actions">
            <button class="btn secondary edit-btn">Edit</button>
            <button class="btn secondary delete-btn">Delete</button>
        </div>` : '';

    return `
        <article class="card ${post.postType}" data-post-id="${post.id}" data-post-raw='${JSON.stringify(post)}'>
            ${tagHTML}
            ${imageHtml} 
            <div class="card-content">
                <h3>${post.title}</h3>
                <div class="card-description">${descriptionHtml}</div>
                <button class="read-more-btn">Read More</button>

                <div class="card-footer">
                    <div class="post-meta">
                        <button class="like-btn ${post.liked_by_user ? 'liked' : ''}" data-post-id="${post.id}">
                            <i class="fas fa-thumbs-up"></i> <span class="like-count">${post.likes || 0}</span>
                        </button>
                        ${fileDownloadLink}
                    </div>
                    ${editDeleteButtons}
                </div>
            </div>
        </article>`;
}


function addPostEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
    document.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', handleLikeClick));
    
    document.querySelectorAll('.thumb.image').forEach(thumb => {
        thumb.addEventListener('click', async (e) => {
            const card = e.target.closest('.card');
            const postData = JSON.parse(card.dataset.postRaw);
            const imagePreviewModal = document.getElementById('imagePreviewModal');
            const fullSizeImage = document.getElementById('fullSizeImage');
            const recommendationsContainer = document.getElementById('recommendations-container');

            if (postData.image && imagePreviewModal) {
              fullSizeImage.src = postData.image;
              recommendationsContainer.innerHTML = '<h4>Loading related posts...</h4>';
              imagePreviewModal.classList.add('show');

              try {
                  const recommendations = await api.getRecommendations(postData.id);
                  if (recommendations.length > 0) {
                      let recsHTML = '<h4>Related Posts:</h4>';
                      recommendations.forEach(rec => {
                          recsHTML += `<a href="#" class="recommendation-link">${rec.title} (${rec.postType})</a>`;
                      });
                      recommendationsContainer.innerHTML = recsHTML;
                  } else {
                      recommendationsContainer.innerHTML = '';
                  }
              } catch (error) {
                  recommendationsContainer.innerHTML = '';
              }
            }
        });
    });

    document.querySelectorAll('.card').forEach(card => {
        const description = card.querySelector('.card-description');
        const readMoreBtn = card.querySelector('.read-more-btn');

        if (description.scrollHeight > description.clientHeight) {
            if(readMoreBtn) readMoreBtn.style.display = 'inline';
        }
        
        if(readMoreBtn) {
            readMoreBtn.addEventListener('click', () => {
                description.classList.toggle('expanded');
                readMoreBtn.textContent = description.classList.contains('expanded') ? 'Read Less' : 'Read More';
            });
        }
    });
}

async function handleLikeClick(e) {
    const btn = e.currentTarget;
    const postId = btn.dataset.postId;
    try {
        const data = await api.likePost(postId);
        if (data.success) {
            btn.querySelector('.like-count').textContent = data.likes;
            btn.classList.toggle('liked');
        }
    } catch (error) {
        ui.showToast('Could not update like.', 'error');
    }
}

function handleEditClick(e) {
    const card = e.target.closest('.card');
    const postData = JSON.parse(card.dataset.postRaw);
    ui.setupAndShowPostModal(postData.postType, postData);
}

async function handleDeleteClick(e) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const card = e.target.closest('.card');
    const postId = card.dataset.postId;
    try {
        const data = await api.deletePost(postId);
        if (data.success) {
            ui.showToast(data.message);
            const activeTab = document.querySelector('.main-content .tab.active')?.dataset.tab;
            if (activeTab) fetchAndRenderPosts(activeTab);
        } else {
            ui.showToast(data.message || 'Failed to delete.', 'error');
        }
    } catch (error) {
        ui.showToast('An error occurred while deleting.', 'error');
    }
}