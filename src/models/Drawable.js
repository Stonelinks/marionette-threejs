var Drawable = m3js.Drawable = Backbone.Model.extend({

  defaults: {
    texture: '/img/crate.gif',
    geometryType: 'BoxGeometry',
    geometryParams: [200, 200, 200],
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
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
        _this.updateMesh();
      });
      _this.updateMesh();
    };

    if (THREE.hasOwnProperty(this.get('geometryType'))) {
      this._texture = THREE.ImageUtils.loadTexture(this.get('texture'), new THREE.UVMapping(), _loaded);
      // this._texture.anisotropy = window._renderer.renderer.getMaxAnisotropy();
      this._geometry = construct(THREE[this.get('geometryType')], this.get('geometryParams'));
      this._material = new THREE.MeshLambertMaterial({
        map: this._texture
      });

      this._mesh = new THREE.Mesh(this._geometry, this._material);
    }
    else {
      console.warn('Drawable: no compatible geometry type');
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
    this.initDrawable();
  }
});
