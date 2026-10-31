import { describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LineManagement from '../views/settings/LineManagement.vue'
import { useInfrastructureStore } from '../stores/infrastructure'
import { device, line } from './fixtures/infrastructure'
import { routeLengthMetres } from '../domain/infrastructure/line-length'

vi.mock('../views/settings/line-management/components/LineRouteMap.vue', () => ({
  default: { template: '<div />' },
}))

describe('line management automatic length', () => {
  it('updates the readonly field after binding, reordering, coordinate updates and removal', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useInfrastructureStore()
    store.devices = [1, 2, 3].map((index) => ({
      ...device(`D${index}`, 'locator'),
      coordinate: [index, 0] as [number, number],
    }))
    store.lines = [line('L1', store.devices.slice(0, 2))]
    const wrapper = mount(LineManagement, { global: { plugins: [pinia] } })
    const length = () => (wrapper.get('input[readonly]').element as HTMLInputElement).value
    expect(Number(length())).toBeCloseTo(111195.08, 3)
    await wrapper.get('select[aria-label="选择待绑定设备"]').setValue('D3')
    await wrapper.get('.line-management-bind-device button').trigger('click')
    expect(Number(length())).toBeCloseTo(222390.16, 3)
    await wrapper.findAll('button[aria-label="设备上移"]')[2]!.trigger('click')
    expect(Number(length())).toBeCloseTo(333585.241, 3)
    store.devices[0]!.coordinate = [0.5, 0]
    await flushPromises()
    expect(length()).toBe(
      routeLengthMetres([
        { sequence: 1, coordinate: [0.5, 0] },
        { sequence: 2, coordinate: [3, 0] },
        { sequence: 3, coordinate: [2, 0] },
      ]),
    )
    await wrapper.findAll('button[aria-label="解除设备绑定"]')[2]!.trigger('click')
    await wrapper.findAll('button[aria-label="解除设备绑定"]')[1]!.trigger('click')
    expect(length()).toBe('0.000')
    wrapper.unmount()
  })
})
