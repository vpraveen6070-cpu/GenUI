/* GenUI Chart.js Renderer Module - Cream & Slate */

const DynamicCharts = {
  instances: {},

  // Predefined elegant Cream & Slate theme color palettes
  palettes: [
    { bg: 'rgba(45, 45, 45, 0.85)', border: '#2D2D2D' },
    { bg: 'rgba(191, 161, 129, 0.85)', border: '#BFA181' },
    { bg: 'rgba(114, 90, 62, 0.85)', border: '#725A3E' },
    { bg: 'rgba(89, 96, 68, 0.85)', border: '#596044' },
    { bg: 'rgba(186, 26, 26, 0.85)', border: '#BA1A1A' },
    { bg: 'rgba(116, 120, 120, 0.85)', border: '#747878' }
  ],

  render(canvasId, chartConfig) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Destroy existing instance if present
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }

    const ctx = canvas.getContext('2d');
    const type = chartConfig.chartType || 'bar';

    // Format datasets with Cream & Slate styling
    const datasets = (chartConfig.datasets || []).map((ds, idx) => {
      const palette = this.palettes[idx % this.palettes.length];
      
      if (type === 'pie' || type === 'doughnut') {
        const bgList = chartConfig.labels.map((_, i) => this.palettes[i % this.palettes.length].bg);
        const borderList = chartConfig.labels.map((_, i) => this.palettes[i % this.palettes.length].border);
        return {
          label: ds.label || chartConfig.title || 'Data',
          data: ds.data || [],
          backgroundColor: bgList,
          borderColor: borderList,
          borderWidth: 1.5
        };
      }

      return {
        label: ds.label || chartConfig.title || 'Data',
        data: ds.data || [],
        backgroundColor: palette.bg,
        borderColor: palette.border,
        borderWidth: 1.5,
        borderRadius: type === 'bar' ? 4 : 0,
        tension: type === 'line' ? 0.35 : 0,
        fill: type === 'line'
      };
    });

    const isPieOrDoughnut = type === 'pie' || type === 'doughnut';

    try {
      this.instances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
          labels: chartConfig.labels || [],
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: isPieOrDoughnut ? 'right' : 'top',
              labels: {
                color: '#444748',
                font: { family: 'Geist', size: 12, weight: '500' }
              }
            },
            tooltip: {
              backgroundColor: '#FDFBF7',
              titleColor: '#1B1C1A',
              bodyColor: '#444748',
              borderColor: '#E4E2DE',
              borderWidth: 1,
              padding: 12,
              boxPadding: 6
            }
          },
          scales: isPieOrDoughnut ? {} : {
            x: {
              grid: { color: 'rgba(228, 226, 222, 0.6)' },
              ticks: { color: '#747878', font: { family: 'Geist', size: 11 } }
            },
            y: {
              grid: { color: 'rgba(228, 226, 222, 0.6)' },
              ticks: { color: '#747878', font: { family: 'Geist', size: 11 } }
            }
          }
        }
      });
    } catch (e) {
      console.error('Chart.js render error:', e);
    }
  }
};

window.DynamicCharts = DynamicCharts;

