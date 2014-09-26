/* @echo BANNER */

(function(root, factory) {

  // Set up m3js appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['backbone', 'exports'], function(Backbone, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global m3js.
      root.m3js = factory(root, exports, Backbone);
    });

    // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  }
  else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    factory(root, exports, Backbone);

    // Finally, as a browser global.
  }
  else {
    root.m3js = factory(root, {}, root.Backbone);
  }

}(this, function(root, m3js, Backbone) {
  'use strict';

  // #Bundle modified threejs controls
  // @include controls/OrbitControls.js
  // @include controls/TransformControls.js

  // #General utilities
  // @include utils.js

  // #Models
  // @include models/Drawable.js
  // @include models/OrbitControl.js
  // @include models/TransformControl.js

  // #Views
  // @include views/ThreeJSRenderer.js
  // @include views/TransformControlMode.js

  return m3js;

}));
