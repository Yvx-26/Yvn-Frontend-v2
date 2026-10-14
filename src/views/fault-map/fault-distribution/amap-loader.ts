import type { AMapNamespace } from './types'

let loaderPromise: Promise<AMapNamespace> | undefined

export function loadAmap(key: string, securityCode: string): Promise<AMapNamespace> {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    if (!key) {
      reject(new Error('尚未配置高德地图 Key'))
      return
    }

    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode }
    }

    const callbackName = '__initializeCableFaultMap'
    const script = document.createElement('script')

    window.__initializeCableFaultMap = () => {
      delete window.__initializeCableFaultMap
      if (window.AMap) resolve(window.AMap)
      else reject(new Error('高德地图接口加载完成，但未返回地图对象'))
    }

    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=${callbackName}`
    script.async = true
    script.onerror = () => {
      delete window.__initializeCableFaultMap
      loaderPromise = undefined
      reject(new Error('高德地图资源加载失败，请检查网络或 Key 配置'))
    }
    document.head.appendChild(script)
  })

  return loaderPromise
}
