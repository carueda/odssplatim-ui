// temporary: a global object for debugging purposes in browser console
var gTW = {};

(function() {
  'use strict';

  angular.module('odssPlatimApp.timelineWidget', [])
    .factory('timelineWidget', timelineWidgetFactory);

  timelineWidgetFactory.$inject = ['$rootScope', '$timeout', 'cfg', 'tokens', 'vis', 'utl', 'olMap', 'platimModel'];

  function timelineWidgetFactory($rootScope, $timeout, cfg, tokens, vis, utl, olMap, platimModel) {

    var visRangeMin = moment(cfg.opts.visRange.min);
    var visRangeMax = moment(cfg.opts.visRange.max);

    var tokenForm = {
      showForm: function(args) {
        //console.log("showForm: args=", args);
        var token = args.tokenInfo;
        tokens.editToken(token, args.row);
      }
    };
    var container = document.getElementById("timelines");
    var logarea = angular.element(document.getElementById('logarea'));

    var copiedItem;  // for addition of new tokens

    // type for addition of new tokens
    var ttypeAddition = 'ttdeployment';

    var options = {
      'width':            '100%', // to be explicit (100% is the default)
      'orientation':      'top',
      'type':             'range',

      'editable':         {
        'remove':       false,
        'updateTime':   true,
        'add':          true,
        'updateGroup':  true
      },
      'showMajorLabels':  true,
      'showMinorLabels':  true,
      'showCustomTime':   false,

      'margin': {
        'axis': 10,
        'item': { horizontal: 0, vertical: 10 }
      }

      ,padding: 1  // must correspond to css: .vis.timeline .item

      ,showCurrentTime: true

      ,min: visRangeMin.toDate()
      ,max: visRangeMax.toDate()

      ,zoomMin: 1000 * 60 * 60                 // one hour in milliseconds
      //,zoomMax: 1000 * 60 * 60 * 24 * 31 * 3        // about three months in milliseconds

      ,stack: true    //  to be explicit (true is the default)

      ,order: null    //  to be explicit (no order is the default)

      //,clickToUse: true

      // snap to full hours, independent of the scale
      ,snap: function(date, scale, step) {
        var hour = 60 * 60 * 1000;
        return Math.round(date / hour) * hour;
      }

      // template initially used only to associate ID and then a listener for mouse-over events
      ,template: function (item) {
        return '<span id="token_' +item.id+ '">' + item.content + '</span>';
      }

      ,onAdd:       onAdd
      ,onUpdate:    onUpdate
      ,onMove:      onMove
      ,groupOrder:  groupOrder

    };

    if (cfg.opts.useSubgroups) {
      options.stack = false;
    }
    else {
      options.order = tokenOrdering;
    }

    if (options.showCustomTime) {
      // set the custom time to the current UTC time
      var offsetMins = moment().zone();
      setInterval(function() {
        var u = moment().add("m", offsetMins);
        timeline.setCustomTime(u.toDate());
        /*
         * NOTE: in timeline.js did adjustment for the tooltip:
         *  dom.customTime.title = moment().add("m", moment().zone()).format("[Current UTC time:] YYYY-MM-DD HH:mm:ss");
         */
      }, 2 * 1000);
    }

    var groups = new vis.DataSet();
    var items  = new vis.DataSet();

    var timeline = new vis.Timeline(container);
    timeline.setOptions(options);
    timeline.setGroups([]);
    timeline.setItems([]);
    // Note: we set the datasets themselves (groups, items) when redrawing.
    // This is mainly to improve rendering performance a bit.

    //console.log("CREATED timeline", timeline);
    gTW.timeline = timeline;
    gTW.groups = groups;
    gTW.items = items;

    var mouseListeners = {};

    addRangeChangedListener();
    addSelectListener();

    $rootScope.$on("tokenGeometryUpdated", function(e, token_id, geometry) {
      var item = items.get(token_id);
      //console.log("$on tokenGeometryUpdated: token_id=", token_id, "geometry=", geometry, "item=", item);
      // check there's actually an item by the given id:
      if (item) {
        item.geometry = geometry;
        items.update(item);
        updateStatusModified(item);
      }
    });

    (function() {
      // this block to react to mouse events on the geometries so the associated tokens
      // reflect those events, and to propagate via further events as needed
      var hoverClassName = 'direct_range_hover';
      $rootScope.$on("evtGeometryMouseEnter", function (e, info, jsEvent) {
        var item = items.get(info.token_id);
        //console.log("$on evtGeometryMouseEnter: token_id=", info.token_id, "item=", item);
        if (item) {
          updateClass(item, hoverClassName, true);
          // include the token object in the event info:
          info.token = item;
          $rootScope.$broadcast("evtTokenMouseEnter", info, jsEvent);
        }
      });
      $rootScope.$on("evtGeometryMouseLeave", function (e, info, jsEvent) {
        var item = items.get(info.token_id);
        //console.log("$on evtGeometryMouseLeave: token_id=", info.token_id, "item=", item);
        if (item) {
          updateClass(item, hoverClassName, false);
          $rootScope.$broadcast("evtTokenMouseLeave", {token: item}, jsEvent);
        }
      });
      $rootScope.$on("evtGeometryMouseClick", function (e, token_id, jsEvent) {
        var item = items.get(token_id);
        //console.log("$on evtGeometryMouseClick: token_id=", token_id, "item=", item);
        if (item) {
          timeline.setSelection(item.id);
          $rootScope.$broadcast("tokenSelection", [item]);
          logarea.html(utl.tablify([item]));
        }
      });

      // todo: this function could be used in other places
      function updateClass(token, className, include) {
        var classes = token.className.split(/\s+/);
        var alreadyIncluded = _.contains(classes, className);
        if (include) {
          if (!alreadyIncluded) {
            classes.push(className)
          }
        }
        else if (alreadyIncluded) {
          classes = _.reject(classes, function(c) { return c === className });
        }
        token.className = classes.join(' ');
        items.update(token);
      }
    })();

    return {
      reinit:                    reinit,
      getVisibleChartRange:      getVisibleChartRange,
      setVisibleChartRange:      setVisibleChartRange,
      adjustVisibleChartRange:   adjustVisibleChartRange,
      addGroup:                  addGroup,
      removeGroup:               removeGroup,
      addToken:                  addToken,
      removeToken:               removeToken,
      getDataSet:                getDataSet,
      getData:                   getData,
      getGroups:                 function() { return groups.get() },
      updateStatus:              updateStatus,
      updateStatusModified:      updateStatusModified,
      redraw:                    redraw,
      getSelection:              getSelection,
      clearSelection:            clearSelection,
      getItemById:               getItemById,
      setCopiedToken:            setCopiedToken

      ,setTokenTypeForAddition:   setTokenTypeForAddition
      ,updateItem:                updateItem
      ,updateStackSetting:        updateStackSetting

      ,getSaveInfo:               getSaveInfo
    };

    function getDataSet() {
      return items;
    }

    function getData() {
      return items.get();
    }

    function reinit(withHolidays) {
      timeline.setGroups([]);
      timeline.setItems([]);
      items.clear();
      groups.clear();

      setBackgroundItems(withHolidays);
      $timeout(setTokenMouseListeners);
    }

    function getSelection() {
      return timeline.getSelection();
    }

    function clearSelection() {
      timeline.setSelection([]);
      $rootScope.$broadcast("tokenSelection", []);
      logarea.html(utl.tablify([]));
    }

    function getItemById(itemId) {
      return items.get(itemId);
    }

    function setCopiedToken(item) {
      copiedItem = item;
    }

    function setTokenTypeForAddition(m) {
      ttypeAddition = m;
      copiedItem = undefined;  // disable copied item.
    }

    function updateItem(item, modified) {
      if (modified && item.status === "status_saved") {
        updateStatus(item, "status_modified");
      }
      else {
        updateStatus(item, item.status);
      }
    }

    function updateStackSetting(stack) {
      timeline.setOptions({
        stack: stack,

        order: stack ? tokenOrdering : null
      });
      _.each(items.get(), function(item) {
        if (isActualToken(item)) {
          if (stack) {
            item.subgroup = undefined;
          }
          else {
            item.subgroup = item.ttype;
          }
          updateItem(item);
        }
      });
    }

    function isActualToken(item) {
      return item !== undefined && (item.type === undefined || item.type !== "background");
    }

    /** Only to be applied when stacking (at least initially) */
    function tokenOrdering(a, b) {
      if (a.ttype === b.ttype) {
        // perhaps include some additional criteria like size of the token so
        // smaller tokens appear underneath bigger ones if overlapping
        return 0;
      }
      return a.ttype === "ttdeployment" ? -1 : +1;
    }

    function setBackgroundItems(holidays) {

      if (cfg.opts.showHolidays && holidays) {
        _.each(holidays, function (holiday) {
          var start = moment(holiday, 'YYYYMMDD');
          var end = start.clone().add(1, 'd');
          //console.log("holiday=", holiday, "start=", start.format(), "end=", end.format());
          items.add({
            id:        'holiday_' + holiday,
            content:   '',
            start:     start.toDate(),
            end:       end.toDate(),
            type:      'background',
            className: 'holiday'
          });
        });
      }

      if (cfg.opts.showWeekends) {
        var from  = visRangeMin.clone();
        var limit = visRangeMax.clone().add(1, 'd');
        // start from the closest saturday:
        var weekendStart = from.clone().add(6 - from.day(), 'd');
        while (weekendStart.isBefore(limit)) {
          var weekendId = 'weekend_' + weekendStart.format("YYYYMMDD");
          var weekendEnd = weekendStart.clone().add(2, 'd');
          items.add({
            id:        weekendId,
            content:   '',
            start:     weekendStart.toDate(),
            end:       weekendEnd.toDate(),
            type:      'background',
            className: 'weekend'
          });
          //console.log("weekend", weekendStart.format(), weekendEnd.format());
          weekendStart = weekendStart.clone().add(7, 'd');
        }
      }
    }

    function adjustVisibleChartRange() {
      timeline.fit();
//        var dr = timeline.getDataRange();
//        console.log("adjustVisibleChartRange: dr = " + JSON.stringify(dr));
//        timeline.setVisibleChartRange(dr.start, dr.end, true);
    }

    function setVisibleChartRange(startDate, endDate) {
      timeline.setWindow(startDate, endDate);
    }

    function getVisibleChartRange() {
      timeline.getWindow();
    }

    function addGroup(tml) {

      //console.log("addGroup: tml", tml);

      var platform_name = tml.platform_name;

      var elementId = "_platform_" +platform_name;

      var trackingDBID = tml.trackingDBID ? ("; trackingDBID: " +tml.trackingDBID) : "";
      var tooltip = platform_name + " (" +tml.typeName + trackingDBID+ ")";
      var content = "<div id='" +elementId+ "'";
      content += " tooltip='" +tooltip+ "'";
      content += ">" ;

      content += '<span';
      if (tml.color) {
        content += " style='color: " +tml.color+ "; font-size: x-small'";
      }
      content += ">" ;
      content += '<span class="fa fa-circle fa-fw"></span>';
      content += "</span> " ;

      content += platform_name ;

      content += "</div>";

      groups.add({
        id:         platform_name,
        content:    content,
        title:      tooltip,

        platform_name: platform_name,
        typeName:      tml.typeName
      });
      // note: refreshShading will set the CSS class.

      setTimeout(function() {
        var elm = angular.element(document.getElementById(elementId));
        elm.on("click", function() {
          logarea.html(utl.tablify(tml));
        });
      },2000);

      // mainly as a workaround for https://github.com/almende/vis/issues/745:
      // include 2 background items, one for each subgroup; so, the
      // subgroups are already known in case there's an update of the subgroup
      // for a regular item.
      // NOTE: do this regardless of cfg.opts.useSubgroups
      _.each(["ttdeployment", "ttmission"], function (ttype) {
        items.add({
          id:        platform_name + '_subgroup_' + ttype,
          group:     platform_name,
          subgroup:  ttype,
          content:   '',
          start:     utl.parseDate("1900-01-01"),
          end:       utl.parseDate("2100-01-01"),
          type:      'background',
          className: ttype + "FullBg"
        });
      });
    }

    function removeGroup(tml) {
      groups.remove(tml.platform_name);
    }

    /**
     * Adds a token retrieved from the database in the timeline.
     * The database token._id value is used as the item.id for timeline purposes.
     * @param token from database
     * @returns the item added to the timeline
     */
    function addToken(token) {
      var item = {
        'id':             token._id,
        'className':      token.status + " " + token.ttype,
        'content':        token.state,
        'start':          utl.parseDate(token.start),
        'end':            utl.parseDate(token.end),
        'group':          token.platform_name,
        //'title':          token.state + (token.description !== undefined ? " - " + token.description : ""),

        'token_id':       token._id,
        'platform_name':  token.platform_name,
        'state':          token.state,
        'description':    token.description,

        'status':         token.status,
        'ttype':          token.ttype

        ,'geometry':      token.geometry
      };

      if (cfg.opts.useSubgroups) {
        item.subgroup = token.ttype;
      }

      delete mouseListeners[item.id];
      $timeout(function() {setTokenMouseListener(item.id);});

      //console.log("addToken:", item.platform_name, item.content, item);
      items.add(item);
      return item;
    }

    function redraw() {
      timeline.setGroups(groups);
      timeline.setItems(items);
      refreshShading();
      timeline.redraw();
    }

    function refreshShading() {
      var ordered = groups.get({order: groupOrder});
      //console.log("refreshShading: ordered", ordered);
      _.each(ordered, function(grp, idx) {
        var className = "groupCol" + (idx % 2);
        groups.update({id: grp.id, className: className});
      });
    }

    function onAdd(item, callback) {
      //console.log("onAdd=", item);

      // "" by default to force missing info --skip save, etc
      item.state = item.content = "";

      // "empty" geometry:
      item.geometry = {
        type: "FeatureCollection",
        features: []
      };

      if (copiedItem) {
        pasteToken(item);
      }
      else {
        item.ttype = ttypeAddition;
        if (cfg.opts.useSubgroups) {
          item.subgroup = item.ttype;
        }
      }

      item.platform_name = item.group;
      item.status        = "status_new";
      item.className     = item.status + " " + item.ttype;

      platimModel.addToken(item);

      olMap.addGeometry(item);

      $timeout(function() {setTokenMouseListener(item.id);});

      callback(item);
    }

    /**
     * adjusts some item attributes according to copiedItem.
     */
    function pasteToken(item) {
      item.state   = copiedItem.state;
      item.content = copiedItem.content;
      item.ttype   = copiedItem.ttype;

      if (cfg.opts.useSubgroups) {
        item.subgroup = copiedItem.subgroup;
      }

      // take duration from copied item:
      var duration = moment.duration(moment(copiedItem.end).diff(copiedItem.start));

      var clickedStart = moment(item.start);
      var copiedStart = moment(copiedItem.start);

      // preserve start (year-month-day) date from clicked item
      // and take time from copied item:
      var startMoment = moment([
        clickedStart.year(), clickedStart.month(), clickedStart.date(),
        copiedStart.hour(), copiedStart.minute(), copiedStart.second(), copiedStart.millisecond()
      ]);
      item.start = startMoment.toDate();
      item.end   = startMoment.clone().add(duration).toDate();
    }

    function onUpdate(item, callback) {
      //console.log("onUpdate=", item);
      tokenForm.showForm({
        tokenInfo: item,
        row:       2  // TODO remove
      });
      callback(item);
    }

    function onMove(item, callback) {
      //console.log("onMove=", item);
      item.platform_name = item.group;
      updateStatusModified(item);
      callback(item);
    }

    function groupOrder(item1, item2) {
      if (item1.typeName < item2.typeName) {
        return -1;
      }
      if (item1.typeName > item2.typeName) {
        return +1;
      }
      if (item1.platform_name < item2.platform_name) {
        return -1;
      }
      if (item1.platform_name > item2.platform_name) {
        return +1;
      }
      return 0;
    }

    function updateStatus(tokenInfo, status) {
      tokenInfo.status = status;
      tokenInfo.className = status + " " + tokenInfo.ttype;
      if (cfg.opts.useSubgroups) {
        tokenInfo.subgroup = tokenInfo.ttype;
      }
      items.update(tokenInfo);
    }

    function updateStatusModified(tokenInfo) {
      if (tokenInfo.status === "status_new") {
        return;
      }
      else if (tokenInfo.status === "status_saved") {
        updateStatus(tokenInfo, "status_modified");
      }
      else if (tokenInfo.status.match(/.*_modified/)) {
        return;
      }
      else {
        updateStatus(tokenInfo, tokenInfo.status + "_modified");
      }
      //console.log("modified status set to: " + tokenInfo.status);
    }

    /**
     * Removes the token from the widget.
     * Assumes this is called for the currently selected item, so this
     * method ends by broadcasting a "tokenSelection" with empty array.
     * @param tokenInfo
     */
    function removeToken(tokenInfo) {
      //console.log("removeToken", tokenInfo);
      items.remove(tokenInfo.id);
      olMap.removeGeometry(tokenInfo.id);
      $rootScope.$broadcast("tokenSelection", []);
      logarea.html(utl.tablify([]));
    }

    /**
     * Reacts to rangechanged to set, if not already, the mouseenter/leave listeners
     * to the tokens that are visible.
     */
    function addRangeChangedListener() {
      var rangeChangedReactTime = 0;
      timeline.on('rangechanged', function(props) {
        rangeChangedReactTime = new Date().getTime() + 500;
      });
      setInterval(function () {
        if (rangeChangedReactTime > 0 && new Date().getTime() >= rangeChangedReactTime) {
          rangeChangedReactTime = 0;
          setTokenMouseListeners();
        }
      }, 1000);
    }

    function setTokenMouseListeners() {
      //console.log("setTokenMouseListeners");
      _.each(getVisibleTokenIds(), setTokenMouseListener);
    }

    // Sets the mouse listeners to the given token if not already
    function setTokenMouseListener(tokenId) {
      if (mouseListeners[tokenId]) {
        return;
      }
      //console.log('setTokenMouseListener tokenId=', tokenId, mouseListeners[tokenId]);
      var elementId = "token_" + tokenId;
      var elm = document.getElementById(elementId);

      // note: the following is to get the grand-parent, which corresponds to the whole extend of the item
      if (elm && elm.parentNode) {
        elm = elm.parentNode;
        if (elm && elm.parentNode) {
          elm = elm.parentNode;
        }
      }

      if (elm) {
        elm.addEventListener("mouseenter", mouseEnter, false);
        elm.addEventListener("mouseleave", mouseLeave, false);
        mouseListeners[tokenId] = true;
      }
      else {
        //console.warn("unexpected: cannot get element by id=", elementId);
      }

      function mouseEnter(event) {
        //console.log('mouseEnter tokenId=', tokenId);
        $rootScope.$broadcast("evtTokenMouseEnter", {token: items.get(tokenId)}, event);
      }

      function mouseLeave(event) {
        $rootScope.$broadcast("evtTokenMouseLeave", {token: items.get(tokenId)}, event);
      }
    }

    function getVisibleTokenIds() {
      return _.filter(timeline.getVisibleItems(), function(itemId) {
        return isActualToken(items.get(itemId));
      })
    }

    function addSelectListener() {
      var onSelect = function(properties) {
        //console.log("onSelect=", properties);
        var selected = [];
        if (properties.items && properties.items.length > 0) {
          selected = _.map(properties.items, function(itemId) { return items.get(itemId) });
        }
        $rootScope.$broadcast("tokenSelection", selected);
        logarea.html(utl.tablify(selected));
      };
      timeline.on('select', onSelect);
    }

    function getSaveInfo() {
      var toBeSaved = [];
      var skipped = 0;

      _.each(getData(), function(item, index) {
        if (isActualToken(item)) {
          //console.log("item=", item);
          if (isNewOrModifiedToken(item)) {
            if (isOkToBeSaved(item)) {
              toBeSaved.push({tokenInfo: item, index: index});
            }
            else {
              skipped += 1;
            }
          }
        }
      });

      return {toBeSaved: toBeSaved, skipped: skipped};

      function isNewOrModifiedToken(tokenInfo) {
        return tokenInfo.status !== undefined &&
          (tokenInfo.status === "status_new" ||
          tokenInfo.status.indexOf("_modified") >= 0);
      }

      function isOkToBeSaved(tokenInfo) {
        return tokenInfo.status !== undefined &&
          tokenInfo.state !== undefined &&
          tokenInfo.state.trim() !== "";
      }
    }

  }

})();
