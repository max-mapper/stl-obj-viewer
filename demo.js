var stlViewer = require('./')
var perlin = require('perlin').noise.perlin3
var fill = require('ndarray-fill')
var continuous = require('ndarray-continuous')
var stl = require('ndarray-stl')
var zeros = require('zeros')

var viewer = stlViewer(document.querySelector('#one'))
var viewer2 = stlViewer(document.querySelector('#two'))

var scale = 0.075
var threshold = 0.125

var field = continuous({
  shape: [32, 32, 32],
  getter: function(position, done) {
    var shape = this.shape
    var array = zeros(shape)
    
    fill(array, function(x, y, z) {
      var noise = perlin(
        (position[0] * shape[0] + x) * scale,
        (position[1] * shape[1] + y) * scale,
        (position[2] * shape[2] + z) * scale
      )
      return (noise > threshold) ? 1 : 0
    })
    done(null, array)
  }
})

field.chunk([0, 0, 0], function(err, chunk) {
  var stlString = stl(chunk)
  viewer.readStl(stlString)
})

field.chunk([0, 0, 1], function(err, chunk) {
  var stlString = stl(chunk)
  viewer2.readStl(stlString)
})
