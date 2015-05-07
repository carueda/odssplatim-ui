(function() {
'use strict';

angular.module('odssPlatimApp.model', [])
    .factory('platimModel', modelFactory);

modelFactory.$inject = ['utl'];

function modelFactory(utl) {

    var priv = {
        // platforms set via setAllPlatforms
        platformsByName: {},

        // tokens added via addToken
        tokensById: {}
    };

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
        utl.getDebug().model = {
            model: model,
            private: priv
        };
    }

    /**
     * Called to update the model with all retrieved platforms.
     * This method basically initializes the model with the given
     * platforms, and no tokens associated so far.
     */
    model.setAllPlatforms = function(tmls) {
        //console.log("setAllPlatforms", tmls);

        priv.platformsByName = {};
        _.each(tmls, function(tml) {
            priv.platformsByName[tml.platform_name] = tml;
        });

        priv.tokensById = {};
        // Note: no tokens are expected to be associated in the tmls.
        // Tokens are added via addToken.
        // Associated tokens are reported by getSelectedPlatforms.

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
     * Each object in the returned array will contain a 'tokens' attribute
     * with the array of associated tokens as provided via calls to addToken.
     */
    model.getSelectedPlatforms = function() {
        //console.log("getSelectedPlatforms");
        var selectedPlatforms = [];
        _.each(model.platformOptions.selectedPlatforms, function(selected, platform_name) {
            if (selected && priv.platformsByName[platform_name]) {
                var tml = priv.platformsByName[platform_name];
                selectedPlatforms.push(_.clone(tml, true));
            }
        });

        // set associated tokens:
        if (selectedPlatforms.length > 0) {
            var allTokens = _.values(priv.tokensById);
            _.each(selectedPlatforms, function(tml) {
                tml.tokens = _.filter(allTokens, {platform_name: tml.platform_name});
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
        priv.tokensById[token.token_id] = token;
    };

    /**
     * Updates a token in the model.
     * The token is added if not already in the model.
     */
    model.updateToken = function(token) {
        var modelToken = priv.tokensById[token.token_id];
        if (!modelToken) {
            modelToken = priv.tokensById[token.token_id] = token;
        }

        // some of the following may be redundant but OK
        modelToken.platform_name = token.platform_name;
        modelToken.state         = token.state;
        modelToken.status        = token.status;
        modelToken.group         = token.group;
        modelToken.ttype         = token.ttype;
        modelToken.start         = utl.unparseDate(token.start);
        modelToken.end           = utl.unparseDate(token.end);
    };

    /**
     * Removes a token from the model.
     */
    model.deleteToken = function(token) {
        delete priv.tokensById[token.token_id];
    };

    return model;
}

})();
