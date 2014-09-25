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
    }
  },

  transformControl: undefined,

  initialize: function(options) {
    this.transformControl = options.transformControl;
  }
});
