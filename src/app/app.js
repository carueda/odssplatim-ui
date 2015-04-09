(function() {
'use strict';

angular.module('odssPlatimApp', [
    'ui.bootstrap',
    'ngSanitize',
    'odssPlatimApp.model',
    'odssPlatimApp.platform',
    'odssPlatimApp.token',
    'odssPlatimApp.period',
    'odssPlatimApp.util',
    'odssPlatimApp.templates',
    'odssPlatimApp.main',
    'odssPlatimApp.olmap'
]);

angular.module("odssPlatimApp.templates", []);

})();
