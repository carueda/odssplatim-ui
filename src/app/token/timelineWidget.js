'use strict';

(function() {

angular.module('odssPlatimApp.timelineWidget', [])
    .factory('timelineWidget', timelineWidgetFactory);

timelineWidgetFactory.$inject = ['service'];

function timelineWidgetFactory(service) {
    var tokenForm = {
        showForm: function(args) {
            console.log("showForm: args=", args);
            var token = args.tokenInfo;
            service.editToken(token, args.row);
        }
    };
    var elm = document.getElementById("timelines");
    var timelineWidget = new TimelineWidget(elm, tokenForm);
    timelineWidget.draw();

    return {
        reinit:                    timelineWidget.reinit,
        setVisibleChartRange:      timelineWidget.setVisibleChartRange,
        adjustVisibleChartRange:   timelineWidget.adjustVisibleChartRange,
        addGroup:                  timelineWidget.addGroup,
        addToken:                  timelineWidget.addToken,
        removeToken:               timelineWidget.removeToken,
        data:                      timelineWidget.data,
        updateStatus:              timelineWidget.updateStatus,
        updateStatusModified:      timelineWidget.updateStatusModified,
        redraw:                    timelineWidget.redraw
    };
}

})();
