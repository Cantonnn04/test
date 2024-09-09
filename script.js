// script.js
document.addEventListener('DOMContentLoaded', () => {
    const initialContainer = document.getElementById('initial-container');
    const createAccountContainer = document.getElementById('create-account-container');
    const loginContainer = document.getElementById('login-container');
    const notesContainer = document.getElementById('notes-container');

    const createAccountBtn = document.getElementById('create-account-btn');
    const goToLoginBtn = document.getElementById('go-to-login-btn');
    const createAccountSubmitBtn = document.getElementById('create-account-submit-btn');
    const loginBtn = document.getElementById('login-btn');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const logoutBtn = document.getElementById('logout-btn');

    const newUsernameInput = document.getElementById('new-username');
    const newPasswordInput = document.getElementById('new-password');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const userDisplay = document.getElementById('user-display');
    const userNotes = document.getElementById('user-notes');
    const createErrorMsg = document.getElementById('create-error-msg');
    const loginErrorMsg = document.getElementById('login-error-msg');

    // Show create account
