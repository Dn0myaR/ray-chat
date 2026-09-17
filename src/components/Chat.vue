<template>
  <div class="chat-container">
    <h2>Realtime Chat</h2>
    
    <!-- Step A: Enter Username -->
    <div v-if="!username" class="user-input">
      <input v-model="tempName" placeholder="Enter your username..." @keyup.enter="setUsername" />
      <button @click="setUsername">Join Chat</button>
    </div>

    <!-- Step B: Chat Interface -->
    <div v-else>
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
import { ref, onMounted } from 'vue';
import { db } from '../firebase';
import { ref as dbRef, push, onValue } from 'firebase/database';

const username = ref('');
const tempName = ref('');
const newMessage = ref('');
const messages = ref([]);

const setUsername = () => {
  if (tempName.value.trim()) {
    username.value = tempName.value.trim();
  }
};

const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  
  const messagesRef = dbRef(db, 'messages');
  push(messagesRef, {
    user: username.value,
    text: newMessage.value,
    timestamp: Date.now()
  });
  
  newMessage.value = '';
};

onMounted(() => {
  const messagesRef = dbRef(db, 'messages');
  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    const list = [];
    if (data) {
      Object.keys(data).forEach((key) => {
        list.push({ id: key, ...data[key] });
      });
    }
    messages.value = list;
  });
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
</style>