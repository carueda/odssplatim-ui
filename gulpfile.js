var gulp     = require('gulp');
var gutil    = require('gulp-util');
var concat   = require('gulp-concat');
var rename   = require('gulp-rename');
var rimraf   = require('rimraf');
var zip      = require('gulp-zip');
var ngtemplates = require('gulp-angular-templatecache');

// some properties
var bower = require('./bower');
var appname = bower.name;
var version = bower.version;

var distDest = './dist/' + appname;
var zipfile = appname + '-' + version + '.zip';
var zipDest = './dist';

gutil.log("building " +appname+ " version " +version);

/////////////////
// tasks

gulp.task('default', ['ngtemplates', 'concat', 'copy']);

/////////////////
// ngtemplates

gulp.task('ngtemplates', function () {
    return gulp.src('**/*.tpl.html', {cwd: 'src/app/'})
        .pipe(ngtemplates('templates.js', {module: 'odssPlatimApp.templates'}))
        .pipe(gulp.dest('src/app'));
});

/////////////////
// concat

gulp.task('concat', ['concat_vendor_js', 'concat_vendor_css', 'concat_js', 'concat_css']);

gulp.task('concat_vendor_js', function() {
  gulp.src([
          'vendor/moment/min/moment.min.js',
          'vendor/lodash/dist/lodash.min.js',
          'vendor/angular/angular.min.js',
          'vendor/angular-sanitize/angular-sanitize.min.js',
          'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
          'vendor/vis/dist/vis.js'
        ])
    .pipe(concat('odssplatim_vendor.js'))
    .pipe(gulp.dest(distDest + '/js/'))
});

gulp.task('concat_vendor_css', function() {
  gulp.src([
          'vendor/bootstrap-css/css/bootstrap.min.css',
          'vendor/font-awesome/css/font-awesome.min.css',
          'vendor/vis/dist/vis.css'
        ])
    .pipe(concat('odssplatim_vendor.css'))
    .pipe(gulp.dest(distDest + '/css/'))
});

gulp.task('concat_js', function() {
  gulp.src([
          'src/common/**/*.js',
          'src/app/**/*.js',
          '!' + distDest + '/js/odssplatim.js'
        ])
    .pipe(concat('odssplatim.js'))
    .pipe(gulp.dest(distDest + '/js/'))
});

gulp.task('concat_css', function() {
  gulp.src([
          'src/common/links/timeline.css',
          'src/css/**/*.css'
        ])
    .pipe(concat('odssplatim.css'))
    .pipe(gulp.dest(distDest + '/css/'))
});


/////////////////
// copy

gulp.task('copy', ['vendor_bootstrap', 'vendor_font_awesome', 'common_links',
                   'platim_img', 'platim_views', 'platim_index']);

gulp.task('vendor_bootstrap', function() {
  gulp.src(['**'], {cwd: 'vendor/bootstrap/img'})
    .pipe(gulp.dest(distDest + '/img/'))
});
gulp.task('vendor_font_awesome', function() {
  gulp.src(['**'], {cwd: 'vendor/font-awesome/fonts'})
    .pipe(gulp.dest(distDest + '/fonts/'))
});
gulp.task('common_links', function() {
  gulp.src(['img/**'], {cwd: 'src/common/links'})
    .pipe(gulp.dest(distDest + '/css/'))
});
gulp.task('platim_img', function() {
  gulp.src(['**'], {cwd: 'src/img'})
    .pipe(gulp.dest(distDest + '/img/'))
});
gulp.task('platim_views', function() {   // in case of not using the templates file
  gulp.src(['**/*tpl.html'], {cwd: 'src/app'})
    .pipe(gulp.dest(distDest + '/'))
});
gulp.task('platim_index', function() {
  gulp.src('src/app/index.min.html')
    .pipe(rename('index.html'))
    .pipe(gulp.dest(distDest + '/'))
});

/////////////////
// clean

gulp.task('clean', function (cb) {
    rimraf(distDest, cb);
});
gulp.task('clean-dist', function (cb) {
    rimraf('./dist', cb);
});
gulp.task('clean-vendor', function (cb) {
    rimraf('./vendor', cb);
});
gulp.task('clean-all', ['clean', 'clean-dist', 'clean-vendor']);

/////////////////
// dist

gulp.task('dist', ['default'], function() {
  return gulp.src([distDest + '/**'])
    .pipe(zip(zipfile))
    .pipe(gulp.dest(zipDest));
});

