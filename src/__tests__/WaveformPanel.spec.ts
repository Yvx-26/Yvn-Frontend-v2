import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
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
  phaseStates: {},
  waveformSamples: [0, 1, 255],
  events: [],
}

const fullFrame = { ...runtime, waveformSamples: Array.from({ length: 4000 }, (_, i) => i % 256) }

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

  it('keeps the amplitude scale fixed on horizontal wheel zoom and preserves the selection on Shift-wheel', async () => {
    const wrapper = mount(WaveformPanel, {
      props: { runtime: fullFrame, isLive: true, selectedPhasePair: null },
    })
    const svg = wrapper.get('.wave-monitor-wave-svg')
    vi.spyOn(svg.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 620, 280))
    const chart = wrapper.get('.wave-monitor-chart-wrap')
    const range = () => wrapper.get('.wave-monitor-zoom-range').text()
    const amplitudeTicks = () =>
      svg
        .findAll('.wave-monitor-axis-label')
        .slice(0, 7)
        .map((tick) => tick.text())
    const initialAmplitude = amplitudeTicks()

    chart.element.dispatchEvent(
      new WheelEvent('wheel', { clientX: 219, clientY: 100, deltaY: -120, cancelable: true }),
    )
    await nextTick()
    expect(range()).toContain('采样点 239–3439')
    expect(amplitudeTicks()).toEqual(initialAmplitude)

    const zoomedRange = range()
    chart.element.dispatchEvent(
      new WheelEvent('wheel', {
        clientX: 219,
        clientY: 100,
        deltaX: -120,
        shiftKey: true,
        cancelable: true,
      }),
    )
    await nextTick()
    expect(range()).toBe(zoomedRange)
    expect(amplitudeTicks()).not.toEqual(initialAmplitude)
    expect(wrapper.get('[aria-label="纵轴缩放"]').text()).toContain('纵轴 1.25×')
  })

  it('keeps the panned view across frames until the user resets it', async () => {
    const wrapper = mount(WaveformPanel, {
      props: { runtime: fullFrame, isLive: false, selectedPhasePair: 'N-E' },
    })
    const svg = wrapper.get('.wave-monitor-wave-svg')
    vi.spyOn(svg.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 620, 280))
    const chart = wrapper.get('.wave-monitor-chart-wrap')
    const overview = wrapper.get('.wave-monitor-overview-svg')
    vi.spyOn(overview.element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 43))
    const selection = () => overview.get('.wave-monitor-overview-window').attributes()

    await wrapper.get('[aria-label="放大横轴"]').trigger('click')
    await wrapper.get('[aria-label="放大纵轴"]').trigger('click')
    const beforeDrag = selection()
    chart.element.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 300, clientY: 100 }),
    )
    chart.element.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 1, clientX: 255, clientY: 100 }),
    )
    chart.element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    await nextTick()
    expect(Number(selection().x)).toBeGreaterThan(Number(beforeDrag.x))
    expect(Number(selection().width)).toBeCloseTo(Number(beforeDrag.width))

    overview.element.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 2, button: 0, clientX: 0 }),
    )
    overview.element.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }))
    await nextTick()
    expect(selection().x).toBe('0')
    expect(wrapper.get('[aria-label="纵轴缩放"]').text()).toContain('纵轴 1.25×')

    const rangeBeforeFrame = wrapper.get('.wave-monitor-zoom-range').text()
    await wrapper.setProps({ runtime: { ...fullFrame, frameId: 2 } })
    expect(wrapper.get('.wave-monitor-zoom-range').text()).toBe(rangeBeforeFrame)
    expect(wrapper.get('[aria-label="纵轴缩放"]').text()).toContain('纵轴 1.25×')

    await wrapper.get('[aria-label="重置波形缩放"]').trigger('click')
    expect(wrapper.get('.wave-monitor-zoom-range').text()).toContain('采样点 0–3999')
    expect(wrapper.get('[aria-label="纵轴缩放"]').text()).toContain('纵轴 1×')
  })
})
