'use strict';

(function() {

angular.module('odssPlatimApp.timelineWidget', [])
    .factory('timelineWidget', timelineWidgetFactory);

timelineWidgetFactory.$inject = ['service', 'vis'];

function timelineWidgetFactory(service, vis) {
    var tokenForm = {
        showForm: function(args) {
            console.log("showForm: args=", args);
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

    var data = [];
    //var groups = {};
    var groups = new vis.DataSet();

    var items = new vis.DataSet(data);
    var timeline = new vis.Timeline(container);
    timeline.setOptions(options);
    timeline.setGroups(groups);
    timeline.setItems(items);

    console.log("timeline", timeline);

    addSelectListener();

    return {
        reinit:                    reinit,
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
        data.lenght = 0;
        groups.clear();
    }

    function adjustVisibleChartRange() {
        timeline.setVisibleChartRangeAuto();
//        var dr = timeline.getDataRange();
//        console.log("adjustVisibleChartRange: dr = " + JSON.stringify(dr));
//        timeline.setVisibleChartRange(dr.start, dr.end, true);
    }

    function setVisibleChartRange(startDate, endDate) {
        timeline.setWindow(startDate, endDate);
    }

    function addGroup(tml) {

        //console.log("addGroup: tml", tml);

        var platform_id   = tml.platform_id;
        var platform_name = tml.platform_name;

        var trackingDBID = tml.trackingDBID ? ("; trackingDBID: " +tml.trackingDBID) : "";
        var tooltip = platform_name + " (" +tml.typeName + trackingDBID+ ")";
        var content = "<div id='" +platform_id+ "'";
        content += " tooltip='" +tooltip+ "'";
        if (tml.color) {
            content += " style='color: " +tml.color+ "'";
        }
        content += ">" + platform_name + "</div>";

        var className = "groupCol" + (groups.get().length % 2);
        groups.add({
            id:         platform_id,
            content:    content,
            className:  className,
            title:      tooltip,

            platform_name: platform_name
        });

        setTimeout(function() {
            var elm = angular.element(document.getElementById(platform_id));
            elm.on("click", function() {
                logarea.html(tablify(tml));
            });
        },2000);
    }

    function addToken(token) {

        //console.log("addToken: " + JSON.stringify(token));

        var body = {
            'id':             token._id,
            'className':      token.status + " " + "block-body",
            'content':        getTokenContent(token),
            'start':          parseDate(token.start),
            'end':            parseDate(token.end),
            'group':          token.platform_id,
            'title':          token.description,

            'token_id':       token._id,
            'platform_id':    token.platform_id,
            'platform_name':  token.platform_name,
            'state':          token.state,
            'description':    token.description,

            'status':         token.status
        };

        //console.log("addToken: body= " + JSON.stringify(body));

        //data.push(body);
        items.add(body)
    }

    function redraw() {
        //timeline.fit();
        timeline.redraw();
    }

    function onAdd(item, callback) {
        console.log("onAdd=", item);

        item.platform_id   = item.group;
        item.platform_name = groups.get(item.platform_id).platform_name;

        item.content       = "";  // to force missing info --skip save, etc
        item.state         = item.content;
        item.status        = "status_new";
        item.className     = item.status + " " + "block-body";

        console.log("ADD: item=", item);

        callback(item);
        //redraw();
    }

    function onUpdate(item, callback) {
        console.log("onUpdate=", item);
        //updateStatusModified(undefined, item);

        var row = 2; // TODO remove

        tokenForm.showForm({
            tokenInfo: item,
            row:       row
        });

        callback(item);
        //redraw();
    }

    function onMove(item, callback) {
        console.log("onMove=", item);
        updateStatusModified(undefined, item);
        callback(item);
        //redraw();
    }

    function updateStatus(index, tokenInfo, status) {
        tokenInfo.status = status;
        tokenInfo .className = "block-body"  + " " + status;

        //timeline.redraw();
    }

    function updateStatusModified(index, tokenInfo) {
        if (tokenInfo === undefined) {
            tokenInfo = data[index];
        }
        if (tokenInfo.status === "status_new") {
            return;
        }
        else if (tokenInfo.status === "status_saved") {
            updateStatus(index, tokenInfo, "status_modified");
        }
        else if (tokenInfo.status.match(/.*_modified/)) {
            return;
        }
        else {
            updateStatus(index, tokenInfo, tokenInfo.status + "_modified");
        }
        console.log("modified status set to: " + tokenInfo.status);
    }

    function removeToken(tokenInfo, index, row) {
        timeline.deleteItem(row);
        console.log("token at index " +index+ " removed");
    }

    function addSelectListener() {
        var onSelect = function(properties) {
            console.log("onSelect=", properties);
            if (properties.items && properties.items.length > 0) {
                var item = properties.items[0];
                logarea.html(tablify(item));
                console.log("SELECT: item=", item);
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
