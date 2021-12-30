// @ts-check

import { execa } from 'execa';
import minimist from 'minimist';
import { fuzzyMatch } from './utils.js';
import { ALL_PACKAGE_NAMES } from './constant.js';
// const { clean } = require('./clean');

const args = minimist(process.argv.slice(2))
const target = fuzzyMatch(args._, ALL_PACKAGE_NAMES)[0] || '';

(async function() {
  // await clean();
  execa(
    'rollup',
    [
      '-wc',
      '--environment',
      [
        `NODE_ENV:development`,
        `__DEV__:true`,
        `SOURCE_MAP:true`,
        `TARGET:${target}`,
        `TYPES:true`,
      ].join(',')
    ],
    {
      stdio: 'inherit'
    }
  );
})();
