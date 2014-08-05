'use strict';

(function() {

/**
 * @desc Allows to insert the complete platform timeline editor widget in a page.
 * @file odssPlatim.directive.js
 * @example
 *          <pre>
 *               <div class="odssplatim" ng-app="odssPlatimApp">
 *                   <odss-platim></odss-platim>
 *               </div>
 *          </pre>
 */
angular.module('odssPlatimApp.main')
    .directive('odssPlatim', odssPlatim);

function odssPlatim() {
    return {
        restrict:    'E',
        templateUrl: 'main/odss-platim.tpl.html'
    }
}

})();
