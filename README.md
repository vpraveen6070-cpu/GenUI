# GenUI – Generative UI for Dynamic Workflows

> **"Describe what you need, and AI builds the interface for you."**

GenUI solves traditional application limitations where users are locked into rigid, predefined dashboards and static web forms. With Generative UI, users describe their domain requirements in natural language, and AI dynamically synthesizes controlled, functional UI components on demand.

---

## 🚀 Key Features

- **Natural Language Interface Generation**: Converts prompts like *"Create a student performance dashboard with marks and attendance"* into rich, interactive web components.
- **Whitelisted Controlled JSON UI Schema**: Generates ONLY safe, predefined components (`card`, `metric`, `chart`, `table`, `form`, `button`, `progress`, `timeline`, `grid`, `hero`). Zero arbitrary script injection risks.
- **Live Section Editor with Real-Time Preview**: Hover over any section card on the canvas to access the **Interactive Section Toolbar** (`⬆️ ⬇️ ✏️ Edit 🗑️ Remove`). Clicking **✏️ Edit** opens the **Live Section Editor Modal**, allowing live keystroke edits to titles, content, column widths (colSpan 3-12), and style variants (`Warning ⚠️`, `Success ✅`, `Danger 🚨`, `Info ℹ️`) with a **Real-Time Live Preview** panel.
- **Left Sidebar AI UI Modification Chatbot**: Type conversational instructions in the 330px expanded sidebar chatbot (`AIEngine.processChatMessage`) to add sections (e.g. *"add student profile"*, *"add course grade table"*, *"add exam schedule"*, *"add pie chart"*), change chart types, or modify interface titles on demand.
- **Firebase Authentication & Cloud Storage**: Connected with real Firebase Auth (`genui-4fd74`) for Google Sign-In and Email Authentication with local session persistence.
- **PDF & JSON Schema Exporters**: Includes instant **`💾 Download JSON`** schema exporter and **`📄 Export PDF`** document printer with automatic print overrides that hide sidebars and editing toolbars.
- **SaaS Glassmorphism Visual Design**: Cream & slate aesthetic with backdrop blur, glowing glass frames, Chart.js integrations, and a 240-frame canvas background sequence player.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), Modern ES6+ JavaScript.
- **Visualization**: Chart.js (Bar, Line, Pie, Doughnut).
- **Cloud & Database**: Firebase Auth, Cloud Firestore, Firebase Hosting.
- **AI Engine**: Google Gemini API (`gemini-2.0-flash`), OpenAI API (`gpt-4o-mini`), and Built-in Offline Fallback Modifier.

---

## 📁 Project Architecture

```
/genui
│
├── index.html            # Landing page & Sign In Modal (Google Auth & Email Login)
├── dashboard.html        # Main Workspace Prompt Builder (240-frame background)
├── canvas.html           # Interactive Canvas Result View (Live Section Editor, AI Chatbot Sidebar)
├── workflows.html        # Saved Workflows Library (View, Open, Duplicate, Delete)
├── settings.html         # AI Provider Config & Theme Preferences
│
├── css/
│   ├── style.css         # Design Tokens, Glassmorphism Panels, Toasts, Buttons
│   ├── dashboard.css     # Workspace Grid, Section Controls, Live Editor Modal, Chatbot Card
│   └── responsive.css    # Mobile Drawer & Print / Export PDF Overrides
│
├── js/
│   ├── app.js            # Main Orchestrator, Router & Chat Processing Handler
│   ├── auth.js           # Firebase Google Sign-In & Auth Controller
│   ├── firebase.js       # Firebase Config & LocalStorage Fallback Storage
│   ├── ai.js             # Universal AI Generation & Modification Engine (`processChatMessage`)
│   ├── ui-renderer.js    # Dynamic Component Renderer, Live Preview & Action Toolbar (`edit`, `remove`, `move`)
│   ├── schema-validator.js# Whitelist & Sanitization Engine
│   ├── charts.js         # Chart.js Wrapper (Bar, Line, Pie, Doughnut)
│   ├── workflows.js      # Save, Load, Duplicate, Delete, Download JSON Exporter
│   └── utils.js          # Toasts, Modals, Clipboard, Skeleton Generators
│
├── firebase.json         # Hosting & Firebase Deploy Configuration
└── README.md             # Complete Documentation
```

---

## ⚡ Quick Start & Running Locally

1. Clone or download this project repository.
2. Open `index.html` or `dashboard.html` directly in any web browser or serve via HTTP (`python3 -m http.server 8085`).
3. **Offline Demo Mode**: Works out-of-the-box without requiring any API keys or servers.
4. **Live LLM API Mode**:
   - Navigate to `settings.html`.
   - Select your provider (**Google Gemini** or **OpenAI**).
   - Input your API key. It will be stored in your browser's `localStorage`.

---

## 🎯 Interactive Features & Usage Walkthrough

### 1. Generating a UI
- Navigate to `dashboard.html`.
- Enter a natural language request (e.g., *"Create a student performance dashboard with marks and attendance"*) or select a preset chip.
- Click **"✨ Generate UI"** to launch into the Interactive Canvas (`canvas.html`).

### 2. Direct Interactive Section Controls on Canvas
- Hover over any rendered section card on the canvas view.
- Use the floating control toolbar:
  - 🗑️ **Remove Section**: Deletes the section from the interface immediately.
  - ✏️ **Edit Section**: Opens the **Live Section Editor Modal** with a real-time preview panel.
  - ⬆️ / ⬇️ **Move Section**: Re-orders section cards dynamically.

### 3. Conversational AI Chatbot Modifications
- Type in the Left Sidebar AI Chatbot (`💬 Modify UI with AI`):
  - *"add student profile"* → Inserts a Student Profile card.
  - *"add enrolled courses table"* → Adds an Academic Performance data table.
  - *"add upcoming exam schedule"* → Adds a Milestone Timeline.
  - *"add pie chart"* → Adds a Pie Distribution chart.
  - *"change title to Academic Workspace"* → Updates the page title.

### 4. PDF & JSON Schema Export
- Click **`📄 Export PDF`** to launch a print document view excluding toolbars and sidebars.
- Click **`💾 Download JSON`** to export the structured schema `.json` file to your computer.

---

## 🔐 Security & Controlled JSON Schema

GenUI **never** executes un-sanitized code generated by LLMs (`eval()` and `<script>` injection are strictly blocked). The AI returns a strictly typed JSON structure validated by `schema-validator.js`:

```json
{
  "title": "Student Performance Dashboard",
  "description": "Track academic performance and attendance",
  "components": [
    { "type": "metric", "title": "CGPA", "value": "8.85", "change": "+0.2", "trend": "up" },
    { "type": "chart", "title": "Subject Marks Breakdown", "chartType": "bar", "labels": ["DBMS", "AI", "Networks"], "datasets": [{ "data": [92, 96, 88] }] },
    { "type": "table", "title": "Subjects", "columns": ["Code", "Name", "Grade"], "rows": [["CS501", "DBMS", "A"]] }
  ]
}
```
