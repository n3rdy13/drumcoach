import { useState, ChangeEvent } from 'react';
import { Midi } from '@tonejs/midi';
import { Upload, Check, Trash2, Drum, FileText, Info, Play, CircleAlert as AlertCircle } from 'lucide-react';

interface ChartNote {
  time: number;
  instrument: 'kick' | 'snare' | 'hihat';
  step: number;
  velocity: number;
}

interface ChartIngestionProps {
  onChartImported: (chartData: {
    name: string;
    beatsPerMeasure: number;
    steps: {
      kick: boolean[];
      snare: boolean[];
      hihat: boolean[];
    };
  }) => void;
}

// ---- .chart format parser (Moonscraper / Clone Hero / Guitar Hero) ----
function parseChartFile(text: string, fileName: string): { name: string; bpm: number; notes: ChartNote[] } {
  const lines = text.split('\n').map(l => l.trim());

  let title = fileName.replace(/\.chart$/i, '');
  let bpm = 120;
  let resolution = 192; // ticks per quarter note

  // Parse [Song] section for metadata
  let inSong = false;
  let inDrums = false;
  let drumsLines: string[] = [];

  for (const line of lines) {
    if (line === '[Song]') { inSong = true; inDrums = false; continue; }
    if (line === '[ExpertDrums]' || line === '[HardDrums]' || line === '[MediumDrums]') {
      inDrums = true; inSong = false; continue;
    }
    if (line === '{') continue;
    if (line === '}') { inSong = false; inDrums = false; continue; }

    if (inSong) {
      const nameMatch = line.match(/^Name\s*=\s*"(.+)"/i);
      if (nameMatch) title = nameMatch[1];

      const resMatch = line.match(/^Resolution\s*=\s*(\d+)/i);
      if (resMatch) resolution = parseInt(resMatch[1], 10);
    }

    if (inDrums) {
      drumsLines.push(line);
    }
  }

  // Parse [SyncTrack] for first BPM event
  let inSync = false;
  for (const line of lines) {
    if (line === '[SyncTrack]') { inSync = true; continue; }
    if (inSync && line === '}') { inSync = false; continue; }
    if (inSync) {
      // Format: <tick> = B <bpm_millihertz>
      const bMatch = line.match(/^\d+\s*=\s*B\s+(\d+)/);
      if (bMatch) {
        bpm = Math.round(parseInt(bMatch[1], 10) / 1000);
        break;
      }
    }
  }

  // Parse drum note entries from collected drum section lines
  // Note index to drum instrument mapping (GH/Rock Band convention):
  // 0 = kick, 1 = red (snare), 2 = yellow (hihat), 3 = blue, 4 = green
  const notes: ChartNote[] = [];
  const secondsPerTick = 60 / (bpm * resolution);
  const stepDurationSecs = (60 / bpm) / 4;

  for (const line of drumsLines) {
    // Format: <tick> = N <noteIndex> <sustain>
    const noteMatch = line.match(/^(\d+)\s*=\s*N\s+(\d+)\s+\d+/);
    if (!noteMatch) continue;

    const tick = parseInt(noteMatch[1], 10);
    const noteIndex = parseInt(noteMatch[2], 10);

    let instrument: 'kick' | 'snare' | 'hihat' | null = null;
    if (noteIndex === 0) instrument = 'kick';
    else if (noteIndex === 1) instrument = 'snare';
    else if (noteIndex === 2 || noteIndex === 3) instrument = 'hihat';

    if (!instrument) continue;

    const timeSecs = tick * secondsPerTick;
    const measureDuration = (60 / bpm) * 4;
    const timeInMeasure = timeSecs % measureDuration;
    const step = Math.floor(timeInMeasure / stepDurationSecs) % 16;

    notes.push({ time: timeSecs, instrument, step, velocity: 0.8 });
  }

  return { name: title, bpm, notes };
}

export function ChartIngestion({ onChartImported }: ChartIngestionProps) {
  const [midiFile, setMidiFile] = useState<File | null>(null);
  const [parsedName, setParsedName] = useState<string>('');
  const [parsedTrackCount, setParsedTrackCount] = useState<number>(0);
  const [tempo, setTempo] = useState<number>(120);
  const [duration, setDuration] = useState<number>(0);
  const [notesParsed, setNotesParsed] = useState<ChartNote[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [detectedFormat, setDetectedFormat] = useState<'MIDI' | 'CHART' | null>(null);

  // Extract drum triggers from ArrayBuffer
  const parseMidiBuffer = async (arrayBuffer: ArrayBuffer, fileName: string) => {
    try {
      setErrorMsg('');
      const midi = new Midi(arrayBuffer);
      
      setParsedName(midi.name || fileName);
      setParsedTrackCount(midi.tracks.length);
      
      // Get BPM/Tempo
      const detectedTempo = midi.header.tempos[0]?.bpm || 120;
      setTempo(Math.round(detectedTempo));
      setDuration(Math.round(midi.duration * 10) / 10);

      const parsedNotesList: ChartNote[] = [];

      // Grid steps mapper: let's assume a standard 16-step grid (quarter notes, 8th, 16th steps)
      // at the detected BPM, each quarter note is 60 / BPM seconds. A 16th note step is (60 / BPM) / 4 seconds.
      const stepDurationSecs = (60 / detectedTempo) / 4;

      midi.tracks.forEach((track) => {
        track.notes.forEach((note) => {
          // Standard general MIDI percussion mapping:
          // Bass Kick: 35, 36
          // Snare: 38, 40
          // Closed Hi-Hat: 42, 44, 46
          const midiNum = note.midi;
          let drumInst: 'kick' | 'snare' | 'hihat' | null = null;

          if (midiNum === 35 || midiNum === 36) {
            drumInst = 'kick';
          } else if (midiNum === 38 || midiNum === 40) {
            drumInst = 'snare';
          } else if (midiNum === 42 || midiNum === 44 || midiNum === 46) {
            drumInst = 'hihat';
          }

          if (drumInst) {
            // Find appropriate 16-step grid slot (0-15) based on time modulo measure duration
            const measureDuration = (60 / detectedTempo) * 4;
            const timeInMeasure = note.time % measureDuration;
            const step = Math.floor(timeInMeasure / stepDurationSecs) % 16;

            parsedNotesList.push({
              time: note.time,
              instrument: drumInst,
              step,
              velocity: note.velocity
            });
          }
        });
      });

      if (parsedNotesList.length === 0) {
        // Fallback: If no percussion channel 10 mappings found, map any notes to Hi-Hat, Snare, and Kick based on pitch
        midi.tracks.forEach((track) => {
          track.notes.forEach((note) => {
            let drumInst: 'kick' | 'snare' | 'hihat' = 'hihat';
            if (note.midi < 48) {
              drumInst = 'kick';
            } else if (note.midi < 60) {
              drumInst = 'snare';
            }
            const measureDuration = (60 / detectedTempo) * 4;
            const timeInMeasure = note.time % measureDuration;
            const step = Math.floor(timeInMeasure / stepDurationSecs) % 16;

            parsedNotesList.push({
              time: note.time,
              instrument: drumInst,
              step,
              velocity: note.velocity
            });
          });
        });
      }

      setNotesParsed(parsedNotesList);

    } catch (e: any) {
      setErrorMsg('Failed to parse MIDI structure. Please ensure it is a valid format 0 or 1 file.');
      console.error('MIDI ingest failed:', e);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMidiFile(file);
    setErrorMsg('');

    const isChartFile = file.name.toLowerCase().endsWith('.chart');

    if (isChartFile) {
      setDetectedFormat('CHART');
      try {
        const text = await file.text();
        const { name, bpm, notes } = parseChartFile(text, file.name);
        setParsedName(name);
        setParsedTrackCount(1);
        setTempo(bpm);
        setDuration(0);
        setNotesParsed(notes);
        if (notes.length === 0) {
          setErrorMsg('No drum notes found. Ensure the file contains [ExpertDrums], [HardDrums], or [MediumDrums] sections.');
        }
      } catch (err: any) {
        setErrorMsg('Failed to parse .chart file. Check the file format and try again.');
        console.error('.chart parse error:', err);
      }
    } else {
      setDetectedFormat('MIDI');
      const arrayBuffer = await file.arrayBuffer();
      parseMidiBuffer(arrayBuffer, file.name);
    }
  };

  // Convert parsed hits into a clean 16-step boolean sequence grid
  const applyImportedChart = () => {
    if (notesParsed.length === 0) return;

    const kickGrid = Array(16).fill(false);
    const snareGrid = Array(16).fill(false);
    const hihatGrid = Array(16).fill(false);

    notesParsed.forEach((n) => {
      if (n.instrument === 'kick') kickGrid[n.step] = true;
      else if (n.instrument === 'snare') snareGrid[n.step] = true;
      else if (n.instrument === 'hihat') hihatGrid[n.step] = true;
    });

    onChartImported({
      name: parsedName,
      beatsPerMeasure: 4,
      steps: {
        kick: kickGrid,
        snare: snareGrid,
        hihat: hihatGrid
      }
    });
  };

  // Generate an immediate high-fidelity community-style drum chart demo to let users practice on
  const loadDemoCommunityChart = () => {
    setParsedName('Funk Groover - Community Custom Chart');
    setParsedTrackCount(1);
    setTempo(112);
    setDuration(8.0);

    // Create a rich syncopated 16-step groove sequence notes list
    const demoNotes: ChartNote[] = [
      // Kicks
      { time: 0.0, instrument: 'kick', step: 0, velocity: 0.9 },
      { time: 0.8, instrument: 'kick', step: 3, velocity: 0.65 },
      { time: 1.6, instrument: 'kick', step: 8, velocity: 0.85 },
      { time: 2.1, instrument: 'kick', step: 10, velocity: 0.75 },
      // Snares
      { time: 1.2, instrument: 'snare', step: 4, velocity: 0.95 },
      { time: 2.8, instrument: 'snare', step: 12, velocity: 0.98 },
      { time: 3.4, instrument: 'snare', step: 15, velocity: 0.7 },
      // Hi-Hats on steady eighths
      { time: 0.0, instrument: 'hihat', step: 0, velocity: 0.5 },
      { time: 0.4, instrument: 'hihat', step: 2, velocity: 0.4 },
      { time: 0.8, instrument: 'hihat', step: 4, velocity: 0.55 },
      { time: 1.2, instrument: 'hihat', step: 6, velocity: 0.42 },
      { time: 1.6, instrument: 'hihat', step: 8, velocity: 0.5 },
      { time: 2.0, instrument: 'hihat', step: 10, velocity: 0.45 },
      { time: 2.4, instrument: 'hihat', step: 12, velocity: 0.6 },
      { time: 2.8, instrument: 'hihat', step: 14, velocity: 0.45 }
    ];

    setNotesParsed(demoNotes);
    setMidiFile(new File([], 'funk_groover_demo.mid'));
  };

  const clearFile = () => {
    setMidiFile(null);
    setParsedName('');
    setParsedTrackCount(0);
    setNotesParsed([]);
    setErrorMsg('');
    setDetectedFormat(null);
  };

  // Group notes counts for dynamic readout indicators
  const stats = {
    kick: notesParsed.filter(n => n.instrument === 'kick').length,
    snare: notesParsed.filter(n => n.instrument === 'snare').length,
    hihat: notesParsed.filter(n => n.instrument === 'hihat').length,
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 shadow-2xl space-y-6 relative overflow-hidden w-full max-w-xl mx-auto">
      
      {/* Background flare */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Chart Ingestion</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2 mt-0.5">
            <Drum className="h-5 w-5 text-indigo-400" />
            Open Format .mid Ingestion
          </h2>
        </div>
        <button
          onClick={loadDemoCommunityChart}
          className="text-[9px] font-mono text-emerald-450 hover:text-emerald-450 uppercase tracking-widest font-extrabold cursor-pointer border border-emerald-950 px-2 py-1 rounded bg-emerald-950/10"
        >
          Load Demo Chart
        </button>
      </div>

      {/* Drag Drop or Choose file board */}
      {!midiFile ? (
        <div className="relative border border-dashed border-slate-900 bg-slate-950/40 rounded-2xl p-6 text-center hover:border-slate-800 transition-colors">
          <input
            type="file"
            accept=".mid,.midi,.chart"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-2 py-4">
            <Upload className="h-8 w-8 text-slate-650 mx-auto" />
            <div>
              <p className="text-xs font-bold text-slate-350">Drag & Drop a drum chart file here</p>
              <p className="text-[10px] text-slate-550 mt-1">Accepts <strong>.mid</strong> / <strong>.midi</strong> (Format 0 & 1) and <strong>.chart</strong> (Moonscraper / Clone Hero)</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#070709] rounded-2xl p-4 border border-slate-900 space-y-4">
          
          {/* File summary details */}
          <div className="flex items-start justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-slate-950 rounded-lg flex items-center justify-center border border-slate-900">
                <FileText className="h-4.5 w-4.5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 truncate max-w-[180px]">{parsedName}</h4>
                  {detectedFormat && (
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      detectedFormat === 'CHART'
                        ? 'bg-amber-950/30 text-amber-400 border-amber-900/40'
                        : 'bg-indigo-950/30 text-indigo-400 border-indigo-900/40'
                    }`}>
                      {detectedFormat}
                    </span>
                  )}
                </div>
                <span className="text-[8.5px] font-mono text-slate-500 uppercase">
                  Tracks: {parsedTrackCount} &bull; Tempo: {tempo} BPM{duration > 0 ? ` &bull; Length: ${duration}s` : ''}
                </span>
              </div>
            </div>

            <button
              onClick={clearFile}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Extracted Rhythmic notes inventory */}
          <div className="space-y-2.5">
            <span className="font-sans text-[10px] font-bold text-slate-550 uppercase tracking-[0.2em] block">
              Extracted Drum Triggers
            </span>

            <div className="grid grid-cols-3 gap-3">
              
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                <span className="text-[8.5px] font-mono font-bold text-slate-500 uppercase block mb-1">Kicks</span>
                <span className="text-sm font-extrabold font-sans text-emerald-450">{stats.kick} hits</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                <span className="text-[8.5px] font-mono font-bold text-slate-500 uppercase block mb-1">Snares</span>
                <span className="text-sm font-extrabold font-sans text-indigo-400">{stats.snare} hits</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
                <span className="text-[8.5px] font-mono font-bold text-slate-500 uppercase block mb-1">Hi-Hats</span>
                <span className="text-sm font-extrabold font-sans text-sky-400">{stats.hihat} hits</span>
              </div>

            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={applyImportedChart}
            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.25)] select-none cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" /> Apply to Practice Scrolling Timeline
          </button>

        </div>
      )}

      {/* Error readouts */}
      {errorMsg && (
        <div className="bg-rose-950/15 border border-rose-900/35 rounded-xl p-3 flex gap-2.5 items-start">
          <AlertCircle className="h-4.5 w-4.5 text-rose-450 shrink-0 mt-0.5" />
          <p className="text-[10px] text-rose-300 leading-relaxed">{errorMsg}</p>
        </div>
      )}

      {/* General Instructions notice */}
      <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-900 space-y-2">
        <div className="flex items-center gap-1.5 border-b border-slate-900/60 pb-1.5">
          <Info className="h-4 w-4 text-indigo-400" />
          <span className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            About Ingestion Formats
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
          Supports <strong>.mid</strong> files via <strong>@tonejs/midi</strong> (parses GM drum channel notes) and <strong>.chart</strong> files (Moonscraper / Clone Hero format, reads <code>[ExpertDrums]</code> sections). Both formats align notes to a 16-step practice grid at the detected BPM.
        </p>
      </div>

    </div>
  );
}
