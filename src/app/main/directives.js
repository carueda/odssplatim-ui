(function() {
'use strict';

angular.module('odssPlatimApp.main.directives', [])

    /**
     * @desc Allows to insert the complete platform timeline editor widget in a page.
     * Along with the required resources and the angular.bootstrap mechanism, this
     * is how the editor is included in the main ODSS application.
     * @example
     *          <pre>
     *               <div class="odssplatim" id="odssPlatimApp">
     *                   <odss-platim></odss-platim>
     *               </div>
     *          </pre>
     */
    .directive('odssPlatim', odssPlatim);

function odssPlatim() {
    return {
        restrict:    'E',
        templateUrl: 'main/odss-platim.tpl.html',
        controller:  'MainCtrl'
    }
}

})();
