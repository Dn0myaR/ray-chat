import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDppwUP8PqYdfAA6E5qOTvtBkyykikQHOE",
  authDomain: "realtimechat-b2564.firebaseapp.com",
  databaseURL: "https://realtimechat-b2564-default-rtdb.firebaseio.com",
  projectId: "realtimechat-b2564",
  storageBucket: "realtimechat-b2564.firebasestorage.app",
  messagingSenderId: "20496044997",
  appId: "1:20496044997:web:b9ed8868dad197f3e331ac",
  measurementId: "G-3D4XKEREST"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);