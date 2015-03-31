(function() {
'use strict';

angular.module('odssPlatimApp.services', [])
    .factory('service', service);

service.$inject = ['$rootScope', '$http', 'platimModel', 'status', 'utl'];

function service($rootScope, $http, platimModel, status, utl) {
    var activities = status.activities;
    var errors     = status.errors;

    /**
     * Start the full refresh of the model (except options)
     * @param fns  Callback functions
     */
    var refresh = function(fns) {
        status.errors.removeAll();
        getGeneralInfoAux(fns, true);
    };

    /**
     * Retrieves general info.
     * @param fns  Callback functions
     * @param continueRefresh true to continue with refresh sequence.
     */
    function getGeneralInfoAux(fns, continueRefresh) {
        var actId = activities.add("retrieving general info");
        var url = odssplatimConfig.rest + "/tokens/info";
        //console.log("GET " + url);
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo(res);
                if (continueRefresh) {
                    getAllPlatforms(fns);
                }
            })
            .error(function(data, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo();
                if (continueRefresh) {
                    getAllPlatforms(fns);
                }
            })
        ;
    }

    /**
     * Retrieves general info.
     * @param fns  Callback functions
     */
    function getGeneralInfo(fns) {
        getGeneralInfoAux(fns, false);
    }

    /**
     * Retrieves all platform.
     * @param fns  Callback functions
     */
    var getAllPlatforms = function(fns) {
        var actId = activities.add("retrieving platforms");
        var url = odssplatimConfig.platformsUrl;
        //console.log("GET " + url);
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                //console.log("getAllPlatforms: " + JSON.stringify(res));

                var tmls = _.map(res, function(elm) {
                    //var platform_id = elm._id;
                    var tml = _.extend({
                        //platform_id:   platform_id,
                        platform_id:   elm.name,
                        platform_name: elm.name
                    }, elm);
                    tml = _.omit(tml, '_id', 'name');
                    tml.tokens = [];
                    return tml;
                });
                platimModel.setAllPlatforms(tmls);

                fns.gotPlatforms(tmls);
                getSelectedPlatforms(fns);
            })

            .error(httpErrorHandler(actId))
        ;
    };

    /**
     * Retrieves the selected platforms.
     * @param fns  Callback functions
     */
    function getSelectedPlatforms(fns) {
        var url = odssplatimConfig.rest + "/prefs/selectedPlatforms";
        //console.log("GET " + url);
        var actId = activities.add('retrieving selected platforms');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                //console.log("getSelectedPlatforms: res", res.selectedPlatforms);
                platimModel.setSelectedPlatforms(res.selectedPlatforms);
                fns.gotSelectedPlatforms(res);
                getHolidays(fns);
            })
            .error(function(data, status, headers, config) {
                if (status == 404) {
                    activities.remove(actId);
                    fns.gotSelectedPlatforms();
                    getHolidays(fns);
                }
                else {
                    httpErrorHandler(actId)(data, status, headers, config)
                }
            });
    }

    /**
     * Retrieves the holidays.
     * @param fns  Callback functions
     */
    var getHolidays = function(fns) {
        var url = odssplatimConfig.rest + "/periods/holidays";
        //console.log("GET " + url);
        var actId = activities.add('retrieving holidays');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.holidays = res.holidays;
                fns.gotHolidays(res);
                refreshTimelines(fns);
            })
            .error(function(data, status, headers, config) {
                if (status == 404) {
                    activities.remove(actId);
                    fns.gotHolidays();
                    refreshTimelines(fns);
                }
                else {
                    httpErrorHandler(actId)(data, status, headers, config)
                }
            });
    };

    /**
     * Retrieves the timelines (ie., platforms having tokens).
     * @param fns  Callback functions
     */
    var refreshTimelines = function(fns) {
        var url = odssplatimConfig.rest + "/tokens/timelines";
        //console.log("GET " + url);
        var actId = activities.add('retrieving timelines');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);

                platimModel.platform_ids = [];
                _.each(res, function(elm) {
                    var platform_id = elm._id;
                    var tml = _.extend({
                        //platform_id:   platform_id,
                        platform_id: elm.name,
                        platform_name: elm.name
                    }, elm);
                    tml = _.omit(tml, '_id', 'name');

                    tml.tokens = [];
                    platimModel.byPlat[platform_id] = tml;

                    platimModel.platform_ids.push(platform_id);
                });

                var platforms_with_tokens = _.pick(platimModel.byPlat, platimModel.platform_ids);
                fns.gotTimelines(platforms_with_tokens);

                putTokens(fns);
            })

            .error(httpErrorHandler(actId));
    };

    /**
     * Retrieves the tokens for the platforms having tokens.
     * @param fns  Callback functions
     */
    var putTokens = function(fns) {

        var platforms_with_tokens = _.pick(platimModel.byPlat, platimModel.platform_ids);
        var list = _.values(platforms_with_tokens);

        /**
         * Retrieves the tokens for the platform at the given index in the
         * list, and then recursively calls doList(index + 1).
         * listDone(true) is called when the list is completed, and
         * listDone(false) upon any error in the corresponding request.
         * @param index  Index in list
         */
        function doList(index) {
            if (index >= list.length) {
                listDone(true);
                return;
            }
            var tml = list[index];
            var platform_id   = tml.platform_id;
            var platform_name = tml.platform_name;
            //console.log("getting tokens for " + platform_name + " (" +platform_id+ ")");

            var url = odssplatimConfig.rest + "/tokens/timelines/" + platform_id;
            //console.log("GET " + url);
            var actId = activities.add("getting tokens for " + platform_name);
            $http.get(url)
                .success(function(tokens, status, headers, config) {
                    activities.remove(actId);
                    _.each(tokens, function(token) {
                        token.token_id      = token._id;
                        token.platform_name = platform_name;
                        token.platform_id   = platform_name;
                        token.status        = "status_saved";
                    });
                    platimModel.byPlat[platform_id].tokens = tokens;
                    //console.log("tokens added to " + tml.platform_name+ ":", tokens);
                    fns.gotTokens(tml, tokens);
                    doList(index + 1)
                })

                .error(httpErrorHandler(actId, function() {
                    listDone(false);
                }));
        }

        function listDone(ok) {
            if (ok) {
                refreshPeriods(fns);
            }
        }

        doList(0);
    };

    /**
     * Retrieves the defined periods.
     * @param fns  Callback functions
     */
    var refreshPeriods = function(fns) {
        var url = odssplatimConfig.rest + "/periods";
        //console.log("GET " + url);
        var actId = activities.add("refreshing periods");
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.periods = {};
                _.each(res, function(per) {
                    platimModel.periods[per._id] = per;
                });
                fns.gotPeriods(platimModel.periods);
                getDefaultPeriodId(fns);
            })

            .error(httpErrorHandler(actId));
    };

    /**
     * Retrieves the default period.
     * @param fns  Callback functions
     */
    var getDefaultPeriodId = function(fns) {
        var url = odssplatimConfig.rest + "/periods/default";
        //console.log("GET " + url);
        var actId = activities.add("getting default period");
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.selectedPeriodId = res.defaultPeriodId;
                fns.gotDefaultPeriodId();
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
    };

    /**
     * Sets the default period.
     */
    var setDefaultPeriodId = function(_id) {
        var url, actId;
        if (_id === undefined) {
            url = odssplatimConfig.rest + "/periods/default";
            console.log("DELETE " + url);
            actId = activities.add("deleting default period");
            $http.delete(url)
                .success(function(res, status, headers, config) {
                    activities.remove(actId);
                    platimModel.selectedPeriodId = undefined;
                })

                .error(httpErrorHandler(actId));
        }
        else {
            url = odssplatimConfig.rest + "/periods/default/" + _id;
            console.log("PUT " + url);
            actId = activities.add("updating default period");
            $http.put(url)
                .success(function(res, status, headers, config) {
                    activities.remove(actId);
                    platimModel.selectedPeriodId = _id;
                })

                .error(httpErrorHandler(actId));
        }
    };

    /**
     * Removes the given period from the database.
     */
    var removePeriod = function(_id) {
        var url = odssplatimConfig.rest + "/periods/" + _id;
        console.log("DELETE " + url);
        var actId = activities.add("deleting period");
        $http.delete(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                delete platimModel.periods[_id];
                if (platimModel.selectedPeriodId === _id) {
                    platimModel.selectedPeriodId = undefined;
                }
            })

            .error(httpErrorHandler(actId));
    };

    /**
     * Adds a period to the database.
     */
    var addPeriod = function(newPeriodInfo, successFn) {
        console.log("addPeriod:", newPeriodInfo);
        var actId = activities.add("saving new period '" +newPeriodInfo.name+ "'");
        var url = odssplatimConfig.rest + "/periods";

        console.log("POST " + url, "newPeriodInfo=", newPeriodInfo);
        $http({
            method:  'POST',
            url:     url,
            data:    newPeriodInfo
        })
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.periods[res._id] = res;
                platimModel.selectedPeriodId = res._id;
                successFn();
            })

            .error(httpErrorHandler(actId));
    };

    /**
     * Adds or updates the given token.
     */
    var saveToken = function(tokenInfo, index, successFn) {
        var url, actId;
        //console.log("saveToken: tokenInfo=" + JSON.stringify(tokenInfo));

        var item = {
            platform_name: utl.strip(tokenInfo.platform_id),
            start:         utl.unparseDate(tokenInfo.start),
            end:           utl.unparseDate(tokenInfo.end),
            state:         tokenInfo.state,
            description:   tokenInfo.description

            ,ttype:         tokenInfo.ttype
        };

        if (tokenInfo.token_id !== undefined) {
            // update existing token:
            //console.log("saveToken: updating token_id=" +tokenInfo.token_id, item);

            url = odssplatimConfig.rest + "/tokens/" + tokenInfo.token_id;
            actId = activities.add("updating token " +item.state);
            $http.put(url, item)
                .success(function(res, status, headers, config) {
                    activities.remove(actId);
                    successFn(index, tokenInfo);
                    //console.log("token updated:", tokenInfo);
                })

                .error(httpErrorHandler(actId));
        }
        else {
            // add new token
            //console.log("saveToken: posting new token", item);

            url = odssplatimConfig.rest + "/tokens";
            actId = activities.add("adding token " +item.state);
            $http({
                method:  'POST',
                url:     url,
                data:    item
            })
                .success(function(data, status, headers, config) {
                    activities.remove(actId);
                    tokenInfo.token_id = data._id;
                    successFn(index, tokenInfo);
                    //console.log("token posted:", tokenInfo);
                })
                .error(httpErrorHandler(actId));
        }
    };

    /**
     * Removes the given token.
     */
    var deleteToken = function(tokenInfo, index, successFn) {
        if (tokenInfo.token_id === undefined) {
            successFn(tokenInfo, index);
            return;
        }

        var url = odssplatimConfig.rest + "/tokens/" + tokenInfo.token_id;
        //console.log("DELETE " + url);
        var actId = activities.add("deleting token " +tokenInfo.state);
        $http.delete(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                successFn(tokenInfo, index);
            })
            .error(httpErrorHandler(actId));
    };

    function savePlatformOptions(selectedPlatforms, successFn) {
        var actId = activities.add("saving platform options...");
        //console.log("savePlatformOptions", selectedPlatforms);
        var url = odssplatimConfig.rest + "/prefs/selectedPlatforms";
        var data = {selectedPlatforms: _.map(selectedPlatforms, "platform_id")};
        //console.log("POST " + url);
        $http.post(url, data)
            .success(function(res, status, headers, config) {
                platimModel.setSelectedPlatforms(data.selectedPlatforms);
                activities.remove(actId);
                successFn();
            })
            .error(httpErrorHandler(actId));
    }

    /**
     * Returns a customized error handler for an http request.
     *
     * @param actId     Id of activity to be removed from the activities list.
     * @param fn        callback for any further action on the error;
     *                  called as fn(data, status, headers, config).
     * @returns {Function}  handler
     */
    var httpErrorHandler = function(actId, fn) {
        return function(data, status, headers, config) {
            var reqMsg = config.method + " '" + config.url + "'";
            console.log("error in request " +reqMsg+ ":",
                        "data=", data, "status=", status,
                        "config=", config);

            var error = "An error occured while " + activities.get(actId) + ". " +
                "(status=" + status + "). " +
                "Try again in a few moments.";

            errors.add(error);

            if (actId !== undefined) {
                activities.remove(actId);
            }
            if (fn !== undefined) {
                fn(data, status, headers, config);
            }
        };
    };

    return {
        refresh: refresh,

        getGeneralInfo: getGeneralInfo,

        platformOptionsUpdated: function() {
            $rootScope.$broadcast('platformOptionsUpdated');
        },

        editToken: function(token, row) {
            $rootScope.$broadcast('editToken', token, row);
        },

        saveToken: saveToken,
        deleteToken: deleteToken,

        periodSelected: function() {
            $rootScope.$broadcast('periodSelected');
        },

        savePlatformOptions: savePlatformOptions,

        setDefaultPeriodId:  setDefaultPeriodId,
        addPeriod:           addPeriod,
        removePeriod:        removePeriod,

        confirm: function(info) {
            //console.log("service: confirm: ", info);
            $rootScope.$broadcast('confirm', info);
        }

    };
}

})();
