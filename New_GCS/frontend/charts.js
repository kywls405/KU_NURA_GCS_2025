// frontend/charts.js

Chart.register(window.ChartZoom);

let altitudeChart, accelerationChart;
const TIME_WINDOW_SECONDS = 10; // 차트에 10초 분량의 데이터를 보여줌

// 비행 시작 시간을 기록하기 위한 변수
let flightStartTime = null;

/**
 * 차트의 공통 설정을 생성하는 헬퍼 함수
 */
function createChartOptions(xAxisLabel, yAxisLabel, yMin, yMax, yStepSize) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear',
        ticks: {
          color: '#6B7280',
          // [수정] stepSize와 maxTicksLimit을 함께 사용하여 눈금 제어
          stepSize: 1,
          maxTicksLimit: 11 // 보이는 눈금 최대 11개 (0~10)
          // [삭제] 너무 엄격해서 눈금이 사라지게 만들었던 콜백 함수 제거
        },
        grid: { display: false },
        title: {
          display: true,
          text: xAxisLabel,
          color: '#1F2937',
          font: { weight: 'bold' }
        }
      },
      y: {
        min: yMin,
        max: yMax,
        ticks: {
          stepSize: yStepSize,
          color: '#6B7280'
        },
        grid: { color: '#E2E8F0' },
        title: {
          display: true,
          text: yAxisLabel,
          color: '#1F2937',
          font: { weight: 'bold' }
        }
      }
    },
    plugins: {
      legend: { position: 'top', labels: { color: '#1F2937' } },
      zoom: {
        pan: { enabled: true, mode: 'x' },
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
      }
    },
    animation: false,
    elements: {
        line: {
          tension: 0
        },
        point: {
          radius: 0
        }
    }
  };
}

/**
 * 고도 및 가속도 차트를 초기화하는 함수
 */
export function initCharts() {
  flightStartTime = null;

  const altOptions = createChartOptions('Flight Time (s)', 'Altitude (m)', -1, 500, 100);
  altOptions.scales.x.min = 0;
  altOptions.scales.x.max = TIME_WINDOW_SECONDS;

  const altCtx = document.getElementById('altitude-chart').getContext('2d');
  altitudeChart = new Chart(altCtx, {
    type: 'line',
    data: { datasets: [
        {label: 'P_alt', data: [], borderColor: '#5B74B4', borderWidth: 2, },
        {label: 'Alt', data: [], borderColor: '#34D399', borderWidth: 2,}
    ]},
    options: altOptions
  });

  const accelOptions = createChartOptions('Flight Time (s)', 'Acceleration (m/s²)', -30, 30, 5);
  accelOptions.scales.x.min = 0;
  accelOptions.scales.x.max = TIME_WINDOW_SECONDS;

  const accelCtx = document.getElementById('acceleration-chart').getContext('2d');
  accelerationChart = new Chart(accelCtx, {
    type: 'line',
    data: { datasets: [
        { label: 'Ax', data: [], borderColor: '#F77E4F', borderWidth: 2 },
        { label: 'Ay', data: [], borderColor: '#34D399', borderWidth: 2 },
        { label: 'Az', data: [], borderColor: '#A78BFA', borderWidth: 2 }
    ]},
    options: accelOptions
  });
}

/**
 * 차트에 새로운 데이터를 추가하는 함수
 */
function addDataToChart(chart, timestamp, data) {
  chart.data.datasets.forEach(dataset => {
    const key = dataset.label;
    const value = data.hasOwnProperty(key) ? parseFloat(data[key]) : null;
    dataset.data.push({ x: timestamp, y: value });
  });
}

/**
 * 수신된 데이터로 해당 차트만 업데이트하는 함수
 */
export function updateCharts(data) {
  if (!altitudeChart || !accelerationChart) return;

  const serverTimestamp = parseFloat(data.timestamp);
  if (isNaN(serverTimestamp)) return;

  if (flightStartTime === null) {
    flightStartTime = serverTimestamp;
    altitudeChart.data.datasets.forEach(d => d.data = []);
    accelerationChart.data.datasets.forEach(d => d.data = []);
  }

  const relativeTimestamp = serverTimestamp - flightStartTime;

  // --- 데이터 추가 ---
  const hasAltitudeData = data.hasOwnProperty('P_alt') || data.hasOwnProperty('Alt');
  if (hasAltitudeData) {
    const altitudeData = { P_alt: data.P_alt, Alt: data.Alt };
    addDataToChart(altitudeChart, relativeTimestamp, altitudeData);
  }

  const hasAccelData = data.hasOwnProperty('ax') || data.hasOwnProperty('ay') || data.hasOwnProperty('az');
  if (hasAccelData) {
    const accelData = { Ax: data.ax, Ay: data.ay, Az: data.az };
    addDataToChart(accelerationChart, relativeTimestamp, accelData);
  }

  // --- X축 스크롤 로직 ---
  if (relativeTimestamp > TIME_WINDOW_SECONDS) {
    const minX = relativeTimestamp - TIME_WINDOW_SECONDS;
    if (hasAltitudeData) {
        altitudeChart.options.scales.x.min = minX;
        altitudeChart.options.scales.x.max = relativeTimestamp;
    }
    if (hasAccelData) {
        accelerationChart.options.scales.x.min = minX;
        accelerationChart.options.scales.x.max = relativeTimestamp;
    }
  }
  
  // --- 차트 업데이트 ---
  if (hasAltitudeData) {
    altitudeChart.update('none');
  }
  if (hasAccelData) {
    accelerationChart.update('none');
  }
}
