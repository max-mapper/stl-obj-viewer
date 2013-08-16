// adapted from http://lazarsoft.info/objstl
var THREE = require('three')

module.exports = function createViewer(container) {
  container = container || document.body
  var camera, scene, renderer, geometry, material, mesh, pointLight, vs

  var orgX,orgY

  var move = false
  var wire = false
  
  load()
  
  return {
    readStl: function(stl) {
      buildGeometry(stl, {name: 'file.stl'})
    },
    readObj: function(obj) {
      buildGeometry(obj, {name: 'file.obj'})
    }
  }

  function ev_mousedown(e) {
    if (!mesh) return
    e.stopPropagation()
    
    if (e.button == 0) move = false
    else if (e.button == 1) move = true
    else {
      wire = !wire
      material.wireframe = wire
      render()
      return
    }
    
    orgX = e.clientX
    orgY = e.clientY
    container.addEventListener('mousemove', ev_mousemove, false)
  }
  
  function ev_mouseup(e) {
    e.stopPropagation()
    container.removeEventListener('mousemove', ev_mousemove, false)
    return false
  }
  
  function ev_mousemove(e) {
    e.stopPropagation()
    if (!move) {
      mesh.rotation.y += (e.clientX - orgX) / 200
      mesh.rotation.x += (e.clientY - orgY) / 200
    } else {
      mesh.position.x += (e.clientX - orgX)
      mesh.position.y -= (e.clientY - orgY)
    }
    render()
    orgX = e.clientX
    orgY = e.clientY
  }
  
  function ev_mousewheel(e) {
    e.stopPropagation()
    if (e.wheelDelta) camera.position.z += e.wheelDelta / 2
    else camera.position.z -= e.detail * 10
    render()
  }
  
  function init() {
    var width = 500
    var height = 500

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000)
    camera.position.z = 500

    scene = new THREE.Scene()

    scene.add(camera)
    material = new THREE.MeshLambertMaterial({color: 0xCCCCCC, wireframe: false})

    var pointLight = new THREE.PointLight(0xFFFFFF)

    // set its position
    pointLight.position.x = 50
    pointLight.position.y = 50
    pointLight.position.z = 500

    // add to the scene
    scene.add(pointLight)

    if ("WebGLRenderingContext" in window) renderer = new THREE.WebGLRenderer()
    else renderer = new THREE.CanvasRenderer()

    renderer.setSize( width, height )

    container.appendChild( renderer.domElement )
    
    container.addEventListener('mousedown', ev_mousedown, false)
    container.addEventListener('mouseup', ev_mouseup, false)
    container.addEventListener('DOMMouseScroll', ev_mousewheel, false)
    container.addEventListener('mousewheel', ev_mousewheel, false)
  }
  
  function animate() {
    requestAnimationFrame( animate )
    render()
  }
  
  function render() {
    renderer.render( scene, camera )
  }
  
  function dragenter(e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  function dragover(e) {
    e.stopPropagation()
    e.preventDefault()
  }
  
  function drop(e) {
     e.stopPropagation()
     e.preventDefault()

     var dt = e.dataTransfer
     var files = dt.files

     handleFiles(files)
  }
   
  function readObj(oFile, vs, fs) {
    var l = oFile.split(/[\r\n]/g);

    for (var i=0; i < l.length; i++) {
      var ls = l[i].trim().split(/\s+/)
      if (ls[0] == "v") {
        var v = new THREE.Vector3(parseFloat(ls[1]) * 100, parseFloat(ls[2]) * 100, parseFloat(ls[3]) * 100)
        vs.push(v)
      }
      if (ls[0] === "f") {
        var f = new THREE.Face3(parseFloat(ls[1]) - 1, parseFloat(ls[2]) - 1, parseFloat(ls[3]) - 1)
        fs.push(f)
      }
    }
  }
  
  function readAsciiStl(l, vs, fs) {
    var solid = false
    var face = false
    var vis = []
    vtest = {}
    
    for(var i=0; i < l.length; i++) {
      var line = l[i]
      if (solid) {
        if (line.search("endsolid") > -1) solid = false
        else if(face) {
          if (line.search("endfacet") > -1) {
            face = false
            var f = new THREE.Face3(vis[0], vis[1], vis[2])
            fs.push(f)
          } else if (line.search("vertex") > -1) {
            var cs = line.substr(line.search("vertex") + 7)
            cs = cs.trim()
            var ls = cs.split(/\s+/)
            var v = new THREE.Vector3(parseFloat(ls[0]), parseFloat(ls[1]), parseFloat(ls[2]))
            var vi = vs.length
            if (cs in vtest) {
              vi = vtest[cs]
            } else {
              vs.push(v)
              vtest[cs] = vi
            }
            vis.push(vi)
          }
        }
        else {
          if (line.search("facet normal") > -1) {
            face = true
            vis = []
          }
        }
      }
      else {
        if (line.search("solid")> - 1) solid = true
      }
    }
    vtest = null
  }
  
  function triangle() {
    if (arguments.length == 2) {
      this._buffer = arguments[0]
      this._sa = arguments[1]
    } else {
      this._sa = 0
      this._buffer = new ArrayBuffer(50)
    }
    this.__byte = new Uint8Array(this._buffer)
    this.normal = new Float32Array(this._buffer, this._sa + 0, 3)
    this.v1 = new Float32Array(this._buffer, this._sa + 12, 3)
    this.v2 = new Float32Array(this._buffer, this._sa + 24, 3)
    this.v3 = new Float32Array(this._buffer, this._sa + 36, 3)
    var _attr = new Int16Array(this._buffer, this._sa + 48, 1)
    Object.defineProperty(this, "attr", {
      get: function(){
        return _attr[0]
      },
      set: function(val) {
        _attr[0] = val
      },
      enumerable: true
    })
  }
  
  function readBinaryStl(l, vs, fs) {
    var buf = new ArrayBuffer(l.length)
    var bbuf = new Uint8Array(buf)
    for (var i = 0; i < l.length; i++) bbuf[i] = l.charCodeAt(i)
    var trnr = new Uint32Array(buf, 80, 1)
    var vis = [0, 0, 0]
    var vtest = {}
    var offset = 84
    var face = new triangle()
    for (var i = 0; i < trnr[0]; i++) {
      for (var j = 0; j < 50; j++) face.__byte[j] = bbuf[offset + j]
      var v = new THREE.Vector3(face.v1[0], face.v1[1], face.v1[2])
      var k = "" + face.v1[0] + "," + face.v1[1] + "," + face.v1[2]
      vis[0] = vs.length
      if (k in vtest) vis[0] = vtest[k]
      else {
        vs.push(v)
        vtest[k] = vis[0]
      }

      v = new THREE.Vector3(face.v2[0], face.v2[1], face.v2[2])
      k = "" + face.v2[0] + "," + face.v2[1] + "," + face.v2[2]
      vis[1] = vs.length
      if (k in vtest) vis[1] = vtest[k]
      else {
        vs.push(v)
        vtest[k] = vis[1]
      }

      v = new THREE.Vector3(face.v3[0], face.v3[1], face.v3[2])
      k = "" + face.v3[0] + "," + face.v3[1] + "," + face.v3[2]
      vis[2] = vs.length
      if (k in vtest) vis[2] = vtest[k]
      else {
        vs.push(v)
        vtest[k] = vis[2]
      }

      var normal = new THREE.Vector3( face.normal[0], face.normal[1], face.normal[2] )
      var f = new THREE.Face3(vis[0], vis[1], vis[2], normal)
      fs.push(f)

      offset += 50
    }
    vtest = null
    delete bbuf
    delete buf
    buf = null
  }
  
  function readStl(oFile, vs, fs) {
    if (oFile instanceof ArrayBuffer) return arrayBufferToBinaryString(oFile, function(stl) {
      readBinaryStl(stl, vs, fs)
    })
    var solididx = oFile.search("solid")
    if (solididx > -1 && solididx < 10) {
      var l = oFile.split(/[\r\n]/g)
      readAsciiStl(l, vs, fs)
    } else {
      readBinaryStl(oFile, vs, fs)
    }
  }
  
  function buildGeometry(l, f) {
    var vs = []
    var fs = []
    if (f.name.indexOf(".obj") > -1) readObj(l, vs, fs)
    else if (f.name.indexOf(".stl") > -1) readStl(l, vs, fs)
    else return
    for (var i in fs) {
      var v0 = vs[fs[i].a]
      var v1 = vs[fs[i].b]
      var v2 = vs[fs[i].c]
      var e1 = new THREE.Vector3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z)
      var e2 = new THREE.Vector3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z)
      var n = new THREE.Vector3(e1.y * e2.z - e1.z * e2.y, e1.z * e2.x - e1.x * e2.z, e1.x * e2.y - e1.y * e2.x);
      var l = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z)
      n.x /= l
      n.y /= l
      n.z /= l
      fs[i].normal = n
    }
    var mx = 1e10, my = 1e10, mz = 1e10
    var Mx = -1e10, My = -1e10, Mz = -1e10
    for (var i in vs) {
      if (mx > vs[i].x) mx = vs[i].x
      if (my > vs[i].y) my = vs[i].y
      if (mz > vs[i].z) mz = vs[i].z
      if (Mx < vs[i].x) Mx = vs[i].x
      if (My < vs[i].y) My = vs[i].y
      if (Mz < vs[i].z) Mz = vs[i].z
    }
    var max = Math.max(Mx - mx, My - my, Mz - mz)
    max /= 200
    var cx = (Mx + mx) / 2
    var cy = (My + my) / 2
    var cz = (Mz + mz) / 2
    for (var i in vs) {
      vs[i].x -= cx
      vs[i].y -= cy
      vs[i].z -= cz
      vs[i].x /= max
      vs[i].y /= max
      vs[i].z /= max
    }
    var mx = 1e10, my = 1e10, mz = 1e10
    var Mx = -1e10, My = -1e10, Mz = -1e10
    for (var i in vs) {
      if (mx > vs[i].x) mx = vs[i].x
      if (my > vs[i].y) my = vs[i].y
      if (mz > vs[i].z) mz = vs[i].z
      if (Mx < vs[i].x) Mx = vs[i].x
      if (My < vs[i].y) My = vs[i].y
      if (Mz < vs[i].z) Mz = vs[i].z
    }
    geometry = new THREE.Geometry()
    geometry.vertices = vs
    geometry.faces = fs
    if (mesh) scene.remove( mesh )
    mesh = new THREE.Mesh( geometry, material )
    scene.add( mesh )
    render()
  }

  function handleFiles(f) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var oFile = e.target.result
      buildGeometry(oFile, f[0])
    }
    var file = f[0]
    reader.readAsBinaryString(file)
  }
  
  function arrayBufferToBinaryString(buf, callback) {
    var blob = new Blob([buf])
    var f = new FileReader()
    f.onload = function(e) {
      callback(e.target.result)
    }
    f.readAsBinaryString(blob)
  }

  function example(file) {
    var xhr = new XMLHttpRequest()
    xhr.open('GET',  file, true)
    xhr.onload  = function() {
      document.getElementById("centered").style.display = 'none'
      var oFile = this.response
      f = {}
      f.name = file
      buildGeometry(oFile, f)
    }
    xhr.send("")
  }

  function load() {
    init()
    // animate()
    if (window.File && window.FileReader && window.FileList && window.Blob) {
      // Great success! All the File APIs are supported.
      container.addEventListener("dragenter", dragenter, false)
      container.addEventListener("dragover", dragover, false) 
      container.addEventListener("drop", drop, false)
    } else {
      alert("The File API is needed for this application! Your browser is not supported!")
    }
  }
}
