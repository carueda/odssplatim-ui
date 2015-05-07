(function() {
'use strict';

angular.module('odssPlatimApp.token.services', [])
    .factory('tokens', tokens);

tokens.$inject = ['$rootScope', '$http', 'cfg', 'platimModel', 'status', 'utl', 'httpErrorHandler'];

function tokens($rootScope, $http, cfg, platimModel, status, utl, httpErrorHandler) {
    var activities = status.activities;

    return {
        editToken:       editToken,
        getGeneralInfo:  getGeneralInfo,
        refreshTokens:   refreshTokens,
        saveToken:       saveToken,
        deleteToken:     deleteToken
    };

    function editToken(token, row) {
        $rootScope.$broadcast('editToken', token, row);
    }

    /**
     * Retrieves general token info.
     * @param fns  Callback functions
     * @param next  if defined, function to be called after retrieval or error
     */
    function getGeneralInfo(fns, next) {
        var actId = activities.add("retrieving general info");
        var url = cfg.rest + "/tokens/info";
        if (utl.getDebug()) console.log("GET " + url);
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo(res);
                if (next) next(fns);
            })
            .error(function(data, status, headers, config) {
                activities.remove(actId);
                fns.gotGeneralInfo();
                if (next) next(fns);
                else fns.refreshError();
            })
        ;
    }

    /**
     * Retrieves the tokens for the given platforms.
     * @param platformNames  Names of desired platforms
     * @param fns            Callback functions
     * @param next
     */
    function refreshTokens(platformNames, fns, next) {
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

                        // manually set ttype if not provided by backend.
                        // TODO eventually remove this once all tokens in database are updated
                        if (!token.ttype) {
                            token.ttype = "ttdeployment";
                        }

                        // if absent, set an "empty geometry," in particular it will allow
                        // "adding" a brand new geometry  -- see olMap module.
                        if (!token.geometry) {
                            token.geometry = {
                                type: "FeatureCollection",
                                features: []
                            };
                        }
                        platimModel.addToken(token);
                    });
                });

                if (next) next(fns);
            })

            .error(httpErrorHandler(actId, fns.refreshError));
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

            ,geometry:      tokenInfo.geometry
        };

        if (tokenInfo.token_id !== undefined) {
            // update existing token:
            //console.log("saveToken: updating token_id=" +tokenInfo.token_id, item);

            url = cfg.rest + "/tokens/" + tokenInfo.token_id;
            if (utl.getDebug()) console.log("PUT " + url + " item=", item);
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
            if (utl.getDebug()) console.log("POST " + url + " item=", item);
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
}

})();
