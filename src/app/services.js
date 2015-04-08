(function() {
'use strict';

angular.module('odssPlatimApp.services', [])
    .factory('service', service);

service.$inject = ['$rootScope'];

function service($rootScope) {
    return {
        confirm: function(info) {
            //console.log("service: confirm: ", info);
            $rootScope.$broadcast('confirm', info);
        }
    };
}

})();
