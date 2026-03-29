import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot, collection } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── FIREBASE CONFIG ──
const firebaseConfig = {
    apiKey: "AIzaSyBkGVV3gU9j6x32xjgZ-eyB5oaJz1wajZs",
    authDomain: "shiokbus.firebaseapp.com",
    projectId: "shiokbus",
    storageBucket: "shiokbus.firebasestorage.app",
    messagingSenderId: "626804206073",
    appId: "1:626804206073:web:7340d05ab8e0b332703528",
    measurementId: "G-XH58G4RZQ6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let unsubFavs = null;

// Expose to global scope
window._fbAuth = auth;
window._fbDb = db;
window._fbProvider = provider;
window._fbSignInWithPopup = signInWithPopup;
window._fbSignOut = signOut;
window._fbDoc = doc;
window._fbGetDoc = getDoc;
window._fbSetDoc = setDoc;
window._fbDeleteDoc = deleteDoc;
window._fbOnSnapshot = onSnapshot;
window._fbCollection = collection;

// Auth state listener
onAuthStateChanged(auth, user => {
    currentUser = user;
    window._currentUser = user;
    if (user) {
        document.getElementById('auth-btn').innerHTML = `<img src="${user.photoURL}" style="width:26px;height:26px;border-radius:50%;margin-right:6px;vertical-align:middle"><span class="auth-name">${user.displayName.split(' ')[0]}</span>`;
        document.getElementById('auth-btn').title = 'Settings';
        window.renderSettingsAccount && window.renderSettingsAccount();
        // Show favourites tab
        const favTabBtn = document.getElementById('tab-favs');
        if (favTabBtn) favTabBtn.style.display = '';
        // Load UI preferences (theme/default tab) from Firestore
        window.loadUiPreferences && window.loadUiPreferences();
        // Load alert banner preference
        window.renderSettingsAlerts && window.renderSettingsAlerts();
        // Subscribe to favourites
        if (unsubFavs) unsubFavs();
        // Load fav order from Firestore first, then subscribe
        loadFavOrder().then(() => {
        unsubFavs = onSnapshot(collection(db, 'users', user.uid, 'favourites'), snap => {
            window._favs = {};
            snap.forEach(d => { window._favs[d.id] = d.data(); });
            window.renderFavourites && window.renderFavourites();
            window.updateFavButtons && window.updateFavButtons();
        });
        });
    } else {
        document.getElementById('auth-btn').innerHTML = '<span style="font-size:16px;margin-right:4px">👤</span><span class="auth-name"> Sign in</span>';
        document.getElementById('auth-btn').title = 'Settings';
        window.renderSettingsAccount && window.renderSettingsAccount();
        // Hide favourites tab and switch away if currently on it
        const favTabBtn2 = document.getElementById('tab-favs');
        if (favTabBtn2) favTabBtn2.style.display = 'none';
        if (currentTab === 'favs') switchTab('service');
        window._favs = {};
        FAV_ORDER = { service: [], stop: [], plan: [] };
        if (unsubFavs) { unsubFavs(); unsubFavs = null; }
        window.updateFavButtons && window.updateFavButtons();
    }
});

window.authAction = async () => {
    if (window._currentUser) {
        document.getElementById('signout-modal').style.display = 'flex';
    } else {
        try {
        await signInWithPopup(auth, provider);
        } catch(e) {
        console.error('Sign-in error:', e);
        const msg = {
            'auth/configuration-not-found': 'Firebase not configured. Check your config keys.',
            'auth/unauthorized-domain': 'This domain is not authorised in Firebase Console → Authentication → Authorised domains.',
            'auth/popup-blocked': 'Popup was blocked by your browser. Please allow popups for this site.',
            'auth/popup-closed-by-user': 'Sign-in cancelled.',
            'auth/invalid-api-key': 'Invalid API key — check your Firebase config.',
            'auth/network-request-failed': 'Network error. Check your internet connection.',
        }[e.code] || `Error: ${e.code || e.message}`;
        toast('⚠️ ' + msg, 5000);
        }
    }
};

window.toggleFav = async (key, data) => {
    if (!window._currentUser) { toast('Sign in to save favourites'); return; }
    const ref = doc(db, 'users', window._currentUser.uid, 'favourites', key);
    if (window._favs && window._favs[key]) {
        await deleteDoc(ref);
        toast('Removed from favourites');
    } else {
        await setDoc(ref, data);
        toast('Added to favourites ⭐');
    }
};