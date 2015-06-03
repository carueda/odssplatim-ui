(function() {
  'use strict';

  angular.module('odssPlatimApp.olmap.ext', [])
    .factory('olExt', olExt)
  ;

  olExt.$inject = ['utl'];

  function olExt(utl) {
    // similar to styleOverlay but with more prominent lines
    var styleOverlay2 = new ol.style.Style({
      fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
      stroke: new ol.style.Stroke({ color: '#ffcc33', width: 7 }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({ color: '#ffcc33' })
      })
    });

    var hoveredFeature = undefined;

    var wgs84Sphere = new ol.Sphere(6378137);

    return {
      setMouseListener:       setMouseListener,
      createDragHandler:      createDragHandler,
      createModifyHandler:    createModifyHandler,
      createDeleteHandler:    createDeleteHandler,
      createDrawHandler:      createDrawHandler,
      createMeasureHandler:   createMeasureHandler

      ,getPolygonArea:        getPolygonArea
      ,getLineStringLength:   getLineStringLength
    };

    function setMouseListener(map, mouseEnter, mouseLeave, mouseClick, mouseDoubleClick) {
      map.on('pointermove', function(olEvent) {
        //console.log("pointermove pixel=", olEvent.pixel);
        if (olEvent.dragging) {
          leave(olEvent);
          //return;  // could return here to simply remove the tooltip while dragging
        }
        var feature = map.forEachFeatureAtPixel(olEvent.pixel,
          function(feature, layer) { return feature; }
        );
        if (hoveredFeature !== feature) {
          leave(olEvent);
          hoveredFeature = feature;
          enter(olEvent);
        }
      });

      function leave(olEvent) {
        if (hoveredFeature !== undefined) {
          mouseLeave(hoveredFeature, olEvent);
          hoveredFeature = undefined;
        }
      }
      function enter(olEvent) {
        if (hoveredFeature !== undefined) {
          mouseEnter(hoveredFeature, olEvent)
        }
      }

      map.on('click', function(olEvent) {
        //console.log("singleclick pixel=", olEvent.pixel);
        var feature = map.forEachFeatureAtPixel(olEvent.pixel,
          function(feature, layer) { return feature; }
        );
        if (feature) {
          mouseClick(feature, olEvent);
        }
      });

      map.on('dblclick', function(olEvent) {
        //console.log("dblclick pixel=", olEvent.pixel);
        var feature = map.forEachFeatureAtPixel(olEvent.pixel,
          function(feature, layer) { return feature; }
        );
        if (feature) {
          mouseDoubleClick(feature, olEvent);
        }
      });
    }

    function createDragHandler(map, featureOverlay, changeEnded) {
      var selectInteraction = null;
      var dragInteraction = null;

      return {
        setInteraction:    setInteraction,
        unsetInteraction:  unsetInteraction
      };

      function setInteraction() {
        if (!selectInteraction) {
          selectInteraction = new ol.interaction.Select({
            layers: [featureOverlay],
            condition: ol.events.condition.pointerMove,
            style: styleOverlay2
          });
        }
        map.addInteraction(selectInteraction);

        if (!dragInteraction) {
          dragInteraction = new Drag({
            features: featureOverlay.getFeatures()
          }, changeEnded);
        }
        map.addInteraction(dragInteraction);
      }

      function unsetInteraction() {
        if (dragInteraction) {
          map.removeInteraction(dragInteraction);
        }
        if (selectInteraction) {
          map.removeInteraction(selectInteraction);
        }
      }
    }

    function createModifyHandler(map, featureOverlay, changeDetected) {
      var selectInteraction = null;
      var modifyInteraction = null;
      var geometryKeyPairs = [];  // geometries and keys of change listeners

      return {
        setInteraction:    setInteraction,
        unsetInteraction:  unsetInteraction
      };

      function setInteraction() {
        unsetInteraction();
        map.addInteraction(selectInteraction = createSelectInteraction());
        map.addInteraction(modifyInteraction = createModifyInteraction());
      }

      function unsetInteraction() {
        if (modifyInteraction) {
          map.removeInteraction(modifyInteraction);
          modifyInteraction = null;
        }
        if (selectInteraction) {
          map.removeInteraction(selectInteraction);
          selectInteraction = null;
        }
        _.each(geometryKeyPairs, function(pair) {
          pair.geometry.unByKey(pair.geomKey);
        });
        geometryKeyPairs = [];
      }

      function createSelectInteraction() {
        if (!selectInteraction) {
          selectInteraction = new ol.interaction.Select({
            layers: [featureOverlay],
            condition: ol.events.condition.pointerMove,
            style: styleOverlay2
          });

          // add a geometry change listener per feature in the overlay:
          geometryKeyPairs = [];
          featureOverlay.getFeatures().forEach(function(feature) {
            var geometry = feature.getGeometry();
            var geomKey = geometry.on('change', changeDetected);
            geometryKeyPairs.push({geometry: geometry, geomKey: geomKey});
          });
        }

        return selectInteraction;
      }

      function createModifyInteraction() {
        //console.log("createModifyInteraction");
        return new ol.interaction.Modify({
          features: featureOverlay.getFeatures(),
          deleteCondition: function(event) {
            return ol.events.condition.shiftKeyOnly(event) &&
              ol.events.condition.singleClick(event);
          }
        });
      }
    }

    /**
     * Uses a Select interaction with pointerMove condition for immediate visual
     * feedback about the particular feature that would be removed;
     * Actual deletion triggered by shift-clicking on the selected feature.
     */
    function createDeleteHandler(map, featureOverlay, featureRemoved) {
      var selectedFeature = null;
      var clickKey = null;
      var deleteInteraction = null;

      var styleDelete = new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
        stroke: new ol.style.Stroke({ color: '#ff2222', width: 5 }),
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({ color: '#ff2222' })
        })
      });

      return {
        setInteraction:    setInteraction,
        unsetInteraction:  unsetInteraction
      };

      function setInteraction() {
        //console.log("deleteHandler.setDeleteInteraction");
        unsetInteraction();
        deleteInteraction = new ol.interaction.Select({
          layers: [featureOverlay],
          condition: ol.events.condition.pointerMove,
          style: styleDelete
        });
        map.addInteraction(deleteInteraction);

        deleteInteraction.getFeatures().on('add', function() {
          var interactionFeatures = deleteInteraction.getFeatures();
          //console.log("add: interactionFeatures.getLength()=", interactionFeatures.getLength());
          if (interactionFeatures.getLength() === 1) {
            selectedFeature = interactionFeatures.item(0);
            addMapClickListener();
          }
        });

        deleteInteraction.getFeatures().on('remove', function() {
          //console.log("remove: interactionFeatures.getLength()=", deleteInteraction.getFeatures().getLength());
          selectedFeature = null;
          removeMapClickListener();
        });
      }

      function unsetInteraction() {
        if (deleteInteraction) {
          map.removeInteraction(deleteInteraction);
          deleteInteraction = null;
        }
      }

      function addMapClickListener() {
        if (!clickKey) {
          clickKey = map.on('singleclick', function(evt) {
            if (!selectedFeature|| !evt.originalEvent.shiftKey) {
              return;
            }
            var feature = map.forEachFeatureAtPixel(evt.pixel,
              function(feature, layer) { return feature; }
            );
            if (selectedFeature === feature) {
              //console.log("shift-singleclick=", evt);
              removeMapClickListener();
              deleteFeature(feature);
            }
          });
        }
      }

      function removeMapClickListener() {
        if (clickKey) {
          map.unByKey(clickKey);
          clickKey = null;
        }
      }

      function deleteFeature(feature) {
        //console.log("deleteFeature", feature);
        var overlayFeatures = featureOverlay.getFeatures();
        overlayFeatures.remove(feature);
        featureRemoved();
      }
    }

    function createDrawHandler(map, featureOverlay, type, featureAdded) {
      var drawType = type;
      var drawInteraction = null;

      var measureHelper = createMeasureHelper(map, false);

      return {
        setDrawType:       setDrawType,
        setInteraction:    setInteraction,
        unsetInteraction:  unsetInteraction
      };

      function setDrawType(type) {
        if (!type) throw new Error("setDrawType: type required");
        drawType = type;
        if (drawInteraction) {
          setInteraction();
        }
      }

      function setInteraction() {
        unsetInteraction();
        createDrawInteraction();
        map.addInteraction(drawInteraction);
        measureHelper.enable();
      }

      function createDrawInteraction() {
        //console.log("createDrawInteraction drawType=", drawType);
        drawInteraction = new ol.interaction.Draw({
          features: featureOverlay.getFeatures(),
          type: drawType
        });
        drawInteraction.on('drawstart', measureHelper.drawStart);
        drawInteraction.on('drawend', function(e) {
          measureHelper.drawEnd();
          measureHelper.removeElements();
          featureAdded(e.feature);
        });
      }

      function unsetInteraction() {
        if (drawInteraction) {
          map.removeInteraction(drawInteraction);
          drawInteraction = null;
        }
        measureHelper.disable();
      }
    }

    function createMeasureHelper(map) {
      var sketch = null;
      var measureTooltipElement;
      var measureTooltipOverlay;
      var elements = [];  // elements left after drawing so we can remove them later

      return {
        enable:           enable,
        disable:          disable,
        drawEnd:          drawEnd,
        drawStart:        drawStart,
        removeElements:   removeElements,
        drawing:   function() { return sketch !== null; }
      };

      function enable() {
        map.on('pointermove', pointerMoveHandler);
        createMeasureTooltip();
        removeElements();
      }

      function disable() {
        map.un('pointermove', pointerMoveHandler);
      }

      /**
       * Handle pointer move.
       * @param {ol.MapBrowserEvent} evt
       */
      function pointerMoveHandler(evt) {
        if (evt.dragging) {
          return;
        }
        var tooltipCoord = evt.coordinate;

        if (sketch) {
          var output = '';
          var geom = (sketch.getGeometry());
          if (geom instanceof ol.geom.Polygon) {
            var area = getPolygonArea(map, /** @type {ol.geom.Polygon} */ (geom));
            output = utl.formatArea(area);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();
          }
          else if (geom instanceof ol.geom.LineString) {
            var length = getLineStringLength(map, /** @type {ol.geom.LineString} */ (geom));
            output = utl.formatLength(length);
            tooltipCoord = geom.getLastCoordinate();
          }
          else if (geom instanceof ol.geom.Point) {
            var c = geom.getCoordinates();
            // convert to lat/lon
            var ll = ol.proj.transform(c, 'EPSG:3857', 'EPSG:4326');
            output = ll[0].toFixed(6) + ", " + ll[1].toFixed(6);
            tooltipCoord = geom.getLastCoordinate();
          }
          measureTooltipElement.innerHTML = output;
          measureTooltipOverlay.setPosition(tooltipCoord);
        }
      }

      function drawStart(evt) {
        sketch = evt.feature;
      }

      function drawEnd() {
        if (measureTooltipElement) {
          measureTooltipElement.className = 'mt-tooltip mt-tooltip-static';
          measureTooltipOverlay.setOffset([0, -7]);
          elements.push(measureTooltipElement);
          measureTooltipElement = null;
        }
        sketch = null;
        // unset tooltip so that a new one can be created
        createMeasureTooltip();
      }

      function createMeasureTooltip() {
        removeElement(measureTooltipElement);
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'mt-tooltip mt-tooltip-measure';
        measureTooltipOverlay = new ol.Overlay({
          element: measureTooltipElement,
          offset: [0, -15],
          positioning: 'bottom-center'
        });
        map.addOverlay(measureTooltipOverlay);
      }

      function removeElements() {
        _.each(elements, removeElement);
        elements = [];
      }
    }

    /**
     * Adapted from http://openlayers.org/en/v3.5.0/examples/measure.html
     */
    function createMeasureHandler(map, type) {
      var drawType = type;
      var drawInteraction = null;

      var measureHelper = createMeasureHelper(map);

      var source = new ol.source.Vector();
      var vector = new ol.layer.Vector({
        source: source
        ,style: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: '#C8FC10', width: 2, lineDash: [5, 5]})
          ,fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.1)'})
        })
      });

      return {
        setDrawType:       setDrawType,
        setInteraction:    setInteraction,
        unsetInteraction:  unsetInteraction,
        drawing:           measureHelper.drawing,
        clearVector:       clearVector
      };

      function setDrawType(type) {
        if (!type) throw new Error("setDrawType: type required");
        drawType = type;
        if (drawInteraction) {
          setInteraction();
        }
      }

      function setInteraction() {
        unsetInteraction();
        createInteraction();
        map.addLayer(vector);
        map.addInteraction(drawInteraction);
        measureHelper.enable();
      }

      function createInteraction() {
        drawInteraction = new ol.interaction.Draw({
          source: source,
          type: drawType
          ,style: new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#C8FC10', width: 3, lineDash: [5, 5]})
            ,fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.2)'})
            ,image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#C8FC10'})})
          })
        });
        drawInteraction.on('drawstart', measureHelper.drawStart);
        drawInteraction.on('drawend', measureHelper.drawEnd);
      }

      function unsetInteraction() {
        if (drawInteraction) {
          map.removeInteraction(drawInteraction);
          drawInteraction = null;
        }
        measureHelper.disable();
      }

      function clearVector() {
        measureHelper.drawEnd();
        source.clear();
        measureHelper.removeElements();
      }
    }

    /**
     * @param {ol.geom.Polygon} polygon
     */
    function getPolygonArea(map, polygon) {
      var sourceProj = map.getView().getProjection();
      var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(sourceProj, 'EPSG:4326'));
      var coordinates = geom.getLinearRing(0).getCoordinates();
      return Math.abs(wgs84Sphere.geodesicArea(coordinates));
    }

    /**
     * @param {ol.geom.LineString} lineString
     */
    function getLineStringLength(map, lineString) {
      var coordinates = lineString.getCoordinates();
      var length = 0;
      var sourceProj = map.getView().getProjection();
      for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
        var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
        var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
        length += wgs84Sphere.haversineDistance(c1, c2);
      }
      return length;
    }

    function removeElement(element) {
      if (element &&  element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  }

  /**
   * Adapted from: http://openlayers.org/en/v3.4.0/examples/drag-features.html
   * @constructor
   * @extends {ol.interaction.Pointer}
   */
  var Drag = function(opts, dragEnd) {
    this.features_ = opts.features;
    this.dragEnd_  = dragEnd;
    //console.log("olExt: this.features_=", this.features_);

    opts.handleDownEvent = Drag.prototype.handleDownEvent;
    opts.handleDragEvent = Drag.prototype.handleDragEvent;
    opts.handleMoveEvent = Drag.prototype.handleMoveEvent;
    opts.handleUpEvent   = Drag.prototype.handleUpEvent;

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
  ol.inherits(Drag, ol.interaction.Pointer);

  /**
   * Gets the feature in this.features_ at the pixel location.
   * @private
   * @param {ol.MapBrowserEvent} evt Map browser event.
   * @return {ol.Feature} The feature or null.
   */
  Drag.prototype.getFeatureAtPixel_ = function(evt) {
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
  Drag.prototype.handleDownEvent = function(evt) {
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
  Drag.prototype.handleDragEvent = function(evt) {
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
  Drag.prototype.handleMoveEvent = function(evt) {
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
  Drag.prototype.handleUpEvent = function(evt) {
    this.coordinate_ = null;
    this.feature_ = null;

    if (typeof this.dragEnd_ === 'function') {
      this.dragEnd_(evt);
    }

    return false;
  };

})();
