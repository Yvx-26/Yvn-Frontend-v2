export interface WaveformStatistics {
  pointCount: number
  min: number
  max: number
  peakAbs: number
  completeness: number
}

export function toSignedSample(value: number) {
  return value > 127 ? value - 256 : value
}

export function waveformStatistics(samples: number[]): WaveformStatistics {
  if (samples.length === 0) {
    return { pointCount: 0, min: 0, max: 0, peakAbs: 0, completeness: 0 }
  }

  let min = 127
  let max = -128
  for (const raw of samples) {
    const value = toSignedSample(raw)
    if (value < min) min = value
    if (value > max) max = value
  }

  return {
    pointCount: samples.length,
    min,
    max,
    peakAbs: Math.max(Math.abs(min), Math.abs(max)),
    completeness: Math.min(100, Math.round((samples.length / 4000) * 100)),
  }
}
