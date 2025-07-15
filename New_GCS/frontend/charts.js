// charts.js

const altCtx = document.getElementById('altChart').getContext('2d');
const accCtx = document.getElementById('accChart').getContext('2d');

const MAX_POINTS = 30;
const altLabels = [];
const accLabels = [];

const altChart = new Chart(altCtx, {
  type: 'line',
  data: {
    labels: altLabels,
    datasets: [
      {
        label: 'P_Alt',
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        data: [],
        tension: 0.3,
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Alt',
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        data: [],
        tension: 0.3,
        fill: false,
        pointRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    maintainAspectRatio: true, // 수정됨: 비율 유지
    scales: {
      y: {
        beginAtZero: false,
        suggestedMin: 0,
        suggestedMax: 100,
        title: {
          display: true,
          text: 'Altitude (m)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time (s)'
        }
      }
    }
  }
});

const accChart = new Chart(accCtx, {
  type: 'line',
  data: {
    labels: accLabels,
    datasets: [
      {
        label: 'Acc X',
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        data: [],
        tension: 0.3,
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Acc Y',
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        data: [],
        tension: 0.3,
        fill: false,
        pointRadius: 0
      },
      {
        label: 'Acc Z',
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        data: [],
        tension: 0.3,
        fill: false,
        pointRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    maintainAspectRatio: true, // 수정됨: 비율 유지
    scales: {
      y: {
        beginAtZero: true,
        suggestedMin: -10,
        suggestedMax: 10,
        title: {
          display: true,
          text: 'Acceleration (m/s²)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time (s)'
        }
      }
    }
  }
});

let startTime = Date.now();

function updateCharts(packet) {
  const currentTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (altLabels.length >= MAX_POINTS) {
    altLabels.shift();
    altChart.data.datasets.forEach(dataset => dataset.data.shift());
  }
  if (accLabels.length >= MAX_POINTS) {
    accLabels.shift();
    accChart.data.datasets.forEach(dataset => dataset.data.shift());
  }

  altLabels.push(currentTime);
  accLabels.push(currentTime);

  const pAlt = parseFloat(packet.p_alt);
  const alt = parseFloat(packet.alt);
  const ax = parseFloat(packet.ax);
  const ay = parseFloat(packet.ay);
  const az = parseFloat(packet.az);

  altChart.data.datasets[0].data.push(isNaN(pAlt) ? null : pAlt);
  altChart.data.datasets[1].data.push(isNaN(alt) ? null : alt);

  accChart.data.datasets[0].data.push(isNaN(ax) ? null : ax);
  accChart.data.datasets[1].data.push(isNaN(ay) ? null : ay);
  accChart.data.datasets[2].data.push(isNaN(az) ? null : az);

  altChart.update();
  accChart.update();
}

if (typeof window !== 'undefined') {
  window.updateCharts = updateCharts;
}
