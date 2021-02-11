# vite-plugin-imagemin

**English** | [中文](./README.zh_CN.md)

[![npm][npm-img]][npm-url] [![node][node-img]][node-url]

Use `gzip` or `brotli` to compress resources.

Since [vite-plugin-compress](https://github.com/alloc/vite-plugin-compress) does not support `gzip` compression, a separate copy has been modified and some functions have been added.

## Install (yarn or npm)

**node version:** >=12.0.0

**vite version:** >=2.0.0-beta.68

```
yarn add vite-plugin-compression -D
```

or

```
npm i vite-plugin-compression -D
```

## Usage

- Configuration plugin in vite.config.ts

```ts
import viteCompression from 'vite-plugin-compression';

export default () => {
  return {
    plugins: [viteCompression()],
  };
};
```

### Options

| params | type | default | default |
| --- | --- | --- | --- |
| verbose | `boolean` | `true` | Whether to output the compressed result in the console |
| filter | `RegExp or (file: string) => boolean` | `DefaultFilter` | Specify which resources are not compressed |
| disable | `boolean` | `false` | Whether to disable |
| threshold | `number` | - | It will be compressed if the volume is larger than threshold, the unit is kb |
| algorithm | `string` | `gzip` | Compression algorithm, optional ['gzip','brotliCompress' ,'deflate','deflateRaw'] |
| ext | `string` | `.gz` | Suffix of the generated compressed package |
| compressionOptions | `object` | - | The parameters of the corresponding compression algorithm |
| deleteOriginFile | `boolean` | - | Whether to delete source files after compression |

**DefaultFilter**

`/\.(js|mjs|json|css|html)$/i`

## Example

**Run Example**

```bash

cd ./example

yarn install

yarn test:gzip

yarn test:br

```

## Sample project

[Vben Admin](https://github.com/anncwb/vue-vben-admin)

## License

MIT

## Inspiration

[vite-plugin-compress](https://github.com/alloc/vite-plugin-compress)

[npm-img]: https://img.shields.io/npm/v/vite-plugin-style-import.svg
[npm-url]: https://npmjs.com/package/vite-plugin-style-import
[node-img]: https://img.shields.io/node/v/vite-plugin-style-import.svg
[node-url]: https://nodejs.org/en/about/releases/
