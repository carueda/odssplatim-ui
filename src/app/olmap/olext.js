(function() {
'use strict';

angular.module('odssPlatimApp.olmap.ext', [])
    .factory('olExt', olExt)
;

function olExt() {
    return {
        createDragInteraction:  createDragInteraction
    };

    function createDragInteraction(features) {
        return new app.Drag({
            features: features
        });
    }

}

var app = {};

/**
 * @constructor
 * @extends {ol.interaction.Pointer}
 */
app.Drag = function(opts) {
    this.features_ = opts.features;
    //console.log("olExt: this.features_=", this.features_);

    opts.handleDownEvent = app.Drag.prototype.handleDownEvent;
    opts.handleDragEvent = app.Drag.prototype.handleDragEvent;
    opts.handleMoveEvent = app.Drag.prototype.handleMoveEvent;
    opts.handleUpEvent   = app.Drag.prototype.handleUpEvent;

    ol.interaction.Pointer.call(this, opts);

    /**
     * @type {ol.Pixel}
     * @private
     */
    this.coordinate_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.cursor_ = 'pointer';

    /**
     * @type {ol.Feature}
     * @private
     */
    this.feature_ = null;

    /**
     * @type {string|undefined}
     * @private
     */
    this.previousCursor_ = undefined;

};
ol.inherits(app.Drag, ol.interaction.Pointer);

/**
 * Gets the feature in this.features_ at the pixel location.
 * @private
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {ol.Feature} The feature or null.
 */
app.Drag.prototype.getFeatureAtPixel_ = function(evt) {
    var map = evt.map;
    var features = this.features_;
    var feature = null;
    map.forEachFeatureAtPixel(evt.pixel,
        function (feature2, layer) {
            for (var k = 0; k < features.getLength(); k++) {
                var f = features.item(k);
                if (f == feature2) {
                    feature = feature2;
                    break;
                }
            }
        }
    );
    return feature;
};

/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `true` to start the drag sequence.
 */
app.Drag.prototype.handleDownEvent = function(evt) {
    var feature = this.getFeatureAtPixel_(evt);
    if (feature) {
        this.coordinate_ = evt.coordinate;
        this.feature_ = feature;
    }

    return !!feature;
};


/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 */
app.Drag.prototype.handleDragEvent = function(evt) {
    if (!this.coordinate_) {
        return;
    }
    var deltaX = evt.coordinate[0] - this.coordinate_[0];
    var deltaY = evt.coordinate[1] - this.coordinate_[1];

    var geometry = /** @type {ol.geom.SimpleGeometry} */
        (this.feature_.getGeometry());
    geometry.translate(deltaX, deltaY);

    this.coordinate_[0] = evt.coordinate[0];
    this.coordinate_[1] = evt.coordinate[1];
};


/**
 * @param {ol.MapBrowserEvent} evt Event.
 */
app.Drag.prototype.handleMoveEvent = function(evt) {
    if (this.cursor_) {
        var feature = this.getFeatureAtPixel_(evt);
        var element = evt.map.getTargetElement();
        if (feature) {
            if (element.style.cursor != this.cursor_) {
                this.previousCursor_ = element.style.cursor;
                element.style.cursor = this.cursor_;
            }
        } else if (this.previousCursor_ !== undefined) {
            element.style.cursor = this.previousCursor_;
            this.previousCursor_ = undefined;
        }
    }
};


/**
 * @param {ol.MapBrowserEvent} evt Map browser event.
 * @return {boolean} `false` to stop the drag sequence.
 */
app.Drag.prototype.handleUpEvent = function(evt) {
    this.coordinate_ = null;
    this.feature_ = null;
    return false;
};

})();
