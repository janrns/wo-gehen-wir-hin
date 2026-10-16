import { initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const useEmulators = import.meta.env.MODE === "emulator";

// Die Web-Konfiguration ist öffentlich und darf im Code stehen.
const firebaseConfig = {
  apiKey: "AIzaSyAFA51x7e344DCmuGcRaG_uhRr3AGpwkCo",
  authDomain: "wo-gehen-wir-hin.firebaseapp.com",
  projectId: useEmulators ? "demo-wo-gehen-wir-hin" : "wo-gehen-wir-hin",
  storageBucket: "wo-gehen-wir-hin.firebasestorage.app",
  messagingSenderId: "684891421654",
  appId: "1:684891421654:web:f8e8cc049de06dd3bec277",
};

export const app = initializeApp(firebaseConfig);
// Ohne Popup/Redirect-Resolver: Wir brauchen nur die anonyme Anmeldung, so lädt kein Google-Skript nach.
export const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const functions = getFunctions(app, "europe-west3");

if (useEmulators) {
  const host = location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
}
