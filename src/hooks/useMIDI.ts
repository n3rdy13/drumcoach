import { useState, useEffect, useRef, useCallback } from 'react';

export interface MidiLog {
  id: string;
  time: string;
  deviceName: string;
  note: number;
  velocity: number;
  matchedInstrument: 'kick' | 'snare' | 'hihat' | 'unmapped';
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
  connection: string;
}

export type MidiLearningInstrument = 'kick' | 'snare' | 'hihat' | null;

export interface RawMidiHit {
  note: number;
  velocity: number;
  performanceNowMs: number;
}

interface UseMIDIOptions {
  triggerKick: () => void;
  triggerSnare: () => void;
  triggerHiHat: () => void;
  onVisualTrigger?: (instrument: 'kick' | 'snare' | 'hihat', velocity: number) => void;
  onRawHit?: (hit: RawMidiHit) => void;
  velocityThreshold?: number;
}

export function useMIDI({ triggerKick, triggerSnare, triggerHiHat, onVisualTrigger, onRawHit, velocityThreshold }: UseMIDIOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'requesting'>('prompt');
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [midiLogs, setMidiLogs] = useState<MidiLog[]>([]);
  const [learningInstrument, setLearningInstrument] = useState<MidiLearningInstrument>(null);

  const [mappings, setMappings] = useState({
    kick: 36,
    snare: 38,
    hihat: 42,
  });

  const mappingsRef = useRef(mappings);
  const learningRef = useRef(learningInstrument);
  const velocityThresholdRef = useRef(velocityThreshold);

  const triggerKickRef = useRef(triggerKick);
  const triggerSnareRef = useRef(triggerSnare);
  const triggerHiHatRef = useRef(triggerHiHat);
  const onVisualTriggerRef = useRef(onVisualTrigger);
  const onRawHitRef = useRef(onRawHit);

  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { learningRef.current = learningInstrument; }, [learningInstrument]);
  useEffect(() => { velocityThresholdRef.current = velocityThreshold; }, [velocityThreshold]);

  useEffect(() => {
    triggerKickRef.current = triggerKick;
    triggerSnareRef.current = triggerSnare;
    triggerHiHatRef.current = triggerHiHat;
    onVisualTriggerRef.current = onVisualTrigger;
    onRawHitRef.current = onRawHit;
  }, [triggerKick, triggerSnare, triggerHiHat, onVisualTrigger, onRawHit]);

  const handleMidiMessage = useCallback((deviceName: string, ev: any) => {
    if (!ev || !ev.data || ev.data.length < 2) return;
    const [status, note, velocity = 0] = ev.data;

    const command = status & 0xF0;

    if (command === 0x90 && velocity > 0) {
      const hitTimestamp = performance.now();

      // Notify calibration wizards with the raw hit before any instrument classification
      if (onRawHitRef.current) {
        onRawHitRef.current({ note, velocity, performanceNowMs: hitTimestamp });
      }

      let matched: 'kick' | 'snare' | 'hihat' | 'unmapped' = 'unmapped';

      const currentLearning = learningRef.current;
      const currentMappings = mappingsRef.current;
      const threshold = velocityThresholdRef.current;

      if (currentLearning) {
        setMappings(prev => ({ ...prev, [currentLearning]: note }));
        setLearningInstrument(null);
        matched = currentLearning;
      } else {
        if (note === currentMappings.kick) {
          matched = 'kick';
        } else if (note === currentMappings.snare) {
          // When snare/hihat share the same note number, use velocity to disambiguate
          if (threshold !== undefined && velocity < threshold) {
            matched = 'hihat';
          } else {
            matched = 'snare';
          }
        } else if (note === currentMappings.hihat) {
          if (threshold !== undefined && velocity >= threshold) {
            matched = 'snare';
          } else {
            matched = 'hihat';
          }
        }
      }

      if (matched === 'kick') {
        triggerKickRef.current();
        if (onVisualTriggerRef.current) onVisualTriggerRef.current('kick', velocity);
      } else if (matched === 'snare') {
        triggerSnareRef.current();
        if (onVisualTriggerRef.current) onVisualTriggerRef.current('snare', velocity);
      } else if (matched === 'hihat') {
        triggerHiHatRef.current();
        if (onVisualTriggerRef.current) onVisualTriggerRef.current('hihat', velocity);
      }

      const timestamp = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }) + '.' + String(new Date().getMilliseconds()).padStart(3, '0');

      const newLog: MidiLog = {
        id: Math.random().toString(36).substring(2, 9),
        time: timestamp,
        deviceName: deviceName || 'Generic MIDI Device',
        note,
        velocity,
        matchedInstrument: matched,
      };

      setMidiLogs(prev => [newLog, ...prev.slice(0, 11)]);
    }
  }, []);

  const requestMidiAccess = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator || !('requestMIDIAccess' in navigator)) {
      setIsSupported(false);
      setPermissionState('denied');
      return;
    }

    setIsSupported(true);
    setPermissionState('requesting');

    try {
      const midiAccess = await navigator.requestMIDIAccess();
      setPermissionState('granted');

      const updateDevicesAndSetupListeners = () => {
        const inputs = Array.from(midiAccess.inputs.values());

        const mappedDevices: MidiDevice[] = inputs.map((input: any) => ({
          id: input.id,
          name: input.name || 'MIDI Controller',
          manufacturer: input.manufacturer || 'Generic',
          state: input.state || 'connected',
          connection: input.connection || 'open',
        }));

        setDevices(mappedDevices);

        inputs.forEach((input: any) => {
          input.onmidimessage = (ev: any) => handleMidiMessage(input.name, ev);
        });
      };

      updateDevicesAndSetupListeners();
      midiAccess.onstatechange = () => { updateDevicesAndSetupListeners(); };
    } catch (err) {
      console.error('MIDI Access Request Failed:', err);
      setPermissionState('denied');
    }
  }, [handleMidiMessage]);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator && ('requestMIDIAccess' in navigator)) {
      setIsSupported(true);
      navigator.requestMIDIAccess()
        .then(access => {
          setPermissionState('granted');
          const inputs = Array.from(access.inputs.values());
          const mappedDevices: MidiDevice[] = inputs.map((input: any) => ({
            id: input.id,
            name: input.name || 'MIDI Controller',
            manufacturer: input.manufacturer || 'Generic',
            state: input.state || 'connected',
            connection: input.connection || 'open',
          }));
          setDevices(mappedDevices);

          inputs.forEach((input: any) => {
            input.onmidimessage = (ev: any) => handleMidiMessage(input.name, ev);
          });

          access.onstatechange = () => {
            const freshInputs = Array.from(access.inputs.values());
            setDevices(freshInputs.map((input: any) => ({
              id: input.id,
              name: input.name || 'MIDI Controller',
              manufacturer: input.manufacturer || 'Generic',
              state: input.state || 'connected',
              connection: input.connection || 'open',
            })));
            freshInputs.forEach((input: any) => {
              input.onmidimessage = (ev: any) => handleMidiMessage(input.name, ev);
            });
          };
        })
        .catch(() => { setPermissionState('prompt'); });
    } else {
      setIsSupported(false);
    }
  }, [handleMidiMessage]);

  const clearLogs = useCallback(() => { setMidiLogs([]); }, []);

  const resetMappingsToDefault = useCallback(() => {
    setMappings({ kick: 36, snare: 38, hihat: 42 });
  }, []);

  return {
    isSupported,
    permissionState,
    devices,
    midiLogs,
    mappings,
    learningInstrument,
    setLearningInstrument,
    requestMidiAccess,
    clearLogs,
    resetMappingsToDefault,
    setMappings
  };
}
