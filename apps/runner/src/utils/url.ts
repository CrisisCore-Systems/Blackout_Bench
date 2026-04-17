export const normalizeTargetUrl = (value: string): string => {
  const candidate = value.trim()
  const url = new URL(candidate)

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only public http(s) URLs are supported in v1.')
  }

  return url.toString()
}
