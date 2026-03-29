type PublishLog = {
  ts: number
  platformId: string
  postId?: string
  event: string
  message?: string
  retryCount?: number
}

const MAX = 200
const buffer: PublishLog[] = []

export function pushLog(log: PublishLog) {
  buffer.push(log)
  if (buffer.length > MAX) buffer.shift()
}

export function getLogs(): PublishLog[] {
  return buffer.slice().reverse()
}
