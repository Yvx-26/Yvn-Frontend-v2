import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WaveformPanel from '../views/monitoring/wave-monitor/components/WaveformPanel.vue'
import type { WaveMonitorRuntime } from '../views/monitoring/wave-monitor/types'

class ResizeObserverStub {
  observe = vi.fn<() => void>()
  unobserve = vi.fn<() => void>()
  disconnect = vi.fn<() => void>()
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

const runtime: WaveMonitorRuntime = {
  deviceId: 'device-001',
  batchId: '#FRAME-1',
  receiveTime: '12:00:00',
  frameId: 1,
  createdAt: '2026-09-26 12:00:00',
  phase: 'N-E',
  faultType: 'NORMAL',
  faultDistanceM: null,
  interphaseResults: {},
  waveformSamples: [0, 1, 255],
  events: [],
}

describe('WaveformPanel', () => {
  it('renders ten clickable phase cards and emits the selected phase', async () => {
    const wrapper = mount(WaveformPanel, {
      props: {
        runtime,
        isLive: true,
        selectedPhasePair: null,
      },
    })

    const phaseButtons = wrapper.findAll('.wave-monitor-frame-stats > button')
    expect(phaseButtons).toHaveLength(10)

    await phaseButtons[1]!.trigger('click')

    expect(wrapper.emitted('selectPhase')).toEqual([['A-C']])
  })
})
