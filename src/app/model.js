(function() {
'use strict';

    var model = {

        byPlat:    {},

        platform_ids: [],

        platformOptions: {

            selectedPlatforms:      {}

            // cbtree preparations
            ,allSelected:               false
            ,selectedPlatformTypes:     {}
            ,platformTypeIndeterminate: {}
        },

        holidays: [],
        periods: {},
        selectedPeriodId: undefined
    };

    /**
     * Called to update the model with all retrieved platforms.
     */
    model.setAllPlatforms = function(tmls) {
        //console.log("setAllPlatforms", tmls);

        model.byPlat = {};
        var byPlatformType = model.platformOptions.byPlatformType = {};

        var selectedPlatformTypes     = model.platformOptions.selectedPlatformTypes = {};
        model.platformOptions.allSelected = false;
        var platformTypeIndeterminate = model.platformOptions.platformTypeIndeterminate = {};

        _.each(tmls, function(tml) {
            var typeName = tml.typeName !== undefined ? tml.typeName.toLowerCase() : "?";

            if (byPlatformType[typeName] === undefined) {
                byPlatformType[typeName] = [];
            }
            byPlatformType[typeName].push(tml);
            model.byPlat[tml.platform_id] = tml;

            selectedPlatformTypes[typeName] = false;
            platformTypeIndeterminate[typeName] = false;
        });

        // sort the elements by typeName by platform_name:
        _.each(byPlatformType, function(tmls, typeName) {
            model.platformOptions.byPlatformType[typeName] = _.sortBy(tmls, 'platform_name');
        })
    };

    model.setSelectedPlatforms = function(selectedPlatforms) {
        //console.log("setSelectedPlatforms", selectedPlatforms);
        model.platformOptions.selectedPlatforms = {};
        _.each(selectedPlatforms, function(platform_id) {
            model.platformOptions.selectedPlatforms[platform_id] = true;
        });
        //console.log("model.platformOptions.selectedPlatforms", model.platformOptions.selectedPlatforms);
    };

    /**
     * Gets the platforms selected according to the platform options.
     */
    model.getSelectedPlatforms = function() {
        //console.log("getSelectedPlatforms");
        var selectedPlatforms = [];
        _.each(model.platformOptions.selectedPlatforms, function(selected, platform_id) {
            if (selected && model.byPlat[platform_id]) {
                selectedPlatforms.push(model.byPlat[platform_id]);
            }
        });
        if (selectedPlatforms.length == 0) {
            // else: show only platforms with tokens:
            _.each(model.byPlat, function(tml, platform_id) {
                if (tml.tokens.length > 0) {
                    selectedPlatforms.push(model.byPlat[platform_id]);
                }
            });
        }
        return selectedPlatforms;
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