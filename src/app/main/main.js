(function() {
'use strict';

angular.module('odssPlatimApp.main', ['odssPlatimApp.main.directives', 'odssPlatimApp.main.filters'])

    .controller('MainCtrl', MainCtrl) ;

MainCtrl.$inject = ['$scope', 'cfg', 'platimModel', 'periods', 'platforms', 'tokens', 'timelineWidget', 'status', 'utl', 'focus', 'olMap'];

function MainCtrl($scope, cfg, platimModel, periods, platforms, tokens, timelineWidget, status, utl, focus, olMap) {
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
    setTimeout(function refreshLastUpdated() {
        if ($scope.lastUpdated !== undefined) {
            updateLastUpdated();
            $scope.$digest();
        }
        setTimeout(refreshLastUpdated, 5 * 1000);
    }, 0);

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
            var isActualToken = tokenInfo.type === undefined || tokenInfo.type !== "background";
            if (isActualToken) {
                //console.log("tokenInfo=", tokenInfo);
                if (isNewOrModifiedToken(tokenInfo)) {
                    if (isOkToBeSaved(tokenInfo)) {
                        toBeSaved.push({tokenInfo: tokenInfo, index: index});
                    }
                    else {
                        skipped += 1;
                    }
                }
            }
        });
        return {toBeSaved: toBeSaved, skipped: skipped};
    }

    /**
     * Triggers the refresh of the model, first confirming with the user
     * in case of any unsaved changes.
     */
    $scope.refresh = function() {
        focus('focusTimeline');
        var toBeSavedInfo = getSaveInfo();
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
     * Called to reflect the selection options in the widget.
     * @param doSave the platform options are saved if this is undefined or true
     */
    var platformOptionsUpdated = function(doSave) {
        var actId = status.activities.add("updating display...");
        setTimeout(function() {
            status.activities.remove(actId);

            // current platforms in the timeline:
            var timelinePlatforms = timelineWidget.getGroups();
            var timelinePlatformNames = _.map(timelinePlatforms, "platform_name");
            console.log("platformOptionsUpdated timelinePlatforms=", timelinePlatformNames);

            var selectedPlatforms = platimModel.getSelectedPlatforms();
            var selectedPlatformNames = _.map(selectedPlatforms, "platform_name");
            console.log("platformOptionsUpdated selectedPlatforms", selectedPlatformNames);

            // insert timelines for new selected platforms:
            _.each(selectedPlatforms, function(selectedPlatform) {
                if (!_.contains(timelinePlatformNames, selectedPlatform.platform_name)) {
                    console.log("platformOptionsUpdated inserting timeline", selectedPlatform.platform_name);
                    insertTimeline(selectedPlatform);
                }
            });

            // remove timelines for the just unselected platforms:
            _.each(timelinePlatforms, function(timelinePlatform) {
                if (!_.contains(selectedPlatformNames, timelinePlatform.platform_name)) {
                    console.log("platformOptionsUpdated removing timeline", timelinePlatform.platform_name);
                    removeTimeline(timelinePlatform);
                }
            });

            //// previously
            //timelineWidget.reinit(platimModel.holidays);
            //olMap.reinit();
            //_.each(selectedPlatforms, insertTimeline);

            timelineWidget.redraw();
            $scope.$digest();
            if (doSave === undefined || doSave) {
                platforms.savePlatformOptions(selectedPlatforms, function () {
                    //$scope.$digest();
                });
            }
        }, 10);
    };

    function refreshComplete() {
        //console.log("refreshing... done.");
        $scope.isRefreshing = false;
        platformOptionsUpdated(false);
    }

    function refreshError() {
        $scope.isRefreshing = false;
    }

    $scope.$on('platformOptionsUpdated', platformOptionsUpdated);

    $scope.$on('periodSelected', setVisibleChartRange);

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
