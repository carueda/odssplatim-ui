(function() {
'use strict';

angular.module('odssPlatimApp.olmap.directives', [])
    .directive('olmap', function() {
        return {
            restrict: 'E',
            transclude: true,
            templateUrl: 'olmap/olmap.tpl.html'
        }
    })
;

})();
