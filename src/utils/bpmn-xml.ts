export function extractBpmnXml(modelData?: string | Record<string, unknown> | null): string {
  if (!modelData) {
    return ''
  }

  if (typeof modelData === 'string') {
    const trimmed = modelData.trim()
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) {
      return trimmed
    }
    return ''
  }

  if (typeof modelData === 'object') {
    const record = modelData as Record<string, unknown>
    const xml = record.xml ?? record.modelData
    if (typeof xml === 'string') {
      return extractBpmnXml(xml)
    }
  }

  return ''
}

export function randomBpmnId() {
  return Math.random().toString(36).slice(-8)
}

export function createEmptyBpmnXml() {
  const processId = `process_${randomBpmnId()}`
  const processName = `name_${randomBpmnId()}`
  return `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:bioc="http://bpmn.io/schema/bpmn/biocolor/1.0" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:flowable="http://flowable.org/bpmn" targetNamespace="http://www.flowable.org/processdef">
  <process id="${processId}" name="${processName}">
    <startEvent id="startNode1" name="开始" />
  </process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_flow">
    <bpmndi:BPMNPlane id="BPMNPlane_flow" bpmnElement="${processId}">
      <bpmndi:BPMNShape id="BPMNShape_startNode1" bpmnElement="startNode1" bioc:stroke="">
        <omgdc:Bounds x="240" y="200" width="30" height="30" />
        <bpmndi:BPMNLabel>
          <omgdc:Bounds x="242" y="237" width="23" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</definitions>`
}

export function downloadBpmnXml(xml: string, filename = 'process') {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.bpmn20.xml`
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(filename: string, data: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
