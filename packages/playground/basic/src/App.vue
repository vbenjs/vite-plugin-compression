<template>
  <div>
    <img :src="gif" />
    <img :src="jpg" />
    <img :src="png" />
    <img :src="svg" />
  </div>
</template>

<script>
import { defineComponent } from 'vue'

import gif from './assets/test.gif'
import jpg from './assets/test.jpg'
import png from './assets/test.png'
import svg from './assets/test.svg'
export default defineComponent({
  name: 'App',
  components: {},
  setup() {
    return {
      gif,
      jpg,
      png,
      svg,
    }
  },
})
</script>
