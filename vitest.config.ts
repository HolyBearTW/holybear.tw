import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// The default runner must also compile the security tests that mount Vue SFCs.
export default defineConfig({
  plugins: [vue()],
})
