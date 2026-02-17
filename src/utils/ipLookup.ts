/**
 * IP 国家/地区查询模块
 * 使用 MaxMind GeoLite2 数据库进行离线查询
 */

import { loadDatabase, getDatabaseVersion as getMaxMindDatabaseVersion, isDatabaseLoaded } from './maxmindLoader'
import type { CountryResponse } from 'mmdb-lib'
import { countries } from 'countries-list'

const PRIVATE_IP_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' }
]

function isIPv6(ip: string): boolean {
  return ip.includes(':')
}

function isPrivateIP(ip: string): boolean {
  if (!ip) return true
  if (isIPv6(ip)) {
    const cleanIp = ip.replace(/^\[|\]$/g, '')
    const ipv6PrivatePrefixes = ['::1', 'fe80:', 'fc', 'fd', '::ffff:127.', '::ffff:10.', '::ffff:172.16.', '::ffff:172.17.']
    return ipv6PrivatePrefixes.some((prefix) => cleanIp.toLowerCase().startsWith(prefix))
  }
  const num = ipToNumber(ip)
  if (num === null) return true
  for (const range of PRIVATE_IP_RANGES) {
    const startNum = ipToNumber(range.start)!
    const endNum = ipToNumber(range.end)!
    if (num >= startNum && num <= endNum) return true
  }
  return false
}

function ipToNumber(ip: string): number | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(isNaN)) return null
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
}

const countryCodeCache = new Map<string, string>()

interface CountryInfo {
  code: string
  name: string
  timestamp: number
}

const countryInfoCache = new Map<string, CountryInfo>()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000
const MAX_CACHE_SIZE = 2000

export function getCachedCountryCode(ip: string): string | undefined {
  return countryCodeCache.get(ip)
}

export function hasCachedCountryCode(ip: string): boolean {
  return countryCodeCache.has(ip)
}

export function getCountryName(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return countryCode || ''
  const upperCode = countryCode.toUpperCase()
  const country = countries[upperCode as keyof typeof countries]
  return country?.name || countryCode
}

export async function lookupCountryInfo(ip: string): Promise<{ code: string; name: string } | null> {
  if (!ip || isPrivateIP(ip)) return null
  const cached = countryInfoCache.get(ip)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return { code: cached.code, name: cached.name }
  const code = await lookupCountryCode(ip)
  if (!code) return null
  const name = getCountryName(code)
  const countryInfo: CountryInfo = { code, name, timestamp: Date.now() }
  countryInfoCache.set(ip, countryInfo)
  if (countryInfoCache.size > MAX_CACHE_SIZE) {
    const oldestKey = countryInfoCache.keys().next().value
    if (oldestKey !== undefined) countryInfoCache.delete(oldestKey)
  }
  return { code, name }
}

const pendingQueries = new Map<string, Promise<string>>()

export async function lookupCountryCode(ip: string): Promise<string | null> {
  if (!ip || isPrivateIP(ip)) return null
  try {
    const reader = await loadDatabase()
    const response = reader.get(ip) as any
    if (!response || Object.keys(response).length === 0) return null
    const countryCode = response.country_code || response.country?.iso_code || response.registered_country?.iso_code || null
    if (countryCode) {
      const code = countryCode === 'TW' ? 'CN' : countryCode
      countryCodeCache.set(ip, code)
      return code
    }
    return null
  } catch (error) {
    console.error(`[ipLookup] IP ${ip} 查询失败:`, error)
    return null
  }
}

export function getCountryCodeAsync(ip: string): Promise<string> {
  if (!ip) return Promise.resolve('')
  if (isPrivateIP(ip)) return Promise.resolve('')
  if (countryCodeCache.has(ip)) return Promise.resolve(countryCodeCache.get(ip)!)
  if (pendingQueries.has(ip)) return pendingQueries.get(ip)!
  const promise: Promise<string> = lookupCountryCode(ip).then((code) => {
    pendingQueries.delete(ip)
    return code || ''
  })
  pendingQueries.set(ip, promise)
  return promise
}

async function batchLookupIps(ips: string[], batchSize = 50): Promise<void> {
  const batches = []
  for (let i = 0; i < ips.length; i += batchSize) batches.push(ips.slice(i, i + batchSize))
  let delay = 0
  for (const batch of batches) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay))
    delay = 50
    await Promise.allSettled(batch.map((ip) => lookupCountryCode(ip).then((code) => { if (code) countryCodeCache.set(ip, code) })))
  }
}

export async function preloadCountryCodes(ips: string[]): Promise<void> {
  const uniqueIps = [...new Set(ips)].filter((ip) => !countryCodeCache.has(ip) && !isPrivateIP(ip))
  if (uniqueIps.length === 0) return
  console.log(`[ipLookup] 开始预加载 ${uniqueIps.length} 个 IP`)
  const batchStartTime = performance.now()
  await loadDatabase()
  const queryStartTime = performance.now()
  await batchLookupIps(uniqueIps, 50)
  const queryTime = ((performance.now() - queryStartTime) / 1000).toFixed(3)
  const totalTime = ((performance.now() - batchStartTime) / 1000).toFixed(3)
  const successCount = Array.from(countryCodeCache.entries()).filter(([ip]) => uniqueIps.includes(ip)).length
  console.log(`[ipLookup] 预加载完成: ${successCount}/${uniqueIps.length} 成功, 总耗时: ${totalTime}秒 (查询: ${queryTime}s)`)
}

export function getDatabaseVersion(): string {
  return getMaxMindDatabaseVersion()
}

export function isDatabaseReady(): boolean {
  return isDatabaseLoaded()
}
