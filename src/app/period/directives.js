(function() {
'use strict';

angular.module('odssPlatimApp.period.directives', [])

    .directive('periodDropdown', function() {
        return {
            restrict:    'E',
            templateUrl: 'period/period-dropdown.tpl.html',
            controller:  'PeriodCtrl'
        }
    }
);


})();
