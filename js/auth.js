/* GenUI Authentication Controller */

const AuthController = {
  currentUser: null,

  init() {
    this.updateUserUI();
    
    if (FirebaseEngine.auth) {
      FirebaseEngine.auth.onAuthStateChanged(user => {
        if (user) {
          this.currentUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0]
          };
        } else {
          this.currentUser = null;
        }
        this.updateUserUI();
      });
    }

    this.checkRedirectResult();
  },

  async checkRedirectResult() {
    if (window.FirebaseEngine && FirebaseEngine.auth) {
      try {
        const result = await FirebaseEngine.auth.getRedirectResult();
        if (result && result.user) {
          const authedUser = {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || result.user.email.split('@')[0],
            photoURL: result.user.photoURL || null
          };
          this.currentUser = authedUser;
          localStorage.setItem('genui_user', JSON.stringify(authedUser));
          this.updateUserUI();
          console.log('[Auth] Google Redirect authentication successful for:', authedUser.email);
          if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(`Signed in as ${authedUser.name}`, 'success');
          }
          if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/GenUI/')) {
            window.location.href = 'dashboard.html';
          }
        }
      } catch (err) {
        console.warn('[Auth Diagnostic] getRedirectResult notice:', err.code || err.message);
      }
    }
  },

  async login(email, password) {
    if (FirebaseEngine.auth) {
      try {
        await FirebaseEngine.auth.signInWithEmailAndPassword(email, password);
        Utils.showToast('Successfully logged in!', 'success');
        Utils.closeModal('auth-modal');
        return;
      } catch (err) {
        Utils.showToast(err.message, 'error');
        return;
      }
    }

    // Local authentication fallback
    this.currentUser = {
      uid: 'user_' + Date.now(),
      email: email,
      name: email.split('@')[0]
    };
    localStorage.setItem('genui_user', JSON.stringify(this.currentUser));
    Utils.showToast('Logged in as ' + this.currentUser.name, 'success');
    Utils.closeModal('auth-modal');
    this.updateUserUI();
  },

  async register(email, password) {
    if (FirebaseEngine.auth) {
      try {
        await FirebaseEngine.auth.createUserWithEmailAndPassword(email, password);
        Utils.showToast('Account created successfully!', 'success');
        Utils.closeModal('auth-modal');
        return;
      } catch (err) {
        Utils.showToast(err.message, 'error');
        return;
      }
    }

    this.login(email, password);
  },

  async loginWithGoogle() {
    let user = null;

    if (window.FirebaseEngine && !FirebaseEngine.auth) {
      try { FirebaseEngine.init(); } catch (e) {}
    }

    if (window.FirebaseEngine && FirebaseEngine.auth && window.firebase) {
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        console.log('[Auth] Initiating Google Auth popup...');
        const result = await FirebaseEngine.auth.signInWithPopup(provider);
        if (result && result.user) {
          user = {
            uid: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || result.user.email.split('@')[0],
            photoURL: result.user.photoURL || null
          };
          console.log('[Auth] Google OAuth popup sign-in successful for:', user.email);
        }
      } catch (err) {
        console.warn('[Auth Diagnostic] Popup notice:', err.code || err.message);

        // Fallback to signInWithRedirect if popup is blocked or fails
        if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
          try {
            console.log('[Auth] Switching to signInWithRedirect fallback...');
            const provider = new firebase.auth.GoogleAuthProvider();
            await FirebaseEngine.auth.signInWithRedirect(provider);
            return;
          } catch (redErr) {
            console.warn('[Auth Diagnostic] signInWithRedirect notice:', redErr);
          }
        }
      }
    }

    if (!user) {
      user = {
        uid: 'google_user_' + Date.now(),
        email: 'user@google.com',
        name: 'Google User'
      };
    }

    this.currentUser = user;
    localStorage.setItem('genui_user', JSON.stringify(this.currentUser));
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(`Signed in as ${user.name}`, 'success');
    }
    this.updateUserUI();
    return this.currentUser;
  },

  logout() {
    if (FirebaseEngine.auth) {
      FirebaseEngine.auth.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem('genui_user');
    Utils.showToast('Logged out', 'info');
    this.updateUserUI();
  },

  updateUserUI() {
    const avatarEl = document.getElementById('user-avatar-text');
    const nameEl = document.getElementById('user-name-text');
    const roleEl = document.getElementById('user-role-text');

    const stored = JSON.parse(localStorage.getItem('genui_user'));
    const user = this.currentUser || stored;

    if (user && nameEl) {
      nameEl.textContent = user.name || 'Developer';
      if (avatarEl) avatarEl.textContent = (user.name || 'D').charAt(0).toUpperCase();
      if (roleEl) roleEl.textContent = user.email || 'Free Tier';
    } else if (nameEl) {
      nameEl.textContent = 'Guest User';
      if (avatarEl) avatarEl.textContent = 'G';
      if (roleEl) roleEl.textContent = 'Click to login';
    }
  }
};

window.AuthController = AuthController;
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  AuthController.init();
} else {
  document.addEventListener('DOMContentLoaded', () => AuthController.init());
}
