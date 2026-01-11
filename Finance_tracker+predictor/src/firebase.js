import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyADYoHnAq1K6639dGdueuzPZZD7dUyh5CA",
  authDomain: "expense-tracker-de11e.firebaseapp.com",
  projectId: "expense-tracker-de11e",
  storageBucket: "expense-tracker-de11e.firebasestorage.app",
  messagingSenderId: "964839454595",
  appId: "1:964839454595:web:6eac3c2f9aa3e1aa9428b6",
  measurementId: "G-39N20Q74XM"
};

export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// ✅ Add this for Google Sign-In
const provider = new GoogleAuthProvider();

const requestPermission = async (userId) => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey:
          "BBYjmebdTvft2c7tZrDdmksFoYj2l41uRoH8v5je8mzI6x_snqkuMFGJPIpIQRsBPbWD1NMz017aDSm11VlP_Oo",
      });
      console.log("FCM Token:", token);

      await setDoc(
        doc(db, "users", userId),
        { fcmToken: token },
        { merge: true }
      );

      return token;
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
  }
};

onMessage(messaging, (payload) => {
  console.log("Message received:", payload);
  new Notification(payload.notification.title, {
    body: payload.notification.body,
  });
});

export { auth, db, messaging, provider, requestPermission }; // 
