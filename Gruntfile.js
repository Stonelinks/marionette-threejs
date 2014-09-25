module.exports = function(grunt) {

  var WEBSERVER_PORT = 8012;
  var LIVERELOAD_PORT = 12022;

  require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    meta: {
      banner: '// <%= pkg.name %> - v<%= pkg.version %>\n' +
        '//\n' +
        '// <%= pkg.homepage %>\n' +
        '//\n' +
        '// <%= pkg.description %>\n' +
        '//\n' +
        '// Copyright (c)<%= grunt.template.today("yyyy") %> - <%= pkg.author %>\n' +
        '//\n' +
        '// Distributed under <%= pkg.license %> license\n' +
        '//\n' +
        '\n'
    },

    jsbeautifier: {
      options: {
        js: {
          braceStyle: 'end-expand',
          indentSize: 2,
          keepArrayIndentation: true,
          maxPreserveNewlines: 10,
          preserveNewlines: true
        }
      },

      src: {
        src: ['src/**/*.js']
      },

      extras: {
        src: [
          'Gruntfile.js',
          'example/*.js'
        ]
      }
    },

    connect: {
      options: {
        livereload: LIVERELOAD_PORT
      },

      docs: {
        options: {
          port: WEBSERVER_PORT + 1,
          open: 'http://localhost:' + (WEBSERVER_PORT + 1) + '/docs/marionette-threejs.html'
        }
      }
    },

    exec: {
      fixjsstyle: {
        command: 'fixjsstyle Gruntfile.js && fixjsstyle -r src/ && fixjsstyle example/*.js'
      }
    },

    watch: {

      options: {
        // spawn: true,
        interval: 500,
        forever: true,
        debounceDelay: 1000,
        livereload: LIVERELOAD_PORT
      },

      src: {
        files: [
          'src/**/*.js'
        ],
        tasks: [
          'lint',
          'build',
          'docs'
        ]
      }
    },

    preprocess: {
      options: {
        context: {
          BANNER: '<%= meta.banner %>'
        }
      },

      dev: {
        src: 'src/marionette-threejs.js',
        dest: 'marionette-threejs.js'
      }
    },

    uglify: {
      options: {
        banner: '<%= meta.banner %>'
      },
      prod: {
        // mangle: {
        // except: ['marionette-threejs', 'm3js']
        // },
        src: 'marionette-threejs.js',
        dest: 'marionette-threejs.min.js'
      }
    },

    docco: {
      debug: {
        src: ['marionette-threejs.js'],
        options: {
          output: 'docs/'
        }
      }
    },

    'gh-pages': {
      options: {
        base: '.'
      },
      src: ['**']
    }
  });

  grunt.registerTask('lint', [
    'jsbeautifier',
    'exec:fixjsstyle'
  ]);

  grunt.registerTask('build', [
    'preprocess:dev',
    'uglify'
  ]);

  grunt.registerTask('docs', ['docco']);

  grunt.registerTask('publish', [
    'lint',
    'build',
    'docs',
    'gh-pages'
  ]);

  grunt.registerTask('default', [
    'lint',
    'build',
    'docs',
    'connect',
    'watch'
  ]);
};
