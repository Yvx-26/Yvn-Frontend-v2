import type { AMapNamespace } from './types'

let loaderPromise: Promise<AMapNamespace> | undefined

export function loadAmap(key: string, securityCode: string): Promise<AMapNamespace> {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (!key) return Promise.reject(new Error('尚未配置高德地图 Key'))
  if (loaderPromise) return loaderPromise

  const promise = new Promise<AMapNamespace>((resolve, reject) => {
    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode }
    }

    const callbackName = '__initializeCableFaultMap'
    const script = document.createElement('script')
    const timeout = setTimeout(() => fail('地图加载超时，请检查网络后重试'), 15000)
    const fail = (message: string) => {
      clearTimeout(timeout)
      delete window.__initializeCableFaultMap
      script.remove()
      reject(new Error(message))
    }

    window.__initializeCableFaultMap = () => {
      clearTimeout(timeout)
      delete window.__initializeCableFaultMap
      if (window.AMap) resolve(window.AMap)
      else fail('高德地图接口加载完成，但未返回地图对象')
    }

    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=${callbackName}`
    script.async = true
    script.onerror = () => fail('高德地图资源加载失败，请检查网络或 Key 配置')
    document.head.appendChild(script)
  })
  loaderPromise = promise.catch((error) => {
    loaderPromise = undefined
    throw error
  })
  return loaderPromise
}
