import { readFile } from 'node:fs/promises'
import { createFile, type MP4BoxBuffer } from 'mp4box'

export interface VideoMetadata {
  width: number
  height: number
}

export async function readVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const bytes = await readFile(filePath)
  const buffer = new Uint8Array(bytes).buffer as MP4BoxBuffer
  buffer.fileStart = 0

  return new Promise((resolve, reject) => {
    const file = createFile()
    let settled = false
    const fail = (message: string) => {
      if (settled) return
      settled = true
      reject(new Error(message))
    }

    file.onError = (module, message) => fail(`Could not read MP4 metadata (${module}: ${message}).`)
    file.onReady = (info) => {
      if (settled) return
      const track = info.videoTracks[0]
      const sourceWidth = track?.video?.width ?? track?.track_width
      const sourceHeight = track?.video?.height ?? track?.track_height
      if (!track || !sourceWidth || !sourceHeight) {
        fail('MP4 needs a readable video track with width and height metadata.')
        return
      }
      if (!/^avc[13](?:\.|$)/i.test(track.codec)) {
        fail(`MP4 video must use the H.264/AVC codec; found "${track.codec}".`)
        return
      }

      // Rotation is stored separately from the encoded frame dimensions.
      const matrix = track.matrix
      const quarterTurn = matrix.length >= 5
        && Math.abs(matrix[1]) > Math.abs(matrix[0])
        && Math.abs(matrix[3]) > Math.abs(matrix[4])
      settled = true
      resolve({
        width: Math.round(quarterTurn ? sourceHeight : sourceWidth),
        height: Math.round(quarterTurn ? sourceWidth : sourceHeight),
      })
    }

    try {
      file.appendBuffer(buffer, true)
      file.flush()
      if (!settled) fail('MP4 needs a complete, readable movie header.')
    } catch (error) {
      fail(`Could not read MP4 metadata: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
}
