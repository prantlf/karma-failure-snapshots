/* global html2canvas */

(function () {
  'use strict'

  const failureSnapshots = []

  function getPageScreenshot (options) {
    options = Object.assign({
      allowTaint: true,
      foreignObjectRendering: true,
      logging: false,
      scale: 1,
      useCORS: true
    }, options)
    return html2canvas(document.body, options)
      .then(function (canvas) {
        return canvas
          .toDataURL('image/png')
          .substr(22)
      })
  }

  function ensureMethodName (methodName) {
    return methodName || 'Unknown'
  }

  function shortenLocation (stackFrame) {
    // @http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:7:7
    return stackFrame
      .replace(/^.+\/base\//, '')
      .replace(/\?[^: ]+/, '')
  }

  function formatStackFrame (method, location) {
    return '  at ' + ensureMethodName(method) +
      ' (' + shortenLocation(location) + ')'
  }

  function reformatMessage (line) {
    // Died on test #2     at Object.<anonymous> (http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:23:9)
    // Error: Crashing... in http://localhost:9876/base/test-jasmine/index.test.js?cf52c74dd7c6bad2d65d599a477e2feea671697e (line 4)
    // Died on test #2 @http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:23:9
    // Died on test #2 http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:23:13
    const match = /\s+at (\S+) \(([^)]+(?::\d+){1,2})\)$/.exec(line) || // Chrome
      / in ()(\S+ \(line \d+\))$/.exec(line) || // Safari
      / (?:(\S*)@)?(\S+(?::\d+){1,2})$/.exec(line) // Firefox
    return match
      ? line.substr(0, match.index) + '\n' +
        formatStackFrame(match[1], match[2])
      : line
  }

  function skipStackFrame (line) {
    //     at <Jasmine>
    // <Jasmine>
    // promiseReactionJob@[native code]
    // [native code]
    return /^(?:\s+at )?<[^>]+>$/.exec(line) ||
      /\[native code\]/.exec(line)
  }

  function containsTestedCode (line, ignoredFiles) {
    return ignoredFiles.every(function (ignoredFile) {
      return line.indexOf(ignoredFile + ':') < 0
    })
  }

  function unifyStackFrame (line) {
    //     at processModule (http://localhost:9876/base/node_modules/qunit/qunit/qunit.js?33c76b37e3944ddbfc9cda0f2f4891094b8f1d97:1191:16)
    //     at Object.module$1 [as module] (http://localhost:9876/base/node_modules/qunit/qunit/qunit.js?33c76b37e3944ddbfc9cda0f2f4891094b8f1d97:1216:4)
    //     at Object.<anonymous> (http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:25:5)
    //     at http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:7:7: Crashing...
    //     at http://localhost:9876/base/node_modules/qunit/qunit/qunit.js?33c76b37e3944ddbfc9cda0f2f4891094b8f1d97:2627:8
    // processModule@http://localhost:9876/base/node_modules/qunit/qunit/qunit.js?33c76b37e3944ddbfc9cda0f2f4891094b8f1d97:1191:16
    // module$1@http://localhost:9876/base/node_modules/qunit/qunit/qunit.js?33c76b37e3944ddbfc9cda0f2f4891094b8f1d97:1216:4
    // processTaskQueue/<@http://localhost:9876/base/node_modules/qunit/qunit/qunit.js?33c76b37e3944ddbfc9cda0f2f4891094b8f1d97:2627:8
    // @http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:7:7
    // global code@http://localhost:9876/base/test-qunit/index.test.js?6dd492cd7df41bd57315374ab4211e04e747bcca:7:13: Crashing...
    const match = /^(?:\s+at )?(?:([^)]+) )?\(([^)]+(?::\d+){1,2})\)$/.exec(line) ||
      /^(?:\s+at )?(?:([^)]+) )?(\S+(?::\d+){1,2})$/.exec(line) ||
      /^([^@]+)?@(\S+(?::\d+){1,2})(?::.+)?$/.exec(line) ||
      /^()(\S+(?::\d+){1,2})$/.exec(line)
    return match ? formatStackFrame(match[1], match[2]) : line
  }

  function cleanStack (stack, ignoredFiles) {
    return !stack
      ? ''
      : stack
        .split(/\r?\n/)
        .map(function (line, index) {
          if (index === 0) {
            return reformatMessage(line)
          }
          if (skipStackFrame(line)) {
            return undefined
          }
          return unifyStackFrame(line)
        })
        .filter(function (line) {
          return line &&
          (!ignoredFiles || containsTestedCode(line, ignoredFiles))
        })
        .join('\n')
  }

  window.__failure_snapshots__ = {
    takeFailureSnapshot: function (options) {
      return getPageScreenshot(options)
        .then(function (screenshot) {
          return {
            snapshot: document.documentElement.outerHTML,
            screenshot
          }
        })
    },

    collectFailureSnapshot: function (data, done) {
      const earlySnapshot = data.earlySnapshot

      function storeFailureSnapshot (earlySnapshot) {
        failureSnapshots.push({
          description: data.description,
          stack: cleanStack(data.stack, data.hideFunctionsFrom),
          snapshot: earlySnapshot.snapshot,
          screenshot: earlySnapshot.screenshot,
          failure: data.failure,
          pass: data.pass
        })
      }

      if (earlySnapshot) {
        storeFailureSnapshot(earlySnapshot)
        done && done()
      } else {
        return this.takeFailureSnapshot(data.screenshotOptions)
          .then(function (earlySnapshot) {
            storeFailureSnapshot(earlySnapshot)
          })
          .catch(function (error) {
            console.log('Taking the failure snapshot failed:')
            console.log(' ', data.description)
            console.error(error)
          })
          .finally(done)
      }
    }
  }

  const complete = window.__karma__.complete
  window.__karma__.complete = function (data) {
    data || (data = {})
    data.failureSnapshots = failureSnapshots
    return complete.call(this, data)
  }
})()
