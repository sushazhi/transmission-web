/**
 * MaxMind GeoLite2 数据库加载器
 * 支持 IndexedDB 缓存，避免重复下载
 */

import * as mmdb from 'mmdb-lib'
import type { CountryResponse } from 'mmdb-lib'

const CDN_VERSION = '2.3.2026021419'
const FILENAME = 'geolite2-country.mmdb'
const CDN_URL = `https://fastly.jsdelivr.net/npm/@ip-location-db/geolite2-country-mmdb@${CDN_VERSION}/${FILENAME}`

const DB_NAME = 'MaxMindGeoDB'
const DB_VERSION = 1
const STORE_NAME = 'databases'

interface DatabaseMetadata {
  version: string
  loadedAt: number
  source: 'cdn' | 'cache'
}

let databaseReader: mmdb.Reader<CountryResponse> | null = null
let databaseMetadata: DatabaseMetadata | null = null
let loadingPromise: Promise<mmdb.Reader<CountryResponse>> | null = null

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'version' })
    }
  })
}

async function loadFromCache(): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(CDN_VERSION)

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const result = request.result as { version: string; data: ArrayBuffer } | undefined
        resolve(result?.data || null)
      }
      request.onerror = () => resolve(null)
    })
  } catch (error) {
    console.warn('[maxmindLoader] 缓存读取失败:', error)
    return null
  }
}

async function saveToCache(data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ version: CDN_VERSION, data, timestamp: Date.now() })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.warn('[maxmindLoader] 缓存保存失败:', error)
  }
}

async function fetchFromCDN(): Promise<ArrayBuffer> {
  const response = await fetch(CDN_URL, { cache: 'force-cache', signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()
  const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2)
  console.log(`[maxmindLoader] CDN 下载成功，大小: ${sizeMB}MB`)
  saveToCache(arrayBuffer).catch(() => {})
  return arrayBuffer
}

async function loadDatabaseBuffer(): Promise<ArrayBuffer> {
  const cached = await loadFromCache()
  if (cached) return cached
  return fetchFromCDN()
}

export async function loadDatabase(): Promise<mmdb.Reader<CountryResponse>> {
  if (databaseReader !== null) return databaseReader
  if (loadingPromise !== null) return loadingPromise

  const startTime = performance.now()

  loadingPromise = (async () => {
    const buffer = await loadDatabaseBuffer()
    const arrayBuffer = Buffer.from(buffer)
    const isFromCache = await loadFromCache().then((cachedData) => cachedData?.byteLength === buffer.byteLength)
    const reader = new mmdb.Reader<CountryResponse>(arrayBuffer)
    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2)

    databaseMetadata = {
      version: CDN_VERSION,
      loadedAt: Date.now(),
      source: isFromCache ? 'cache' : 'cdn'
    }

    console.log(
      `[maxmindLoader] 数据库加载成功 (${isFromCache ? '缓存' : 'CDN'})，版本: ${CDN_VERSION}，节点数: ${reader.metadata.nodeCount}`
    )

    databaseReader = reader
    return reader
  })()
    .catch((error) => {
      console.error('[maxmindLoader] 数据库加载失败:', error)
      throw error
    })
    .finally(() => {
      loadingPromise = null
    })

  return loadingPromise
}

export function getDatabaseMetadata(): DatabaseMetadata | null {
  return databaseMetadata
}

export function getDatabaseVersion(): string {
  return databaseMetadata?.version || '未加载'
}

export function isDatabaseLoaded(): boolean {
  return databaseReader !== null
}

export function clearDatabaseCache(): void {
  databaseReader = null
  databaseMetadata = null
  loadingPromise = null
  indexedDB.deleteDatabase(DB_NAME).onsuccess = () => {
    console.log('[maxmindLoader] IndexedDB 缓存已清除')
  }
}
