/* global QUnit */

function crash () {
  throw new Error('Crashing...')
}

QUnit.module('answerEverything', function (hooks) {
  let element, answer

  hooks.afterEach(window.ensureFailureSnapshot)

  hooks.before(function () {
    element = document.createElement('p')
    document.body.appendChild(element)
    window.answerEverything(element)
    answer = element.textContent
  })

  hooks.after(function () {
    document.body.removeChild(element)
  })

  QUnit.test('answers', function (assert) {
    assert.ok(typeof answer === 'string' || answer instanceof String, 'Answer must exist')
    crash()
  })

  QUnit.test('answers legibly', function (assert) {
    assert.ok(answer.length > 0, 'Answer must not be empty')
  })

  QUnit.test('answers concretely', function (assert) {
    assert.equal(answer, 43, 'Answer must be "42"')
  })
})
