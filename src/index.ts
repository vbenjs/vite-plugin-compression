import type { Plugin, ResolvedConfig } from 'vite';
import type { CompressionOptions, VitePluginCompression } from './types';
import path from 'path';
import { normalizePath } from 'vite';
import { readAllFile, isRegExp, isFunction } from './utils';
import fs from 'fs-extra';
import chalk from 'chalk';
import zlib from 'zlib';
import { debug as Debug } from 'debug';

const debug = Debug('vite-plugin-compression');

const extRE = /\.(js|mjs|json|css|html)$/i;

const mtimeCache = new Map<string, number>();

const exportFn = (options: VitePluginCompression = {}): Plugin => {
  let outputPath: string;
  let config: ResolvedConfig;

  const emptyPlugin: Plugin = {
    name: 'vite:compression',
  };

  const {
    disable = false,
    filter = extRE,
    verbose = true,
    algorithm = 'gzip',
    ext = '.gz',
    threshold = 1025,
    compressionOptions = {},
    deleteOriginFile = false,
    success = () => {}
  } = options;

  if (disable) {
    return emptyPlugin;
  }

  debug('plugin options:', options);

  return {
    ...emptyPlugin,
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      outputPath = path.isAbsolute(config.build.outDir)
        ? config.build.outDir
        : path.join(config.root, config.build.outDir);
      debug('resolvedConfig:', resolvedConfig);
    },
    async closeBundle() {
      let files = readAllFile(outputPath) || [];
      debug('files:', files);

      if (!files.length) return;

      files = filterFiles(files, filter);

      const compressOptions = getCompressionOptions(algorithm, compressionOptions);

      const compressMap = new Map<string, { size: number; oldSize: number; cname: string }>();

      const handles = files.map(async (filePath: string) => {
        let { mtimeMs, size: oldSize } = await fs.stat(filePath);
        if (mtimeMs <= (mtimeCache.get(filePath) || 0) || oldSize < threshold) return;

        let content = await fs.readFile(filePath);

        if (deleteOriginFile) {
          fs.remove(filePath);
        }

        try {
          content = await compress(content, algorithm, compressOptions);
        } catch (error) {
          config.logger.error('compress error:' + filePath);
        }
        const size = content.byteLength;

        const cname = getOutputFileName(filePath, ext);
        compressMap.set(filePath, {
          size: size / 1024,
          oldSize: oldSize / 1024,
          cname: cname,
        });
        await fs.writeFile(cname, content);

        mtimeCache.set(filePath, Date.now());
      });

      Promise.all(handles).then(() => {
        if (verbose) {
          handleOutputLogger(config, compressMap, algorithm);
          success()
        }
      });
    },
  };
};

function filterFiles(files: string[], filter: RegExp | ((file: string) => boolean)) {
  if (filter) {
    const isRe = isRegExp(filter);
    const isFn = isFunction(filter);
    files = files.filter((file) => {
      if (isRe) {
        return (filter as RegExp).test(file);
      }
      if (isFn) {
        return (filter as Function)(file);
      }
      return true;
    });
  }
  return files;
}

/**
 * get common options
 * @param algorithm
 * @param compressionOptions
 */
function getCompressionOptions(
  algorithm: string = '',
  compressionOptions: CompressionOptions = {}
) {
  const defaultOptions: {
    [key: string]: Record<string, any>;
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
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      },
    },
  };
  return { ...defaultOptions[algorithm], ...compressionOptions } as CompressionOptions;
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
  options: CompressionOptions = {}
) {
  return new Promise<Buffer>((resolve, reject) => {
    // @ts-ignore
    zlib[algorithm](content, options, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

/**
 * Get the suffix
 * @param filepath
 * @param ext
 */
function getOutputFileName(filepath: string, ext: string) {
  const compressExt = ext.startsWith('.') ? ext : `.${ext}`;
  return `${filepath}${compressExt}`;
}

// Packed output logic
function handleOutputLogger(
  config: ResolvedConfig,
  compressMap: Map<string, { size: number; oldSize: number; cname: string }>,
  algorithm: string
) {
  config.logger.info(
    `\n${chalk.cyan('✨ [vite-plugin-compression]:algorithm=' + algorithm)}` +
      ` - compressed file successfully: `
  );

  const keyLengths = Array.from(compressMap.keys(), (name) => name.length);

  const maxKeyLength = Math.max(...keyLengths);
  compressMap.forEach((value, name) => {
    let { size, oldSize, cname } = value;

    const rName = normalizePath(cname).replace(
      normalizePath(`${config.root}/${config.build.outDir}/`),
      ''
    );

    const sizeStr = `${oldSize.toFixed(2)}kb / ${algorithm}: ${size.toFixed(2)}kb`;

    config.logger.info(
      chalk.dim(config.build.outDir + '/') +
        chalk.blueBright(rName) +
        ' '.repeat(2 + maxKeyLength - name.length) +
        ' ' +
        chalk.dim(sizeStr)
    );
  });
  config.logger.info('\n');
}

module.exports = exportFn;
export default exportFn;
