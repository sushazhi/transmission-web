/**
 * 种子文件解析工具
 * 用于解析 .torrent 文件并提取文件列表信息
 */

export interface TorrentFileInfo {
  /** 文件路径 */
  path: string
  /** 文件大小（字节） */
  length: number
  /** 文件索引 */
  index: number
}

export interface TorrentInfo {
  /** 种子名称 */
  name: string
  /** 总大小（字节） */
  totalSize: number
  /** 文件列表 */
  files: TorrentFileInfo[]
  /** 创建时间 */
  creationDate?: number
  /** 创建者 */
  createdBy?: string
  /** 注释 */
  comment?: string
  /** 是否为私有种子 */
  isPrivate?: boolean
  /** 分片大小 */
  pieceLength?: number
  /** 分片数量 */
  pieceCount?: number
}

/**
 * 解析 Bencode 编码的数据
 */
class BencodeParser {
  private data: Uint8Array
  private pos: number = 0

  constructor(data: Uint8Array) {
    this.data = data
  }

  parse(): any {
    const char = this.peek()
    if (char === undefined) {
      throw new Error('Unexpected end of data')
    }

    if (char >= 0x30 && char <= 0x39) {
      // 数字开头，是字符串
      return this.parseString()
    } else if (char === 0x69) {
      // 'i' 开头，是整数
      return this.parseInt()
    } else if (char === 0x6c) {
      // 'l' 开头，是列表
      return this.parseList()
    } else if (char === 0x64) {
      // 'd' 开头，是字典
      return this.parseDict()
    }

    throw new Error(`Unknown type at position ${this.pos}: ${String.fromCharCode(char)}`)
  }

  private peek(): number | undefined {
    if (this.pos >= this.data.length) {
      return undefined
    }
    return this.data[this.pos]
  }

  private read(): number {
    if (this.pos >= this.data.length) {
      throw new Error('Unexpected end of data')
    }
    return this.data[this.pos++]
  }

  private parseString(): string | Uint8Array {
    // 读取长度
    let lengthStr = ''
    while (true) {
      const char = this.read()
      if (char === 0x3a) {
        // ':' 分隔符
        break
      }
      lengthStr += String.fromCharCode(char)
    }

    const length = parseInt(lengthStr, 10)
    if (isNaN(length)) {
      throw new Error(`Invalid string length: ${lengthStr}`)
    }

    // 读取字符串内容
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = this.read()
    }

    // 尝试转换为 UTF-8 字符串
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      return decoder.decode(bytes)
    } catch {
      // 如果不是有效的 UTF-8，返回原始字节数组
      return bytes
    }
  }

  private parseInt(): number {
    // 跳过 'i'
    this.read()

    // 读取数字
    let numStr = ''
    while (true) {
      const char = this.read()
      if (char === 0x65) {
        // 'e' 结束符
        break
      }
      numStr += String.fromCharCode(char)
    }

    return parseInt(numStr, 10)
  }

  private parseList(): any[] {
    // 跳过 'l'
    this.read()

    const list: any[] = []
    while (this.peek() !== 0x65) {
      // 'e' 结束符
      list.push(this.parse())
    }
    // 跳过 'e'
    this.read()

    return list
  }

  private parseDict(): Record<string, any> {
    // 跳过 'd'
    this.read()

    const dict: Record<string, any> = {}
    while (this.peek() !== 0x65) {
      // 'e' 结束符
      const key = this.parse()
      if (typeof key !== 'string') {
        throw new Error('Dictionary key must be a string')
      }
      const value = this.parse()
      dict[key] = value
    }
    // 跳过 'e'
    this.read()

    return dict
  }
}

/**
 * 解析 Uint8Array 格式的种子文件
 */
function parseTorrentData(data: Uint8Array): TorrentInfo {
  const parser = new BencodeParser(data)
  const torrent = parser.parse() as Record<string, any>

  const info = torrent.info as Record<string, any>
  if (!info) {
    throw new Error('Invalid torrent file: missing info section')
  }

  // 获取名称
  const name = typeof info.name === 'string' ? info.name : decodeBytes(info.name as Uint8Array)

  // 获取文件列表
  const files: TorrentFileInfo[] = []
  let totalSize = 0

  if (info.files && Array.isArray(info.files)) {
    // 多文件模式
    info.files.forEach((file: any, index: number) => {
      let path: string
      if (file.path && Array.isArray(file.path)) {
        // path 是路径段数组
        path = file.path.map((p: string | Uint8Array) =>
          typeof p === 'string' ? p : decodeBytes(p)
        ).join('/')
      } else if (file.path) {
        path = typeof file.path === 'string' ? file.path : decodeBytes(file.path as Uint8Array)
      } else {
        path = name
      }

      const length = file.length as number
      totalSize += length
      files.push({
        path,
        length,
        index
      })
    })
  } else {
    // 单文件模式
    const length = (info.length as number) || 0
    totalSize = length
    files.push({
      path: name,
      length,
      index: 0
    })
  }

  // 获取其他信息
  const pieceLength = info['piece length'] as number | undefined
  const pieces = info.pieces as Uint8Array | undefined
  const pieceCount = pieces ? pieces.length / 20 : undefined

  return {
    name,
    totalSize,
    files,
    creationDate: torrent['creation date'] as number | undefined,
    createdBy: typeof torrent['created by'] === 'string'
      ? torrent['created by']
      : torrent['created by'] ? decodeBytes(torrent['created by'] as Uint8Array) : undefined,
    comment: typeof torrent.comment === 'string'
      ? torrent.comment
      : torrent.comment ? decodeBytes(torrent.comment as Uint8Array) : undefined,
    isPrivate: info.private === 1,
    pieceLength,
    pieceCount
  }
}

/**
 * 解码字节数组为字符串
 */
function decodeBytes(bytes: Uint8Array): string {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(bytes)
  } catch {
    // 如果 UTF-8 解码失败，尝试其他编码
    const decoder = new TextDecoder('iso-8859-1')
    return decoder.decode(bytes)
  }
}

/**
 * 解析种子文件（支持 File、ArrayBuffer、Uint8Array）
 */
export async function parseTorrentFile(input: File | ArrayBuffer | Uint8Array): Promise<TorrentInfo> {
  let data: Uint8Array

  if (input instanceof File) {
    const buffer = await input.arrayBuffer()
    data = new Uint8Array(buffer)
  } else if (input instanceof ArrayBuffer) {
    data = new Uint8Array(input)
  } else {
    data = input
  }

  return parseTorrentData(data)
}

/**
 * 从 Base64 字符串解析种子文件
 */
export function parseTorrentFromBase64(base64: string): TorrentInfo {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return parseTorrentData(bytes)
}
