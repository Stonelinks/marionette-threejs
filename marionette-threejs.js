// marionette-threejs - v0.0.4
//
// https://github.com/Stonelinks/marionette-threejs
//
// Simple wrappers around three.js components using Backbone.Marionette
//
// Copyright (c)2014 - Lucas Doyle <lucas.p.doyle@gmail.com>
//
// Distributed under MIT license
//



(function(root, factory) {

  // Set up m3js appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['backbone', 'marionette', 'threejs', 'exports'], function(Backbone, Marionette, THREE, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global m3js.
      root.m3js = factory(root, exports, Backbone, Marionette, THREE);
    });

    // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  }
  else if (typeof exports !== 'undefined') {
    var Backbone = require('backbone');
    var Marionette = require('marionette');
    var THREE = require('threejs');
    factory(root, exports, Backbone, Marionette, THREE);

    // Finally, as a browser global.
  }
  else {
    root.m3js = factory(root, {}, root.Backbone, root.Marionette, root.THREE);
  }

}(this, function(root, m3js, Backbone, Marionette, THREE) {
  'use strict';

  // #Bundle modified threejs controls
  /**
   * @author qiao / https://github.com/qiao
   * @author mrdoob / http://mrdoob.com
   * @author alteredq / http://alteredqualia.com/
   * @author WestLangley / http://github.com/WestLangley
   * @author erich666 / http://erichaines.com
   */
  /*global THREE, console */
  
  // This set of controls performs orbiting, dollying (zooming), and panning. It maintains
  // the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
  // supported.
  //
  //    Orbit - left mouse / touch: one finger move
  //    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
  //    Pan - right mouse, or arrow keys / touch: three finter swipe
  //
  // This is a drop-in replacement for (most) TrackballControls used in examples.
  // That is, include this js file and wherever you see:
  //    	controls = new THREE.TrackballControls( camera );
  //      controls.target.z = 150;
  // Simple substitute "OrbitControls" and the control should work as-is.
  
  THREE.OrbitControls = function(object, domElement) {
  
    this.object = object;
    this.domElement = (domElement !== undefined) ? domElement : document;
  
    // API
  
    // Set to false to disable this control
    this.enabled = true;
  
    // "target" sets the location of focus, where the control orbits around
    // and where it pans with respect to.
    this.target = new THREE.Vector3();
  
    // center is old, deprecated; use "target" instead
    this.center = this.target;
  
    // This option actually enables dollying in and out; left as "zoom" for
    // backwards compatibility
    this.noZoom = false;
    this.zoomSpeed = 1.0;
  
    // Limits to how far you can dolly in and out
    this.minDistance = 0;
    this.maxDistance = Infinity;
  
    // Set to true to disable this control
    this.noRotate = false;
    this.rotateSpeed = 1.0;
  
    // Set to true to disable this control
    this.noPan = false;
    this.keyPanSpeed = 7.0; // pixels moved per arrow key push
  
    // Set to true to automatically rotate around the target
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
  
    // How far you can orbit vertically, upper and lower limits.
    // Range is 0 to Math.PI radians.
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians
  
    // Set to true to disable use of the keys
    this.noKeys = false;
  
    // The four arrow keys
    this.keys = {
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      BOTTOM: 40
    };
  
    ////////////
    // internals
  
    var scope = this;
  
    var EPS = 0.000001;
  
    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var rotateDelta = new THREE.Vector2();
  
    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();
    var panDelta = new THREE.Vector2();
    var panOffset = new THREE.Vector3();
  
    var offset = new THREE.Vector3();
  
    var dollyStart = new THREE.Vector2();
    var dollyEnd = new THREE.Vector2();
    var dollyDelta = new THREE.Vector2();
  
    var phiDelta = 0;
    var thetaDelta = 0;
    var scale = 1;
    var pan = new THREE.Vector3();
  
    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();
  
    var STATE = {
      NONE: -1,
      ROTATE: 0,
      DOLLY: 1,
      PAN: 2,
      TOUCH_ROTATE: 3,
      TOUCH_DOLLY: 4,
      TOUCH_PAN: 5
    };
  
    var state = STATE.NONE;
  
    // for reset
  
    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
  
    // so camera.up is the orbit axis
  
    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();
  
    // events
  
    var changeEvent = {
      type: 'change'
    };
    var startEvent = {
      type: 'start'
    };
    var endEvent = {
      type: 'end'
    };
  
    this.rotateLeft = function(angle) {
  
      if (angle === undefined) {
  
        angle = getAutoRotationAngle();
  
      }
  
      thetaDelta -= angle;
  
    };
  
    this.rotateUp = function(angle) {
  
      if (angle === undefined) {
  
        angle = getAutoRotationAngle();
  
      }
  
      phiDelta -= angle;
  
    };
  
    // pass in distance in world space to move left
    this.panLeft = function(distance) {
  
      var te = this.object.matrix.elements;
  
      // get X column of matrix
      panOffset.set(te[0], te[1], te[2]);
      panOffset.multiplyScalar(-distance);
  
      pan.add(panOffset);
  
    };
  
    // pass in distance in world space to move up
    this.panUp = function(distance) {
  
      var te = this.object.matrix.elements;
  
      // get Y column of matrix
      panOffset.set(te[4], te[5], te[6]);
      panOffset.multiplyScalar(distance);
  
      pan.add(panOffset);
  
    };
  
    // pass in x,y of change desired in pixel space,
    // right and down are positive
    this.pan = function(deltaX, deltaY) {
  
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
  
      if (scope.object.fov !== undefined) {
  
        // perspective
        var position = scope.object.position;
        var offset = position.clone().sub(scope.target);
        var targetDistance = offset.length();
  
        // half of the fov is center to top of screen
        targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);
  
        // we actually don't use screenWidth, since perspective camera is fixed to screen height
        scope.panLeft(2 * deltaX * targetDistance / element.clientHeight);
        scope.panUp(2 * deltaY * targetDistance / element.clientHeight);
  
      }
      else if (scope.object.top !== undefined) {
  
        // orthographic
        scope.panLeft(deltaX * (scope.object.right - scope.object.left) / element.clientWidth);
        scope.panUp(deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight);
  
      }
      else {
  
        // camera neither orthographic or perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
  
      }
  
    };
  
    this.dollyIn = function(dollyScale) {
  
      if (dollyScale === undefined) {
  
        dollyScale = getZoomScale();
  
      }
  
      scale /= dollyScale;
  
    };
  
    this.dollyOut = function(dollyScale) {
  
      if (dollyScale === undefined) {
  
        dollyScale = getZoomScale();
  
      }
  
      scale *= dollyScale;
  
    };
  
    this.update = function() {
  
      var position = this.object.position;
  
      offset.copy(position).sub(this.target);
  
      // rotate offset to "y-axis-is-up" space
      offset.applyQuaternion(quat);
  
      // angle from z-axis around y-axis
  
      var theta = Math.atan2(offset.x, offset.z);
  
      // angle from y-axis
  
      var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);
  
      if (this.autoRotate) {
  
        this.rotateLeft(getAutoRotationAngle());
  
      }
  
      theta += thetaDelta;
      phi += phiDelta;
  
      // restrict phi to be between desired limits
      phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, phi));
  
      // restrict phi to be betwee EPS and PI-EPS
      phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));
  
      var radius = offset.length() * scale;
  
      // restrict radius to be between desired limits
      radius = Math.max(this.minDistance, Math.min(this.maxDistance, radius));
  
      // move target to panned location
      this.target.add(pan);
  
      offset.x = radius * Math.sin(phi) * Math.sin(theta);
      offset.y = radius * Math.cos(phi);
      offset.z = radius * Math.sin(phi) * Math.cos(theta);
  
      // rotate offset back to "camera-up-vector-is-up" space
      offset.applyQuaternion(quatInverse);
  
      position.copy(this.target).add(offset);
  
      this.object.lookAt(this.target);
  
      thetaDelta = 0;
      phiDelta = 0;
      scale = 1;
      pan.set(0, 0, 0);
  
      // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8
  
      if (lastPosition.distanceToSquared(this.object.position) > EPS || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {
  
        this.dispatchEvent(changeEvent);
  
        lastPosition.copy(this.object.position);
        lastQuaternion.copy(this.object.quaternion);
  
      }
  
    };
  
  
    this.reset = function() {
  
      state = STATE.NONE;
  
      this.target.copy(this.target0);
      this.object.position.copy(this.position0);
  
      this.update();
  
    };
  
    function getAutoRotationAngle() {
  
      return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
  
    }
  
    function getZoomScale() {
  
      return Math.pow(0.95, scope.zoomSpeed);
  
    }
  
    this.onMouseDown = function(event) {
  
      if (scope.enabled === false) return;
      event.preventDefault();
  
      if (event.button === 0) {
        if (scope.noRotate === true) return;
  
        state = STATE.ROTATE;
  
        rotateStart.set(event.clientX, event.clientY);
  
      }
      else if (event.button === 1) {
        if (scope.noZoom === true) return;
  
        state = STATE.DOLLY;
  
        dollyStart.set(event.clientX, event.clientY);
  
      }
      else if (event.button === 2) {
        if (scope.noPan === true) return;
  
        state = STATE.PAN;
  
        panStart.set(event.clientX, event.clientY);
  
      }
  
      document.addEventListener('mousemove', scope.onMouseMove, false);
      document.addEventListener('mouseup', scope.onMouseUp, false);
      scope.dispatchEvent(startEvent);
  
    };
  
    this.onMouseMove = function(event) {
  
      if (scope.enabled === false) return;
  
      event.preventDefault();
  
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
  
      if (state === STATE.ROTATE) {
  
        if (scope.noRotate === true) return;
  
        rotateEnd.set(event.clientX, event.clientY);
        rotateDelta.subVectors(rotateEnd, rotateStart);
  
        // rotating across whole screen goes 360 degrees around
        scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
  
        // rotating up and down along whole screen attempts to go 360, but limited to 180
        scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);
  
        rotateStart.copy(rotateEnd);
  
      }
      else if (state === STATE.DOLLY) {
  
        if (scope.noZoom === true) return;
  
        dollyEnd.set(event.clientX, event.clientY);
        dollyDelta.subVectors(dollyEnd, dollyStart);
  
        if (dollyDelta.y > 0) {
  
          scope.dollyIn();
  
        }
        else {
  
          scope.dollyOut();
  
        }
  
        dollyStart.copy(dollyEnd);
  
      }
      else if (state === STATE.PAN) {
  
        if (scope.noPan === true) return;
  
        panEnd.set(event.clientX, event.clientY);
        panDelta.subVectors(panEnd, panStart);
  
        scope.pan(panDelta.x, panDelta.y);
  
        panStart.copy(panEnd);
  
      }
  
      scope.update();
  
    };
  
    this.onMouseUp = function(/* event */ ) {
  
      if (scope.enabled === false) return;
  
      document.removeEventListener('mousemove', scope.onMouseMove, false);
      document.removeEventListener('mouseup', scope.onMouseUp, false);
      scope.dispatchEvent(endEvent);
      state = STATE.NONE;
  
    };
  
    this.onMouseWheel = function(event) {
  
      if (scope.enabled === false || scope.noZoom === true) return;
  
      event.preventDefault();
      event.stopPropagation();
  
      var delta = 0;
  
      if (event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
  
        delta = event.wheelDelta;
  
      }
      else if (event.detail !== undefined) { // Firefox
  
        delta = -event.detail;
  
      }
  
      if (delta > 0) {
  
        scope.dollyOut();
  
      }
      else {
  
        scope.dollyIn();
  
      }
  
      scope.update();
      scope.dispatchEvent(startEvent);
      scope.dispatchEvent(endEvent);
  
    };
  
    this.onKeyDown = function(event) {
  
      if (scope.enabled === false || scope.noKeys === true || scope.noPan === true) return;
  
      switch (event.keyCode) {
  
        case scope.keys.UP:
          scope.pan(0, scope.keyPanSpeed);
          scope.update();
          break;
  
        case scope.keys.BOTTOM:
          scope.pan(0, -scope.keyPanSpeed);
          scope.update();
          break;
  
        case scope.keys.LEFT:
          scope.pan(scope.keyPanSpeed, 0);
          scope.update();
          break;
  
        case scope.keys.RIGHT:
          scope.pan(-scope.keyPanSpeed, 0);
          scope.update();
          break;
  
      }
  
    };
  
    this.touchstart = function(event) {
  
      if (scope.enabled === false) return;
  
      switch (event.touches.length) {
  
        case 1: // one-fingered touch: rotate
  
          if (scope.noRotate === true) return;
  
          state = STATE.TOUCH_ROTATE;
  
          rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
          break;
  
        case 2: // two-fingered touch: dolly
  
          if (scope.noZoom === true) return;
  
          state = STATE.TOUCH_DOLLY;
  
          var dx = event.touches[0].pageX - event.touches[1].pageX;
          var dy = event.touches[0].pageY - event.touches[1].pageY;
          var distance = Math.sqrt(dx * dx + dy * dy);
          dollyStart.set(0, distance);
          break;
  
        case 3: // three-fingered touch: pan
  
          if (scope.noPan === true) return;
  
          state = STATE.TOUCH_PAN;
  
          panStart.set(event.touches[0].pageX, event.touches[0].pageY);
          break;
  
        default:
  
          state = STATE.NONE;
  
      }
  
      scope.dispatchEvent(startEvent);
  
    };
  
    this.touchmove = function(event) {
  
      if (scope.enabled === false) return;
  
      event.preventDefault();
      event.stopPropagation();
  
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
  
      switch (event.touches.length) {
  
        case 1: // one-fingered touch: rotate
  
          if (scope.noRotate === true) return;
          if (state !== STATE.TOUCH_ROTATE) return;
  
          rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
          rotateDelta.subVectors(rotateEnd, rotateStart);
  
          // rotating across whole screen goes 360 degrees around
          scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
          // rotating up and down along whole screen attempts to go 360, but limited to 180
          scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);
  
          rotateStart.copy(rotateEnd);
  
          scope.update();
          break;
  
        case 2: // two-fingered touch: dolly
  
          if (scope.noZoom === true) return;
          if (state !== STATE.TOUCH_DOLLY) return;
  
          var dx = event.touches[0].pageX - event.touches[1].pageX;
          var dy = event.touches[0].pageY - event.touches[1].pageY;
          var distance = Math.sqrt(dx * dx + dy * dy);
  
          dollyEnd.set(0, distance);
          dollyDelta.subVectors(dollyEnd, dollyStart);
  
          if (dollyDelta.y > 0) {
  
            scope.dollyOut();
  
          }
          else {
  
            scope.dollyIn();
  
          }
  
          dollyStart.copy(dollyEnd);
  
          scope.update();
          break;
  
        case 3: // three-fingered touch: pan
  
          if (scope.noPan === true) return;
          if (state !== STATE.TOUCH_PAN) return;
  
          panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
          panDelta.subVectors(panEnd, panStart);
  
          scope.pan(panDelta.x, panDelta.y);
  
          panStart.copy(panEnd);
  
          scope.update();
          break;
  
        default:
  
          state = STATE.NONE;
  
      }
  
    };
  
    this.touchend = function(/* event */ ) {
  
      if (scope.enabled === false) return;
  
      scope.dispatchEvent(endEvent);
      state = STATE.NONE;
  
    };
  
    this.onContextMenu = function(event) {
  
      event.preventDefault();
  
    };
  
    // this.domElement.addEventListener( 'contextmenu', onContextMenu, false );
    // this.domElement.addEventListener( 'mousedown', onMouseDown, false );
    // this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
    // this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
  
    // this.domElement.addEventListener( 'touchstart', touchstart, false );
    // this.domElement.addEventListener( 'touchend', touchend, false );
    // this.domElement.addEventListener( 'touchmove', touchmove, false );
  
    // window.addEventListener( 'keydown', onKeyDown, false );
  
    // force an update at start
    this.update();
  
  };
  
  THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
  
  /**
   * @author arodic / https://github.com/arodic
   */
  /*jshint sub:true*/
  
  (function() {
  
    'use strict';
  
    var GizmoMaterial = function(parameters) {
  
      THREE.MeshBasicMaterial.call(this);
  
      this.depthTest = false;
      this.depthWrite = false;
      this.side = THREE.FrontSide;
      this.transparent = true;
  
      this.setValues(parameters);
  
      this.oldColor = this.color.clone();
      this.oldOpacity = this.opacity;
  
      this.highlight = function(highlighted) {
  
        if (highlighted) {
  
          this.color.setRGB(1, 1, 0);
          this.opacity = 1;
  
        }
        else {
  
          this.color.copy(this.oldColor);
          this.opacity = this.oldOpacity;
  
        }
  
      };
  
    };
  
    GizmoMaterial.prototype = Object.create(THREE.MeshBasicMaterial.prototype);
  
    var GizmoLineMaterial = function(parameters) {
  
      THREE.LineBasicMaterial.call(this);
  
      this.depthTest = false;
      this.depthWrite = false;
      this.transparent = true;
      this.linewidth = 1;
  
      this.setValues(parameters);
  
      this.oldColor = this.color.clone();
      this.oldOpacity = this.opacity;
  
      this.highlight = function(highlighted) {
  
        if (highlighted) {
  
          this.color.setRGB(1, 1, 0);
          this.opacity = 1;
  
        }
        else {
  
          this.color.copy(this.oldColor);
          this.opacity = this.oldOpacity;
  
        }
  
      };
  
    };
  
    GizmoLineMaterial.prototype = Object.create(THREE.LineBasicMaterial.prototype);
  
    THREE.TransformGizmo = function() {
  
      var scope = this;
      var showPickers = false; //debug
      var showActivePlane = false; //debug
  
      this.init = function() {
  
        THREE.Object3D.call(this);
  
        this.handles = new THREE.Object3D();
        this.pickers = new THREE.Object3D();
        this.planes = new THREE.Object3D();
  
        this.add(this.handles);
        this.add(this.pickers);
        this.add(this.planes);
  
        //// PLANES
  
        var planeGeometry = new THREE.PlaneGeometry(50, 50, 2, 2);
        var planeMaterial = new THREE.MeshBasicMaterial({
          wireframe: true
        });
        planeMaterial.side = THREE.DoubleSide;
  
        var planes = {
          'XY': new THREE.Mesh(planeGeometry, planeMaterial),
          'YZ': new THREE.Mesh(planeGeometry, planeMaterial),
          'XZ': new THREE.Mesh(planeGeometry, planeMaterial),
          'XYZE': new THREE.Mesh(planeGeometry, planeMaterial)
        };
  
        this.activePlane = planes['XYZE'];
  
        planes['YZ'].rotation.set(0, Math.PI / 2, 0);
        planes['XZ'].rotation.set(-Math.PI / 2, 0, 0);
  
        for (var i in planes) {
          planes[i].name = i;
          this.planes.add(planes[i]);
          this.planes[i] = planes[i];
          planes[i].visible = false;
        }
  
        //// HANDLES AND PICKERS
  
        var setupGizmos = function(gizmoMap, parent) {
  
          for (var name in gizmoMap) {
  
            for (i = gizmoMap[name].length; i--;) {
  
              var object = gizmoMap[name][i][0];
              var position = gizmoMap[name][i][1];
              var rotation = gizmoMap[name][i][2];
  
              object.name = name;
  
              if (position) object.position.set(position[0], position[1], position[2]);
              if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
  
              parent.add(object);
  
            }
  
          }
  
        };
  
        setupGizmos(this.handleGizmos, this.handles);
        setupGizmos(this.pickerGizmos, this.pickers);
  
        // reset Transformations
  
        this.traverse(function(child) {
          if (child instanceof THREE.Mesh) {
            child.updateMatrix();
  
            var tempGeometry = new THREE.Geometry();
            tempGeometry.merge(child.geometry, child.matrix);
  
            child.geometry = tempGeometry;
            child.position.set(0, 0, 0);
            child.rotation.set(0, 0, 0);
            child.scale.set(1, 1, 1);
          }
        });
  
      };
  
      this.hide = function() {
        this.traverse(function(child) {
          child.visible = false;
        });
      };
  
      this.show = function() {
        this.traverse(function(child) {
          child.visible = true;
          if (child.parent == scope.pickers) child.visible = showPickers;
          if (child.parent == scope.planes) child.visible = false;
        });
        this.activePlane.visible = showActivePlane;
      };
  
      this.highlight = function(axis) {
        this.traverse(function(child) {
          if (child.material && child.material.highlight) {
            if (child.name == axis) {
              child.material.highlight(true);
            }
            else {
              child.material.highlight(false);
            }
          }
        });
      };
  
    };
  
    THREE.TransformGizmo.prototype = Object.create(THREE.Object3D.prototype);
  
    THREE.TransformGizmo.prototype.update = function(rotation, eye) {
  
      var vec1 = new THREE.Vector3(0, 0, 0);
      var vec2 = new THREE.Vector3(0, 1, 0);
      var lookAtMatrix = new THREE.Matrix4();
  
      this.traverse(function(child) {
        if (child.name.search('E') != -1) {
          child.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(eye, vec1, vec2));
        }
        else if (child.name.search('X') != -1 || child.name.search('Y') != -1 || child.name.search('Z') != -1) {
          child.quaternion.setFromEuler(rotation);
        }
      });
  
    };
  
    THREE.TransformGizmoTranslate = function() {
  
      THREE.TransformGizmo.call(this);
  
      var arrowGeometry = new THREE.Geometry();
      var mesh = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.05, 0.2, 12, 1, false));
      mesh.position.y = 0.5;
      mesh.updateMatrix();
  
      arrowGeometry.merge(mesh.geometry, mesh.matrix);
  
      var lineXGeometry = new THREE.Geometry();
      lineXGeometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
  
      var lineYGeometry = new THREE.Geometry();
      lineYGeometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
  
      var lineZGeometry = new THREE.Geometry();
      lineZGeometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
  
      this.handleGizmos = {
        X: [
      [new THREE.Mesh(arrowGeometry, new GizmoMaterial({
            color: 0xff0000
          })), [0.5, 0, 0], [0, 0, -Math.PI / 2]],
      [new THREE.Line(lineXGeometry, new GizmoLineMaterial({
            color: 0xff0000
          }))]
     ],
        Y: [
      [new THREE.Mesh(arrowGeometry, new GizmoMaterial({
            color: 0x00ff00
          })), [0, 0.5, 0]],
      [new THREE.Line(lineYGeometry, new GizmoLineMaterial({
            color: 0x00ff00
          }))]
     ],
        Z: [
      [new THREE.Mesh(arrowGeometry, new GizmoMaterial({
            color: 0x0000ff
          })), [0, 0, 0.5], [Math.PI / 2, 0, 0]],
      [new THREE.Line(lineZGeometry, new GizmoLineMaterial({
            color: 0x0000ff
          }))]
     ],
        XYZ: [
      [new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new GizmoMaterial({
            color: 0xffffff,
            opacity: 0.25
          })), [0, 0, 0], [0, 0, 0]]
     ],
        XY: [
      [new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.29), new GizmoMaterial({
            color: 0xffff00,
            opacity: 0.25
          })), [0.15, 0.15, 0]]
     ],
        YZ: [
      [new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.29), new GizmoMaterial({
            color: 0x00ffff,
            opacity: 0.25
          })), [0, 0.15, 0.15], [0, Math.PI / 2, 0]]
     ],
        XZ: [
      [new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.29), new GizmoMaterial({
            color: 0xff00ff,
            opacity: 0.25
          })), [0.15, 0, 0.15], [-Math.PI / 2, 0, 0]]
     ]
      };
  
      this.pickerGizmos = {
        X: [
      [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), new GizmoMaterial({
            color: 0xff0000,
            opacity: 0.25
          })), [0.6, 0, 0], [0, 0, -Math.PI / 2]]
     ],
        Y: [
      [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), new GizmoMaterial({
            color: 0x00ff00,
            opacity: 0.25
          })), [0, 0.6, 0]]
     ],
        Z: [
      [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), new GizmoMaterial({
            color: 0x0000ff,
            opacity: 0.25
          })), [0, 0, 0.6], [Math.PI / 2, 0, 0]]
     ],
        XYZ: [
      [new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new GizmoMaterial({
            color: 0xffffff,
            opacity: 0.25
          }))]
     ],
        XY: [
      [new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new GizmoMaterial({
            color: 0xffff00,
            opacity: 0.25
          })), [0.2, 0.2, 0]]
     ],
        YZ: [
      [new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new GizmoMaterial({
            color: 0x00ffff,
            opacity: 0.25
          })), [0, 0.2, 0.2], [0, Math.PI / 2, 0]]
     ],
        XZ: [
      [new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new GizmoMaterial({
            color: 0xff00ff,
            opacity: 0.25
          })), [0.2, 0, 0.2], [-Math.PI / 2, 0, 0]]
     ]
      };
  
      this.setActivePlane = function(axis, eye) {
  
        var tempMatrix = new THREE.Matrix4();
        eye.applyMatrix4(tempMatrix.getInverse(tempMatrix.extractRotation(this.planes['XY'].matrixWorld)));
  
        if (axis == 'X') {
          this.activePlane = this.planes['XY'];
          if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes['XZ'];
        }
  
        if (axis == 'Y') {
          this.activePlane = this.planes['XY'];
          if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes['YZ'];
        }
  
        if (axis == 'Z') {
          this.activePlane = this.planes['XZ'];
          if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes['YZ'];
        }
  
        if (axis == 'XYZ') this.activePlane = this.planes['XYZE'];
  
        if (axis == 'XY') this.activePlane = this.planes['XY'];
  
        if (axis == 'YZ') this.activePlane = this.planes['YZ'];
  
        if (axis == 'XZ') this.activePlane = this.planes['XZ'];
  
        this.hide();
        this.show();
  
      };
  
      this.init();
  
    };
  
    THREE.TransformGizmoTranslate.prototype = Object.create(THREE.TransformGizmo.prototype);
  
    THREE.TransformGizmoRotate = function() {
  
      THREE.TransformGizmo.call(this);
  
      var CircleGeometry = function(radius, facing, arc) {
  
        var geometry = new THREE.Geometry();
        arc = arc ? arc : 1;
        for (var i = 0; i <= 64 * arc; ++i) {
          if (facing == 'x') geometry.vertices.push(new THREE.Vector3(0, Math.cos(i / 32 * Math.PI), Math.sin(i / 32 * Math.PI)).multiplyScalar(radius));
          if (facing == 'y') geometry.vertices.push(new THREE.Vector3(Math.cos(i / 32 * Math.PI), 0, Math.sin(i / 32 * Math.PI)).multiplyScalar(radius));
          if (facing == 'z') geometry.vertices.push(new THREE.Vector3(Math.sin(i / 32 * Math.PI), Math.cos(i / 32 * Math.PI), 0).multiplyScalar(radius));
        }
  
        return geometry;
      };
  
      this.handleGizmos = {
        X: [
      [new THREE.Line(new CircleGeometry(1, 'x', 0.5), new GizmoLineMaterial({
            color: 0xff0000
          }))]
     ],
        Y: [
      [new THREE.Line(new CircleGeometry(1, 'y', 0.5), new GizmoLineMaterial({
            color: 0x00ff00
          }))]
     ],
        Z: [
      [new THREE.Line(new CircleGeometry(1, 'z', 0.5), new GizmoLineMaterial({
            color: 0x0000ff
          }))]
     ],
        E: [
      [new THREE.Line(new CircleGeometry(1.25, 'z', 1), new GizmoLineMaterial({
            color: 0xcccc00
          }))]
     ],
        XYZE: [
      [new THREE.Line(new CircleGeometry(1, 'z', 1), new GizmoLineMaterial({
            color: 0x787878
          }))]
     ]
      };
  
      this.pickerGizmos = {
        X: [
      [new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), new GizmoMaterial({
            color: 0xff0000,
            opacity: 0.25
          })), [0, 0, 0], [0, -Math.PI / 2, -Math.PI / 2]]
     ],
        Y: [
      [new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), new GizmoMaterial({
            color: 0x00ff00,
            opacity: 0.25
          })), [0, 0, 0], [Math.PI / 2, 0, 0]]
     ],
        Z: [
      [new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 4, 12, Math.PI), new GizmoMaterial({
            color: 0x0000ff,
            opacity: 0.25
          })), [0, 0, 0], [0, 0, -Math.PI / 2]]
     ],
        E: [
      [new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.12, 2, 24), new GizmoMaterial({
            color: 0xffff00,
            opacity: 0.25
          }))]
     ],
        XYZE: [
      [new THREE.Mesh(new THREE.Geometry())] // TODO
     ]
      };
  
      this.setActivePlane = function(axis) {
  
        if (axis == 'E') this.activePlane = this.planes['XYZE'];
  
        if (axis == 'X') this.activePlane = this.planes['YZ'];
  
        if (axis == 'Y') this.activePlane = this.planes['XZ'];
  
        if (axis == 'Z') this.activePlane = this.planes['XY'];
  
        this.hide();
        this.show();
  
      };
  
      this.update = function(rotation, eye2) {
  
        THREE.TransformGizmo.prototype.update.apply(this, arguments);
  
        var group = {
          handles: this['handles'],
          pickers: this['pickers']
        };
  
        var tempMatrix = new THREE.Matrix4();
        var worldRotation = new THREE.Euler(0, 0, 1);
        var tempQuaternion = new THREE.Quaternion();
        var unitX = new THREE.Vector3(1, 0, 0);
        var unitY = new THREE.Vector3(0, 1, 0);
        var unitZ = new THREE.Vector3(0, 0, 1);
        var quaternionX = new THREE.Quaternion();
        var quaternionY = new THREE.Quaternion();
        var quaternionZ = new THREE.Quaternion();
        var eye = eye2.clone();
  
        worldRotation.copy(this.planes['XY'].rotation);
        tempQuaternion.setFromEuler(worldRotation);
  
        tempMatrix.makeRotationFromQuaternion(tempQuaternion).getInverse(tempMatrix);
        eye.applyMatrix4(tempMatrix);
  
        this.traverse(function(child) {
  
          tempQuaternion.setFromEuler(worldRotation);
  
          if (child.name == 'X') {
            quaternionX.setFromAxisAngle(unitX, Math.atan2(-eye.y, eye.z));
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
            child.quaternion.copy(tempQuaternion);
          }
  
          if (child.name == 'Y') {
            quaternionY.setFromAxisAngle(unitY, Math.atan2(eye.x, eye.z));
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
            child.quaternion.copy(tempQuaternion);
          }
  
          if (child.name == 'Z') {
            quaternionZ.setFromAxisAngle(unitZ, Math.atan2(eye.y, eye.x));
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
            child.quaternion.copy(tempQuaternion);
          }
  
        });
  
      };
  
      this.init();
  
    };
  
    THREE.TransformGizmoRotate.prototype = Object.create(THREE.TransformGizmo.prototype);
  
    THREE.TransformGizmoScale = function() {
  
      THREE.TransformGizmo.call(this);
  
      var arrowGeometry = new THREE.Geometry();
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.125));
      mesh.position.y = 0.5;
      mesh.updateMatrix();
  
      arrowGeometry.merge(mesh.geometry, mesh.matrix);
  
      var lineXGeometry = new THREE.Geometry();
      lineXGeometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
  
      var lineYGeometry = new THREE.Geometry();
      lineYGeometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
  
      var lineZGeometry = new THREE.Geometry();
      lineZGeometry.vertices.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
  
      this.handleGizmos = {
        X: [
      [new THREE.Mesh(arrowGeometry, new GizmoMaterial({
            color: 0xff0000
          })), [0.5, 0, 0], [0, 0, -Math.PI / 2]],
      [new THREE.Line(lineXGeometry, new GizmoLineMaterial({
            color: 0xff0000
          }))]
     ],
        Y: [
      [new THREE.Mesh(arrowGeometry, new GizmoMaterial({
            color: 0x00ff00
          })), [0, 0.5, 0]],
      [new THREE.Line(lineYGeometry, new GizmoLineMaterial({
            color: 0x00ff00
          }))]
     ],
        Z: [
      [new THREE.Mesh(arrowGeometry, new GizmoMaterial({
            color: 0x0000ff
          })), [0, 0, 0.5], [Math.PI / 2, 0, 0]],
      [new THREE.Line(lineZGeometry, new GizmoLineMaterial({
            color: 0x0000ff
          }))]
     ],
        XYZ: [
      [new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.125), new GizmoMaterial({
            color: 0xffffff,
            opacity: 0.25
          }))]
     ]
      };
  
      this.pickerGizmos = {
        X: [
      [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), new GizmoMaterial({
            color: 0xff0000,
            opacity: 0.25
          })), [0.6, 0, 0], [0, 0, -Math.PI / 2]]
     ],
        Y: [
      [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), new GizmoMaterial({
            color: 0x00ff00,
            opacity: 0.25
          })), [0, 0.6, 0]]
     ],
        Z: [
      [new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), new GizmoMaterial({
            color: 0x0000ff,
            opacity: 0.25
          })), [0, 0, 0.6], [Math.PI / 2, 0, 0]]
     ],
        XYZ: [
      [new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new GizmoMaterial({
            color: 0xffffff,
            opacity: 0.25
          }))]
     ]
      };
  
      this.setActivePlane = function(axis, eye) {
  
        var tempMatrix = new THREE.Matrix4();
        eye.applyMatrix4(tempMatrix.getInverse(tempMatrix.extractRotation(this.planes['XY'].matrixWorld)));
  
        if (axis == 'X') {
          this.activePlane = this.planes['XY'];
          if (Math.abs(eye.y) > Math.abs(eye.z)) this.activePlane = this.planes['XZ'];
        }
  
        if (axis == 'Y') {
          this.activePlane = this.planes['XY'];
          if (Math.abs(eye.x) > Math.abs(eye.z)) this.activePlane = this.planes['YZ'];
        }
  
        if (axis == 'Z') {
          this.activePlane = this.planes['XZ'];
          if (Math.abs(eye.x) > Math.abs(eye.y)) this.activePlane = this.planes['YZ'];
        }
  
        if (axis == 'XYZ') this.activePlane = this.planes['XYZE'];
  
        this.hide();
        this.show();
  
      };
  
      this.init();
  
    };
  
    THREE.TransformGizmoScale.prototype = Object.create(THREE.TransformGizmo.prototype);
  
    THREE.TransformControls = function(camera, domElement) {
  
      // TODO: Make non-uniform scale and rotate play nice in hierarchies
      // TODO: ADD RXYZ contol
  
      THREE.Object3D.call(this);
  
      domElement = (domElement !== undefined) ? domElement : document;
  
      this.gizmo = {};
      this.gizmo['translate'] = new THREE.TransformGizmoTranslate();
      this.gizmo['rotate'] = new THREE.TransformGizmoRotate();
      this.gizmo['scale'] = new THREE.TransformGizmoScale();
  
      this.add(this.gizmo['translate']);
      this.add(this.gizmo['rotate']);
      this.add(this.gizmo['scale']);
  
      this.gizmo['translate'].hide();
      this.gizmo['rotate'].hide();
      this.gizmo['scale'].hide();
  
      this.object = undefined;
      this.snap = null;
      this.space = 'world';
      this.size = 1;
      this.axis = null;
  
      var scope = this;
  
      var _dragging = false;
      var _mode = 'translate';
      var _plane = 'XY';
  
      var changeEvent = {
        type: 'change'
      };
  
      var ray = new THREE.Raycaster();
      var projector = new THREE.Projector();
      var pointerVector = new THREE.Vector3();
  
      var point = new THREE.Vector3();
      var offset = new THREE.Vector3();
  
      var rotation = new THREE.Vector3();
      var offsetRotation = new THREE.Vector3();
      var scale = 1;
  
      var lookAtMatrix = new THREE.Matrix4();
      var eye = new THREE.Vector3();
  
      var tempMatrix = new THREE.Matrix4();
      var tempVector = new THREE.Vector3();
      var tempQuaternion = new THREE.Quaternion();
      var unitX = new THREE.Vector3(1, 0, 0);
      var unitY = new THREE.Vector3(0, 1, 0);
      var unitZ = new THREE.Vector3(0, 0, 1);
  
      var quaternionXYZ = new THREE.Quaternion();
      var quaternionX = new THREE.Quaternion();
      var quaternionY = new THREE.Quaternion();
      var quaternionZ = new THREE.Quaternion();
      var quaternionE = new THREE.Quaternion();
  
      var oldPosition = new THREE.Vector3();
      var oldScale = new THREE.Vector3();
      var oldRotationMatrix = new THREE.Matrix4();
  
      var parentRotationMatrix = new THREE.Matrix4();
      var parentScale = new THREE.Vector3();
  
      var worldPosition = new THREE.Vector3();
      var worldRotation = new THREE.Euler();
      var worldRotationMatrix = new THREE.Matrix4();
      var camPosition = new THREE.Vector3();
      var camRotation = new THREE.Euler();
  
      // domElement.addEventListener( "mousedown", onPointerDown, false );
      // domElement.addEventListener( "touchstart", onPointerDown, false );
  
      // domElement.addEventListener( "mousemove", onPointerHover, false );
      // domElement.addEventListener( "touchmove", onPointerHover, false );
  
      // domElement.addEventListener( "mousemove", onPointerMove, false );
      // domElement.addEventListener( "touchmove", onPointerMove, false );
  
      // domElement.addEventListener( "mouseup", onPointerUp, false );
      // domElement.addEventListener( "mouseout", onPointerUp, false );
      // domElement.addEventListener( "touchend", onPointerUp, false );
      // domElement.addEventListener( "touchcancel", onPointerUp, false );
      // domElement.addEventListener( "touchleave", onPointerUp, false );
  
      this.attach = function(object) {
  
        scope.object = object;
  
        this.gizmo['translate'].hide();
        this.gizmo['rotate'].hide();
        this.gizmo['scale'].hide();
        this.gizmo[_mode].show();
  
        scope.update();
  
      };
  
      this.detach = function(object) {
  
        scope.object = undefined;
        this.axis = undefined;
  
        this.gizmo['translate'].hide();
        this.gizmo['rotate'].hide();
        this.gizmo['scale'].hide();
  
      };
  
      this.disable = function(object) {
  
        scope.object = undefined;
        this.axis = undefined;
  
      };
  
      this.setMode = function(mode) {
  
        _mode = mode ? mode : _mode;
  
        if (_mode == 'scale') scope.space = 'local';
  
        this.gizmo['translate'].hide();
        this.gizmo['rotate'].hide();
        this.gizmo['scale'].hide();
        this.gizmo[_mode].show();
  
        this.update();
        scope.dispatchEvent(changeEvent);
  
      };
  
      this.setSnap = function(snap) {
  
        scope.snap = snap;
  
      };
  
      this.setSize = function(size) {
  
        scope.size = size;
        this.update();
        scope.dispatchEvent(changeEvent);
  
      };
  
      this.setSpace = function(space) {
  
        scope.space = space;
        this.update();
        scope.dispatchEvent(changeEvent);
  
      };
  
      this.update = function() {
  
        if (scope.object === undefined) return;
  
        scope.object.updateMatrixWorld();
        worldPosition.setFromMatrixPosition(scope.object.matrixWorld);
        worldRotation.setFromRotationMatrix(tempMatrix.extractRotation(scope.object.matrixWorld));
  
        camera.updateMatrixWorld();
        camPosition.setFromMatrixPosition(camera.matrixWorld);
        camRotation.setFromRotationMatrix(tempMatrix.extractRotation(camera.matrixWorld));
  
        scale = worldPosition.distanceTo(camPosition) / 6 * scope.size;
        this.position.copy(worldPosition);
        this.scale.set(scale, scale, scale);
  
        eye.copy(camPosition).sub(worldPosition).normalize();
  
        if (scope.space == 'local')
          this.gizmo[_mode].update(worldRotation, eye);
  
        else if (scope.space == 'world')
          this.gizmo[_mode].update(new THREE.Euler(), eye);
  
        this.gizmo[_mode].highlight(scope.axis);
  
      };
  
      this.onPointerHover = function(event) {
  
        if (scope.object === undefined || _dragging === true) return;
  
        event.preventDefault();
  
        var pointer = event.changedTouches ? event.changedTouches[0] : event;
  
        var intersect = intersectObjects(pointer, scope.gizmo[_mode].pickers.children);
  
        if (intersect) {
  
          scope.axis = intersect.object.name;
          scope.update();
          scope.dispatchEvent(changeEvent);
  
        }
        else if (scope.axis !== null) {
  
          scope.axis = null;
          scope.update();
          scope.dispatchEvent(changeEvent);
  
        }
  
      };
  
      this.onPointerDown = function(event) {
  
        if (scope.object === undefined || _dragging === true) return;
  
        event.preventDefault();
        event.stopPropagation();
  
        var pointer = event.changedTouches ? event.changedTouches[0] : event;
  
        if (pointer.button === 0 || pointer.button === undefined) {
  
          var intersect = intersectObjects(pointer, scope.gizmo[_mode].pickers.children);
  
          if (intersect) {
  
            scope.axis = intersect.object.name;
  
            scope.update();
  
            eye.copy(camPosition).sub(worldPosition).normalize();
  
            scope.gizmo[_mode].setActivePlane(scope.axis, eye);
  
            var planeIntersect = intersectObjects(pointer, [scope.gizmo[_mode].activePlane]);
  
            oldPosition.copy(scope.object.position);
            oldScale.copy(scope.object.scale);
  
            oldRotationMatrix.extractRotation(scope.object.matrix);
            worldRotationMatrix.extractRotation(scope.object.matrixWorld);
  
            parentRotationMatrix.extractRotation(scope.object.parent.matrixWorld);
            parentScale.setFromMatrixScale(tempMatrix.getInverse(scope.object.parent.matrixWorld));
  
            offset.copy(planeIntersect.point);
  
          }
  
        }
  
        _dragging = true;
  
      };
  
      this.onPointerMove = function(event) {
  
        if (scope.object === undefined || scope.axis === null || _dragging === false) return;
  
        event.preventDefault();
        event.stopPropagation();
  
        var pointer = event.changedTouches ? event.changedTouches[0] : event;
  
        var planeIntersect = intersectObjects(pointer, [scope.gizmo[_mode].activePlane]);
  
        point.copy(planeIntersect.point);
  
        if (_mode == 'translate') {
  
          point.sub(offset);
          point.multiply(parentScale);
  
          if (scope.space == 'local') {
  
            point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));
  
            if (scope.axis.search('X') == -1) point.x = 0;
            if (scope.axis.search('Y') == -1) point.y = 0;
            if (scope.axis.search('Z') == -1) point.z = 0;
  
            point.applyMatrix4(oldRotationMatrix);
  
            scope.object.position.copy(oldPosition);
            scope.object.position.add(point);
  
          }
  
          if (scope.space == 'world' || scope.axis.search('XYZ') != -1) {
  
            if (scope.axis.search('X') == -1) point.x = 0;
            if (scope.axis.search('Y') == -1) point.y = 0;
            if (scope.axis.search('Z') == -1) point.z = 0;
  
            point.applyMatrix4(tempMatrix.getInverse(parentRotationMatrix));
  
            scope.object.position.copy(oldPosition);
            scope.object.position.add(point);
  
          }
  
          if (scope.snap !== null) {
  
            if (scope.axis.search('X') != -1) scope.object.position.x = Math.round(scope.object.position.x / scope.snap) * scope.snap;
            if (scope.axis.search('Y') != -1) scope.object.position.y = Math.round(scope.object.position.y / scope.snap) * scope.snap;
            if (scope.axis.search('Z') != -1) scope.object.position.z = Math.round(scope.object.position.z / scope.snap) * scope.snap;
  
          }
  
        }
        else if (_mode == 'scale') {
  
          point.sub(offset);
          point.multiply(parentScale);
  
          if (scope.space == 'local') {
  
            if (scope.axis == 'XYZ') {
  
              scale = 1 + ((point.y) / 50);
  
              scope.object.scale.x = oldScale.x * scale;
              scope.object.scale.y = oldScale.y * scale;
              scope.object.scale.z = oldScale.z * scale;
  
            }
            else {
  
              point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));
  
              if (scope.axis == 'X') scope.object.scale.x = oldScale.x * (1 + point.x / 50);
              if (scope.axis == 'Y') scope.object.scale.y = oldScale.y * (1 + point.y / 50);
              if (scope.axis == 'Z') scope.object.scale.z = oldScale.z * (1 + point.z / 50);
  
            }
  
          }
  
        }
        else if (_mode == 'rotate') {
  
          point.sub(worldPosition);
          point.multiply(parentScale);
          tempVector.copy(offset).sub(worldPosition);
          tempVector.multiply(parentScale);
  
          if (scope.axis == 'E') {
  
            point.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));
            tempVector.applyMatrix4(tempMatrix.getInverse(lookAtMatrix));
  
            rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));
  
            tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));
  
            quaternionE.setFromAxisAngle(eye, rotation.z - offsetRotation.z);
            quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);
  
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionE);
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);
  
            scope.object.quaternion.copy(tempQuaternion);
  
          }
          else if (scope.axis == 'XYZE') {
  
            quaternionE.setFromEuler(point.clone().cross(tempVector).normalize()); // rotation axis
  
            tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));
            quaternionX.setFromAxisAngle(quaternionE, -point.clone().angleTo(tempVector));
            quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);
  
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);
  
            scope.object.quaternion.copy(tempQuaternion);
  
          }
          else if (scope.space == 'local') {
  
            point.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));
  
            tempVector.applyMatrix4(tempMatrix.getInverse(worldRotationMatrix));
  
            rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));
  
            quaternionXYZ.setFromRotationMatrix(oldRotationMatrix);
            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);
  
            if (scope.axis == 'X') quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionX);
            if (scope.axis == 'Y') quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionY);
            if (scope.axis == 'Z') quaternionXYZ.multiplyQuaternions(quaternionXYZ, quaternionZ);
  
            scope.object.quaternion.copy(quaternionXYZ);
  
          }
          else if (scope.space == 'world') {
  
            rotation.set(Math.atan2(point.z, point.y), Math.atan2(point.x, point.z), Math.atan2(point.y, point.x));
            offsetRotation.set(Math.atan2(tempVector.z, tempVector.y), Math.atan2(tempVector.x, tempVector.z), Math.atan2(tempVector.y, tempVector.x));
  
            tempQuaternion.setFromRotationMatrix(tempMatrix.getInverse(parentRotationMatrix));
  
            quaternionX.setFromAxisAngle(unitX, rotation.x - offsetRotation.x);
            quaternionY.setFromAxisAngle(unitY, rotation.y - offsetRotation.y);
            quaternionZ.setFromAxisAngle(unitZ, rotation.z - offsetRotation.z);
            quaternionXYZ.setFromRotationMatrix(worldRotationMatrix);
  
            if (scope.axis == 'X') tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
            if (scope.axis == 'Y') tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
            if (scope.axis == 'Z') tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
  
            tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionXYZ);
  
            scope.object.quaternion.copy(tempQuaternion);
  
          }
  
        }
  
        scope.update();
        scope.dispatchEvent(changeEvent);
  
      };
  
      this.onPointerUp = function(event) {
  
        _dragging = false;
        scope.onPointerHover(event);
  
      };
  
      function intersectObjects(pointer, objects) {
  
        var rect = domElement.getBoundingClientRect();
        var x = (pointer.clientX - rect.left) / rect.width;
        var y = (pointer.clientY - rect.top) / rect.height;
        pointerVector.set((x) * 2 - 1, -(y) * 2 + 1, 0.5);
  
        projector.unprojectVector(pointerVector, camera);
        ray.set(camPosition, pointerVector.sub(camPosition).normalize());
  
        var intersections = ray.intersectObjects(objects, true);
        return intersections[0] ? intersections[0] : false;
  
      }
  
      this.isDragging = function() {
  
        return !(scope.object === undefined || scope.axis === null || _dragging === false);
  
      };
  
      // figure out if an event will intersect a control for a particular callback
      this.eventIntersectsControl = function(callbackName, event) {
  
        var pointer = event.changedTouches ? event.changedTouches[0] : event;
  
        var eventMap = {
  
          onPointerHover: function(event) {
  
            if (scope.object === undefined || _dragging === true) return false;
  
            var intersect = intersectObjects(pointer, scope.gizmo[_mode].pickers.children);
  
            return intersect;
  
          },
  
          onPointerDown: function(event) {
  
            if (scope.object === undefined || _dragging === true) return false;
  
            if (pointer.button === 0 || pointer.button === undefined) {
  
              var intersect = intersectObjects(pointer, scope.gizmo[_mode].pickers.children);
  
              if (intersect) {
  
                scope.axis = intersect.object.name;
  
                scope.update();
  
                eye.copy(camPosition).sub(worldPosition).normalize();
  
                scope.gizmo[_mode].setActivePlane(scope.axis, eye);
  
                var planeIntersect = intersectObjects(pointer, [scope.gizmo[_mode].activePlane]);
  
                return planeIntersect;
  
              }
              else {
  
                return false;
  
              }
  
            }
            else {
  
              return false;
  
            }
  
          },
  
          onPointerMove: function(event) {
  
            if (scope.object === undefined || scope.axis === null || _dragging === false) return false;
  
            var planeIntersect = intersectObjects(pointer, [scope.gizmo[_mode].activePlane]);
  
            return planeIntersect;
  
          }
  
        };
  
        return eventMap[callbackName] && eventMap[callbackName](event);
  
      };
  
    };
  
    THREE.TransformControls.prototype = Object.create(THREE.Object3D.prototype);
  
  }());
  

  // #General utilities
  // creates instances
  var construct = function(constructor, args) {
    var f = function() {
      return constructor.apply(this, args);
    };
    f.prototype = constructor.prototype;
    return new f();
  };
  
  var capitalise = function(string) {
    return string && string.charAt(0).toUpperCase() + string.slice(1);
  };
  

  // #Models
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
  
  var OrbitControl = m3js.OrbitControl = Backbone.Model.extend({
  
    _control: undefined,
  
    initializeControl: function() {
  
      var _this = this;
  
      this._control = new THREE.OrbitControls(this.renderer.camera);
      this._control.damping = 0.1;
    },
  
    getControl: function() {
      return this._control;
    },
  
    disable: function() {
      this._control.enabled = false;
    },
  
    enable: function() {
      this._control.enabled = true;
    },
  
    isEnabled: function() {
      return this._control.enabled;
    },
  
    dispatchDOMEvent: function(e) {
      var eventMap = {
        'contextmenu': 'onContextMenu',
        'mousedown': 'onMouseDown',
        'mousewheel': 'onMouseWheel',
        'DOMMouseScroll': 'onMouseWheel',
  
        'touchstart': 'touchstart',
        'touchend': 'touchend',
        'touchmove': 'touchmove',
  
        'keydown': 'onKeyDown'
  
        // orbit controls dynamically attach and remove these as part of dragging
        // 'mousemove': 'onMouseMove',
        // 'mouseup': 'onMouseUp'
      };
  
      if (eventMap[e.type] && _.isFunction(this._control[eventMap[e.type]])) {
        this._control[eventMap[e.type]].call(this._control, e);
      }
    },
  
    renderer: undefined,
  
    initialize: function(options) {
      this.renderer = options.renderer;
      this.initializeControl();
    }
  });
  
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
          // drawable.save({
          // silent: true
          // });
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
  

  // #Views
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
              this.triggerMethod('drawable:pointerUp', raycastedDrawable);
            }
          }
        });
      }
    },
  
    onDrawablePointerUp: function(drawable) {
      this.transformControl.attachDrawable(drawable);
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
  
        var _this = this;
        window.addEventListener('resize', function() {
          _this.onWindowResize();
        }, false);
  
        _this.startWebGLRendering();
        _this.render();
      });
    }
  });
  
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
  

  return m3js;

}));
