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

  UtilCtrl.$inject = ['$scope', '$modal', 'utl'];

  function UtilCtrl($scope, $modal, utl) {
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
      var complete = info.ok || function() {};
      modalInstance.result.then(complete, complete);
    });

    // token tooltip
    $scope.t3 = { style: {visibility: 'hidden'}, token: {} };
    $scope.$on("evtTokenMouseEnter", function(e, info, jsEvent) {
      //console.log("on tokenMouseEnter info=" , info, "jsEvent=", jsEvent);

      var token = _.cloneDeep(info.token);
      var extraLine;

      if (info.lineStringLength) {
        var speedKmH = utl.getSpeedForPlatform(token.platform_name);
        extraLine = 'LineString component, ' + utl.formatLengthAndDuration(info.lineStringLength, speedKmH, true);
      }
      else if (info.polygonArea) {
        extraLine = 'Polygon component, area: ' + utl.formatArea(info.polygonArea);
      }
      else if (info.pointLatLon) {
        var ll = info.pointLatLon;
        extraLine = 'Point component: ' + ll[0].toFixed(6) + ", " + ll[1].toFixed(6);
      }

      $scope.t3.extraLine = extraLine;
      $scope.t3.token = token;
      $scope.t3.style = {
        top:  (jsEvent.pageY + 12) + 'px',
        left: (jsEvent.pageX + 1) + 'px',
        visibility: 'visible'
      };
      $scope.$digest();
    });
    $scope.$on("evtTokenMouseLeave", function(e, info, jsEvent) {
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

      formatLength: formatLength,

      formatLengthDuration: formatLengthDuration,

      /**
       * Interim utility to get the speed associated to a platform
       * TODO replace with appropriate mechanism
       * @returns {number} speed in km/h
       */
      getSpeedForPlatform: function (platformName) {
        var pnlc = platformName ? platformName.toLowerCase() : '';
        if (pnlc === 'dorado') return 4.6;
        if (pnlc.startsWith('wg')) return 0.9;
        if (pnlc.startsWith('tethys')) return 3.0;
        if (pnlc.startsWith('daphne')) return 3.0;
        if (pnlc.startsWith('makai')) return 3.0;

        return 0; // so the time calculation is not performed
      },

      /**
       * Returns a string like "16.52 km (~5h:30m @3km/h)"
       * @param lengthMeters  Distance in meters
       * @param speedKmH      Speed in km/h. If undefined or zero, only distance part (eg. "16.52 km") is returned
       * @param includeSpeed  true to include speed part (eg. "@3km/h") in the result
       * @returns {string}
       */
      formatLengthAndDuration: function (lengthMeters, speedKmH, includeSpeed) {
        var res = ' ' + formatLength(lengthMeters);
        if (speedKmH) {
          res += ' (~' + formatLengthDuration(lengthMeters, speedKmH);
          if (includeSpeed) {
            res += ' @' +speedKmH + 'km/h'
          }
          res += ')';
        }
        return res;
      },

      formatArea: function(area) {
        var output;
        if (area > 10000) {
          output = (Math.round(area / 1000000 * 100) / 100) + ' km';
        }
        else {
          output = (Math.round(area * 100) / 100) + ' m';
        }
        return output + '<sup>2</sup>';
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
    };

    function formatLength(lengthMeters) {
      lengthMeters = Math.round(lengthMeters * 100) / 100;
      var output;
      if (lengthMeters > 100) {
        output = (Math.round(lengthMeters / 1000 * 100) / 100) + ' ' + 'km';
      }
      else {
        output = (Math.round(lengthMeters * 100) / 100) + ' ' + 'm';
      }
      return output;
    }

    function formatLengthDuration(lengthMeters, speedKmH) {
      var speedMetersPerH = 1000 * speedKmH;
      var durationHours = lengthMeters / speedMetersPerH;
      var dur = moment.duration(durationHours, 'hours');

      var totMins = Math.floor(dur.asMinutes());
      var theMins = Math.floor(dur.minutes());
      if (totMins < 60) return totMins + 'm';

      var totHours = Math.floor(dur.asHours());
      var theHours = Math.floor(dur.hours());
      if (totHours < 24) return totHours + 'h' + (theMins > 0 ? ':' + theMins + 'm' : '');

      var totDays = Math.floor(dur.asDays());
      return totDays + 'd' + (theHours > 0 ? ':' + theHours + 'h' : '');
      //return moment.duration(durationHours, 'hours').humanize();
    }
  }

})();
