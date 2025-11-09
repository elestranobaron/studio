
'use client';

// This function safely gets the AudioContext, handling SSR and browser differences.
const getAudioContext = (): AudioContext | null => {
  if (typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      // Create a single, reusable AudioContext instance.
      if (!(window as any).__audioContext) {
        (window as any).__audioContext = new AudioContext();
      }
      return (window as any).__audioContext;
    }
  }
  return null;
};

// A generic function to play a tone.
const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  
  // Resume context if it's suspended (e.g., due to browser autoplay policies)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = type;
  oscillator.frequency.value = freq;
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick fade in
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration); // Fade out

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// --- Specific sounds for the timer ---

export const playStartSound = () => {
  playTone(440, 0.2, 'sine'); // A standard 'A' note, short and clear
};

export const playFinishSound = () => {
  playTone(880, 0.5, 'sine'); // A higher 'A' note, longer to signify completion
};

export const playCountdownTick = () => {
  playTone(660, 0.15, 'triangle'); // A short, distinct tick
};

export const playCountdownEnd = () => {
    playTone(990, 0.4, 'sine'); // A high, clear beep for the final "go"
};
