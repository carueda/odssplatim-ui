odssplatim-ui
=============

This is the platform timeline editor UI module for ODSS.

The platform timeline editor is intended to allow users to schedule platform
assets in a graphical way while providing a unified mechanism to maintain and
share this information with features including options to enter typical
platform schedules, navigation with zoom in/out, and versioning.


## Install dependencies ##

It is assumed that [Bower](http://bower.io/) and [Node.js](http://nodejs.org/)
are already installed in your system.

### Web app dependencies ###

The dependencies for the web application (AngularJS, MomentJS, etc,) are not
kept under version control but can be installed as follows:

```shell
$ bower install
```
This installs the dependencies under `vendor/`.

### Development dependencies ###

```shell
$ npm install
```
This installs the dependencies under `node_modules/` and also generates
`src/app/templates.js` with all the templates in the module web application
so they are not only fetched in a single request, but the caching also facilitates
the deployment of this module along with the main ODSS application without
having to adjust any paths for the templates.

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
In concrete, the main index file, `src/webapp/odss/index.html`, includes the
needed resources, in this case by pointing to concatenated/minified files for
these resources. For a version pointing to all resources individually,
see `src/webapp/odss/index-odssplatim.html`.

## Local testing - development ##

The module itself can be launched outside of the main ODSS application as
follows:

- Use and run a local http server, for example:
```shell
$ npm install http-server -g
$ http-server
Starting up http-server, serving ./ on port: 8080
Hit CTRL-C to stop the server
```
Then open http://localhost:8080/src/app/index.html in your browser.

- For the minified form, open http://localhost:8080/bin/index.html.


## History ##

This module was first based on JQuery, but then converted to AngularJS.
This was initially as a clone of
[angular-seed](https://github.com/angular/angular-seed),
but then morphed into a structure more closely aligned with
[ng-boilerplate](https://github.com/ngbp/ng-boilerplate/) and
[angular-app](https://github.com/angular-app/angular-app/tree/master/client).
