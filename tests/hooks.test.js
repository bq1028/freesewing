let expect = require("chai").expect;
let freesewing = require("./dist/index.js");

it("Should contain all hooks", () => {
  let pattern = new freesewing.Pattern();
  let h = pattern.hooks;
  let test = {
    preDraft: [],
    postDraft: [],
    preSample: [],
    postSample: [],
    preRender: [],
    postRender: [],
    insertText: [],
    debug: []
  };
  expect(h).to.eql(test);
});
