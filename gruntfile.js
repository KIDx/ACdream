module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    //压缩js
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      dist: {
        expand: true,
        cwd: 'src/js',
        src: '*.js',
        dest: 'public/js'
      }
    },

    //压缩css
    cssmin: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      beautify: {
        ascii_only: true
      },
      dist: {
        expand: true,
        cwd: 'src/css',
        src: '*.css',
        dest: 'public/css'
      }
    }
  });
  
  // 加载指定插件任务
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  
  // 默认执行的任务
  grunt.registerTask('default', ['uglify', 'cssmin']);

};
