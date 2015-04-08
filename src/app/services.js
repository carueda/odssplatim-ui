(function() {
'use strict';

angular.module('odssPlatimApp.services', [])
    .factory('service', service);

service.$inject = ['$rootScope', '$http', 'cfg', 'platimModel', 'periods', 'status', 'utl', 'httpErrorHandler'];

function service($rootScope, $http, cfg, platimModel, periods, status, utl, httpErrorHandler) {
    var activities = status.activities;

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

        savePlatformOptions: savePlatformOptions,

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
                    periods.getHolidays(fns, getAllPlatforms);
                }
            })
            .error(function(data, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo();
                if (continueRefresh) {
                    periods.getHolidays(fns, getAllPlatforms);
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

                periods.refreshPeriods(fns);
            })

            .error(httpErrorHandler(actId));
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
}

})();
