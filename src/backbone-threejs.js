/* @echo BANNER */
define(['Backbone', 'threejs'], function(_, mjs) {
  'use strict';

  var bb3js = {};

  // #Bundle modified threejs controls
  // @include controls/OrbitControls.js
  // @include controls/TransformControls.js

  // #General utilities
  // @include utils.js

  // #Models
  // @include models/Drawable.js
  // @include models/OrbitControl.js
  // @include models/TransformControl.js

  // #Collections
  // @include collections/Drawables.js

  // #Views
  // @include views/ThreeJSRenderer.js

  return bb3js;
});
