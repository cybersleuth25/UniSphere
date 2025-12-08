const AUTH_KEY = 'unisphere_auth';

function getAuthInfo() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function getAvatarDisplayUrl(user) {
    // This logic now correctly handles both uploaded and generated avatars
    if (user.avatar_path) return `${user.avatar_path}?t=${new Date().getTime()}`;
    
    // Fallback to localStorage if the server data is incomplete
    const localUser = getAuthInfo();
    const seedValue = user.avatarSeed || localUser.avatarSeed || user.username;
    
    // This is the new, modern avatar style
    return `https://api.dicebear.com/8.x/thumbs/svg?seed=${encodeURIComponent(seedValue)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // serverData is provided by profile.php
    if (typeof serverData === 'undefined') return;

    const avatarImg = document.getElementById('profileAvatarImg');
    avatarImg.src = getAvatarDisplayUrl(serverData.user);

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
                formData.append('avatar_path_reset', 'true'); // Send a flag to reset
                fetch('update-profile.php', { method: 'POST', body: formData })
                    .then(() => location.reload());
            });
        }
    }
});