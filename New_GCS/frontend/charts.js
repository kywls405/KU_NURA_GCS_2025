// frontend/charts.js

Chart.register(window.ChartZoom);

let altitudeChart, accelerationChart;
const MAX_DATA_POINTS = 500; // 차트에 최대 500개의 데이터를 보여줌 (값을 조금 늘렸습니다)

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
            tension: 0.1 // 선을 약간 부드럽게
        },
        point: {
            radius: 1.5 // 데이터 포인트를 작게 표시
        }
    }
  };
}

/**
 * 고도 및 가속도 차트를 초기화하고 리셋하는 함수
 */
export function initCharts() {
  const altOptions = createChartOptions('Flight Time (s)', 'Altitude (m)', 0, 500, 100);
  const altCtx = document.getElementById('altitude-chart').getContext('2d');
  
  if (altitudeChart) {
    altitudeChart.destroy(); // 기존 차트가 있으면 파괴
  }
  altitudeChart = new Chart(altCtx, {
    type: 'line',
    data: { datasets: [
        {label: 'P_alt', data: [], borderColor: '#5B74B4', borderWidth: 2, },
        {label: 'Alt', data: [], borderColor: '#d42626ff', borderWidth: 2,}
    ]},
    options: altOptions
  });

  const accelOptions = createChartOptions('Flight Time (s)', 'Acceleration (m/s²)', -40, 40, 10);
  const accelCtx = document.getElementById('acceleration-chart').getContext('2d');

  if (accelerationChart) {
    accelerationChart.destroy(); // 기존 차트가 있으면 파괴
  }
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
 * 차트에 새로운 데이터를 추가하고, 오래된 데이터는 제거하는 함수
 */
function addDataToChart(chart, flightTimestamp, data) {
  chart.data.datasets.forEach(dataset => {
    // 키 이름 불일치 문제 해결 (accelData의 키는 'Ax'이지만 data에는 'ax'로 들어옴)
    const key_map = { 'P_alt': 'P_alt', 'Alt': 'Alt', 'Ax': 'ax', 'Ay': 'ay', 'Az': 'az'};
    const dataKey = key_map[dataset.label];
    
    if (data.hasOwnProperty(dataKey)) {
      const value = parseFloat(data[dataKey]);
      dataset.data.push({ x: flightTimestamp, y: value });

      if (dataset.data.length > MAX_DATA_POINTS) {
        dataset.data.shift();
      }
    }
  });
}

/**
 * 수신된 데이터로 차트를 업데이트하는 함수
 */
export function updateCharts(data) {
  if (!altitudeChart || !accelerationChart || !data) return;

  // [핵심 수정] launch 신호가 오고, flight_timestamp가 0보다 클 때만 차트 업데이트
  if (data.launch !== 1 || data.flight_timestamp <= 0) {
    return; // 조건 미충족 시 아무것도 그리지 않음
  }

  const flightTimestamp = data.flight_timestamp;

  // --- 데이터 추가 ---
  addDataToChart(altitudeChart, flightTimestamp, data);
  addDataToChart(accelerationChart, flightTimestamp, data);
 
  // --- 차트 업데이트 ---
  altitudeChart.update('none');
  accelerationChart.update('none');
}