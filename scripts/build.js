// @ts-check

import { execa } from 'execa';

(async function() {
  execa(
    'rollup',
    [
      '-c',
      '--environment',
      [
        `NODE_ENV:production`,
        `__DEV__:false`,
        `FORMATS:esm`,
        `TYPES:true`,
        `SOURCE_MAP:false`,
      ].join(',')
    ],
    {
      stdio: 'inherit'
    }
  );
})();
