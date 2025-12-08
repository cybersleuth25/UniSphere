export const API_BASE_URL = 'api/';

async function fetchApi(endpoint, options = {}) {
    try {
        // For globalSearch, the endpoint is in the root, not /api/
        const url = endpoint.startsWith('api.php') ? endpoint : `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

export const getPosts = (tab, filters) => {
    const params = new URLSearchParams({ postType: tab, ...filters });
    return fetchApi(`posts.php?${params.toString()}`);
};
export const createPost = (formData) => fetchApi('posts.php', { method: 'POST', body: formData });
export const updatePost = (postData) => fetchApi('posts.php', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
export const deletePost = (postId) => fetchApi(`posts.php?id=${postId}`, { method: 'DELETE' });
export const likePost = (postId) => {
    const formData = new FormData();
    formData.append('likePostId', postId);
    return fetchApi('posts.php', { method: 'POST', body: formData });
};
export const getRecommendations = (postId) => fetchApi(`posts.php?recommendationsForPost=${postId}`);
export const searchUsers = (query) => fetchApi(`friends.php?searchUsers=${encodeURIComponent(query)}`);
export const getFriendshipStatus = (email) => fetchApi(`friends.php?checkFriendshipStatus=${email}`);
export const getFriends = () => fetchApi('friends.php?fetch=friends');
export const getFriendRequests = () => fetchApi('friends.php?fetch=requests');
export const performFriendAction = (action, email) => {
    const formData = new FormData();
    formData.append('friendAction', action);
    formData.append('email', email);
    return fetchApi('friends.php', { method: 'POST', body: formData });
};
export const getConversations = () => fetchApi('messages.php?fetch=conversations');
export const getMessages = (conversationId) => fetchApi(`messages.php?fetch=messages&conversation_id=${conversationId}`);
export const sendMessage = (conversationId, message) => {
    const formData = new FormData();
    formData.append('action', 'sendMessage');
    formData.append('conversationId', conversationId);
    formData.append('message', message);
    return fetchApi('messages.php', { method: 'POST', body: formData });
};
export const startConversation = (email) => {
    const formData = new FormData();
    formData.append('action', 'startConversation');
    formData.append('email', email);
    return fetchApi('messages.php', { method: 'POST', body: formData });
};
export const globalSearch = (query) => fetchApi(`api.php?globalSearch=${encodeURIComponent(query)}`);