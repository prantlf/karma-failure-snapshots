# karma-failure-snapshots

[![Latest version](https://img.shields.io/npm/v/karma-failure-snapshots)
 ![Dependency status](https://img.shields.io/librariesio/release/npm/karma-failure-snapshots)
](https://www.npmjs.com/package/karma-failure-snapshots)

[Karma] plugin for taking snapshots of the web browser state whenever a test fails.

If your tests fail in an environment, which is difficult to debug, or if they do not fail during debugging, or if they fail intermittently, this plugin may help you to investigate the problem.

The following favourite test frameworks are supported:

- [Jasmine] by [karma-failure-snapshots-jasmine]
- [Mocha] by [karma-failure-snapshots-mocha]
- [QUnit] by [karma-failure-snapshots-qunit]

Additional frameworks can be supported by adding another plugin that implements the interface.

### Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Options](#options)
- [Writing Tests](#writing-tests)
- [Failure Snapshot Format](#failure-snapshot-format)
- [Plugin Interface](#plugin-interface)
- [Contributing](#contributing)
- [Release History](#release-history)
- [License](#license)

## Installation

Make sure, that you have installed [Node.js] 12 or newer. Then you can install this plugin by [NPM] or [Yarn]:

    npm install --save-debug karma-failure-snapshots

Usually you will install this plugin together with `karma` itself and unit testing frameworks and their plugins. For example, the typical installation for tests using `mocha`:

    npm install --save-debug karma karma-mocha karma-chai mocha chai
        karma-chrome-launcher karma-firefox-launcher \
        karma-failure-snapshots karma-failure-snapshots-mocha

See an [example] how to introduce tests with failure snapshots in a project.

## Configuration

This plugin has to be aded to the `frameworks` array in the Karma configuration file, usually `karma.conf.js`:

    frameworks: [ 'failure-snapshots', ... ],

You will add it with an additional plugin supporting your unit test framework, which you will place in front of it. The specific plugins have the naming convention `failure-snapshots-<framework>`. When you add other karma framework plugins to support your unit test framework, make sure, that you *place the failure snapshot plugins before them*. For example, a typical configuration for `mocha`:

    module.exports = function (config) {
      config.set({
        frameworks: [
          'failure-snapshots-mocha', 'failure-snapshots', 'mocha', 'chai'
        ],
        ...
      })
    }

The failure snapshot plugins extend the unit test framework and that is why it has to be loaded after it. Generally, framework plugins insert their scripts to be loaded by the browser to the beginning. If you place the failure snapshot plugins to the front, the later added test framework plugins will insert their scripts before the earlier added ones. Just follow the reverse order of dependencies among the plugins.

## Options

The plugin supports a few options to customize the location to save the snapshots too and other parameters. The following are the defaults:

    module.exports = function (config) {
      config.set({
        ...,
        // Configure the server-side of the plugin
        failureSnapshots: {
          failuresDirectory: 'failures', // Relative to the current directory
          snapshotNamePadding: 4,        // Cover up to 9999 snapshots
          summaryTemplate: null          // Use the built-in page template
          browserDirectory: true         // Create a directory for each browser
        },
        // Configure the client-side of the plugin and its extensions
        client: {
          failureSnapshots: {
            includePassed: false,   // Do not take snapshots of passing tests
            hideFunctionsFrom: null // File names to omit from call stacks; let
                                    // the specific test framework set this
          }
        }
      })
    }

| Option                | Default    | Descripton |
| :-------------------- | :--------- | :--------- |
| `failuresDirectory`   | "failures" | Snapshots and the summary will be written there. It will be cleared on each test run. |
| `snapshotNamePadding` | 4          | Length of the snapshot file name, left-padded by zeros. Snapshots are numbered from one by incrementing a counter. |
| `summaryTemplate`     | `null`     | File with a Handlebars template of the summary page. See the [built-in page] for more information. |
| `browserDirectory`    | `true`     | Create a sub-directory for each browser inside `failuresDirectory` |
| `includePassed`       | `false`    | Can enable taking snapshots of passing tests too. Probably for experimental purposes. |
| `hideFunctionsFrom`   | `null`     | Array of file names to ignore from stacktraces formatted by the unit test framework. Framework plugins supply this value, but you might have a custom one, or you might want to omit more stack frames. |

## Writing Tests

Usually you will not need to modify your tests. The snapshots will just be taken, once a test spec fails or throws an unexpected error. For example, a typical test using `mocha` with set-up and tear-down phases.

    describe('test suite', function () {
      before(function () {
        // Render a component in the document body
      })

      after(function () {
        // Clean up the document body
      })

      it('test spec 1', function () {
        ...
      })

      ...
    })

The automatic snapshot taking is using the `afterEach` hook of the particular unit test framework. If you implement this hook and perform a page clean-up, which would remove content important for inspection, the snapshot will be taken after your clean-up and thus not be useful:

    describe('test suite', function () {
      beforeEach(function () {
        // Render a component in the document body
      })

      afterEach(function () {
        // Clean up the document body
      })

      it('test spec 1', function () {
        ...
      })

      ...
    })

If you have such clean-up, insert an additional `afterEach` hook before the clean-up, which will make the snapshot of the problem:

    describe('test suite', function () {
      beforeEach(function () {
        // Render a component in the document body
      })

      // Ensure that a snapshot is taken immediately in case of failure
      afterEach(window.ensureFailureSnapshot)

      afterEach(function () {
        // Clean up the document body
      })

      it('test spec 1', function () {
        ...
      })

      ...
    })

The `ensureFailureSnapshot` will take a failure snapshot only if there is a failure. If there is no failure, this function will return without doing anything.

## Failure Snapshot Format

A failure snapshot consists the following two parts:

* *Snapshot* - document content of the current window (content of the `<html>` element)
* *Screenshot* - picture of the current window (content of the `<body>` element)

All failure snapshots are stored in a directory with a summary. The summary is a HTML page listing all failed tests and linking them to their failure snapshots. It includes messages and stacktraces too.

    failures/
      snapshots/
        0001.html
        0001.png
        0002.html
        0002.png
        ...
      index.html

## Plugin Interface

Plugins are supposed to all the method `collectFailureSnapshot` to collect information about a failure snapshot. If taking a snapshot has to be done earlier, than the collection, `takeFailureSnapshot` can be called separately and its output passed to `collectFailureSnapshot`. (`takeFailureSnapshot` is asynchronous and if its output is passed to `collectFailureSnapshot`, the latter will run synchronously.) Both methods are exposed in the `window.__failure_snapshots__` object.

Failure snapshots are usually taken from an `afterEach` hook, which can be asynchronous. It is essential to take them right after a test failed, so that the web page can be inspected while it still shows the failure.

See the [mocha plugin] as an example how to write a custom one.

### collectFailureSnapshot(data: Object [, done: Function]): none|Promise

The `data` argument is an object with the following properties:

    {
      description: "the full description of the test spec",
      stack: "message and stacktrace of the failure",
      snapshot: "HTML content of the document element",
      screenshot: "Base64-encoded PNG content of the window screenshot",
      failure: <boolean flag if the test failed>,
      pass: <boolean flag if the test succeeded>,
      earlySnapshot: <optional object returned by takeFailureSnapshot>
    }

The `done` argument is a function to be called, when the failure snapshot collection has finished. It will be called in both asynchronous or synchronous execution cases.

Returns a promise, which you can wait for, if it runs asynchronously. If it runs synchronously, the result is unspecified and not a promise.

### takeFailureSnapshot(): Promise

Returns a promise to an object, which is supposed o pass to the `data` argument for `collectFailureSnapshot` as the `earlySnapshot` property.

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding style.  Add unit tests for any new or changed functionality. Lint and test your code using Grunt.

## License

Copyright (c) 2019-2022 Ferdinand Prantl

Licensed under the MIT license.

[karma-failure-snapshots-jasmine]: https://github.com/prantlf/karma-failure-snapshots-jasmine#readme
[karma-failure-snapshots-mocha]: https://github.com/prantlf/karma-failure-snapshots-mocha#readme
[karma-failure-snapshots-qunit]: https://github.com/prantlf/karma-failure-snapshots-qunit#readme
[Node.js]: https://nodejs.org/
[NPM]: https://www.npmjs.com/get-npm
[Yarn]: https://yarnpkg.com/lang/en/docs/install/
[Karma]: https://karma-runner.github.io/
[Mocha]: https://mochajs.org/
[Jasmine]: https://jasmine.github.io/
[QUnit]: https://qunitjs.com/
[Handlebars]: https://handlebarsjs.com/
[built-in page]: https://github.com/prantlf/karma-failure-snapshots/blob/master/
[example]: https://github.com/prantlf/karma-failure-snapshots/blob/master/example
[mocha plugin]: https://github.com/prantlf/karma-failure-snapshots-mocha/blob/master/lib/adapter.js
