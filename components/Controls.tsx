
import React, { useState, useEffect } from 'react';
import { VisualizerMode, VisualizerSettings } from '../types';

interface ControlsProps {
  settings: VisualizerSettings;
  setSettings: React.Dispatch<React.SetStateAction<VisualizerSettings>>;
  onStop: () => void;
  onToggleFullscreen: () => void;
  isUIVisible: boolean;
  setIsUIVisible: (visible: boolean) => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onFileUpload: (file: File) => void;
  audioElement: HTMLAudioElement | null;
}

const Controls: React.FC<ControlsProps> = ({ 
  settings, 
  setSettings, 
  onStop, 
  onToggleFullscreen,
  isUIVisible,
  setIsUIVisible,
  isRecording,
  onToggleRecording,
  onFileUpload,
  audioElement
}) => {
  const [isPlaying, setIsPlaying] = useState(true);

  // Sync isPlaying state with the actual audioElement state
  useEffect(() => {
    if (!audioElement) return;
    
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    
    audioElement.addEventListener('play', onPlay);
    audioElement.addEventListener('pause', onPause);
    
    // Initial sync
    setIsPlaying(!audioElement.paused);
    
    return () => {
      audioElement.removeEventListener('play', onPlay);
      audioElement.removeEventListener('pause', onPause);
    };
  }, [audioElement]);

  const toggleMode = (mode: VisualizerMode) => {
    setSettings(prev => ({ ...prev, mode }));
  };

  const handlePlayPause = () => {
    if (audioElement) {
      if (audioElement.paused) {
        audioElement.play().catch(console.error);
      } else {
        audioElement.pause();
      }
    }
  };

  return (
    <>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsUIVisible(false);
        }}
        className="absolute top-6 left-6 z-50 p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl pointer-events-auto backdrop-blur-md transition-all border border-white/10 flex items-center gap-2 group"
        title="Hide UI (H)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        <span className="hidden md:block text-xs font-bold pr-1">HIDE UI (H)</span>
      </button>

      <div 
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-0 right-0 h-full w-full sm:w-80 bg-zinc-950/90 backdrop-blur-2xl border-l border-white/5 transition-transform duration-500 pointer-events-auto overflow-y-auto ${isUIVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 space-y-6 pb-20 sm:pb-8">
          <div className="space-y-4 pt-16 sm:pt-12">
            <button 
              onClick={onToggleRecording}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-xs tracking-widest transition-all border ${isRecording ? 'bg-red-600 border-red-500 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`}></div>
              {isRecording ? 'STOP RECORDING' : 'RECORD VIDEO (R)'}
            </button>
            
            <button 
              onClick={onToggleFullscreen}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs tracking-widest transition-all border border-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              FULLSCREEN (F)
            </button>
          </div>

          {settings.audioSource === 'file' && (
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <h2 className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Playback</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePlayPause}
                  className="flex-1 py-2 bg-white text-black rounded-lg text-xs font-black flex items-center justify-center gap-2"
                >
                  {isPlaying ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> PAUSE</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> PLAY</>
                  )}
                </button>
                <label className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg cursor-pointer transition-colors border border-white/5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase mb-4">Visual Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(VisualizerMode).map((mode, idx) => (
                <button
                  key={mode}
                  onClick={() => toggleMode(mode)}
                  className={`flex items-center justify-between px-3 py-3 text-[9px] font-black rounded-xl transition-all border ${settings.mode === mode ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-400 border-white/5 hover:border-white/20'}`}
                >
                  <span className="uppercase tracking-tighter truncate mr-1">{mode.replace('_', ' ')}</span>
                  <span className="opacity-30 font-mono text-[8px]">{idx < 9 ? idx + 1 : idx === 9 ? '0' : '-'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <h2 className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Sensitivity</h2>
                <span className="text-[10px] font-mono text-white">{settings.sensitivity.toFixed(1)}x</span>
              </div>
              <input 
                type="range" min="0.5" max="15" step="0.1"
                value={settings.sensitivity}
                onChange={(e) => setSettings(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <h2 className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase">Smoothing</h2>
                <span className="text-[10px] font-mono text-white">{(settings.smoothing * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="0" max="0.95" step="0.05"
                value={settings.smoothing}
                onChange={(e) => setSettings(prev => ({ ...prev, smoothing: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>

          <div>
            <h2 className="text-zinc-500 font-black text-[10px] tracking-[0.2em] uppercase mb-4">Color Preset</h2>
            <div className="space-y-4">
              <select 
                value={settings.colorScheme}
                onChange={(e) => setSettings(prev => ({ ...prev, colorScheme: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-bold text-white focus:outline-none appearance-none"
              >
                <option value="cyan-to-pink">Rainbow Gradient</option>
                <option value="neon">Electric Cyan</option>
                <option value="fire">Thermal</option>
                <option value="matrix">Matrix Green</option>
                <option value="gold">Pure Gold</option>
                <option value="deepsea">Deep Sea Blue</option>
                <option value="sunset">Solstice Sunset</option>
                <option value="white">Minimal White</option>
                <option value="custom">Custom Color</option>
              </select>

              {settings.colorScheme === 'custom' && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex-1">
                    <span className="block text-[10px] font-black text-zinc-500 uppercase mb-2">PICK COLOR</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={settings.customColor}
                        onChange={(e) => setSettings(prev => ({ ...prev, customColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg bg-transparent border border-white/20 cursor-pointer overflow-hidden"
                      />
                      <input 
                        type="text"
                        value={settings.customColor}
                        onChange={(e) => setSettings(prev => ({ ...prev, customColor: e.target.value }))}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:outline-none"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-zinc-300 tracking-wider">CHROMA KEY</span>
              <button 
                onClick={() => setSettings(prev => ({ ...prev, isChromaKey: !prev.isChromaKey }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${settings.isChromaKey ? 'bg-green-500' : 'bg-zinc-700'}`}
              >
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.isChromaKey ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </button>
            </div>
            {settings.isChromaKey && (
              <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <input 
                  type="color" 
                  value={settings.chromaColor}
                  onChange={(e) => setSettings(prev => ({ ...prev, chromaColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg bg-transparent border border-white/20 cursor-pointer overflow-hidden"
                />
                <span className="text-[10px] font-mono text-zinc-400 uppercase">{settings.chromaColor}</span>
              </div>
            )}
          </div>

          <div className="pt-4">
            <button
              onClick={onStop}
              className="w-full py-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black text-[10px] tracking-widest transition-all uppercase"
            >
              DISCONNECT
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Controls;
