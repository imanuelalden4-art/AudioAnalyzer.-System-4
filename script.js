// ==========================================
// LOADING SCREEN MANAGEMENT
// ==========================================
const loadingState = {
    screen: document.getElementById('loading-screen'),
    title: document.getElementById('loading-title'),
    description: document.getElementById('loading-description'),
    statusText: document.getElementById('loading-status-text'),
    progressBar: document.getElementById('loading-progress-bar'),
    progressText: document.getElementById('loading-progress-text'),
    canvas: document.getElementById('waveform-canvas-decorative'),
    animationId: null,
    waveOffset: 0
};

const LOADING_STATES = {
    INITIALIZING: {
        title: 'Initializing SonicScope',
        description: 'Preparing the audio analysis environment...',
        status: 'SYSTEM INITIALIZING',
        progress: 'LOADING INTERFACE'
    },
    READY: {
        title: 'Ready for Analysis',
        description: 'Upload an audio file to begin signal analysis.',
        status: 'SYSTEM READY',
        progress: 'AWAITING INPUT'
    },
    ERROR: {
        title: 'Analysis Interrupted',
        description: 'An error occurred during processing.',
        status: 'ERROR',
        progress: 'FAILED'
    }
};

function setLoadingState(stateKey, customDescription = null) {
    const state = LOADING_STATES[stateKey];
    if (!state) return;
    
    loadingState.title.textContent = state.title;
    loadingState.description.textContent = customDescription || state.description;
    loadingState.statusText.textContent = state.status;
    loadingState.progressText.textContent = state.progress;
    
    const dot = loadingState.screen.querySelector('.loading-status-dot');
    if (stateKey === 'ERROR') {
        dot.style.background = 'var(--loading-warning)';
    } else {
        dot.style.background = 'var(--loading-accent)';
    }
}

function hideLoadingScreen() {
    if (!loadingState.screen) return;
    loadingState.screen.classList.add('hidden');
    stopWaveformAnimation();
    setTimeout(() => {
        if (loadingState.screen) {
            loadingState.screen.style.display = 'none';
        }
    }, 300);
}

function startWaveformAnimation() {
    const canvas = loadingState.canvas;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }
    
    resize();
    window.addEventListener('resize', resize);
    
    function drawWave() {
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.beginPath();
        ctx.strokeStyle = '#42D9F5';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(66, 217, 245, 0.5)';
        
        const centerY = height / 2;
        const amplitude = height * 0.3;
        const frequency = 0.02;
        
        for (let x = 0; x < width; x++) {
            const y = centerY + Math.sin((x + loadingState.waveOffset) * frequency) * amplitude * 
                     (0.5 + 0.5 * Math.sin(x * 0.01 + loadingState.waveOffset * 0.01));
            
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        loadingState.waveOffset += 2;
        loadingState.animationId = requestAnimationFrame(drawWave);
    }
    
    drawWave();
}

function stopWaveformAnimation() {
    if (loadingState.animationId) {
        cancelAnimationFrame(loadingState.animationId);
        loadingState.animationId = null;
    }
}

// ==========================================
// STATE MANAGEMENT
// ==========================================
const state = {
    audioContext: null,
    audioBuffer: null,
    audioElement: null,
    objectUrl: null,
    fileName: '',
    fileSize: 0,
    duration: 0,
    sampleRate: 0,
    channelCount: 0,
    samples: [],
    fftSize: 4096,
    analysis: {
        peak: 0,
        rms: 0,
        clipping: { count: 0, percentage: 0, channels: [] },
        spectrum: null,
        bands: {},
        spectrogram: null,
        windowed: { active: false, start: 0, end: 0 }
    },
    isPlaying: false,
    animationFrameId: null,
    isProcessing: false,
    maxFileSize: 25 * 1024 * 1024
};

// ==========================================
// DOM REFERENCES
// ==========================================
const dom = {
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    fileInfo: document.getElementById('file-info'),
    playerSection: document.getElementById('player-section'),
    btnPlay: document.getElementById('btn-play'),
    btnPause: document.getElementById('btn-pause'),
    btnResetPlay: document.getElementById('btn-reset-play'),
    progressBar: document.getElementById('progress-bar'),
    currentTime: document.getElementById('current-time'),
    totalTime: document.getElementById('total-time'),
    btnMute: document.getElementById('btn-mute'),
    volumeBar: document.getElementById('volume-bar'),
    infoSection: document.getElementById('info-section'),
    audioInfoList: document.getElementById('audio-info-list'),
    analysisSummaryList: document.getElementById('analysis-summary-list'),
    textSummary: document.getElementById('text-summary'),
    waveformSection: document.getElementById('waveform-section'),
    waveformCanvas: document.getElementById('waveform-canvas'),
    waveformTooltip: document.getElementById('waveform-tooltip'),
    windowStart: document.getElementById('window-start'),
    windowEnd: document.getElementById('window-end'),
    btnApplyWindow: document.getElementById('btn-apply-window'),
    btnClearWindow: document.getElementById('btn-clear-window'),
    spectrumSection: document.getElementById('spectrum-section'),
    spectrumCanvas: document.getElementById('spectrum-canvas'),
    spectrumTooltip: document.getElementById('spectrum-tooltip'),
    bandsSection: document.getElementById('bands-section'),
    bandsList: document.getElementById('bands-list'),
    spectrogramSection: document.getElementById('spectrogram-section'),
    spectrogramCanvas: document.getElementById('spectrogram-canvas'),
    spectrogramTooltip: document.getElementById('spectrogram-tooltip'),
    clippingSection: document.getElementById('clipping-section'),
    clippingInfo: document.getElementById('clipping-info'),
    btnResetAll: document.getElementById('btn-reset-all'),
    toastContainer: document.getElementById('toast-container')
};

// ==========================================
// UTILITIES
// ==========================================
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function setStatus(text, type = 'ready') {
    dom.statusText.textContent = text;
    dom.statusIndicator.className = `status ${type}`;
}

function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
}

// ==========================================
// FILE HANDLING & DECODING
// ==========================================
async function handleFile(file) {
    if (!file) {
        showToast('No file selected.', 'error');
        return;
    }
    if (file.size === 0) {
        showToast('File is empty.', 'error');
        return;
    }
    if (file.size > state.maxFileSize) {
        showToast(`File too large. Max size is ${formatSize(state.maxFileSize)}.`, 'error');
        return;
    }
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|ogg|flac|m4a|aac)$/i)) {
        showToast('Unsupported file format.', 'error');
        return;
    }

    resetAnalysis();
    
    setStatus('Loading audio...', 'loading');
    showToast('Reading audio file...', 'info');

    try {
        const arrayBuffer = await file.arrayBuffer();
        
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        state.audioBuffer = await state.audioContext.decodeAudioData(arrayBuffer);
        
        state.fileName = file.name;
        state.fileSize = file.size;
        state.duration = state.audioBuffer.duration;
        state.sampleRate = state.audioBuffer.sampleRate;
        state.channelCount = state.audioBuffer.numberOfChannels;
        
        for (let i = 0; i < state.channelCount; i++) {
            state.samples.push(state.audioBuffer.getChannelData(i));
        }

        if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
        state.objectUrl = URL.createObjectURL(file);
        state.audioElement.src = state.objectUrl;
        state.audioElement.load();

        dom.fileInfo.textContent = `${state.fileName} | ${formatSize(state.fileSize)}`;
        dom.fileInfo.classList.remove('hidden');
        
        setStatus('Analyzing...', 'loading');
        await runAnalysis();
        
    } catch (err) {
        console.error('Decoding error:', err);
        showToast('Failed to decode audio. File may be corrupted or unsupported.', 'error');
        setStatus('Error', 'error');
    }
}

function resetAnalysis() {
    if (state.audioElement) {
        state.audioElement.pause();
        state.audioElement.currentTime = 0;
    }
    state.audioBuffer = null;
    state.samples = [];
    state.analysis = {
        peak: 0, rms: 0,
        clipping: { count: 0, percentage: 0, channels: [] },
        spectrum: null, bands: {}, spectrogram: null,
        windowed: { active: false, start: 0, end: 0 }
    };
    state.isPlaying = false;
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    
    dom.playerSection.classList.add('hidden');
    dom.infoSection.classList.add('hidden');
    dom.waveformSection.classList.add('hidden');
    dom.spectrumSection.classList.add('hidden');
    dom.bandsSection.classList.add('hidden');
    dom.spectrogramSection.classList.add('hidden');
    dom.clippingSection.classList.add('hidden');
    dom.btnResetAll.classList.add('hidden');
}

// ==========================================
// DSP ENGINE
// ==========================================
function calculatePeak(samples) {
    let max = 0;
    for (let i = 0; i < samples.length; i++) {
        const abs = Math.abs(samples[i]);
        if (abs > max) max = abs;
    }
    return max;
}

function calculateRMS(samples) {
    let sumSq = 0;
    for (let i = 0; i < samples.length; i++) {
        sumSq += samples[i] * samples[i];
    }
    return Math.sqrt(sumSq / samples.length);
}

function detectClipping(samples, threshold = 0.999) {
    let count = 0;
    for (let i = 0; i < samples.length; i++) {
        if (Math.abs(samples[i]) >= threshold) count++;
    }
    return { count, percentage: (count / samples.length) * 100 };
}

function fftIterative(real, imag) {
    const n = real.length;
    const bits = Math.log2(n);
    if (n & (n - 1)) throw new Error("FFT length must be power of 2");

    for (let i = 0; i < n; i++) {
        let j = 0;
        for (let k = 0; k < bits; k++) {
            j = (j << 1) | ((i >> k) & 1);
        }
        if (j > i) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    for (let size = 2; size <= n; size *= 2) {
        const halfSize = size / 2;
        const tableStep = n / size;
        for (let i = 0; i < n; i += size) {
            let k = 0;
            for (let j = i; j < i + halfSize; j++) {
                const angle = -2 * Math.PI * k / size;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const tReal = real[j + halfSize] * cos - imag[j + halfSize] * sin;
                const tImag = real[j + halfSize] * sin + imag[j + halfSize] * cos;
                
                real[j + halfSize] = real[j] - tReal;
                imag[j + halfSize] = imag[j] - tImag;
                real[j] += tReal;
                imag[j] += tImag;
                k += tableStep;
            }
        }
    }
}

function applyHannWindow(samples) {
    const n = samples.length;
    const windowed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        windowed[i] = samples[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
    }
    return windowed;
}

function getSpectrum(samples, sampleRate, fftSize) {
    const n = fftSize;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    
    const len = Math.min(samples.length, n);
    for (let i = 0; i < len; i++) real[i] = samples[i];
    
    const windowed = applyHannWindow(real);
    for (let i = 0; i < n; i++) real[i] = windowed[i];
    
    fftIterative(real, imag);
    
    const magnitudes = new Float32Array(n / 2);
    const norm = n / 2;
    for (let i = 0; i < n / 2; i++) {
        magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / norm;
    }
    magnitudes[0] /= 2;
    
    return magnitudes;
}

function getCombinedSpectrum(samplesArray, sampleRate, fftSize) {
    if (samplesArray.length === 1) return getSpectrum(samplesArray[0], sampleRate, fftSize);
    
    const specs = samplesArray.map(ch => getSpectrum(ch, sampleRate, fftSize));
    const combined = new Float32Array(specs[0].length);
    
    for (let i = 0; i < combined.length; i++) {
        let maxMag = 0;
        for (let c = 0; c < specs.length; c++) {
            if (specs[c][i] > maxMag) maxMag = specs[c][i];
        }
        combined[i] = maxMag;
    }
    return combined;
}

function calculateBands(spectrum, sampleRate, fftSize) {
    const bands = {
        'Sub-bass': { min: 20, max: 60, energy: 0 },
        'Bass': { min: 60, max: 250, energy: 0 },
        'Midrange': { min: 250, max: 2000, energy: 0 },
        'Upper-midrange': { min: 2000, max: 4000, energy: 0 },
        'Treble': { min: 4000, max: 20000, energy: 0 }
    };
    
    let totalEnergy = 0;
    const nyquist = sampleRate / 2;
    
    for (let i = 1; i < spectrum.length; i++) {
        const freq = i * sampleRate / fftSize;
        if (freq > nyquist) break;
        
        const power = spectrum[i] * spectrum[i];
        totalEnergy += power;
        
        for (const band in bands) {
            if (freq >= bands[band].min && freq < bands[band].max) {
                bands[band].energy += power;
            }
        }
    }
    
    for (const band in bands) {
        bands[band].percentage = totalEnergy > 0 ? (bands[band].energy / totalEnergy) * 100 : 0;
    }
    
    return bands;
}

function getSpectrogram(samples, sampleRate, fftSize = 1024, hopSize = 512, maxFrames = 1500) {
    const totalFrames = Math.floor((samples.length - fftSize) / hopSize) + 1;
    const step = totalFrames > maxFrames ? Math.floor(totalFrames / maxFrames) : 1;
    const frames = [];
    
    for (let i = 0; i < totalFrames; i += step) {
        const start = i * hopSize;
        const frameSamples = samples.slice(start, start + fftSize);
        if (frameSamples.length < fftSize) break;
        
        const spectrum = getSpectrum(frameSamples, sampleRate, fftSize);
        frames.push(spectrum);
    }
    return frames;
}

function downsampleWaveform(samples, targetWidth) {
    const len = samples.length;
    const blockSize = Math.max(1, Math.floor(len / targetWidth));
    const peaks = new Float32Array(targetWidth * 2);
    
    for (let i = 0; i < targetWidth; i++) {
        const start = i * blockSize;
        const end = Math.min(start + blockSize, len);
        let min = 0, max = 0;
        for (let j = start; j < end; j++) {
            if (samples[j] < min) min = samples[j];
            if (samples[j] > max) max = samples[j];
        }
        peaks[i * 2] = min;
        peaks[i * 2 + 1] = max;
    }
    return peaks;
}

// ==========================================
// ANALYSIS ORCHESTRATION
// ==========================================
async function runAnalysis() {
    state.isProcessing = true;

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        let maxPeak = 0;
        let sumSqTotal = 0;
        let totalSamples = 0;
        const clippingChannels = [];

        for (let c = 0; c < state.samples.length; c++) {
            const chSamples = state.samples[c];
            const peak = calculatePeak(chSamples);
            if (peak > maxPeak) maxPeak = peak;

            for (let i = 0; i < chSamples.length; i++) sumSqTotal += chSamples[i] * chSamples[i];
            totalSamples += chSamples.length;

            const clip = detectClipping(chSamples);
            clippingChannels.push(clip);
        }

        state.analysis.peak = maxPeak;
        state.analysis.rms = Math.sqrt(sumSqTotal / totalSamples);
        state.analysis.clipping.channels = clippingChannels;
        state.analysis.clipping.count = clippingChannels.reduce((sum, ch) => sum + ch.count, 0);
        const totalClipSamples = clippingChannels.reduce((sum, ch) => sum + ch.percentage, 0) / state.samples.length;
        state.analysis.clipping.percentage = totalClipSamples;

        state.analysis.spectrum = getCombinedSpectrum(state.samples, state.sampleRate, state.fftSize);
        state.analysis.bands = calculateBands(state.analysis.spectrum, state.sampleRate, state.fftSize);

        const monoSamples = state.samples[0]; 
        state.analysis.spectrogram = getSpectrogram(monoSamples, state.sampleRate);

        updateUI();
        setStatus('Analysis complete', 'complete');
        showToast('Analysis completed successfully.', 'success');
    } catch (err) {
        console.error('Analysis error:', err);
        showToast('Analysis failed.', 'error');
        setStatus('Error', 'error');
    } finally {
        state.isProcessing = false;
    }
}

// ==========================================
// UI UPDATES
// ==========================================
function updateUI() {
    dom.playerSection.classList.remove('hidden');
    dom.infoSection.classList.remove('hidden');
    dom.waveformSection.classList.remove('hidden');
    dom.spectrumSection.classList.remove('hidden');
    dom.bandsSection.classList.remove('hidden');
    dom.spectrogramSection.classList.remove('hidden');
    dom.clippingSection.classList.remove('hidden');
    dom.btnResetAll.classList.remove('hidden');

    dom.audioInfoList.innerHTML = `
        <dt>File Name</dt><dd>${state.fileName}</dd>
        <dt>File Size</dt><dd>${formatSize(state.fileSize)}</dd>
        <dt>Duration</dt><dd>${formatTime(state.duration)} (${state.duration.toFixed(2)}s)</dd>
        <dt>Sample Rate</dt><dd>${state.sampleRate} Hz</dd>
        <dt>Channels</dt><dd>${state.channelCount}</dd>
        <dt>Total Samples</dt><dd>${state.samples[0].length.toLocaleString()}</dd>
    `;
    dom.totalTime.textContent = formatTime(state.duration);
    dom.windowEnd.value = state.duration.toFixed(2);

    const peakDb = state.analysis.peak > 0 ? (20 * Math.log10(state.analysis.peak)).toFixed(2) : '-∞';
    const rmsDb = state.analysis.rms > 0 ? (20 * Math.log10(state.analysis.rms)).toFixed(2) : '-∞';
    
    let dominantFreq = 'N/A';
    if (state.analysis.spectrum) {
        let maxMag = 0, maxIdx = 0;
        for (let i = 1; i < state.analysis.spectrum.length; i++) {
            if (state.analysis.spectrum[i] > maxMag) {
                maxMag = state.analysis.spectrum[i];
                maxIdx = i;
            }
        }
        if (maxMag > 0) {
            dominantFreq = `${(maxIdx * state.sampleRate / state.fftSize).toFixed(1)} Hz`;
        }
    }

    dom.analysisSummaryList.innerHTML = `
        <dt>Peak Level</dt><dd>${peakDb} dBFS</dd>
        <dt>RMS Level</dt><dd>${rmsDb} dBFS</dd>
        <dt>Dominant Freq</dt><dd>${dominantFreq}</dd>
    `;

    let summary = `The audio has a peak level of ${peakDb} dBFS and an RMS level of ${rmsDb} dBFS. `;
    if (state.analysis.clipping.count > 0) {
        summary += `Near-full-scale samples were detected (${state.analysis.clipping.percentage.toFixed(4)}%), indicating potential clipping or heavy limiting. `;
    } else {
        summary += `No near-full-scale samples were detected. `;
    }
    if (dominantFreq !== 'N/A') {
        summary += `The dominant frequency component is at ${dominantFreq}.`;
    }
    dom.textSummary.textContent = summary;

    let clipHtml = '';
    if (state.analysis.clipping.count === 0) {
        clipHtml = `<p style="color: var(--success);">No near-full-scale samples detected (Threshold: 0.999).</p>`;
    } else {
        clipHtml = `<p style="color: var(--warning);">Near-full-scale samples detected.</p>`;
        state.analysis.clipping.channels.forEach((ch, i) => {
            clipHtml += `<div class="info-list"><dt>Channel ${i + 1}</dt><dd>${ch.count} samples (${ch.percentage.toFixed(4)}%)</dd></div>`;
        });
    }
    dom.clippingInfo.innerHTML = clipHtml;

    let bandsHtml = '';
    for (const [name, data] of Object.entries(state.analysis.bands)) {
        bandsHtml += `
            <div class="band-card">
                <h3>${name}</h3>
                <div class="range">${data.min} - ${data.max} Hz</div>
                <div class="bar-container"><div class="bar" style="width: ${data.percentage}%"></div></div>
                <div class="stats"><span>Energy</span><span>${data.percentage.toFixed(2)}%</span></div>
            </div>
        `;
    }
    dom.bandsList.innerHTML = bandsHtml;

    renderWaveform();
    renderSpectrum();
    renderSpectrogram();
}

// ==========================================
// CANVAS RENDERING
// ==========================================
function renderWaveform() {
    const { ctx, width, height } = setupCanvas(dom.waveformCanvas);
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (state.samples.length === 0) return;

    const peaks = downsampleWaveform(state.samples[0], width);
    
    ctx.beginPath();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < width; i++) {
        const min = peaks[i * 2];
        const max = peaks[i * 2 + 1];
        const yMin = (1 - max) * height / 2;
        const yMax = (1 - min) * height / 2;
        ctx.moveTo(i, yMin);
        ctx.lineTo(i, yMax);
    }
    ctx.stroke();

    if (state.analysis.windowed.active) {
        const xStart = (state.analysis.windowed.start / state.duration) * width;
        const xEnd = (state.analysis.windowed.end / state.duration) * width;
        ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
        ctx.fillRect(xStart, 0, xEnd - xStart, height);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(xStart, 0, xEnd - xStart, height);
    }

    if (state.audioElement && state.audioElement.currentTime > 0) {
        const x = (state.audioElement.currentTime / state.duration) * width;
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
}

function renderSpectrum() {
    const { ctx, width, height } = setupCanvas(dom.spectrumCanvas);
    ctx.clearRect(0, 0, width, height);

    if (!state.analysis.spectrum) return;

    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8b949e';
    ctx.font = '10px Inter, sans-serif';
    
    const freqs = [100, 1000, 10000];
    const maxFreq = state.sampleRate / 2;
    
    freqs.forEach(f => {
        if (f < maxFreq) {
            const x = (f / maxFreq) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.fillText(f >= 1000 ? `${f/1000}k` : f, x + 4, height - 4);
        }
    });

    const dbs = [-20, -40, -60, -80];
    dbs.forEach(db => {
        const y = height - ((db - (-100)) / 100) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.fillText(`${db} dB`, 4, y - 4);
    });

    ctx.beginPath();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    
    for (let i = 1; i < state.analysis.spectrum.length; i++) {
        const freq = i * state.sampleRate / state.fftSize;
        if (freq > maxFreq) break;
        
        const x = (freq / maxFreq) * width;
        const mag = state.analysis.spectrum[i];
        const db = mag > 0 ? 20 * Math.log10(mag) : -100;
        const y = height - ((db - (-100)) / 100) * height;
        
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function dbToColor(db) {
    const t = Math.max(0, Math.min(1, (db - (-100)) / 100));
    if (t < 0.33) {
        const k = t / 0.33;
        return `rgb(0, 0, ${Math.floor(k * 255)})`;
    } else if (t < 0.66) {
        const k = (t - 0.33) / 0.33;
        return `rgb(0, ${Math.floor(k * 255)}, 255)`;
    } else {
        const k = (t - 0.66) / 0.34;
        return `rgb(${Math.floor(k * 255)}, 255, 255)`;
    }
}

function renderSpectrogram() {
    const { ctx, width, height } = setupCanvas(dom.spectrogramCanvas);
    ctx.clearRect(0, 0, width, height);

    const frames = state.analysis.spectrogram;
    if (!frames || frames.length === 0) return;

    const colWidth = width / frames.length;
    const binHeight = height / frames[0].length;

    for (let i = 0; i < frames.length; i++) {
        for (let j = 0; j < frames[i].length; j++) {
            const mag = frames[i][j];
            const db = mag > 0 ? 20 * Math.log10(mag) : -100;
            ctx.fillStyle = dbToColor(db);
            ctx.fillRect(i * colWidth, height - (j + 1) * binHeight, colWidth + 1, binHeight + 1);
        }
    }
}

// ==========================================
// PLAYER CONTROLS
// ==========================================
function initPlayer() {
    state.audioElement = new Audio();
    state.audioElement.volume = 1;

    dom.btnPlay.addEventListener('click', () => {
        if (state.audioContext.state === 'suspended') state.audioContext.resume();
        state.audioElement.play();
        state.isPlaying = true;
        dom.btnPlay.classList.add('hidden');
        dom.btnPause.classList.remove('hidden');
        updatePlayhead();
    });

    dom.btnPause.addEventListener('click', () => {
        state.audioElement.pause();
        state.isPlaying = false;
        dom.btnPause.classList.add('hidden');
        dom.btnPlay.classList.remove('hidden');
        if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    });

    dom.btnResetPlay.addEventListener('click', () => {
        state.audioElement.currentTime = 0;
        state.audioElement.pause();
        state.isPlaying = false;
        dom.btnPause.classList.add('hidden');
        dom.btnPlay.classList.remove('hidden');
        dom.progressBar.value = 0;
        dom.currentTime.textContent = '0:00';
        renderWaveform();
    });

    dom.progressBar.addEventListener('input', (e) => {
        const time = (e.target.value / 100) * state.duration;
        state.audioElement.currentTime = time;
        dom.currentTime.textContent = formatTime(time);
        renderWaveform();
    });

    dom.volumeBar.addEventListener('input', (e) => {
        state.audioElement.volume = e.target.value;
        dom.btnMute.textContent = e.target.value == 0 ? '🔇' : '🔊';
    });

    dom.btnMute.addEventListener('click', () => {
        state.audioElement.muted = !state.audioElement.muted;
        dom.btnMute.textContent = state.audioElement.muted ? '🔇' : '🔊';
    });

    state.audioElement.addEventListener('ended', () => {
        state.isPlaying = false;
        dom.btnPause.classList.add('hidden');
        dom.btnPlay.classList.remove('hidden');
    });
}

function updatePlayhead() {
    if (!state.isPlaying) return;
    
    const progress = (state.audioElement.currentTime / state.duration) * 100;
    dom.progressBar.value = progress;
    dom.currentTime.textContent = formatTime(state.audioElement.currentTime);
    
    renderWaveform();
    state.animationFrameId = requestAnimationFrame(updatePlayhead);
}

// ==========================================
// INTERACTIONS
// ==========================================
function initWaveformInteractions() {
    const canvas = dom.waveformCanvas;
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const time = (x / rect.width) * state.duration;
        
        dom.waveformTooltip.classList.remove('hidden');
        dom.waveformTooltip.style.left = `${x + 10}px`;
        dom.waveformTooltip.style.top = `${y + 10}px`;
        dom.waveformTooltip.textContent = `Time: ${time.toFixed(3)}s`;
    });

    canvas.addEventListener('mouseleave', () => {
        dom.waveformTooltip.classList.add('hidden');
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = (x / rect.width) * state.duration;
        state.audioElement.currentTime = time;
        dom.currentTime.textContent = formatTime(time);
        dom.progressBar.value = (time / state.duration) * 100;
        renderWaveform();
    });
}

function initSpectrumInteractions() {
    const canvas = dom.spectrumCanvas;
    
    canvas.addEventListener('mousemove', (e) => {
        if (!state.analysis.spectrum) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const maxFreq = state.sampleRate / 2;
        const freq = (x / rect.width) * maxFreq;
        const db = (1 - (y / rect.height)) * 100 - 100;
        
        dom.spectrumTooltip.classList.remove('hidden');
        dom.spectrumTooltip.style.left = `${x + 10}px`;
        dom.spectrumTooltip.style.top = `${y + 10}px`;
        dom.spectrumTooltip.textContent = `${freq.toFixed(1)} Hz | ${db.toFixed(1)} dB`;
    });

    canvas.addEventListener('mouseleave', () => {
        dom.spectrumTooltip.classList.add('hidden');
    });
}

function initSpectrogramInteractions() {
    const canvas = dom.spectrogramCanvas;
    
    canvas.addEventListener('mousemove', (e) => {
        if (!state.analysis.spectrogram) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const time = (x / rect.width) * state.duration;
        const maxFreq = state.sampleRate / 2;
        const freq = (1 - (y / rect.height)) * maxFreq;
        
        dom.spectrogramTooltip.classList.remove('hidden');
        dom.spectrogramTooltip.style.left = `${x + 10}px`;
        dom.spectrogramTooltip.style.top = `${y + 10}px`;
        dom.spectrogramTooltip.textContent = `${time.toFixed(3)}s | ${freq.toFixed(1)} Hz`;
    });

    canvas.addEventListener('mouseleave', () => {
        dom.spectrogramTooltip.classList.add('hidden');
    });
}

function initWindowControls() {
    dom.btnApplyWindow.addEventListener('click', () => {
        const start = parseFloat(dom.windowStart.value);
        const end = parseFloat(dom.windowEnd.value);
        
        if (isNaN(start) || isNaN(end) || start < 0 || end <= start || end > state.duration) {
            showToast('Invalid time window.', 'error');
            return;
        }
        
        state.analysis.windowed.active = true;
        state.analysis.windowed.start = start;
        state.analysis.windowed.end = end;
        
        const startSample = Math.floor(start * state.sampleRate);
        const endSample = Math.floor(end * state.sampleRate);
        
        const windowedSamples = state.samples.map(ch => ch.slice(startSample, endSample));
        const spectrum = getCombinedSpectrum(windowedSamples, state.sampleRate, state.fftSize);
        
        let maxPeak = 0;
        let sumSqTotal = 0;
        let totalSamplesCount = 0;
        
        windowedSamples.forEach(ch => {
            const peak = calculatePeak(ch);
            if (peak > maxPeak) maxPeak = peak;
            for (let i = 0; i < ch.length; i++) sumSqTotal += ch[i] * ch[i];
            totalSamplesCount += ch.length;
        });
        
        const peakDb = maxPeak > 0 ? (20 * Math.log10(maxPeak)).toFixed(2) : '-∞';
        const rmsDb = Math.sqrt(sumSqTotal / totalSamplesCount) > 0 ? (20 * Math.log10(Math.sqrt(sumSqTotal / totalSamplesCount))).toFixed(2) : '-∞';
        
        let dominantFreq = 'N/A';
        let maxMag = 0, maxIdx = 0;
        for (let i = 1; i < spectrum.length; i++) {
            if (spectrum[i] > maxMag) {
                maxMag = spectrum[i];
                maxIdx = i;
            }
        }
        if (maxMag > 0) dominantFreq = `${(maxIdx * state.sampleRate / state.fftSize).toFixed(1)} Hz`;

        dom.analysisSummaryList.innerHTML = `
            <dt>Peak Level (Window)</dt><dd>${peakDb} dBFS</dd>
            <dt>RMS Level (Window)</dt><dd>${rmsDb} dBFS</dd>
            <dt>Dominant Freq (Window)</dt><dd>${dominantFreq}</dd>
        `;
        
        renderWaveform();
        showToast('Window analysis applied.', 'success');
    });

    dom.btnClearWindow.addEventListener('click', () => {
        state.analysis.windowed.active = false;
        updateUI();
        showToast('Window cleared.', 'info');
    });
}

function initUpload() {
    dom.dropZone.addEventListener('click', () => dom.fileInput.click());
    dom.dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dom.fileInput.click();
        }
    });

    dom.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });

    dom.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dom.dropZone.classList.add('dragover');
    });

    dom.dropZone.addEventListener('dragleave', () => {
        dom.dropZone.classList.remove('dragover');
    });

    dom.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dom.dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });
}

function initReset() {
    dom.btnResetAll.addEventListener('click', () => {
        resetAnalysis();
        if (state.objectUrl) {
            URL.revokeObjectURL(state.objectUrl);
            state.objectUrl = null;
        }
        dom.fileInput.value = '';
        dom.fileInfo.classList.add('hidden');
        setStatus('Ready', 'ready');
        showToast('Audio cleared.', 'info');
    });
}

function initResizeObserver() {
    const observer = new ResizeObserver(() => {
        if (state.samples.length > 0) {
            renderWaveform();
            renderSpectrum();
            renderSpectrogram();
        }
    });
    
    observer.observe(dom.waveformCanvas.parentElement);
    observer.observe(dom.spectrumCanvas.parentElement);
    observer.observe(dom.spectrogramCanvas.parentElement);
}

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    if (!window.AudioContext && !window.webkitAudioContext) {
        showToast('Web Audio API is not supported in this browser.', 'error');
        setStatus('Error', 'error');
        setLoadingState('ERROR', 'Web Audio API is not supported in this browser.');
        return;
    }

    startWaveformAnimation();
    setLoadingState('INITIALIZING');

    initPlayer();
    initUpload();
    initWaveformInteractions();
    initSpectrumInteractions();
    initSpectrogramInteractions();
    initWindowControls();
    initReset();
    initResizeObserver();
    
    setStatus('Ready', 'ready');
    
    setTimeout(() => {
        setLoadingState('READY');
        setTimeout(() => {
            hideLoadingScreen();
        }, 800);
    }, 1500);
}

document.addEventListener('DOMContentLoaded', init);