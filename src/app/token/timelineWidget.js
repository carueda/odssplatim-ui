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
            console.log("showForm: token=", token);
            service.editToken(token, args.row);
        }
    };
    var elm = document.getElementById("timelines");
    var timelineWidget = new TimelineWidget(elm, tokenForm);
    timelineWidget.draw();

    return timelineWidget;
}

})();
