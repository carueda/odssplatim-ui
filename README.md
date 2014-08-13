odssplatim-ui
=============

This is the platform timeline editor UI module for ODSS.

The platform timeline editor is intended to allow users to schedule platform
assets in a graphical way while providing a unified mechanism to maintain and
share this information with features including options to enter typical
platform schedules, navigation with zoom in/out, and versioning.


## Development ##

It is assumed that [Bower](http://bower.io/) and [Node.js](http://nodejs.org/)
are already installed in your system.

```shell
$ npm install
```
This installs the dependencies under `node_modules/` and also generates
`src/app/templates.js` with all the templates in the module web application
so they are not only fetched in a single request, but the caching also facilitates
the deployment of this module along with the main ODSS application without
having to adjust any paths for the templates.


```shell
$ bower install
```
This installs the dependencies for the web application (AngularJS, MomentJS, etc.)
under `vendor/`.

## Configure the module ##

If needed, edit `src/app/config.js` in this module to indicate the platform
time editor REST endpoint URL and the URL to retrieve the platforms.
The default values (`"/odss/platim"` and `"/odss/platforms"`, respectively)
should be OK for the ODSS application.

## Setting everything up ##

To complete the preparations to enable the module for ODSS, execute:
```shell
$ grunt
```
In particular, this generates `bin/` with a self-contained platform timeline
editor application, so it will include all supporting resources.


## Running ##

At this point the module should be fully enabled in the main ODSS application.
In concrete, the main index file, `src/app/index.min.html`, includes
all the needed resources, in this case by pointing to concatenated/minified
files for these resources. For a version pointing to all non-minified
resources individually, see `src/app/index.html`.

## Local testing ##

The module itself can be launched outside of the main ODSS application as
follows:

- Run some local http server to serve this directory, for example:
```shell
$ npm install http-server -g
$ http-server
Starting up http-server, serving ./ on port: 8080
Hit CTRL-C to stop the server
```
Then open [http://localhost:8080/src/app/](http://localhost:8080/src/app/) in your browser.

- For the minified form (after running `grunt`), open
[http://localhost:8080/bin/](http://localhost:8080/bin/).


## Noteworthy changes ##

- 2014-08-12: vis.js based implementation proving to be much easier given its better design.

- 2014-08-06: code review and adjustments toward preparations for upgrading
underlying dependencies, and implementation of new enhacements.

- 2014-03-10: because of css conflicts (that need some more investigation) revert to include
platform timeline widget via iframe.

- 2014-01-17: fix url for retrieval of platforms

- 2013-11-25 - platform timeline editor UI now fully integrated from initial development
  in original odssplatim-ui https://github.com/carueda/odssplatim-ui-original/tree/b1b8b2b7


## History ##

This module was first based on JQuery, but then converted to AngularJS.
This was initially as a clone of
[angular-seed](https://github.com/angular/angular-seed),
but then morphed into a structure more closely aligned with
[ng-boilerplate](https://github.com/ngbp/ng-boilerplate/) and
[angular-app](https://github.com/angular-app/angular-app/tree/master/client).
