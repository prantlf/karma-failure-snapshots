module.exports = function (config) {
  config.set({
    basePath: '..',
    files: [
      'src/index.js',
      'test-qunit/index.test.js'
    ],

    frameworks: ['failure-snapshots-qunit', 'failure-snapshots', 'qunit'],
    browsers: ['ChromeHeadless', 'FirefoxHeadless'],

    singleRun: true
  })
}
