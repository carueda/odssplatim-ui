var gulp        = require('gulp');
var gutil       = require('gulp-util');
var rename      = require('gulp-rename');
var rimraf      = require('rimraf');
var zip         = require('gulp-zip');
var replace     = require('gulp-replace');
var merge       = require('merge-stream');
var concat      = require('gulp-concat');
var uglify      = require('gulp-uglify');
var ngtemplates = require('gulp-angular-templatecache');
var webserver   = require('gulp-webserver');
var open        = require('open');

// some application properties from bower.json
var bower = require('./bower');
var appname = bower.name;
var version = bower.version;

var distDest = './dist';

var zipfile = appname + '-' + version + '.zip';
var zipDest = distDest;


gutil.log("building " +appname+ " version " +version);

////////////////////////////////////////////////////////////////////////////
// tasks

gulp.task('default', ['odssplatim']);

// put the whole distribution in a zip file
gulp.task('dist', ['odssplatim'], function() {
    return gulp.src([distDest + '/**', '!' + distDest + '/**/*.zip'])
        .pipe(zip(zipfile))
        .pipe(gulp.dest(zipDest));
});

////////////////////////////////////////////////////////////////////////////
// preparation for inclusion in main ODSS application

gulp.task('odssplatim', ['app', 'vendor'], function() {
    return gulp.src(['src/app/index.min.html'])
        .pipe(replace(/@@appname/g, appname))
        .pipe(replace(/@@version/g, version))
        .pipe(rename('index.html'))
        .pipe(gulp.dest(distDest))
});

gulp.task('app', ['app-js', 'app-css', 'app-other']);

gulp.task('app-js', ['ngtemplates'], function() {
    return merge(
        // config.js
        gulp.src(['src/app/config.js'])
            .pipe(gulp.dest(distDest + '/js')),

        // remaining:
        gulp.src([
            'src/common/**/*.js',
            'src/app/**/*.js',
            '!src/app/config.js'
        ])
            .pipe(concat('app.js'))
            .pipe(gulp.dest(distDest + '/js'))
            .pipe(uglify())
            .pipe(rename('app.min.js'))
            .pipe(gulp.dest(distDest + '/js'))
    )
});

gulp.task('ngtemplates', function() {
    return gulp.src('**/*.tpl.html', {cwd: 'src/app/'})
        .pipe(replace(/@@appname/g, appname))
        .pipe(replace(/@@version/g, version))
        .pipe(ngtemplates('templates.js', {module: 'odssPlatimApp.templates'}))
        .pipe(gulp.dest('src/app'));
});

gulp.task('app-css', function() {
    return gulp.src([
        'src/**/*.css'
    ])
        .pipe(concat('app.css'))
        .pipe(gulp.dest(distDest + '/css'))
});

gulp.task('app-other', function() {
    return gulp.src([
        'src/img/resize_dots.png'
    ], {base: 'src/'})
        .pipe(gulp.dest(distDest))
});

gulp.task('vendor', ['vendor-js', 'vendor-css', 'vendor-other']);

gulp.task('vendor-js', function() {
    return merge(
        gulp.src([
            'vendor/moment/min/moment.min.js',
            'vendor/lodash/dist/lodash.min.js',
            'vendor/angular/angular.min.js',
            'vendor/angular-sanitize/angular-sanitize.min.js',
            'vendor/angular-bootstrap/ui-bootstrap-tpls.min.js',
            'vendor/vis/dist/vis.min.js',
            'vendor/ol3/build/ol.js'
        ])
            .pipe(concat('vendor.min.js'))
            .pipe(gulp.dest(distDest + '/js'))
    )
});

gulp.task('vendor-css', function() {
    return gulp.src([
        'vendor/bootstrap-css/css/**/*.min.css',
        'vendor/font-awesome/css/**/*.min.css',
        'vendor/vis/dist/vis.min.css',
        'vendor/ol3/css/ol.css'
    ])
        .pipe(concat('vendor.min.css'))
        .pipe(gulp.dest(distDest + '/css'))
});

gulp.task('vendor-other', function() {
    return merge(
        gulp.src([
                  'vendor/font-awesome/fonts/**'
        ], {base: 'vendor/font-awesome/'})
            .pipe(gulp.dest(distDest))

        ,gulp.src([
                  'vendor/bootstrap-css/fonts/**'
        ], {base: 'vendor/bootstrap-css/'})
            .pipe(gulp.dest(distDest))

        ,gulp.src([
                  'vendor/vis/dist/vis.map'
        ], {base: 'vendor/vis/dist/'})
            .pipe(gulp.dest(distDest + '/js'))
    )
});

/////////////////
// clean
gulp.task('clean',        function (cb) { rimraf(distDest, cb); });
gulp.task('clean-vendor', function (cb) { rimraf('./vendor', cb); });
gulp.task('clean-node',   function (cb) { rimraf('./node_modules', cb); });
gulp.task('clean-all', ['clean', 'clean-vendor', 'clean-node']);

////////////////////////////////////////////////////////////////////////////
// for local testing
////////////////////////////////////////////////////////////////////////////

var localConfig  = 'local.config.js';
var localIndex  = 'local.index.html';
var localPort   = 8001;
var localUrl    = 'http://localhost:' +localPort+ '/src/app/' +localIndex;


gulp.task('local-index', function() {
    gulp.src('src/app/index.html')
        .pipe(replace(/<script src='config.js'/g, "<script src='" +localConfig+ "'"))
        .pipe(rename(localIndex))
        .pipe(gulp.dest('src/app'));
});

////////////////////////////////////
// local testing with platim server:

// the following corresponds to running `node app` under webapp/server/platim/
var platimAddr   = 'http://localhost:3000';

gulp.task('local-with-platim', ['webserver-with-platim'], function(cb) {
    open(localUrl);
    cb();
});

gulp.task('webserver-with-platim', ['config-with-platim', 'local-index'], function() {
    gulp.src('.')
        .pipe(webserver({port: localPort}))
    ;
});

gulp.task('config-with-platim', function() {
    gulp.src('src/app/config.js')
        .pipe(replace(/rest\s*:\s*".*"/g,         'rest: "' +platimAddr+ '"'))
        .pipe(replace(/platformsUrl\s*:\s*".*"/g, 'platformsUrl: "' +platimAddr+ '/platforms"'))
        .pipe(rename(localConfig))
        .pipe(gulp.dest('src/app'));
});

////////////////////////////////////
// local testing with proxy:

// the following is to run against actual ODSS via a proxy for CORS-enablement
var proxyTarget = 'http://odss-test.shore.mbari.org';
var proxyPort   = 9999;
var proxyAddr   = 'http://localhost:' +proxyPort;

gulp.task('local-with-proxy', ['webserver-with-proxy'], function(cb) {
    open(localUrl);
    cb();
});

gulp.task('webserver-with-proxy', ['config-with-proxy', 'proxy', 'local-index'], function() {
    gulp.src('.')
        .pipe(webserver({port: localPort}))
    ;
});

gulp.task('config-with-proxy', function() {
    gulp.src('src/app/config.js')
        .pipe(replace(/rest\s*:\s*".*"/g,         'rest: "' +proxyAddr+ '/odss/platim"'))
        .pipe(replace(/platformsUrl\s*:\s*".*"/g, 'platformsUrl: "' +proxyAddr+ '/odss/platforms"'))
        .pipe(rename(localConfig))
        .pipe(gulp.dest('src/app'));
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
