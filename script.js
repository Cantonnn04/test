// Import the Firebase functions needed for authentication and analytics
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// Firebase configuration object with API keys and project information
const firebaseConfig = {
  apiKey: "AIzaSyDrbYN-8Iuq503KC4JooYzArA_6z_Fvewo",
  authDomain: "main-4cda0.firebaseapp.com",
  projectId: "main-4cda0",
  storageBucket: "main-4cda0.appspot.com",
  messagingSenderId: "586786204464",
  appId: "1:586786204464:web:ae4fdefed0bd566d4276f5",
  measurementId: "G-EVGZQK94C2"
};

// Initialize Firebase app and analytics
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Getting references to HTML elements by their ID
const submitButton = document.getElementById("submit");
const signupButton = document.getElementById("sign-up");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const main = document.getElementById("main");
const createacct = document.getElementById("create-acct");
const passwordReset = document.getElementById("reset-password");
const signupEmailIn = document.getElementById("email-signup");
const confirmSignupEmailIn = document.getElementById("confirm-email-signup");
const signupPasswordIn = document.getElementById("password-signup");
const confirmSignUpPasswordIn = document.getElementById("confirm-password-signup");
const createacctbtn = document.getElementById("create-acct-btn");
const returnBtn = document.getElementById("return-btn");

var email, password, signupEmail, signupPassword, confirmSignupEmail, confirmSignUpPassword;

// Event listener for creating a new account when the "Create Account" button is clicked
createacctbtn.addEventListener("click", function() {
  var isVerified = true;

  // Get values from the signup input fields
  signupEmail = signupEmailIn.value;
  confirmSignupEmail = confirmSignupEmailIn.value;

  // Check if email fields match
  if (signupEmail != confirmSignupEmail) {
    window.alert("Email fields do not match. Try again.");
    isVerified = false;
  }

  // Get values from the password fields
  signupPassword = signupPasswordIn.value;
  confirmSignUpPassword = confirmSignUpPasswordIn.value;

  // Check if password fields match
  if (signupPassword != confirmSignUpPassword) {
    window.alert("Password fields do not match. Try again.");
    isVerified = false;
  }

  // Ensure all required fields are filled
  if (signupEmail == null || confirmSignupEmail == null || signupPassword == null || confirmSignUpPassword == null) {
    window.alert("Please fill out all required fields.");
    isVerified = false;
  }

  // If all verification checks pass, create a new user in Firebase
  if (isVerified) {
    createUserWithEmailAndPassword(auth, signupEmail, signupPassword)
      .then((userCredential) => {
        // User successfully signed up
        const user = userCredential.user;
        window.alert("Success! Account created.");
      })
      .catch((error) => {
        // Handle errors during signup
        const errorCode = error.code;
        const errorMessage = error.message;
        window.alert("Error occurred. Try again.");
      });
  }
});

const userSection = document.getElementById("user-section");
const userEmailSpan = document.getElementById("user-email");
const passSection = document.getElementById("reset-pass");

// Event listener for the reset password button
passwordReset.addEventListener("click", function() {
  main.style.display = "none";
  createacct.style.display = "none";
  passSection.style.display = "block";
});


// Event listener for the login button
submitButton.addEventListener("click", function() {
  email = emailInput.value;
  password = passwordInput.value;

  // Sign in the user with Firebase Authentication
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // User successfully signed in
      const user = userCredential.user;
      console.log("Success! Welcome back!");
      window.alert("Success! Welcome back!");

      // Hide the login/signup form and show the user section
      main.style.display = "none";
      createacct.style.display = "none";
      userSection.style.display = "block";
      
      // Set the email in the user section
      userEmailSpan.textContent = user.email;
    })
    .catch((error) => {
      // Handle errors during login
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log("Error occurred. Try again.");
      window.alert("Error occurred. Try again.");
    });
});

// Event listener for switching to the signup form
signupButton.addEventListener("click", function() {
  main.style.display = "none";  // Hide the login form
  createacct.style.display = "block";  // Show the signup form
});

// Event listener for returning to the login form from the signup form
returnBtn.addEventListener("click", function() {
  main.style.display = "block";  // Show the login form
  createacct.style.display = "none";  // Hide the signup form
  passSection.style.display = "none"; // Hide the password reset form
});




