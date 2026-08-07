/* GenUI AI Planning Engine v4 - Universal Generation + Modification */

const AIEngine = {
  SYSTEM_PROMPT: `You are the Generative UI Planning Engine.

Your task is to convert a user's natural-language application or website requirements into a structured JSON UI schema.

Your PRIMARY goal is to understand the user's requested topic, application type, target users, purpose, and required features BEFORE deciding which UI components to generate.

The generated UI MUST be specifically designed for the user's requested topic.
DO NOT generate a generic dashboard layout for every request.
DO NOT reuse the same routine combination of metrics, charts, tables, and forms when they are not relevant to the user's topic.
The UI must feel purpose-built for the requested application.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. DOMAIN-FIRST GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

First internally identify:
* Application/website type
* Main purpose
* Target users
* Important user actions
* Information that needs to be displayed
* Appropriate UI sections
* Most useful components for that specific domain

Then generate the JSON schema.

Examples:

If the user requests a PORTFOLIO WEBSITE:
Generate UI appropriate for a portfolio, such as:
* Hero/introduction
* About section
* Skills
* Projects
* Experience
* Education
* Contact

Do NOT automatically generate:
* Sales metrics
* Revenue charts
* Generic analytics dashboards
* Unrelated business KPIs

If the user requests an E-COMMERCE WEBSITE:
Generate UI appropriate for shopping, such as:
* Product discovery & categories
* Product information & grid
* Cart & checkout form
* Orders & offers

If the user requests a STUDENT MANAGEMENT SYSTEM:
Generate UI appropriate for students, such as:
* Student information
* Courses & grades
* Attendance progress
* Exam & assignment timeline

If the user requests a FOOD DELIVERY APPLICATION:
Generate UI appropriate for food delivery, such as:
* Restaurants & food categories
* Featured menu list
* Cart & delivery address form
* Order tracking timeline

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. COMPONENT SELECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You may use ONLY these component types:
* hero (title, subtitle, actionText, actionUrl, image, colSpan: 12)
* card (title, content, variant: "info"|"warning"|"danger"|"success", colSpan: 3|4|6|8|12)
* list (title, items: [{title: "", subtitle: "", badge: "", icon: ""}], colSpan: 6|8|12)
* grid (title, items: [{title: "", description: "", image: "", link: "", tags: []}], colSpan: 6|8|12)
* metric (title, value, change, trend: "up"|"down", subtext, icon, colSpan: 3|4|6|12)
* chart (title, chartType: "bar"|"line"|"pie"|"doughnut", labels: [], datasets: [{ label: "", data: [] }], colSpan: 6|8|12)
* table (title, columns: [], rows: [[]], colSpan: 6|8|12)
* form (title, fields: [{ label: "", type: "text"|"number"|"email"|"select"|"date"|"checkbox", options: [] }], submitText, colSpan: 6|8|12)
* button (label, action, variant: "primary"|"secondary"|"danger")
* progress (title, value: 0-100, subtext, status: "normal"|"alert", colSpan: 4|6|12)
* timeline (title, items: [{ title: "", date: "", status: "completed"|"pending" }], colSpan: 4|6|12)

Use components ONLY when they make sense for the requested application.
Do not use metrics or charts by default unless the application genuinely requires analytics or statistics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PAGE-AWARE GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the user requests a specific page or section, generate ONLY components for that specific page:
- "login page" → login form & action buttons only.
- "contact page" → contact form & address info card only.
- "projects section" → project grid & details card only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. DATA & PLACEHOLDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do NOT invent fake personal statistics (e.g., "24+ projects", "1,420 commits", "4.95 rating") for portfolios unless provided by the user. Use realistic neutral placeholders ("Your Name", "Software Engineer", "Featured Project").

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. RESTRICTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Never generate HTML, CSS, or JavaScript code.
Never generate unsupported component types.
Return ONLY valid JSON with structure:
{
  "title": "...",
  "description": "...",
  "components": [...]
}

When an EXISTING SCHEMA and USER MODIFICATION INSTRUCTION are provided:
* Preserve every existing component unless the user explicitly removes or replaces it.
* Apply the instruction to the matching existing component instead of creating a duplicate.
* A request such as "change the chart to bar" must update chartType on the existing chart.
* Apply every compatible change when the instruction contains multiple requests.
* Keep all output inside the supported schema and return the complete updated schema.`,

  // Read browser storage safely. This keeps the engine usable in browsers,
  // private/incognito contexts, tests, SSR, and Node environments.
  readStorage(key, fallback = '') {
    try {
      if (typeof localStorage === 'undefined') return fallback;
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (error) {
      console.warn(`Unable to read localStorage key "${key}":`, error);
      return fallback;
    }
  },

  // Get active API configuration from localStorage.
  getConfig() {
    let provider = this.readStorage('genui_provider', 'gemini');
    let model = this.readStorage('genui_model', '');

    if (typeof provider === 'string' && provider.includes('|')) {
      const parts = provider.split('|');
      provider = parts[0] || 'gemini';
      model = parts[1] || model;
    }

    return {
      apiKey: this.readStorage('genui_api_key', ''),
      provider: provider,
      customEndpoint: this.readStorage('genui_custom_endpoint', ''),
      model: model
    };
  },

  hasExternalConfig(config) {
    if (!config || typeof config !== 'object') return false;
    if (config.provider === 'custom') return Boolean(config.customEndpoint);
    return Boolean(config.apiKey);
  },

  normalizePrompt(value, fieldName = 'prompt') {
    if (typeof value !== 'string') {
      throw new TypeError(`${fieldName} must be a string`);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new Error(`${fieldName} cannot be empty`);
    }

    return normalized;
  },

  // Turn commands such as "create a cargo management ui" into a clean display topic.
  extractDisplayTopic(prompt) {
    let topic = this.normalizePrompt(prompt)
      .replace(/^(please\s+)?(?:create|build|design|generate|make)(?:\s+me)?\s+(?:an?|the)?\s*/i, '')
      .replace(/\s+(?:ui|user interface|interface|application|app|website|web app)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!topic) topic = this.normalizePrompt(prompt);

    return topic
      .split(' ')
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : word)
      .join(' ');
  },


  // Convert a display topic into the record/object name the UI mainly manages.
  // Example: "Gym Management System" -> "Gym", "Issue Tracker" -> "Issue".
  extractEntityName(displayTopic) {
    const cleaned = String(displayTopic || '')
      .replace(/\b(?:management|manager|system|platform|portal|dashboard|tracker|tracking|application|app|website|workspace|software|tool|solution|ui)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || displayTopic || 'Record';
  },

  pluralizeLabel(label) {
    const value = String(label || 'Record').trim();
    if (/s$/i.test(value)) return value;
    if (/[^aeiou]y$/i.test(value)) return `${value.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh)$/i.test(value)) return `${value}es`;
    return `${value}s`;
  },

  // Broad intent classification is deliberately domain-independent. Specialized
  // domains can still override it, but unknown topics receive a useful UI instead
  // of an About/Documentation/Inquiry template.
  classifyUIIntent(prompt) {
    const lower = String(prompt || '').toLowerCase();

    if (/\b(login|sign in|signin|authentication|auth page)\b/.test(lower)) return 'auth';
    if (/\b(booking|reservation|reserve|appointment|schedule|ticketing)\b/.test(lower)) return 'booking';
    if (/\b(shop|store|marketplace|catalog|catalogue|products?|inventory listing|directory|listings?)\b/.test(lower)) return 'catalog';
    if (/\b(blog|news|magazine|articles?|knowledge base|documentation|docs|cms|content)\b/.test(lower)) return 'content';
    if (/\b(chat|messaging|messages?|community|forum|social network|social app)\b/.test(lower)) return 'community';
    if (/\b(calculator|converter|generator|checker|estimator|quiz|survey|search tool)\b/.test(lower)) return 'utility';
    if (/\b(portfolio|resume|cv|personal site|showcase)\b/.test(lower)) return 'portfolio';
    if (/\b(landing page|company website|business website|marketing site|homepage|home page)\b/.test(lower)) return 'website';
    if (/\b(management|manager|admin|dashboard|operations?|tracker|tracking|monitor|monitoring|crm|erp|control panel|workflow|records?|registry)\b/.test(lower)) return 'management';

    return 'application';
  },

  makeNeutralRows(entityName) {
    const plural = this.pluralizeLabel(entityName);
    return [
      [`${entityName} 001`, 'Active', 'Recently updated'],
      [`${entityName} 002`, 'Pending', 'Needs review'],
      [`${entityName} 003`, 'Completed', 'No action required']
    ];
  },

  buildUniversalFallback(prompt) {
    const displayTopic = this.extractDisplayTopic(prompt);
    const entityName = this.extractEntityName(displayTopic);
    const pluralEntity = this.pluralizeLabel(entityName);
    const intent = this.classifyUIIntent(prompt);
    const lower = String(prompt).toLowerCase();

    // MANAGEMENT / TRACKING / OPERATIONS
    if (intent === 'management') {
      const wantsAnalytics = /\b(dashboard|analytics|metrics|kpi|monitor|monitoring|reporting)\b/.test(lower);
      const components = [
        {
          type: 'hero',
          title: `${displayTopic} Workspace`,
          subtitle: `Manage ${pluralEntity.toLowerCase()}, statuses, assignments, and day-to-day workflow from one place.`,
          actionText: `Add ${entityName}`,
          colSpan: 12
        }
      ];

      if (wantsAnalytics) {
        components.push(
          { type: 'metric', title: `Total ${pluralEntity}`, value: '—', change: '', trend: 'up', subtext: 'Connect real data to populate', icon: '📊', colSpan: 3 },
          { type: 'metric', title: 'Active', value: '—', change: '', trend: 'up', subtext: 'Currently in progress', icon: '✅', colSpan: 3 },
          { type: 'metric', title: 'Pending', value: '—', change: '', trend: 'up', subtext: 'Waiting for action', icon: '⏳', colSpan: 3 },
          { type: 'metric', title: 'Exceptions', value: '—', change: '', trend: 'down', subtext: 'Requires attention', icon: '⚠️', colSpan: 3 }
        );
      }

      components.push(
        {
          type: 'table',
          title: `${pluralEntity} Overview`,
          columns: [entityName, 'Status', 'Last Update'],
          rows: this.makeNeutralRows(entityName),
          colSpan: 8
        },
        {
          type: 'list',
          title: 'Current Workflow',
          items: [
            { title: `Review active ${pluralEntity.toLowerCase()}`, subtitle: 'Open items that may need action', badge: 'Active' },
            { title: 'Pending approvals', subtitle: 'Items waiting for confirmation or assignment', badge: 'Pending' },
            { title: 'Recent activity', subtitle: 'Latest changes across the workspace', badge: 'Recent' }
          ],
          colSpan: 4
        },
        {
          type: 'form',
          title: `Add ${entityName}`,
          fields: [
            { label: `${entityName} Name / Reference`, type: 'text' },
            { label: 'Status', type: 'select', options: ['Active', 'Pending', 'Completed', 'On Hold'] },
            { label: 'Due / Target Date', type: 'date' },
            { label: 'Notes', type: 'text' }
          ],
          submitText: `Save ${entityName}`,
          colSpan: 12
        }
      );

      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Operational interface for managing ${pluralEntity.toLowerCase()} and related workflow.`,
          components
        }
      };
    }

    // BOOKING / RESERVATION
    if (intent === 'booking') {
      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Browse availability and manage ${displayTopic.toLowerCase()} requests.`,
          components: [
            {
              type: 'hero', title: displayTopic,
              subtitle: 'Find available options, select a date, and manage reservations in one place.',
              actionText: 'Check Availability', colSpan: 12
            },
            {
              type: 'grid', title: 'Available Options',
              items: [
                { title: 'Option A', description: 'Available option with details supplied by your data source.', tags: ['Available'] },
                { title: 'Option B', description: 'Alternative option ready for selection.', tags: ['Available'] },
                { title: 'Option C', description: 'Additional option that can be configured.', tags: ['Check availability'] }
              ],
              colSpan: 8
            },
            {
              type: 'timeline', title: 'Reservation Flow',
              items: [
                { title: 'Choose option', date: 'Step 1', status: 'completed' },
                { title: 'Confirm details', date: 'Step 2', status: 'pending' },
                { title: 'Reservation confirmed', date: 'Step 3', status: 'pending' }
              ],
              colSpan: 4
            },
            {
              type: 'form', title: 'Create Reservation',
              fields: [
                { label: 'Name', type: 'text' },
                { label: 'Email Address', type: 'email' },
                { label: 'Preferred Date', type: 'date' },
                { label: 'Number / Quantity', type: 'number' },
                { label: 'Notes', type: 'text' }
              ],
              submitText: 'Confirm Reservation', colSpan: 12
            }
          ]
        }
      };
    }

    // CATALOG / DIRECTORY / MARKETPLACE
    if (intent === 'catalog') {
      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Discover, compare, and manage items in ${displayTopic.toLowerCase()}.`,
          components: [
            { type: 'hero', title: displayTopic, subtitle: 'Browse available items and quickly find what you need.', actionText: 'Browse Items', colSpan: 12 },
            {
              type: 'grid', title: `${pluralEntity} Catalog`,
              items: [
                { title: `${entityName} A`, description: 'Primary item details supplied by your application data.', tags: ['Available'] },
                { title: `${entityName} B`, description: 'Secondary item with configurable metadata.', tags: ['Featured'] },
                { title: `${entityName} C`, description: 'Additional catalog entry.', tags: ['New'] }
              ],
              colSpan: 8
            },
            {
              type: 'form', title: 'Search & Filter',
              fields: [
                { label: 'Search', type: 'text' },
                { label: 'Category', type: 'select', options: ['All', 'Featured', 'New', 'Available'] }
              ],
              submitText: 'Apply Filters', colSpan: 4
            },
            {
              type: 'list', title: 'Saved / Selected Items',
              items: [
                { title: `${entityName} A`, subtitle: 'Saved for later', badge: 'Saved' },
                { title: `${entityName} B`, subtitle: 'Recently viewed', badge: 'Recent' }
              ],
              colSpan: 12
            }
          ]
        }
      };
    }

    // CONTENT / BLOG / CMS
    if (intent === 'content') {
      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Read, organize, and manage content for ${displayTopic.toLowerCase()}.`,
          components: [
            { type: 'hero', title: displayTopic, subtitle: 'Explore featured and recent content.', actionText: 'Explore Content', colSpan: 12 },
            {
              type: 'grid', title: 'Featured Content',
              items: [
                { title: 'Featured Story', description: 'Highlighted content supplied by your publishing data.', tags: ['Featured'] },
                { title: 'Latest Update', description: 'A recent content item or announcement.', tags: ['New'] },
                { title: 'Popular Resource', description: 'Frequently accessed content.', tags: ['Popular'] }
              ], colSpan: 8
            },
            {
              type: 'list', title: 'Categories',
              items: [
                { title: 'Latest', subtitle: 'Recently published items', badge: 'New' },
                { title: 'Popular', subtitle: 'Most viewed or recommended items', badge: 'Popular' },
                { title: 'Archive', subtitle: 'Previously published content', badge: 'Archive' }
              ], colSpan: 4
            }
          ]
        }
      };
    }

    // COMMUNITY / CHAT / SOCIAL
    if (intent === 'community') {
      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Communication and community workspace for ${displayTopic.toLowerCase()}.`,
          components: [
            { type: 'hero', title: displayTopic, subtitle: 'Connect, follow discussions, and keep up with recent activity.', actionText: 'Start Conversation', colSpan: 12 },
            {
              type: 'list', title: 'Recent Conversations',
              items: [
                { title: 'General Discussion', subtitle: 'Recent messages and updates', badge: 'Active' },
                { title: 'Announcements', subtitle: 'Important community updates', badge: 'New' },
                { title: 'Questions & Help', subtitle: 'Ask and answer questions', badge: 'Help' }
              ], colSpan: 8
            },
            {
              type: 'form', title: 'New Message',
              fields: [
                { label: 'Subject', type: 'text' },
                { label: 'Message', type: 'text' }
              ],
              submitText: 'Post Message', colSpan: 4
            }
          ]
        }
      };
    }

    // CALCULATOR / CONVERTER / SIMPLE TOOL
    if (intent === 'utility') {
      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Focused utility interface for ${displayTopic.toLowerCase()}.`,
          components: [
            { type: 'hero', title: displayTopic, subtitle: 'Enter the required values and run the tool.', actionText: 'Start', colSpan: 12 },
            {
              type: 'form', title: 'Input',
              fields: [
                { label: 'Value / Query', type: 'text' },
                { label: 'Option', type: 'select', options: ['Default', 'Alternative'] }
              ],
              submitText: 'Run', colSpan: 6
            },
            {
              type: 'card', title: 'Result',
              content: 'The calculated or generated result will appear here after the tool runs.',
              variant: 'info', colSpan: 6
            }
          ]
        }
      };
    }

    // WEBSITE / LANDING PAGE
    if (intent === 'website') {
      return {
        valid: true,
        schema: {
          title: displayTopic,
          description: `Public-facing website for ${displayTopic.toLowerCase()}.`,
          components: [
            { type: 'hero', title: displayTopic, subtitle: `A clear introduction to ${displayTopic.toLowerCase()} and its main value.`, actionText: 'Learn More', colSpan: 12 },
            {
              type: 'grid', title: 'Services & Highlights',
              items: [
                { title: 'Primary Service', description: 'Describe the main service or offering.', tags: ['Core'] },
                { title: 'Secondary Service', description: 'Describe another important capability.', tags: ['Service'] },
                { title: 'Why Choose Us', description: 'Explain a key differentiator or benefit.', tags: ['Benefit'] }
              ], colSpan: 12
            },
            {
              type: 'form', title: 'Contact',
              fields: [
                { label: 'Name', type: 'text' },
                { label: 'Email Address', type: 'email' },
                { label: 'Message', type: 'text' }
              ],
              submitText: 'Send Message', colSpan: 12
            }
          ]
        }
      };
    }

    // UNKNOWN APPLICATION: neutral but still task-oriented. Avoids the old
    // "About / Documentation / Inquire" response for arbitrary prompts.
    return {
      valid: true,
      schema: {
        title: displayTopic,
        description: `Purpose-built starter interface for ${displayTopic.toLowerCase()}.`,
        components: [
          {
            type: 'hero',
            title: displayTopic,
            subtitle: `Work with the main information and actions related to ${displayTopic.toLowerCase()}.`,
            actionText: 'Get Started',
            colSpan: 12
          },
          {
            type: 'table',
            title: `${pluralEntity} Workspace`,
            columns: [entityName, 'Status', 'Last Update'],
            rows: this.makeNeutralRows(entityName),
            colSpan: 8
          },
          {
            type: 'list',
            title: 'Common Actions',
            items: [
              { title: `View ${pluralEntity.toLowerCase()}`, subtitle: 'Browse and review existing information', badge: 'Browse' },
              { title: `Create ${entityName.toLowerCase()}`, subtitle: 'Add a new record or item', badge: 'Create' },
              { title: 'Review recent activity', subtitle: 'See the latest changes and updates', badge: 'Recent' }
            ],
            colSpan: 4
          },
          {
            type: 'form',
            title: `Create ${entityName}`,
            fields: [
              { label: `${entityName} Name / Title`, type: 'text' },
              { label: 'Description / Notes', type: 'text' },
              { label: 'Target Date', type: 'date' }
            ],
            submitText: `Save ${entityName}`,
            colSpan: 12
          }
        ]
      }
    };
  },

  // Main UI Generation Call
  async generateUI(promptText) {
    const prompt = this.normalizePrompt(promptText, 'promptText');
    const config = this.getConfig();

    if (this.hasExternalConfig(config)) {
      try {
        return await this.callExternalLLM(prompt, null, config);
      } catch (err) {
        console.warn('External API call failed, falling back to domain-aware engine:', err);
        if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
          Utils.showToast('API call failed, using domain-aware generator', 'warning');
        }
      }
    }

    return this.generateSmartFallback(prompt);
  },

  // Chat Message Processor Alias
  async processChatMessage(userMessage, currentSchema) {
    if (!currentSchema) {
      return await this.generate(userMessage);
    }
    return await this.modifyUI(currentSchema, userMessage);
  },

  // Modification Call
  async modifyUI(existingSchema, instruction) {
    if (!existingSchema || typeof existingSchema !== 'object' || Array.isArray(existingSchema)) {
      throw new TypeError('existingSchema must be a schema object');
    }

    const normalizedInstruction = this.normalizePrompt(instruction, 'instruction');
    const config = this.getConfig();
    // Accept both a raw schema and the { valid, schema } result returned by this
    // engine. This prevents generated UIs from losing their components when the
    // caller passes generateUI() output directly into modifyUI().
    const schemaToModify = existingSchema.schema && typeof existingSchema.schema === 'object'
      ? existingSchema.schema
      : existingSchema;

    if (this.hasExternalConfig(config)) {
      try {
        return await this.callExternalLLM(normalizedInstruction, schemaToModify, config);
      } catch (err) {
        console.warn('API modify call failed, falling back to smart modifier:', err);
      }
    }

    return this.modifySmartFallback(schemaToModify, normalizedInstruction);
  },

  extractTextFromLLMResponse(data) {
    const candidateText = data?.candidates?.[0]?.content?.parts
      ?.map(part => part?.text)
      .filter(Boolean)
      .join('\n');

    const responsesApiText = Array.isArray(data?.output)
      ? data.output
        .flatMap(item => Array.isArray(item?.content) ? item.content : [])
        .map(part => part?.text || part?.value || '')
        .filter(Boolean)
        .join('\n')
      : null;

    return candidateText
      || data?.choices?.[0]?.message?.content
      || data?.output_text
      || responsesApiText
      || data?.text
      || (typeof data?.content === 'string' ? data.content : null)
      || null;
  },

  parseJSONPayload(payload) {
    if (payload && typeof payload === 'object') return payload;
    if (typeof payload !== 'string') throw new TypeError('LLM schema payload must be JSON text or an object');

    let text = payload.trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    try {
      return JSON.parse(text);
    } catch (_) {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      }
      throw new Error('The model did not return valid JSON');
    }
  },

  // Use the host application's SchemaValidator when available. Otherwise apply
  // a lightweight built-in validator so this file can also run by itself.
  validateSchemaPayload(payload) {
    if (typeof SchemaValidator !== 'undefined' && typeof SchemaValidator.validate === 'function') {
      const textPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
      return SchemaValidator.validate(textPayload);
    }

    const parsed = this.parseJSONPayload(payload);
    const schema = parsed?.schema && typeof parsed.schema === 'object' ? parsed.schema : parsed;
    const allowedTypes = new Set(['hero', 'card', 'list', 'grid', 'metric', 'chart', 'table', 'form', 'button', 'progress', 'timeline']);

    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new Error('Generated schema must be a JSON object');
    }
    if (!Array.isArray(schema.components)) {
      throw new Error('Generated schema must contain a components array');
    }

    schema.title = typeof schema.title === 'string' && schema.title.trim() ? schema.title.trim() : 'Generated Interface';
    schema.description = typeof schema.description === 'string' ? schema.description : '';
    schema.components = schema.components
      .filter(component => component && typeof component === 'object' && allowedTypes.has(component.type))
      .map(component => {
        const normalized = { ...component };
        const allowedSpans = [3, 4, 6, 8, 12];
        normalized.colSpan = allowedSpans.includes(Number(normalized.colSpan))
          ? Number(normalized.colSpan)
          : (normalized.type === 'button' ? 3 : 12);

        if (typeof normalized.title !== 'string' && normalized.type !== 'button') {
          normalized.title = normalized.type.charAt(0).toUpperCase() + normalized.type.slice(1);
        }

        if (normalized.type === 'chart') {
          const chartTypes = ['bar', 'line', 'pie', 'doughnut'];
          if (!chartTypes.includes(normalized.chartType)) normalized.chartType = 'line';
          normalized.labels = Array.isArray(normalized.labels)
            ? normalized.labels.map(String)
            : [];
          normalized.datasets = Array.isArray(normalized.datasets)
            ? normalized.datasets.map((dataset, index) => ({
              label: String(dataset?.label || `Series ${index + 1}`),
              data: Array.isArray(dataset?.data)
                ? dataset.data.map(value => Number.isFinite(Number(value)) ? Number(value) : 0)
                : []
            }))
            : [];
          if (!normalized.datasets.length) {
            normalized.datasets = [{ label: 'Series 1', data: normalized.labels.map(() => 0) }];
          }
        }

        if (normalized.type === 'form') {
          const fieldTypes = new Set(['text', 'number', 'email', 'select', 'date', 'checkbox']);
          normalized.fields = Array.isArray(normalized.fields)
            ? normalized.fields
              .filter(field => field && typeof field === 'object')
              .map(field => ({
                ...field,
                label: String(field.label || 'Field'),
                type: fieldTypes.has(field.type) ? field.type : 'text',
                ...(field.type === 'select'
                  ? { options: Array.isArray(field.options) ? field.options.map(String) : [] }
                  : {})
              }))
            : [];
        }

        if (normalized.type === 'table') {
          normalized.columns = Array.isArray(normalized.columns) ? normalized.columns.map(String) : [];
          normalized.rows = Array.isArray(normalized.rows)
            ? normalized.rows.filter(Array.isArray).map(row => row.map(value => String(value ?? '')))
            : [];
        }

        if (normalized.type === 'progress') {
          const value = Number(normalized.value);
          normalized.value = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
          normalized.status = normalized.status === 'alert' ? 'alert' : 'normal';
        }

        return normalized;
      });

    if (!schema.components.length) {
      throw new Error('Generated schema contains no supported components');
    }

    return { valid: true, schema };
  },

  // Call External LLM (Gemini, OpenAI, or custom endpoint)
  async callExternalLLM(userPrompt, existingSchema, config) {
    if (typeof fetch !== 'function') {
      throw new Error('This environment does not provide fetch(); use the offline fallback or supply a fetch polyfill.');
    }

    const fullUserContent = existingSchema
      ? `EXISTING SCHEMA:\n${JSON.stringify(existingSchema, null, 2)}\n\nUSER MODIFICATION INSTRUCTION:\n${userPrompt}`
      : `USER REQUIREMENT:\n${userPrompt}`;

    if (config.provider === 'gemini') {
      const model = config.model || 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: this.SYSTEM_PROMPT }] },
          contents: [
            { role: 'user', parts: [{ text: fullUserContent }] }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || `Gemini API Error (${response.status})`);

      const text = this.extractTextFromLLMResponse(data);
      if (!text) throw new Error('Gemini returned no JSON content');
      return this.validateSchemaPayload(text);
    }

    if (config.provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: this.SYSTEM_PROMPT },
            { role: 'user', content: fullUserContent }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || `OpenAI API Error (${response.status})`);

      const text = this.extractTextFromLLMResponse(data);
      if (!text) throw new Error('OpenAI returned no JSON content');
      return this.validateSchemaPayload(text);
    }

    if (config.provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model || 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: this.SYSTEM_PROMPT,
          messages: [{ role: 'user', content: fullUserContent }]
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || `Claude API Error (${response.status})`);
      const text = data.content?.[0]?.text;
      if (!text) throw new Error('Claude returned no content');
      return this.validateSchemaPayload(text);
    }

    if (config.provider === 'deepseek') {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'deepseek-chat',
          messages: [
            { role: 'system', content: this.SYSTEM_PROMPT },
            { role: 'user', content: fullUserContent }
          ],
          response_format: { type: 'json_object' }
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || `DeepSeek API Error (${response.status})`);
      const text = this.extractTextFromLLMResponse(data);
      if (!text) throw new Error('DeepSeek returned no content');
      return this.validateSchemaPayload(text);
    }

    if (config.provider === 'custom') {
      if (!config.customEndpoint) throw new Error('Custom provider requires a custom endpoint');

      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

      const response = await fetch(config.customEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          systemPrompt: this.SYSTEM_PROMPT,
          userPrompt: fullUserContent,
          existingSchema: existingSchema || null
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || `Custom API Error (${response.status})`);

      if (data?.schema && typeof data.schema === 'object') {
        return this.validateSchemaPayload(data.schema);
      }
      if (Array.isArray(data?.components)) {
        return this.validateSchemaPayload(data);
      }

      const text = this.extractTextFromLLMResponse(data);
      if (!text) throw new Error('Custom endpoint returned no recognizable schema content');
      return this.validateSchemaPayload(text);
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
  },

  // Domain-Aware Offline Generator Engine
  async generateSmartFallback(prompt) {
    const normalizedPrompt = this.normalizePrompt(prompt);
    const lower = normalizedPrompt.toLowerCase();

    const isLoginPage = lower.includes('login') || lower.includes('sign in') || lower.includes('auth page');
    const isContactPage = lower.includes('contact page') || lower.includes('contact section') || lower.includes('get in touch');
    const isProjectsSection = lower.includes('projects section') || lower.includes('project showcase');
    const isPageSpecific = isLoginPage || isContactPage || isProjectsSection;
    const isDashboardRequest = /\b(admin|dashboard|analytics|kpi|metrics)\b/.test(lower);
    const isEcommerceDomain = lower.includes('e-commerce')
      || lower.includes('ecommerce')
      || lower.includes('shopping')
      || /\b(shop|store|cart|checkout)\b/.test(lower)
      || lower.includes('product catalog')
      || lower.includes('product page');

    const isLogisticsDomain = /\b(cargo|freight|shipment|shipments|logistics|container|containers)\b/.test(lower)
      || lower.includes('supply chain')
      || lower.includes('fleet management')
      || lower.includes('cargo management')
      || lower.includes('shipment tracking');

    // 1. E-COMMERCE DASHBOARD (specific page requests always take priority)
    if (!isPageSpecific && isDashboardRequest && isEcommerceDomain) {
      const isEcommerceAdmin = true;
      return {
        valid: true,
        schema: {
          title: isEcommerceAdmin ? "E-Commerce Admin Dashboard" : "Administrative Control Panel",
          description: isEcommerceAdmin ? "Sales analytics, revenue trends, and order volumes" : "System overview, active users, and performance metrics",
          components: [
            { type: "metric", title: isEcommerceAdmin ? "Total Revenue" : "Active Users", value: isEcommerceAdmin ? "$48,250" : "2,450", change: "+12%", trend: "up", subtext: "This month", icon: isEcommerceAdmin ? "💰" : "👥", colSpan: 3 },
            { type: "metric", title: isEcommerceAdmin ? "Total Orders" : "System Uptime", value: isEcommerceAdmin ? "1,420" : "99.98%", change: "+8%", trend: "up", subtext: isEcommerceAdmin ? "Avg order: $34" : "Last 30 days", icon: isEcommerceAdmin ? "📦" : "⚡", colSpan: 3 },
            { type: "metric", title: isEcommerceAdmin ? "Conversion Rate" : "API Requests", value: isEcommerceAdmin ? "3.4%" : "1.2M", change: "+0.5%", trend: "up", subtext: isEcommerceAdmin ? "Target: 3.0%" : "Avg 40k req/hr", icon: isEcommerceAdmin ? "📈" : "📡", colSpan: 3 },
            { type: "metric", title: isEcommerceAdmin ? "Refund Rate" : "Server Load", value: isEcommerceAdmin ? "1.2%" : "24%", change: "-0.3%", trend: "down", subtext: isEcommerceAdmin ? "Low return rate" : "Normal operation", icon: isEcommerceAdmin ? "🔄" : "🖥️", colSpan: 3 },
            {
              type: "chart",
              title: isEcommerceAdmin ? "Monthly Sales Revenue Trends" : "Daily Active User Trends",
              chartType: "line",
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [{ label: isEcommerceAdmin ? "Revenue ($)" : "Users", data: [4800, 5200, 6100, 5900, 7450, 8900, 7750] }],
              colSpan: 8
            },
            {
              type: "chart",
              title: isEcommerceAdmin ? "Category Sales Breakdown" : "Traffic Source Distribution",
              chartType: "doughnut",
              labels: isEcommerceAdmin ? ["Electronics", "Apparel", "Home & Garden", "Books"] : ["Direct", "Organic Search", "Referrals", "Social"],
              datasets: [{ label: "Distribution", data: [45, 30, 15, 10] }],
              colSpan: 4
            }
          ]
        }
      };
    }

    if (isLoginPage) {
      return {
        valid: true,
        schema: {
          title: "Account Login",
          description: "User authentication & sign in interface",
          components: [
            {
              type: "form",
              title: "Sign In to Your Account",
              fields: [
                { label: "Email Address", type: "email" },
                { label: "Password", type: "text" },
                { label: "Remember Me", type: "checkbox" }
              ],
              submitText: "Sign In",
              colSpan: 6
            },
            {
              type: "card",
              title: "Need An Account?",
              content: "Create a new account to access your workspace, saved workflows, and personal profile settings.",
              variant: "info",
              colSpan: 6
            }
          ]
        }
      };
    }

    if (isContactPage) {
      return {
        valid: true,
        schema: {
          title: "Contact Us",
          description: "Get in touch with our team",
          components: [
            {
              type: "form",
              title: "Send Us a Message",
              fields: [
                { label: "Your Name", type: "text" },
                { label: "Email Address", type: "email" },
                { label: "Subject", type: "text" },
                { label: "Message", type: "text" }
              ],
              submitText: "Send Message",
              colSpan: 6
            },
            {
              type: "card",
              title: "Contact Information",
              content: "📍 Address: Innovation Hub, Tech District\n📧 Email: contact@domain.com\n📞 Phone: +1 (555) 019-2834\n⏰ Hours: Mon - Fri, 9am - 6pm",
              variant: "info",
              colSpan: 6
            }
          ]
        }
      };
    }

    if (isProjectsSection) {
      return {
        valid: true,
        schema: {
          title: "Projects Showcase",
          description: "Featured projects and technical portfolio items",
          components: [
            {
              type: "grid",
              title: "Featured Works",
              items: [
                { title: "Generative UI Platform", description: "AI engine synthesizing dynamic UI components on demand.", tags: ["React", "AI", "Node.js"] },
                { title: "E-Commerce Suite", description: "Scalable online store with real-time cart & payments.", tags: ["Next.js", "Stripe"] },
                { title: "Smart Health Dashboard", description: "Patient appointment scheduling and clinical records.", tags: ["TypeScript", "PostgreSQL"] }
              ],
              colSpan: 12
            }
          ]
        }
      };
    }

    // 2. PORTFOLIO / DEVELOPER / RESUME (No Fake Metrics or Sales Dashboards!)
    if (lower.includes('portfolio') || lower.includes('developer') || lower.includes('resume') || lower.includes('showcase') || lower.includes('bio') || lower.includes('profile')) {
      return {
        valid: true,
        schema: {
          title: "Personal Portfolio & Work Showcase",
          description: "Developer profile, skills, projects, and contact",
          components: [
            {
              type: "hero",
              title: "Software Engineer & Full-Stack Developer",
              subtitle: "Designing and building modern web applications, scalable cloud services, and AI systems.",
              actionText: "View Resume",
              colSpan: 12
            },
            {
              type: "card",
              title: "About Me",
              content: "Passionate software developer focused on building clean, accessible user interfaces and efficient backend systems.",
              variant: "info",
              colSpan: 6
            },
            {
              type: "list",
              title: "Technical Skills & Competencies",
              items: [
                { title: "Frontend Development", subtitle: "React, Next.js, HTML5, Vanilla CSS3, JavaScript ES6+", badge: "Core" },
                { title: "Backend & Cloud", subtitle: "Node.js, Express, Cloud Functions, REST APIs", badge: "Core" },
                { title: "Databases & Tools", subtitle: "PostgreSQL, Firebase Firestore, Git, Docker", badge: "Tools" }
              ],
              colSpan: 6
            },
            {
              type: "grid",
              title: "Featured Projects",
              items: [
                { title: "Generative UI Engine", description: "Dynamic web application synthesizing responsive UI components from natural language.", tags: ["JavaScript", "CSS3", "JSON"] },
                { title: "Cloud Workflow Platform", description: "Real-time collaborative task manager with cloud storage integration.", tags: ["Node.js", "Firebase"] }
              ],
              colSpan: 12
            },
            {
              type: "timeline",
              title: "Work Experience & Education",
              items: [
                { title: "Software Development Engineer • Tech Company", date: "Present", status: "completed" },
                { title: "Software Engineering Intern • Web Studio", date: "Prior Experience", status: "completed" },
                { title: "B.Tech Computer Science & Engineering", date: "Graduated", status: "completed" }
              ],
              colSpan: 6
            },
            {
              type: "form",
              title: "Get In Touch",
              fields: [
                { label: "Your Name", type: "text" },
                { label: "Email Address", type: "email" },
                { label: "Message", type: "text" }
              ],
              submitText: "Send Message",
              colSpan: 6
            }
          ]
        }
      };
    }

    // 3. E-COMMERCE / SHOPPING
    if (isEcommerceDomain) {
      return {
        valid: true,
        schema: {
          title: "Online Shopping Store",
          description: "Browse products, manage cart, and place orders",
          components: [
            {
              type: "hero",
              title: "Featured Summer Collection",
              subtitle: "Explore top-rated gadgets, apparel, and lifestyle accessories.",
              actionText: "Shop Deals",
              colSpan: 12
            },
            {
              type: "grid",
              title: "Trending Products",
              items: [
                { title: "Wireless ANC Headphones", description: "Premium noise cancellation & 30hr battery life.", tags: ["In Stock", "$199"] },
                { title: "Ergonomic Desk Chair", description: "Breathable mesh back with lumbar support.", tags: ["In Stock", "$249"] },
                { title: "Smart Fitness Watch", description: "Heart rate monitor, GPS & sleep tracking.", tags: ["In Stock", "$149"] }
              ],
              colSpan: 12
            },
            {
              type: "table",
              title: "Your Shopping Cart",
              columns: ["Product Name", "Quantity", "Unit Price", "Status"],
              rows: [
                ["Wireless ANC Headphones", "1", "$199", "In Cart"],
                ["Smart Fitness Watch", "1", "$149", "In Cart"]
              ],
              colSpan: 6
            },
            {
              type: "form",
              title: "Checkout & Shipping Details",
              fields: [
                { label: "Full Name", type: "text" },
                { label: "Shipping Address", type: "text" },
                { label: "Payment Method", type: "select", options: ["Credit Card", "PayPal", "Apple Pay"] }
              ],
              submitText: "Place Order",
              colSpan: 6
            }
          ]
        }
      };
    }

    // 4. FOOD DELIVERY / RESTAURANT
    if (lower.includes('food') || lower.includes('restaurant') || lower.includes('menu') || lower.includes('dining') || lower.includes('meal delivery')) {
      return {
        valid: true,
        schema: {
          title: "Food Delivery Application",
          description: "Explore nearby restaurants, menus, and track orders",
          components: [
            {
              type: "hero",
              title: "Delicious Meals Delivered Fast",
              subtitle: "Order from top local kitchens and restaurants in your area.",
              actionText: "Browse Restaurants",
              colSpan: 12
            },
            {
              type: "grid",
              title: "Top Rated Restaurants",
              items: [
                { title: "Artisan Burger Bar", description: "Gourmet burgers & hand-cut fries", tags: ["4.8 ★", "25 mins"] },
                { title: "Napoli Woodfired Pizza", description: "Authentic Italian pizzas & salads", tags: ["4.7 ★", "30 mins"] }
              ],
              colSpan: 6
            },
            {
              type: "list",
              title: "Popular Menu Items",
              items: [
                { title: "Double Bacon Cheeseburger", subtitle: "Grass-fed beef, smoked bacon & cheddar", badge: "$13.99" },
                { title: "Classic Margherita Pizza", subtitle: "Fresh basil, San Marzano tomatoes & mozzarella", badge: "$15.99" }
              ],
              colSpan: 6
            },
            {
              type: "timeline",
              title: "Order Status Tracking",
              items: [
                { title: "Order Confirmed by Kitchen", date: "12:15 PM", status: "completed" },
                { title: "Meal Prepared & Packed", date: "12:28 PM", status: "completed" },
                { title: "Delivery Courier en Route", date: "12:35 PM", status: "pending" }
              ],
              colSpan: 6
            },
            {
              type: "form",
              title: "Delivery Information",
              fields: [
                { label: "Delivery Address", type: "text" },
                { label: "Contact Phone Number", type: "text" },
                { label: "Special Delivery Notes", type: "text" }
              ],
              submitText: "Confirm Order",
              colSpan: 6
            }
          ]
        }
      };
    }

    // 5. STUDENT / EDUCATION / COLLEGE MANAGEMENT
    if (lower.includes('student') || lower.includes('course') || lower.includes('grade') || lower.includes('attendance') || lower.includes('college') || lower.includes('school')) {
      return {
        valid: true,
        schema: {
          title: "Student Academic Portal",
          description: "Course enrollment, grades, attendance, and exam schedules",
          components: [
            {
              type: "card",
              title: "Student Profile",
              content: "Student Name: Academic User • Major: Computer Science & Engineering",
              variant: "info",
              colSpan: 6
            },
            {
              type: "progress",
              title: "Overall Attendance Progress",
              value: 88,
              subtext: "88% overall attendance rate (Requirement: 75%)",
              status: "normal",
              colSpan: 6
            },
            {
              type: "table",
              title: "Enrolled Courses & Academic Performance",
              columns: ["Subject Code", "Course Title", "Credits", "Grade", "Status"],
              rows: [
                ["CS501", "Database Management Systems", "4", "A", "Enrolled"],
                ["CS502", "Computer Networks", "4", "A-", "Enrolled"],
                ["CS503", "Artificial Intelligence", "4", "A+", "Enrolled"]
              ],
              colSpan: 12
            },
            {
              type: "timeline",
              title: "Upcoming Exam & Assignment Deadlines",
              items: [
                { title: "Database Mid-Term Examination", date: "Upcoming", status: "pending" },
                { title: "AI Project Final Submission", date: "Upcoming", status: "pending" }
              ],
              colSpan: 12
            }
          ]
        }
      };
    }

    // 6. HEALTHCARE / HOSPITAL / APPOINTMENT
    if (lower.includes('hospital') || lower.includes('doctor') || lower.includes('healthcare') || lower.includes('patient') || lower.includes('clinic') || lower.includes('medical')) {
      return {
        valid: true,
        schema: {
          title: "Hospital & Patient Portal",
          description: "Doctor schedules, medical appointments, and clinic services",
          components: [
            {
              type: "hero",
              title: "Medical & Health Services",
              subtitle: "Book doctor appointments, view lab reports, and manage health records.",
              actionText: "Book Appointment",
              colSpan: 12
            },
            {
              type: "table",
              title: "Available Specialists & Consultation Hours",
              columns: ["Department", "Specialist Doctor", "Available Time Slot", "Status"],
              rows: [
                ["Cardiology", "Dr. Sarah Jenkins", "9:00 AM - 1:00 PM", "Available"],
                ["Neurology", "Dr. Robert Chen", "2:00 PM - 6:00 PM", "Available"],
                ["Pediatrics", "Dr. Elena Rostova", "10:00 AM - 2:00 PM", "Available"]
              ],
              colSpan: 6
            },
            {
              type: "form",
              title: "Schedule Doctor Appointment",
              fields: [
                { label: "Patient Name", type: "text" },
                { label: "Department", type: "select", options: ["Cardiology", "Neurology", "Pediatrics", "General Practice"] },
                { label: "Preferred Date", type: "date" }
              ],
              submitText: "Book Appointment",
              colSpan: 6
            }
          ]
        }
      };
    }

    // 7. TRAVEL / HOTEL / BOOKING
    if (lower.includes('travel') || lower.includes('hotel') || lower.includes('flight') || lower.includes('vacation') || lower.includes('resort') || lower.includes('tourism')) {
      return {
        valid: true,
        schema: {
          title: "Travel & Resort Booking",
          description: "Discover destinations, book hotels, and plan trips",
          components: [
            {
              type: "hero",
              title: "Explore Unforgettable Destinations",
              subtitle: "Book flights, beach resorts, and guided mountain tours worldwide.",
              actionText: "Explore Destinations",
              colSpan: 12
            },
            {
              type: "grid",
              title: "Popular Destinations & Hotels",
              items: [
                { title: "Alpine Mountain Lodge", description: "Cozy chalet with panoramic valley views.", tags: ["From $220/night"] },
                { title: "Seaside Paradise Resort", description: "Luxury beachfront villa with private pool.", tags: ["From $380/night"] }
              ],
              colSpan: 6
            },
            {
              type: "form",
              title: "Book Flight & Hotel",
              fields: [
                { label: "Destination City", type: "text" },
                { label: "Check-In Date", type: "date" },
                { label: "Number of Guests", type: "number" }
              ],
              submitText: "Search Availability",
              colSpan: 6
            }
          ]
        }
      };
    }

    // 8. REAL ESTATE / PROPERTY LISTINGS
    if (lower.includes('real estate') || lower.includes('property listing') || lower.includes('property portal') || lower.includes('realtor') || ((lower.includes('house') || lower.includes('apartment')) && (lower.includes('rent') || lower.includes('sale') || lower.includes('listing')))) {
      return {
        valid: true,
        schema: {
          title: "Real Estate Property Listings",
          description: "Find homes, apartments, and commercial spaces for sale or rent",
          components: [
            {
              type: "hero",
              title: "Find Your Ideal Home",
              subtitle: "Browse verified residential properties, modern apartments, and luxury villas.",
              actionText: "View Properties",
              colSpan: 12
            },
            {
              type: "grid",
              title: "Featured Property Listings",
              items: [
                { title: "Downtown Modern Apartment", description: "2 Bed • 2 Bath • High floor city view", tags: ["For Sale", "$420,000"] },
                { title: "Suburban Family House", description: "4 Bed • 3 Bath • Private garden & garage", tags: ["For Sale", "$680,000"] }
              ],
              colSpan: 6
            },
            {
              type: "form",
              title: "Schedule a Property Viewing",
              fields: [
                { label: "Your Full Name", type: "text" },
                { label: "Property Interest", type: "text" },
                { label: "Preferred Date", type: "date" }
              ],
              submitText: "Book Viewing",
              colSpan: 6
            }
          ]
        }
      };
    }

    // 9. CARGO / FREIGHT / LOGISTICS MANAGEMENT
    if (isLogisticsDomain) {
      return {
        valid: true,
        schema: {
          title: "Cargo & Logistics Management",
          description: "Track cargo, shipments, routes, delivery milestones, and operational exceptions",
          components: [
            {
              type: "hero",
              title: "Cargo Operations Control Center",
              subtitle: "Manage shipments from booking through delivery, monitor ETAs, and respond to delays or exceptions.",
              actionText: "Create Shipment",
              colSpan: 12
            },
            {
              type: "metric",
              title: "Active Shipments",
              value: "128",
              change: "+6%",
              trend: "up",
              subtext: "Currently in transit or processing",
              icon: "📦",
              colSpan: 3
            },
            {
              type: "metric",
              title: "On-Time Delivery",
              value: "94%",
              change: "+2%",
              trend: "up",
              subtext: "Last 30 days",
              icon: "✅",
              colSpan: 3
            },
            {
              type: "metric",
              title: "Delayed Cargo",
              value: "7",
              change: "-3",
              trend: "down",
              subtext: "Needs operational review",
              icon: "⚠️",
              colSpan: 3
            },
            {
              type: "metric",
              title: "Awaiting Dispatch",
              value: "19",
              change: "+4",
              trend: "up",
              subtext: "Ready for assignment",
              icon: "🚚",
              colSpan: 3
            },
            {
              type: "table",
              title: "Shipment Tracking",
              columns: ["Cargo ID", "Origin", "Destination", "Mode", "ETA", "Status"],
              rows: [
                ["CG-1042", "Mumbai", "Dubai", "Sea", "Scheduled", "In Transit"],
                ["CG-1043", "Delhi", "Singapore", "Air", "Scheduled", "Customs Clearance"],
                ["CG-1044", "Chennai", "Colombo", "Sea", "Scheduled", "Delayed"]
              ],
              colSpan: 8
            },
            {
              type: "timeline",
              title: "Selected Shipment Milestones",
              items: [
                { title: "Cargo Booked", date: "Booked", status: "completed" },
                { title: "Departed Origin Hub", date: "Departed", status: "completed" },
                { title: "Destination Customs", date: "Pending", status: "pending" },
                { title: "Final Delivery", date: "Scheduled", status: "pending" }
              ],
              colSpan: 4
            },
            {
              type: "form",
              title: "Create Cargo Shipment",
              fields: [
                { label: "Cargo / Reference Name", type: "text" },
                { label: "Transport Mode", type: "select", options: ["Sea", "Air", "Road", "Rail"] },
                { label: "Origin", type: "text" },
                { label: "Destination", type: "text" },
                { label: "Weight (kg)", type: "number" },
                { label: "Departure Date", type: "date" }
              ],
              submitText: "Create Shipment",
              colSpan: 12
            }
          ]
        }
      };
    }

    // 10. PROJECT MANAGEMENT / TASK TRACKER
    if (lower.includes('project management') || lower.includes('task tracker') || lower.includes('kanban') || lower.includes('sprint') || lower.includes('issue tracker')) {
      return {
        valid: true,
        schema: {
          title: "Project Task & Sprint Tracker",
          description: "Manage sprint tasks, issue priorities, and roadmap milestones",
          components: [
            {
              type: "progress",
              title: "Sprint Milestone Progress",
              value: 75,
              subtext: "15 of 20 tasks completed",
              status: "normal",
              colSpan: 6
            },
            {
              type: "list",
              title: "Active Tasks & Priority Status",
              items: [
                { title: "API Gateway Authentication", subtitle: "Assigned to Engineering Team", badge: "High Priority" },
                { title: "UI Design Accessibility Audit", subtitle: "Assigned to Design Team", badge: "In Progress" }
              ],
              colSpan: 6
            },
            {
              type: "timeline",
              title: "Release Roadmap",
              items: [
                { title: "Architecture Review", date: "Completed", status: "completed" },
                { title: "Beta Testing Phase", date: "Target: Upcoming", status: "pending" }
              ],
              colSpan: 12
            }
          ]
        }
      };
    }

    // 11. ADMIN DASHBOARD (EXPLICIT DASHBOARD / ANALYTICS REQUEST)
    if (isDashboardRequest) {
      return {
        valid: true,
        schema: {
          title: "Administrative Control Panel",
          description: "System overview, active users, and performance metrics",
          components: [
            { type: "metric", title: "Active Users", value: "2,450", change: "+8%", trend: "up", subtext: "Currently online", icon: "👥", colSpan: 3 },
            { type: "metric", title: "System Uptime", value: "99.98%", change: "+0.02%", trend: "up", subtext: "Last 30 days", icon: "⚡", colSpan: 3 },
            { type: "metric", title: "API Requests", value: "1.2M", change: "+15%", trend: "up", subtext: "Avg 40k req/hr", icon: "📡", colSpan: 3 },
            { type: "metric", title: "Server Load", value: "24%", change: "-3%", trend: "down", subtext: "Normal operation", icon: "🖥️", colSpan: 3 },
            {
              type: "chart",
              title: "Daily Active User Trends",
              chartType: "line",
              labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
              datasets: [{ label: "Users", data: [1800, 2100, 2300, 2200, 2450, 1900, 1750] }],
              colSpan: 8
            },
            {
              type: "chart",
              title: "Traffic Source Distribution",
              chartType: "doughnut",
              labels: ["Direct", "Organic Search", "Referrals", "Social"],
              datasets: [{ label: "Sources", data: [40, 35, 15, 10] }],
              colSpan: 4
            }
          ]
        }
      };
    }

    // 12. UNIVERSAL UNKNOWN-TOPIC GENERATOR
    // This is intentionally intent-based rather than domain-hard-coded.
    return this.buildUniversalFallback(normalizedPrompt);
  },

  // Universal schema modifier. Every generated UI passes through this method,
  // so chart edits and component changes behave consistently across domains.
  async modifyUniversal(existingSchema, instruction) {
    const normalizedInstruction = this.normalizePrompt(instruction, 'instruction');
    const lower = normalizedInstruction.toLowerCase();
    const source = existingSchema?.schema && typeof existingSchema.schema === 'object'
      ? existingSchema.schema
      : existingSchema;
    const newSchema = JSON.parse(JSON.stringify(source || {}));

    if (!Array.isArray(newSchema.components)) newSchema.components = [];
    if (typeof newSchema.title !== 'string') newSchema.title = 'Generated Interface';
    if (typeof newSchema.description !== 'string') newSchema.description = '';

    // A whole-interface transformation is deliberately explicit; ordinary
    // phrases such as "change chart to bar" must not regenerate the full UI.
    const transformMatch = normalizedInstruction.match(
      /\b(?:change|convert|transform|turn)\s+(?:the\s+)?(?:whole|entire)\s+(?:ui|interface|page|app|schema)\s+(?:into|to)\s+(.+)$/i
    );
    if (transformMatch?.[1]) return this.generateSmartFallback(transformMatch[1].trim());

    let changed = false;
    const wordsToTitle = value => String(value || '')
      .trim()
      .replace(/[.!]+$/, '')
      .replace(/\b(?:and then|then)\b.*$/i, '')
      .replace(/\s+/g, ' ');
    const componentTypes = ['hero', 'card', 'list', 'grid', 'metric', 'chart', 'table', 'form', 'button', 'progress', 'timeline'];
    const findComponents = type => newSchema.components.filter(component => component?.type === type);
    const chartType = /\bdoughnut\b/.test(lower)
      ? 'doughnut'
      : (/\bpie\b/.test(lower) ? 'pie' : (/\bbar\b/.test(lower) ? 'bar' : (/\bline\b/.test(lower) ? 'line' : null)));

    // Page-level text updates.
    const pageTitleMatch = normalizedInstruction.match(
      /(?:change|update|set|rename)\s+(?:the\s+)?(?:page|ui|interface|dashboard|app|schema)\s+title\s+(?:to|as)\s+(.+?)(?=\s+(?:and|then)\b|$)/i
    );
    if (pageTitleMatch?.[1]) {
      newSchema.title = wordsToTitle(pageTitleMatch[1]);
      changed = true;
    }

    const descriptionMatch = normalizedInstruction.match(
      /(?:change|update|set)\s+(?:the\s+)?(?:page\s+)?description\s+(?:to|as)\s+(.+?)(?=\s+(?:and|then)\b|$)/i
    );
    if (descriptionMatch?.[1]) {
      newSchema.description = wordsToTitle(descriptionMatch[1]);
      changed = true;
    }

    // Removal supports types ("remove all charts") and title text
    // ("remove traffic source distribution").
    const removalMatch = normalizedInstruction.match(/\b(?:remove|delete|hide)\s+(.+?)(?=\s+(?:and|then|but)\b|$)/i);
    if (removalMatch?.[1]) {
      const rawTarget = removalMatch[1]
        .replace(/\b(?:all|the|section|sections|component|components|widget|widgets)\b/gi, ' ')
        .trim()
        .toLowerCase();
      const singularTarget = rawTarget.replace(/s$/, '');
      const before = newSchema.components.length;
      newSchema.components = newSchema.components.filter(component => {
        const type = String(component?.type || '').toLowerCase();
        const title = String(component?.title || component?.label || '').toLowerCase();
        if (type === singularTarget) return false;
        if (singularTarget === 'graph' && type === 'chart') return false;
        return rawTarget && !title.includes(rawTarget) && !title.includes(singularTarget);
      });
      changed = changed || newSchema.components.length !== before;
    }

    // Update an existing chart in place. This is the key behavior that keeps
    // chart changes attached to the current generated UI instead of appending a
    // disconnected generic chart.
    const chartInstruction = /\b(chart|graph|pie|bar|line|doughnut)\b/.test(lower);
    const explicitlyAddChart = /\b(?:add|insert|include|create|new)\b[^.]*\b(?:chart|graph)\b/.test(lower);
    const chartEditVerb = /\b(?:change|update|convert|switch|make|set|rename|edit)\b/.test(lower);
    let charts = findComponents('chart');

    if (chartInstruction && chartEditVerb && !explicitlyAddChart && charts.length) {
      const editAll = /\b(?:all|every|each)\s+(?:the\s+)?(?:chart|graph)s?\b/.test(lower);
      const targetTitleMatch = normalizedInstruction.match(/(?:chart|graph)\s+(?:named|called|titled)\s+["']?(.+?)["']?(?=\s+(?:to|into|and|then)\b|$)/i);
      let targets = charts;
      if (targetTitleMatch?.[1]) {
        const targetTitle = wordsToTitle(targetTitleMatch[1]).toLowerCase();
        const matched = charts.filter(chart => String(chart.title || '').toLowerCase().includes(targetTitle));
        if (matched.length) targets = matched;
      } else if (!editAll) {
        targets = [charts[0]];
      }

      const chartTitleMatch = normalizedInstruction.match(
        /(?:change|update|set|rename)\s+(?:the\s+)?(?:chart|graph)\s+title\s+(?:to|as)\s+(.+?)(?=\s+(?:and|then)\b|$)/i
      );
      const labelsMatch = normalizedInstruction.match(/\blabels?\s+(?:to|as|=)\s*([^.;]+)/i);
      const dataMatch = normalizedInstruction.match(/\bdata(?:\s+values?)?\s+(?:to|as|=)\s*([\d\s,.-]+)/i);

      targets.forEach(chart => {
        if (chartType) chart.chartType = chartType;
        if (chartTitleMatch?.[1]) chart.title = wordsToTitle(chartTitleMatch[1]);
        if (labelsMatch?.[1]) {
          chart.labels = labelsMatch[1].split(',').map(value => value.trim()).filter(Boolean);
        }
        if (dataMatch?.[1]) {
          const values = dataMatch[1].split(',').map(Number).filter(Number.isFinite);
          if (values.length) {
            if (!Array.isArray(chart.datasets) || !chart.datasets.length) {
              chart.datasets = [{ label: 'Series 1', data: values }];
            } else {
              chart.datasets[0].data = values;
            }
          }
        }
      });
      changed = true;
    }

    const makeChart = () => {
      const type = chartType || 'line';
      const circular = type === 'pie' || type === 'doughnut';
      const subjectMatch = normalizedInstruction.match(/(?:add|create|include|insert)\s+(?:an?\s+)?(?:pie|bar|line|doughnut)?\s*(?:chart|graph)(?:\s+(?:for|of|showing|titled))?\s+(.+?)(?=\s+(?:and|then)\b|$)/i);
      const subject = wordsToTitle(subjectMatch?.[1] || (circular ? 'Category Distribution' : 'Performance Trend'));
      return {
        type: 'chart',
        title: subject,
        chartType: type,
        labels: circular ? ['Category A', 'Category B', 'Category C', 'Category D'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ label: subject, data: circular ? [40, 25, 20, 15] : [18, 24, 22, 31, 36, 42] }],
        colSpan: circular ? 6 : 8
      };
    };

    if (chartInstruction && (explicitlyAddChart || (!charts.length && chartEditVerb))) {
      newSchema.components.push(makeChart());
      charts = findComponents('chart');
      changed = true;
    }

    // Generic component-title updates work for every supported renderer type.
    componentTypes.forEach(type => {
      const match = normalizedInstruction.match(
        new RegExp(`(?:change|update|set|rename)\\s+(?:the\\s+)?${type}\\s+title\\s+(?:to|as)\\s+(.+?)(?=\\s+(?:and|then)\\b|$)`, 'i')
      );
      if (!match?.[1] || type === 'chart') return;
      const targets = findComponents(type);
      if (targets.length) {
        targets[0].title = wordsToTitle(match[1]);
        changed = true;
      }
    });

    // Width changes: "make every chart full width", "set form colSpan to 6".
    componentTypes.forEach(type => {
      if (!new RegExp(`\\b${type}s?\\b`, 'i').test(normalizedInstruction)) return;
      const spanMatch = normalizedInstruction.match(/\b(?:colspan|column\s*span|width)\s+(?:to|as|=)\s*(3|4|6|8|12)\b/i);
      const fullWidth = /\bfull[ -]?width\b/i.test(normalizedInstruction);
      if (!spanMatch && !fullWidth) return;
      const applyAll = /\b(?:all|every|each)\b/i.test(normalizedInstruction);
      const targets = applyAll ? findComponents(type) : findComponents(type).slice(0, 1);
      targets.forEach(component => { component.colSpan = fullWidth ? 12 : Number(spanMatch[1]); });
      if (targets.length) changed = true;
    });

    // Value edits for metrics and progress widgets.
    const metricValueMatch = normalizedInstruction.match(/(?:change|update|set)\s+(?:the\s+)?metric\s+value\s+(?:to|as)\s+([^\s,;]+)/i);
    if (metricValueMatch?.[1] && findComponents('metric').length) {
      findComponents('metric')[0].value = metricValueMatch[1];
      changed = true;
    }
    const progressValueMatch = normalizedInstruction.match(/(?:change|update|set)\s+(?:the\s+)?progress(?:\s+value)?\s+(?:to|as)\s+(\d{1,3})/i);
    if (progressValueMatch?.[1] && findComponents('progress').length) {
      findComponents('progress')[0].value = Math.max(0, Math.min(100, Number(progressValueMatch[1])));
      changed = true;
    }

    // Add a field to the first form without replacing the rest of the form.
    const fieldMatch = normalizedInstruction.match(/\badd\s+(?:an?\s+)?(?:new\s+)?(?:form\s+)?field(?:\s+(?:called|named|for))?\s+["']?(.+?)["']?(?=\s+(?:and|then)\b|$)/i);
    if (fieldMatch?.[1]) {
      let form = findComponents('form')[0];
      if (!form) {
        form = { type: 'form', title: 'Details Form', fields: [], submitText: 'Submit', colSpan: 12 };
        newSchema.components.push(form);
      }
      if (!Array.isArray(form.fields)) form.fields = [];
      const label = wordsToTitle(fieldMatch[1]);
      const type = /email/i.test(label) ? 'email' : (/date/i.test(label) ? 'date' : (/quantity|count|amount|age/i.test(label) ? 'number' : (/checkbox|agree|remember/i.test(label) ? 'checkbox' : 'text')));
      form.fields.push({ label, type });
      changed = true;
    }

    // UNIVERSAL INTENT-BASED SECTION ADDITION ENGINE
    const additionMatch = normalizedInstruction.match(/\b(?:add|insert|include|create|generate|attach)\s+(?:an?\s+)?(?:new\s+)?(.+?)(?=\s+(?:and|then|to|in)\b|$)/i);
    if (additionMatch && additionMatch[1]) {
      const rawAddTarget = additionMatch[1].trim();
      const addTarget = rawAddTarget.toLowerCase();
      const sectionTitle = wordsToTitle(rawAddTarget);

      // Warning / Alert / Notice
      if (addTarget.includes('warning') || addTarget.includes('alert') || addTarget.includes('notice') || addTarget.includes('danger')) {
        newSchema.components.unshift({
          type: 'card',
          title: '⚠️ ' + (sectionTitle || 'Warning Notice'),
          content: 'Attention: Action required for this section. Please review recent logs and compliance status.',
          variant: 'warning',
          colSpan: 12
        });
        changed = true;
      }
      // Profile / User Info / Student Info / Account Details
      else if (addTarget.includes('profile') || addTarget.includes('user info') || addTarget.includes('student info') || addTarget.includes('account')) {
        newSchema.components.unshift({
          type: 'card',
          title: sectionTitle || 'Student Profile',
          content: 'Student Name: Academic User • Major: Computer Science & Engineering • ID: STU-2026',
          variant: 'info',
          colSpan: 6
        });
        changed = true;
      }
      // Courses / Performance / Grades / Marks / Results / Table
      else if (addTarget.includes('course') || addTarget.includes('grade') || addTarget.includes('mark') || addTarget.includes('performance') || addTarget.includes('table') || addTarget.includes('enrolled')) {
        newSchema.components.push({
          type: 'table',
          title: sectionTitle || 'Enrolled Courses & Performance',
          columns: ['Subject Code', 'Course Title', 'Credits', 'Grade', 'Status'],
          rows: [
            ['CS501', 'Database Management Systems', '4', 'A', 'Enrolled'],
            ['CS502', 'Computer Networks', '4', 'A-', 'Enrolled'],
            ['CS503', 'Artificial Intelligence', '4', 'A+', 'Enrolled']
          ],
          colSpan: 12
        });
        changed = true;
      }
      // Exams / Deadlines / Timelines / Milestones / Schedule
      else if (addTarget.includes('exam') || addTarget.includes('deadline') || addTarget.includes('timeline') || addTarget.includes('schedule') || addTarget.includes('milestone')) {
        newSchema.components.push({
          type: 'timeline',
          title: sectionTitle || 'Upcoming Exam & Deadlines',
          items: [
            { title: 'Database Mid-Term Examination', date: 'Upcoming', status: 'pending' },
            { title: 'AI Project Final Submission', date: 'Upcoming', status: 'pending' }
          ],
          colSpan: 6
        });
        changed = true;
      }
      // Attendance / Progress Bar
      else if (addTarget.includes('attendance') || addTarget.includes('progress') || addTarget.includes('score')) {
        newSchema.components.push({
          type: 'progress',
          title: sectionTitle || 'Overall Attendance Progress',
          value: 88,
          subtext: '88% overall attendance rate (Requirement: 75%)',
          status: 'normal',
          colSpan: 6
        });
        changed = true;
      }
      // Projects / Portfolio / Grid Showcase
      else if (addTarget.includes('project') || addTarget.includes('portfolio') || addTarget.includes('grid') || addTarget.includes('gallery')) {
        newSchema.components.push({
          type: 'grid',
          title: sectionTitle || 'Featured Projects Section',
          items: [
            { title: 'Generative UI Platform', description: 'Real-time AI interface creation engine.', tags: ['Featured', 'Active'] },
            { title: 'Interactive Canvas Hub', description: 'Component-based workflow renderer.', tags: ['Component', 'Live'] }
          ],
          colSpan: 12
        });
        changed = true;
      }
      // Metrics / Analytics / KPI Counter
      else if (addTarget.includes('metric') || addTarget.includes('stat') || addTarget.includes('kpi') || addTarget.includes('counter') || addTarget.includes('total')) {
        newSchema.components.push({
          type: 'metric',
          title: sectionTitle || 'Key Metric',
          value: '94.5%',
          change: '+4.2%',
          trend: 'up',
          subtext: 'Live updated tracking',
          icon: '📊',
          colSpan: 3
        });
        changed = true;
      }
      // Form / Contact / Inquiry / Feedback
      else if (addTarget.includes('form') || addTarget.includes('contact') || addTarget.includes('inquiry') || addTarget.includes('feedback')) {
        newSchema.components.push({
          type: 'form',
          title: sectionTitle || 'Contact & Inquiry Form',
          fields: [
            { label: 'Full Name', type: 'text' },
            { label: 'Email Address', type: 'email' },
            { label: 'Message / Details', type: 'text' }
          ],
          submitText: 'Submit Request',
          colSpan: 6
        });
        changed = true;
      }
      // Chart / Visualizations
      else if (addTarget.includes('chart') || addTarget.includes('graph') || addTarget.includes('pie') || addTarget.includes('bar') || addTarget.includes('line')) {
        newSchema.components.push(makeChart());
        changed = true;
      }
      // Direct Component Types
      else {
        const typeMatch = addTarget.match(/(hero|card|list|grid|metric|table|form|button|progress|timeline)/);
        if (typeMatch) {
          const type = typeMatch[1];
          const factories = {
            hero: () => ({ type: 'hero', title: sectionTitle, subtitle: newSchema.description || 'A focused introduction to this interface.', actionText: 'Get Started', colSpan: 12 }),
            card: () => ({ type: 'card', title: sectionTitle, content: 'Add the relevant information for this section here.', variant: 'info', colSpan: 6 }),
            list: () => ({ type: 'list', title: sectionTitle, items: [{ title: 'First Record', subtitle: 'Details', badge: 'Active' }], colSpan: 6 }),
            grid: () => ({ type: 'grid', title: sectionTitle, items: [{ title: 'Featured Item', description: 'Item description', tags: ['Featured'] }], colSpan: 12 }),
            metric: () => ({ type: 'metric', title: sectionTitle, value: '94.8%', change: '+4.2%', trend: 'up', subtext: 'Live tracking', icon: '📊', colSpan: 3 }),
            table: () => ({ type: 'table', title: sectionTitle, columns: ['ID', 'Item', 'Status'], rows: [['001', 'Record A', 'Active']], colSpan: 12 }),
            form: () => ({ type: 'form', title: sectionTitle, fields: [{ label: 'Name', type: 'text' }, { label: 'Email', type: 'email' }], submitText: 'Submit', colSpan: 6 }),
            button: () => ({ type: 'button', label: sectionTitle, action: 'action', variant: 'primary', colSpan: 3 }),
            progress: () => ({ type: 'progress', title: sectionTitle, value: 85, subtext: '85% completed', status: 'normal', colSpan: 6 }),
            timeline: () => ({ type: 'timeline', title: sectionTitle, items: [{ title: 'Step 1', date: 'Today', status: 'completed' }], colSpan: 6 })
          };
          newSchema.components.push(factories[type]());
          changed = true;
        } else {
          // Custom domain section
          newSchema.components.push({
            type: 'grid',
            title: sectionTitle,
            items: [
              { title: `${sectionTitle} Record 1`, description: `Details and specifications for ${sectionTitle.toLowerCase()}.`, tags: ['Active', 'Verified'] },
              { title: `${sectionTitle} Record 2`, description: `Additional metrics and status overview.`, tags: ['Updated'] }
            ],
            colSpan: 12
          });
          changed = true;
        }
      }
    }

    if (!changed) {
      const requested = wordsToTitle(normalizedInstruction.replace(/^.*?\b(?:add|include|insert|create|update|change)\b\s*/i, ''));
      newSchema.components.push({
        type: 'card',
        title: requested || 'Custom Section',
        content: `Section updated based on instruction: "${normalizedInstruction}"`,
        variant: 'info',
        colSpan: 6
      });
    }

    return this.validateSchemaPayload(newSchema);
  },

  // Domain-Aware Conversational Modifier Engine
  async modifySmartFallback(existingSchema, instruction) {
    return this.modifyUniversal(existingSchema, instruction);

    /* Legacy rules retained below for backwards reference. They are unreachable
       because the universal modifier above supersedes the old first-match logic. */
    await new Promise(res => setTimeout(res, 400));
    const newSchema = JSON.parse(JSON.stringify(existingSchema));
    if (!Array.isArray(newSchema.components)) newSchema.components = [];

    const normalizedInstruction = this.normalizePrompt(instruction, 'instruction');
    const lower = normalizedInstruction.toLowerCase();

    // 1. TITLE UPDATES ("change title to ...", "update title to ...", "rename to ...")
    const titleMatch = lower.match(/(?:change|update|set|rename)\s+(?:the\s+)?title\s+(?:to|as)\s+(.+)/i);
    if (titleMatch && titleMatch[1]) {
      const newTitle = titleMatch[1].trim();
      newSchema.title = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
      return { valid: true, schema: newSchema };
    }

    // 2. REMOVAL INSTRUCTIONS ("remove experience", "remove timeline", "remove ratings", "remove metrics", "delete chart")
    if (lower.startsWith('remove') || lower.includes('delete') || lower.includes('hide')) {
      if (lower.includes('experience') || lower.includes('timeline') || lower.includes('education')) {
        newSchema.components = newSchema.components.filter(c => c.type !== 'timeline' && !c.title?.toLowerCase().includes('experience'));
      } else if (lower.includes('project')) {
        newSchema.components = newSchema.components.filter(c => !c.title?.toLowerCase().includes('project'));
      } else if (lower.includes('rating') || lower.includes('review')) {
        newSchema.components = newSchema.components.filter(c => !c.title?.toLowerCase().includes('rating'));
      } else if (lower.includes('metric') || lower.includes('stat') || lower.includes('cgpa')) {
        newSchema.components = newSchema.components.filter(c => c.type !== 'metric' && !c.title?.toLowerCase().includes('cgpa'));
      } else if (lower.includes('chart') || lower.includes('graph') || lower.includes('pie')) {
        newSchema.components = newSchema.components.filter(c => c.type !== 'chart');
      } else if (lower.includes('table')) {
        newSchema.components = newSchema.components.filter(c => c.type !== 'table');
      } else if (lower.includes('form')) {
        newSchema.components = newSchema.components.filter(c => c.type !== 'form');
      } else {
        const target = normalizedInstruction
          .replace(/^.*?\b(?:remove|delete|hide)\b\s*/i, '')
          .replace(/\s+(?:section|component)$/i, '')
          .trim()
          .toLowerCase();

        if (target) {
          newSchema.components = newSchema.components.filter(component => {
            const title = String(component?.title || '').toLowerCase();
            const type = String(component?.type || '').toLowerCase();
            return !title.includes(target) && type !== target;
          });
        }
      }
      return { valid: true, schema: newSchema };
    }

    // 3. CHART REQUESTS ("add pie chart", "pie chart", "bar chart", "add graph", "line chart")
    if (lower.includes('chart') || lower.includes('pie') || lower.includes('bar') || lower.includes('doughnut') || lower.includes('graph')) {
      const isPie = lower.includes('pie') || lower.includes('doughnut');
      const isBar = lower.includes('bar');
      newSchema.components.push({
        type: "chart",
        title: isPie ? "Distribution Analytics Chart" : (isBar ? "Comparative Performance Bar Chart" : "Trend Analysis Line Chart"),
        chartType: isPie ? "pie" : (isBar ? "bar" : "line"),
        labels: isPie ? ["Category A", "Category B", "Category C", "Category D"] : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{
          label: isPie ? "Distribution (%)" : "Performance",
          data: isPie ? [40, 25, 20, 15] : [65, 78, 85, 90, 95, 110]
        }],
        colSpan: isPie ? 6 : 8
      });
      return { valid: true, schema: newSchema };
    }

    // 4. WARNING & ALERT NOTICES ("add attendance warning", "warning", "alert", "notice")
    if (lower.includes('warning') || lower.includes('alert') || lower.includes('notice') || lower.includes('danger')) {
      const isAttendance = lower.includes('attendance');
      newSchema.components.unshift({
        type: "card",
        title: isAttendance ? "⚠️ Attendance Warning Notice" : "⚠️ Important System Warning",
        content: isAttendance
          ? "Attention: Student attendance has fallen below the required 85% threshold. Please submit medical/excuse documentation."
          : "System Warning: Action required to review recent compliance and operational status.",
        variant: "warning",
        colSpan: 12
      });
      return { valid: true, schema: newSchema };
    }

    // 5. METRIC / KPI REQUESTS ("add metric", "add kpi", "metric", "stat", "total")
    if (lower.includes('metric') || lower.includes('kpi') || lower.includes('stat') || lower.includes('counter')) {
      newSchema.components.push({
        type: "metric",
        title: "Key Performance Metric",
        value: "94.8%",
        change: "+4.2%",
        trend: "up",
        subtext: "Real-time automated score",
        icon: "📊",
        colSpan: 3
      });
      return { valid: true, schema: newSchema };
    }

    // 6. ATTENDANCE (GENERAL)
    if (lower.includes('attendance')) {
      newSchema.components.push({
        type: "progress",
        title: "Student Attendance Progress",
        value: 88,
        subtext: "88% current attendance rate (Minimum: 85%)",
        status: "normal",
        colSpan: 6
      });
      return { valid: true, schema: newSchema };
    }

    // 7. SPECIFIC COMPONENT ADDITIONS
    if (lower.includes('project') || lower.includes('portfolio')) {
      newSchema.components.push({
        type: "grid",
        title: "Featured Projects Section",
        items: [
          { title: "Generative UI Engine", description: "AI dynamic component renderer.", tags: ["JavaScript", "CSS"] },
          { title: "Cloud Workflow Hub", description: "Real-time task synchronization.", tags: ["Node.js", "Firebase"] }
        ],
        colSpan: 12
      });
      return { valid: true, schema: newSchema };
    }

    if (lower.includes('table')) {
      newSchema.components.push({
        type: "table",
        title: "Data Overview Table",
        columns: ["Item ID", "Category", "Status", "Last Modified"],
        rows: [
          ["REC-001", "Core Operations", "Active", "Just now"],
          ["REC-002", "Analytics Log", "Completed", "Today"],
          ["REC-003", "User Records", "Pending", "Yesterday"]
        ],
        colSpan: 12
      });
      return { valid: true, schema: newSchema };
    }

    if (lower.includes('contact') || lower.includes('form')) {
      newSchema.components.push({
        type: "form",
        title: "Contact & Inquiry Form",
        fields: [
          { label: "Full Name", type: "text" },
          { label: "Email Address", type: "email" },
          { label: "Subject", type: "text" },
          { label: "Message", type: "text" }
        ],
        submitText: "Send Message",
        colSpan: 6
      });
      return { valid: true, schema: newSchema };
    }

    if (lower.includes('timeline') || lower.includes('schedule') || lower.includes('exam')) {
      newSchema.components.push({
        type: "timeline",
        title: "Timeline & Upcoming Schedule",
        items: [
          { title: "Project Initiation", date: "Completed", status: "completed" },
          { title: "Review & Assessment", date: "In Progress", status: "completed" },
          { title: "Final Evaluation", date: "Upcoming", status: "pending" }
        ],
        colSpan: 6
      });
      return { valid: true, schema: newSchema };
    }

    if (lower.includes('cart') || lower.includes('shopping')) {
      newSchema.components.push({
        type: "table",
        title: "Shopping Cart Items",
        columns: ["Product Name", "Qty", "Price", "Subtotal"],
        rows: [
          ["Wireless Headphones", "1", "$199.00", "$199.00"],
          ["Smart Fitness Watch", "1", "$149.00", "$149.00"]
        ],
        colSpan: 12
      });
      return { valid: true, schema: newSchema };
    }

    // 8. GENERAL TRANSFORMATION INSTRUCTIONS
    const transformMatch = normalizedInstruction.match(/\b(?:change|convert|transform|turn)\s+(?:it\s+)?(?:into|to)\s+(.+)$/i);
    if (transformMatch && transformMatch[1]) {
      return this.generateSmartFallback(transformMatch[1].trim());
    }

    // Default safe fallback modification: append clean contextual card
    const requested = normalizedInstruction
      .replace(/^.*?\b(?:add|include|insert|create)\b\s*/i, '')
      .replace(/\s+(?:section|component)$/i, '')
      .trim();

    newSchema.components.push({
      type: "card",
      title: requested ? requested.charAt(0).toUpperCase() + requested.slice(1) : "New Custom Section",
      content: requested ? `Custom component generated for: "${requested}"` : `Section updated based on instruction: "${normalizedInstruction}"`,
      variant: "info",
      colSpan: 6
    });

    return {
      valid: true,
      schema: newSchema
    };
  }
};

if (typeof window !== 'undefined') {
  window.AIEngine = AIEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEngine;
}
