import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, relative, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const publicImageDir = resolve(process.env.IMAGE_PUBLIC_DIR || resolve(repoRoot, 'public/image'))
const manifestPath = resolve(
    process.env.IMAGE_MANIFEST_PATH || resolve(repoRoot, '.vitepress/image-optimization-manifest.json')
)
const isDeployment = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

if (!isDeployment) {
    throw new Error('這支腳本只供 CI 部署使用，避免在本機產生大量 WebP。')
}

const { default: sharp } = await import('sharp')

const sourceExtensions = new Set(['.jpg', '.jpeg', '.png'])
const minimumSavingRatio = 0.05
const concurrency = 3

async function collectImages(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const images = []

    for (const entry of entries) {
        const entryPath = resolve(directory, entry.name)
        if (entry.isDirectory()) {
            images.push(...await collectImages(entryPath))
        } else if (entry.isFile() && sourceExtensions.has(extname(entry.name).toLowerCase())) {
            images.push(entryPath)
        }
    }

    return images
}

function toPublicUrl(filePath) {
    return `/image/${relative(publicImageDir, filePath).replaceAll('\\', '/')}`
}

async function optimizeImage(sourcePath) {
    const targetPath = sourcePath.replace(/\.(?:jpe?g|png)$/i, '.webp')
    const sourceSize = (await stat(sourcePath)).size

    try {
        const targetSize = (await stat(targetPath)).size
        if (targetSize < sourceSize) {
            return { sourcePath, targetPath, sourceSize, targetSize, reused: true }
        }
        return { sourcePath, sourceSize, skipped: true }
    } catch {
        // 沒有現成 WebP 時才由部署流程產生，避免覆蓋人工處理過的檔案。
    }

    const source = await readFile(sourcePath)
    const webp = await sharp(source, { failOn: 'none' })
        .rotate()
        .webp({ quality: 84, effort: 5, smartSubsample: true })
        .toBuffer()

    if (webp.length > sourceSize * (1 - minimumSavingRatio)) {
        return { sourcePath, sourceSize, targetSize: webp.length, skipped: true }
    }

    await writeFile(targetPath, webp)
    return { sourcePath, targetPath, sourceSize, targetSize: webp.length, reused: false }
}

async function mapWithConcurrency(items, limit, task) {
    const results = new Array(items.length)
    let nextIndex = 0

    async function worker() {
        while (nextIndex < items.length) {
            const index = nextIndex++
            results[index] = await task(items[index])
        }
    }

    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
    return results
}

const images = await collectImages(publicImageDir)
const results = await mapWithConcurrency(images, concurrency, async (imagePath) => {
    try {
        return await optimizeImage(imagePath)
    } catch (error) {
        console.warn(`略過無法轉換的圖片：${toPublicUrl(imagePath)}`, error)
        return { sourcePath: imagePath, skipped: true }
    }
})
const manifest = {}
let sourceBytes = 0
let optimizedBytes = 0
let generatedCount = 0
let reusedCount = 0
let skippedCount = 0

for (const result of results) {
    if (!result.targetPath) {
        skippedCount += 1
        continue
    }
    manifest[toPublicUrl(result.sourcePath)] = toPublicUrl(result.targetPath)
    sourceBytes += result.sourceSize
    optimizedBytes += result.targetSize
    if (result.reused) reusedCount += 1
    else generatedCount += 1
}

await mkdir(dirname(manifestPath), { recursive: true })
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

const savedPercent = sourceBytes > 0
    ? ((1 - optimizedBytes / sourceBytes) * 100).toFixed(1)
    : '0.0'
console.log(
    `圖片最佳化完成：掃描 ${images.length} 張，產生 ${generatedCount} 張，` +
    `沿用 ${reusedCount} 張，略過 ${skippedCount} 張，` +
    `可傳輸圖片縮小 ${savedPercent}%（WebP 僅存在本次 CI）。`
)
