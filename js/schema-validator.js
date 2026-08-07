/* GenUI Controlled UI JSON Schema Validator */

const SchemaValidator = {
  ALLOWED_COMPONENTS: [
    'card',
    'metric',
    'chart',
    'table',
    'form',
    'button',
    'progress',
    'timeline',
    'hero',
    'list',
    'grid'
  ],

  ALLOWED_CHART_TYPES: ['bar', 'line', 'pie', 'doughnut'],

  validate(jsonInput) {
    let schema = jsonInput;
    const errors = [];

    // 1. Attempt JSON parsing if string
    if (typeof jsonInput === 'string') {
      try {
        // Remove codeblock markers if LLM returned markdown ```json
        let cleaned = jsonInput.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
        if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
        schema = JSON.parse(cleaned.trim());
      } catch (e) {
        return { valid: false, errors: [`Invalid JSON format: ${e.message}`] };
      }
    }

    // 2. Unwrap nested schema object if present (e.g. { valid: true, schema: {...} })
    if (schema && typeof schema === 'object' && schema.schema && typeof schema.schema === 'object') {
      schema = schema.schema;
    }

    // 3. Must be an object
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      return { valid: false, errors: ['Schema root must be a valid JSON object'] };
    }

    // 4. Title and description defaults
    if (!schema.title) schema.title = 'Generative Interface';
    if (!schema.description) schema.description = 'Dynamically constructed UI workflow';

    // 5. Validate components array
    if (!Array.isArray(schema.components)) {
      return { valid: false, errors: ['Schema must contain a "components" array'] };
    }

    // 6. Check individual component integrity
    const validComponents = [];
    schema.components.forEach((comp, idx) => {
      if (!comp || typeof comp !== 'object') {
        errors.push(`Component #${idx + 1} is invalid`);
        return;
      }

      if (!comp.type || !this.ALLOWED_COMPONENTS.includes(comp.type.toLowerCase())) {
        errors.push(`Component #${idx + 1} has unsupported type: "${comp.type}"`);
        return;
      }

      comp.type = comp.type.toLowerCase();

      // Check for illegal script tags or dangerous attributes
      const jsonStringified = JSON.stringify(comp);
      if (/<script|javascript:|eval\(|onload=/i.test(jsonStringified)) {
        errors.push(`Component #${idx + 1} contains unauthorized code patterns`);
        return;
      }

      // Component specific validation & normalizations
      switch (comp.type) {
        case 'hero':
          if (!comp.title) comp.title = 'Welcome';
          if (!comp.subtitle) comp.subtitle = '';
          break;

        case 'list':
          if (!comp.title) comp.title = 'List';
          if (!Array.isArray(comp.items)) comp.items = [];
          break;

        case 'grid':
          if (!comp.title) comp.title = 'Grid Showcase';
          if (!Array.isArray(comp.items)) comp.items = [];
          break;

        case 'metric':
          if (!comp.title) comp.title = 'Metric';
          if (comp.value === undefined) comp.value = '0';
          break;

        case 'chart':
          if (!comp.title) comp.title = 'Analytics Chart';
          if (!comp.chartType || !this.ALLOWED_CHART_TYPES.includes(comp.chartType.toLowerCase())) {
            comp.chartType = 'bar';
          }
          comp.chartType = comp.chartType.toLowerCase();
          if (!Array.isArray(comp.labels)) comp.labels = ['Q1', 'Q2', 'Q3', 'Q4'];
          if (!Array.isArray(comp.datasets)) {
            comp.datasets = [{ label: comp.title, data: [12, 19, 3, 5] }];
          }
          break;

        case 'table':
          if (!comp.title) comp.title = 'Data Table';
          if (!Array.isArray(comp.columns)) comp.columns = ['Item', 'Details'];
          if (!Array.isArray(comp.rows)) comp.rows = [];
          break;

        case 'form':
          if (!comp.title) comp.title = 'Form';
          if (!Array.isArray(comp.fields)) comp.fields = [];
          break;

        case 'progress':
          if (!comp.title) comp.title = 'Progress Tracker';
          if (typeof comp.value !== 'number') comp.value = parseInt(comp.value) || 50;
          break;

        case 'timeline':
          if (!comp.title) comp.title = 'Timeline';
          if (!Array.isArray(comp.items)) comp.items = [];
          break;
          
        case 'card':
          if (!comp.title) comp.title = 'Information';
          if (!comp.content) comp.content = '';
          break;

        case 'button':
          if (!comp.label) comp.label = 'Action';
          break;
      }

      validComponents.push(comp);
    });

    schema.components = validComponents;

    return {
      valid: errors.length === 0 || validComponents.length > 0,
      errors: errors,
      schema: schema
    };
  }
};

window.SchemaValidator = SchemaValidator;

