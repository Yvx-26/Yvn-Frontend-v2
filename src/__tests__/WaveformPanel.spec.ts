import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WaveformPanel from '../views/monitoring/wave-monitor/components/WaveformPanel.vue'
import type { WaveMonitorRuntime } from '../views/monitoring/wave-monitor/types'
enableAutoUnmount(afterEach)

class ResizeObserverStub {
  observe = vi.fn<() => void>()
  unobserve = vi.fn<() => void>()
  disconnect = vi.fn<() => void>()
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver

const runtime: WaveMonitorRuntime = {
  batchId: '#FRAME-1',
  receiveTime: '12:00:00',
  frameId: 1,
  frameValid: true,
  frameError: '',
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

  it('opens and closes the realtime waveform fullscreen fallback', async () => {
    const wrapper = mount(WaveformPanel, {
      props: {
        runtime,
        isLive: true,
        selectedPhasePair: null,
      },
    })

    const fullscreenButton = wrapper.get('[aria-label="全屏查看实时行波"]')
    await fullscreenButton.trigger('click')

    expect(wrapper.get('.wave-monitor-wave-panel').classes()).toContain('is-fullscreen-fallback')
    expect(wrapper.get('[aria-label="退出实时行波全屏"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[aria-label="退出实时行波全屏"]').trigger('click')

    expect(wrapper.get('.wave-monitor-wave-panel').classes()).not.toContain(
      'is-fullscreen-fallback',
    )
  })
})
