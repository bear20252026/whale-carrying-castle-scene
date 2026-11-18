import { useCallback, useEffect, useRef, useState } from 'react';

export function useAmbientAudio() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const context = useRef<AudioContext | null>(null);
  const master = useRef<GainNode | null>(null);

  const create = useCallback(() => {
    const audio = new AudioContext();
    const output = audio.createGain();
    output.gain.value = 0;
    output.connect(audio.destination);
    context.current = audio;
    master.current = output;

    // A quiet, original ambient bed: filtered air and slowly breathing harmonics.
    const length = audio.sampleRate * 5;
    const buffer = audio.createBuffer(2, length, audio.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let last = 0;
      for (let i = 0; i < length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.022) / 1.024;
        data[i] = last * 2.5;
      }
    }
    const wind = audio.createBufferSource();
    wind.buffer = buffer;
    wind.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 560;
    const windGain = audio.createGain();
    windGain.gain.value = 0.24;
    wind.connect(filter).connect(windGain).connect(output);
    wind.start();

    const notes = [146.83, 220, 293.66, 369.99, 440, 587.33];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 ? -3 : 3;
      const envelope = audio.createGain();
      envelope.gain.value = index < 3 ? 0.035 : 0.014;
      const pan = audio.createStereoPanner();
      pan.pan.value = (index / notes.length - 0.5) * 1.2;
      oscillator.connect(envelope).connect(pan).connect(output);
      const breath = audio.createOscillator();
      breath.frequency.value = 0.025 + index * 0.008;
      const depth = audio.createGain();
      depth.gain.value = index < 3 ? 0.014 : 0.008;
      breath.connect(depth).connect(envelope.gain);
      oscillator.start();
      breath.start();
    });
    return audio;
  }, []);

  const toggle = useCallback(async () => {
    try {
      const audio = context.current ?? create();
      if (audio.state === 'suspended') await audio.resume();
      setEnabled((previous) => !previous);
    } catch {
      setEnabled(false);
    }
  }, [create]);

  useEffect(() => {
    if (!context.current || !master.current) return;
    master.current.gain.setTargetAtTime(enabled ? volume * 0.55 : 0, context.current.currentTime, 0.5);
  }, [enabled, volume]);

  useEffect(() => {
    const visibility = () => {
      if (!context.current) return;
      if (document.hidden) void context.current.suspend();
      else if (enabled) void context.current.resume();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [enabled]);

  useEffect(() => () => {
    void context.current?.close();
    context.current = null;
  }, []);

  return { enabled, toggle, volume, setVolume };
}