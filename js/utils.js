/* GenUI Utilities Module */

const Utils = {
  // Show Toast Notification
  showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    toast.innerHTML = `
      <span style="font-weight:700; font-size:1.1rem; width:20px;">${iconMap[type] || 'ℹ'}</span>
      <div style="flex:1;">${this.escapeHTML(message)}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Escape HTML string to prevent XSS
  escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Modal Dialog Control
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('Copied to clipboard!', 'success');
    } catch (err) {
      this.showToast('Failed to copy text', 'error');
    }
  },

  // Generate Skeleton Loading Grid
  getSkeletonHTML() {
    return `
      <div class="component-wrapper col-4 skeleton" style="height: 120px;"></div>
      <div class="component-wrapper col-4 skeleton" style="height: 120px;"></div>
      <div class="component-wrapper col-4 skeleton" style="height: 120px;"></div>
      <div class="component-wrapper col-8 skeleton" style="height: 300px;"></div>
      <div class="component-wrapper col-4 skeleton" style="height: 300px;"></div>
    `;
  },

  // Format Date Timestamp
  formatDate(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
};

// Update Sidebar Toggle Arrow Icons based on state
function updateSidebarToggleIcons() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtns = document.querySelectorAll('.sidebar-toggle-btn');
  if (!sidebar || !toggleBtns.length) return;

  const isCollapsed = sidebar.classList.contains('collapsed');
  // When collapsed: show '▶' (right arrow) to expand rightward.
  // When expanded: show '◀' (left arrow) to collapse leftward.
  const arrowIcon = isCollapsed ? '▶' : '◀';

  toggleBtns.forEach(btn => {
    btn.textContent = arrowIcon;
    btn.title = isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar';
  });
}

// Global Sidebar Toggle Helper (usable across all pages)
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('genui_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }
  updateSidebarToggleIcons();
}

window.toggleSidebar = toggleSidebar;
window.updateSidebarToggleIcons = updateSidebarToggleIcons;

// Restore sidebar collapse state across all pages on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth > 768) {
    if (localStorage.getItem('genui_sidebar_collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }
  }
  updateSidebarToggleIcons();
});

window.Utils = Utils;
