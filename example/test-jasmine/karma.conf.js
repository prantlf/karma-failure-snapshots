module.exports = function (config) {
  config.set({
    basePath: '..',
    files: [
      'src/index.js',
      'test-jasmine/index.test.js'
    ],

    frameworks: ['failure-snapshots-jasmine', 'failure-snapshots', 'jasmine'],
    browsers: ['ChromeHeadless', 'FirefoxHeadless'],

    singleRun: true
  })
}
