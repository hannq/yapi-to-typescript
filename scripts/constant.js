// @ts-check

import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { globbySync } from 'globby';
import { obtainPurePackageName } from './utils.js';

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_PATH = path.join(__dirname, '..');
/** @type { import('../package.json') } */
export const ROOT_PKG_JSON = fs.readJSONSync(path.join(ROOT_PATH, 'package.json'));
export const DEFAULT_DIST_DIRNAME = 'dist';
export const RTS2_CACHE_DIRNAME = '.rts2_cache';
export const ALL_PACKAGE_NAMES = globbySync('packages/*/package.json', { absolute: true, cwd: ROOT_PATH }).map(pkgPath => obtainPurePackageName(fs.readJsonSync(pkgPath).name));
