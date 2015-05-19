(function() {
'use strict';

angular.module('odssPlatimApp.main', ['odssPlatimApp.main.directives', 'odssPlatimApp.main.filters'])

    .controller('MainCtrl', MainCtrl) ;

MainCtrl.$inject = ['$scope', '$timeout', '$interval',
  'cfg', 'platimModel', 'periods', 'platforms', 'tokens', 'timelineWidget', 'status', 'utl', 'focus', 'olMap'];

function MainCtrl($scope, $timeout, $interval,
                  cfg, platimModel, periods, platforms, tokens, timelineWidget, status, utl, focus, olMap) {
    $scope.debug = utl.getDebug();

    $scope.cfg = cfg;

    $scope.messages   = status.messages;
    $scope.activities = status.activities;
    $scope.errors     = status.errors;

    $scope.isRefreshing = false;

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
    var updateRefresher = $interval(function() {
      if ($scope.lastUpdated !== undefined) {
        updateLastUpdated();
      }
    }, 15 * 1000);
    $scope.$on('$destroy', function() { $interval.cancel(updateRefresher); });

    $scope.periods = {};

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
        $timeout(function() { status.activities.remove(actId); }, 3000);
    }

    /**
     * Triggers the refresh of the model, first confirming with the user
     * in case of any unsaved changes.
     */
    $scope.refresh = function() {
        focus('focusTimeline');
        var toBeSavedInfo = timelineWidget.getSaveInfo();
        var unsaved = toBeSavedInfo.toBeSaved;
        if (unsaved.length > 0) {
            utl.confirm({
                title:     "Confirm refresh",
                message:   'There are unsaved edits that will be lost with the refresh.<br/><br/>' +
                           'Are you sure you want to proceed?',
                ok:        doRefresh
            });
        }
        else {
            doRefresh();
        }
    };

    /**
     * Starts the full refresh of the model (except options)
     */
    function doRefresh() {
        status.errors.removeAll();
        angular.element(document.getElementById('logarea')).html("");
        //console.log("refreshing...");
        $scope.isRefreshing = true;
        $scope.$broadcast("refreshStarting");
        timelineWidget.reinit();

        // callback functions for refresh sequence
        var fns = {
            gotGeneralInfo:       gotGeneralInfo,
            gotDefaultPeriodId:   gotDefaultPeriodId,
            refreshComplete:      refreshComplete,
            refreshError:         refreshError
        };

        tokens.getGeneralInfo(fns, function(fns) {
            periods.getHolidays(fns, function(fns) {
                platforms.getAllPlatforms(fns, function(fns) {
                    platforms.getSelectedPlatforms(fns, function(selectedPlatforms, fns) {
                        tokens.refreshTokens(selectedPlatforms, fns, periods.refreshPeriods);
                    });
                })
            });
        });
    }

    /**
     * Inserts a timeline (i.e., a platform and its tokens) in the widget.
     * @param tml
     */
    var insertTimeline = function(tml) {
        timelineWidget.addGroup(tml);
        _.each(tml.tokens, function(token) {
            var item = timelineWidget.addToken(token);
            //console.log("insertTimeline: item=", item.id, " geometry=", item.geometry)
            if (token.geometry) {
                olMap.addGeometry(item.id, token.geometry);
            }
        });
    };

    /**
     * Removes a timeline (i.e., a platform and its tokens) from the widget.
     * @param tml
     */
    var removeTimeline = function(tml) {
        _.each(tml.tokens, function(token) {
            timelineWidget.removeToken(token);
        });
        timelineWidget.removeGroup(tml);
    };

    /**
     * Called upon a refresh has completed to insert the timelines in the widget.
     */
    function insertTimelines() {
        var actId = status.activities.add("updating display...");
        $timeout(function() {
            var selectedPlatforms = platimModel.getSelectedPlatforms();
            _.each(selectedPlatforms, insertTimeline);
            timelineWidget.redraw();
            status.activities.remove(actId);
        });
    }

    function refreshComplete() {
        //console.log("refreshing... done.");
        $scope.isRefreshing = false;
        insertTimelines();
    }

    function refreshError() {
        $scope.isRefreshing = false;
    }

    $scope.$on('evtPlatformOptionsUpdated', function() {
      // save selected platforms info, and do a complete refresh:
      var selectedPlatforms = platimModel.getSelectedPlatforms();
      platforms.savePlatformOptions(selectedPlatforms, function() {
        $scope.refresh();
      });
    });

    $scope.$on('evtPeriodSelected', function() {
      $scope.refresh();
    });

    $scope.$on('tokenDeleted', function(evt, token) {
        //console.log("reacting to tokenDeleted", token);
        platimModel.deleteToken(token);
        tokens.getGeneralInfo({gotGeneralInfo: gotGeneralInfo});
    });

    /**
     * Saves the modified tokens in the timeline.
     */
    $scope.save = function() {
        focus('focusTimeline');

        status.errors.removeAll();

        var saveInfo = timelineWidget.getSaveInfo();
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
                tokens.getGeneralInfo({gotGeneralInfo: gotGeneralInfo});
                return;
            }
            var elm = toBeSaved[ii];
            var tokenInfo = elm.tokenInfo;
            var index     = elm.index;
            tokens.saveToken(tokenInfo, index, function(index, tokenInfo) {
                timelineWidget.updateStatus(tokenInfo, "status_saved");
                platimModel.updateToken(tokenInfo);
                doList(ii + 1);
            });
        }
        doList(0);
    };

    // initial refresh
    $scope.refresh();
}

})();
