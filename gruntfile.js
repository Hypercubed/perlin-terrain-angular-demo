module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    copy: {
      dist: {
        files: [{
          cwd: '.',
          dest: 'dist/',
          src: [
            '*.{html,js,css}',
            'bower_components/**/*.{html,js,css}'
          ]
        }]
      },
    },

    'gh-pages': {
      options: {
        base: 'dist'
      },
      src: ['**']
    }
  });

  grunt.registerTask('build', ['copy:dist']);
  grunt.registerTask('deploy', ['build','gh-pages']);

}