
import React, { useRef, useEffect } from 'react';
import { VisualizerMode, VisualizerSettings } from '../types';

interface VisualizerProps {
  isActive: boolean;
  settings: VisualizerSettings;
  analyzer: AnalyserNode | null;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, settings, analyzer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fix: Initialize requestRef with null to avoid "Expected 1 arguments, but got 0" error
  const requestRef = useRef<number | null>(null);
  const tunnelFrames = useRef<{ size: number; rotation: number; volume: number }[]>([]);
  
  // States for dynamic modes
  const orbitalState = useRef<{ angle: number; particles: { r: number; phase: number; speed: number }[] }>({
    angle: 0,
    particles: Array.from({ length: 50 }, () => ({
      r: Math.random() * 300 + 50,
      phase: Math.random() * Math.PI * 2,
      speed: (Math.random() - 0.5) * 0.02
    }))
  });

  const cellState = useRef<{ x: number; y: number; vx: number; vy: number }[]>(
    Array.from({ length: 40 }, () => ({
      x: Math.random() * 800 - 400,
      y: Math.random() * 800 - 400,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    }))
  );

  const draw = () => {
    if (!canvasRef.current || !analyzer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArrayFreq = new Uint8Array(bufferLength);
    const dataArrayTime = new Uint8Array(bufferLength);
    
    analyzer.getByteFrequencyData(dataArrayFreq);
    analyzer.getByteTimeDomainData(dataArrayTime);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += Math.abs(dataArrayTime[i] - 128);
    }
    const volume = (sum / bufferLength) * settings.sensitivity;

    // Set Background
    if (settings.isChromaKey) {
      ctx.fillStyle = settings.chromaColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    let strokeColor = 'white';
    if (settings.colorScheme === 'cyan-to-pink') {
      const hue = (Date.now() / 20) % 360;
      strokeColor = `hsl(${hue}, 80%, 60%)`;
    } else if (settings.colorScheme === 'fire') {
      strokeColor = `rgb(${Math.min(255, 200 + volume * 5)}, ${Math.min(255, 50 + volume * 2)}, 0)`;
    } else if (settings.colorScheme === 'neon') {
      strokeColor = '#00ffcc';
    } else if (settings.colorScheme === 'matrix') {
      strokeColor = '#00ff41';
    } else if (settings.colorScheme === 'gold') {
      strokeColor = '#ffd700';
    } else if (settings.colorScheme === 'deepsea') {
      strokeColor = `rgb(0, ${Math.min(255, 100 + volume * 2)}, ${Math.min(255, 150 + volume * 2)})`;
    } else if (settings.colorScheme === 'sunset') {
      strokeColor = `rgb(${255}, ${Math.min(255, 100 + volume * 2)}, ${Math.min(255, volume * 1.5)})`;
    } else if (settings.colorScheme === 'custom') {
      strokeColor = settings.customColor;
    }

    ctx.strokeStyle = strokeColor;
    ctx.shadowBlur = Math.min(volume * 2, 20);
    ctx.shadowColor = strokeColor;
    ctx.lineWidth = 1.5 + volume / 12;

    switch (settings.mode) {
      case VisualizerMode.WAVEFORM:
        drawWaveform(ctx, dataArrayTime, canvas.width, canvas.height, volume);
        break;
      case VisualizerMode.FRACTAL_TREE:
        drawFractalTree(ctx, 0, canvas.height / 4, -Math.PI / 2, 12, volume);
        break;
      case VisualizerMode.MANDALA:
        drawMandala(ctx, dataArrayFreq, volume);
        break;
      case VisualizerMode.SPIROGRAPH:
        drawSpirograph(ctx, dataArrayFreq, volume);
        break;
      case VisualizerMode.KALEIDOSCOPE:
        drawKaleidoscope(ctx, dataArrayTime, volume);
        break;
      case VisualizerMode.PULSE_RINGS:
        drawPulseRings(ctx, dataArrayFreq, volume);
        break;
      case VisualizerMode.GEOMETRIC_TUNNEL:
        drawGeometricTunnel(ctx, volume);
        break;
      case VisualizerMode.TOPOGRAPHIC:
        drawTopographic(ctx, dataArrayTime, volume, canvas.width, canvas.height);
        break;
      case VisualizerMode.CELL_NET:
        drawCellNet(ctx, volume);
        break;
      case VisualizerMode.HEX_PULSE:
        drawHexPulse(ctx, dataArrayFreq, volume);
        break;
      case VisualizerMode.ORBITAL:
        drawOrbital(ctx, volume);
        break;
    }

    ctx.restore();
    requestRef.current = requestAnimationFrame(draw);
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, data: Uint8Array, w: number, h: number, volume: number) => {
    ctx.beginPath();
    const sliceWidth = (w * 0.8) / data.length;
    let x = -w * 0.4;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * h * 0.3) - (h * 0.15);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  };

  const drawFractalTree = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, depth: number, volume: number) => {
    if (depth === 0) return;
    const length = depth * (8 + volume * 0.8);
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const branchAngle = 0.3 + (volume / 50);
    drawFractalTree(ctx, x2, y2, angle - branchAngle, depth - 1, volume);
    drawFractalTree(ctx, x2, y2, angle + branchAngle, depth - 1, volume);
  };

  const drawMandala = (ctx: CanvasRenderingContext2D, data: Uint8Array, volume: number) => {
    const points = 12;
    const radius = 50 + volume * 4;
    for (let i = 0; i < points; i++) {
      ctx.rotate((Math.PI * 2) / points);
      ctx.beginPath();
      ctx.arc(radius, 0, Math.max(2, volume), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(radius + volume * 2, volume);
      ctx.stroke();
    }
  };

  const drawSpirograph = (ctx: CanvasRenderingContext2D, data: Uint8Array, volume: number) => {
    ctx.beginPath();
    for (let i = 0; i < data.length; i += 2) {
      const angle = (i / data.length) * Math.PI * 2 * 5;
      const r = (data[i] / 2) + volume * 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const drawKaleidoscope = (ctx: CanvasRenderingContext2D, data: Uint8Array, volume: number) => {
    const segments = 8;
    const angle = (Math.PI * 2) / segments;
    for (let s = 0; s < segments; s++) {
      ctx.save();
      ctx.rotate(angle * s);
      if (s % 2 === 1) ctx.scale(1, -1);
      ctx.beginPath();
      for (let i = 0; i < data.length / 2; i += 4) {
        const r = data[i] * (1 + volume * 0.05);
        const theta = (i / (data.length / 2)) * angle;
        const x = Math.cos(theta) * r;
        const y = Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  const drawPulseRings = (ctx: CanvasRenderingContext2D, data: Uint8Array, volume: number) => {
    for (let i = 0; i < 10; i++) {
      const intensity = data[Math.floor((i / 10) * data.length * 0.5)] / 255;
      const radius = (i * 40) + (intensity * 50 * settings.sensitivity);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.globalAlpha = intensity;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  const drawGeometricTunnel = (ctx: CanvasRenderingContext2D, volume: number) => {
    if (volume > 5) {
      tunnelFrames.current.unshift({ size: 10, rotation: (Date.now() / 1000) % (Math.PI * 2), volume });
    }
    if (tunnelFrames.current.length > 40) tunnelFrames.current.pop();
    for (let i = 0; i < tunnelFrames.current.length; i++) {
      const frame = tunnelFrames.current[i];
      frame.size += 15;
      ctx.globalAlpha = 1 - (i / tunnelFrames.current.length);
      ctx.save();
      ctx.rotate(frame.rotation + (i * 0.05));
      ctx.strokeRect(-frame.size / 2, -frame.size / 2, frame.size, frame.size);
      ctx.restore();
    }
  };

  const drawTopographic = (ctx: CanvasRenderingContext2D, data: Uint8Array, volume: number, w: number, h: number) => {
    const layers = 8;
    const time = Date.now() / 1000;
    for (let l = 0; l < layers; l++) {
      ctx.beginPath();
      const offset = l * 50;
      const points = 60;
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const freqIndex = Math.floor((i / points) * data.length * 0.5);
        const audioMod = (data[freqIndex] / 255) * volume * 2;
        
        // Multi-layered sine waves to simulate Perlin-like contours
        const r = offset + 100 + audioMod + 
                  Math.sin(angle * 3 + time + l) * 20 + 
                  Math.cos(angle * 5 - time * 0.5 + l) * 15;
        
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.3 + (l / layers) * 0.7;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const drawCellNet = (ctx: CanvasRenderingContext2D, volume: number) => {
    const nodes = cellState.current;
    const threshold = 150 + volume * 2;
    
    nodes.forEach(n => {
      n.x += n.vx * (1 + volume * 0.1);
      n.y += n.vy * (1 + volume * 0.1);
      if (Math.abs(n.x) > 500) n.vx *= -1;
      if (Math.abs(n.y) > 500) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.globalAlpha = 1 - (dist / threshold);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawHexPulse = (ctx: CanvasRenderingContext2D, data: Uint8Array, volume: number) => {
    const size = 40;
    const h = size * Math.sqrt(3);
    const w = size * 2;
    const rows = 10;
    const cols = 10;
    
    for (let r = -rows; r < rows; r++) {
      for (let c = -cols; c < cols; c++) {
        const x = c * w * 0.75;
        const y = r * h + (c % 2 === 0 ? 0 : h / 2);
        
        const dist = Math.sqrt(x * x + y * y);
        const freqIndex = Math.floor((dist / 1000) * data.length * 0.5) % data.length;
        const intensity = data[freqIndex] / 255;
        
        const currentSize = size * (0.2 + intensity * settings.sensitivity);
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const px = x + currentSize * Math.cos(angle);
          const py = y + currentSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.globalAlpha = 0.2 + intensity * 0.8;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawOrbital = (ctx: CanvasRenderingContext2D, volume: number) => {
    const state = orbitalState.current;
    state.angle += 0.01 + volume * 0.002;
    
    state.particles.forEach((p, i) => {
      const currentR = p.r + Math.sin(state.angle + p.phase) * volume * 2;
      const angle = state.angle * p.speed * 50 + p.phase;
      const x = Math.cos(angle) * currentR;
      const y = Math.sin(angle) * currentR;
      
      ctx.beginPath();
      ctx.arc(x, y, 1 + volume / 10, 0, Math.PI * 2);
      ctx.stroke();
      
      // Connect to center sometimes
      if (i % 5 === 0 && volume > 10) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.globalAlpha = 0.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    if (isActive) requestRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, settings]);

  return (
    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full bg-black transition-colors duration-500" />
  );
};

export default Visualizer;
