const syntaxDCTypes = require('@andywer/babel-plugin-syntax-dctypes')

module.exports = babelPluginDCTypesToFlow
module.exports.findSiblingDeclarationNode = findSiblingDeclarationNode

function babelPluginDCTypesToFlow ({ types }) {
  return {
    inherits: syntaxDCTypes,

    visitor: {
      Program (path) {
        const FLOW_DIRECTIVE = '@flow'
        const { body } = path.node

        let typeDeclarations = 0
        const typeDeclarationVisitors = createTypeDeclarationVisitors(types, () => typeDeclarations++)

        // Do a `path.traverse()` here, instead of adding it to the plugin's main visitor property.
        // So we make sure that all these conversions are done before other plugins are run.
        path.traverse(typeDeclarationVisitors)

        if (body.length > 0 && typeDeclarations > 0) {
          const { leadingComments = [] } = body[0]

          if (leadingComments.every(comment => comment.value.indexOf(FLOW_DIRECTIVE) === -1)) {
            path.addComment('leading', ' @flow ')
          }
        }
      }
    }
  }
}

function createTypeDeclarationVisitors (types, onVisit) {
  return {
    TypeDeclaration (path) {
      const { id, typeAnnotation } = path.node

      const declarationNode = findSiblingDeclarationNode(path, id)

      if (!declarationNode) {
        throw path.buildCodeFrameError(`Type declared for '${id.name}', but it's implementation could not be found. '${id.name}' should be declared in the same scope.`)
      }
      if (declarationNode.typeAnnotation) {
        throw path.buildCodeFrameError(`Double type annotations found for ${id.name}`)
      }

      mergeTypeIntoDeclaration(types, path, typeAnnotation, declarationNode, id.name)
      onVisit(path)
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

function mergeTypeIntoDeclaration (types, path, typeAnnotation, declarationNode, declarationIdentName) {
  switch (declarationNode.type) {
    case 'FunctionDeclaration':
      mergeTypeIntoFunction(types, path, typeAnnotation, declarationNode, declarationIdentName)
      break
    case 'VariableDeclarator':
      if (declarationNode.init && (declarationNode.init.type === 'ArrowFunctionExpression' || declarationNode.init.type === 'FunctionExpression')) {
        mergeTypeIntoFunction(types, path, typeAnnotation, declarationNode.init, declarationIdentName)
      } else {
        declarationNode.id.typeAnnotation = types.typeAnnotation(typeAnnotation)
      }
      break
    default:
      console.error(`Warning: Unhandled declaration type: ${declarationNode.type}`)
      declarationNode.typeAnnotation = typeAnnotation
  }

  path.remove()
}

function mergeTypeIntoFunction (types, path, typeAnnotation, declarationNode, declarationIdentName) {
  const assert = createAssert(path)

  assert(typeAnnotation.type === 'FunctionTypeAnnotation', `${declarationIdentName} is a function, but it's been declared to be a ${typeAnnotation.type}.`)
  assert(typeAnnotation.params.length === declarationNode.params.length, `${declarationIdentName}'s parameters do not match the parameters declared.`)
  typeAnnotation.params.forEach((paramNode, index) => {
    declarationNode.params[index].typeAnnotation = types.typeAnnotation(paramNode.typeAnnotation)
  })
  declarationNode.returnType = types.typeAnnotation(typeAnnotation.returnType)
}

function createAssert (path) {
  return function assert (shouldBeTrue, message) {
    if (!shouldBeTrue) {
      throw path.buildCodeFrameError(message)
    }
  }
}
