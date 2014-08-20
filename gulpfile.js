var gulp     = require('gulp');
var gutil    = require('gulp-util');
var rename   = require('gulp-rename');
var rimraf   = require('rimraf');
var zip      = require('gulp-zip');
var replace  = require('gulp-replace');
var merge    = require('merge-stream');
var ngtemplates = require('gulp-angular-templatecache');
var webserver = require('gulp-webserver');
var open     = require('open');

// some properties
var bower = require('./bower');
var appname = bower.name;
var version = bower.version;

var distDest = './dist/' + appname;
var zipfile = appname + '-' + version + '.zip';
var zipDest = './dist';

gutil.log("building " +appname+ " version " +version);

////////////////////////////////////////////////////////////////////////////
// tasks

gulp.task('default', ['dist']);

gulp.task('dist', ['build'], function() {
  return gulp.src([distDest + '/**'])
    .pipe(zip(zipfile))
    .pipe(gulp.dest(zipDest));
});

gulp.task('build', ['ngtemplates', 'copy']);

gulp.task('ngtemplates', function() {
    return gulp.src('**/*.tpl.html', {cwd: 'src/app/'})
        .pipe(ngtemplates('templates.js', {module: 'odssPlatimApp.templates'}))
        .pipe(gulp.dest('src/app'));
});

gulp.task('copy', function () {
    return merge(

      gulp.src([
              'vendor/moment/moment.js',
              'vendor/lodash/dist/lodash.js',
              'vendor/angular/angular.js',
              'vendor/angular-sanitize/angular-sanitize.js',
              'vendor/angular-bootstrap/ui-bootstrap-tpls.js',
              'vendor/vis/dist/vis.js'
            ], {base: '.'})
        .pipe(gulp.dest(distDest)),

      gulp.src([
              'vendor/bootstrap-css/css/**',
              'vendor/bootstrap-css/img/**',
              'vendor/font-awesome/css/**',
              'vendor/font-awesome/fonts/**',
              'vendor/vis/dist/vis.css'
            ], {base: '.'})
        .pipe(gulp.dest(distDest)),

      gulp.src([
              'src/app/**/*.js',
              '!src/app/constants_links.js',
              '!src/app/token/timelineWidget.js'
            ])
        .pipe(gulp.dest(distDest)),

      gulp.src([
              'src/common/utils/**/*.js'
            ], {base: 'src'})
        .pipe(gulp.dest(distDest)),

      gulp.src([
              'src/css/**/*.css'
            ])
        .pipe(gulp.dest(distDest + '/css')),

      gulp.src(['**'], {cwd: 'src/img'})
        .pipe(gulp.dest(distDest + '/img')),

      gulp.src('src/app/index.html')
        .pipe(replace(/\.\.\/\.\.\/vendor\//g, 'vendor/'))
        .pipe(replace(/\.\.\/css\//g, 'css/'))
        .pipe(replace(/\.\.\/common\//g, 'common/'))
        .pipe(replace(/src='([a-z])/g, "src='$1"))
        .pipe(replace(/@@appname/g, appname))
        .pipe(replace(/@@version/g, version))
        //.pipe(rename('index_dev.html'))
        .pipe(gulp.dest(distDest)),

      gulp.src(['**/*tpl.html'], {cwd: 'src/app'})
        .pipe(replace(/@@appname/g, appname))
        .pipe(replace(/@@version/g, version))
        .pipe(gulp.dest(distDest)),

      //gulp.src('src/app/index.min.html')
      //  .pipe(rename('index.html'))
      //  .pipe(gulp.dest(distDest)),

      gulp.src('src/app/index_links.html')
        .pipe(gulp.dest(distDest))
    )
});

/////////////////
// clean
gulp.task('clean',        function (cb) { rimraf(distDest, cb); });
gulp.task('clean-dist',   function (cb) { rimraf('./dist', cb); });
gulp.task('clean-vendor', function (cb) { rimraf('./vendor', cb); });
gulp.task('clean-all', ['clean', 'clean-dist', 'clean-vendor']);

//////////////////////////////////
// for local testing

var localConfig  = 'local.config.js';
var localIndex  = 'local.index.html';
var proxyTarget = 'http://odss-test.shore.mbari.org';
var proxyPort   = 9999;
var proxyAddr   = 'http://localhost:' +proxyPort;
var localPort   = 8001;
var localUrl    = 'http://localhost:' +localPort+ '/src/app/' +localIndex;

gulp.task('local', ['webserver'], function(cb) {
    open(localUrl);
    cb();
});

gulp.task('webserver', ['config', 'proxy'], function() {
    gulp.src('.')
        .pipe(webserver({port: localPort}))
    ;
});

gulp.task('config', function() {
    merge(
        gulp.src('src/app/config.js')
            .pipe(replace(/rest\s*:\s*".*"/g,         'rest: "' +proxyAddr+ '/odss/platim"'))
            .pipe(replace(/platformsUrl\s*:\s*".*"/g, 'platformsUrl: "' +proxyAddr+ '/odss/platforms"'))
            .pipe(rename(localConfig))
            .pipe(gulp.dest('src/app')),

        gulp.src('src/app/index.html')
            .pipe(replace(/<script src='config.js'/g, "<script src='" +localConfig+ "'"))
            .pipe(rename(localIndex))
            .pipe(gulp.dest('src/app'))
    );
});

// proxy to CORS-enable the ODSS endpoint to facilitate local development/testing
gulp.task('proxy', function(cb) {
    var httpProxy = require('http-proxy');
    var proxy = httpProxy.createProxyServer();
    proxy.on('proxyRes', function (proxyRes, req, res, options) {
        var headers = proxyRes.headers;
        headers['Access-Control-Allow-Origin'] = '*';
    });
    proxy.on('error', function (err, req, res) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Something went wrong.');
    });

    require('http').createServer(function (req, res) {
        proxy.web(req, res, {
            target: proxyTarget
        });
    }).listen(proxyPort);

    cb();
});
