(function() {
'use strict';

angular.module('odssPlatimApp.util', [])
    .controller('UtilCtrl', UtilCtrl)
    .controller('MessageInstanceCtrl', MessageInstanceCtrl)

    .factory('status', status)

    .factory('focus', focus)
    .directive('focusOn', focusOn)

    .factory('httpErrorHandler', httpErrorHandler)

    .factory('utl', miscUtils)
;

UtilCtrl.$inject = ['$scope', '$modal'];

function UtilCtrl($scope, $modal) {
    $scope.$on('evtConfirm', function(event, info) {
        $scope.info = info;
        var modalInstance = $modal.open({
            templateUrl: 'util/confirm.tpl.html',
            controller: 'MessageInstanceCtrl',
            size:       'sm',
            resolve: {
                info: function () { return $scope.info; }
            }
        });
        modalInstance.result.then(function() {
            //console.log('Confirmation accepted', arguments);
            $scope.info.ok()
        }, function () {
            //console.log('Confirmation dismissed', arguments);
        });
    });

    $scope.$on('evtMessage', function(event, info) {
        $scope.info = info;
        var modalInstance = $modal.open({
            templateUrl: 'util/message.tpl.html',
            controller: 'MessageInstanceCtrl',
            size:       'sm',
            resolve: {
                info: function () { return $scope.info; }
            }
        });
        modalInstance.result.then(function() { }, function () { });
    });

    // token tooltip
    $scope.t3 = { style: {visibility: 'hidden'}, token: {} };
    $scope.$on("tokenMouseEnter", function(e, token, jsEvent) {
      //console.log("on tokenMouseEnter token=" , token, "jsEvent=", jsEvent);
      $scope.t3.token = _.cloneDeep(token);
      $scope.t3.style = {
          top:  (jsEvent.pageY + 12) + 'px',
          left: (jsEvent.pageX + 1) + 'px',
          visibility: 'visible'
      };
      $scope.$digest();
    });
    $scope.$on("tokenMouseLeave", function(e, tokenId, jsEvent) {
      $scope.t3.style.visibility = 'hidden';
      $scope.$digest();
    });

}

// MessageInstanceCtrl: for confirm, message, and the like dialog boxes
MessageInstanceCtrl.$inject = ['$scope', '$modalInstance', 'info'];

function MessageInstanceCtrl($scope, $modalInstance, info) {
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

            // returns sorted array of current ids as numbers
            ids: ids,

            // returns sorted array of current values in the order they were added
            values: values
        };

        function ids() {
          return _.chain(byId).keys().map(function (i) { return +i; }).sortBy().value();
        }

        function values() {
          return _.map(ids(), function(id) { return byId[id]; });
        }
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

miscUtils.$inject = ['$rootScope', '$window'];
function miscUtils($rootScope, $window) {
    var debug = $window.location.toString().match(/.*\?debug.*/)
        ? { collapsed: true, skipMapSync: $window.location.toString().match(/.*skipMapSync.*/) }
        : undefined;

    return {
        confirm: function(info) {
            $rootScope.$broadcast('evtConfirm', info);
        },

        message: function(info) {
            $rootScope.$broadcast('evtMessage', info);
        },

        getDebug: function () {
            return debug;
        },

        strip: function (html) {
            var tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText;
        },

        parseDate: function (str) {
            return moment(str).toDate();
        },

        unparseDate: function (date) {
            if (date === undefined) {
                return undefined;
            }
            return moment(date).format("YYYY-MM-DD HH:mm");
        },

        tablify: function tablify(obj, simple) {
            simple = simple === undefined || simple;

            function escape(s) {
                return s === undefined || s === null ? s :
                    s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }

            if (obj === null) {
                return null;
            }
            if (typeof obj === "string") {
                return escape(obj);
            }
            if (typeof obj === "function") {
                return "function";
            }
            if (typeof obj !== "object") {
                return escape(JSON.stringify(obj));
                //return obj;
            }

            var result = '<table>';  // assuming there are own properties

            var own = 0;
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    own += 1;
                    (function (key) {
                        result +=
                            '<tr>' +
                            '<td style="vertical-align:middle">' +
                            '<b>' + key + '</b>:' +
                            '</td>';

                        if (!simple) {
                            result +=
                                '<td style="vertical-align:top; border:1pt solid #d9d9d9">' +
                                escape(JSON.stringify(obj[key])) +
                                '</td>';
                        }
                        result +=
                            '<td style="vertical-align:top; border:1pt solid #d9d9d9">' +
                            tablify(obj[key]) +
                            '</td>' +
                            '</tr>';
                    })(key);
                }
            }
            if (own == 0) {
                // no own properties
                return escape(JSON.stringify(obj));
            }

            result += '</table>';
            return result;
        }
    }
}

})();
