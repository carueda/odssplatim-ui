## change log ##

- 2015-05-15:
  - internal: adding some unit tests; using karma/jasmine directly (not via gulp yet)
    $ npm install karma-jasmine karma-chrome-launcher
    $ karma init  # then adjust generated karma.config.js
    $ karma start

- 2015-05-10: (0.7.2)
  - \#133: "planning editor: Map sync issues when editor included directly within main ODSS"
    Some extra update logic to reduce the occurrence of this misbehavior.
    Enabled by default, and can be disabled by adding "?debug" and "skipMapSync" to the window location,
    for example:
       http://odss-test.shore.mbari.org/odss/?debug,skipMapSync
       http://odss-test.shore.mbari.org/odss/odssplatim-ui/dist/?debug,skipMapSync

- 2015-05-07: (0.7.2)
  - fix \#132: "planning: platform selection update reloads previous token data"
    - model refactor, and partial solution

- 2015-04-28: (branch: geom-ol3 - v.0.7.1)
  - refactor: all edit interaction handlers now in submodules in olext.js
  - trigger token modification also at the end of each modify interaction
  - save token geometry prior to edits to do update and notification if there's a change
  - allow to add geometry to brand new item in the timeline
  - delete item now also removes associated geometry
  - NOTE: loosely using "item" to refer to timeline elements, and "token" to corresponding
    elements for database purposes. However, olMap uses a mix of both terms, but uses the 'id'
    field for identification, which applies to both saved "tokens" and brand new "items."
  
  - Other: include refreshError callback in refresh sequence (immediate goal: re-enable refresh button in case of error).
    TODO: overall refresh sequence logic needs to be revisited for clean-up and eventual use of $q.

- 2015-04-22: (branch: geom-ol3 toward v.0.7.0)
  - trigger token modification at the end of edit action: drag, add.  TODO: modify.
  - tooltips
  - add delete interaction based on select interaction plus click listener
  - 'gulp dist' using ol-debug.js for now as ol.js triggers an initialization error (in MapCtrl it seems):
      TypeError: Cannot read property 'POLYGON' of undefined

  - 'gulp dist': include vendor.js with concatenated non-minified vendor scripts to facilitate debugging:
    manual adjustment in dist/index.html to include vendor.js and app.js

- 2015-04-21: (branch: geom-ol3)
  - improved geometry editing control via main radio-buttons: View, Move, Modify, Add.
  - initial mechanism to highlight geometry when mouse is over corresponding token (this requires
    the use of the template option to associate an id and a listener).
  - other: disable Refresh button when a refresh is in progress.

- 2015-04-20: (branch: geom-ol3)
  - preliminary drag interaction

- 2015-04-13: (branch: geom-ol3)
  - initial coordination between timeline and map for geometry editing, loading and saving
  - preliminary mechanism to add brand new geometry

- 2015-04-08: (branch: geom-ol3)
  - geometry editing testing with openlayers3
  - Enabling Google Map base layer based on http://openlayers.org/en/v3.0.0/examples/google-map.html
  
- 2015-04-08: (branch: geom-prep)
  - preliminary preparations for definition/editing of geometries associated with tokens
  
- 2015-04-07: (0.5.0)
  - internal: move platform, token, period services to their own modules
  - focus timeline upon click to save and refresh buttons
  - reduce period and token datepickers so they fit better in their modals
  - allow to update associated platform (== group) by dragging the token vertically
  - overall period handling improvements merged (https://github.com/carueda/odssplatim-ui/pull/2)
    and committed to SVN.
    In summary:
    - improved UI for periods
    - ability to update existing period, and delete any period (except the current "default" one)
    - reorganize buttons for the general interface
    - show period name in period selection button
  
- 2015-04-01: (0.5.0)
  - UI changes for periods: use dropdown list for selection of "default" period,
    editing, and addition.

- 2015-03-31: (0.5.0)
  - significant simplification of interaction with backend, including getting rid of "platform_id"
    (recall that "platform_name" is the actual the identification key for platforms.)
  - some other code clean-up
  
- 2015-03-27:
  - 0.5.0: Initial adjustments to have two token types: deployment and mission
    - new token attribute 'ttype' to indicate the specific type; this one to be captured in database
    - using visJs's timeline 'order' option to make the mission tokens appear underneath the
    deployment ones when they overlap.
    - optionally use 'subgroup' feature, along with the required stack=false.
    - when subgroup is used, it takes the same value as ttype
    - some keyboard "commands" (initially mainly for development purposes):
      - 'd' and 'm' to set the current type for addition of new tokens
      - 'D' and 'M' to set the type of the currently selected tokens
      - '$' to toggle the use of subgroup
    - so the idea for existing tokens is to use the usual stacking (ie., no subgroups) to more
      easily see the overlapping tokens to then manually set the ttype values as needed.
    - Not decided yet but perhaps eventually use the subgroup mechanism as the final one when all
      tokens are updated and when the linkage between a deployment token with its own missions is defined.
    - Note: stacking per subgroup (which would be convenient for usability) is not supported
      by visJs -- https://github.com/almende/vis/issues/620


- 2015-03-24: (0.4.2)
  - Fixed issue #130: copy-and-add token: the timeline widget is now focusable so it gets key events.
    The 'C' key copies the selected token, which is used when adding a new token via double-clicking;
    the date (year-month-day) is taken from the clicked location, but the hour and duration are taken
    from the copied token. The token's name (aka state) is also copied.
  - re focusable: the widget is focused on by default and automatically re-focused upon closing the
    token, platform, and period dialogs.
    The user can in general click the timeline area to make it the focused element.
  - token dialog: the name input field is now focused and selected when dialog is open.
    This was the behaviour before but it seems the new automatic focus of the timeline widget
    was interfering so a delay was added to the focus() utility and used.
  - snap to full hours, independent of the scale

- 2015-03-11: (0.4.1)
  - adjustments in gulpfile to create minified version for final inclusion in main ODSS app.
    The default gulp task prepares the dist/ directory to be used as base path for
    inclusion of widget in ODSS.
  
- 2015-03-10: (0.4.0)
  - Fixed issue #128: "style issues when integrating platform timeline widget directly"
    Basically, the fix relied on upgrading bootstrap to 3.x, then doing several adjustments in
    html templates and platim.css because the new version is not backwards compatible.
    TODO: check in changes for re-integration into main ODSS application.

- 2014-11-10: (0.3.2)
  - vis.js upgraded to 3.6.4, and with this, removed workaround to https://github.com/almende/vis/issues/320

- 2014-09-17: (0.3.1)
  - vis.js upgraded to 3.5.0, and with this, re-enable highlight of holidays and weekends.
  - some related parameters only captured in the config (later on, some of these can put 
    in the preferences, specially when user information is incorporated).
  - adjust status div style (now similar to that of fleet status) 
  
- 2014-09-15: (0.3.0)
  - (internal) change token-platform link to use platform name instead of platform mongo id
    (this supported by corresponding adjustments in "platim" backend service).
  
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
