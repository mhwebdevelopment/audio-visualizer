
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VisualizerMode, VisualizerSettings, AudioSourceType } from './types';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isUIVisible, setIsUIVisible] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [settings, setSettings] = useState<VisualizerSettings>({
    mode: VisualizerMode.FRACTAL_TREE,
    sensitivity: 1.5,
    colorScheme: 'cyan-to-pink',
    customColor: '#ffffff',
    isChromaKey: false,
    chromaColor: '#00FF00',
    smoothing: 0.85,
    audioSource: 'mic'
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const recorderDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioFileSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Resume AudioContext on any interaction for mobile browsers
  useEffect(() => {
    const resume = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    window.addEventListener('touchstart', resume, { once: true });
    window.addEventListener('mousedown', resume, { once: true });
    return () => {
      window.removeEventListener('touchstart', resume);
      window.removeEventListener('mousedown', resume);
    };
  }, []);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const elem = containerRef.current || document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(e => console.error(e));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, []);

  const setupAudioGraph = useCallback(() => {
    if (!audioContextRef.current) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 2048;
      analyzer.smoothingTimeConstant = settings.smoothing;
      
      const monitorGain = audioCtx.createGain();
      const recorderDest = audioCtx.createMediaStreamDestination();

      analyzer.connect(monitorGain);
      monitorGain.connect(audioCtx.destination);
      analyzer.connect(recorderDest);

      audioContextRef.current = audioCtx;
      analyzerRef.current = analyzer;
      monitorGainRef.current = monitorGain;
      recorderDestRef.current = recorderDest;
      
      return { audioCtx, analyzer, monitorGain };
    }
    return { 
      audioCtx: audioContextRef.current, 
      analyzer: analyzerRef.current!,
      monitorGain: monitorGainRef.current!
    };
  }, [settings.smoothing]);

  const startMicAudio = async () => {
    try {
      const { audioCtx, analyzer, monitorGain } = setupAudioGraph();
      
      if (audioFileSourceRef.current) {
        audioFileSourceRef.current.disconnect();
        audioFileSourceRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyzer);
      
      monitorGain.gain.setValueAtTime(0, audioCtx.currentTime);

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      setSettings(prev => ({ ...prev, audioSource: 'mic' }));
      setIsActive(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required.');
    }
  };

  const handleFileUpload = async (file: File) => {
    const { audioCtx, analyzer, monitorGain } = setupAudioGraph();
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.src = url;
    // Don't use crossOrigin for local blobs if not needed, can cause issues on some mobiles
    audioElementRef.current = audio;

    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyzer);
    audioFileSourceRef.current = source;

    monitorGain.gain.setValueAtTime(1, audioCtx.currentTime);

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    try {
      await audio.play();
    } catch (e) {
      console.warn("Autoplay blocked, user interaction required", e);
    }
    
    setSettings(prev => ({ ...prev, audioSource: 'file' }));
    setIsActive(true);
  };

  const startRecording = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Capture visual frames - reduced frame rate for mobile stability
    const canvasStream = canvas.captureStream(30);
    const audioStream = recorderDestRef.current?.stream;
    
    if (!audioStream) {
      console.error("Audio stream for recording not found");
      return;
    }

    const tracks = [...canvasStream.getVideoTracks()];
    if (audioStream.getAudioTracks().length > 0) {
      tracks.push(...audioStream.getAudioTracks());
    }

    const combinedStream = new MediaStream(tracks);

    const mimeTypes = [
      'video/mp4;codecs=avc1,mp4a', // Best for mobile
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];

    let mimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    if (!mimeType) {
      alert("Recording is not supported on this browser.");
      return;
    }

    try {
      const recorder = new MediaRecorder(combinedStream, { mimeType });
      recordedChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType.split(';')[0] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `fractal-viz-${Date.now()}.${extension}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };

      recorder.onerror = (e) => {
        console.error("MediaRecorder error:", e);
        setIsRecording(false);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (e) {
      console.error("Failed to start MediaRecorder:", e);
      alert("Could not start recording. This browser might not support recording from canvas.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const stopAudio = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyzerRef.current = null;
      monitorGainRef.current = null;
      recorderDestRef.current = null;
    }
    setIsActive(false);
    setIsUIVisible(true);
    if (isRecording) stopRecording();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h') setIsUIVisible(prev => !prev);
      if (e.key.toLowerCase() === 'f') toggleFullScreen();
      if (e.key.toLowerCase() === 'r') isRecording ? stopRecording() : startRecording();
      if (isActive) {
        const modes = Object.values(VisualizerMode);
        let index = -1;
        if (e.key >= '1' && e.key <= '9') index = parseInt(e.key) - 1;
        if (e.key === '0') index = 9;
        if (e.key === '-') index = 10;
        if (index >= 0 && index < modes.length) {
          setSettings(s => ({ ...s, mode: modes[index] }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, toggleFullScreen, isRecording]);

  useEffect(() => {
    if (analyzerRef.current) {
      analyzerRef.current.smoothingTimeConstant = settings.smoothing;
    }
  }, [settings.smoothing]);

  return (
    <div 
      ref={containerRef}
      onDoubleClick={() => isActive && setIsUIVisible(v => !v)}
      className="relative w-full h-screen overflow-hidden bg-black select-none touch-none"
    >
      <Visualizer 
        isActive={isActive} 
        settings={settings} 
        analyzer={analyzerRef.current} 
      />

      {isRecording && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-red-600/90 text-white rounded-full animate-pulse font-black text-xs tracking-widest shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          RECORDING...
        </div>
      )}

      <div className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 ${isUIVisible ? 'opacity-100' : 'opacity-0'}`}>
        {!isActive ? (
          <div className="flex items-center justify-center w-full h-full bg-black/90 pointer-events-auto">
            <div className="text-center p-8 md:p-12 bg-zinc-900/50 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-xl max-w-sm md:max-w-md mx-4">
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">FRACTAL VOX</h1>
              <p className="text-zinc-400 mb-8 leading-relaxed text-sm md:text-base">
                Professional audio visualization. High-quality video capture with zero mic feedback.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={startMicAudio}
                  className="group relative px-10 py-5 bg-white text-black font-black rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  USE MICROPHONE
                </button>
                <label className="group relative px-10 py-5 bg-zinc-800 text-white font-black rounded-full transition-all hover:bg-zinc-700 cursor-pointer text-center">
                  UPLOAD MP3
                  <input 
                    type="file" 
                    accept="audio/mp3,audio/*" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <Controls 
            settings={settings} 
            setSettings={setSettings} 
            onStop={stopAudio}
            onToggleFullscreen={toggleFullScreen}
            isUIVisible={isUIVisible}
            setIsUIVisible={setIsUIVisible}
            isRecording={isRecording}
            onToggleRecording={isRecording ? stopRecording : startRecording}
            onFileUpload={handleFileUpload}
            audioElement={audioElementRef.current}
          />
        )}
      </div>
      
      {!isUIVisible && isActive && (
        <div className="absolute bottom-4 left-4 text-[10px] text-white/20 pointer-events-none font-mono">
          Double-tap background to show controls {isRecording && '• Recording Active'}
        </div>
      )}
    </div>
  );
};

export default App;
