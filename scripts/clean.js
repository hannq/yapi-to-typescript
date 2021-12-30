// @ts-check

import chalk from 'chalk';
import fs from 'fs-extra';

const { DIST_PATH, RTS2_CACHE_PATH } = require('./constant');
const cleanDirs = [DIST_PATH, RTS2_CACHE_PATH];

async function clean () {
  await Promise.all(cleanDirs.map(path => fs.remove(path)));
  console.log(chalk.bold(chalk.cyanBright(`The following dir cleaned successfully:`)));
  cleanDirs.forEach((path) => console.log(`${' '.repeat(4)}${chalk.green(path)}`));
}

if (process.env.npm_lifecycle_event === 'clean') {
  clean()
}

module.exports.clean = clean;
