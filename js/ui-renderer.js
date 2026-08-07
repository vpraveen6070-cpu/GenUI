/* GenUI Dynamic UI Renderer Module */

const UIRenderer = {
  // Render full schema into container DOM node
  render(schema, containerId = 'dynamic-canvas-grid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Clear existing DOM elements

    if (!schema || !Array.isArray(schema.components) || schema.components.length === 0) {
      container.innerHTML = `
        <div class="col-12 glass-panel" style="text-align: center; padding: 40px; color: var(--text-muted);">
          <h3>No UI Components Generated</h3>
          <p>Try entering a natural language request above.</p>
        </div>
      `;
      return;
    }

    schema.components.forEach((comp, idx) => {
      const el = this.renderComponent(comp, idx);
      if (el) container.appendChild(el);
    });

    // Initialize Chart.js charts after DOM elements are appended
    setTimeout(() => {
      schema.components.forEach((comp, idx) => {
        if (comp.type === 'chart') {
          const canvasId = `chart-canvas-${idx}`;
          DynamicCharts.render(canvasId, comp);
        }
      });
    }, 50);
  },

  // Dispatch component rendering by type
  renderComponent(comp, idx) {
    const wrapper = document.createElement('div');
    const colSpan = comp.colSpan || this.getDefaultColSpan(comp.type);
    wrapper.className = `component-wrapper col-${colSpan} ${comp.variant ? 'card-' + comp.variant : ''}`;
    wrapper.id = `comp-wrapper-${idx}`;

    const toolbarHtml = `
      <div class="component-action-toolbar" title="Section Controls">
        <button class="component-action-btn" onclick="UIRenderer.moveComponent(${idx}, -1)" title="Move Up">⬆️</button>
        <button class="component-action-btn" onclick="UIRenderer.moveComponent(${idx}, 1)" title="Move Down">⬇️</button>
        <button class="component-action-btn" onclick="UIRenderer.editComponent(${idx})" title="Edit Section">✏️ Edit</button>
        <button class="component-action-btn delete-btn" onclick="UIRenderer.removeComponent(${idx})" title="Remove Section">🗑️ Remove</button>
      </div>
    `;

    let contentHtml = '';
    switch (comp.type) {
      case 'hero':
        contentHtml = this.renderHero(comp);
        break;
      case 'list':
        contentHtml = this.renderList(comp);
        break;
      case 'grid':
        contentHtml = this.renderGrid(comp);
        break;
      case 'metric':
        contentHtml = this.renderMetric(comp);
        break;
      case 'card':
        contentHtml = this.renderCard(comp);
        break;
      case 'chart':
        contentHtml = this.renderChartContainer(comp, idx);
        break;
      case 'table':
        contentHtml = this.renderTable(comp);
        break;
      case 'form':
        contentHtml = this.renderForm(comp, idx);
        break;
      case 'progress':
        contentHtml = this.renderProgress(comp);
        break;
      case 'timeline':
        contentHtml = this.renderTimeline(comp);
        break;
      case 'button':
        contentHtml = this.renderButton(comp);
        break;
      default:
        return null;
    }

    wrapper.innerHTML = toolbarHtml + contentHtml;
    return wrapper;
  },

  removeComponent(idx) {
    if (!window.currentSchema || !Array.isArray(window.currentSchema.components)) return;
    const removedComp = window.currentSchema.components[idx];
    const compTitle = removedComp?.title || 'Section';
    window.currentSchema.components.splice(idx, 1);
    sessionStorage.setItem('genui_active_schema', JSON.stringify(window.currentSchema));
    this.render(window.currentSchema);
    if (typeof Utils !== 'undefined' && Utils.showToast) {
      Utils.showToast(`Removed "${compTitle}" section`, 'info');
    }
  },

  editingIdx: null,

  editComponent(idx) {
    if (!window.currentSchema || !Array.isArray(window.currentSchema.components)) return;
    const comp = window.currentSchema.components[idx];
    if (!comp) return;

    this.editingIdx = idx;

    const modal = document.getElementById('section-editor-modal');
    if (!modal) return;

    const titleInput = document.getElementById('edit-sec-title');
    const contentInput = document.getElementById('edit-sec-content');
    const subtitleInput = document.getElementById('edit-sec-subtitle');
    const colSpanSelect = document.getElementById('edit-sec-colSpan');
    const variantSelect = document.getElementById('edit-sec-variant');

    if (titleInput) titleInput.value = comp.title || comp.label || '';
    if (contentInput) contentInput.value = comp.content || comp.description || comp.subtext || '';
    if (subtitleInput) subtitleInput.value = comp.subtitle || '';
    if (colSpanSelect) colSpanSelect.value = String(comp.colSpan || this.getDefaultColSpan(comp.type));
    if (variantSelect) variantSelect.value = comp.variant || '';

    this.updateLivePreview();
    if (typeof Utils !== 'undefined' && Utils.openModal) {
      Utils.openModal('section-editor-modal');
    }
  },

  updateLivePreview() {
    if (this.editingIdx === null || !window.currentSchema) return;
    const origComp = window.currentSchema.components[this.editingIdx];
    if (!origComp) return;

    const previewBox = document.getElementById('live-preview-box');
    if (!previewBox) return;

    const titleVal = document.getElementById('edit-sec-title')?.value || '';
    const contentVal = document.getElementById('edit-sec-content')?.value || '';
    const subtitleVal = document.getElementById('edit-sec-subtitle')?.value || '';
    const colSpanVal = Number(document.getElementById('edit-sec-colSpan')?.value || 12);
    const variantVal = document.getElementById('edit-sec-variant')?.value || '';

    // Create temp cloned component for preview
    const tempComp = JSON.parse(JSON.stringify(origComp));
    if (tempComp.title !== undefined || tempComp.type !== 'button') tempComp.title = titleVal;
    if (tempComp.label !== undefined) tempComp.label = titleVal;
    if (tempComp.content !== undefined) tempComp.content = contentVal;
    if (tempComp.description !== undefined) tempComp.description = contentVal;
    if (tempComp.subtext !== undefined) tempComp.subtext = contentVal;
    if (tempComp.subtitle !== undefined) tempComp.subtitle = subtitleVal;
    tempComp.colSpan = colSpanVal;
    tempComp.variant = variantVal;

    previewBox.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = `component-wrapper col-12 ${tempComp.variant ? 'card-' + tempComp.variant : ''}`;
    wrapper.style.width = '100%';

    let contentHtml = '';
    switch (tempComp.type) {
      case 'hero': contentHtml = this.renderHero(tempComp); break;
      case 'list': contentHtml = this.renderList(tempComp); break;
      case 'grid': contentHtml = this.renderGrid(tempComp); break;
      case 'metric': contentHtml = this.renderMetric(tempComp); break;
      case 'card': contentHtml = this.renderCard(tempComp); break;
      case 'chart': contentHtml = this.renderChartContainer(tempComp, 'preview'); break;
      case 'table': contentHtml = this.renderTable(tempComp); break;
      case 'form': contentHtml = this.renderForm(tempComp, 'preview'); break;
      case 'progress': contentHtml = this.renderProgress(tempComp); break;
      case 'timeline': contentHtml = this.renderTimeline(tempComp); break;
      case 'button': contentHtml = this.renderButton(tempComp); break;
      default: contentHtml = '<div>Preview not available</div>';
    }

    wrapper.innerHTML = contentHtml;
    previewBox.appendChild(wrapper);

    if (tempComp.type === 'chart') {
      setTimeout(() => {
        if (typeof DynamicCharts !== 'undefined') {
          DynamicCharts.render('chart-canvas-preview', tempComp);
        }
      }, 50);
    }
  },

  saveLiveEdit() {
    if (this.editingIdx === null || !window.currentSchema) return;
    const comp = window.currentSchema.components[this.editingIdx];
    if (!comp) return;

    const titleVal = document.getElementById('edit-sec-title')?.value || '';
    const contentVal = document.getElementById('edit-sec-content')?.value || '';
    const subtitleVal = document.getElementById('edit-sec-subtitle')?.value || '';
    const colSpanVal = Number(document.getElementById('edit-sec-colSpan')?.value || 12);
    const variantVal = document.getElementById('edit-sec-variant')?.value || '';

    if (comp.title !== undefined || comp.type !== 'button') comp.title = titleVal;
    if (comp.label !== undefined) comp.label = titleVal;
    if (comp.content !== undefined) comp.content = contentVal;
    if (comp.description !== undefined) comp.description = contentVal;
    if (comp.subtext !== undefined) comp.subtext = contentVal;
    if (comp.subtitle !== undefined) comp.subtitle = subtitleVal;
    comp.colSpan = colSpanVal;
    if (variantVal) comp.variant = variantVal; else delete comp.variant;

    sessionStorage.setItem('genui_active_schema', JSON.stringify(window.currentSchema));
    this.render(window.currentSchema);
    if (typeof Utils !== 'undefined') {
      if (Utils.closeModal) Utils.closeModal('section-editor-modal');
      if (Utils.showToast) Utils.showToast('Section updated live!', 'success');
    }
  },

  moveComponent(idx, direction) {
    if (!window.currentSchema || !Array.isArray(window.currentSchema.components)) return;
    const comps = window.currentSchema.components;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= comps.length) return;

    const temp = comps[idx];
    comps[idx] = comps[newIdx];
    comps[newIdx] = temp;

    sessionStorage.setItem('genui_active_schema', JSON.stringify(window.currentSchema));
    this.render(window.currentSchema);
  },

  getDefaultColSpan(type) {
    switch (type) {
      case 'hero': return 12;
      case 'list': return 6;
      case 'grid': return 12;
      case 'metric': return 3;
      case 'chart': return 6;
      case 'table': return 12;
      case 'form': return 6;
      case 'progress': return 4;
      case 'timeline': return 4;
      case 'card': return 6;
      case 'button': return 3;
      default: return 6;
    }
  },

  renderHero(comp) {
    return `
      <div style="text-align:center; padding: 24px 16px;">
        <h2 style="font-size:1.8rem; font-weight:700; color:var(--text-main); margin-bottom:8px;">${Utils.escapeHTML(comp.title)}</h2>
        ${comp.subtitle ? `<p style="color:var(--text-muted); font-size:1rem; max-width:650px; margin:0 auto 16px;">${Utils.escapeHTML(comp.subtitle)}</p>` : ''}
        ${comp.actionText ? `<button class="btn btn-primary btn-lg" onclick="Utils.showToast('Action: ${Utils.escapeHTML(comp.actionText)}', 'info')">${Utils.escapeHTML(comp.actionText)}</button>` : ''}
      </div>
    `;
  },

  renderList(comp) {
    const items = (comp.items || []).map(item => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--glass-border);">
        <div>
          <div style="font-weight:600; color:var(--text-main); font-size:0.92rem;">${item.icon ? item.icon + ' ' : ''}${Utils.escapeHTML(item.title || '')}</div>
          ${item.subtitle ? `<div style="font-size:0.8rem; color:var(--text-subtle); margin-top:2px;">${Utils.escapeHTML(item.subtitle)}</div>` : ''}
        </div>
        ${item.badge ? `<span class="badge badge-primary">${Utils.escapeHTML(item.badge)}</span>` : ''}
      </div>
    `).join('');
    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
      </div>
      <div>${items}</div>
    `;
  },

  renderGrid(comp) {
    const items = (comp.items || []).map(item => `
      <div style="background:var(--bg-surface); padding:16px; border-radius:var(--radius-md); border:1px solid var(--glass-border);">
        <div style="font-weight:600; font-size:0.95rem; margin-bottom:4px;">${Utils.escapeHTML(item.title || '')}</div>
        ${item.description ? `<p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:8px;">${Utils.escapeHTML(item.description)}</p>` : ''}
        ${Array.isArray(item.tags) ? item.tags.map(t => `<span class="badge badge-warning" style="margin-right:4px; font-size:0.7rem;">${Utils.escapeHTML(t)}</span>`).join('') : ''}
      </div>
    `).join('');
    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
      </div>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px;">${items}</div>
    `;
  },

  renderMetric(comp) {
    const isUp = comp.trend === 'up';
    return `
      <div class="metric-header">
        <span class="metric-title">${Utils.escapeHTML(comp.title)}</span>
        <div class="metric-icon">${comp.icon || '📊'}</div>
      </div>
      <div class="metric-body">
        <div class="metric-value">${Utils.escapeHTML(comp.value)}</div>
        ${comp.change ? `
          <div class="metric-change ${isUp ? 'up' : 'down'}">
            ${isUp ? '↑' : '↓'} ${Utils.escapeHTML(comp.change)}
          </div>
        ` : ''}
      </div>
      ${comp.subtext ? `<div class="metric-subtext">${Utils.escapeHTML(comp.subtext)}</div>` : ''}
    `;
  },

  renderCard(comp) {
    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
        ${comp.variant ? `<span class="badge badge-${comp.variant}">${comp.variant}</span>` : ''}
      </div>
      <div class="card-body">
        <p>${Utils.escapeHTML(comp.content)}</p>
      </div>
    `;
  },

  renderChartContainer(comp, idx) {
    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
        <span class="badge badge-primary">${(comp.chartType || 'bar').toUpperCase()}</span>
      </div>
      <div class="chart-container">
        <canvas id="chart-canvas-${idx}"></canvas>
      </div>
    `;
  },

  renderTable(comp) {
    const cols = comp.columns || [];
    const rows = comp.rows || [];

    const headers = cols.map(c => `<th>${Utils.escapeHTML(c)}</th>`).join('');
    const bodyRows = rows.map(row => {
      const cells = row.map(cell => `<td>${Utils.escapeHTML(cell)}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
        <span class="badge badge-primary">${rows.length} Records</span>
      </div>
      <div class="table-responsive">
        <table class="custom-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    `;
  },

  renderForm(comp, idx) {
    const fields = (comp.fields || []).map(f => {
      const id = `form-${idx}-${f.label ? f.label.replace(/\s+/g, '-').toLowerCase() : 'input'}`;
      if (f.type === 'select') {
        const options = (f.options || []).map(opt => `<option value="${Utils.escapeHTML(opt)}">${Utils.escapeHTML(opt)}</option>`).join('');
        return `
          <div class="form-group">
            <label class="form-label" for="${id}">${Utils.escapeHTML(f.label)}</label>
            <select id="${id}" class="form-select">${options}</select>
          </div>
        `;
      }
      return `
        <div class="form-group">
          <label class="form-label" for="${id}">${Utils.escapeHTML(f.label)}</label>
          <input type="${f.type || 'text'}" id="${id}" class="form-input" placeholder="Enter ${Utils.escapeHTML(f.label)}">
        </div>
      `;
    }).join('');

    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
      </div>
      <form onsubmit="event.preventDefault(); Utils.showToast('Form submitted successfully', 'success');">
        ${fields}
        <button type="submit" class="btn btn-primary" style="margin-top:10px;">${Utils.escapeHTML(comp.submitText || 'Submit')}</button>
      </form>
    `;
  },

  renderProgress(comp) {
    const val = Math.min(100, Math.max(0, comp.value || 0));
    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
        <span class="badge ${comp.status === 'alert' ? 'badge-danger' : 'badge-primary'}">${val}%</span>
      </div>
      <div class="progress-container">
        <div class="progress-info">
          <span>${Utils.escapeHTML(comp.subtext || 'Completion status')}</span>
          <span>${val}/100</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill ${comp.status === 'alert' ? 'alert' : ''}" style="width: ${val}%;"></div>
        </div>
      </div>
    `;
  },

  renderTimeline(comp) {
    const items = (comp.items || []).map(item => `
      <div class="timeline-item ${item.status === 'completed' ? 'completed' : ''}">
        <div class="timeline-dot"></div>
        <div class="timeline-title">${Utils.escapeHTML(item.title)}</div>
        <div class="timeline-meta">${Utils.escapeHTML(item.date || '')} ${item.status ? `• ${item.status}` : ''}</div>
      </div>
    `).join('');

    return `
      <div class="card-header">
        <h4 class="card-title">${Utils.escapeHTML(comp.title)}</h4>
      </div>
      <div class="timeline-list">
        ${items}
      </div>
    `;
  },

  renderButton(comp) {
    return `
      <div style="display:flex; align-items:center; justify-content:center; height:100%; padding: 10px 0;">
        <button class="btn btn-${comp.variant || 'primary'} btn-lg" onclick="Utils.showToast('Executed: ${Utils.escapeHTML(comp.label)}', 'info');">
          ⚡ ${Utils.escapeHTML(comp.label)}
        </button>
      </div>
    `;
  }
};

window.UIRenderer = UIRenderer;
