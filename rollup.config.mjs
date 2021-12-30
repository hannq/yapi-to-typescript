// @ts-check

import path from 'path';
import ts from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';
import fs from 'fs-extra';
import chalk from 'chalk';
import commonjs from '@rollup/plugin-commonjs';
import polyfillNode from 'rollup-plugin-polyfill-node';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import html from 'rollup-plugin-bundle-html-plus';
import { ROOT_PKG_JSON, ROOT_PATH } from './scripts/constant.js';

if (!process.env.TARGET) {
  throw new Error('TARGET package must be specified via --environment flag.')
}

const masterVersion = ROOT_PKG_JSON.version;
const packagesDir = path.resolve(ROOT_PATH, 'packages');
const packageDir = path.resolve(packagesDir, process.env.TARGET);
const resolve = p => path.resolve(packageDir, p);
const pkg = fs.readJsonSync((resolve(`package.json`)));
const packageOptions = pkg.buildOptions || {};
const entryFiles = [].concat(packageOptions.entries || `index.js`);

// ensure TS checks only once for each build
let hasTSChecked = false

const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(',')
const packageFormats = inlineFormats || packageOptions.formats
const packageConfigs = entryFiles.reduce((acc, entry) => {
  // if (process.env.NODE_ENV === 'production') {
  //   packageFormats.forEach(format => {
  //     if (packageOptions.prod === false) {
  //       return
  //     }
  //     if (format === 'cjs') {
  //       packageConfigs.push(createProductionConfig(name, entry, format))
  //     }
  //     if (/^(global|esm-browser)(-runtime)?/.test(format)) {
  //       packageConfigs.push(createMinifiedConfig(format))
  //     }
  //   })
  // }
  return acc.concat(packageFormats.map(format => createConfig(entry, format, getOutputConfig(getBundleNameByEntry(entry), format))))
}, []);

console.log('packageConfigs --->', packageConfigs)

export default packageConfigs

/**
 * 创建配置
 * @param { string } enrty 入口文件
 * @param { object } format 格式化方式
 * @param { object } output 输出配置项
 * @param { object[] } plugins 额外插件
 */
function createConfig(enrty, format, output, plugins = []) {
  if (!output) {
    console.log(chalk.yellow(`invalid format: "${format}"`))
    process.exit(1)
  }

  const isProductionBuild =
    process.env.__DEV__ === 'false' || /\.prod\.js$/.test(output.file);
  const isBundlerESMBuild = /esm-bundler/.test(format);
  const isBrowserESMBuild = /esm-browser/.test(format);
  const isNodeBuild = format === 'cjs';
  const isGlobalBuild = /global/.test(format);
  const isCompatBuild = !!packageOptions.compat;
  const htmlTpl = packageOptions?.html?.[enrty] ?? '';

  output.sourcemap = !!process.env.SOURCE_MAP
  output.externalLiveBindings = false

  if (isGlobalBuild) {
    output.name = packageOptions.name
  }

  const shouldEmitDeclarations =
    pkg.types && process.env.TYPES != null && !hasTSChecked

  const tsPlugin = ts({
    check: process.env.NODE_ENV === 'production' && !hasTSChecked,
    tsconfig: path.resolve(ROOT_PATH, 'tsconfig.json'),
    cacheRoot: path.resolve(ROOT_PATH, 'node_modules/.rts2_cache'),
    tsconfigOverride: {
      compilerOptions: {
        sourceMap: output.sourcemap,
        declaration: shouldEmitDeclarations,
        declarationMap: shouldEmitDeclarations
      },
      exclude: ['**/__tests__', 'test-dts']
    }
  })
  // we only need to check TS and generate declarations once for each build.
  // it also seems to run into weird issues when checking multiple times
  // during a single build.
  hasTSChecked = true

  let external = []

  if (isGlobalBuild || isBrowserESMBuild) {
    if (!packageOptions.enableNonBrowserBranches) {
      // normal browser builds - non-browser only imports are tree-shaken,
      // they are only listed here to suppress warnings.
      external = ['source-map', '@babel/parser', 'estree-walker']
    }
  } else {
    // Node / esm-bundler builds.
    // externalize all direct deps unless it's the compat build.
    external = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {}),
      ...['path', 'url', 'stream']
    ]
  }

  const nodePlugins =
    (format === 'cjs' && Object.keys(pkg.devDependencies || {}).length) ||
      packageOptions.enableNonBrowserBranches
      ? [
        commonjs({
          sourceMap: false,
        }),
        ...(format === 'cjs'
          ? []
          : [polyfillNode()]),
        nodeResolve()
      ]
      : [];


    console.log(resolve(htmlTpl))

  return {
    input: resolve(enrty),
    // Global and Browser ESM builds inlines everything so that they can be
    // used alone.
    external,
    plugins: [
      json({
        namedExports: false
      }),
      tsPlugin,
      createReplacePlugin(
        isProductionBuild,
        isBundlerESMBuild,
        isBrowserESMBuild,
        // isBrowserBuild?
        (isGlobalBuild || isBrowserESMBuild || isBundlerESMBuild) &&
        !packageOptions.enableNonBrowserBranches,
        isGlobalBuild,
        isNodeBuild,
        isCompatBuild
      ),
      ...(htmlTpl ? [html({
        template: resolve(htmlTpl),
        dest: resolve(`dist`)
      })] : []),
      ...nodePlugins,
      ...plugins
    ],
    output: {
      ...output,
      extend: true
    },
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg)
      }
    },
    treeshake: {
      moduleSideEffects: false
    }
  }
}

/**
 * 获取输出配置
 * @param { string } name 输出模块名称
 * @param { string } format 输出格式
 */
function getOutputConfig (name, format) {
  return {
    'esm-bundler': {
      file: resolve(`dist/${name}.esm-bundler.js`),
      format: `es`
    },
    'esm-browser': {
      file: resolve(`dist/${name}.esm-browser.js`),
      format: `es`
    },
    cjs: {
      file: resolve(`dist/${name}.cjs.js`),
      format: `cjs`
    },
    global: {
      file: resolve(`dist/${name}.global.js`),
      format: `iife`
    },
    // runtime-only builds
    'esm-bundler-runtime': {
      file: resolve(`dist/${name}.runtime.esm-bundler.js`),
      format: `es`
    },
    'esm-browser-runtime': {
      file: resolve(`dist/${name}.runtime.esm-browser.js`),
      format: 'es'
    },
    'global-runtime': {
      file: resolve(`dist/${name}.runtime.global.js`),
      format: 'iife'
    }
  }[format]
}

/**
 * 根据入口文件获取 bundle 名称
 * @param { string } entry 入口文件路径
 * @returns { string }
 */
function getBundleNameByEntry(entry) {
  return path.basename(entry, path.extname(entry)) || packageOptions.filename || path.basename(packageDir)
}

function createReplacePlugin(
  isProduction,
  isBundlerESMBuild,
  isBrowserESMBuild,
  isBrowserBuild,
  isGlobalBuild,
  isNodeBuild,
  isCompatBuild
) {
  const replacements = {
    __VERSION__: `"${masterVersion}"`,
    __DEV__: isBundlerESMBuild
      ? // preserve to be handled by bundlers
      `(process.env.NODE_ENV !== 'production')`
      : // hard coded dev/prod builds
      !isProduction,
    // this is only used during Vue's internal tests
    __TEST__: false,
    // If the build is expected to run directly in the browser (global / esm builds)
    __BROWSER__: isBrowserBuild,
    __GLOBAL__: isGlobalBuild,
    __ESM_BUNDLER__: isBundlerESMBuild,
    __ESM_BROWSER__: isBrowserESMBuild,
    // is targeting Node (SSR)?
    __NODE_JS__: isNodeBuild,
    // need SSR-specific branches?
    __SSR__: isNodeBuild || isBundlerESMBuild,


    // 2.x compat build
    __COMPAT__: isCompatBuild,

    // feature flags
    __FEATURE_SUSPENSE__: true,
    __FEATURE_OPTIONS_API__: isBundlerESMBuild ? `__VUE_OPTIONS_API__` : true,
    __FEATURE_PROD_DEVTOOLS__: isBundlerESMBuild
      ? `__VUE_PROD_DEVTOOLS__`
      : false,
    ...(isProduction && isBrowserBuild
      ? {
        'context.onError(': `/*#__PURE__*/ context.onError(`,
        'emitError(': `/*#__PURE__*/ emitError(`,
        'createCompilerError(': `/*#__PURE__*/ createCompilerError(`,
        'createDOMCompilerError(': `/*#__PURE__*/ createDOMCompilerError(`
      }
      : {})
  }
  // allow inline overrides like
  //__RUNTIME_COMPILE__=true yarn build runtime-core
  Object.keys(replacements).forEach(key => {
    if (key in process.env) {
      replacements[key] = process.env[key]
    }
  })
  return replace({
    // @ts-ignore
    values: replacements,
    preventAssignment: true
  })
}

// /**
//  * 创建生产环境配置
//  * @param { string } name 模块名称
//  * @param { string } entry 入口文件
//  * @param { object } format 输出类型
//  */
// function createProductionConfig(name, entry, format) {
//   return createConfig(entry, format, {
//     file: resolve(`dist/${name}.${format}.prod.js`),
//     format: getOutputConfig(format, name).format
//   })
// }

// /**
//  * 创建压缩配置
//  * @param { string } name bundle 名称
//  * @param { object } format 输出格式
//  */
// function createMinifiedConfig(name, format) {
//   return createConfig(
//     format,
//     {
//       file: getOutputConfig(format, name).file.replace(/\.js$/, '.prod.js'),
//       format: getOutputConfig(format, entryFiles.length > 1).format
//     },
//     [
//       terser({
//         module: /^esm/.test(format),
//         compress: {
//           ecma: 2015,
//           pure_getters: true
//         },
//         safari10: true
//       })
//     ]
//   )
// }
