// temporary: a global object for debugging purposes in browser console
var gTW = {};

(function() {
'use strict';

angular.module('odssPlatimApp.timelineWidget', [])
    .factory('timelineWidget', timelineWidgetFactory);

timelineWidgetFactory.$inject = ['$rootScope', 'cfg', 'tokens', 'vis', 'utl', 'olMap'];

function timelineWidgetFactory($rootScope, cfg, tokens, vis, utl, olMap) {

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

        //,padding: 2  // must correspond to css: .vis.timeline .item

        ,showCurrentTime: false   // don't need this for the time being

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

    return {
        reinit:                    reinit,
        getVisibleChartRange:      getVisibleChartRange,
        setVisibleChartRange:      setVisibleChartRange,
        adjustVisibleChartRange:   adjustVisibleChartRange,
        addGroup:                  addGroup,
        addToken:                  addToken,
        removeToken:               removeToken,
        getDataSet:                getDataSet,
        getData:                   getData,
        updateStatus:              updateStatus,
        updateStatusModified:      updateStatusModified,
        redraw:                    redraw,
        getSelection:              getSelection,
        getItemById:               getItemById,
        setCopiedToken:            setCopiedToken

        ,setTokenTypeForAddition:   setTokenTypeForAddition
        ,updateItem:                updateItem
        ,updateStackSetting:        updateStackSetting
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
    }

    function getSelection() {
        return timeline.getSelection();
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
        _.each(items.get(), function(tokenInfo) {
            var isActualToken = tokenInfo.type === undefined || tokenInfo.type !== "background";
            if (isActualToken) {
                if (stack) {
                    tokenInfo.subgroup = undefined;
                }
                else {
                    tokenInfo.subgroup = tokenInfo.ttype;
                }
                updateItem(tokenInfo);
            }
        });
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

    /**
     * Adds a token retrieved from the database in the timeline.
     * The database token._id value is used as the item.id for timeline purposes.
     * @param token from database
     * @returns the item added to the timeline
     */
    function addToken(token) {
        var tooltip = token.state;
        if (token.description !== undefined) {
            tooltip += " - " + token.description;
        }

        var item = {
            'id':             token._id,
            'className':      token.status + " " + token.ttype,
            'content':        getTokenContent(token),
            'start':          utl.parseDate(token.start),
            'end':            utl.parseDate(token.end),
            'group':          token.platform_name,
            'title':          tooltip,

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
        //console.log("addToken: item", item);
        items.add(item);
        setTokenMouseListener(item.id);
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

        olMap.addGeometry(item.id, item.geometry);

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

    function setTokenMouseListener(tokenId) {
        //console.log("setTokenMouseListener tokenId=", tokenId);
        setTimeout(function() {
            //console.log("setTokenMouseListener tokenId=", tokenId);
            var elementId = "token_" + tokenId;
            var elm = document.getElementById(elementId);

            // note: the following is to get the grand-parent, which corresponds to
            // to whole extend of the item
            if (elm && elm.parentNode) {
                elm = elm.parentNode;
                if (elm && elm.parentNode) {
                    elm = elm.parentNode;
                }
            }

            if (elm) {
                elm.addEventListener("mouseenter", function(event) {
                    $rootScope.$broadcast("tokenMouseOver", tokenId, true);
                }, false);

                elm.addEventListener("mouseleave", function(event) {
                    $rootScope.$broadcast("tokenMouseOver", tokenId, false);
                }, false);
            }
        },2000);
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

    function getTokenContent(token) {

        return token.state;

//        var tooltip = utl.tablify(token);
//        //console.log("tootip = " + tooltip);
//        var content = "<div title='" +tooltip+ "'>" +token.state+ "</div>";
//        return content;
    }

}

})();
