/* global describe, it, beforeAll, afterAll, expect */

function crash () {
  throw new Error('Crashing...')
}

describe('answerEverything', function () {
  beforeAll(function () {
    const element = document.body
    window.answerEverything(element)
    this.answer = element.textContent
  })

  afterAll(function () {
    document.body.innerHTML = ''
  })

  it('answers', function () {
    expect(typeof this.answer === 'string' || this.answer instanceof String).toBeTruthy()
    crash()
  })

  it('answers legibly', function () {
    expect(this.answer.length).toBeGreaterThan(0)
  })

  it('answers concisely', function (done) {
    setTimeout(function () {
      expect(this.answer.length).toBeLessThan(3)
      done()
    }.bind(this))
  })

  it('answers understandably', function (done) {
    setTimeout(function () {
      expect(this.answer).toMatch(/\d+/)
      crash()
      done()
    }.bind(this))
  })

  it('answers concretely', function () {
    expect(this.answer).toEqual('43')
  })
})
