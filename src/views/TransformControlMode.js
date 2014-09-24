var TransformControlMode = m3js.TransformControlMode = Marionette.ItemView.extend({

  templateHelpers: function() {
    return {
      transformControlSpace: this.transformControl && capitalise(this.transformControl.get('space'))
    };
  },

  events: {
    'click #translate-mode': function(e) {
      this.transformControl.set('mode', 'translate');
    },

    'click #rotate-mode': function(e) {
      this.transformControl.set('mode', 'rotate');
    },

    'click #scale-mode': function(e) {
      this.transformControl.set('mode', 'scale');
    },

    'click #toggle-space': function(e) {
      var newSpace = this.transformControl.get('space') == 'local' ? 'world' : 'local';
      this.transformControl.set('space', newSpace);
      this.render();
    },

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
