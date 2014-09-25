$(document).ready(function() {

  var ObjectAddView = Marionette.ItemView.extend({

    template: '#object-add-template',

    events: {

      'click #add-box': function(e) {
        this.createNewDrawable({
          texture: '/example/crate.gif',
          geometryType: 'BoxGeometry',
          geometryParams: [200, 200, 200]
        });
      },

      'click #add-torus': function(e) {
        this.createNewDrawable({
          texture: '/example/crate.gif',
          geometryType: 'TorusGeometry',
          geometryParams: [50, 20, 20, 20]
        });
      }
    },

    createNewDrawable: function(options) {

      var newDrawable = new this.collection.model(options);

      var _this = this;
      this.collection.once('drawable:loaded', function(newDrawable) {
        _this.transformControl.attachDrawable(newDrawable);
      });

      this.collection.add(newDrawable);
      newDrawable.save();
    },

    transformControl: undefined,

    initialize: function(options) {
      this.transformControl = options.transformControl;
    }
  });

  // Backbone.sync: Overrides with dummy function
  Backbone.sync = function(method, model, options) {
    options.success();
  };

  var TransformControlMode = m3js.TransformControlMode.extend({
    template: '#transform-control-template'
  });

  var Drawables = Backbone.Collection.extend({
    model: m3js.Drawable
  });

  var myApp = new Backbone.Marionette.Application();

  myApp.addInitializer(function(options) {

    myApp.addRegions({
      transformControlsAnchor: '#transform-control-anchor',
      rendererAnchor: '#renderer-anchor',
      objectAddAnchor: '#object-add-anchor'
    });

    var drawables = new Drawables();

    var renderer = new m3js.ThreeJSRenderer({
      collection: drawables
    });

    renderer.once('transformcontrols:create', function(transformControl) {

      var transformControlModeView = new TransformControlMode({
        transformControl: transformControl,
        collection: drawables
      });
      myApp.transformControlsAnchor.show(transformControlModeView);

      var objectAddView = new ObjectAddView({
        transformControl: transformControl,
        collection: drawables
      });
      myApp.objectAddAnchor.show(objectAddView);
    });

    myApp.rendererAnchor.show(renderer);
  });

  myApp.start();
});
