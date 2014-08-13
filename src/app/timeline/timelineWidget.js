// temporary: a global object for debugging purposes in browser console
var gTW = {};

(function() {
'use strict';

angular.module('odssPlatimApp.timelineWidget', [])
    .factory('timelineWidget', timelineWidgetFactory);

timelineWidgetFactory.$inject = ['service', 'vis'];

function timelineWidgetFactory(service, vis) {
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

        'min': new Date(2012, 0, 1),                  // lower limit of visible range
        'max': new Date(2015, 11, 31)                 // upper limit of visible range
//        ,"zoomMin": 1000 * 60 * 60 * 24             // one day in milliseconds
//        ,"zoomMax": 1000 * 60 * 60 * 24 * 31 * 3    // about three months in milliseconds

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

    var groups = new vis.DataSet();
    var items  = new vis.DataSet();

    var timeline = new vis.Timeline(container);
    timeline.setOptions(options);
    timeline.setGroups(groups);
    timeline.setItems(items);

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

    function getSelectedRow() {
        var row = undefined;
        var sel = timeline.getSelection();
        if (sel.length) {
            if (sel[0].row != undefined) {
                row = sel[0].row;
            }
        }
        return row;
    }


    function reinit(holidays) {
        items.clear();
        groups.clear();
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
            content += " style='color: " +tml.color+ "; font-size: smaller'";
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

        setTimeout(function() {
            var elm = angular.element(document.getElementById(platform_id));
            elm.on("click", function() {
                logarea.html(tablify(tml));
            });
        },2000);
    }

    function addToken(token) {
        var body = {
            'id':             token._id,
            'className':      token.status + " " + "block-body",
            'content':        getTokenContent(token),
            'start':          parseDate(token.start),
            'end':            parseDate(token.end),
            'group':          token.platform_id,
            'title':          token.description !== undefined ? token.description : token.state,

            'token_id':       token._id,
            'platform_id':    token.platform_id,
            'platform_name':  token.platform_name,
            'state':          token.state,
            'description':    token.description,

            'status':         token.status
        };
        //console.log("addToken: body", body);
        items.add(body)
    }

    function redraw() {
        refreshShading();
        timeline.redraw();
    }

    function refreshShading() {
        var gs = timeline.itemSet.getGroups().get({order: groupOrder});
        //console.log("refreshShading: gs", gs);
        _.each(gs, function(grp, idx) {
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
        items.update(tokenInfo)
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
