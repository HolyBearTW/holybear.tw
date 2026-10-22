import { defineConfig, mergeConfig } from 'vitest/config'
import baseConfig from './vitest.config.ts'

export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['tests/security/**/*.test.{ts,tsx,mjs}'],
  },
}))
