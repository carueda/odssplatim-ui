(function() {
'use strict';

angular.module('odssPlatimApp.services', [])
    .factory('service', service);

service.$inject = ['$rootScope', '$http', 'cfg', 'platimModel', 'periods', 'tokens', 'status', 'utl', 'httpErrorHandler'];

function service($rootScope, $http, cfg, platimModel, periods, tokens, status, utl, httpErrorHandler) {
    var activities = status.activities;

    return {
        refresh: refresh,

        platformOptionsUpdated: function() {
            $rootScope.$broadcast('platformOptionsUpdated');
        },

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
        tokens.getGeneralInfo(fns, function(fns) {
            periods.getHolidays(fns, getAllPlatforms);
        });
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
                tokens.refreshTokens(res.selectedPlatforms, fns, periods.refreshPeriods);
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
