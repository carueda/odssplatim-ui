function TimelineWidget(container, tokenForm) {

    var self = this;

    self.tokenForm = tokenForm;

    self.data = [];
    var data = self.data;

    self.groups = {};
    var groups = self.groups;

    var options = {
        'width':            '99%',
        'height':           'auto',
        'editable':         true,
        'style':            'box',
        'snapEvents':       false,
        'eventMargin':      8,
        'eventMarginAxis':  8,
        'showMajorLabels':  true,
        'showMinorLabels':  true,
        'axisOnTop':        true,
        'groupsChangeable': false,
        'showCustomTime':   false

//        // the following disables automatic scaling
//        ,'scale':            links.Timeline.StepDate.SCALE.WEEKDAY
//        ,'step':             1


        ,"min": new Date(2012, 0, 1)                // lower limit of visible range
        ,"max": new Date(2015, 11, 31)              // upper limit of visible range
//        ,"zoomMin": 1000 * 60 * 60 * 24             // one day in milliseconds
//        ,"zoomMax": 1000 * 60 * 60 * 24 * 31 * 3     // about three months in milliseconds


//        ,'cluster':          true
//        ,'groupsOnRight':    true
//        ,'showNavigation':   true
//        ,'showButtonNew':    true
    };

    if (options.showCustomTime) {
        // set the custom time to the current UTC time
        var offsetMins = moment().zone();
        setInterval(function() {
            var u = moment().add("m", offsetMins);
            self.timeline.setCustomTime(u.toDate());
            /*
             * NOTE: in timeline.js did adjustment for the tooltip:
             *  dom.customTime.title = moment().add("m", moment().zone()).format("[Current UTC time:] YYYY-MM-DD HH:mm:ss");
             */
        }, 2 * 1000);
    }

    this.timeline = new links.Timeline(container);

    addAddListener();
    addChangeListener();
    addEditListener();
    addSelectListener();


    function getSelectedRow() {
        var row = undefined;
        var sel = self.timeline.getSelection();
        if (sel.length) {
            if (sel[0].row != undefined) {
                row = sel[0].row;
            }
        }
        return row;
    }


    this.reinit = function(holidays) {
        self.timeline.deleteAllItems();
        data.lenght = 0;
        groups = {};
        if (self.dc !== undefined) {
            self.dc.destroy();
        }
        self.dc = new DateHighlighter(this.timeline, holidays)
    };


    this.draw = function() {
        self.timeline.draw(data, options);
    };


    this.adjustVisibleChartRange = function() {
        self.timeline.setVisibleChartRangeAuto();
//        var dr = self.timeline.getDataRange();
//        console.log("adjustVisibleChartRange: dr = " + JSON.stringify(dr));
//        self.timeline.setVisibleChartRange(dr.start, dr.end, true);
    };

    this.getVisibleChartRange = function() {
        return self.timeline.getVisibleChartRange();
    };

    this.setVisibleChartRange = function(startDate, endDate) {
        if (startDate === undefined || endDate === undefined) {
            self.timeline.setVisibleChartRangeAuto();
            self.redraw();
        }
        else {
            self.timeline.setVisibleChartRange(startDate, endDate, true);
        }
        updateDateHighlights();
    };

    this.addGroup = function(tml) {
        var platform_id = tml.platform_id;
        if (platform_id in groups) {
            console.log("addGroup: already added: " + platform_id);
            return;
        }

        groups[platform_id] = {
            'tml':    tml
        };

        pushBlockDummy(platform_id);

        setTimeout(function() {
            var elm = angular.element(document.getElementById(platform_id));
            elm.on("click", function() {
                platformClicked(platform_id);
            });
        },2000);
    };

    var logarea = angular.element(document.getElementById('logarea'));

    function platformClicked(platform_id) {
        logarea.html(tablify(groups[platform_id].tml));
    }

    this.addToken = function(token) {

        //console.log("addToken: " + JSON.stringify(token));

        var body = {
            'token_id':       token._id,
            'platform_id':    token.platform_id,
            'platform_name':  token.platform_name,
            'state':          token.state,
            'description':    token.description,
            'start':          parseDate(token.start),
            'end':            parseDate(token.end),
            'content':        getTokenContent(token),
            'group':          formattedGroup(token.platform_id),
            'className':      token.status + " " + "block-body",

            'status':         token.status
        };

        //console.log("addToken: body= " + JSON.stringify(body));

        data.push(body);
    };

    this.redraw = function() {
        self.timeline.redraw();
        updateDateHighlights();
    };

    var updateDateHighlights = function() {
        if (self.dc !== undefined) {
            self.dc.applyClassesToDates();
        }
    };


    function addAddListener() {
        var onAdd = function(event) {
            var row = getSelectedRow();
            var element = data[row];

            console.log("ADD: row=" +row+ " element=" +JSON.stringify(element));

            /*
             * too bad groups in links's timeline cannot be associated with
             * properties or other elements in a flexible way; have to resort
             * to capture elements in the html snippet.
             */
            element.platform_id   = element.group.match(/id='(.*)'/)[1];
            element.platform_name = strip(element.group);

            element.content       = "";  // to force missing info --skip save, etc
            element.state         = element.content;
            element.status        = "status_new";
            element.className     = element.status + " " + "block-body";

            console.log("ADD: element=" +JSON.stringify(element));

            self.redraw();
        };

        links.events.addListener(self.timeline, 'add', onAdd);
    }

    function addChangeListener() {

        var onChange = function(event) {
            var originalDiff, newDiff, diffDiff, delta;

            var row = getSelectedRow();
            var element = data[row];
            console.log("data[row] = " + JSON.stringify(element));
            if (element == undefined) {
                return;
            }

            var index = row;
            var tokenInfo = element;

            console.log("tokenInfo: " + JSON.stringify(tokenInfo));

            var bodyBlock  = data[index];

            //console.log("bodyBlock:  " + JSON.stringify(bodyBlock));

            tokenInfo.start = bodyBlock.start;
            tokenInfo.end   = bodyBlock.end;

            self.updateStatusModified(index, tokenInfo);

            self.redraw();
        };

        links.events.addListener(self.timeline, 'change', onChange);
    }

    this.updateStatus = function(index, tokenInfo, status) {
        tokenInfo.status = status;

        var bodyBlock  = data[index];

        bodyBlock .className = "block-body"  + " " + status;

        self.timeline.redraw();
    };

    self.updateStatusModified = function(index, tokenInfo) {
        if (tokenInfo === undefined) {
            tokenInfo = data[index];
        }
        if (tokenInfo.status === "status_new") {
            return;
        }
        else if (tokenInfo.status === "status_saved") {
            self.updateStatus(index, tokenInfo, "status_modified");
        }
        else if (tokenInfo.status.match(/.*_modified/)) {
            return;
        }
        else {
            self.updateStatus(index, tokenInfo, tokenInfo.status + "_modified");
        }
        console.log("modified status set to: " + tokenInfo.status);
    };

    this.removeToken = function(tokenInfo, index, row) {
        self.timeline.deleteItem(row);
        console.log("token at index " +index+ " removed");
    };


    function addEditListener() {
        var onEdit = function(event) {
            var row = getSelectedRow();
            var element = data[row];
            console.log("EDIT: " + row + ": " + JSON.stringify(element));

            self.tokenForm.showForm({
                tokenInfo: element,
                row:       row
            });
        };

        links.events.addListener(self.timeline, 'edit', onEdit);
    }


    function addSelectListener() {
        var onSelect = function(event) {
            var row = getSelectedRow();
            if (row) {
                var element = data[row];

                logarea.html(tablify(element));

                console.log("SELECT: row=" + row + ": " + JSON.stringify(element));
                self.timeline.selectItem(row);
            }
            else {
                logarea.html("");
            }
        };

        links.events.addListener(self.timeline, 'select', onSelect);
    }

    function formattedGroup(platform_id) {
        platform_id = strip(platform_id);
        var platform_name = groups[platform_id].tml.platform_name;

        // no tooltip for now
        return "<div id='" +platform_id+ "'>" + platform_name + "</div>";

//        var tooltip = tablify(groups[platform_id].tml);
//        return "<div title='" +tooltip+ "'"
//             + " id='" +platform_id+ "'>" + platform_name + "</div>";
    }

    function pushBlockDummy(platform_id) {
        var body = {
            'group': formattedGroup(platform_id)
        };
        data.push(body);
    }

    function getTokenContent(token) {

        return token.state;

//        var tooltip = tablify(token);
//        //console.log("tootip = " + tooltip);
//        var content = "<div title='" +tooltip+ "'>" +token.state+ "</div>";
//        return content;
    }

}


/*
 * Adapted from example by https://github.com/auwnch:
 *  https://github.com/almende/chap-links-library/issues/132#issuecomment-25446810
 */
function DateHighlighter(timeline, holidays) {

    // JSON array of dates to apply a class to (such as shading or highlights).
    // The dates are strings in the format "yyyymmdd" (note - datepicker js equivalent: yymmdd).
    // Special case is "weekends" to trigger a class for all weekends.
    // To avoid conflicts, the order is important - the last one found found wins.
    var classesForDates = [
        {
            "date": "weekends",
            "divClass": "timeline-axis-grid-weekends"
        }
    ];

    //console.log("DateHighlighter: holidays=" + holidays);
    if (holidays !== undefined) {
        for (var ii = 0, ll = holidays.length; ii < ll; ii++) {
            classesForDates.push({
                "date":     holidays[ii],
                "divClass": "timeline-axis-grid-holiday"
            });
        }
    }

    function stringFromDate(date) {
        var mm = date.getMonth() + 1;
        var dd = date.getDate();
        return "" + date.getFullYear() + zeroPad(mm) + zeroPad(dd);
    }
    function zeroPad(num) {
        return ("00" + num).substring(("" + num).length);
    }
    // Create a map of dates for quick reference:
    var dateMap = {};
    var weekends = "";
    function dateMapOfClasses() {
        for (var j = 0; j < classesForDates.length; j++) {
            if (classesForDates[j].date == "weekends") {
                weekends = classesForDates[j].divClass;
            }
            else {
                dateMap[classesForDates[j].date] = classesForDates[j].divClass;
            }
        }
    }
    dateMapOfClasses();

    // External function to iterate through dates on the axis applying classes.
    // Because the width of the date can vary depending on zoom, the axis reuse
    // (as with labels, etc in ...StartOverwriting, etc) cannot be leveraged.
    // So each invocation clears and redraws the supplied range of dates.
    this.applyClassesToDates = function() {
        var start = timeline.screenToTime(0);
        var end = timeline.screenToTime(timeline.size.contentWidth);
        var axis = timeline.dom.axis;
        if (axis.classBlocks) {
            // Cleanup previous
            for (var num = 0; num < axis.classBlocks.length; num++) {
                var classBlock = axis.classBlocks[num];
                axis.frame.removeChild(classBlock);
            }
        }
        axis.classBlocks = [];
        if (isDayRange()) {
            // Get the start date and make it the start of the day
            var curDate = new Date(start.valueOf());
            curDate.setHours(0, 0, 0, 0);
            var cur = curDate.valueOf();
            var stop = end.valueOf();
            var curDay = start.getDay();
            var sat = 0;
            if (weekends != "") {
                sat = cur;
                // Advance sat to the first Saturday viewable
                if (curDay < 6) {
                    sat += (6 - curDay) * (1000 * 60 * 60 * 24);
                }
            }
            // Calculate the screen size of a day
            var x = Math.abs((stop - start.valueOf()) / (1000 * 60 * 60 * 24));
            var x2 = Math.round(timeline.size.contentWidth / x);
            var limit = 0;
            // Daily iteration
            while (limit < 1000 && cur < stop) {
                curDate = new Date(cur);
                var dateString = stringFromDate(curDate);
                if (cur == sat) {
                    x = timeline.timeToScreen(curDate);
                    repaintAxisDate(x, (x2 * 2), weekends);
                    // Jump to the next Saturday
                    sat += 7 * (1000 * 60 * 60 * 24);
                    limit++;
                }
                // Individual date can override weekends
                if (dateMap[dateString]) {
                    x = timeline.timeToScreen(curDate);
                    repaintAxisDate(x, x2, dateMap[dateString]);
                    limit++;
                }
                // Add to cur for the next day
                cur += 1 * (1000 * 60 * 60 * 24);
            }
        }
    };

    function repaintAxisDate(x, x2, className) {
        var sizes = timeline.size,
            frame = timeline.dom.axis.frame,
            classBlocks = timeline.dom.axis.classBlocks,
            block;
        // create a vertical block
        block = document.createElement("DIV");
        block.className = className;
        block.style.position = "absolute";
        block.style.width = x2 + "px";
        // add it to the frame and reference array
        frame.appendChild(block);
        classBlocks.push(block);
        // position it
        block.style.top = (timeline.options.axisOnTop ? sizes.axis.height : 0) + "px";
        block.style.height = sizes.contentHeight + "px";
        block.style.left = (x - sizes.axis.lineMinorWidth/2) + "px";
    }

    function isDayRange() {
        switch (timeline.step.scale) {
            case links.Timeline.StepDate.SCALE.WEEKDAY:
            case links.Timeline.StepDate.SCALE.DAY:
                return true;
            default:
                return false;
        }
    }

    links.events.addListener(timeline, 'rangechange', this.applyClassesToDates);

    this.destroy = function() {
        links.events.removeListener(timeline, 'rangechange', this.applyClassesToDates);
    };
}

