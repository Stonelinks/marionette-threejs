var TransformControl = m3js.TransformControl = Backbone.Model.extend({

  defaults: {
    attachedDrawable: undefined,

    mode: 'translate', // translate, rotate or scale
    space: 'local' // local or world
  },

  _control: undefined,

  initializeControl: function() {

    var _this = this;

    this._control = new THREE.TransformControls(this.renderer.camera, this.renderer.renderer.domElement);

    this._control.addEventListener('change', function() {

      var drawable = _this.get('attachedDrawable');
      var elementsFloat32Arr = drawable.getMesh().matrix.elements;
      var elements = Array.prototype.slice.call(elementsFloat32Arr);
      var e = elements;

      // elements
      // 0 4 8 12 1 5 9 13 2 6 10 14 3 7 11 15

      // set: function (n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44)
      //                 0,   1,   2,   3,   4,   5,   6,   7,   8,   9,   10,  11,  12,  13,  14,  15

      // var te = this.elements;

      // te[ 0 ] = n11; te[ 4 ] = n12; te[ 8 ] = n13; te[ 12 ] = n14;
      // te[ 1 ] = n21; te[ 5 ] = n22; te[ 9 ] = n23; te[ 13 ] = n24;
      // te[ 2 ] = n31; te[ 6 ] = n32; te[ 10 ] = n33; te[ 14 ] = n34;
      // te[ 3 ] = n41; te[ 7 ] = n42; te[ 11 ] = n43; te[ 15 ] = n44;

      var elementsRowMajor = [e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14], e[3], e[7], e[11], e[15]];

      // col-major (elements - sanity check): [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 101, 102, 1]
      // row-major (set - sanity check): [0, ]

      if (!_.isEqual(drawable.get('matrix'), elementsRowMajor)) {
        drawable.set('matrix', elementsRowMajor);
        // drawable.trigger('change:matrix');
        drawable.save({
          // silent: true
        });
      }
    });

    _this.renderer.scene.add(_this._control);
  },

  getControl: function() {
    return this._control;
  },

  getAttachedDrawable: function() {
    return this.get('attachedDrawable');
  },

  attachDrawable: function(drawable) {
    if (this.get('attachedDrawable') !== drawable) {
      this.set('attachedDrawable', drawable);
      this._control.attach(drawable.getMesh());
    }
  },

  detachDrawable: function(drawable) {
    drawable = drawable || this.get('attachedDrawable');
    this.set('attachedDrawable', undefined);
    if (drawable) {
      this._control.disable(drawable.getMesh());
    }
    else {
      console.log('TransformControl: can\'t detach nonexistant drawable');
    }
  },

  hasAttachedDrawable: function() {
    return this.get('attachedDrawable');
  },

  controlEventMap: {
    'mousedown': 'onPointerDown',
    'touchstart': 'onPointerDown',

    'mousemove': ['onPointerHover', 'onPointerMove'],
    'touchmove': ['onPointerHover', 'onPointerMove'],

    'mouseup': 'onPointerUp',
    'mouseout': 'onPointerUp',
    'touchend': 'onPointerUp',
    'touchcancel': 'onPointerUp',
    'touchleave': 'onPointerUp'
  },

  dispatchDOMEvent: function(e) {
    var _this = this;
    var handlers = this.controlEventMap[e.type];
    var handlerNames = _.isArray(handlers) ? handlers : [handlers];
    handlerNames.forEach(function(handlerName) {
      if (_this._control[handlerName]) {
        _this._control[handlerName].call(_this._control, e);
      }
    });
  },

  intersectsControl: function(e) {
    var _this = this;
    var handlers = this.controlEventMap[e.type];
    var handlerNames = _.isArray(handlers) ? handlers : [handlers];
    var ret;
    handlerNames.forEach(function(handlerName, i) {
      var intersects = _this._control.eventIntersectsControl(handlerName, e);
      if (i == 0) {
        ret = intersects;
      }
      else {
        ret = ret || intersects;
      }
    });
    return ret;
  },

  isDragging: function() {
    return this._control.isDragging();
  },

  renderer: undefined,

  initialize: function(options) {
    this.renderer = options.renderer;
    this.initializeControl();

    this.on('change:mode', function() {
      this._control.setMode(this.get('mode'));
    });

    this.on('change:space', function() {
      this._control.setSpace(this.get('space'));
    });
  }
});
