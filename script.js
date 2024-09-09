// script.js
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const notesContainer = document.getElementById('notes-container');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const saveNotesBtn = document.getElementById('save-notes-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');
    const userNotes = document.getElementById('user-notes');
    const errorMsg = document.getElementById('error-msg');

    function login() {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (!username || !password) {
            errorMsg.textContent = "Please enter both username and password.";
            return;
        }

        // Check if user exists
        const storedPassword = localStorage.getItem(username);

        if (storedPassword) {
            // Login user if password matches
            if (storedPassword === password) {
                showNotesSection(username);
            } else {
                errorMsg.textContent = "Incorrect password!";
            }
        } else {
            // Register new user
            localStorage.setItem(username, password);
            showNotesSection(username);
        }
    }

    function showNotesSection(username) {
        loginContainer.style.display = 'none';
        notesContainer.style.display = 'block';
        userDisplay.textContent = username;

        // Load saved notes if they exist
        const savedNotes = localStorage.getItem(`${username}-notes`);
        if (savedNotes) {
            userNotes.value = savedNotes;
        }
    }

    function saveNotes() {
        const username = userDisplay.textContent;
        localStorage.setItem(`${username}-notes`, userNotes.value);
        alert("Notes saved successfully!");
    }

    function logout() {
        loginContainer.style.display = 'block';
        notesContainer.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        errorMsg.textContent = '';
    }

    loginBtn.addEventListener('click', login);
    saveNotesBtn.addEventListener('click', saveNotes);
    logoutBtn.addEventListener('click', logout);
});
