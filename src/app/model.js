'use strict';

(function() {

    var model = {

        byPlat:    {},

        platform_ids: [],

        platformOptions: {
            platformTypes:   [],
            onlyWithTokens:  true,
            onlyWithTypes:   false,
            selectedTypes:   {}
        },

        holidays: [],
        periods: {},
        selectedPeriodId: undefined
    };

    /**
     * Gets the selected platform types.
     */
    model.getSelectedTypes = function() {
        var platformTypes = model.platformOptions.platformTypes;
        var selectedTypes = model.platformOptions.selectedTypes;
        var selected = _.filter(platformTypes,
                                function (pt) { return selectedTypes[pt]; });
        return selected;
    };

    /**
     * Gets the platforms selected according to the platform options.
     */
    model.getSelectedPlatforms = function() {
        var platforms = _.values(model.byPlat);

        var onlyWithTokens = model.platformOptions.onlyWithTokens;
        var onlyWithTypes = model.platformOptions.onlyWithTypes;
        var selected = model.getSelectedTypes();

        return _.filter(platforms, function(tml) {
            if (onlyWithTokens && tml.tokens.length == 0) {
                return false;
            }
            if (onlyWithTypes) {
                return _.indexOf(selected, tml.typeName) >= 0;

            }
            return true;
        });
    };

    /**
     * Gets the currently selected period, if any.
     */
    model.getSelectedPeriod = function() {
        if (model.selectedPeriodId)
            return model.periods[model.selectedPeriodId];
        else {
            return undefined;
        }
    };

    angular.module('odssPlatimApp.model', [])
        .factory('platimModel', [function() {
            return model;
        }])
    ;


})();