/* GenUI Application Orchestrator */

document.addEventListener('DOMContentLoaded', () => {
  FirebaseEngine.init();
  AuthController.init();

  // Restore collapsed sidebar state
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth > 768) {
    if (localStorage.getItem('genui_sidebar_collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }
  }

  // Sync AI Provider select
  const providerSelect = document.getElementById('ai-provider-select');
  if (providerSelect) {
    const curProvider = localStorage.getItem('genui_provider') || 'gemini';
    const curModel = localStorage.getItem('genui_model') || 'gemini-2.0-flash';
    const combinedVal = `${curProvider}|${curModel}`;
    
    // Try finding exact combined option, else default to gemini-2.0-flash
    const option = Array.from(providerSelect.options).find(o => o.value === combinedVal || o.value.startsWith(curProvider));
    if (option) {
      providerSelect.value = option.value;
    }
  }

  // Handle URL Params (e.g. ?id=wf_xxx or ?prompt=xxx)
  const urlParams = new URLSearchParams(window.location.search);
  const loadId = urlParams.get('id');
  const queryPrompt = urlParams.get('prompt');

  if (loadId) {
    WorkflowsController.loadWorkflow(loadId);
  } else if (queryPrompt) {
    const pInput = document.getElementById('prompt-input');
    if (pInput) {
      pInput.value = decodeURIComponent(queryPrompt);
      generateUIFromPrompt(queryPrompt);
    }
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      const pInput = document.getElementById('prompt-input');
      const mInput = document.getElementById('mod-input');
      
      if (document.activeElement === pInput && pInput.value.trim()) {
        handleGenerateClick();
      } else if (document.activeElement === mInput && mInput.value.trim()) {
        handleModifyClick();
      }
    }
  });
});

// Primary Prompt Generation Handler with Loading Stepper
async function handleGenerateClick() {
  const promptInput = document.getElementById('prompt-input');
  if (!promptInput) return;

  const promptText = promptInput.value.trim();
  if (!promptText) {
    Utils.showToast('Please describe what you want to build.', 'warning');
    promptInput.focus();
    return;
  }

  window.currentPrompt = promptText;
  await generateUIFromPrompt(promptText);
}

// Executed when prompt is passed
async function generateUIFromPrompt(promptText) {
  const canvasGrid = document.getElementById('dynamic-canvas-grid');
  const loadingContainer = document.getElementById('ai-loading-container');
  const modDock = document.getElementById('modification-dock');
  const stepperText = document.getElementById('stepper-status-text');

  if (modDock) modDock.style.display = 'none';
  if (canvasGrid) canvasGrid.style.display = 'none';
  if (loadingContainer) loadingContainer.style.display = 'flex';

  const steps = [
    'Understanding your request...',
    'Planning interface structure...',
    'Selecting whitelisted UI components...',
    'Building structured JSON schema...',
    'Finalizing dynamic layout...'
  ];

  for (let i = 0; i < steps.length; i++) {
    if (stepperText) stepperText.textContent = steps[i];
    await new Promise(res => setTimeout(res, 220));
  }

  try {
    const result = await AIEngine.generateUI(promptText);

    if (!result.valid) {
      Utils.showToast(result.errors.join(', ') || 'Failed to generate interface.', 'error');
      if (loadingContainer) loadingContainer.style.display = 'none';
      if (canvasGrid) {
        canvasGrid.style.display = 'grid';
        canvasGrid.innerHTML = `
          <div class="col-12 glass-panel" style="text-align:center; padding:40px;">
            <h3 style="color:var(--accent-rose);">Generation Failed</h3>
            <p style="margin:10px 0 20px;">Unable to parse or validate the interface schema.</p>
            <button class="btn btn-primary" onclick="handleGenerateClick()">Retry Generation</button>
          </div>
        `;
      }
      return;
    }

    window.currentSchema = result.schema;
    sessionStorage.setItem('genui_active_schema', JSON.stringify(result.schema));

    if (loadingContainer) loadingContainer.style.display = 'none';

    // If currently on dashboard workspace page, navigate to canvas.html result page
    if (!window.location.href.includes('canvas.html')) {
      window.location.href = 'canvas.html';
      return;
    }

    // Render components if already on canvas.html
    if (canvasGrid) {
      canvasGrid.style.display = 'grid';
      UIRenderer.render(result.schema);
    }
    if (modDock) modDock.style.display = 'flex';

    Utils.showToast('Interface generated successfully!', 'success');

  } catch (err) {
    console.error('Error generating UI:', err);
    Utils.showToast('Unexpected error during generation.', 'error');
    if (loadingContainer) loadingContainer.style.display = 'none';
  }
}

// Conversational Modification Handler
async function handleModifyClick() {
  const modInput = document.getElementById('mod-input');
  if (!modInput) return;

  const instruction = modInput.value.trim();
  if (!instruction) return;

  if (!window.currentSchema) {
    const stored = sessionStorage.getItem('genui_active_schema');
    if (stored) {
      try { window.currentSchema = JSON.parse(stored); } catch(e){}
    }
  }

  Utils.showToast('Applying AI modification...', 'info', 1500);
  modInput.disabled = true;

  try {
    const result = await AIEngine.processChatMessage(instruction, window.currentSchema);

    if (result && result.valid && result.schema) {
      window.currentSchema = result.schema;
      sessionStorage.setItem('genui_active_schema', JSON.stringify(result.schema));
      UIRenderer.render(result.schema);

      const titleEl = document.getElementById('canvas-page-title');
      if (titleEl && result.schema.title) {
        titleEl.textContent = result.schema.title;
      }

      modInput.value = '';
      Utils.showToast('Interface modified successfully!', 'success');
    } else {
      Utils.showToast('Could not modify interface based on instruction.', 'error');
    }
  } catch (err) {
    console.error('AI Modification Error:', err);
    Utils.showToast('Modification error: ' + (err.message || 'Error processing request'), 'error');
  } finally {
    modInput.disabled = false;
    modInput.focus();
  }
}

// Quick Preset Prompt Filler
function fillPresetPrompt(promptText) {
  const promptInput = document.getElementById('prompt-input');
  if (promptInput) {
    promptInput.value = promptText;
    promptInput.focus();
  }
}

// Live Hackathon Demo Automated Flow
async function startLiveDemoFlow() {
  const promptInput = document.getElementById('prompt-input');
  const demoPrompt = "Create a student performance dashboard with marks and attendance.";
  
  if (promptInput) promptInput.value = demoPrompt;
  await handleGenerateClick();

  // Automated step 1 after 3 seconds
  setTimeout(async () => {
    const modInput = document.getElementById('mod-input');
    if (modInput) {
      modInput.value = "Add a warning when attendance is below 75%.";
      await handleModifyClick();
    }
  }, 4000);

  // Automated step 2 after 7 seconds
  setTimeout(async () => {
    const modInput = document.getElementById('mod-input');
    if (modInput) {
      modInput.value = "Add an upcoming exam schedule.";
      await handleModifyClick();
    }
  }, 8000);
}

function handleAIProviderSelectChange(rawVal) {
  const parts = rawVal.split('|');
  const provider = parts[0] || 'gemini';
  const model = parts[1] || '';

  localStorage.setItem('genui_provider', provider);
  localStorage.setItem('genui_model', model);

  if (window.AIEngine) {
    window.AIEngine.config.provider = provider;
    window.AIEngine.config.model = model;
  }
}

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
  if (typeof updateSidebarToggleIcons === 'function') {
    updateSidebarToggleIcons();
  }
}

// Expose handlers to global scope
window.handleGenerateClick = handleGenerateClick;
window.handleModifyClick = handleModifyClick;
window.fillPresetPrompt = fillPresetPrompt;
window.startLiveDemoFlow = startLiveDemoFlow;
window.handleAIProviderSelectChange = handleAIProviderSelectChange;
window.toggleSidebar = toggleSidebar;
