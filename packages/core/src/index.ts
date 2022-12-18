import type { Plugin, ResolvedConfig } from 'vite'
import type { CompressionOptions, VitePluginCompression } from './types'
import path from 'path'
import { normalizePath } from 'vite'
import { readAllFile, isRegExp, isFunction, escapeRegExp } from './utils'
import fs from 'fs-extra'
import chalk from 'chalk'
import zlib from 'zlib'
import Debug from 'debug'

const debug = Debug.debug('vite-plugin-compression')

const extRE = /\.(js|mjs|json|css|html)$/i

const mtimeCache = new Map<string, number>()

export default function (options: VitePluginCompression = {}): Plugin {
  let outputPath: string
  let config: ResolvedConfig

  const emptyPlugin: Plugin = {
    name: 'vite:compression',
  }

  const {
    disable = false,
    filter = extRE,
    verbose = true,
    threshold = 1025,
    compressionOptions = {},
    deleteOriginFile = false,
    // eslint-disable-next-line
    success = () => {},
  } = options

  let { ext = '' } = options
  const { algorithm = 'gzip' } = options

  if (algorithm === 'gzip' && !ext) {
    ext = '.gz'
  }

  if (algorithm === 'brotliCompress' && !ext) {
    ext = '.br'
  }

  if (disable) {
    return emptyPlugin
  }

  debug('plugin options:', options)

  return {
    ...emptyPlugin,
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      outputPath = path.isAbsolute(config.build.outDir)
        ? config.build.outDir
        : path.join(config.root, config.build.outDir)
      debug('resolvedConfig:', resolvedConfig)
    },
    async closeBundle() {
      let files = readAllFile(outputPath) || []
      debug('files:', files)

      if (!files.length) return

      files = filterFiles(files, filter)

      const compressOptions = getCompressionOptions(
        algorithm,
        compressionOptions,
      )

      const compressMap = new Map<
        string,
        { size: number; oldSize: number; cname: string }
      >()

      const handles = files.map(async (filePath: string) => {
        const { mtimeMs, size: oldSize } = await fs.stat(filePath)
        if (mtimeMs <= (mtimeCache.get(filePath) || 0) || oldSize < threshold)
          return

        let content = await fs.readFile(filePath)

        if (deleteOriginFile) {
          fs.remove(filePath)
        }

        try {
          content = await compress(content, algorithm, compressOptions)
        } catch (error) {
          config.logger.error('compress error:' + filePath)
        }
        const size = content.byteLength

        const cname = getOutputFileName(filePath, ext)
        compressMap.set(filePath, {
          size,
          oldSize,
          cname,
        })
        await fs.writeFile(cname, content)

        mtimeCache.set(filePath, Date.now())
      })

      return Promise.all(handles).then(() => {
        if (verbose) {
          handleOutputLogger(config, compressMap, algorithm, ext)
          success()
        }
      })
    },
  }
}

function filterFiles(
  files: string[],
  filter: RegExp | ((file: string) => boolean),
) {
  if (filter) {
    const isRe = isRegExp(filter)
    const isFn = isFunction(filter)
    files = files.filter((file) => {
      if (isRe) {
        return (filter as RegExp).test(file)
      }
      if (isFn) {
        // eslint-disable-next-line
        return (filter as Function)(file)
      }
      return true
    })
  }
  return files
}

/**
 * get common options
 */
function getCompressionOptions(
  algorithm = '',
  compressionOptions: CompressionOptions = {},
) {
  const defaultOptions: {
    [key: string]: Record<string, any>
  } = {
    gzip: {
      level: zlib.constants.Z_BEST_COMPRESSION,
    },
    deflate: {
      level: zlib.constants.Z_BEST_COMPRESSION,
    },
    deflateRaw: {
      level: zlib.constants.Z_BEST_COMPRESSION,
    },
    brotliCompress: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]:
          zlib.constants.BROTLI_MAX_QUALITY,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      },
    },
  }
  return {
    ...defaultOptions[algorithm],
    ...compressionOptions,
  } as CompressionOptions
}

/**
 * Compression core method
 * @param content
 * @param algorithm
 * @param options
 */
function compress(
  content: Buffer,
  algorithm: 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw',
  options: CompressionOptions = {},
) {
  return new Promise<Buffer>((resolve, reject) => {
    // @ts-ignore
    zlib[algorithm](content, options, (err, result) =>
      err ? reject(err) : resolve(result),
    )
  })
}

/**
 * Get the suffix
 * @param filepath
 * @param ext
 */
function getOutputFileName(filepath: string, ext: string) {
  const compressExt = ext.startsWith('.') ? ext : `.${ext}`
  return `${filepath}${compressExt}`
}

// Packed output logic
function handleOutputLogger(
  config: ResolvedConfig,
  compressMap: Map<string, { size: number; oldSize: number; cname: string }>,
  algorithm: string,
  ext: string,
) {
  config.logger.info('\n')
  config.logger.info(
    `${chalk.cyan('✨ [vite-plugin-compression]:algorithm=' + algorithm)}` +
      ` - compressed file successfully: `,
  )

  // Choose display format:
  // 1000 = kilobyte (kB)
  // 1024 = kibibyte (KiB)
  const bytesDivider = 1000
  const sizeUnit = bytesDivider === 1000 ? 'kB' : 'KiB'

  const maxLengths = {
    filename: 0,
    oldSize: 0,
    newSize: 0,
    percentage: 0,
  }

  let totalOldSize = 0
  let totalNewSize = 0

  const outputDirRE = new RegExp(
    `^${escapeRegExp(normalizePath(config.root + '/'))}`,
  )
  const extRE = new RegExp(`${escapeRegExp(ext)}$`)

  const compressMapArray = Array.from(compressMap.entries()).map(
    ([filepath, { size, oldSize, cname }]) => {
      const newItem = {
        filename: normalizePath(cname).replace(outputDirRE, ''),
        oldSize: `${(oldSize / bytesDivider).toFixed(2)} ${sizeUnit}`,
        newSize: `${(size / bytesDivider).toFixed(2)} ${sizeUnit}`,
        percentage: `${((100 * size) / oldSize).toFixed(2)} %`,
      }

      totalOldSize += oldSize
      totalNewSize += size

      maxLengths.filename = Math.max(
        maxLengths.filename,
        newItem.filename.length,
      )
      maxLengths.oldSize = Math.max(maxLengths.oldSize, newItem.oldSize.length)
      maxLengths.newSize = Math.max(maxLengths.newSize, newItem.newSize.length)
      maxLengths.percentage = Math.max(
        maxLengths.percentage,
        newItem.percentage.length,
      )

      return newItem
    },
  )

  const totalOldSizeString = `${(totalOldSize / bytesDivider).toFixed(
    2,
  )} ${sizeUnit}`
  const totalNewSizeString = `${(totalNewSize / bytesDivider).toFixed(
    2,
  )} ${sizeUnit}`
  const totalPercentageString = `${(
    (100 * totalNewSize) /
    totalOldSize
  ).toFixed(2)} %`

  compressMapArray.forEach(({ filename, oldSize, newSize, percentage }) => {
    const basename = path.basename(filename)

    config.logger.info(
      [
        chalk.dim(filename.replace(basename, '')),
        chalk.blueBright(basename.replace(extRE, '')),
        chalk.dim(
          [
            ext,
            ' '.repeat(2 + maxLengths.filename - filename.length),
            ' '.repeat(totalOldSizeString.length - oldSize.length),
            oldSize,
            ` │ ${algorithm}: `,
            ' '.repeat(totalNewSizeString.length - newSize.length),
            newSize,
            ` │ `,
            ' '.repeat(totalPercentageString.length - percentage.length),
            percentage,
          ].join(''),
        ),
      ].join(''),
    )
  })

  config.logger.info(
    [
      'Total',
      ' '.repeat(2 + maxLengths.filename - 5),
      totalOldSizeString,
      chalk.dim(' │ '),
      ' '.repeat(algorithm.length + 2),
      totalNewSizeString,
      chalk.dim(' │ '),
      chalk.green(totalPercentageString),
    ].join(''),
  )

  config.logger.info('\n')
}
