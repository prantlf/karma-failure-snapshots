module.exports = function (config) {
  config.set({
    basePath: '..',
    files: [
      'src/index.js',
      'test-mocha/index.test.js'
    ],

    frameworks: ['failure-snapshots-mocha', 'failure-snapshots', 'mocha', 'chai'],
    browsers: ['ChromeHeadless', 'FirefoxHeadless'],

    singleRun: true
  })
}
