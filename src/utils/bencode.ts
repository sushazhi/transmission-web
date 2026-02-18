/**
 * Bencode 编码/解码工具
 * 用于生成 .torrent 文件
 */

// Bencode 类型定义
export type BencodeValue = string | number | BencodeValue[] | { [key: string]: BencodeValue }

/**
 * 编码字符串
 */
function encodeString(str: string): string {
  return `${str.length}:${str}`
}

/**
 * 编码数字
 */
function encodeNumber(num: number): string {
  return `i${num}e`
}

/**
 * 编码列表
 */
function encodeList(list: BencodeValue[]): string {
  const items = list.map((item) => encode(item)).join('')
  return `l${items}e`
}

/**
 * 编码字典
 */
function encodeDict(dict: { [key: string]: BencodeValue }): string {
  // 字典键必须按字典序排序
  const sortedKeys = Object.keys(dict).sort()
  const items = sortedKeys.map((key) => encodeString(key) + encode(dict[key])).join('')
  return `d${items}e`
}

/**
 * Bencode 编码
 */
export function encode(value: BencodeValue): string {
  if (typeof value === 'string') {
    return encodeString(value)
  } else if (typeof value === 'number') {
    return encodeNumber(value)
  } else if (Array.isArray(value)) {
    return encodeList(value)
  } else if (typeof value === 'object' && value !== null) {
    return encodeDict(value)
  }
  throw new Error(`Unsupported type: ${typeof value}`)
}

/**
 * 将字符串转换为 Uint8Array
 */
export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * 将 Uint8Array 转换为 Base64
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i])
  }
  return btoa(binary)
}

/**
 * 计算文件的 SHA1 哈希值
 */
export async function sha1(data: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  // 使用类型断言解决 TypeScript 类型兼容性问题
  return await crypto.subtle.digest('SHA-1', data as BufferSource)
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 分片大小选项 (字节)
 */
export const PIECE_SIZES = [
  { label: 'Auto', value: 0 }, // 0 表示自动
  { label: '16 KB', value: 16384 },
  { label: '32 KB', value: 32768 },
  { label: '64 KB', value: 65536 },
  { label: '128 KB', value: 131072 },
  { label: '256 KB', value: 262144 },
  { label: '512 KB', value: 524288 },
  { label: '1 MB', value: 1048576 },
  { label: '2 MB', value: 2097152 },
  { label: '4 MB', value: 4194304 },
  { label: '8 MB', value: 8388608 },
  { label: '16 MB', value: 16777216 }
]

/**
 * 根据文件总大小推荐分片大小
 */
export function recommendPieceSize(totalSize: number): number {
  // 目标：约 1000-2000 个分片
  const targetPieces = 1500
  let pieceSize = Math.ceil(totalSize / targetPieces)

  // 找到最接近的 2 的幂次方
  pieceSize = Math.pow(2, Math.ceil(Math.log2(pieceSize)))

  // 限制在合理范围内
  if (pieceSize < 16384) {
    pieceSize = 16384
  }
  if (pieceSize > 16777216) {
    pieceSize = 16777216
  }

  return pieceSize
}

/**
 * 文件信息接口
 */
export interface FileInfo {
  name: string
  size: number
  data?: ArrayBuffer
}

/**
 * 创建种子文件元数据
 */
export interface CreateTorrentOptions {
  name: string // 种子名称
  comment?: string // 注释
  createdBy?: string // 创建者
  creationDate?: number // 创建时间 (Unix 时间戳)
  pieceLength: number // 分片大小
  private?: boolean // 是否私有种子
  trackers: string[][] // Tracker 列表 (每组是一个 tier)
  webSeeds?: string[] // Web Seed URL 列表 (HTTP/FTP sources)
  files: FileInfo[] // 文件列表
  // 如果是单文件模式，files 只有一个元素
  // 如果是多文件模式，files 有多个元素，name 是目录名
}

/**
 * 计算分片的 SHA1 哈希
 */
async function computePieceHashes(
  files: FileInfo[],
  pieceLength: number
): Promise<Uint8Array> {
  const hashes: number[] = []
  let buffer = new Uint8Array(0)

  for (const file of files) {
    if (!file.data) {
      continue
    }
    const fileData = new Uint8Array(file.data)
    const newBuffer = new Uint8Array(buffer.length + fileData.length)
    newBuffer.set(buffer)
    newBuffer.set(fileData, buffer.length)
    buffer = newBuffer
  }

  // 计算每个分片的 SHA1
  for (let i = 0; i < buffer.length; i += pieceLength) {
    const piece = buffer.slice(i, Math.min(i + pieceLength, buffer.length))
    const hash = await sha1(piece)
    const hashArray = new Uint8Array(hash)
    for (let j = 0; j < hashArray.length; j++) {
      hashes.push(hashArray[j])
    }
  }

  return new Uint8Array(hashes)
}

/**
 * 创建种子文件
 */
export async function createTorrent(options: CreateTorrentOptions): Promise<Uint8Array> {
  const {
    name,
    comment,
    createdBy,
    creationDate,
    pieceLength,
    private: isPrivate,
    trackers,
    webSeeds,
    files
  } = options

  // 计算分片哈希
  const pieces = await computePieceHashes(files, pieceLength)

  // 构建 info 字典
  // 注意：pieces 字段不放在这里，因为它需要在编码时特殊处理
  const info: { [key: string]: BencodeValue } = {
    name,
    'piece length': pieceLength
  }

  if (isPrivate !== undefined) {
    info.private = isPrivate ? 1 : 0
  }

  // 计算总大小
  const totalLength = files.reduce((sum, f) => sum + f.size, 0)

  if (files.length === 1) {
    // 单文件模式
    info.length = files[0].size
  } else {
    // 多文件模式
    info.files = files.map((f) => ({
      length: f.size,
      path: f.name.split(/[/\\]/)
    }))
  }

  // 构建种子文件结构
  const torrent: { [key: string]: BencodeValue } = {
    info
  }

  // 添加创建时间
  torrent['creation date'] = creationDate || Math.floor(Date.now() / 1000)

  // 添加注释
  if (comment) {
    torrent.comment = comment
  }

  // 添加创建者
  if (createdBy) {
    torrent['created by'] = createdBy
  }

  // 添加 Tracker
  if (trackers.length > 0) {
    if (trackers.length === 1 && trackers[0].length === 1) {
      // 单个 tracker
      torrent.announce = trackers[0][0]
    } else {
      // 多个 tracker 或 tier
      torrent['announce-list'] = trackers
    }
  }

  // 添加 Web Seeds (url-list)
  if (webSeeds && webSeeds.length > 0) {
    if (webSeeds.length === 1) {
      torrent['url-list'] = webSeeds[0]
    } else {
      torrent['url-list'] = webSeeds
    }
  }

  // 编码种子文件
  // 注意：pieces 字段需要特殊处理，因为它包含原始字节
  return encodeTorrentToBytes(torrent, pieces)
}

/**
 * 编码种子文件，特殊处理 pieces 字段
 * 返回 Uint8Array 而不是字符串，以正确处理二进制数据
 */
function encodeTorrentToBytes(
  torrent: { [key: string]: BencodeValue },
  pieces: Uint8Array
): Uint8Array {
  const chunks: Uint8Array[] = []

  // 添加字节块的辅助函数
  const addBytes = (bytes: Uint8Array) => {
    chunks.push(bytes)
  }

  // 添加字符串的辅助函数
  const addString = (str: string) => {
    const encoder = new TextEncoder()
    chunks.push(encoder.encode(str))
  }

  // 编码字符串（bencode 格式）
  const encodeStr = (str: string) => {
    const encoder = new TextEncoder()
    const strBytes = encoder.encode(str)
    const lenStr = `${strBytes.length}:`
    chunks.push(encoder.encode(lenStr))
    chunks.push(strBytes)
  }

  // 编码整数
  const encodeInt = (num: number) => {
    addString(`i${num}e`)
  }

  // 编码值
  const encodeValue = (value: BencodeValue) => {
    if (typeof value === 'string') {
      encodeStr(value)
    } else if (typeof value === 'number') {
      encodeInt(value)
    } else if (Array.isArray(value)) {
      addString('l')
      for (const item of value) {
        encodeValue(item)
      }
      addString('e')
    } else if (typeof value === 'object' && value !== null) {
      addString('d')
      const sortedKeys = Object.keys(value).sort()
      for (const key of sortedKeys) {
        encodeStr(key)
        encodeValue(value[key])
      }
      addString('e')
    }
  }

  // 开始编码
  addString('d')
  const sortedKeys = Object.keys(torrent).sort()

  for (const key of sortedKeys) {
    encodeStr(key)

    if (key === 'info') {
      // 特殊处理 info 字典
      const info = torrent[key] as { [key: string]: BencodeValue }
      addString('d')
      const infoKeys = Object.keys(info).sort()

      for (const infoKey of infoKeys) {
        encodeStr(infoKey)

        if (infoKey === 'pieces') {
          // pieces 字段：长度 + : + 原始字节
          const lenStr = `${pieces.length}:`
          addString(lenStr)
          addBytes(pieces)
        } else {
          encodeValue(info[infoKey])
        }
      }

      addString('e')
    } else {
      encodeValue(torrent[key])
    }
  }

  addString('e')

  // 合并所有块
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

/**
 * 下载种子文件
 */
export function downloadTorrent(torrentData: Uint8Array, filename: string): void {
  // 使用类型断言解决 TypeScript 类型兼容性问题
  const blob = new Blob([torrentData as BlobPart], { type: 'application/x-bittorrent' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.torrent') ? filename : `${filename}.torrent`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
