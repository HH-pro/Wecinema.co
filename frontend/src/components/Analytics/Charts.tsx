// Existing code mein chartOptions function update karein:
const chartOptions = (title: string): ChartOptions<"line"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: "#e2e8f0",
        font: { 
          size: 11,
          family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        },
        usePointStyle: true,
        boxWidth: 6,
        padding: 10,
        generateLabels: (chart) => {
          const datasets = chart.data.datasets;
          return datasets.map((dataset, i) => ({
            text: dataset.label?.length > 15 ? dataset.label.substring(0, 15) + '...' : dataset.label,
            fillStyle: dataset.backgroundColor as string,
            strokeStyle: dataset.borderColor as string,
            lineWidth: 2,
            hidden: !chart.isDatasetVisible(i),
            index: i
          }));
        }
      },
    },
    title: {
      display: false,
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      titleColor: "#d1d5db",
      bodyColor: "#f3f4f6",
      titleFont: {
        size: 12,
        family: "'Inter', -apple-system, sans-serif"
      },
      bodyFont: {
        size: 11,
        family: "'Inter', -apple-system, sans-serif"
      },
      padding: 12,
      cornerRadius: 8,
      borderColor: "rgba(59, 130, 246, 0.3)",
      borderWidth: 1,
      displayColors: true,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('en-US', { 
              maximumFractionDigits: 2 
            }).format(context.parsed.y);
          }
          return label;
        }
      }
    },
  },
  scales: {
    y: {
      grid: {
        color: "rgba(148, 163, 184, 0.08)",
        drawBorder: false,
        drawTicks: false,
      },
      ticks: { 
        color: "#94a3b8", 
        font: { 
          size: 10,
          family: "'Inter', -apple-system, sans-serif"
        },
        padding: 8,
        callback: function(value) {
          return Number(value).toLocaleString('en-US');
        }
      },
      beginAtZero: true,
      border: {
        display: false,
      },
    },
    x: {
      reverse: true,
      grid: {
        color: "rgba(148, 163, 184, 0.08)",
        drawBorder: false,
        drawTicks: false,
      },
      ticks: { 
        color: "#94a3b8", 
        font: { 
          size: 10,
          family: "'Inter', -apple-system, sans-serif"
        },
        maxRotation: 45,
      },
      border: {
        display: false,
      },
    },
  },
  elements: {
    line: { 
      tension: 0.4, 
      borderWidth: 2.5,
      fill: true,
    },
    point: { 
      radius: 4, 
      hoverRadius: 7,
      backgroundColor: "#ffffff",
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverBackgroundColor: "#ffffff",
    },
  },
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  animations: {
    tension: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  },
});