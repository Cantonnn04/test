<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyC_15aoMvS21YXI28zMDLJC_fl5aRdwnq0",
    authDomain: "project-2141e.firebaseapp.com",
    projectId: "project-2141e",
    storageBucket: "project-2141e.appspot.com",
    messagingSenderId: "608040618536",
    appId: "1:608040618536:web:a41a6e0c6a5decbf5b031d",
    measurementId: "G-DZBS9BYVT0"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>