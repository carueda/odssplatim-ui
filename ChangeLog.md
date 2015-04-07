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
