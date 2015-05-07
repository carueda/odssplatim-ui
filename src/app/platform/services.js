(function() {
'use strict';

angular.module('odssPlatimApp.platform.services', [])
    .factory('platforms', platforms);

platforms.$inject = ['$rootScope', '$http', 'cfg', 'platimModel', 'status', 'utl', 'httpErrorHandler'];

function platforms($rootScope, $http, cfg, platimModel, status, utl, httpErrorHandler) {
    var activities = status.activities;

    return {
        getAllPlatforms:       getAllPlatforms,
        getSelectedPlatforms:  getSelectedPlatforms,
        savePlatformOptions:   savePlatformOptions

        ,platformOptionsUpdated: function() {
            $rootScope.$broadcast('platformOptionsUpdated');
        }
    };

    /**
     * Retrieves all platforms. We need all of them to support any
     * selection by the user.
     * @param fns   Callback functions
     * @param next  Called as next(fns)
     */
    function getAllPlatforms(fns, next) {
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
                    return tml;
                });
                platimModel.setAllPlatforms(tmls);
                if (next) next(fns);
            })

            .error(httpErrorHandler(actId, fns.refreshError))
        ;
    }

    /**
     * Retrieves the selected platforms.
     * @param fns   Callback functions
     * @param next  if defined, called as next(selectedPlatforms, fns) after retrieval
     */
    function getSelectedPlatforms(fns, next) {
        var url = cfg.rest + "/prefs/selectedPlatforms";
        if (utl.getDebug()) console.log("GET " + url);
        var actId = activities.add('retrieving selected platforms');
        $http.get(url)
            .success(function(res, status, headers, config) {
                activities.remove(actId);
                //console.log("getSelectedPlatforms: res", res.selectedPlatforms);
                platimModel.setSelectedPlatforms(res.selectedPlatforms);
                if (next) next(res.selectedPlatforms, fns);
            })
            .error(httpErrorHandler(actId, fns.refreshError));
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
