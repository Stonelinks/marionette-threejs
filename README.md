backbone-threejs
================

Simple Backbone wrappers around three.js components

It provides a couple useful things for using three.js inside your backbone app.

##How to use it

backbone-threejs can be used either as an AMD module or inside a regular script tag. It obviously depends on Backbone and three.js to work (check bower.json for exact version numbers), so make sure those are included. Use `backbone-threejs.js` for an unoptimized build that is easier to debug, or `backbone-threejs.min.js` for an optimized / minified version.

##Docs

In lieu of formal documentation, the source code has been hevily annotated so you can easily figure out what is going on:

###[Annotated source code](http://stonelinks.github.io/backbone-threejs/docs/backbone-threejs.html)

##Developing

Assuming you've already run `npm i && bower i`, pretty much just run `grunt` and leave it running. I've got plugins configured to do the following:

- Make the normal and minified builds (using [preprocess](https://github.com/jsoverson/preprocess) and [uglify](https://github.com/mishoo/UglifyJS2))
- Generate the html for the annotated source code (using [docco](https://github.com/jashkenas/docco))
- Redo all this stuff if any source files change (using [grunt watch](https://github.com/gruntjs/grunt-contrib-watch))
