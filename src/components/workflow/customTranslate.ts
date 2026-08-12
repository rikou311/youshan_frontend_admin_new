import translations from './zh'

export default function customTranslate(template: string, replacements?: Record<string, string>) {
  const map = replacements || {}
  const dict = translations as Record<string, string>
  let result = dict[template] || template

  return result.replace(/{([^}]+)}/g, (_, key: string) => {
    const value = map[key]
    if (value != null && dict[value] != null) {
      return dict[value]
    }
    return value || `{${key}}`
  })
}
