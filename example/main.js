$(document).ready(function() {
  
  // Backbone.sync: Overrides with dummy function
  Backbone.sync = function(method, model, success, error){
    success();
  }
  
  Backbone.$ = $;
  
  var ThreeJSRenderer = bb3js.ThreeJSRenderer.extend({
    template: '#renderer-template'
  })
  
  var ThreeJSRenderer = bb3js.ThreeJSRenderer.extend({
    template: '#renderer-template'
  })
  
  var Drawables = Backbone.Collection.extend({
    model: bb3js.Drawable
  })
  
  var drawables = new Drawables()
  
  var r = new ThreeJSRenderer({
    collection: drawables
  })
  
  debugger;

})
