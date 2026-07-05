import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase config - REPLACE WITH YOUR CREDENTIALS
const firebaseConfig = {
 apiKey: "AIzaSyDpx1cv9OjrocEDdtbNH3hFbLkCqPcOqZc",
  authDomain: "zaika-darbar-37a78.firebaseapp.com",
  databaseURL: "https://zaika-darbar-37a78-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "zaika-darbar-37a78",
  storageBucket: "zaika-darbar-37a78.firebasestorage.app",
  messagingSenderId: "771752919398",
  appId: "1:771752919398:web:f8e265c0367007dbca08a7"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
