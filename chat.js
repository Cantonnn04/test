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

const db = firebase.database();
const user = firebase.auth().currentUser;

// Load chat history
const chatArea = document.getElementById('chat-area');
const newChatBtn = document.getElementById('new-chat-btn');
const sendBtn = document.getElementById('send-btn');
const messageInput = document.getElementById('message-input');

// Listen for new messages
db.ref('chats/').on('child_added', (snapshot) => {
  const message = snapshot.val();
  const msgElem = document.createElement('div');
  msgElem.textContent = `${message.sender}: ${message.text}`;
  chatArea.appendChild(msgElem);
});

// Send a new message
sendBtn.addEventListener('click', () => {
  const message = messageInput.value;
  db.ref('chats/').push({
    sender: user.email,
    text: message,
    timestamp: new Date().toISOString()
  });
  messageInput.value = '';
});

// Create a new chat
newChatBtn.addEventListener('click', () => {
  const recipient = prompt("Enter the user's email:");
  if (recipient) {
    // Logic to create a new chat room between users
    alert('Chat created!');
  }
});
