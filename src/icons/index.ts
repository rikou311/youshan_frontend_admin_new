const svgModules = import.meta.glob('./svg/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const svgMap = new Map<string, string>()

for (const [path, raw] of Object.entries(svgModules)) {
  const name = path.match(/\/([^/]+)\.svg$/)?.[1]
  if (name) {
    svgMap.set(name, raw)
  }
}

export function hasSvgIcon(name: string) {
  return svgMap.has(name)
}

export function getSvgIconRaw(name: string) {
  return svgMap.get(name)
}

export function listSvgIconNames() {
  return [...svgMap.keys()]
}
