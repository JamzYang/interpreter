<template>
  <div class="app-container">
    <h1>Audio Translator</h1>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      @close="error = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import 'element-plus/dist/index.css'

const error = ref('')
</script>

<style>
.app-container {
  height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}
</style> 