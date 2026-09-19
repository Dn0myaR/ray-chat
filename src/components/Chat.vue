<template>
  <div class="chat-container">
    <h2>Ooooppss!!!</h2>

    <!-- Step A: Auth View (Login / Register) -->
    <div v-if="!currentUser" class="auth-box">
      <!-- Toggle Tabs -->
      <div class="auth-tabs">
        <button :class="{ active: authMode === 'login' }" @click="authMode = 'login'">Login</button>
        <button :class="{ active: authMode === 'register' }" @click="authMode = 'register'">Register</button>
      </div>

      <!-- Register Form -->
      <form v-if="authMode === 'register'" @submit.prevent="handleRegister" class="auth-form">
        <h3>Create Account</h3>
        <input v-model="regForm.username" placeholder="Username (Required)" required />
        <input v-model="regForm.firstName" placeholder="First Name" required />
        <input v-model="regForm.lastName" placeholder="Surname" required />
        <input v-model="regForm.email" type="email" placeholder="Email (Optional)" />
        <input v-model="regForm.password" type="password" placeholder="Password (Required)" required />
        <button type="submit">Register</button>
      </form>

      <!-- Login Form -->
      <form v-else @submit.prevent="handleLogin" class="auth-form">
        <h3>Login</h3>
        <input v-model="loginForm.username" placeholder="Username" required />
        <input v-model="loginForm.password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
    </div>

    <!-- Step B: Room Selection / Creation -->
    <div v-else-if="!currentRoom" class="room-selection">
      <div class="user-profile-header">
        <div>
          <h3>Welcome, {{ currentUser.firstName }} {{ currentUser.lastName }}!</h3>
          <small>@{{ currentUser.username }}</small>
        </div>
        <button class="logout-btn" @click="handleLogout">Logout</button>
      </div>
      
      <!-- Create Room -->
      <div class="create-room">
        <h4>Create a Room</h4>
        <input v-model="newRoomName" placeholder="Room Name" />
        <input v-model="newRoomPassword" type="password" placeholder="Password (required)" />
        <button @click="createRoom">Create & Join</button>
      </div>

      <hr />

      <!-- Available Rooms List -->
      <div class="available-rooms">
        <h4>Available Rooms</h4>
        <div v-if="Object.keys(rooms).length === 0">No rooms available yet.</div>
        <div v-for="(room, roomId) in rooms" :key="roomId" class="room-card">
          <div>
            <strong>{{ room.name }}</strong>
            <small v-if="room.createdBy === currentUser.username" class="owner-badge"> (You created this)</small>
          </div>
          <div class="join-box">
            <input 
              v-model="roomInputPasswords[roomId]" 
              type="password" 
              placeholder="Enter password" 
              @keyup.enter="joinRoom(roomId, room.password)"
            />
            <button @click="joinRoom(roomId, room.password)">Join</button>
            <button 
              v-if="room.createdBy === currentUser.username" 
              class="delete-btn" 
              @click="deleteRoom(roomId)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step C: Active Chat Room -->
    <div v-else>
      <div class="chat-header">
        <div>
          <h3>Room: {{ currentRoom.name }}</h3>
          <small v-if="currentRoom.createdBy === currentUser.username" class="owner-badge">Room Owner</small>
        </div>
        <div class="header-actions">
          <button 
            v-if="currentRoom.createdBy === currentUser.username" 
            class="clear-btn" 
            @click="clearChat"
          >
            Clear Chat
          </button>
          <button class="leave-btn" @click="leaveRoom">Leave Room</button>
        </div>
      </div>

      <!-- Messages View -->
      <div class="messages">
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          :class="['message', msg.user === currentUser.username ? 'own' : '']"
        >
          <strong>{{ msg.user }}:</strong>
          <span v-if="msg.text"> {{ msg.text }}</span>
          
          <!-- File / Image Display -->
          <div v-if="msg.file" class="file-attachment">
            <img 
              v-if="msg.file.type && msg.file.type.startsWith('image/')" 
              :src="msg.file.data" 
              class="chat-image" 
              alt="Shared image"
            />
            <a 
              v-else 
              :href="msg.file.data" 
              :download="msg.file.name" 
              class="file-link"
            >
              📄 Download {{ msg.file.name }}
            </a>
          </div>
        </div>
      </div>

      <!-- Input Box & File Upload -->
      <div class="input-container">
        <div v-if="selectedFile" class="file-preview">
          <span>Attached: {{ selectedFile.name }}</span>
          <button class="remove-file" @click="selectedFile = null">✕</button>
        </div>
        
        <div class="input-box">
          <label class="file-label">
            📎
            <input type="file" @change="handleFileUpload" class="file-input" />
          </label>
          <input v-model="newMessage" placeholder="Type a message..." @keyup.enter="sendMessage" />
          <button @click="sendMessage">Send</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { db } from '../firebase';
import { ref as dbRef, push, onValue, off, remove, set, get } from 'firebase/database';

// User & Auth State
const currentUser = ref(null);
const authMode = ref('login'); // 'login' or 'register'

const regForm = ref({
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  password: ''
});

const loginForm = ref({
  username: '',
  password: ''
});

// Room State & Messages
const newMessage = ref('');
const messages = ref([]);
const rooms = ref({});
const currentRoom = ref(null);
const newRoomName = ref('');
const newRoomPassword = ref('');
const roomInputPasswords = ref({});
const selectedFile = ref(null);

let messagesListener = null;

// --- User Registration ---
const handleRegister = async () => {
  const uName = regForm.value.username.trim().toLowerCase();
  if (!uName || !regForm.value.password.trim()) {
    alert('Username and Password are required!');
    return;
  }

  // Check if username already exists in Firebase
  const userRef = dbRef(db, `users/${uName}`);
  const snapshot = await get(userRef);

  if (snapshot.exists()) {
    alert('Username already taken! Please choose another one.');
    return;
  }

  const userData = {
    username: uName,
    firstName: regForm.value.firstName.trim(),
    lastName: regForm.value.lastName.trim(),
    email: regForm.value.email.trim() || 'N/A',
    password: regForm.value.password.trim() // Note: Store as plaintext for simple setup
  };

  await set(userRef, userData);
  alert('Account created successfully! You are now logged in.');

  // Save session and log in
  loginUserSession(userData);
};

// --- User Login ---
const handleLogin = async () => {
  const uName = loginForm.value.username.trim().toLowerCase();
  const pass = loginForm.value.password.trim();

  if (!uName || !pass) {
    alert('Please enter username and password!');
    return;
  }

  const userRef = dbRef(db, `users/${uName}`);
  const snapshot = await get(userRef);

  if (snapshot.exists()) {
    const userData = snapshot.val();
    if (userData.password === pass) {
      loginUserSession(userData);
    } else {
      alert('Incorrect password!');
    }
  } else {
    alert('Username not found!');
  }
};

// Helper: Save Session to LocalStorage
const loginUserSession = (userData) => {
  currentUser.value = userData;
  localStorage.setItem('ray_chat_user', JSON.stringify(userData));
};

// --- User Logout ---
const handleLogout = () => {
  leaveRoom();
  currentUser.value = null;
  localStorage.removeItem('ray_chat_user');
};

// --- Chat Room Functions ---
const createRoom = () => {
  if (!newRoomName.value.trim() || !newRoomPassword.value.trim()) {
    alert('Both Room Name and Password are required!');
    return;
  }

  const roomsRef = dbRef(db, 'rooms');
  const newRoomRef = push(roomsRef, {
    name: newRoomName.value.trim(),
    password: newRoomPassword.value.trim(),
    createdBy: currentUser.value.username,
    createdAt: Date.now()
  });

  listenToRoomMessages(newRoomRef.key, newRoomName.value.trim(), currentUser.value.username);
  newRoomName.value = '';
  newRoomPassword.value = '';
};

const joinRoom = (roomId, correctPassword) => {
  const enteredPassword = roomInputPasswords.value[roomId];
  if (enteredPassword === correctPassword) {
    const room = rooms.value[roomId];
    listenToRoomMessages(roomId, room.name, room.createdBy);
  } else {
    alert('Incorrect password!');
  }
};

const deleteRoom = (roomId) => {
  if (confirm('Are you sure you want to delete this room? All messages will be lost.')) {
    const roomRef = dbRef(db, `rooms/${roomId}`);
    remove(roomRef);
  }
};

const clearChat = () => {
  if (!currentRoom.value) return;
  if (confirm('Are you sure you want to clear all messages in this room?')) {
    const messagesRef = dbRef(db, `rooms/${currentRoom.value.id}/messages`);
    set(messagesRef, null);
  }
};

const leaveRoom = () => {
  if (currentRoom.value && messagesListener) {
    const messagesRef = dbRef(db, `rooms/${currentRoom.value.id}/messages`);
    off(messagesRef, 'value', messagesListener);
  }
  currentRoom.value = null;
  messages.value = [];
  selectedFile.value = null;
};

const listenToRoomMessages = (roomId, roomName, createdBy) => {
  currentRoom.value = { id: roomId, name: roomName, createdBy };
  const messagesRef = dbRef(db, `rooms/${roomId}/messages`);
  
  messagesListener = onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const list = [];
    if (data) {
      Object.keys(data).forEach((key) => {
        list.push({ id: key, ...data[key] });
      });
    }
    messages.value = list;
  });
};

const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB Limit
  if (file.size > MAX_SIZE) {
    alert('File size exceeds 10MB limit. Please select a smaller file.');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    selectedFile.value = {
      name: file.name,
      type: file.type,
      data: event.target.result
    };
  };
  reader.readAsDataURL(file);
};

const sendMessage = () => {
  if ((!newMessage.value.trim() && !selectedFile.value) || !currentRoom.value) return;

  const messagesRef = dbRef(db, `rooms/${currentRoom.value.id}/messages`);
  const payload = {
    user: currentUser.value.username,
    text: newMessage.value.trim(),
    timestamp: Date.now()
  };

  if (selectedFile.value) {
    payload.file = selectedFile.value;
  }

  push(messagesRef, payload);

  newMessage.value = '';
  selectedFile.value = null;
};

onMounted(() => {
  // Auto-login from localStorage if session exists
  const savedUser = localStorage.getItem('ray_chat_user');
  if (savedUser) {
    try {
      currentUser.value = JSON.parse(savedUser);
    } catch (e) {
      localStorage.removeItem('ray_chat_user');
    }
  }

  const roomsRef = dbRef(db, 'rooms');
  onValue(roomsRef, (snapshot) => {
    rooms.value = snapshot.val() || {};
  });
});

onUnmounted(() => {
  leaveRoom();
  const roomsRef = dbRef(db, 'rooms');
  off(roomsRef);
});
</script>

<style scoped>
.chat-container { max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }

/* Auth Styles */
.auth-box { display: flex; flex-direction: column; gap: 15px; }
.auth-tabs { display: flex; border-bottom: 2px solid #ccc; }
.auth-tabs button { flex: 1; background: none; color: #333; border: none; padding: 10px; font-weight: bold; border-radius: 0; }
.auth-tabs button.active { border-bottom: 3px solid #007bff; color: #007bff; }
.auth-form { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }

/* Profile Header */
.user-profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; background: #f8f9fa; padding: 10px; border-radius: 6px; }
.logout-btn { background-color: #dc3545; font-size: 12px; }

.messages { height: 320px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 4px; display: flex; flex-direction: column; }
.message { margin-bottom: 12px; text-align: left; }
.own { text-align: right; color: #007bff; }
.input-box, .user-input { display: flex; gap: 8px; align-items: center; }
input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }

.create-room, .available-rooms { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.room-card { display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; margin-bottom: 8px; border-radius: 4px; }
.join-box { display: flex; gap: 4px; }
.chat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.header-actions { display: flex; gap: 6px; }

.delete-btn { background-color: #dc3545; padding: 4px 8px; font-size: 12px; }
.clear-btn { background-color: #ffc107; color: #000; }
.leave-btn { background-color: #6c757d; }
.owner-badge { font-size: 11px; color: #28a745; font-weight: bold; }

.file-label { cursor: pointer; font-size: 18px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; }
.file-input { display: none; }
.chat-image { max-width: 200px; max-height: 200px; border-radius: 4px; margin-top: 6px; display: block; }
.file-link { display: inline-block; margin-top: 4px; word-break: break-all; color: #007bff; font-weight: bold; text-decoration: underline; }
.input-container { display: flex; flex-direction: column; gap: 6px; }
.file-preview { font-size: 12px; background: #f0f0f0; padding: 4px 8px; border-radius: 4px; display: flex; justify-content: space-between; }
.remove-file { background: none; border: none; color: red; cursor: pointer; padding: 0; }
hr { margin: 15px 0; border: 0; border-top: 1px solid #ddd; }
</style>