/* global describe, it, before, after, expect */

function crash () {
  throw new Error('Crashing...')
}

describe('answerEverything', function () {
  before(function () {
    var element = document.body
    window.answerEverything(element)
    this.answer = element.textContent
  })

  after(function () {
    document.body.innerHTML = ''
  })

  it('answers (throws)', function () {
    expect(this.answer).to.be.a('string')
    crash()
  })

  it('answers legibly (succeeds)', function () {
    expect(this.answer.length).to.be.above(0)
  })

  it('answers concisely (fails asynchronously)', function (done) {
    setTimeout(function () {
      expect(this.answer.length).to.be.below(3)
      done()
    }.bind(this))
  })

  it('answers understandably (throws asynchronously)', function (done) {
    setTimeout(function () {
      expect(this.answer).to.match(/\d+/)
      crash()
      done()
    }.bind(this))
  })

  it('answers concretely (fails)', function () {
    expect(this.answer).to.equal('43')
  })
})
