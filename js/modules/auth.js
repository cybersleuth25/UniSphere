import { showToast } from './ui.js';

const AUTH_KEY = 'unisphere_auth';

export function initialize() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const verifyOtpForm = document.getElementById('verifyOtpForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    if (verifyOtpForm) {
        // Pre-fill email from URL for OTP form
        const urlParams = new URLSearchParams(window.location.search);
        const email = urlParams.get('email');
        if (email) {
            document.getElementById('email').value = email;
        }
        verifyOtpForm.addEventListener('submit', handleVerifyOtp);
    }
    if (resetPasswordForm) resetPasswordForm.addEventListener('submit', handleResetPassword);
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('login.php', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
            showToast(data.message, 'success');
            setTimeout(() => window.location.href = 'index.html', 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred during login.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('signup.php', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
            showToast(data.message, 'success');
            setTimeout(() => window.location.href = 'index.html', 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred during signup.', 'error');
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    try {
        const response = await fetch('forgot-password.php', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => window.location.href = `verify-otp.html?email=${encodeURIComponent(email)}`, 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}

async function handleVerifyOtp(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('verify-otp.php', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => window.location.href = 'reset-password.html', 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}

async function handleResetPassword(e) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        showToast("Passwords do not match.", "error");
        return;
    }

    const formData = new FormData(e.target);
    try {
        const response = await fetch('reset-password.php', { method: 'POST', body: formData });
        const data = await response.json();

        if (data.success) {
            showToast(data.message, 'success');
            setTimeout(() => window.location.href = 'login.html', 1000);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('An error occurred.', 'error');
    }
}