# 🎧 SonicScope — Audio Analysis Laboratory

**A Browser-Based Digital Signal Processing & Audio Visualization Platform**

SonicScope is a browser-based audio analysis laboratory designed to transform raw audio signals into meaningful visual and mathematical insights.

Built for engineers, developers, audio enthusiasts, and anyone interested in digital signal processing, SonicScope provides an interactive environment for examining the fundamental properties of sound through waveform analysis, frequency-domain decomposition, spectrogram visualization, and real-time audio playback.

Going beyond conventional audio players, SonicScope functions as a digital analytical instrument, allowing users to investigate how sound behaves across both the time and frequency domains.

All audio processing is performed locally within the browser, ensuring that audio files remain on the user's device.

---

## ✨ Core Capabilities

### 🎛️ 1. Audio Management & Playback

A complete audio input and playback system designed for convenient signal inspection.

- **Audio Import:** Upload audio through drag-and-drop or the native file picker.
- **File Validation:** File size restrictions (25 MB maximum), format validation, and error handling.
- **Custom Audio Player:** Integrated playback controls, including Play, Pause, Reset, Seek, Volume, and Mute.
- **Audio Metadata Extraction:** Displays file size, playback duration, decoded sample rate, channel count, and total sample count.

### 📊 2. Digital Signal Processing (DSP)

A collection of signal-processing techniques for analyzing audio characteristics mathematically.

- **Time-Domain Analysis:** Calculates Peak Level and RMS Level, expressed in dBFS.
- **Fast Fourier Transform (FFT):** Implements the Radix-2 Cooley–Tukey algorithm with Hann windowing to analyze the frequency composition of audio signals.
- **Short-Time Fourier Transform (STFT):** Generates time-frequency representations for detailed spectrogram analysis.
- **Clipping Detection:** Identifies near-full-scale audio samples (≥ 0.999) and calculates clipping percentages for individual channels.

### 📈 3. Interactive Signal Visualization

Transforms complex signal data into interactive visual representations.

- **Waveform Analyzer:** Uses min-max peak envelope downsampling for efficient rendering, with interactive tooltips, click-to-seek functionality, and a real-time playback indicator.
- **Frequency Spectrum Analyzer:** Supports logarithmic and linear frequency scales, with interactive frequency and dB-level inspection.
- **Spectrogram Visualization:** Displays time-frequency intensity using a Black–Blue–Cyan–White color mapping, accompanied by interactive time and frequency crosshairs.
- **Frequency Band Analysis:** Examines energy distribution across five frequency regions:
  - Sub-bass
  - Bass
  - Midrange
  - Upper-midrange
  - Treble

### 🛠️ 4. Advanced Analysis Tools

Additional capabilities for investigating specific portions of an audio signal.

- **Windowed Analysis:** Select custom start and end timestamps to recalculate local Peak, RMS, and FFT measurements.
- **Responsive Interface:** Designed for desktop and mobile environments.
- **Laboratory-Inspired UI:** Features a dark analytical interface, smooth transitions, and Canvas-based visual animations.

---

## 🔬 Technical Architecture

SonicScope is built using native browser technologies without external frameworks or runtime dependencies.

| Technology | Purpose |
|---|---|
| HTML5 | Semantic structure and accessibility |
| CSS3 | Interface styling, responsive layouts, variables, and transitions |
| Vanilla JavaScript | Application logic and DSP implementation |
| Web Audio API | Audio decoding and PCM sample extraction |
| Canvas API | Waveform, frequency spectrum, and spectrogram rendering |

### Processing Pipeline

The application follows a local audio-processing workflow:

1. **Audio Input** — The user imports an audio file.
2. **Validation** — The application checks file size and supported audio formats.
3. **Decoding** — Web Audio API converts the audio into accessible PCM sample data.
4. **Signal Processing** — DSP algorithms calculate amplitude, RMS, FFT, STFT, and clipping measurements.
5. **Data Visualization** — Processed signal data is rendered through interactive Canvas visualizations.
6. **Analysis** — Users inspect signal characteristics and investigate specific time intervals.

---

## 🔒 Privacy & Local Processing

**Your audio stays on your device.**

SonicScope performs audio decoding, signal processing, and visualization entirely within the browser.

- No audio uploads to external servers.
- No cloud-based audio processing.
- No external backend required.
- No third-party JavaScript frameworks or runtime dependencies.

Audio processing relies on the browser's native Web Audio API, keeping the analysis workflow local to the user's environment.

---

## 🚀 Getting Started

SonicScope is a client-side application. You can run it locally using a lightweight development server.

### Prerequisites

- A modern web browser with Web Audio API and Canvas API support.
- Visual Studio Code (recommended).
- VS Code Live Server extension or Python 3.

### Option 1 — VS Code Live Server (Recommended)

1. Clone or download this repository.
2. Open the project directory in Visual Studio Code.
3. Install the **Live Server** extension by Ritwick Dey.
4. Locate `index.html` in the project explorer.
5. Right-click the file and select **Open with Live Server**.
6. SonicScope will launch in your default browser.

### Option 2 — Python HTTP Server

If Python 3 is installed, open a terminal inside the project directory and execute:

```bash
python -m http.server 8000
```

Then open the following address in your browser:

```text
http://localhost:8000
```

---

## 🎯 Project Objective

SonicScope aims to make digital signal processing more accessible through an interactive and visual learning environment.

By combining mathematical signal analysis with intuitive visualization, the project bridges the gap between theoretical audio engineering concepts and practical experimentation.

It provides an environment where users can explore the relationship between amplitude, frequency, time, and the underlying structure of sound.

---

**SonicScope — See Beyond Sound.**
