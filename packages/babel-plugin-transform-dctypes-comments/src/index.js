const syntaxDCTypes = require('@andywer/babel-plugin-syntax-dctypes')
const { findSiblingDeclarationNode } = require('@andywer/babel-plugin-transform-dctypes-to-flow')

module.exports = babelPluginDCTypeComments

function babelPluginDCTypeComments () {
  return {
    inherits: syntaxDCTypes,

    visitor: {
      TypeDeclaration (path) {
        const { id, typeAnnotation } = path.node

        const declarationNode = findSiblingDeclarationNode(path, id)

        if (!declarationNode) {
          throw path.buildCodeFrameError(`Type declared for '${id.name}', but it's implementation could not be found. '${id.name}' should be declared in the same scope.`)
        }
        if (declarationNode.typeAnnotation) {
          throw path.buildCodeFrameError(`Double type annotations found for ${id.name}`)
        }

        path.addComment('trailing', ' ' + generateComment(path), true)
        path.remove()
      }
    }
  }
}

function generateComment(path) {
  return path.getSource()
    .replace(/\*-\//g, "*-ESCAPED/")    // taken from babel-plugin-transform-flow-comments
    .replace(/\*\//g, "*-/")
    .replace(/\n\s+/mg, ' ')
}
