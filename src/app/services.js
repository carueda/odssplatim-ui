(function() {
'use strict';

angular.module('odssPlatimApp.services', [])
    .factory('service', service);

service.$inject = ['$rootScope', '$http', 'cfg', 'platimModel', 'status', 'utl'];

function service($rootScope, $http, cfg, platimModel, status, utl) {
    var activities = status.activities;
    var errors     = status.errors;

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
        updatePeriod:        updatePeriod,
        removePeriod:        removePeriod,

        confirm: function(info) {
            //console.log("service: confirm: ", info);
            $rootScope.$broadcast('confirm', info);
        }
    };

    /**
     * Start the full refresh of the model (except options)
     * @param fns  Callback functions
     */
    function refresh(fns) {
        status.errors.removeAll();
        getGeneralInfoAux(fns, true);
    }

    /**
     * Retrieves general info.
     * @param fns  Callback functions
     * @param continueRefresh true to continue with refresh sequence.
     */
    function getGeneralInfoAux(fns, continueRefresh) {
        var actId = activities.add("retrieving general info");
        var url = cfg.rest + "/tokens/info";
        if (utl.getDebug()) console.log("GET " + url);
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo(res);
                if (continueRefresh) {
                    getHolidays(fns);
                }
            })
            .error(function(data, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo();
                if (continueRefresh) {
                    getHolidays(fns);
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
     * Retrieves all platforms. We need all of them to support any
     * selection by the user.
     * @param fns  Callback functions
     */
    function getAllPlatforms(fns) {
        var actId = activities.add("retrieving platforms");
        var url = cfg.platformsUrl;
        if (utl.getDebug()) console.log("GET " + url);
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                //console.log("getAllPlatforms: " + JSON.stringify(res));

                var tmls = _.map(res, function(elm) {
                    var tml = _.extend({
                        platform_name: elm.name
                    }, elm);
                    tml = _.omit(tml, '_id', 'name');
                    tml.tokens = [];
                    return tml;
                });
                platimModel.setAllPlatforms(tmls);
                getSelectedPlatforms(fns);
            })

            .error(httpErrorHandler(actId))
        ;
    }

    /**
     * Retrieves the selected platforms.
     * @param fns  Callback functions
     */
    function getSelectedPlatforms(fns) {
        var url = cfg.rest + "/prefs/selectedPlatforms";
        if (utl.getDebug()) console.log("GET " + url);
        var actId = activities.add('retrieving selected platforms');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                //console.log("getSelectedPlatforms: res", res.selectedPlatforms);
                platimModel.setSelectedPlatforms(res.selectedPlatforms);
                refreshTokens(res.selectedPlatforms, fns);
            })
            .error(httpErrorHandler(actId));
    }

    /**
     * Retrieves the holidays.
     * @param fns  Callback functions
     */
    function getHolidays(fns) {
        var url = cfg.rest + "/periods/holidays";
        if (utl.getDebug()) console.log("GET " + url);
        var actId = activities.add('retrieving holidays');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                platimModel.holidays = res.holidays;
                getAllPlatforms(fns);
            })
            .error(function(data, status, headers, config) {
                if (status == 404) {
                    activities.remove(actId);
                    // but continue sequence:
                    getAllPlatforms(fns);
                }
                else {
                    httpErrorHandler(actId)(data, status, headers, config)
                }
            });
    }

    /**
     * Retrieves the tokens for the given platforms.
     * @param platformNames  Names of desired platforms
     * @param fns            Callback functions
     */
    function refreshTokens(platformNames, fns) {
        var url = cfg.rest + "/tokens";
        var params = {platform_name: platformNames.join(',')};
        if (utl.getDebug()) console.log("GET " + url + " params=", params);
        var actId = activities.add('retrieving tokens');
        $http.get(url, {params: params})
            .success(function(tokens, status, headers, config) {
                activities.remove(actId);
                //console.log("GET response: tokens=", tokens);
                var byPlatformName = _.groupBy(tokens, "platform_name");
                _.each(byPlatformName, function(platTokens, platform_name) {
                    _.each(platTokens, function(token) {
                        token.token_id      = token._id;
                        token.status        = "status_saved";

                        platimModel.byPlat[platform_name].tokens.push(token);
                    });
                });

                refreshPeriods(fns);
            })

            .error(httpErrorHandler(actId));
    }

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
     * Adds or updates the given token.
     */
    function saveToken(tokenInfo, index, successFn) {
        var url, actId;
        //console.log("saveToken: tokenInfo=" + JSON.stringify(tokenInfo));

        var item = {
            platform_name: utl.strip(tokenInfo.platform_name),
            start:         utl.unparseDate(tokenInfo.start),
            end:           utl.unparseDate(tokenInfo.end),
            state:         tokenInfo.state,
            description:   tokenInfo.description

            ,ttype:         tokenInfo.ttype
        };

        if (tokenInfo.token_id !== undefined) {
            // update existing token:
            //console.log("saveToken: updating token_id=" +tokenInfo.token_id, item);

            url = cfg.rest + "/tokens/" + tokenInfo.token_id;
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

            url = cfg.rest + "/tokens";
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
    }

    /**
     * Removes the given token.
     */
    function deleteToken(tokenInfo, index, successFn) {
        if (tokenInfo.token_id === undefined) {
            successFn(tokenInfo, index);
            return;
        }

        var url = cfg.rest + "/tokens/" + tokenInfo.token_id;
        if (utl.getDebug()) console.log("DELETE " + url);
        var actId = activities.add("deleting token " +tokenInfo.state);
        $http.delete(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                successFn(tokenInfo, index);
            })
            .error(httpErrorHandler(actId));
    }

    function savePlatformOptions(selectedPlatforms, successFn) {
        var actId = activities.add("saving platform options...");
        //console.log("savePlatformOptions", selectedPlatforms);
        var url = cfg.rest + "/prefs/selectedPlatforms";
        var data = {selectedPlatforms: _.map(selectedPlatforms, "platform_name")};
        if (utl.getDebug()) console.log("POST " + url);
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
     * @param cb        if given, callback for any further action on the error;
     *                  called with a single argument object as follows:
     *                     cb({data:data, status:status, headers:headers, config:config}).
     * @returns {Function}  handler
     */
    function httpErrorHandler(actId, cb) {
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
            if (cb !== undefined) {
                cb({data:data, status:status, headers:headers, config:config});
            }
        };
    }
}

})();
