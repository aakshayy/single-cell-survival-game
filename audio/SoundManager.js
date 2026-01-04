/**
 * Manages game sound effects using Web Audio API
 */

export class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.enabled = true;
        this.masterVolume = 0.3;
        this.musicVolume = 0.15;

        // Background music state
        this.backgroundMusicOscillators = [];
        this.backgroundMusicGain = null;
        this.isMusicPlaying = false;
    }

    initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateSounds();
        } catch (e) {
            console.warn('Web Audio API not supported', e);
            this.enabled = false;
        }
    }

    generateSounds() {
        // Tile warning sound - rising beep
        this.sounds.set('tileWarning', () => this.createBeep(800, 0.1, 0.05));

        // Tile shatter - crash/break sound
        this.sounds.set('tileShatter', () => this.createShatter());

        // Player eliminated - descending tone
        this.sounds.set('playerEliminated', () => this.createDescendingTone());

        // Game over - victory fanfare
        this.sounds.set('gameOver', () => this.createVictoryFanfare());

        // Tile spawn - soft pop
        this.sounds.set('tileSpawn', () => this.createPop(400, 0.05));

        // Player spawn - rising whoosh
        this.sounds.set('playerSpawn', () => this.createWhoosh());
    }

    createBeep(frequency, duration, volume = 0.1) {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createShatter() {
        if (!this.audioContext || !this.enabled) return;

        // White noise burst for shatter effect
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }

        const source = this.audioContext.createBufferSource();
        const filter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 300;

        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(0.15 * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

        source.start(this.audioContext.currentTime);
    }

    createDescendingTone() {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.12 * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.5);
    }

    createVictoryFanfare() {
        if (!this.audioContext || !this.enabled) return;

        // Extended celebration melody: C-E-G-C(high)-G-E-C-C(high)-E(high)-G(high)-C(high x2)
        const melody = [
            { freq: 523.25, duration: 0.2, delay: 0 },      // C
            { freq: 659.25, duration: 0.2, delay: 0.15 },   // E
            { freq: 783.99, duration: 0.2, delay: 0.3 },    // G
            { freq: 1046.50, duration: 0.3, delay: 0.45 },  // C (high)
            { freq: 783.99, duration: 0.15, delay: 0.8 },   // G
            { freq: 659.25, duration: 0.15, delay: 0.95 },  // E
            { freq: 523.25, duration: 0.2, delay: 1.1 },    // C
            { freq: 1046.50, duration: 0.2, delay: 1.3 },   // C (high)
            { freq: 1318.51, duration: 0.2, delay: 1.5 },   // E (high)
            { freq: 1567.98, duration: 0.25, delay: 1.7 },  // G (high)
            { freq: 2093.00, duration: 0.6, delay: 1.95 }   // C (high x2) - final
        ];

        const startTime = this.audioContext.currentTime;

        melody.forEach((note) => {
            // Main note
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = note.freq;
            oscillator.type = 'triangle';

            const noteStart = startTime + note.delay;

            gainNode.gain.setValueAtTime(0.12 * this.masterVolume, noteStart);
            gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + note.duration);

            oscillator.start(noteStart);
            oscillator.stop(noteStart + note.duration);

            // Add harmony (fifth above) for richer sound on key notes
            if (note.delay >= 0.45) {
                const harmonyOsc = this.audioContext.createOscillator();
                const harmonyGain = this.audioContext.createGain();

                harmonyOsc.connect(harmonyGain);
                harmonyGain.connect(this.audioContext.destination);

                harmonyOsc.frequency.value = note.freq * 1.5; // Perfect fifth
                harmonyOsc.type = 'sine';

                harmonyGain.gain.setValueAtTime(0.06 * this.masterVolume, noteStart);
                harmonyGain.gain.exponentialRampToValueAtTime(0.001, noteStart + note.duration);

                harmonyOsc.start(noteStart);
                harmonyOsc.stop(noteStart + note.duration);
            }
        });

        // Add celebratory drum hits
        const drumHits = [0.45, 0.8, 1.3, 1.95]; // Timing for emphasis
        drumHits.forEach(hitTime => {
            const drumOsc = this.audioContext.createOscillator();
            const drumGain = this.audioContext.createGain();
            const drumFilter = this.audioContext.createBiquadFilter();

            drumOsc.connect(drumFilter);
            drumFilter.connect(drumGain);
            drumGain.connect(this.audioContext.destination);

            drumOsc.frequency.setValueAtTime(150, startTime + hitTime);
            drumOsc.frequency.exponentialRampToValueAtTime(50, startTime + hitTime + 0.1);
            drumOsc.type = 'triangle';

            drumFilter.type = 'lowpass';
            drumFilter.frequency.value = 200;

            drumGain.gain.setValueAtTime(0.15 * this.masterVolume, startTime + hitTime);
            drumGain.gain.exponentialRampToValueAtTime(0.001, startTime + hitTime + 0.15);

            drumOsc.start(startTime + hitTime);
            drumOsc.stop(startTime + hitTime + 0.15);
        });
    }

    createPop(frequency, duration) {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.06 * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    createWhoosh() {
        if (!this.audioContext || !this.enabled) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.08 * this.masterVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    play(soundName) {
        if (!this.enabled || !this.sounds.has(soundName)) return;

        const soundGenerator = this.sounds.get(soundName);
        soundGenerator();
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopBackgroundMusic();
        }
        return this.enabled;
    }

    startBackgroundMusic() {
        if (!this.audioContext || !this.enabled || this.isMusicPlaying) return;

        this.isMusicPlaying = true;

        // Create gain node for background music
        this.backgroundMusicGain = this.audioContext.createGain();
        this.backgroundMusicGain.gain.setValueAtTime(this.musicVolume * this.masterVolume, this.audioContext.currentTime);
        this.backgroundMusicGain.connect(this.audioContext.destination);

        // Simple ambient chord progression: Am - F - C - G (looping)
        // Using frequencies for a calm, ambient feel
        const progression = [
            [220.00, 261.63, 329.63],  // Am (A, C, E)
            [174.61, 220.00, 261.63],  // F (F, A, C)
            [130.81, 164.81, 196.00],  // C (C, E, G)
            [196.00, 246.94, 293.66]   // G (G, B, D)
        ];

        const chordDuration = 4; // seconds per chord
        let chordIndex = 0;

        const playChord = () => {
            if (!this.isMusicPlaying) return;

            const chord = progression[chordIndex % progression.length];
            const startTime = this.audioContext.currentTime;

            // Play each note in the chord
            chord.forEach((freq, i) => {
                const oscillator = this.audioContext.createOscillator();
                const oscillatorGain = this.audioContext.createGain();

                oscillator.connect(oscillatorGain);
                oscillatorGain.connect(this.backgroundMusicGain);

                oscillator.frequency.value = freq;
                oscillator.type = 'sine';

                // Soft attack and release
                oscillatorGain.gain.setValueAtTime(0, startTime);
                oscillatorGain.gain.linearRampToValueAtTime(0.15, startTime + 0.5);
                oscillatorGain.gain.setValueAtTime(0.15, startTime + chordDuration - 0.5);
                oscillatorGain.gain.linearRampToValueAtTime(0, startTime + chordDuration);

                oscillator.start(startTime);
                oscillator.stop(startTime + chordDuration);

                this.backgroundMusicOscillators.push(oscillator);
            });

            chordIndex++;

            // Schedule next chord
            if (this.isMusicPlaying) {
                setTimeout(() => playChord(), chordDuration * 1000);
            }
        };

        playChord();
    }

    stopBackgroundMusic() {
        if (!this.isMusicPlaying) return;

        this.isMusicPlaying = false;

        // Fade out
        if (this.backgroundMusicGain && this.audioContext) {
            this.backgroundMusicGain.gain.exponentialRampToValueAtTime(
                0.001,
                this.audioContext.currentTime + 1
            );
        }

        // Clean up oscillators
        this.backgroundMusicOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // Oscillator might already be stopped
            }
        });
        this.backgroundMusicOscillators = [];
    }
}
