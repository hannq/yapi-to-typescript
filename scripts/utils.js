// @ts-check

import chalk from 'chalk';

/**
 * 模糊匹配
 * @param { string[] } partial 模糊匹配参数
 * @param { string[] } source 匹配源
 * @param { boolean } includeAllMatching 是否包含所有选中项
 * @returns { string[] }
 */
export function fuzzyMatch(partial, source, includeAllMatching = false) {
  const matched = []
  partial.forEach(partialTarget => {
    for (const target of source) {
      if (target.match(partialTarget)) {
        matched.push(target)
        if (!includeAllMatching) {
          break
        }
      }
    }
  })
  if (matched.length) {
    return matched
  } else {
    console.log()
    console.error(
      `  ${chalk.bgRed.white(' ERROR ')} ${chalk.red(
        `Target ${chalk.underline(partial)} not found!`
      )}`
    )
    console.log()

    process.exit(1)
  }
}

export function asdf () {
  
}

/**
 * 获取纯净的 packageName
 * @param { string } packageName 符合规范的 package.json 的 name 字段
 * @returns
 */
export function obtainPurePackageName(packageName) {
  return packageName.replace(/^(?:@[^/]+\/)?([^/]+)$/, '$1');
}
