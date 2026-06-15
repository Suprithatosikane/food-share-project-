import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * ThemeContext — Dark/Light theme toggle + sound effects system.
 * Theme: persisted in localStorage, applied via data-theme attribute.
 * Sounds: Web Audio API for notification ping and success chime.
 */

const ThemeContext = createContext(null);

// Web Audio API sound generators
const AudioCtx = (typeof window !== 'undefined') ? (window.AudioContext || window.webkitAudioContext) : null;

function playSoftAlert() {
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    // Soft "ping" / "ding" sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);     // A5
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08); // C#6
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.16); // E6

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    // Second harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1760, ctx.currentTime);
    gain2.gain.setValueAtTime(0.05, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.3);

    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.log('Sound not supported');
  }
}

function playSuccessSound() {
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    // Success chime — ascending 3-note arpeggio
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    const timing = [0, 0.12, 0.24];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + timing[i]);

      gain.gain.setValueAtTime(0, ctx.currentTime + timing[i]);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + timing[i] + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timing[i] + 0.5);

      osc.start(ctx.currentTime + timing[i]);
      osc.stop(ctx.currentTime + timing[i] + 0.5);
    });

    // Final shimmer
    const shimmer = ctx.createOscillator();
    const sGain = ctx.createGain();
    shimmer.connect(sGain);
    sGain.connect(ctx.destination);
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.36); // G6
    sGain.gain.setValueAtTime(0.08, ctx.currentTime + 0.36);
    sGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
    shimmer.start(ctx.currentTime + 0.36);
    shimmer.stop(ctx.currentTime + 1.0);

    setTimeout(() => ctx.close(), 1500);
  } catch (e) {
    console.log('Sound not supported');
  }
}

function playLaunchSound() {
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    // Quick, energetic "whoosh-ding"
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);

    // Complementary chime
    setTimeout(() => {
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.connect(cGain);
      cGain.connect(ctx.destination);
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1500, ctx.currentTime);
      cGain.gain.setValueAtTime(0.1, ctx.currentTime);
      cGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      chime.start(ctx.currentTime);
      chime.stop(ctx.currentTime + 0.3);
    }, 150);

    setTimeout(() => ctx.close(), 1000);
  } catch (e) {
    console.log('Sound error');
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('annaSetu_theme') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('annaSetu_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{
      theme, isDark, toggleTheme,
      playSoftAlert, playSuccessSound, playLaunchSound
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
