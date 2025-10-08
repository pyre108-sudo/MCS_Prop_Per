
// Global variables
let matrixData = [];
let timeAnalysisRunning = false;
let timeInterval = null;
let startTime = null;
let correlationChart = null;
let futureValueChart = null;
let currentStats = {};
let changeHistory = [];
let lastCalculationTime = null;

// Sample data from the application data
const sampleMatrixData = [
    [10, 15, 20, 25],
    [12, 18, 22, 28],
    [14, 16, 24, 30],
    [16, 20, 26, 32],
    [18, 22, 28, 35],
    [20, 25, 30, 38],
    [22, 28, 32, 40],
    [24, 30, 35, 42]
];

const correlationThresholds = [0.1, 0.5, 0.7, 0.9];
const futureValueParams = {
    presentValue: 1000,
    interestRate: 0.07,
    periods: 10
};

// Enhanced Matrix Functions with Real-time Change Detection
function generateMatrix() {
    const rows = parseInt(document.getElementById('matrixRows').value);
    const cols = parseInt(document.getElementById('matrixCols').value);

    if (rows < 2 || rows > 10 || cols < 2 || cols > 8) {
        alert('Matrix dimensions must be between 2-10 rows and 2-8 columns');
        return;
    }

    // Initialize matrix with random values for better testing
    matrixData = Array(rows).fill().map(() => 
        Array(cols).fill().map(() => Math.round(Math.random() * 50 + 10))
    );

    renderMatrix(rows, cols);
    updateMatrixStatus('Generated');
    logDataChange('Matrix Generated', { rows, cols });
    recalculateAllStats();
}

function loadSampleData() {
    const rows = sampleMatrixData.length;
    const cols = sampleMatrixData[0].length;

    document.getElementById('matrixRows').value = rows;
    document.getElementById('matrixCols').value = cols;

    matrixData = sampleMatrixData.map(row => [...row]);

    renderMatrix(rows, cols, true);
    updateMatrixStatus('Sample Loaded');
    logDataChange('Sample Data Loaded', { rows, cols });
    recalculateAllStats();
}

function renderMatrix(rows, cols, loadSample = false) {
    const container = document.getElementById('matrixContainer');

    let html = '<table class="matrix-table"><thead><tr><th>Row\\Col</th>';

    // Column headers
    for (let j = 0; j < cols; j++) {
        html += `<th>C${j + 1}</th>`;
    }
    html += '</tr></thead><tbody>';

    // Matrix rows with enhanced input handlers
    for (let i = 0; i < rows; i++) {
        html += `<tr><th>R${i + 1}</th>`;
        for (let j = 0; j < cols; j++) {
            const value = loadSample ? matrixData[i][j] : (matrixData[i] ? matrixData[i][j] : 0);
            html += `<td><input type="number" 
                        value="${value}" 
                        class="matrix-cell-input" 
                        data-row="${i}" 
                        data-col="${j}"
                        onchange="handleCellChange(${i}, ${j}, this.value)"
                        onkeyup="handleCellChange(${i}, ${j}, this.value)"
                        oninput="handleCellChange(${i}, ${j}, this.value)"></td>`;
        }
        html += '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Enhanced Cell Change Handler with Real-time Updates
function handleCellChange(row, col, value) {
    const numValue = parseFloat(value) || 0;
    const oldValue = matrixData[row] ? matrixData[row][col] : 0;

    // Ensure matrix structure exists
    if (!matrixData[row]) {
        matrixData[row] = [];
    }

    // Update the value
    matrixData[row][col] = numValue;

    // Log the change
    logDataChange('Cell Updated', {
        position: `R${row + 1}C${col + 1}`,
        oldValue: oldValue,
        newValue: numValue,
        timestamp: new Date().toISOString()
    });

    // Real-time statistics update
    recalculateAllStats();

    // Update displays
    updateMatrixStatus('Modified');
    updateChangeCounter();
}

// Enhanced Statistics Calculation
function recalculateAllStats() {
    if (!matrixData || matrixData.length === 0) return;

    const flatData = matrixData.flat().filter(val => !isNaN(val));
    if (flatData.length === 0) return;

    // Basic statistics
    const mean = flatData.reduce((sum, val) => sum + val, 0) / flatData.length;
    const variance = flatData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / flatData.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...flatData);
    const max = Math.max(...flatData);

    // Column-wise statistics
    const colStats = [];
    const numCols = matrixData[0] ? matrixData[0].length : 0;

    for (let col = 0; col < numCols; col++) {
        const colData = matrixData.map(row => row[col]).filter(val => !isNaN(val));
        if (colData.length > 0) {
            const colMean = colData.reduce((sum, val) => sum + val, 0) / colData.length;
            const colVariance = colData.reduce((sum, val) => sum + Math.pow(val - colMean, 2), 0) / colData.length;
            colStats.push({
                col: col + 1,
                mean: colMean,
                variance: colVariance,
                stdDev: Math.sqrt(colVariance)
            });
        }
    }

    // Correlation matrix calculation
    const correlationMatrix = calculateCorrelationMatrix();

    // Future value calculations
    const fvResults = calculateFutureValues(mean, variance);

    // Update global stats
    currentStats = {
        basic: { mean, variance, stdDev, min, max, count: flatData.length },
        columns: colStats,
        correlation: correlationMatrix,
        futureValue: fvResults,
        lastUpdated: new Date().toISOString()
    };

    // Update all displays
    updateStatisticsDisplay();
    updateCorrelationDisplay();
    updateFutureValueDisplay();
    updateUnifiedResults();

    lastCalculationTime = Date.now();
}

// Enhanced Correlation Matrix Calculation
function calculateCorrelationMatrix() {
    if (!matrixData || matrixData.length < 2) return null;

    const numCols = matrixData[0] ? matrixData[0].length : 0;
    if (numCols < 2) return null;

    const correlations = [];

    for (let i = 0; i < numCols; i++) {
        correlations[i] = [];
        for (let j = 0; j < numCols; j++) {
            if (i === j) {
                correlations[i][j] = 1.0;
            } else {
                const col1 = matrixData.map(row => row[i]).filter(val => !isNaN(val));
                const col2 = matrixData.map(row => row[j]).filter(val => !isNaN(val));
                correlations[i][j] = calculatePearsonCorrelation(col1, col2);
            }
        }
    }

    return correlations;
}

function calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

// Enhanced Future Value Calculations
function calculateFutureValues(mean, variance) {
    const baseRate = parseFloat(document.getElementById('interestRate')?.value || 0.07);
    const periods = parseInt(document.getElementById('periods')?.value || 10);
    const presentValue = parseFloat(document.getElementById('presentValue')?.value || mean);

    // Adjust interest rate based on variance (risk adjustment)
    const adjustedRate = baseRate + (variance / 10000); // Simple risk adjustment

    const futureValue = presentValue * Math.pow(1 + adjustedRate, periods);
    const compoundGrowth = ((futureValue - presentValue) / presentValue) * 100;

    return {
        presentValue,
        futureValue,
        adjustedRate,
        compoundGrowth,
        periods
    };
}

// Change Logging and History
function logDataChange(action, details) {
    const change = {
        timestamp: new Date().toISOString(),
        action,
        details,
        id: changeHistory.length + 1
    };

    changeHistory.push(change);

    // Keep only last 50 changes
    if (changeHistory.length > 50) {
        changeHistory.shift();
    }

    updateChangeHistory();
}

// Enhanced Display Updates
function updateStatisticsDisplay() {
    if (!currentStats.basic) return;

    const statsContainer = document.getElementById('basicStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Mean:</span>
                <span class="stat-value">${currentStats.basic.mean.toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Variance:</span>
                <span class="stat-value">${currentStats.basic.variance.toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Std Dev:</span>
                <span class="stat-value">${currentStats.basic.stdDev.toFixed(2)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Range:</span>
                <span class="stat-value">${currentStats.basic.min} - ${currentStats.basic.max}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Count:</span>
                <span class="stat-value">${currentStats.basic.count}</span>
            </div>
        `;
    }
}

function updateCorrelationDisplay() {
    if (!currentStats.correlation) return;

    const corrContainer = document.getElementById('correlationMatrix');
    if (corrContainer) {
        let html = '<table class="correlation-table"><thead><tr><th></th>';

        for (let i = 0; i < currentStats.correlation.length; i++) {
            html += `<th>C${i + 1}</th>`;
        }
        html += '</tr></thead><tbody>';

        for (let i = 0; i < currentStats.correlation.length; i++) {
            html += `<tr><th>C${i + 1}</th>`;
            for (let j = 0; j < currentStats.correlation[i].length; j++) {
                const corr = currentStats.correlation[i][j];
                const intensity = Math.abs(corr);
                const color = corr > 0 ? `rgba(0, 255, 0, ${intensity})` : `rgba(255, 0, 0, ${intensity})`;
                html += `<td style="background-color: ${color}" title="${corr.toFixed(3)}">${corr.toFixed(2)}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody></table>';
        corrContainer.innerHTML = html;
    }
}

function updateFutureValueDisplay() {
    if (!currentStats.futureValue) return;

    const fvContainer = document.getElementById('futureValueResults');
    if (fvContainer) {
        const fv = currentStats.futureValue;
        fvContainer.innerHTML = `
            <div class="fv-result">
                <span class="fv-label">Present Value:</span>
                <span class="fv-value">$${fv.presentValue.toFixed(2)}</span>
            </div>
            <div class="fv-result">
                <span class="fv-label">Future Value:</span>
                <span class="fv-value">$${fv.futureValue.toFixed(2)}</span>
            </div>
            <div class="fv-result">
                <span class="fv-label">Adjusted Rate:</span>
                <span class="fv-value">${(fv.adjustedRate * 100).toFixed(3)}%</span>
            </div>
            <div class="fv-result">
                <span class="fv-label">Growth:</span>
                <span class="fv-value">${fv.compoundGrowth.toFixed(1)}%</span>
            </div>
            <div class="fv-result">
                <span class="fv-label">Periods:</span>
                <span class="fv-value">${fv.periods}</span>
            </div>
        `;
    }
}

function updateChangeHistory() {
    const historyContainer = document.getElementById('changeHistory');
    if (historyContainer && changeHistory.length > 0) {
        let html = '<div class="change-log">';
        changeHistory.slice(-5).reverse().forEach(change => {
            html += `
                <div class="change-item">
                    <span class="change-time">${new Date(change.timestamp).toLocaleTimeString()}</span>
                    <span class="change-action">${change.action}</span>
                    <span class="change-details">${JSON.stringify(change.details)}</span>
                </div>
            `;
        });
        html += '</div>';
        historyContainer.innerHTML = html;
    }
}

function updateChangeCounter() {
    const counter = document.getElementById('changeCounter');
    if (counter) {
        counter.textContent = changeHistory.length;
    }
}

function updateMatrixStatus(status) {
    const statusEl = document.getElementById('matrixStatus');
    if (statusEl) {
        statusEl.textContent = `Status: ${status}`;
        statusEl.className = `status-indicator status-${status.toLowerCase().replace(' ', '-')}`;
    }
}

// Time Analysis Functions
function startTimeAnalysis() {
    if (timeAnalysisRunning) return;

    timeAnalysisRunning = true;
    startTime = Date.now();
    document.getElementById('startAnalysisBtn').disabled = true;
    document.getElementById('stopAnalysisBtn').disabled = false;

    timeInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const timeDisplay = `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

        document.getElementById('timeDisplay').textContent = timeDisplay;

        // Trigger recalculation every 5 seconds during analysis
        if (seconds % 5 === 0) {
            recalculateAllStats();
        }

        // Check correlation thresholds
        checkCorrelationThresholds();

    }, 1000);

    logDataChange('Time Analysis Started', { startTime });
}

function stopTimeAnalysis() {
    if (!timeAnalysisRunning) return;

    timeAnalysisRunning = false;
    clearInterval(timeInterval);
    document.getElementById('startAnalysisBtn').disabled = false;
    document.getElementById('stopAnalysisBtn').disabled = true;

    logDataChange('Time Analysis Stopped', { 
        duration: Date.now() - startTime 
    });
}

function checkCorrelationThresholds() {
    if (!currentStats.correlation) return;

    const threshold = parseFloat(document.getElementById('correlationThreshold')?.value || 0.7);
    let thresholdMet = false;

    for (let i = 0; i < currentStats.correlation.length; i++) {
        for (let j = i + 1; j < currentStats.correlation[i].length; j++) {
            if (Math.abs(currentStats.correlation[i][j]) >= threshold) {
                thresholdMet = true;
                break;
            }
        }
        if (thresholdMet) break;
    }

    if (thresholdMet) {
        document.getElementById('thresholdStatus').textContent = 'Threshold Met!';
        document.getElementById('thresholdStatus').className = 'threshold-met';
    } else {
        document.getElementById('thresholdStatus').textContent = 'Below Threshold';
        document.getElementById('thresholdStatus').className = 'threshold-unmet';
    }
}

// Unified Results Update
function updateUnifiedResults() {
    const unifiedContainer = document.getElementById('unifiedResults');
    if (unifiedContainer && currentStats.basic) {
        const results = {
            matrixDimensions: `${matrixData.length}×${matrixData[0]?.length || 0}`,
            totalChanges: changeHistory.length,
            lastUpdate: new Date(currentStats.lastUpdated).toLocaleTimeString(),
            correlationStrength: 'calculating...',
            futureValueProjection: currentStats.futureValue?.futureValue?.toFixed(2) || 'N/A'
        };

        if (currentStats.correlation) {
            const avgCorrelation = currentStats.correlation.flat()
                .filter((val, i, arr) => val !== 1.0)
                .reduce((sum, val) => sum + Math.abs(val), 0) / (currentStats.correlation.length * (currentStats.correlation.length - 1));
            results.correlationStrength = `${(avgCorrelation * 100).toFixed(1)}%`;
        }

        unifiedContainer.innerHTML = `
            <div class="unified-grid">
                <div class="unified-item">
                    <span class="unified-label">Matrix:</span>
                    <span class="unified-value">${results.matrixDimensions}</span>
                </div>
                <div class="unified-item">
                    <span class="unified-label">Changes:</span>
                    <span class="unified-value">${results.totalChanges}</span>
                </div>
                <div class="unified-item">
                    <span class="unified-label">Last Update:</span>
                    <span class="unified-value">${results.lastUpdate}</span>
                </div>
                <div class="unified-item">
                    <span class="unified-label">Avg Correlation:</span>
                    <span class="unified-value">${results.correlationStrength}</span>
                </div>
                <div class="unified-item">
                    <span class="unified-label">FV Projection:</span>
                    <span class="unified-value">$${results.futureValueProjection}</span>
                </div>
            </div>
        `;
    }
}

// Export Functions
function exportResults() {
    const exportData = {
        matrixData,
        currentStats,
        changeHistory,
        timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'matrix-analysis-results.json';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set up initial display
    generateMatrix();

    // Add event listeners for real-time updates
    document.getElementById('correlationThreshold')?.addEventListener('change', checkCorrelationThresholds);
    document.getElementById('interestRate')?.addEventListener('change', recalculateAllStats);
    document.getElementById('periods')?.addEventListener('change', recalculateAllStats);
    document.getElementById('presentValue')?.addEventListener('change', recalculateAllStats);

    // Initial calculation
    setTimeout(recalculateAllStats, 500);
});

// Call this on every change to animate the numeric counter
function animateChangeCounter() {
  const counter = document.getElementById('changeCounter');
  if (counter) {
    counter.classList.add('flash');
    setTimeout(() => counter.classList.remove('flash'), 500);
  }
}

// Example: Update progress bar fill width (percent: 0-100)
function updateBarFill(percent) {
  document.querySelectorAll('.bar-fill').forEach(bar => {
    bar.style.width = percent + '%';
  });
}

// Example: Add/update pulse dot on last update container
function setLastUpdatePulse() {
  const pulse = document.createElement('span');
  pulse.className = 'last-update-pulse';
  document.getElementById('lastUpdateContainer').appendChild(pulse);
}

