# stl-obj-viewer

uses three.js to display a stl or obj file. based on [http://lazarsoft.info/objstl/](http://lazarsoft.info/objstl/)

[![NPM](https://nodei.co/npm/stl-obj-viewer.png)](https://npmjs.org/stl-obj-viewer)

## api

### var createViewer = require('stl-obj-viewer')

returns a function you can use to create a viewer instance

### var viewer = createViewer(containerElement)

returns a new viewer and appends the empty canvas to the dom inside containerElement. containerElement has to be a valid dom element, otherwise it will use document.body.

### viewer.readStl(stlStringOrBinary)

renders the stl to the viewer. calling this again will remove the old model and display the new one

### viewer.readObj(objString)

renders the obj to the viewer. calling this again will remove the old model and display the new one

## license

BSD