/**
 * Plays a pleasant, subtle synthesized audio chime upon successful QR scan
 * and triggers haptic vibration on mobile devices.
 */
export function playScanSuccessSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Pleasant two-tone chime
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);

    // Haptic feedback for mobile devices
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([40, 30, 60]);
    }
  } catch {
    // Silently ignore if audio context is blocked
  }
}
