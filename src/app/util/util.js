'use strict';

(function() {

angular.module('odssPlatimApp.util', [])
    .controller('UtilCtrl', UtilCtrl)
    .controller('ConfirmInstanceCtrl', ConfirmInstanceCtrl)
    .factory('status', status)
    .factory('focus', focus)
    .directive('focusOn', focusOn)
;

UtilCtrl.$inject = ['$scope', '$modal'];

function UtilCtrl($scope, $modal) {
    $scope.$on('confirm', function(event, info) {
        //console.log("UtilCtrl.confirm:", info);
        $scope.info = info;
        $scope.open();
    });

    $scope.open = function () {

        var modalInstance = $modal.open({
            templateUrl: 'util/confirm.tpl.html',
            controller: 'ConfirmInstanceCtrl',
            resolve: {
                info: function () {
                    return $scope.info;
                }
            }

        });

        modalInstance.result.then(function() {
            //console.log('Confirmation accepted', arguments);
            $scope.info.ok()
        }, function () {
            //console.log('Confirmation dismissed', arguments);
        });
    };
}

ConfirmInstanceCtrl.$inject = ['$scope', '$modalInstance', 'info'];

function ConfirmInstanceCtrl($scope, $modalInstance, info) {
    $scope.title   = info.title;
    $scope.message = info.message;

    $scope.ok = function() {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}

function status() {
    var messages   = new ItemList();
    var activities = new ItemList();
    var errors     = new ItemList();

    return {
        messages:   messages,
        activities: activities,
        errors:     errors
    };

    function ItemList() {
        var nextId = 0;
        var byId = {};
        return {
            add: function(item) {
                var id = ++nextId;
                byId[id] = item;
                return id;
            },
            has: function(id) {
                return byId[id] !== undefined;
            },
            get: function(id) {
                return byId[id];
            },
            remove: function(id) {
                var item = byId[id];
                delete byId[id];
                return item;
            },
            update: function(id, item) {
                byId[id] = item;
            },
            removeAll: function() {
                byId = {};
            },
            any: function() {
                if (_.size(byId) > 0) {
                    for (var id in byId) {
                        if (byId.hasOwnProperty(id)) {
                            return byId[id];
                        }
                    }
                }
                return undefined;
            },
            ids: function() {
                return _.keys(byId);
            },
            values: function() {
                return _.values(byId);
            }
        };
    }
}

// focus http://stackoverflow.com/a/18295416/830737
focus.$inject = ['$rootScope', '$timeout'];
function focus($rootScope, $timeout) {
    return function(name) {
        $timeout(function (){
            $rootScope.$broadcast('focusOn', name);
        });
    }
}
function focusOn() {
    return function(scope, elem, attr) {
        scope.$on('focusOn', function(e, name) {
            if(name === attr.focusOn) {
                elem[0].focus();
            }
        });
    };
}

})();
