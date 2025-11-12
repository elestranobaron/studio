
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

// A generic function to play a tone with more control.
const playTone = (
    freq: number, 
    duration: number, // in seconds
    type: OscillatorType = 'sine', 
    gain: number = 0.3
) => {
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
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
  
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.01); // Quick fade in
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration); // Fade out

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};


// --- Enhanced sounds based on user feedback ---

// A short, clear "tick" for the countdown.
export const playCountdownTick = () => {
  playTone(880, 0.15, 'triangle'); // Higher frequency, short duration for a sharp sound
};

// A powerful, rising tone for the final "GO".
export const playCountdownEnd = () => {
  const audioContext = getAudioContext();
  if (!audioContext) return;
  if (audioContext.state === 'suspended') audioContext.resume();

  const now = audioContext.currentTime;
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05); // Ramp up quickly
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.0); // Fade out over 1 second

  const oscillator = audioContext.createOscillator();
  oscillator.connect(gainNode);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, now); // Start at C5
  oscillator.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5); // Rise to C6

  oscillator.start(now);
  oscillator.stop(now + 1.0);
};

// A more rewarding, multi-part sound for finishing a WOD.
export const playFinishSound = () => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;

    // Part 1: Quick rising tone
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc1.start(now);
    osc1.stop(now + 0.2);

    // Part 2: Deep, resonant "gong" or "rumble"
    setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(110, now); // A low A2 note
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.6, now + 0.05); // Strong attack
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 2.5); // Long fade out (2.5s)
        
        osc2.start(now);
        osc2.stop(now + 2.5);
    }, 150); // Delay the gong slightly after the initial rise
};

// The original start sound, kept for non-countdown scenarios.
export const playStartSound = () => {
  playTone(660, 0.5, 'sine'); 
};

// NEW: A longer, single beep for the 10-second warning.
export const playTenSecondWarning = () => {
    playTone(900, 0.4, 'sine', 0.4); 
};

// NEW: A short, high-pitched beep for the final 3-2-1.
export const playThreeSecondWarning = () => {
    playTone(1200, 0.15, 'square', 0.25);
};
