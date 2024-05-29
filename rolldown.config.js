// @ts-check
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'
import esbuild from 'rollup-plugin-esbuild'
import { entries } from './scripts/aliases.js'
import { inlineEnums, scanEnums } from './scripts/inline-enums.js'
import { defineConfig } from 'rolldown'

const require = createRequire(import.meta.url)
const __dirname = fileURLToPath(new URL('.', import.meta.url))

const masterVersion = require('./package.json').version

const packagesDir = path.resolve(__dirname, 'packages')
const packageDir = path.resolve(packagesDir, 'vue')

const resolve = (/** @type {string} */ p) => path.resolve(packageDir, p)

scanEnums()
const [enumPlugin, enumDefines] = inlineEnums()

export default defineConfig({
  input: resolve('src/index.ts'),
  external: [
    'source-map-js',
    '@babel/parser',
    'estree-walker',
    'entities/lib/decode.js',
  ],
  // using this instead of alias plugin
  resolve: {
    alias: entries,
  },
  plugins: [
    json({
      namedExports: false,
    }),
    enumPlugin,
    replace({
      values: { __DEV__: `true`, ...enumDefines },
      preventAssignment: true,
    }),
    esbuild({
      tsconfig: path.resolve(__dirname, 'tsconfig.json'),
      sourceMap: false,
      minify: false,
      target: 'es2016',
      define: {
        __COMMIT__: `"${process.env.COMMIT}"`,
        __VERSION__: `"${masterVersion}"`,
        // this is only used during Vue's internal tests
        __TEST__: `false`,
        // If the build is expected to run directly in the browser (global / esm builds)
        __BROWSER__: `true`,
        __GLOBAL__: `false`,
        __ESM_BUNDLER__: `false`,
        __ESM_BROWSER__: `true`,
        // is targeting Node (SSR)?
        __CJS__: `false`,
        // need SSR-specific branches?
        __SSR__: `false`,

        // 2.x compat build
        __COMPAT__: `false`,

        // feature flags
        __FEATURE_SUSPENSE__: `true`,
        __FEATURE_OPTIONS_API__: `true`,
        __FEATURE_PROD_DEVTOOLS__: `true`,
        __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: `true`,
      },
    }),
  ],
  output: {
    // no output.file support?
    format: 'es',
    dir: resolve('dist'),
    entryFileNames: 'vue.esm-browser.js',
  },
  // this doesn't work yet
  onwarn: (msg, warn) => {
    if (msg.code !== 'CIRCULAR_DEPENDENCY') {
      warn(msg)
    }
  },
  // this doesn't work yet
  treeshake: {
    moduleSideEffects: false,
  },
})
