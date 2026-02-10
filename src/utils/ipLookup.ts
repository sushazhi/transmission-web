/**
 * IP 国家/地区查询模块
 * 使用 ipwho.is 免费 API（支持 CORS，浏览器端可直接使用）
 */

// 私有 IP 范围
const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' }
]

// 检查是否为 IPv6
function isIPv6(ip: string): boolean {
  return ip.includes(':')
}

// 检查是否为私有 IP
function isPrivateIP(ip: string): boolean {
  if (!ip) return true

  // IPv6 地址检查
  if (isIPv6(ip)) {
    // 移除可能的方括号（如 [::1]）
    const cleanIp = ip.replace(/^\[|\]$/g, '')
    // IPv6 私有地址范围
    const ipv6PrivatePrefixes = [
      '::1', // 回环地址
      'fe80:', // 链路本地地址
      'fc', // 唯一本地地址 (ULA) fc00::/7
      'fd', // 唯一本地地址 (ULA) fc00::/7
      '::ffff:127.', // IPv4 映射的 IPv6 回环地址
      '::ffff:10.', // IPv4 映射的 IPv6 私有地址
      '::ffff:172.16.', // IPv4 映射的 IPv6 私有地址
      '::ffff:172.17.',
      '::ffff:172.18.',
      '::ffff:172.19.',
      '::ffff:172.20.',
      '::ffff:172.21.',
      '::ffff:172.22.',
      '::ffff:172.23.',
      '::ffff:172.24.',
      '::ffff:172.25.',
      '::ffff:172.26.',
      '::ffff:172.27.',
      '::ffff:172.28.',
      '::ffff:172.29.',
      '::ffff:172.30.',
      '::ffff:172.31.',
      '::ffff:192.168.' // IPv4 映射的 IPv6 私有地址
    ]
    return ipv6PrivatePrefixes.some((prefix) => cleanIp.toLowerCase().startsWith(prefix))
  }

  // IPv4 地址检查
  const num = ipToNumber(ip)
  if (num === null) return true

  for (const range of PRIVATE_IP_RANGES) {
    const startNum = ipToNumber(range.start)!
    const endNum = ipToNumber(range.end)!
    if (num >= startNum && num <= endNum) {
      return true
    }
  }
  return false
}

// IP 转数字
function ipToNumber(ip: string): number | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return null
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
}

// IP 缓存
const countryCodeCache = new Map<string, string>()

// 获取缓存中的国家代码
export function getCachedCountryCode(ip: string): string | undefined {
  return countryCodeCache.get(ip)
}

// 检查缓存中是否有该 IP
export function hasCachedCountryCode(ip: string): boolean {
  return countryCodeCache.has(ip)
}

// IP 查询状态跟踪
const pendingQueries = new Map<string, Promise<string>>()

// 查询失败记录（用于指数退避）
const failedQueries = new Map<string, number>()

// 全局查询队列控制
let lastQueryTime = 0
const MIN_QUERY_INTERVAL = 100 // 最小查询间隔 100ms
const MAX_RETRIES = 3 // 最大重试次数
const RETRY_DELAY_BASE = 1000 // 重试基础延迟 1秒

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 使用 ipwho.is 免费 API 查询 IP 国家代码（带速率限制和重试）
async function fetchCountryFromApi(ip: string, retryCount = 0): Promise<string | null> {
  try {
    // 检查该 IP 是否失败过多次
    const failCount = failedQueries.get(ip) || 0
    if (failCount >= MAX_RETRIES) {
      console.warn(`[ipLookup] IP ${ip} 已达到最大重试次数，跳过查询`)
      return null
    }

    // 速率限制：确保两次查询之间有最小间隔
    const now = Date.now()
    const timeSinceLastQuery = now - lastQueryTime
    if (timeSinceLastQuery < MIN_QUERY_INTERVAL) {
      await delay(MIN_QUERY_INTERVAL - timeSinceLastQuery)
    }
    lastQueryTime = Date.now()

    const response = await fetch(`https://ipwho.is/${ip}`, {
      cache: 'no-store'
    })

    // 处理 429（太多请求）错误
    if (response.status === 429) {
      if (retryCount < MAX_RETRIES) {
        const retryDelay = RETRY_DELAY_BASE * Math.pow(2, retryCount)
        console.warn(`[ipLookup] 触发速率限制，${retryDelay}ms 后重试...`)
        await delay(retryDelay)
        return fetchCountryFromApi(ip, retryCount + 1)
      }
      console.error(`[ipLookup] IP ${ip} 查询失败：达到最大重试次数`)
      failedQueries.set(ip, (failedQueries.get(ip) || 0) + 1)
      return null
    }

    if (!response.ok) {
      failedQueries.set(ip, (failedQueries.get(ip) || 0) + 1)
      return null
    }

    const data = await response.json()
    if (!data.success) {
      failedQueries.set(ip, (failedQueries.get(ip) || 0) + 1)
      return null
    }

    // 查询成功，清除失败记录
    failedQueries.delete(ip)
    return data.country_code === 'TW' ? 'CN' : data.country_code
  } catch (error) {
    console.error(`[ipLookup] 查询 IP ${ip} 失败:`, error)
    failedQueries.set(ip, (failedQueries.get(ip) || 0) + 1)
    return null
  }
}

// 查询 IP 对应的国家代码
export async function lookupCountryCode(ip: string): Promise<string | null> {
  if (!ip || isPrivateIP(ip)) return null

  const result = await fetchCountryFromApi(ip)
  if (result) {
    countryCodeCache.set(ip, result)
  }
  return result
}

// 异步获取国家代码（带缓存和防重复查询）
export function getCountryCodeAsync(ip: string): Promise<string> {
  if (!ip) return Promise.resolve('')
  if (isPrivateIP(ip)) return Promise.resolve('')

  // 检查缓存
  if (countryCodeCache.has(ip)) {
    return Promise.resolve(countryCodeCache.get(ip)!)
  }

  // 检查是否有正在进行的查询
  if (pendingQueries.has(ip)) {
    return pendingQueries.get(ip)!
  }

  // 发起新查询
  const promise: Promise<string> = lookupCountryCode(ip).then((code) => {
    pendingQueries.delete(ip)
    return code || ''
  })
  pendingQueries.set(ip, promise)
  return promise
}

// 获取国家显示（图片 + 代码）
export function getCountryDisplay(ip: string): string {
  const code = countryCodeCache.get(ip)

  if (!code) {
    // 后台异步查询
    getCountryCodeAsync(ip).then((resolvedCode) => {
      if (resolvedCode) {
        // 可以在这里更新 UI，如果需要实时更新
      }
    })
    return '🌐'
  }

  // 返回图片 + 国家代码
  const flagUrl = `https://flagcdn.com/w20/${code.toLowerCase()}.png`
  return `<img src="${flagUrl}" alt="${code}" class="country-flag" />&nbsp;&nbsp;${code}`
}

// 预加载多个 IP（带批处理和延迟）
export async function preloadCountryCodes(ips: string[]): Promise<void> {
  const BATCH_SIZE = 5 // 每批最多查询 5 个
  const BATCH_DELAY = 500 // 批次间延迟 500ms

  // 去重并过滤已缓存的 IP
  const uniqueIps = [...new Set(ips)].filter((ip) => !countryCodeCache.has(ip) && !isPrivateIP(ip))

  for (let i = 0; i < uniqueIps.length; i += BATCH_SIZE) {
    const batch = uniqueIps.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((ip) => getCountryCodeAsync(ip)))

    // 批次间延迟（除了最后一个批次）
    if (i + BATCH_SIZE < uniqueIps.length) {
      await delay(BATCH_DELAY)
    }
  }
}
