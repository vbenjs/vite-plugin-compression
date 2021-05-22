# vite-plugin-compression

**中文** | [English](./README.md)

[![npm][npm-img]][npm-url] [![node][node-img]][node-url]

使用 `gzip` 或者 `brotli` 来压缩资源.

由于[vite-plugin-compress](https://github.com/alloc/vite-plugin-compress)不支持`gzip`压缩,所以独立了一份进行修改，并增加部分功能。

## 安装 (yarn or npm)

**node version:** >=12.0.0

**vite version:** >=2.0.0

```
yarn add vite-plugin-compression -D
```

or

```
npm i vite-plugin-compression -D
```

## 使用

- vite.config.ts 中的配置插件

```ts
import viteCompression from 'vite-plugin-compression';

export default () => {
  return {
    plugins: [viteCompression()],
  };
};
```

### 配置说明

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| verbose | `boolean` | `true` | 是否在控制台输出压缩结果 |
| filter | `RegExp or (file: string) => boolean` | `DefaultFilter` | 指定哪些资源不压缩 |
| disable | `boolean` | `false` | 是否禁用 |
| threshold | `number` | - | 体积大于 threshold 才会被压缩,单位 b |
| algorithm | `string` | `gzip` | 压缩算法,可选 [ 'gzip' , 'brotliCompress' ,'deflate' , 'deflateRaw'] |
| ext | `string` | `.gz` | 生成的压缩包后缀 |
| compressionOptions | `object` | - | 对应的压缩算法的参数 |
| deleteOriginFile | `boolean` | - | 压缩后是否删除源文件 |

**DefaultFilter**

`/\.(js|mjs|json|css|html)$/i`

## 示例

**运行示例**

```bash

cd ./example

yarn install

yarn test:gzip

yarn test:br

```

## 示例项目

[Vben Admin](https://github.com/anncwb/vue-vben-admin)

## License

MIT

## 灵感

[vite-plugin-compress](https://github.com/alloc/vite-plugin-compress)

[npm-img]: https://img.shields.io/npm/v/vite-plugin-compression.svg
[npm-url]: https://npmjs.com/package/vite-plugin-compression
[node-img]: https://img.shields.io/node/v/vite-plugin-compression.svg
[node-url]: https://nodejs.org/en/about/releases/
