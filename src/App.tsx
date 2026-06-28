import { useState } from 'react';
import { useMetronome } from './hooks/useMetronome';
import { VisualBeats } from './components/VisualBeats';
import { MetronomeController } from './components/MetronomeController';
import { RudimentCoach } from './components/RudimentCoach';
import { DrumPatternStation } from './components/DrumPatternStation';
import { useMIDI } from './hooks/useMIDI';
import { MidiSettings } from './components/MidiSettings';
import { AIInstructor } from './components/AIInstructor';
import { PracticeMode, PracticePattern } from './components/PracticeMode';
import { AudioStemPlayer } from './components/AudioStemPlayer';
import { LatencyAnalytics } from './components/LatencyAnalytics';
import { DynamicsDrill } from './components/DynamicsDrill';
import { ChartIngestion } from './components/ChartIngestion';
import { LimbIndependence } from './components/LimbIndependence';
import { DrumLessons } from './components/DrumLessons';
import { 
  Drum, 
  Music, 
  Flame, 
  Award, 
  BookOpen, 
  Volume2, 
  ShieldCheck, 
  TrendingUp, 
  Sparkles, 
  Trophy, 
  Sliders, 
  Activity, 
  Upload 
} from 'lucide-react';

export default function App() {
  const {
    isPlaying,
    bpm,
    beatsPerMeasure,
    division,
    soundType,
    volume,
    currentBeat,
    currentSubdivision,
    flashTrigger,
    isFirstBeat,
    activePattern,
    muteMetronomeClick,
    firedHits,
    setBpm,
    setBeatsPerMeasure,
    setDivision,
    setSoundType,
    setVolume,
    setActivePattern,
    setMuteMetronomeClick,
    togglePlayback,
    triggerKick,
    triggerSnare,
    triggerHiHat,
    startMetronome,
  } = useMetronome();

  const [externalVisualTrigger, setExternalVisualTrigger] = useState<{ instrument: 'kick' | 'snare' | 'hihat'; timestamp: number; velocity?: number } | null>(null);

  // Advanced feature tab state, timing analytics buffer, and imported custom midi chart
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<'stems' | 'analytics' | 'dynamics' | 'ingestion' | 'independence'>('stems');
  const [rightColumnTab, setRightColumnTab] = useState<'rudiments' | 'lessons'>('lessons');
  const [timingHistory, setTimingHistory] = useState<{ id: string; offset: number; type: 'kick' | 'snare' | 'hihat'; rating: 'Perfect' | 'Good' | 'Early' | 'Late' }[]>([]);
  const [importedPattern, setImportedPattern] = useState<PracticePattern | null>(null);

  const {
    isSupported,
    permissionState,
    devices,
    midiLogs,
    mappings,
    learningInstrument,
    setLearningInstrument,
    requestMidiAccess,
    clearLogs,
    resetMappingsToDefault
  } = useMIDI({
    triggerKick,
    triggerSnare,
    triggerHiHat,
    onVisualTrigger: (instrument, velocity) => {
      setExternalVisualTrigger({ instrument, timestamp: Date.now(), velocity });
    }
  });

  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 flex flex-col antialiased selection:bg-emerald-500/35 selection:text-emerald-100">
      
      {/* Upper Navigation / Decorative Header Banner */}
      <header className="border-b border-slate-900 bg-[#0A0A0C]/90 sticky top-0 backdrop-blur-md z-10">
        <div className="max-w-6xl mx-auto px-4 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#0F0F11] border border-slate-900 flex items-center justify-center shadow-md">
              <Drum className="h-4.5 w-4.5 text-emerald-400 stroke-[2]" />
            </div>
            <div>
              <h1 className="font-sans text-sm font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
                Drum Coach <span className="text-[9px] bg-emerald-500/10 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-500/10">v1.1</span>
              </h1>
              <span className="text-[10px] font-sans font-medium text-slate-500 tracking-wide">Rhythmic timing & rudiment accelerator</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-450">
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0F0F11] px-3.5 py-1.5 rounded-xl border border-slate-900">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-sans text-[10px] text-slate-400 uppercase tracking-wider font-extrabold">Web Audio Clock</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-8.5">
        
        {/* Quick welcome introduction / hero block */}
        <div className="text-center max-w-xl mx-auto space-y-2 pb-2">
          <h2 className="font-sans text-xl md:text-2xl font-bold text-white tracking-tight">
            Perfect Your Drumming Stick Control
          </h2>
          <p className="font-sans text-xs text-slate-500 leading-relaxed">
            Train your rolls, diddles, and flams under precise rhythm. This metronome runs scheduled into the future using the Web Audio API time-clock for reliable, musician-grade consistency.
          </p>
        </div>

        {/* Dashboard Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Column 1: Metronome controls + Visual grid */}
          <div className="space-y-6">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-450" />
              Metronome Station
            </h3>

            {/* Pulsing Sphere Unit */}
            <VisualBeats
              currentBeat={currentBeat}
              currentSubdivision={currentSubdivision}
              beatsPerMeasure={beatsPerMeasure}
              division={division}
              flashTrigger={flashTrigger}
              isFirstBeat={isFirstBeat}
              isPlaying={isPlaying}
            />

            {/* Playback & Knobs panel */}
            <MetronomeController
              isPlaying={isPlaying}
              bpm={bpm}
              beatsPerMeasure={beatsPerMeasure}
              division={division}
              soundType={soundType}
              volume={volume}
              setBpm={setBpm}
              setBeatsPerMeasure={setBeatsPerMeasure}
              setDivision={setDivision}
              setSoundType={setSoundType}
              setVolume={setVolume}
              togglePlayback={togglePlayback}
            />

             {/* Virtual Drum Kit Interactive Pads & Playback grooves */}
            <DrumPatternStation
              isPlaying={isPlaying}
              currentBeat={currentBeat}
              currentSubdivision={currentSubdivision}
              division={division}
              beatsPerMeasure={beatsPerMeasure}
              firedHits={firedHits}
              activePattern={activePattern}
              muteMetronomeClick={muteMetronomeClick}
              setBeatsPerMeasure={setBeatsPerMeasure}
              setDivision={setDivision}
              setActivePattern={setActivePattern}
              setMuteMetronomeClick={setMuteMetronomeClick}
              triggerKick={triggerKick}
              triggerSnare={triggerSnare}
              triggerHiHat={triggerHiHat}
              startMetronome={startMetronome}
              externalVisualTrigger={externalVisualTrigger}
            />

            <PracticeMode
              isPlaying={isPlaying}
              bpm={bpm}
              currentBeat={currentBeat}
              currentSubdivision={currentSubdivision}
              division={division}
              beatsPerMeasure={beatsPerMeasure}
              triggerKick={triggerKick}
              triggerSnare={triggerSnare}
              triggerHiHat={triggerHiHat}
              setBeatsPerMeasure={setBeatsPerMeasure}
              setDivision={setDivision}
              togglePlayback={togglePlayback}
              externalVisualTrigger={externalVisualTrigger}
              onHistoryUpdated={setTimingHistory}
              importedPattern={importedPattern}
            />

            <AIInstructor
              bpm={bpm}
              division={division}
              beatsPerMeasure={beatsPerMeasure}
              setBpm={setBpm}
              setDivision={setDivision}
              setBeatsPerMeasure={setBeatsPerMeasure}
              recentTimingHistory={timingHistory}
            />
          </div>

          {/* Column 2: Academy Lessons or Stick Rudiments */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0A0C] border border-slate-900 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                <h3 className="font-sans text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Core Training Hub
                </h3>
              </div>
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-900">
                <button
                  id="btn-right-tab-lessons"
                  onClick={() => setRightColumnTab('lessons')}
                  className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    rightColumnTab === 'lessons'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Lessons
                </button>
                <button
                  id="btn-right-tab-rudiments"
                  onClick={() => setRightColumnTab('rudiments')}
                  className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    rightColumnTab === 'rudiments'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Stick Rudiments
                </button>
              </div>
            </div>

            {rightColumnTab === 'lessons' ? (
              <DrumLessons
                isPlaying={isPlaying}
                bpm={bpm}
                currentBeat={currentBeat}
                currentSubdivision={currentSubdivision}
                division={division}
                beatsPerMeasure={beatsPerMeasure}
                recentTimingHistory={timingHistory}
                setBpm={setBpm}
                setDivision={setDivision}
                setBeatsPerMeasure={setBeatsPerMeasure}
                togglePlayback={togglePlayback}
              />
            ) : (
              <RudimentCoach
                isPlaying={isPlaying}
                bpm={bpm}
                division={division}
                currentBeat={currentBeat}
                currentSubdivision={currentSubdivision}
                setBpm={setBpm}
                setDivision={setDivision}
              />
            )}

            {/* Quick Practice guide Card */}
            <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900/65 backdrop-blur-md space-y-4 shadow-xl">
              <h4 className="text-[10px] font-bold uppercase text-slate-350 tracking-[0.2em] flex items-center gap-1.5">
                <Award className="h-4 w-4 text-amber-500" /> Pro Practice Tips
              </h4>
              <ul className="space-y-3.5 text-xs text-slate-400">
                <li className="flex gap-2.5 items-start">
                  <span className="text-amber-500 font-bold mt-0.5">•</span>
                  <span className="leading-relaxed"><strong className="text-slate-300 font-semibold">Relaxation is Speed:</strong> Avoid tensing your wrists. Let the rebound do the work on double strokes and diddles.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-sky-400 font-bold mt-0.5">•</span>
                  <span className="leading-relaxed"><strong className="text-slate-300 font-semibold">Accent the Downbeat:</strong> Use the golden flash (Beat 1) and distinctive higher-pitched audio bell to maintain steady structural awareness of the bar.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-400 font-bold mt-0.5">•</span>
                  <span className="leading-relaxed"><strong className="text-slate-300 font-semibold">Build Dexterity Slowly:</strong> Turn on the <strong className="text-[#34d399]">Speed Trainer</strong> companion, set a moderate start BPM, and let the app carefully expand your speed threshold automatically.</span>
                </li>
              </ul>
            </div>

            {/* MIDI Settings panel */}
            <MidiSettings
              isSupported={isSupported}
              permissionState={permissionState}
              devices={devices}
              midiLogs={midiLogs}
              mappings={mappings}
              learningInstrument={learningInstrument}
              setLearningInstrument={setLearningInstrument}
              requestMidiAccess={requestMidiAccess}
              clearLogs={clearLogs}
              resetMappingsToDefault={resetMappingsToDefault}
            />
          </div>

        </div>

        {/* Advanced Drumming Center */}
        <div className="bg-[#0B0B0D] p-6 rounded-3xl border border-slate-900 space-y-6">
          <div className="border-b border-slate-900 pb-4">
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              Advanced Drumming Center
            </h3>
            <p className="text-[11px] text-slate-550 font-sans mt-1">
              Elevate your session with real-time multi-track audio isolation, latency analytics, and dynamics drills.
            </p>
          </div>

          {/* Tab Selection Row */}
          <div className="flex flex-wrap gap-2 border-b border-slate-900/60 pb-3">
            <button
              id="btn-tab-stems"
              onClick={() => setActiveAdvancedTab('stems')}
              className={`py-2 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-2 select-none cursor-pointer ${
                activeAdvancedTab === 'stems'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-350 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-500'
              }`}
            >
              <Music className="h-4 w-4" /> Multi-Track Stems
            </button>
            <button
              id="btn-tab-analytics"
              onClick={() => setActiveAdvancedTab('analytics')}
              className={`py-2 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-2 select-none cursor-pointer ${
                activeAdvancedTab === 'analytics'
                  ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-350 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-500'
              }`}
            >
              <TrendingUp className="h-4 w-4" /> Timing Scatter
            </button>
            <button
              id="btn-tab-dynamics"
              onClick={() => setActiveAdvancedTab('dynamics')}
              className={`py-2 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-2 select-none cursor-pointer ${
                activeAdvancedTab === 'dynamics'
                  ? 'bg-purple-500/10 border border-purple-500/30 text-purple-350 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-500'
              }`}
            >
              <Sparkles className="h-4 w-4" /> Dynamics Drill
            </button>
            <button
              id="btn-tab-ingestion"
              onClick={() => setActiveAdvancedTab('ingestion')}
              className={`py-2 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-2 select-none cursor-pointer ${
                activeAdvancedTab === 'ingestion'
                  ? 'bg-sky-500/10 border border-sky-500/30 text-sky-350 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-500'
              }`}
            >
              <Upload className="h-4 w-4" /> MIDI Chart Import
            </button>
            <button
              id="btn-tab-independence"
              onClick={() => setActiveAdvancedTab('independence')}
              className={`py-2 px-4 rounded-xl font-sans text-xs font-bold transition-all flex items-center gap-2 select-none cursor-pointer ${
                activeAdvancedTab === 'independence'
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-350 shadow-md'
                  : 'bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-500'
              }`}
            >
              <Trophy className="h-4 w-4" /> Limb Independence
            </button>
          </div>

          {/* Active Tab Viewport */}
          <div className="pt-2 min-h-[300px]">
            {activeAdvancedTab === 'stems' && <AudioStemPlayer />}
            {activeAdvancedTab === 'analytics' && <LatencyAnalytics offsetHistory={timingHistory} />}
            {activeAdvancedTab === 'dynamics' && <DynamicsDrill externalVisualTrigger={externalVisualTrigger} />}
            {activeAdvancedTab === 'ingestion' && (
              <ChartIngestion 
                onChartImported={(chart) => {
                  setImportedPattern({
                    id: 'midi-custom-chart',
                    name: chart.name,
                    difficulty: 'Challenging',
                    description: 'Loaded custom rhythmic step sequence from community MIDI chart.',
                    beats: chart.beatsPerMeasure,
                    division: 4, 
                    sequence: chart.steps
                  });
                }} 
              />
            )}
            {activeAdvancedTab === 'independence' && (
              <LimbIndependence
                isPlaying={isPlaying}
                bpm={bpm}
                currentBeat={currentBeat}
                currentSubdivision={currentSubdivision}
                division={division}
                triggerKick={triggerKick}
                triggerSnare={triggerSnare}
                triggerHiHat={triggerHiHat}
                externalVisualTrigger={externalVisualTrigger}
              />
            )}
          </div>
        </div>

      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-950 mt-20 py-8 text-center text-[10px] text-slate-600 uppercase tracking-[0.15em] font-medium">
        <p>Precise Web Audio API Timer Engine • Designed for percussion players and drum students</p>
      </footer>
    </div>
  );
}
