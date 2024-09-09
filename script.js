// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqJaGisSDMrmHQMWq6BL7_MztWKOj8CcE",
  authDomain: "onlinenotes-e2e5a.firebaseapp.com",
  projectId: "onlinenotes-e2e5a",
  storageBucket: "onlinenotes-e2e5a.appspot.com",
  messagingSenderId: "807757549920",
  appId: "1:807757549920:web:58578120d984841138ce05",
  measurementId: "G-YLMGKWY3YW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const signupButton = document.getElementById('signup');
const loginButton = document.getElementById('login');
const authError = document.getElementById('auth-error');
const authSection = document.getElementById('auth-section');
const notesSection = document.getElementById('notes-section');
const createNoteBtn = document.getElementById('create-note-btn');
const newNoteSection = document.getElementById('new-note-section');
const noteTitleField = document.getElementById('note-title');
const noteContentField = document.getElementById('note-content');
const saveNewNoteBtn = document.getElementById('save-new-note');
const notesList = document.getElementById('notes-list');
const editNoteSection = document.getElementById('edit-note-section');
const editNoteTitle = document.getElementById('edit-note-title');
const editNoteContent = document.getElementById('edit-note-content');
const saveNoteBtn = document.getElementById('save-note');
const saveStatus = document.getElementById('save-status');
const logoutButton = document.getElementById('logout');

let currentNoteId = null;

// Handle Sign-Up
signupButton.addEventListener('click', async () => {
  const email = emailField.value;
  const password = passwordField.value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    authError.textContent = error.message;
  }
});

// Handle Login
loginButton.addEventListener('click', async () => {
  const email = emailField.value;
  const password = passwordField.value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    authError.textContent = error.message;
  }
});

// Listen for Authentication State Changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Show notes section and hide auth section
    authSection.classList.remove('active');
    notesSection.classList.add('active');

    // Load notes from Firestore
    loadNotes(user.uid);

  } else {
    // Show auth section and hide notes section
    authSection.classList.add('active');
    notesSection.classList.remove('active');
  }
});

// Load user notes
async function loadNotes(userId) {
  notesList.innerHTML = '';
  const notesSnapshot = await getDocs(collection(db, `users/${userId}/notes`));
  notesSnapshot.forEach((doc) => {
    const note = doc.data();
    const noteItem = document.createElement('li');
    noteItem.textContent = note.title;
    noteItem.addEventListener('click', () => openNoteForEditing(doc.id, note.title, note.content));
    notesList.appendChild(noteItem);
  });
}

// Create a new note
createNoteBtn.addEventListener('click', () => {
  newNoteSection.style.display = 'block';
  editNoteSection.style.display = 'none';
});

saveNewNoteBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  const title = noteTitleField.value;
  const content = noteContentField.value;
  if (user && title && content) {
    await addDoc(collection(db, `users/${user.uid}/notes`), {
      title: title,
      content: content,
    });
    saveStatus.textContent = 'Note created!';
    newNoteSection.style.display = 'none';
    loadNotes(user.uid);
  }
});

// Open an existing note for editing
function openNoteForEditing(noteId, title, content) {
  editNoteSection.style.display = 'block';
  newNoteSection.style.display = 'none';
  editNoteTitle.textContent = title;
  editNoteContent.value = content;
  currentNoteId = noteId;
}

// Save changes to an existing note
saveNoteBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  const content = editNoteContent.value;
  if (user && currentNoteId) {
    await updateDoc(doc(db, `users/${user.uid}/notes`, currentNoteId), {
      content: content,
    });
    saveStatus.textContent = 'Note updated!';
    loadNotes(user.uid);
  }
});

// Handle Logout
logoutButton.addEventListener('click', () => {
  signOut(auth);
});
