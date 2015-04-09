(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives'])
    .controller('MapCtrl', MapCtrl)
    .factory('olmap', olmapFactory)
;

MapCtrl.$inject = ['olmap'];

function MapCtrl(olmap) {
    // TODO
}

olmapFactory.$inject = [];

function olmapFactory() {
    // TODO
    return {
    };
}
})();
