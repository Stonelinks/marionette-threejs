$(document).ready(function() {
  
  // Backbone.sync: Overrides with dummy function
  Backbone.sync = function(method, model, options){
    options.success();
  }
  
  var TransformControlMode = m3js.TransformControlMode.extend({
    template: '#renderer-template'
  })
  
  var Drawables = Backbone.Collection.extend({
    model: m3js.Drawable
  })

  var myApp = new Backbone.Marionette.Application();

  myApp.addInitializer(function(options) {

    myApp.addRegions({
      transformControlsAnchor: '#transform-control-anchor',
      rendererAnchor: '#renderer-anchor',
    });

    var drawables = new Drawables()
    
    var renderer = new m3js.ThreeJSRenderer({
      collection: drawables
    })
    
    renderer.once('transformcontrols:create', function(transformControl) {
      var transformControlModeView = new TransformControlMode({
        transformControl: transformControl
      })
      myApp.transformControlsAnchor.show(transformControlModeView)
    })
    
    myApp.rendererAnchor.show(renderer)

  });

  myApp.start();

})
