'use strict';

(function() {

angular.module('odssPlatimApp.util', [])
    .controller('UtilCtrl', UtilCtrl)
    .controller('ConfirmInstanceCtrl', ConfirmInstanceCtrl)
    .factory('status', status)
    .factory('focus', focus)
    .directive('focusOn', focusOn)
    .factory('httpErrorHandler', httpErrorHandler)
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
    return function(name, delay, options) {
        $timeout(function (){
            $rootScope.$broadcast('focusOn', name, options);
        }, delay);
    }
}
function focusOn() {
    return function(scope, elem, attr) {
        scope.$on('focusOn', function(e, name, options) {
            if(name === attr.focusOn) {
                elem[0].focus();
                if (options && options.select) {
                    elem[0].select();
                }
            }
        });
    };
}

httpErrorHandler.$inject = ['status'];
function httpErrorHandler(status) {
    var activities = status.activities;
    var errors     = status.errors;

    /**
     * Returns a customized error handler for an http request.
     *
     * @param actId     If defined, id of the activity to be removed from the activities list.
     *                  A error message is added to the errors list.
     * @param cb        if given, function to be called for any further action on the error.
     *                  It is called with a single argument object as follows:
     *                     cb({data:data, status:status, headers:headers, config:config}).
     * @returns {Function}  http error handler
     */
    return function(actId, cb) {
        return function(data, status, headers, config) {
            var reqMsg = config.method + " '" + config.url + "'";
            console.log("error in request " +reqMsg+ ":",
                "data=", data, "status=", status,
                "config=", config);

            var error = "An error occurred while " + activities.get(actId) + ". " +
                "(status=" + status + "). Try again in a few moments.";

            errors.add(error);

            if (actId !== undefined) {
                activities.remove(actId);
            }
            if (cb !== undefined) {
                cb({data:data, status:status, headers:headers, config:config});
            }
        };
    }
}

})();
