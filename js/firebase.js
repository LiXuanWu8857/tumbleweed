// ══ Firebase 初始化 ══
// 此檔案以 type="module" 載入，初始化後將 API 掛到 window 供其他 script 使用

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1cKMJr3yCe5y6vNGtoM9HfX2xDUsUVBQ",
  authDomain: "tumblweed-7c629.firebaseapp.com",
  databaseURL: "https://tumblweed-7c629-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tumblweed-7c629",
  storageBucket: "tumblweed-7c629.firebasestorage.app",
  messagingSenderId: "794571028684",
  appId: "1:794571028684:web:300b1b282ce34bcbd8ea69"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window._db = db;
window._ref = ref;
window._set = set;
window._update = update;
window._remove = remove;
window._onValue = onValue;
window._dbReady = true;
