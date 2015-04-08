(function() {
'use strict';

angular.module('odssPlatimApp.period.services', [])
    .factory('periods', periods);

periods.$inject = ['$rootScope', '$http', 'cfg', 'platimModel', 'status', 'utl', 'httpErrorHandler'];

function periods($rootScope, $http, cfg, platimModel, status, utl, httpErrorHandler) {
    var activities = status.activities;

    return {
        refreshPeriods:      refreshPeriods,
        periodSelected:      periodSelected,
        setDefaultPeriodId:  setDefaultPeriodId,
        addPeriod:           addPeriod,
        updatePeriod:        updatePeriod,
        removePeriod:        removePeriod,
        getHolidays:         getHolidays
    };

    /**
     * Retrieves the defined periods.
     * @param fns  Callback functions
     */
    function refreshPeriods(fns) {
        var url = cfg.rest + "/periods";
        if (utl.getDebug()) console.log("GET " + url);
        var actId = activities.add("refreshing periods");
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.periods = {};
                _.each(res, function(per) {
                    platimModel.periods[per._id] = per;
                });
                getDefaultPeriodId(fns);
            })

            .error(httpErrorHandler(actId));
    }

    function periodSelected() {
        $rootScope.$broadcast('periodSelected');
    }

    /**
     * Retrieves the default period.
     * @param fns  Callback functions
     */
    function getDefaultPeriodId(fns) {
        var url = cfg.rest + "/periods/default";
        if (utl.getDebug()) console.log("GET " + url);
        var actId = activities.add("getting default period");
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.selectedPeriodId = res.defaultPeriodId;
                fns.gotDefaultPeriodId();
                $rootScope.$broadcast('periodsRefreshed');
                fns.refreshComplete();
            })

            .error(function(data, status, headers, config) {
                if (status == 404) {
                    activities.remove(actId);
                    fns.gotDefaultPeriodId();
                    fns.refreshComplete();
                }
                else {
                    httpErrorHandler(actId)(data, status, headers, config)
                }
            });
    }

    /**
     * Sets the default period.
     */
    function setDefaultPeriodId(_id, cb) {
        var url, actId;
        if (_id === undefined) {
            url = cfg.rest + "/periods/default";
            if (utl.getDebug()) console.log("DELETE " + url);
            actId = activities.add("deleting default period");
            $http.delete(url)
                .success(function(res, status, headers, config) {
                    activities.remove(actId);
                    platimModel.selectedPeriodId = undefined;
                    if (cb) cb();
                })

                .error(httpErrorHandler(actId, cb));
        }
        else {
            url = cfg.rest + "/periods/default/" + _id;
            if (utl.getDebug()) console.log("PUT " + url);
            actId = activities.add("updating default period");
            $http.put(url)
                .success(function(res, status, headers, config) {
                    activities.remove(actId);
                    platimModel.selectedPeriodId = _id;
                    if (cb) cb();
                })

                .error(httpErrorHandler(actId));
        }
    }

    /**
     * Removes the given period from the database.
     */
    function removePeriod(_id, cb) {
        var url = cfg.rest + "/periods/" + _id;
        if (utl.getDebug()) console.log("DELETE " + url);
        var actId = activities.add("deleting period");
        $http.delete(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                delete platimModel.periods[_id];
                if (platimModel.selectedPeriodId === _id) {
                    platimModel.selectedPeriodId = undefined;
                }
                cb();
            })

            .error(httpErrorHandler(actId, cb));
    }

    /**
     * Adds a period to the database.
     */
    function addPeriod(newPeriodInfo, cb) {
        console.log("addPeriod:", newPeriodInfo);
        var actId = activities.add("saving new period '" +newPeriodInfo.name+ "'");
        var url = cfg.rest + "/periods";

        if (utl.getDebug()) console.log("POST " + url, "newPeriodInfo=", newPeriodInfo);
        $http({
            method:  'POST',
            url:     url,
            data:    newPeriodInfo
        })
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.periods[res._id] = res;
                cb(undefined, res);
            })

            .error(httpErrorHandler(actId));
    }

    /**
     * Updates a period in the database.
     */
    function updatePeriod(periodInfo, cb) {
        console.log("updatePeriod:", periodInfo);
        var actId = activities.add("updating period '" +periodInfo.name+ "'");
        var url = cfg.rest + "/periods/" + periodInfo._id;

        if (utl.getDebug()) console.log("PUT " + url, "periodInfo=", periodInfo);
        $http({
            method:  'PUT',
            url:     url,
            data:    periodInfo
        })
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.periods[res._id] = res;
                cb(undefined, res);
            })

            .error(httpErrorHandler(actId, cb));
    }

    /**
     * Retrieves the holidays.
     * @param fns  Callback functions
     * @param next  if defined, function to be called after retrieval or 404 error
     */
    function getHolidays(fns, next) {
        var url = cfg.rest + "/periods/holidays";
        if (utl.getDebug()) console.log("GET " + url);
        var actId = activities.add('retrieving holidays');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.holidays = res.holidays;
                if (next) next(fns);
            })
            .error(function(data, status, headers, config) {
                if (status == 404) {
                    activities.remove(actId);
                    // but continue sequence:
                    if (next) next(fns);
                }
                else {
                    httpErrorHandler(actId)(data, status, headers, config)
                }
            });
    }

}

})();
