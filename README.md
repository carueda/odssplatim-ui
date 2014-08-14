odssplatim-ui
=============

This is the platform timeline editor UI module for ODSS.

## Setup in ODSS ##

Currently the timeline editor widget is included in the main ODSS application
via iframe, so there is no additional setup for ODSS. The timeline editor,
in a standalone fashion, is already deployed at the associated URL.


## Module setup ##

In general:

```shell
$ npm install
$ bower install
$ gulp
```

- `npm install` installs dependencies.

- `bower install` installs web application dependencies.

- `gulp` generates a distribution of the module as a standalone application.
Default configuration should be OK for the ODSS application, but can be adjusted
as needed (see below).

## Configuration ##

Either for standalone deployment or embedded inclusion in ODSS, `src/app/config.js`
is used to configure this module. This configuration consists of indicating the
platform timeline editor REST endpoint URL and the URL to retrieve platform information.
The default values (`"/odss/platim"` and `"/odss/platforms"`, respectively)
should be OK for the ODSS application.


## Local testing ##

Run some local http server to serve this directory, for example:
```shell
$ npm install http-server -g
$ http-server
Starting up http-server, serving ./ on port: 8080
Hit CTRL-C to stop the server
```
Then open [http://localhost:8080/src/app/](http://localhost:8080/src/app/) in your browser.

To test the standalone version created by `gulp`,
open [http://localhost:8080/dist/odssplatim-ui/](http://localhost:8080/dist/odssplatim-ui/).


## Noteworthy changes ##

- 2014-08-12: vis.js based implementation proving to be much easier given its better design.

- 2014-08-06: code review and adjustments toward preparations for upgrading
underlying dependencies, and implementation of new enhacements.

- 2014-03-10: because of css conflicts (that need some more investigation) revert to include
platform timeline widget via iframe.

- 2014-01-17: fix url for retrieval of platforms

- 2013-11-25 - platform timeline editor UI now fully integrated from initial development
  in original odssplatim-ui https://github.com/carueda/odssplatim-ui-original/tree/b1b8b2b7
