
export enum VisualizerMode {
  WAVEFORM = 'WAVEFORM',
  FRACTAL_TREE = 'FRACTAL_TREE',
  MANDALA = 'MANDALA',
  SPIROGRAPH = 'SPIROGRAPH',
  KALEIDOSCOPE = 'KALEIDOSCOPE',
  PULSE_RINGS = 'PULSE_RINGS',
  GEOMETRIC_TUNNEL = 'GEOMETRIC_TUNNEL',
  TOPOGRAPHIC = 'TOPOGRAPHIC',
  CELL_NET = 'CELL_NET',
  HEX_PULSE = 'HEX_PULSE',
  ORBITAL = 'ORBITAL'
}

export type AudioSourceType = 'mic' | 'file';

export interface VisualizerSettings {
  mode: VisualizerMode;
  sensitivity: number;
  colorScheme: string;
  customColor: string;
  isChromaKey: boolean;
  chromaColor: string;
  smoothing: number;
  audioSource: AudioSourceType;
}

export interface AudioData {
  timeDomain: Uint8Array;
  frequency: Uint8Array;
  volume: number;
}
