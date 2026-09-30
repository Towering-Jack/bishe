'use strict'
const chalk = require('chalk')
const semver = require('semver')
const packageConfig = require('../package.json')

// Resolve the running npm version without spawning a child process. npm exposes
// it in the user agent it hands to lifecycle scripts, e.g.
//   "npm/10.2.4 node/v20.11.0 win32 x64 workspaces/false"
function detectNpmVersion () {
  const ua = process.env.npm_config_user_agent
  if (ua) {
    const m = ua.match(/\bnpm\/([^\s]+)/)
    if (m) return m[1]
  }
  return null
}

const versionRequirements = [
  {
    name: 'node',
    currentVersion: semver.clean(process.version),
    versionRequirement: packageConfig.engines.node
  }
]

const npmVersion = detectNpmVersion()
if (npmVersion) {
  versionRequirements.push({
    name: 'npm',
    currentVersion: npmVersion,
    versionRequirement: packageConfig.engines.npm
  })
}

module.exports = function () {
  const warnings = []

  for (let i = 0; i < versionRequirements.length; i++) {
    const mod = versionRequirements[i]

    if (!semver.satisfies(mod.currentVersion, mod.versionRequirement)) {
      warnings.push(mod.name + ': ' +
        chalk.red(mod.currentVersion) + ' should be ' +
        chalk.green(mod.versionRequirement)
      )
    }
  }

  if (warnings.length) {
    console.log('')
    console.log(chalk.yellow('To use this project, you must update the following:'))
    console.log()

    for (let i = 0; i < warnings.length; i++) {
      console.log('  ' + warnings[i])
    }

    console.log()
    process.exit(1)
  }
}
