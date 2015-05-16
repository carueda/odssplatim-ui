(function() {
'use strict';

angular.module('odssPlatimApp.main.filters', [])

  /**
   * Token date range, abbreviated if covering a single date.
   */
  .filter('tokenDateRange', [function() {
    return function(token) {
      var start = moment(token.start).local();
      var end   = moment(token.end).local();
      if (start.format("YYYY-MM-DD") === end.format("YYYY-MM-DD")) {
        return start.format("ddd MMM D YYYY, HH:mm") + " – " + end.format("HH:mm");
      }
      else {
        return start.format("ddd MMM D YYYY, HH:mm") + " – " + end.format("ddd MMM D YYYY, HH:mm");
      }
    }
  }])

;

})();
