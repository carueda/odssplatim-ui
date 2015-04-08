(function() {
'use strict';

angular.module('odssPlatimApp.services', [])
    .factory('service', service);

service.$inject = ['$rootScope', 'periods', 'tokens', 'platforms', 'status'];

function service($rootScope, periods, tokens, platforms, status) {
    return {
        refresh: refresh,

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
            periods.getHolidays(fns, function(fns) {
                platforms.getAllPlatforms(fns, function(fns) {
                    platforms.getSelectedPlatforms(fns, function(selectedPlatforms, fns) {
                        tokens.refreshTokens(selectedPlatforms, fns, periods.refreshPeriods);
                    });
                })
            });
        });
    }
}

})();
