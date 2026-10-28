import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { usePolling } from '../composables/usePolling'

afterEach(() => vi.useRealTimers())

describe('polling cancellation', () => {
  it('waits for a request to finish instead of overlapping intervals', async () => {
    vi.useFakeTimers()
    let finish!: () => void
    const task = vi.fn<() => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const wrapper = mount(
      defineComponent({
        setup() {
          usePolling(task, 1000)
          return () => null
        },
      }),
    )
    await vi.advanceTimersByTimeAsync(5000)
    expect(task).toHaveBeenCalledTimes(1)
    finish()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(task).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('aborts on pause, refreshes immediately on resume and aborts on unmount', async () => {
    const active = ref(true)
    const signals: AbortSignal[] = []
    const task = vi.fn<(signal: AbortSignal) => Promise<void>>((signal) => {
      signals.push(signal)
      return new Promise<void>(() => {})
    })
    const wrapper = mount(
      defineComponent({
        setup() {
          usePolling(task, 1000, active)
          return () => null
        },
      }),
    )
    active.value = false
    await nextTick()
    expect(signals[0]!.aborted).toBe(true)
    active.value = true
    await nextTick()
    expect(task).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    expect(signals[1]!.aborted).toBe(true)
  })
})
