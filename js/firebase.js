/* GenUI Firebase Integration & Persistence Engine */

const firebaseConfig = {
  apiKey: "AIzaSyDrqKFNgfJYs8OXMpXHJU6N73SBK6wqf64",
  authDomain: "genui-4fd74.firebaseapp.com",
  projectId: "genui-4fd74",
  storageBucket: "genui-4fd74.firebasestorage.app",
  messagingSenderId: "261945930323",
  appId: "1:261945930323:web:64fb34db006f6832094ca6",
  measurementId: "G-9W5GXP04PQ"
};

window.firebaseConfig = firebaseConfig;

const FirebaseEngine = {
  db: null,
  auth: null,
  isFirebaseActive: false,

  init() {
    if (window.firebase) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.isFirebaseActive = true;
        console.log('[Firebase] Initialized successfully for project:', firebaseConfig.projectId);
      } catch (err) {
        console.warn('[Firebase] Init notice:', err);
      }
    } else {
      console.log('[Firebase] SDK pending. LocalStorage active.');
    }
  },

  // Save Workflow
  async saveWorkflow(workflowData) {
    const userId = this.getCurrentUserId();
    const docData = {
      id: workflowData.id || 'wf_' + Date.now(),
      userId: userId,
      title: workflowData.title || 'Untitled Workflow',
      prompt: workflowData.prompt || '',
      uiSchema: workflowData.uiSchema || {},
      createdAt: workflowData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (this.isFirebaseActive && this.db && userId !== 'guest_user') {
      try {
        await this.db.collection('workflows').doc(docData.id).set(docData);
        return docData;
      } catch (e) {
        console.warn('Firestore write failed, saving to LocalStorage', e);
      }
    }

    // LocalStorage fallback
    const local = this.getLocalWorkflows();
    local[docData.id] = docData;
    localStorage.setItem('genui_workflows', JSON.stringify(local));
    return docData;
  },

  // Fetch All Workflows for Current User
  async getWorkflows() {
    const userId = this.getCurrentUserId();

    if (this.isFirebaseActive && this.db && userId !== 'guest_user') {
      try {
        const snapshot = await this.db.collection('workflows').where('userId', '==', userId).get();
        const list = [];
        snapshot.forEach(doc => list.push(doc.data()));
        if (list.length > 0) return list;
      } catch (e) {
        console.warn('Firestore fetch failed, reading LocalStorage', e);
      }
    }

    const localMap = this.getLocalWorkflows();
    return Object.values(localMap);
  },

  // Get Single Workflow
  async getWorkflowById(id) {
    if (this.isFirebaseActive && this.db) {
      try {
        const doc = await this.db.collection('workflows').doc(id).get();
        if (doc.exists) return doc.data();
      } catch (e) {}
    }
    const local = this.getLocalWorkflows();
    return local[id] || null;
  },

  // Delete Workflow
  async deleteWorkflow(id) {
    if (this.isFirebaseActive && this.db) {
      try {
        await this.db.collection('workflows').doc(id).delete();
      } catch (e) {}
    }
    const local = this.getLocalWorkflows();
    delete local[id];
    localStorage.setItem('genui_workflows', JSON.stringify(local));
  },

  // Local Storage Helper
  getLocalWorkflows() {
    try {
      return JSON.parse(localStorage.getItem('genui_workflows')) || {};
    } catch (e) {
      return {};
    }
  },

  getCurrentUserId() {
    if (this.auth && this.auth.currentUser) {
      return this.auth.currentUser.uid;
    }
    let guestId = localStorage.getItem('genui_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('genui_guest_id', guestId);
    }
    return guestId;
  }
};

window.FirebaseEngine = FirebaseEngine;
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  FirebaseEngine.init();
} else {
  document.addEventListener('DOMContentLoaded', () => FirebaseEngine.init());
}
