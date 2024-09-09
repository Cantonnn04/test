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

    // Show create account form
    createAccountBtn.addEventListener('click', () => {
        initialContainer.style.display = 'none';
        createAccountContainer.style.display = 'block';
    });

    // Show login form
    goToLoginBtn.addEventListener('click', () => {
        initialContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    // Handle account creation
    createAccountSubmitBtn.addEventListener('click', () => {
        const newUsername = newUsernameInput.value;
        const newPassword = newPasswordInput.value;

        if (!newUsername || !newPassword) {
            createErrorMsg.textContent = "Please fill in both fields.";
            return;
        }

        if (localStorage.getItem(newUsername)) {
            createErrorMsg.textContent = "Username already exists!";
            return;
        }

        localStorage.setItem(newUsername, newPassword);
        alert("Account created successfully! You can now log in.");
        createAccountContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });

    // Handle login
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            loginErrorMsg.textContent = "Please fill in both fields.";
            return;
        }

        const storedPassword = localStorage.getItem(username);

        if (storedPassword === password) {
            showNotesSection(username);
        } else {
            loginErrorMsg.textContent = "Invalid username or password!";
        }
    });

    function showNotesSection(username) {
        loginContainer.style.display = 'none';
        notesContainer.style.display = 'block';
        userDisplay.textContent = username;

        // Load saved notes
        const savedNotes = localStorage.getItem(`${username}-notes`);
        if (savedNotes) {
            userNotes.value = savedNotes;
        }
    }

    // Save notes
    saveNotesBtn.addEventListener('click', () => {
        const username = userDisplay.textContent;
        localStorage.setItem(`${username}-notes`, userNotes.value);
        alert("Notes saved successfully!");
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        initialContainer.style.display = 'block';
        notesContainer.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        loginErrorMsg.textContent = '';
    });
});
