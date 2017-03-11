const syntaxFlow = require('babel-plugin-syntax-flow');

module.exports = function () {
  return {
    inherits: syntaxFlow,

    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("dctypes");
      parserOpts.plugins.push("functionBind");
    }
  };
}
