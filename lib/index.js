const {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require('node:fs')
const { join } = require('node:path')
const { compile } = require('handlebars')

function createPattern(path) {
  return {
    pattern: path,
    included: true,
    served: true,
    watched: false
  }
}

function saveSnapshot(data, index, snapshotDirectory, snapshotNamePadding, logger) {
  mkdirSync(snapshotDirectory, { recursive: true })
  const snapshotName = String(index + 1).padStart(snapshotNamePadding, '0')
  const snapshotPath = join(snapshotDirectory, snapshotName)
  logger.debug('Saving failure snapshot:', snapshotPath)
  writeFileSync(snapshotPath + '.html', data.snapshot)
  const screenshot = Buffer.from(data.screenshot, 'base64')
  writeFileSync(snapshotPath + '.png', screenshot)
  return {
    description: data.description,
    stack: data.stack,
    number: snapshotName,
    failure: data.failure,
    pass: data.pass
  }
}

function formatSummary(failures, summaryTemplate) {
  const templateContent = readFileSync(summaryTemplate, 'utf-8')
  const templateFunction = compile(templateContent)
  return templateFunction({ failures })
}

function saveSnapshots(config, clientInfo, failureSnapshots, logger) {
  let { failuresDirectory, snapshotNamePadding, summaryTemplate, browserDirectory } = config
  if (browserDirectory) {
    failuresDirectory = join(failuresDirectory, clientInfo.name)
  }
  const snapshotDirectory = join(failuresDirectory, 'snapshots')
  try {
    const summary = failureSnapshots.map((data, index) =>
      saveSnapshot(data, index, snapshotDirectory, snapshotNamePadding, logger)
    )
    mkdirSync(failuresDirectory, { recursive: true })
    const summaryPath = join(failuresDirectory, 'index.html')
    logger.debug('Saving failure snapshot summary:', summaryPath)
    writeFileSync(summaryPath, formatSummary(summary, summaryTemplate))
  } catch (error) {
    logger.error('Failed saving failure snapshots:', error)
  }
}

function completePluginConfig(config) {
  return Object.assign(
    {
      failuresDirectory: 'failures',
      snapshotNamePadding: 4,
      summaryTemplate: join(__dirname, 'summary.hbs'),
      browserDirectory: true
    },
    config.failureSnapshots
  )
}

function clearFailuresDirectory(pluginConfig, logger) {
  const failuresDirectory = pluginConfig.failuresDirectory
  try {
    logger.debug('Cleaning failure snapshots:', failuresDirectory)
    if (existsSync(failuresDirectory)) {
      for (const file of readdirSync(failuresDirectory)) {
        const filePath = join(failuresDirectory, file)
        rmSync(filePath, { recursive: true })
      }
    }
    return true
  } catch (error) {
    logger.error('Failed clearing failure snapshots directory:', error)
  }
}

function injectClientScripts(files) {
  files.unshift(createPattern(join(__dirname, 'adapter.js')))
  files.unshift(createPattern(require.resolve('html2canvas')))
}

function onBrowserComplete(pluginConfig, logger, clientInfo, data) {
  if (clientInfo.lastResult.disconnected) {
    logger.warn('Failure snapshots are not available.')
  } else {
    const failureSnapshots = data && data.failureSnapshots
    if (failureSnapshots && failureSnapshots.length) {
      saveSnapshots(pluginConfig, clientInfo, failureSnapshots, logger)
    }
  }
}

function framework(files, config, emitter, loggerFactory) {
  const logger = loggerFactory.create('framework.failure-snapshots')
  const pluginConfig = completePluginConfig(config)
  if (clearFailuresDirectory(pluginConfig, logger)) {
    injectClientScripts(files)
    emitter.on('browser_complete', (clientInfo, data) =>
      onBrowserComplete(pluginConfig, logger, clientInfo, data)
    )
  }
}

framework.$inject = ['config.files', 'config', 'emitter', 'logger']

module.exports = {
  'framework:failure-snapshots': ['factory', framework]
}
