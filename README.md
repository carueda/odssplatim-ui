# odssplatim-ui

This is the platform timeline module for the ODSS web application.

## Setup for the ODSS main application

Only the following steps are needed to completely prepare this module
for the ODSS main application:

```shell
$ npm install
$ bower install
$ gulp
```

This generates the `dist/` subdirectory with the required resources
to be linked to by the main ODSS html file.

## Configuration

`src/app/config.js` is used to configure this module. The key parameters are:
```js
    // odssplatim-rest endpoint URL
    rest: "/odss/platim",

    // URL to get platform information
    platformsUrl: "/odss/platforms",
```

**NOTE**: Normally no changes are needed in this file.


## Development and local testing

### With proxy to ODSS server

Just run in this directory:

```shell
$ gulp local-with-proxy
```

This creates a local configuration and index file;
runs a proxy to the actual ODSS server;
and then opens
[http://localhost:8001/src/app/local.index.html](http://localhost:8001/src/app/local.index.html)
in your browser.


### With "platim" server running locally

In this method a server for the backend endpoint is run locally and then the UI is open to
use that local endpoint.

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

### Testing the standalone distro

To test the standalone version created by `gulp`,
open [http://localhost:8001/dist/](http://localhost:8001/dist/).
