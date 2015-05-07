(function() {
'use strict';

angular.module('odssPlatimApp.model', [])
    .factory('platimModel', modelFactory);

modelFactory.$inject = ['utl'];

function modelFactory(utl) {

    var byPlat = {};

    var model = {
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

    if (utl.getDebug()) {
        utl.getDebug().model = model;
    }

    /**
     * Called to update the model with all retrieved platforms.
     */
    model.setAllPlatforms = function(tmls) {
        //console.log("setAllPlatforms", tmls);

        byPlat = {};
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
            byPlat[tml.platform_name] = tml;

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
        _.each(selectedPlatforms, function(platform_name) {
            model.platformOptions.selectedPlatforms[platform_name] = true;
        });
        //console.log("model.platformOptions.selectedPlatforms", model.platformOptions.selectedPlatforms);
    };

    /**
     * Gets the platforms selected according to the platform options.
     */
    model.getSelectedPlatforms = function() {
        //console.log("getSelectedPlatforms");
        var selectedPlatforms = [];
        _.each(model.platformOptions.selectedPlatforms, function(selected, platform_name) {
            if (selected && byPlat[platform_name]) {
                selectedPlatforms.push(byPlat[platform_name]);
            }
        });
        if (selectedPlatforms.length == 0) {
            // else: show only platforms with tokens:
            _.each(byPlat, function(tml, platform_name) {
                if (tml.tokens.length > 0) {
                    selectedPlatforms.push(byPlat[platform_name]);
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

    /**
     * Adds a token to the model.
     */
    model.addToken = function(token) {
        var platform_name = token.platform_name;
        byPlat[platform_name].tokens.push(token);
    };

    /**
     * Updates an token in the model
     */
    model.updateToken = function(tokenInfo) {
        var tokens = byPlat[tokenInfo.platform_name].tokens;
        var modelToken = _.find(tokens, {token_id: tokenInfo.token_id});
        modelToken.platform_name = tokenInfo.platform_name;
        modelToken.state         = tokenInfo.state;
        modelToken.status        = tokenInfo.status;
        modelToken.group         = tokenInfo.group;
        modelToken.ttype         = tokenInfo.ttype;
        modelToken.start         = utl.unparseDate(tokenInfo.start);
        modelToken.end           = utl.unparseDate(tokenInfo.end);
    };

    return model;
}

})();
