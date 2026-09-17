<template>
  <div class="chat-container">
    <h2>Realtime Chat</h2>

    <!-- Step A: Enter Username -->
    <div v-if="!username" class="user-input">
      <input v-model="tempName" placeholder="Enter your username..." @keyup.enter="setUsername" />
      <button @click="setUsername">Join Chat</button>
    </div>

    <!-- Step B: Room Selection / Creation -->
    <div v-else-if="!currentRoom" class="room-selection">
      <h3>Welcome, {{ username }}!</h3>
      
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
          <span><strong>{{ room.name }}</strong></span>
          <div class="join-box">
            <input 
              v-model="roomInputPasswords[roomId]" 
              type="password" 
              placeholder="Enter password" 
              @keyup.enter="joinRoom(roomId, room.password)"
            />
            <button @click="joinRoom(roomId, room.password)">Join</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step C: Active Chat Room -->
    <div v-else>
      <div class="chat-header">
        <h3>Room: {{ currentRoom.name }}</h3>
        <button class="leave-btn" @click="leaveRoom">Leave Room</button>
      </div>

      <div class="messages">
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          :class="['message', msg.user === username ? 'own' : '']"
        >
          <strong>{{ msg.user }}:</strong> {{ msg.text }}
        </div>
      </div>

      <div class="input-box">
        <input v-model="newMessage" placeholder="Type a message..." @keyup.enter="sendMessage" />
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { db } from '../firebase';
import { ref as dbRef, push, onValue, off } from 'firebase/database';

const username = ref('');
const tempName = ref('');
const newMessage = ref('');
const messages = ref([]);

// Room state
const rooms = ref({});
const currentRoom = ref(null);
const newRoomName = ref('');
const newRoomPassword = ref('');
const roomInputPasswords = ref({});

let messagesListener = null;

const setUsername = () => {
  if (tempName.value.trim()) {
    username.value = tempName.value.trim();
  }
};

// Create a new room in Firebase under `/rooms`
const createRoom = () => {
  if (!newRoomName.value.trim() || !newRoomPassword.value.trim()) {
    alert('Both Room Name and Password are required!');
    return;
  }

  const roomsRef = dbRef(db, 'rooms');
  const newRoomRef = push(roomsRef, {
    name: newRoomName.value.trim(),
    password: newRoomPassword.value.trim(),
    createdAt: Date.now()
  });

  // Automatically join the newly created room
  listenToRoomMessages(newRoomRef.key, newRoomName.value.trim());
  newRoomName.value = '';
  newRoomPassword.value = '';
};

// Join room with password check
const joinRoom = (roomId, correctPassword) => {
  const enteredPassword = roomInputPasswords.value[roomId];
  if (enteredPassword === correctPassword) {
    listenToRoomMessages(roomId, rooms.value[roomId].name);
  } else {
    alert('Incorrect password!');
  }
};

// Detach room listener and leave
const leaveRoom = () => {
  if (currentRoom.value && messagesListener) {
    const messagesRef = dbRef(db, `rooms/${currentRoom.value.id}/messages`);
    off(messagesRef, 'value', messagesListener);
  }
  currentRoom.value = null;
  messages.value = [];
};

// Subscribe to messages under `/rooms/<roomId>/messages`
const listenToRoomMessages = (roomId, roomName) => {
  currentRoom.value = { id: roomId, name: roomName };
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

const sendMessage = () => {
  if (!newMessage.value.trim() || !currentRoom.value) return;

  const messagesRef = dbRef(db, `rooms/${currentRoom.value.id}/messages`);
  push(messagesRef, {
    user: username.value,
    text: newMessage.value,
    timestamp: Date.now()
  });

  newMessage.value = '';
};

// Load available rooms on mount
onMounted(() => {
  const roomsRef = dbRef(db, 'rooms');
  onValue(roomsRef, (snapshot) => {
    rooms.value = snapshot.val() || {};
  });
});

// Cleanup listeners on unmount
onUnmounted(() => {
  leaveRoom();
  const roomsRef = dbRef(db, 'rooms');
  off(roomsRef);
});
</script>

<style scoped>
.chat-container { max-width: 500px; margin: 40px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
.messages { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 4px; display: flex; flex-direction: column; }
.message { margin-bottom: 8px; text-align: left; }
.own { text-align: right; color: #007bff; }
.input-box, .user-input { display: flex; gap: 8px; }
input { flex: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
button { padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }

.create-room, .available-rooms { margin-bottom: 20px; display: flex; flex-direction: column; gap: 8px; }
.room-card { display: flex; justify-content: space-between; align-items: center; padding: 8px; border: 1px solid #eee; margin-bottom: 8px; border-radius: 4px; }
.join-box { display: flex; gap: 4px; }
.chat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.leave-btn { background-color: #dc3545; }
hr { margin: 15px 0; border: 0; border-top: 1px solid #ddd; }
</style>