// temporary: a global object for debugging purposes in browser console
var gTW = {};

(function() {
'use strict';

angular.module('odssPlatimApp.timelineWidget', [])
    .factory('timelineWidget', timelineWidgetFactory);

timelineWidgetFactory.$inject = ['cfg', 'service', 'vis'];

function timelineWidgetFactory(cfg, service, vis) {

    var visRangeMin = moment(cfg.opts.visRange.min);
    var visRangeMax = moment(cfg.opts.visRange.max);

    var tokenForm = {
        showForm: function(args) {
            //console.log("showForm: args=", args);
            var token = args.tokenInfo;
            service.editToken(token, args.row);
        }
    };
    var container = document.getElementById("timelines");
    var logarea = angular.element(document.getElementById('logarea'));

    var options = {
        'width':            '99%',
        'orientation':      'top',
        'type':             'range',

        'editable':         {
            'remove':       false,
            'updateTime':   true,
            'add':          true,
            'updateGroup':  false
        },
        'showMajorLabels':  true,
        'showMinorLabels':  true,
        'showCustomTime':   false,

        'margin': {
            'item': { horizontal: 0 }
        }

        ,min: visRangeMin.toDate()
        ,max: visRangeMax.toDate()

        ,zoomMin: 1000 * 60 * 60                 // one hour in milliseconds
        //,zoomMax: 1000 * 60 * 60 * 24 * 31 * 3        // about three months in milliseconds

        ,onAdd:       onAdd
        ,onUpdate:    onUpdate
        ,onMove:      onMove
        ,groupOrder:  groupOrder

    };

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

    var holidays = undefined;
    var backgroundItemsSet = false;

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
        redraw:                    redraw
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

        holidays = withHolidays;  // see setBackgroundItems
        backgroundItemsSet = false;
    }

    // TODO remove group parameter and call this method in reinit when
    // https://github.com/almende/vis/issues/320 is fixed.
    // Workaround is to "wait" for the first group to then use it for
    // the association to the background items.
    function setBackgroundItems(group) {
        //console.log("setBackgroundItems: groupName=", groupName);

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
                    className: 'holiday',
                    group:     group    // to be removed
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
                    className: 'weekend',
                    group:     group    // to be removed
                });
                //console.log("weekend", weekendStart.format(), weekendEnd.format());
                weekendStart = weekendStart.clone().add(7, 'd');
            }
        }

        backgroundItemsSet = true;
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

        var platform_id   = tml.platform_id;
        var platform_name = tml.platform_name;

        var trackingDBID = tml.trackingDBID ? ("; trackingDBID: " +tml.trackingDBID) : "";
        var tooltip = platform_name + " (" +tml.typeName + trackingDBID+ ")";
        var content = "<div id='" +platform_id+ "'";
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
            id:         platform_id,
            content:    content,
            title:      tooltip,

            platform_name: platform_name,
            typeName:      tml.typeName
        });
        // note: refreshShading will set the CSS class.

        if (!backgroundItemsSet) {
            setBackgroundItems(platform_id);
        }

        setTimeout(function() {
            var elm = angular.element(document.getElementById(platform_id));
            elm.on("click", function() {
                logarea.html(tablify(tml));
            });
        },2000);
    }

    function addToken(token) {
        var tooltip = token.state;
        if (token.description !== undefined) {
            tooltip += " - " + token.description;
        }

        var body = {
            'id':             token._id,
            'className':      token.status + " " + "block-body",
            'content':        getTokenContent(token),
            'start':          parseDate(token.start),
            'end':            parseDate(token.end),
            'group':          token.platform_id,
            'title':          tooltip,

            'token_id':       token._id,
            'platform_id':    token.platform_id,
            'platform_name':  token.platform_name,
            'state':          token.state,
            'description':    token.description,

            'status':         token.status
        };
        //console.log("addToken: body", body);
        items.add(body);
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

        item.platform_id   = item.group;
        item.platform_name = groups.get(item.platform_id).platform_name;

        item.content       = "";  // to force missing info --skip save, etc
        item.state         = item.content;
        item.status        = "status_new";
        item.className     = item.status + " " + "block-body";

        callback(item);
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
        tokenInfo.className = "block-body"  + " " + status;
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
        console.log("modified status set to: " + tokenInfo.status);
    }

    function removeToken(tokenInfo) {
        console.log("removeToken", tokenInfo);
        items.remove(tokenInfo.id);
    }

    function addSelectListener() {
        var onSelect = function(properties) {
            //console.log("onSelect=", properties);
            if (properties.items && properties.items.length > 0) {
                var selected = _.map(properties.items, function(itemId) { return items.get(itemId) });
                logarea.html(tablify(selected));
                //console.log("SELECT: item=", item);
            }
            else {
                logarea.html("");
            }
        };
        timeline.on('select', onSelect);
    }

    function getTokenContent(token) {

        return token.state;

//        var tooltip = tablify(token);
//        //console.log("tootip = " + tooltip);
//        var content = "<div title='" +tooltip+ "'>" +token.state+ "</div>";
//        return content;
    }

}

})();
