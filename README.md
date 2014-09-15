odssplatim-ui
=============

This is the platform timeline editor UI module for ODSS.

## Setup in ODSS ##

The platform timeline editor is currently being built directly from this
directory (see below) and deployed as a standalone application on the odss-test server.
Since the main ODSS application includes this editor via an iframe with
the corresponding URL, there is no additional setup for ODSS. 


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
are currently appropriate for the ODSS application.


## Local testing ##

### with "platim" server running locally

In a terminal:

```shell
$ cd .../webapp/server/platim
$ node app
```

And in this directory:
```shell
$ gulp local-with-platim
```
This creates a local configuration and index file; then opens 
[http://localhost:8001/src/app/local.index.html](http://localhost:8001/src/app/local.index.html)
in your browser.

### with proxy to actual ODSS server

Just run in this directory:
```shell
$ gulp local-with-proxy
```

### Testing the standalone distro

To test the standalone version created by `gulp`,
open [http://localhost:8001/dist/odssplatim-ui/](http://localhost:8001/dist/odssplatim-ui/).


## Noteworthy changes ##

- 2014-08-25: (0.2.1)
  - show "last updated" info
  - set margin.item.horizontal=0
  
- 2014-08-20:
  - confirmation alert prior to refresh if there are unsaved tokens
  - help link  
  
- 2014-08-12: 
  - platform dialog now allows to individually select the platforms to be included in the widget 
  - platform selection is (automatically) saved so is preserved across sessions
  - selected platforms are now grouped by type and sorted alphabetically
  - token tooltip with name and description
  - colored bullets next to platform names
  - internal: now using [vis.js](http://visjs.org) for the timeline widget itself

- 2014-08-06: code review and adjustments toward preparations for upgrading
underlying dependencies, and implementation of new enhancements.

- 2014-03-10: because of css conflicts (that need some more investigation) revert to include
platform timeline widget via iframe.

- 2014-01-17: fix url for retrieval of platforms

- 2013-11-25 - platform timeline editor UI now fully integrated from initial development
  (original repo https://github.com/carueda/odssplatim-ui-original/tree/b1b8b2b7)
