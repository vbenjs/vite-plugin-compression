import vue from '@vitejs/plugin-vue'
import jsx from '@vitejs/plugin-vue-jsx'
import viteCompression from 'vite-plugin-compression'

export default () => {
  return {
    build: {
      assetsInlineLimit: 0,
    },
    plugins: [
      vue(),
      jsx(),
      // gizp
      viteCompression(),
      // br
      viteCompression({
        algorithm: 'brotliCompress',
      }),
    ],
  }
}
