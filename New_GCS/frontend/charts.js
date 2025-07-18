Chart.register(window.ChartZoom);

let altitudeChart, accelerationChart;
// [수정] 시간 기반 윈도우 대신 데이터 포인트 개수 제한
const MAX_DATA_POINTS = 60; // 차트에 최대 500개의 데이터를 보여줌

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
          stepSize: 1,
          callback: function(value) {
            // 정수 값만 눈금에 표시하여 소수점 눈금을 숨김
            if (Number.isInteger(value)) {
              return value;
            }
          }
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

  const altOptions = createChartOptions('Flight Time (s)', 'Altitude (m)', 0, 500, 100);
  // [수정] 정적인 x축 범위 설정을 제거하여 데이터에 따라 자동으로 조절되도록 함
  // altOptions.scales.x.min = 0;
  // altOptions.scales.x.max = TIME_WINDOW_SECONDS;

  const altCtx = document.getElementById('altitude-chart').getContext('2d');
  altitudeChart = new Chart(altCtx, {
    type: 'line',
    data: { datasets: [
        {label: 'P_alt', data: [], borderColor: '#5B74B4', borderWidth: 2, },
        {label: 'Alt', data: [], borderColor: '#d42626ff', borderWidth: 2,}
    ]},
    options: altOptions
  });

  const accelOptions = createChartOptions('Flight Time (s)', 'Acceleration (m/s²)', -40, 40, 10);
  // [수정] 정적인 x축 범위 설정을 제거하여 데이터에 따라 자동으로 조절되도록 함
  // accelOptions.scales.x.min = 0;
  // accelOptions.scales.x.max = TIME_WINDOW_SECONDS;

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
 * 차트에 새로운 데이터를 추가하고, 오래된 데이터는 제거하는 함수 (슬라이딩 윈도우)
 */
function addDataToChart(chart, timestamp, data) {
  chart.data.datasets.forEach(dataset => {
    const key = dataset.label;
    const value = data.hasOwnProperty(key) ? parseFloat(data[key]) : null;
    dataset.data.push({ x: timestamp, y: value });

    // [핵심] 데이터 포인트가 MAX_DATA_POINTS를 초과하면 가장 오래된 데이터 제거
    if (dataset.data.length > MAX_DATA_POINTS) {
      dataset.data.shift();
    }
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

  // [삭제] 수동으로 X축을 스크롤하던 로직을 제거합니다.
  // 데이터 자체가 윈도우 크기를 유지하므로 차트가 자동으로 범위를 조절합니다.

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
 
  // --- 차트 업데이트 ---
  altitudeChart.update('none');
  accelerationChart.update('none');
}