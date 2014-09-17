(function() {
'use strict';

angular.module('odssPlatimApp.main', [])
    .controller('MainCtrl', MainCtrl) ;

MainCtrl.$inject = ['$scope', '$window', 'platimModel', 'service', 'timelineWidget', 'status'];

function MainCtrl($scope, $window, platimModel, service, timelineWidget, status) {
    $scope.debug = $window.location.toString().match(/.*\?debug/)
        ? { collapsed: true, model: platimModel }
        : undefined;

    $scope.cfg = odssplatimConfig;

    $scope.activities = status.activities;
    $scope.errors     = status.errors;

    function updateLastUpdated() {
        var dur = moment.duration($scope.lastUpdated.on.diff(moment()));
        $scope.lastUpdated.durHumanized = dur.humanize(true);
    }
    var gotGeneralInfo = function(info) {
        $scope.lastUpdated = undefined;
        //console.log("gotGeneralInfo: " + JSON.stringify(info));
        if (info && info.lastUpdated) {
            $scope.lastUpdated = angular.copy(info.lastUpdated);
            $scope.lastUpdated.on = moment(info.lastUpdated.on);
            $scope.lastUpdated.onLocal = $scope.lastUpdated.on.local().format('llll');
            updateLastUpdated();
        }
    };
    setTimeout(function refreshLastUpdated() {
        if ($scope.lastUpdated !== undefined) {
            updateLastUpdated();
            $scope.$digest();
        }
        setTimeout(refreshLastUpdated, 5 * 1000);
    }, 0);

    var gotPlatforms = function(platforms) {
        //console.log("gotPlatforms: ", platforms);
    };

    var gotHolidays = function(res) {
        //console.log("gotHolidays: ", res);
    };

    var gotTimelines = function(timelines) {
        //console.log("gotTimelines: ", timelines);
    };

    var gotTokens = function(tml, tokens) {
    };

    $scope.periods = {};

    var gotPeriods = function(periods) {
        //console.log("gotPeriods:", periods);
    };

    var gotDefaultPeriodId = function() {
        setVisibleChartRange();
        timelineWidget.redraw();
    };

    function setVisibleChartRange() {
        var selectedPeriod = platimModel.getSelectedPeriod();
        if (selectedPeriod !== undefined
            && selectedPeriod.start !== undefined
            && selectedPeriod.end !== undefined
            ) {
            var start = selectedPeriod.start;
            var end   = selectedPeriod.end;
            timelineWidget.setVisibleChartRange(moment(start).add("d", -1),
                                                moment(end).  add("d", +1));
        }
        else {
            timelineWidget.adjustVisibleChartRange();
        }
        timelineWidget.redraw();
    }

    function pstatus(msg) {
        var actId = status.activities.add(msg);
        setTimeout(function() {
            status.activities.remove(actId);
            $scope.$digest();
        }, 3000);
    }

    function getSaveInfo() {
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

        var skipped = 0;
        var toBeSaved = [];
        _.each(timelineWidget.getData(), function(tokenInfo, index) {
            if (isNewOrModifiedToken(tokenInfo)) {
                if (isOkToBeSaved(tokenInfo)) {
                    toBeSaved.push({tokenInfo: tokenInfo, index: index});
                }
                else {
                    skipped += 1;
                }
            }
        });
        return {toBeSaved: toBeSaved, skipped: skipped};
    }

    /**
     * Triggers the refresh of the model.
     */
    $scope.refresh = function() {
        var toBeSavedInfo = getSaveInfo();
        var unsaved = toBeSavedInfo.toBeSaved;
        if (unsaved.length > 0) {
            console.log('unsaved', unsaved);
            if (!$window.confirm(
                'There are unsaved edits that will be lost with the refresh.\n\n' +
                'Are you sure you want to proceed with the refresh?')) {
                return;
            }
        }
        status.errors.removeAll();
        angular.element(document.getElementById('logarea')).html("");
        //console.log("refreshing...");
        timelineWidget.reinit();
        service.refresh({
            gotGeneralInfo:       gotGeneralInfo,
            gotPlatforms:         gotPlatforms,
            gotSelectedPlatforms: function(tmls) {},
            gotTimelines:         gotTimelines,
            gotTokens:            gotTokens,
            gotPeriods:           gotPeriods,
            gotDefaultPeriodId:   gotDefaultPeriodId,
            gotHolidays:          gotHolidays,
            refreshComplete:      refreshComplete
        });
    };

    /**
     * Inserts a timeline (a platform and its tokens) in the widget.
     * @param tml
     */
    var insertTimeline = function(tml) {
        timelineWidget.addGroup(tml);
        _.each(tml.tokens, function(token) {
            timelineWidget.addToken(token);
        });
    };

    /**
     * Called to reflect the selection options in the widget.
     * @param doSave the platform options are saved if this is undefined or true
     */
    var platformOptionsUpdated = function(doSave) {
        var actId = status.activities.add("updating display...");
        setTimeout(function() {
            var selectedPlatforms = platimModel.getSelectedPlatforms();
            timelineWidget.reinit(platimModel.holidays);
            //console.log("selectedPlatforms", selectedPlatforms);
            _.each(selectedPlatforms, insertTimeline);
            timelineWidget.redraw();
            status.activities.remove(actId);
            $scope.$digest();
            if (doSave === undefined || doSave) {
                service.savePlatformOptions(selectedPlatforms, function () {
                    //$scope.$digest();
                });
            }
        }, 10);
    };

    function refreshComplete() {
        //console.log("refreshing... done.");
        platformOptionsUpdated(false);
    }

    $scope.$on('platformOptionsUpdated', platformOptionsUpdated);

    $scope.$on('periodSelected', setVisibleChartRange);

    $scope.$on('tokenDeleted', function() {
        console.log("reacting to tokenDeleted");
        service.getGeneralInfo({gotGeneralInfo: gotGeneralInfo});
    });

    /**
     * Saves the modified tokens in the timeline.
     */
    $scope.save = function() {

        status.errors.removeAll();

        var saveInfo = getSaveInfo();
        var toBeSaved = saveInfo.toBeSaved;

        var msg, skippedMsg = saveInfo.skipped > 0
                       ? " (" +saveInfo.skipped+ " skipped because of missing info)"
                       : "";
        if (toBeSaved.length > 0) {
            msg = "Saving " +toBeSaved.length+ " token(s)" + skippedMsg;
        }
        else {
            msg = "No tokens need to be saved" + skippedMsg;
        }
        console.log(msg);
        pstatus(msg);

        /**
         * Saves the token at the given index ii in the toBeSaved list,
         * and then recursively calls doList(ii + 1).
         * @param ii  Index in toBeSaved
         */
        function doList(ii) {
            if (ii >= toBeSaved.length) {
                // done.  Refresh just general info:
                service.getGeneralInfo({gotGeneralInfo: gotGeneralInfo});
                return;
            }
            var elm = toBeSaved[ii];
            var tokenInfo = elm.tokenInfo;
            var index     = elm.index;
            service.saveToken(tokenInfo, index, function(index, tokenInfo) {
                if (odssplatimConfig.useVis)
                    timelineWidget.updateStatus(tokenInfo, "status_saved");
                else
                    timelineWidget.updateStatus(index, tokenInfo, "status_saved");
                doList(ii + 1);
            });
        }
        doList(0);
    };

    // initial refresh
    $scope.refresh();
}

})();
