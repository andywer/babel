const babel = require("babel-core")

const code = `
add :: (number, number) => number

function add (x, y) {
  return x + y
}
`
// const code = `
// add :: (number, number) => number
//
// function add (x, y) {
//   return x + y
// }
// `

const options = {
//  presets: ['stage-2', 'react'],
  plugins: [
    'transform-dctypes-to-flow',
    ["flow-runtime", {
      "assert": true,
      "annotate": true
    }]
  ]
}

const transformed = babel.transform(code, options)

console.log(`Transformed:\n${transformed.code}`)
