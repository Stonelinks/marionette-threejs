marionette-threejs
================

Simple wrappers around three.js components using [Backbone.Marionette](https://github.com/marionettejs/backbone.marionette)

It provides a couple useful things for using three.js inside your backbone app.

##How to use it

marionette-threejs can be used either as an AMD module or inside a regular script tag. It obviously depends on Backbone and three.js to work (check bower.json for exact version numbers), so make sure those are included. Use `marionette-threejs.js` for an unoptimized build that is easier to debug, or `marionette-threejs.min.js` for an optimized / minified version.

##Example

An example of basic usage of marionette-threejs can be found below.

###[Example](http://stonelinks.github.io/marionette-threejs/example/index.html)
###[Example source code](https://github.com/Stonelinks/marionette-threejs/tree/master/example)

##Docs

In lieu of formal documentation, the source code has been hevily annotated so you can easily figure out what is going on:

###[Annotated source code](http://stonelinks.github.io/marionette-threejs/docs/marionette-threejs.html)

##Developing

Assuming you've already run `npm i && bower i`, pretty much just run `grunt` and leave it running. I've got plugins configured to do the following:

- Make the normal and minified builds (using [preprocess](https://github.com/jsoverson/preprocess) and [uglify](https://github.com/mishoo/UglifyJS2))
- Generate the html for the annotated source code (using [docco](https://github.com/jashkenas/docco))
- Redo all this stuff if any source files change (using [grunt watch](https://github.com/gruntjs/grunt-contrib-watch))
