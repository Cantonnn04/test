// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC_15aoMvS21YXI28zMDLJC_fl5aRdwnq0",
    authDomain: "project-2141e.firebaseapp.com",
    projectId: "project-2141e",
    storageBucket: "project-2141e.appspot.com",
    messagingSenderId: "608040618536",
    appId: "1:608040618536:web:a41a6e0c6a5decbf5b031d",
    measurementId: "G-DZBS9BYVT0"
  };
firebase.initializeApp(firebaseConfig);

// Get elements
const authForm = document.getElementById('auth-form');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');

signupBtn.addEventListener('click', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert('Signed up successfully!');
      window.location.href = "user_home.html"; // Redirect to user's homepage
    })
    .catch(error => alert(error.message));
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      alert('Logged in successfully!');
      window.location.href = "user_home.html"; // Redirect to user's homepage
    })
    .catch(error => alert(error.message));
});
