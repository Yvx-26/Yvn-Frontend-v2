<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { TopologyDevice, TopologyFocusMode, TopologyLine } from '../types'

interface Props {
  lines: TopologyLine[]
  focusMode: TopologyFocusMode
  selectedDeviceId: string
}

interface FlowPulse {
  mesh: THREE.Mesh
  curve: THREE.CatmullRomCurve3
  phase: number
  speed: number
}

interface PickResult {
  device?: TopologyDevice
  line?: TopologyLine
  label: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'select-device': [device: TopologyDevice]
  'select-line': [line: TopologyLine]
  'reset-scene': []
}>()

const container = ref<HTMLDivElement>()
const webglError = ref('')
const hoveredLabel = ref('')
const hoverPosition = ref({ x: 0, y: 0 })

let scene: THREE.Scene | undefined
let camera: THREE.PerspectiveCamera | undefined
let renderer: THREE.WebGLRenderer | undefined
let controls: OrbitControls | undefined
let contentGroup: THREE.Group | undefined
let resizeObserver: ResizeObserver | undefined
let animationFrame = 0
let lastFrameTime = 0
let pointerDown = { x: 0, y: 0 }
let isDocumentVisible = true

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pickableObjects: THREE.Object3D[] = []
const flowPulses: FlowPulse[] = []

function statusColor(status: TopologyDevice['status']) {
  if (status === 'online') return 0x31d381
  if (status === 'warning') return 0xf5a623
  return 0x718797
}

function makeTextSprite(text: string, color: string, scale = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Sprite()

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(4, 21, 37, 0.86)'
  context.strokeStyle = 'rgba(69, 196, 235, 0.48)'
  context.lineWidth = 3
  context.beginPath()
  context.roundRect(5, 5, 502, 118, 16)
  context.fill()
  context.stroke()
  context.fillStyle = color
  context.font = '600 40px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, 256, 64, 470)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    opacity: 0.96,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(3.7 * scale, 0.92 * scale, 1)
  return sprite
}

function disposeMaterial(material: THREE.Material) {
  const materialWithMaps = material as THREE.Material & Record<string, unknown>
  Object.values(materialWithMaps).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose()
  })
  material.dispose()
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial)
    else if (mesh.material) disposeMaterial(mesh.material)
  })
}

function clearContent() {
  if (!contentGroup) return
  disposeObject(contentGroup)
  contentGroup.clear()
  pickableObjects.length = 0
  flowPulses.length = 0
}

function buildSceneContent() {
  if (!contentGroup) return
  clearContent()

  const lineCount = Math.max(props.lines.length, 1)
  props.lines.forEach((line, lineIndex) => {
    const isDimmed = props.focusMode !== 'all' && props.focusMode !== line.id
    const laneZ = (lineIndex - (lineCount - 1) / 2) * 5.2
    const deviceCount = Math.max(line.devices.length, 1)
    const points = line.devices.map((_, index) => {
      const ratio = deviceCount === 1 ? 0.5 : index / (deviceCount - 1)
      return new THREE.Vector3(
        THREE.MathUtils.lerp(-9.5, 9.5, ratio),
        0.48 + Math.sin(ratio * Math.PI) * 0.24,
        laneZ + Math.sin(index * 1.45 + lineIndex) * 0.34,
      )
    })

    if (points.length === 0) {
      points.push(new THREE.Vector3(-2.2, 0.48, laneZ), new THREE.Vector3(2.2, 0.48, laneZ))
    } else if (points.length === 1) {
      const onlyPoint = points[0]!
      points.unshift(onlyPoint.clone().add(new THREE.Vector3(-2.2, 0, 0)))
      points.push(onlyPoint.clone().add(new THREE.Vector3(2.2, 0, 0)))
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.22)
    const color = new THREE.Color(line.color)
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: isDimmed ? 0.08 : 0.62,
      roughness: 0.38,
      metalness: 0.42,
      transparent: true,
      opacity: isDimmed ? 0.12 : 0.9,
    })
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(48, points.length * 24), 0.13, 10, false),
      tubeMaterial,
    )
    tube.userData = { line, label: `${line.name} · ${line.statusLabel}` }
    contentGroup!.add(tube)
    pickableObjects.push(tube)

    const lineLabel = makeTextSprite(`${line.name}  ${line.length}`, line.color, 1.05)
    // 线路标签与首个设备标签使用不同的高度和水平锚点，避免默认视角下互相遮挡。
    lineLabel.position.copy(points[0]!).add(new THREE.Vector3(-0.45, 3.4, 0))
    if (lineLabel.material instanceof THREE.SpriteMaterial) {
      lineLabel.material.opacity = isDimmed ? 0.18 : 0.95
    }
    contentGroup!.add(lineLabel)

    if (!isDimmed) {
      for (let pulseIndex = 0; pulseIndex < 3; pulseIndex += 1) {
        const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0xd9fbff })
        const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), pulseMaterial)
        contentGroup!.add(pulse)
        flowPulses.push({
          mesh: pulse,
          curve,
          phase: pulseIndex / 3 + lineIndex * 0.13,
          speed: 0.055 + lineIndex * 0.006,
        })
      }
    }

    line.devices.forEach((device, deviceIndex) => {
      const position =
        points[Math.min(line.devices.length === 1 ? 1 : deviceIndex, points.length - 1)]!
      const group = new THREE.Group()
      group.position.copy(position)
      group.userData = { device, line, label: `${device.name} · ${device.statusLabel}` }

      const deviceColor = statusColor(device.status)
      const opacity = isDimmed ? 0.2 : 1
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x0b2942,
        emissive: deviceColor,
        emissiveIntensity: device.id === props.selectedDeviceId ? 0.68 : 0.18,
        metalness: 0.55,
        roughness: 0.35,
        transparent: true,
        opacity,
      })
      const signalMaterial = new THREE.MeshStandardMaterial({
        color: deviceColor,
        emissive: deviceColor,
        emissiveIntensity: device.id === props.selectedDeviceId ? 1.5 : 0.85,
        transparent: true,
        opacity,
      })

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.18, 24), baseMaterial)
      base.position.y = 0.08
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.86, 16), baseMaterial)
      body.position.y = 0.56
      const signal = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 20), signalMaterial)
      signal.position.y = 1.15
      group.add(base, body, signal)

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.035, 10, 42),
        new THREE.MeshBasicMaterial({
          color: deviceColor,
          transparent: true,
          opacity: device.id === props.selectedDeviceId ? 0.95 : 0.26,
        }),
      )
      halo.rotation.x = Math.PI / 2
      halo.position.y = 1.15
      group.add(halo)

      if (device.id === props.selectedDeviceId) {
        const selectionRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.78, 0.045, 12, 48),
          new THREE.MeshBasicMaterial({ color: 0xf0fdff, transparent: true, opacity: 0.9 }),
        )
        selectionRing.rotation.x = Math.PI / 2
        selectionRing.position.y = 0.05
        group.add(selectionRing)
      }

      const deviceLabel = makeTextSprite(device.name, isDimmed ? '#607786' : '#e8faff', 0.88)
      deviceLabel.position.y = 2.05
      group.add(deviceLabel)

      contentGroup!.add(group)
      pickableObjects.push(group)
    })
  })
}

function frameScene() {
  if (!contentGroup || !camera || !controls) return
  const dampingEnabled = controls.enableDamping
  // 先在无阻尼状态下结算并清空上一轮拖动的惯性量，再写入新的标准视角。
  controls.enableDamping = false
  controls.update()
  const bounds = new THREE.Box3().setFromObject(contentGroup)
  const center = bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3())
  const size = bounds.isEmpty() ? 18 : Math.max(...bounds.getSize(new THREE.Vector3()).toArray())
  const distance = Math.max(14, size * 0.96)
  controls.target.copy(center)
  camera.position.copy(center).add(new THREE.Vector3(distance * 0.68, distance * 0.58, distance))
  camera.near = 0.1
  camera.far = Math.max(120, distance * 8)
  camera.updateProjectionMatrix()
  controls.update()
  controls.saveState()
  controls.enableDamping = dampingEnabled
}

function findPick(object: THREE.Object3D | null): PickResult | undefined {
  let current = object
  while (current && current !== scene) {
    if (current.userData.device || current.userData.line) {
      return {
        device: current.userData.device as TopologyDevice | undefined,
        line: current.userData.line as TopologyLine | undefined,
        label: String(current.userData.label ?? ''),
      }
    }
    current = current.parent
  }
  return undefined
}

function pickAt(event: PointerEvent) {
  if (!renderer || !camera) return undefined
  const rect = renderer.domElement.getBoundingClientRect()
  if (!rect.width || !rect.height) return undefined
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  return findPick(raycaster.intersectObjects(pickableObjects, true)[0]?.object ?? null)
}

function handlePointerMove(event: PointerEvent) {
  const picked = pickAt(event)
  if (renderer) renderer.domElement.style.cursor = picked ? 'pointer' : 'grab'
  hoveredLabel.value = picked?.label ?? ''
  if (container.value) {
    const rect = container.value.getBoundingClientRect()
    hoverPosition.value = { x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12 }
  }
}

function handlePointerDown(event: PointerEvent) {
  pointerDown = { x: event.clientX, y: event.clientY }
  hoveredLabel.value = ''
}

function handlePointerUp(event: PointerEvent) {
  const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y)
  if (moved > 5) return
  const picked = pickAt(event)
  if (picked?.device) emit('select-device', picked.device)
  else if (picked?.line) emit('select-line', picked.line)
}

function resizeRenderer() {
  if (!container.value || !renderer || !camera) return
  const width = Math.max(container.value.clientWidth, 1)
  const height = Math.max(container.value.clientHeight, 1)
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function createOrbitControls() {
  if (!camera || !renderer) return
  controls?.dispose()
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.075
  controls.enablePan = true
  controls.minDistance = 5
  controls.maxDistance = 62
  controls.maxPolarAngle = Math.PI * 0.48
  controls.screenSpacePanning = true
}

function animate(time: number) {
  animationFrame = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera || !isDocumentVisible) return
  const delta = Math.min((time - lastFrameTime) / 1000, 0.05)
  lastFrameTime = time
  flowPulses.forEach((pulse) => {
    pulse.phase = (pulse.phase + pulse.speed * delta) % 1
    pulse.mesh.position.copy(pulse.curve.getPointAt(pulse.phase))
  })
  controls?.update()
  renderer.render(scene, camera)
}

function handleVisibilityChange() {
  isDocumentVisible = !document.hidden
  lastFrameTime = performance.now()
}

onMounted(async () => {
  await nextTick()
  if (!container.value) return

  try {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x061727)
    scene.fog = new THREE.FogExp2(0x061727, 0.018)

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 180)
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    renderer.domElement.setAttribute('aria-label', '可旋转、缩放和平移的线路三维拓扑图')
    container.value.appendChild(renderer.domElement)

    createOrbitControls()

    scene.add(new THREE.HemisphereLight(0x8fdfff, 0x07111d, 1.75))
    const keyLight = new THREE.DirectionalLight(0xd7f6ff, 2.4)
    keyLight.position.set(9, 16, 11)
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(0x00cfff, 26, 48)
    rimLight.position.set(-10, 7, -8)
    scene.add(rimLight)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 38),
      new THREE.MeshStandardMaterial({ color: 0x071d30, roughness: 0.92, metalness: 0.08 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.03
    scene.add(ground)
    const grid = new THREE.GridHelper(52, 52, 0x17668a, 0x0d3852)
    grid.position.y = 0
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material]
    gridMaterials.forEach((material) => {
      material.transparent = true
      material.opacity = 0.34
    })
    scene.add(grid)

    contentGroup = new THREE.Group()
    scene.add(contentGroup)
    buildSceneContent()
    resizeRenderer()
    frameScene()

    renderer.domElement.addEventListener('pointermove', handlePointerMove)
    renderer.domElement.addEventListener('pointerdown', handlePointerDown)
    renderer.domElement.addEventListener('pointerup', handlePointerUp)
    renderer.domElement.addEventListener('pointerleave', () => {
      hoveredLabel.value = ''
    })
    resizeObserver = new ResizeObserver(resizeRenderer)
    resizeObserver.observe(container.value)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    animationFrame = requestAnimationFrame(animate)
  } catch (error) {
    webglError.value = '当前浏览器无法启动 WebGL 3D，已可切换回 2D 拓扑。'
    console.error('[line-topology-3d] WebGL initialization failed', error)
  }
})

watch(
  () => [props.lines, props.focusMode],
  async () => {
    await nextTick()
    buildSceneContent()
    frameScene()
  },
  { deep: true },
)

watch(
  () => props.selectedDeviceId,
  () => buildSceneContent(),
)

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (renderer) {
    renderer.domElement.removeEventListener('pointermove', handlePointerMove)
    renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
    renderer.domElement.removeEventListener('pointerup', handlePointerUp)
  }
  controls?.dispose()
  clearContent()
  if (scene) disposeObject(scene)
  renderer?.dispose()
  renderer?.domElement.remove()
})
</script>

<template>
  <section class="topology-3d-scene" aria-label="三维线路拓扑">
    <div ref="container" class="topology-3d-viewport"></div>

    <div class="topology-3d-badge">
      <i></i>
      WebGL 实时 3D
    </div>

    <button
      class="topology-3d-reset"
      type="button"
      title="恢复默认观察角度"
      @click="emit('reset-scene')"
    >
      复位视角
    </button>

    <div class="topology-3d-guide">
      <span>左键旋转</span>
      <span>滚轮缩放</span>
      <span>右键平移</span>
      <span>点击设备查看详情</span>
    </div>

    <div
      v-if="hoveredLabel"
      class="topology-3d-tooltip"
      :style="{ left: `${hoverPosition.x}px`, top: `${hoverPosition.y}px` }"
    >
      {{ hoveredLabel }}
    </div>

    <div v-if="webglError" class="topology-3d-error">
      <strong>3D 场景加载失败</strong>
      <span>{{ webglError }}</span>
    </div>
  </section>
</template>
