var ThreeJSRenderer = m3js.ThreeJSRenderer = Marionette.ItemView.extend({

  template: _.template('<div></div>'),

  collectionEvents: {
    'remove': function(drawable) {
      this.removeDrawable(drawable);
    },

    // this basically takes the place of the add event
    'drawable:loaded': function(drawable) {
      this.addDrawable(drawable);
    }
  },

  _transformControlDragging: false,

  onPointerDown: function(e) {
    this.dispatchDOMEventToControls(e);
  },

  onPointerHover: function(e) {
    this.dispatchDOMEventToControls(e);
  },

  onPointerMove: function(e) {
    this.dispatchDOMEventToControls(e);
  },

  onPointerUp: function(e) {
    this.dispatchDOMEventToControls(e);

    if (!this._transformControlDragging) {
      var searchList = [];
      this.collection.forEach(function(model) {
        var baseMesh = model.getMesh();
        if (baseMesh) {
          var meshes = [];
          baseMesh.traverse(function(mesh) {
            if (mesh) {
              meshes.push(mesh);
            }
          });
          meshes.forEach(function(mesh) {
            searchList.push({
              drawable: model,
              mesh: mesh
            });
          });
        }
      });

      this._raycast({
        event: e,
        callback: function(intersections) {

          var raycastedDrawable;
          if (intersections[0]) {
            raycastedDrawable = _.findWhere(searchList, {
              mesh: intersections[0].object
            }).drawable;
          }

          if (raycastedDrawable) {
            this.transformControl.attachDrawable(raycastedDrawable);
          }
        }
      });
    }
  },

  onMouseWheel: function(e) {
    this.dispatchDOMEventToControls(e);
  },

  onKeyDown: function(e) {
    this.dispatchDOMEventToControls(e);
  },

  onContextMenu: function(e) {
    this.dispatchDOMEventToControls(e);
  },

  getWidth: function() {
    return window.innerWidth - this.$el.find('div').offset().left - 1.0;
  },

  getHeight: function() {
    return window.innerHeight - this.$el.find('div').offset().top - 5.25; // why?
  },

  camera: undefined,
  scene: undefined,
  renderer: undefined,

  setupRenderer: function() {
    this.renderer = new THREE.WebGLRenderer({
      precision: 'highp',
      antialias: true
    });
    this.renderer.sortObjects = false;
    this.renderer.setSize(this.getWidth(), this.getHeight());

    this.renderer.setClearColor(0xaaaaaa);

    var _this = this;
    var _setRendererDOMElement = function() {
      _this.$el.find('div').append(_this.renderer.domElement);
    };
    _setRendererDOMElement();
    this.on('render', _setRendererDOMElement);
  },

  setupCamera: function() {
    this.camera = new THREE.PerspectiveCamera(70, this.getWidth() / this.getHeight(), 0.01, 10000.0);
    this.camera.position.set(1000, 500, 1000);
    this.camera.lookAt(new THREE.Vector3(0, 200, 0));
  },

  setupScene: function() {
    this.scene = new THREE.Scene();

    var grid = new THREE.GridHelper(1000, 100);
    grid.setColors(0x444444, 0x888888);
    this.scene.add(grid);

    var light = new THREE.HemisphereLight(0xFFFFFF, 0x645943);
    light.position.set(0, 50.0, 0);
    this.scene.add(light);
  },

  addDrawable: function(drawable) {
    console.log('ThreeJSRenderer: add drawable');

    var mesh = drawable.getMesh();
    if (mesh) {
      this.scene.add(mesh);
    }
  },

  removeDrawable: function(drawable) {
    console.log('ThreeJSRenderer: remove drawable');

    var mesh = drawable.getMesh();
    if (mesh) {
      this.scene.remove(mesh);
    }
  },

  onWindowResize: function() {
    this.camera.aspect = this.getWidth() / this.getHeight();
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.getWidth(), this.getHeight());
  },

  startWebGLRendering: function() {
    var _this = this;
    var _render = function() {
      _this.transformControl.getControl().update();
      _this.renderer.render(_this.scene, _this.camera);
    };

    var _animate = function() {
      requestAnimationFrame(_animate);
      _render();
    };
    _animate();
  },

  pointerVector: new THREE.Vector3(),
  rayCaster: new THREE.Raycaster(),
  projector: new THREE.Projector(),

  _raycast: function(options) {
    var e = options.event;
    var callback = options.callback;

    if (!callback) {
      return;
    }

    var meshes = [];
    if (!options.meshes) {
      this.collection.forEach(function(model) {
        if (model.getMesh()) {
          meshes.push(model.getMesh());
        }
      });
    }
    else {
      meshes = options.meshes;
    }

    var rect = this.renderer.domElement.getBoundingClientRect();

    var x = (e.clientX - rect.left) / rect.width;
    var y = (e.clientY - rect.top) / rect.height;
    this.pointerVector.set((x) * 2.0 - 1.0, -(y) * 2.0 + 1.0, 0.5);

    this.projector.unprojectVector(this.pointerVector, this.camera);
    this.rayCaster.set(this.camera.position, this.pointerVector.sub(this.camera.position).normalize());

    var intersections = this.rayCaster.intersectObjects(meshes, true);

    callback.call(this, intersections);
  },

  transformControl: undefined,
  orbitControl: undefined,

  setupTransformControl: function() {

    // reuse the same transformControl instance
    if (!this.transformControl) {
      this.transformControl = new TransformControl({
        renderer: this
      });
      this.trigger('transformcontrols:create', this.transformControl);
    }
  },

  disableTransformControl: function() {
    if (this.transformControl && this.transformControl.hasAttachedDrawable()) {
      this.transformControl.detachDrawable();
    }
  },

  setupOrbitControl: function() {

    // reuse the same orbitControl instance
    if (!this.orbitControl) {
      this.orbitControl = new OrbitControl({
        renderer: this
      });
    }
    else {
      this.orbitControl.enable();
    }
  },

  disableOrbitControl: function() {
    if (this.orbitControl && this.orbitControl.isEnabled()) {
      this.orbitControl.disable();
    }
  },

  setupPointerEvents: function() {
    var domElement = this.renderer.domElement;
    var eventMap = {
      'mousedown': 'onPointerDown',
      'touchstart': 'onPointerDown',

      'mousemove': ['onPointerHover', 'onPointerMove'],
      'touchmove': ['onPointerHover', 'onPointerMove'],

      'mouseup': 'onPointerUp',
      'mouseout': 'onPointerUp',
      'touchend': 'onPointerUp',
      'touchcancel': 'onPointerUp',
      'touchleave': 'onPointerUp',

      'mousewheel': 'onMouseWheel',
      'DOMMouseScroll': 'onMouseWheel',

      'keydown': 'onKeyDown',

      'contextmenu': 'onContextMenu'
    };

    var _this = this;
    _.forEach(eventMap, function(handlerName, eventName) {
      var handlerNames = _.isArray(handlerName) ? handlerName : [handlerName];
      handlerNames.forEach(function(handlerName) {
        domElement.addEventListener(eventName, _this[handlerName].bind(_this), false);
      });
    });
  },

  dispatchDOMEventToControls: function(e) {

    // only dispatch to orbit control if not intersecting transform control
    if (!this.transformControl.intersectsControl(e)) {
      this.orbitControl.dispatchDOMEvent(e);
    }

    if (this.transformControl) {
      this._transformControlDragging = this.transformControl.isDragging();
      this.transformControl.dispatchDOMEvent(e);
    }
    else {
      this._transformControlDragging = false;
    }
  },

  initialize: function(options) {
    this.once('show', function() {
      this.setupRenderer();
      this.setupCamera();
      this.setupScene();

      this.setupPointerEvents();

      this.setupTransformControl();
      this.setupOrbitControl();

      this.collection.fetch();

      var _this = this;
      window.addEventListener('resize', function() {
        _this.onWindowResize();
      }, false);

      _this.startWebGLRendering();
      _this.render();
    });
  }
});
