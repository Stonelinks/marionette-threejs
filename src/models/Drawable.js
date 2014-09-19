// creates instances
var construct = function(constructor, args) {
  var f = function() {
    return constructor.apply(this, args);
  };
  f.prototype = constructor.prototype;
  return new f();
};

zip.workerScriptsPath = '/vendor/zip/WebContent/';
URL = window.webkitURL || window.mozURL || window.URL;

var Drawable = BaseRealtimeModel.extend({
  defaults: {
    texture: '/img/crate.gif',
    geometryType: 'BoxGeometry',
    geometryParams: [200, 200, 200],
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    dofvalues: []
  },

  _mesh: undefined,
  _texture: undefined,
  _material: undefined,
  _geometry: undefined,

  initDrawable: function() {
    var _this = this;

    var _loaded = function() {
      if (_this.collection !== undefined) {
        _this.collection.trigger('drawable:loaded', _this);
      }
      _this.trigger('drawable:loaded', _this);

      _this.on('change:matrix', function() {
        // console.log('Drawable: update mesh');
        _this.updateMesh();
      });
      _this.updateMesh();
    };

    var _loadCollada = function(url, scale, loaderFunc) {
      scale = scale || 1.0;

      var loader = new THREE.ColladaLoader();
      loader.options.convertUpAxis = true;
      loader.load(url, function(collada) {
        var dae = collada.scene;

        if (collada.kinematics) {
          _this.kinematics = collada.kinematics;

          _this.on('change:dofvalues', function() {
            // console.log('Drawable: update dofvalues');
            _this.updateDOFValues();
          });
          _this.updateDOFValues();

          _this.set('dofvalues', _.map(collada.kinematics.joints, function(joint) {
            return joint.zeroPosition;
          }));
        }

        _this._mesh = dae;

        _loaded();

        dae.scale.x = dae.scale.y = dae.scale.z = scale;
        dae.updateMatrix();
      });
    };

    if (THREE.hasOwnProperty(this.get('geometryType'))) {
      this._texture = THREE.ImageUtils.loadTexture(this.get('texture'), new THREE.UVMapping(), _loaded);
      this._texture.anisotropy = window._renderer.renderer.getMaxAnisotropy();
      this._geometry = construct(THREE[this.get('geometryType')], this.get('geometryParams'));
      this._material = new THREE.MeshLambertMaterial({
        map: this._texture
      });

      this._mesh = new THREE.Mesh(this._geometry, this._material);
    }
    else if (this.get('geometryType') == 'collada') {
      _loadCollada(this.get('geometryParams')[0], this.get('geometryParams')[1]);
    }
    else if (this.get('geometryType') == 'collada_zae') {
      var zaeUrl = this.get('geometryParams')[0];

      zip.createReader(new zip.HttpReader(zaeUrl), function(zipReader) {
        zipReader.getEntries(function(entries) {

          var hasLoadedCollada = false;

          if (entries.length) {
            _.forEach(entries, function(entry) {
              if (!hasLoadedCollada && entry.filename.split('.').pop() == 'dae') {
                entry.getData(new zip.BlobWriter('text/plain'), function(data) {
                  zipReader.close();
                  _loadCollada(URL.createObjectURL(data), _this.get('geometryParams')[1]);
                  hasLoadedCollada = true;
                });
              }
            });
          }
        });
      }, function() {
        console.warn('Drawable: problem loading ' + zaeUrl);
      });
    }
    else {
      console.warn('Drawable: no compatible geometry mesh');
    }
  },

  updateDOFValues: function() {
    if (this.kinematics) {
      var dofvalues = this.get('dofvalues');

      var _this = this;
      _.forEach(dofvalues, function(dofvalue, index) {
        if (_this.kinematics.joints[index] && !_this.kinematics.joints[index].static) {
          _this.kinematics.setDOFValue(index, dofvalue);
        }
      });
    }
  },

  setDOFValue: function(index, value) {
    if (this.kinematics) {
      var dofvalues = this.get('dofvalues');
      dofvalues[index] = value;
      this.set('dofvalues', dofvalues);
    }
  },

  getDOFValue: function(index) {
    if (this.kinematics) {
      return this.get('dofvalues')[index];
    }
  },

  updateMesh: function() {
    this._mesh.matrix.set.apply(this._mesh.matrix, this.get('matrix'));
    this._mesh.matrix.decompose(this._mesh.position, this._mesh.quaternion, this._mesh.scale);
  },

  getMesh: function() {
    return this._mesh;
  },

  initialize: function(options) {
    BaseRealtimeModel.prototype.initialize.apply(this, options);
    this.initDrawable();
  }
});
