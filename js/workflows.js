/* GenUI Workflow Management & Export Controller */

const WorkflowsController = {
  currentWorkflow: null,

  async saveCurrentWorkflow() {
    if (!window.currentSchema) {
      Utils.showToast('Please generate an interface first before saving.', 'warning');
      return;
    }

    const titleInput = document.getElementById('save-workflow-title');
    const title = (titleInput && titleInput.value.trim()) || window.currentSchema.title || 'My Generative UI';

    const workflowData = {
      id: this.currentWorkflow ? this.currentWorkflow.id : 'wf_' + Date.now(),
      title: title,
      prompt: window.currentPrompt || '',
      uiSchema: window.currentSchema,
      createdAt: this.currentWorkflow ? this.currentWorkflow.createdAt : new Date().toISOString()
    };

    const saved = await FirebaseEngine.saveWorkflow(workflowData);
    this.currentWorkflow = saved;

    Utils.closeModal('save-modal');
    Utils.showToast(`Workflow "${saved.title}" saved successfully!`, 'success');
  },

  async loadWorkflow(id) {
    const wf = await FirebaseEngine.getWorkflowById(id);
    if (!wf) {
      Utils.showToast('Workflow not found.', 'error');
      return;
    }

    this.currentWorkflow = wf;
    window.currentSchema = wf.uiSchema;
    window.currentPrompt = wf.prompt;

    // Switch to dashboard if on another page
    if (!document.getElementById('dynamic-canvas-grid')) {
      window.location.href = `dashboard.html?id=${id}`;
      return;
    }

    // Populate UI
    const promptInput = document.getElementById('prompt-input');
    if (promptInput) promptInput.value = wf.prompt || '';

    // Render Canvas
    UIRenderer.render(wf.uiSchema);

    // Show Modification Dock
    const modDock = document.getElementById('modification-dock');
    if (modDock) modDock.style.display = 'flex';

    Utils.showToast(`Loaded "${wf.title}"`, 'info');
  },

  async duplicateWorkflow(id) {
    const wf = await FirebaseEngine.getWorkflowById(id);
    if (!wf) return;

    const dup = {
      title: `${wf.title} (Copy)`,
      prompt: wf.prompt,
      uiSchema: wf.uiSchema
    };

    await FirebaseEngine.saveWorkflow(dup);
    Utils.showToast(`Duplicated "${wf.title}"`, 'success');
    if (window.renderWorkflowsList) window.renderWorkflowsList();
  },

  async deleteWorkflow(id) {
    if (confirm('Are you sure you want to delete this workflow?')) {
      await FirebaseEngine.deleteWorkflow(id);
      Utils.showToast('Workflow deleted', 'info');
      if (window.renderWorkflowsList) window.renderWorkflowsList();
    }
  },

  // Export JSON Schema File
  exportJSON() {
    let schema = window.currentSchema;
    if (!schema) {
      const stored = sessionStorage.getItem('genui_active_schema');
      if (stored) {
        try { schema = JSON.parse(stored); window.currentSchema = schema; } catch(e){}
      }
    }

    if (!schema) {
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('No active JSON schema to download', 'warning');
      }
      return;
    }

    try {
      const jsonStr = JSON.stringify(schema, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (schema.title || 'genui-schema').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${safeTitle}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('JSON Schema downloaded successfully!', 'success');
      }
    } catch (err) {
      console.error('Download JSON Error:', err);
      if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Failed to download JSON: ' + err.message, 'error');
      }
    }
  },

  // Print / PDF Export Trigger
  printUI() {
    if (!window.currentSchema) {
      Utils.showToast('No interface generated to print', 'warning');
      return;
    }
    window.print();
  }
};

window.WorkflowsController = WorkflowsController;
