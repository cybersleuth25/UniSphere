export const DOMElements = {
    contentArea: document.getElementById('contentArea'),
    postModal: document.getElementById('postModal'),
    postForm: document.getElementById('postForm'),
};

export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.className = `toast toast-${type} show`;
    toast.textContent = message;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

export function renderSkeletons() {
    if (!DOMElements.contentArea) return;
    let skeletonHTML = '';
    for (let i = 0; i < 4; i++) {
        skeletonHTML += `<div class="skeleton-card"><div class="skeleton-thumb"></div><div style="flex:1;"><div class="skeleton-text"></div><div class="skeleton-text short"></div></div></div>`;
    }
    DOMElements.contentArea.innerHTML = `<div class="cards">${skeletonHTML}</div>`;
}

export function setupAndShowPostModal(postType, postData = null) {
    const isEditing = !!postData;
    const title = DOMElements.postModal.querySelector('h2');
    const submitBtnSpan = DOMElements.postModal.querySelector('button[type="submit"] span');

    DOMElements.postForm.reset();
    document.getElementById('lostFoundStatusGroup').classList.add('hidden');
    document.getElementById('resourceCategoryGroup').classList.add('hidden');
    document.getElementById('courseCostGroup').classList.add('hidden');

    document.getElementById('postType').value = postType;

    if (isEditing) {
        title.textContent = `Edit ${postType.charAt(0).toUpperCase() + postType.slice(1)}`;
        submitBtnSpan.textContent = 'Save Changes';
        document.getElementById('postId').value = postData.id;
        document.getElementById('postTitle').value = postData.title;
        document.getElementById('postDesc').value = postData.description;
    } else {
        title.textContent = `Create New ${postType.charAt(0).toUpperCase() + postType.slice(1)}`;
        submitBtnSpan.textContent = 'Submit Post';
        document.getElementById('postId').value = '';
    }

    if (postType === 'lostfound') document.getElementById('lostFoundStatusGroup').classList.remove('hidden');
    else if (postType === 'resources') document.getElementById('resourceCategoryGroup').classList.remove('hidden');
    else if (postType === 'courses') document.getElementById('courseCostGroup').classList.remove('hidden');

    DOMElements.postModal.classList.add('show');
}

export function getAvatarDisplayUrl(user) {
    if (user.avatar_path) return `${user.avatar_path}?t=${new Date().getTime()}`;
    const seedValue = user.avatarSeed || user.username;
    return `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seedValue)}`;
}