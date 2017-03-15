const syntaxDCTypes = require('@andywer/babel-plugin-syntax-dctypes')

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

function findSiblingDeclarationNode (path, idNode) {
  if (!path.inList) {
    throw path.buildCodeFrameError(`Type declaration of '${idNode.name}' has no sibling declarations. '${idNode.name}' should be declared in the same scope.`)
  }

  const siblingNodes = path.container.filter(node => node !== path.node)

  return findInArray(siblingNodes, sibling => {
    if (sibling.type === 'VariableDeclaration') {
      const matchingDecl = sibling.declarations.find(decl => decl.id && decl.id.name === idNode.name)
      return matchingDecl || null
    } else {
      return sibling.id && sibling.id.name === idNode.name
        ? sibling
        : null
    }
  })
}

/**
 * Works like `array.find(finder)` but returns the result of the first `finder`
 * call that did find something. Allows extraction of nested data.
 */
function findInArray(array, finder) {
  let match = null

  array.find((item, key) => {
    const result = finder(item, key)
    if (result) {
      match = result
      return true     // break loop
    } else {
      return false    // continue loop
    }
  })

  return match
}

function generateComment(path) {
  return path.getSource()
    .replace(/\*-\//g, "*-ESCAPED/")    // taken from babel-plugin-transform-flow-comments
    .replace(/\*\//g, "*-/")
    .replace(/\n\s+/mg, ' ')
}
