import imageCompression from 'browser-image-compression'

const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml'])

export async function optimizeImage(file: File): Promise<File> {
  if (SKIP_TYPES.has(file.type)) {
    return file
  }

  return imageCompression(file, {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: 'image/webp',
  })
}

export async function optimizeImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(optimizeImage))
}
