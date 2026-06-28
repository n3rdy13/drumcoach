import { useState } from 'react';
import { Keyboard, Cpu, Activity, Wifi, WifiOff, Trash2, RotateCcw, FileSliders as Sliders, Clock, ChevronDown } from 'lucide-react';
import { MidiDevice, MidiLog, MidiLearningInstrument } from '../hooks/useMIDI';
import { MIDI_PROFILES } from '../data/midiProfiles';

interface MidiSettingsProps {
  isSupported: boolean;
  permissionState: 'prompt' | 'granted' | 'denied' | 'requesting';
  devices: MidiDevice[];
  midiLogs: MidiLog[];
  mappings: { kick: number; snare: number; hihat: number };
  learningInstrument: MidiLearningInstrument;
  setLearningInstrument: (inst: MidiLearningInstrument) => void;
  requestMidiAccess: () => void;
  clearLogs: () => void;
  resetMappingsToDefault: () => void;
  setMappings: (m: { kick: number; snare: number; hihat: number }) => void;
  latencyOffsetMs: number;
  velocityThreshold?: number;
  onOpenLatencyWizard: () => void;
  onOpenThresholdWizard: () => void;
}

export function MidiSettings({
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
  setMappings,
  latencyOffsetMs,
  velocityThreshold,
  onOpenLatencyWizard,
  onOpenThresholdWizard,
}: MidiSettingsProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const applyProfile = (profileId: string) => {
    const profile = MIDI_PROFILES.find(p => p.id === profileId);
    if (profile) {
      setMappings(profile.mappings);
    }
    setProfileOpen(false);
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 backdrop-blur-md space-y-6 w-full max-w-xl mx-auto shadow-2xl">

      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Section 04</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 mt-0.5">
            <Keyboard className="h-4.5 w-4.5 text-indigo-400" /> MIDI Hardware Support
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {permissionState === 'granted' ? (
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-900/35">
              <Wifi className="h-3 w-3 animate-pulse" /> connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] uppercase font-bold tracking-widest text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/35">
              <WifiOff className="h-3 w-3" /> offline
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed">
        Connect your digital drums, MIDI pad controllers, or e-drum kits via USB. Striking your drumming pads will instantly trigger corresponding sounds in real-time.
      </p>

      {/* Calibration Shortcuts */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenLatencyWizard}
          className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-[#141417]/60 border border-slate-900 hover:border-emerald-900/50 hover:bg-emerald-950/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full">
            <Clock className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-[9px] font-bold text-emerald-400/70 group-hover:text-emerald-400 transition-colors">
              {latencyOffsetMs !== 0 ? `${latencyOffsetMs > 0 ? '+' : ''}${latencyOffsetMs}ms` : 'Not set'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 group-hover:text-slate-100 transition-colors">Latency Calibration</span>
          <span className="text-[9px] text-slate-600">Measure hardware-to-audio delay</span>
        </button>

        <button
          onClick={onOpenThresholdWizard}
          className="flex flex-col items-start gap-1 p-3 rounded-2xl bg-[#141417]/60 border border-slate-900 hover:border-sky-900/50 hover:bg-sky-950/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between w-full">
            <Sliders className="h-3.5 w-3.5 text-sky-400" />
            <span className="font-mono text-[9px] font-bold text-sky-400/70 group-hover:text-sky-400 transition-colors">
              {velocityThreshold !== undefined ? `v${velocityThreshold}` : 'Not set'}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 group-hover:text-slate-100 transition-colors">Velocity Threshold</span>
          <span className="text-[9px] text-slate-600">Hi-Hat vs. Snare separation</span>
        </button>
      </div>

      {/* 1. Controller permissions & Device status */}
      <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" /> Active MIDI Inputs ({devices.length})
          </span>
          {permissionState !== 'granted' && (
            <button
              onClick={requestMidiAccess}
              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-550 active:scale-98 transition-all text-white font-sans text-[10px] font-bold rounded-lg cursor-pointer"
            >
              {permissionState === 'requesting' ? 'Requesting...' : 'Scan MIDI Devices'}
            </button>
          )}
        </div>

        {permissionState === 'granted' ? (
          devices.length > 0 ? (
            <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between text-[11px] bg-[#141417]/80 px-3 py-2 rounded-xl border border-slate-900/80"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-450 shadow-[0_0_8px_#10b981]" />
                    <span className="text-slate-200 font-medium truncate max-w-[170px]">{device.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-550 font-mono font-bold leading-none bg-slate-900/60 px-2 py-1 rounded">
                    {device.manufacturer || 'Generic'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-550 italic text-center py-2">
              No MIDI inputs found. Connect a device or keyboard and check connection.
            </p>
          )
        ) : (
          <div className="text-center py-2 space-y-2">
            <p className="text-[11px] text-slate-550 leading-relaxed italic">
              Web MIDI permission is required to listen for drum hits.
            </p>
            {permissionState === 'denied' && (
              <p className="text-[10px] text-rose-450 font-semibold leading-normal">
                MIDI access was restricted by browser settings. Please verify preferences.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Kit Profile Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
            Kit Profile
          </span>
          <span className="text-[9px] text-slate-600 font-mono">Auto-loads note mappings</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setProfileOpen(p => !p)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#141417]/60 border border-slate-900 rounded-xl text-[11px] text-slate-300 hover:border-slate-800 transition-colors cursor-pointer"
          >
            <span>Select a preset kit profile...</span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
          {profileOpen && (
            <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-[#0F0F11] border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
              {MIDI_PROFILES.map(profile => (
                <button
                  key={profile.id}
                  onClick={() => applyProfile(profile.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-900/60 transition-colors cursor-pointer border-b border-slate-900 last:border-0"
                >
                  <span className="text-[11px] font-bold text-slate-200 block">{profile.name}</span>
                  <span className="text-[9px] text-slate-600">{profile.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Note Mappings UI with Learn triggers */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="font-sans text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
            Pad Note Assignments
          </span>
          <button
            onClick={resetMappingsToDefault}
            className="text-[9px] text-slate-500 hover:text-slate-350 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" /> Reset default maps (36 / 38 / 42)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Kick */}
          <div className={`p-3 rounded-2xl border transition-all ${
            learningInstrument === 'kick'
              ? 'bg-purple-950/20 border-purple-400 ring-1 ring-purple-400'
              : 'bg-[#141417]/40 border-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200">Bass Kick</span>
              <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded text-purple-400 font-semibold">
                N {mappings.kick}
              </span>
            </div>
            <button
              onClick={() => setLearningInstrument(learningInstrument === 'kick' ? null : 'kick')}
              className={`w-full py-1.5 mt-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                learningInstrument === 'kick'
                  ? 'bg-purple-500 hover:bg-purple-450 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-300'
              }`}
            >
              {learningInstrument === 'kick' ? 'Waiting hit...' : 'MIDI Learn'}
            </button>
          </div>

          {/* Snare */}
          <div className={`p-3 rounded-2xl border transition-all ${
            learningInstrument === 'snare'
              ? 'bg-amber-950/20 border-amber-400 ring-1 ring-amber-400'
              : 'bg-[#141417]/40 border-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200">Snare Drum</span>
              <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded text-amber-450 font-semibold">
                N {mappings.snare}
              </span>
            </div>
            <button
              onClick={() => setLearningInstrument(learningInstrument === 'snare' ? null : 'snare')}
              className={`w-full py-1.5 mt-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                learningInstrument === 'snare'
                  ? 'bg-amber-500 hover:bg-amber-450 text-slate-950 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-300'
              }`}
            >
              {learningInstrument === 'snare' ? 'Waiting hit...' : 'MIDI Learn'}
            </button>
          </div>

          {/* Hi-Hat */}
          <div className={`p-3 rounded-2xl border transition-all ${
            learningInstrument === 'hihat'
              ? 'bg-sky-950/20 border-sky-400 ring-1 ring-sky-400'
              : 'bg-[#141417]/40 border-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-200">Hi-Hat Cymbal</span>
              <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded text-sky-400 font-semibold">
                N {mappings.hihat}
              </span>
            </div>
            <button
              onClick={() => setLearningInstrument(learningInstrument === 'hihat' ? null : 'hihat')}
              className={`w-full py-1.5 mt-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                learningInstrument === 'hihat'
                  ? 'bg-sky-500 hover:bg-sky-450 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-300'
              }`}
            >
              {learningInstrument === 'hihat' ? 'Waiting hit...' : 'MIDI Learn'}
            </button>
          </div>
        </div>

        {learningInstrument && (
          <p className="text-[10px] text-indigo-400 animate-pulse text-center leading-normal italic font-medium">
            Strike a pad or key on your physical controller now to bind that MIDI note automatically.
          </p>
        )}
      </div>

      {/* 4. Real-time MIDI Activity Monitor Console */}
      <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl space-y-3 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-900 pb-2">
          <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-400 animate-pulse" /> Live MIDI Activity Telemetry
          </span>
          {midiLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="text-[9px] font-bold text-slate-500 hover:text-slate-350 cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" /> Clear log
            </button>
          )}
        </div>

        <div className="min-h-24 max-h-36 overflow-y-auto space-y-1 font-mono text-[10.5px]">
          {midiLogs.length > 0 ? (
            midiLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-slate-400 hover:text-slate-300 py-0.5 leading-relaxed"
              >
                <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                  <span className="text-slate-600 font-semibold">[{log.time}]</span>
                  <span className="text-indigo-400 font-semibold" title={log.deviceName}>
                    {log.deviceName.substring(0, 10)}...:
                  </span>
                  <span className="text-slate-300 font-bold">Note {log.note}</span>
                  <span className="text-slate-650">v{log.velocity}</span>
                </div>

                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                  log.matchedInstrument === 'kick'
                    ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                    : log.matchedInstrument === 'snare'
                    ? 'bg-amber-950/40 text-amber-500 border border-amber-900/30'
                    : log.matchedInstrument === 'hihat'
                    ? 'bg-sky-950/40 text-sky-400 border border-sky-900/30'
                    : 'bg-slate-900/50 text-slate-600'
                }`}>
                  {log.matchedInstrument === 'unmapped' ? 'unmapped' : log.matchedInstrument}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-slate-600 italic text-center py-6">
              Console idle. Play your physical drum kit, or click MIDI Learn above to configure.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
