/** Map SDK content is ordinary DOM: never interpolate device/user text as HTML. */
export function markerContent(className: string, text: string, detail?: string) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = className
  const point = document.createElement('i')
  const label = document.createElement('span')
  if (detail === undefined) label.textContent = text
  else {
    const title = document.createElement('strong')
    title.textContent = text
    const small = document.createElement('small')
    small.textContent = detail
    label.append(title, small)
  }
  marker.append(point, label)
  return marker
}

export function nodeMarkerContent(className: string, sequence: number, description: string) {
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = className
  marker.title = description
  marker.setAttribute('aria-label', description)
  const number = document.createElement('i')
  number.textContent = String(sequence).padStart(2, '0')
  number.setAttribute('aria-hidden', 'true')
  marker.append(number)
  return marker
}
