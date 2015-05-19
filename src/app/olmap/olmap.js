(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives', 'odssPlatimApp.olmap.ext'])
    .controller('MapCtrl', MapCtrl)
    .factory('olMap', olMap)
;

var DEFAULT_DRAW_TYPE = "Polygon";

MapCtrl.$inject = ['$scope', 'olMap', 'timelineWidget'];

function MapCtrl($scope, olMap, timelineWidget) {
    olMap.insertMap();

    var vm = {
        mode: {
            modeList: [
                {
                    name: "View",
                    tooltip: "<div class='tooltip190'>" +
                        "View-only mode.<br/>" +
                        "Select (click) a timeline token above to enable edit options" +
                        " for corresponding geometries" +
                        "</div>"
                },
                {
                    name: "Move",
                    tooltip: "<div class='tooltip190'>" +
                        "<ul>" +
                        "<li>Hover pointer over component</li>" +
                        "<li>Drag to desired position</li>" +
                        "</ul>" +
                        "</div>"
                },
                {
                    name: "Modify",
                    tooltip: "<div class='tooltip190'>" +
                        "<ul>" +
                        "<li>Hover pointer over component</li>" +
                        "<li>Depending on type:" +
                            "<ul>" +
                                "<li>Drag vertex to change position</li>" +
                                "<li>Click to add a vertex</li>" +
                                "<li>Shift-click to remove a vertex</li>" +
                            "</ul>" +
                        "</li>" +
                        "</div>"
                },
                {
                    name: "Delete",
                    tooltip: "<div class='tooltip190'>" +
                        "<ul>" +
                        "<li>Hover pointer over component</li>" +
                        "<li>Shift-click to delete</li>" +
                        "</ul>" +
                        "</div>"
                },
                {
                    name: "Add",
                    tooltip: "<div class='tooltip190'>" +
                        "<ul>" +
                        "<li>Select geometry type</li>" +
                        "<li>Click map to start drawing</li>" +
                        "<li>Depending on type:" +
                            "<ul>" +
                                "<li>Double click to complete</li>" +
                            "</ul>" +
                        "</li>" +
                        "</div>"
                }
            ],
            selectedMode: "View"
        },
        viewOnly: true,
        draw: {
            typeList: [
                {name: "Polygon",    value: ol.geom.GeometryType.POLYGON},
                {name: "LineString", value: ol.geom.GeometryType.LINE_STRING},
                {name: "Point",      value: ol.geom.GeometryType.POINT}
            ],
            selectedType: DEFAULT_DRAW_TYPE
        }
    };
    $scope.vm = vm;

    $scope.$watch('vm.mode.selectedMode', function(mode, prevMode) {
        if (!olMap.setMode(mode)) {
            vm.mode.selectedMode = prevMode;
        }
    });

    $scope.$watch('vm.draw.selectedType', olMap.setDrawInteraction);

    $scope.$on("tokenMouseEnter", function(e, token) {
        olMap.setTokenMouseEnter(token.id);
    });
    $scope.$on("tokenMouseLeave", function(e, token) {
        olMap.setTokenMouseLeave(token.id);
    });

    $scope.$on("tokenSelection", function(e, selected) {
        vm.viewOnly = selected.length != 1;
        if (vm.viewOnly) {
            vm.mode.selectedMode = "View";
        }
        olMap.setTokenSelection(selected);
    });

    $scope.$on("refreshStarting", function() {
        //console.log("=== on refreshStarting");
        olMap.reinit();
        vm.mode.selectedMode = "View";
        vm.viewOnly = olMap.getTokenSelection().length != 1;
    });

    $scope.keyDown = function($event) {
      if ($event.keyCode === 27) {
        timelineWidget.clearSelection();
      }
    };
}

olMap.$inject = ['$rootScope', '$timeout', '$window', 'olExt', 'cfg'];

function olMap($rootScope, $timeout, $window, olExt, cfg) {
    var styles = getStyles();

    var gmap, view;
    var map, featureOverlay;

    var dragHandler, modifyHandler, deleteHandler, drawHandler;
    var drawGeomId = undefined;  // captured prior to enabling drawHandler

    var geoInfoById = {};

    var currentMode = "View";

    var tokenSelection = [];
    var editInfo = {
        editingToken: null,
        geometryString: null
    };

    return {
        insertMap:           insertMap
        ,reinit:             reinit
        ,addGeometry:        addGeometry
        ,removeGeometry:     removeGeometry
        ,getTokenSelection:  getTokenSelection
        ,setTokenMouseEnter: setTokenMouseEnter
        ,setTokenMouseLeave: setTokenMouseLeave
        ,setTokenSelection:  setTokenSelection
        ,setMode:            setMode
        ,setDrawInteraction: setDrawInteraction
        ,setCenter:          setCenter
        ,setZoom:            setZoom
    };

    function insertMap() {
        gmap = createGMap();
        view = createView();

        var olMapDiv = document.getElementById('omap2');
        map = new ol.Map({
            layers: [],  // none as we are integrating the google map via external mechanism
            interactions: ol.interaction.defaults({
                altShiftDragRotate: false,
                dragPan: false,
                rotate: false
            }).extend([
                new ol.interaction.DragPan({kinetic: null})
                ,new ol.interaction.DragBox({
                    condition: ol.events.condition.shiftKeyOnly,
                    style: new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: [255, 255, 255, 2],
                            lineDash: [10, 10]
                        })
                    })
                })
            ]),
            controls: ol.control.defaults({
            }).extend([
                new ol.control.MousePosition({
                    coordinateFormat: ol.coordinate.createStringXY(4),
                    projection: 'EPSG:4326',
                    className: 'custom-mouse-position',
                    //target: document.getElementById('mouse-position'),
                    undefinedHTML: ' '
                })
            ]),
            target: olMapDiv,
            view: view
        });

        view.on('change:center', syncMapMove);
        view.on('change:resolution', function() {
            //console.log("change:resolution", view.getZoom());
            gmap.setZoom(view.getZoom());
        });
        map.on('moveend', syncMapMove);

        setCenter([cfg.map.center.lon, cfg.map.center.lat]);
        setZoom(10);

        olMapDiv.parentNode.removeChild(olMapDiv);
        gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(olMapDiv);

        createFeatureOverlay();

        olExt.setMouseListener(map,
          function mouseEnter(feature, olEvent) {
            var tokenId = feature.get('geomId');
            //console.log("mouseEnter tokenId=", tokenId);
            if (tokenId) {
              $rootScope.$broadcast("evtGeometryMouseEnter", tokenId, olEvent.originalEvent);
            }
          },
          function mouseLeave(feature, olEvent) {
            var tokenId = feature.get('geomId');
            if (tokenId) {
              $rootScope.$broadcast("evtGeometryMouseLeave", tokenId, olEvent.originalEvent);
            }
          },
          function mouseClick(feature, olEvent) {
            var tokenId = feature.get('geomId');
            if (tokenId) {
              //console.log("mouseClick tokenId=", tokenId);
              $rootScope.$broadcast("evtGeometryMouseClick", tokenId, olEvent.originalEvent);
            }
          }
        );

        dragHandler   = olExt.createDragHandler(map, featureOverlay, changeEnded);
        modifyHandler = olExt.createModifyHandler(map, featureOverlay, changeDetected);
        deleteHandler = olExt.createDeleteHandler(map, featureOverlay, changeEnded);
        drawHandler   = olExt.createDrawHandler(map, featureOverlay, DEFAULT_DRAW_TYPE, featureAdded);

        function syncMapMove() {
            //console.log('syncMapMove', view.getCenter());
            var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
            gmap.setCenter(new google.maps.LatLng(center[1], center[0]));

            // NOTE: only the 2 lines above are enough for correct sync when the planning editor
            // is run outside of the main ODSS.
            //
            // #133: "planning editor: Map sync issues when editor included directly within main ODSS"
            // But within the ODSS, there are issues, and the following is to try to lessen the bad map syncing
            // upon resizing of the window or container.  Tested on odss-test with some success but the problem
            // still happens sometimes, although much less frequently.
            //
            // UPDATE 2015-05-19: Not actually doing the adjustment, see below.
            /* -----
            if (!skipMapSync) {
                // Basically, here we also "schedule" a post-update to run in a second from now:
                syncMapPostAdjustTime = new Date().getTime() + 1000;
            }
            ----- */
        }

        // do the additional adjustments unless both "?debug" and "skipMapSync" are present in window location.
        // This helps easily turn off the adjustment to demonstrate original problem.
        //
        // UPDATE 2015-05-19: Actually now always skip this post-update because the planning editor is
        // again included in ODSS via iframe, so we don't have the issue.
        /* ------
        var skipMapSync = !!(utl.getDebug() && utl.getDebug().skipMapSync);
        console.log("#133: skipMapSync=", skipMapSync);
        var syncMapPostAdjustTime = 0;
        if (!skipMapSync) {
            setInterval(function () {   // this timer checks if there's a pending post-update
                if (syncMapPostAdjustTime > 0 && new Date().getTime() >= syncMapPostAdjustTime) {
                    syncMapPostAdjustTime = 0;
                    updateSize();                // this alone seems to address a good fraction of the misbehavior
                    setTimeout(updateSize, 500); // this extra update helps a bit more, but it's not always enough
                }
            }, 500);
            setTimeout(updateSize, 250); // the very initial update seems to always work fine.
        }
        ----- */

        function updateSize() {
            google.maps.event.trigger(gmap, 'resize');
            map.updateSize();
        }

        (function prepareAdjustMapUponWindowResize() {
          var mapContainer = document.getElementById('olmap');
          var marginBottom = 5;

          angular.element($window).bind('resize', function() {
            $timeout(updateWindowSize);
          });

          $timeout(updateWindowSize, 700);

          function updateWindowSize() {
            var rect = mapContainer.getBoundingClientRect();
            var restWindowHeight = $window.innerHeight - rect.top - marginBottom;
            if (restWindowHeight < cfg.map.minHeight) {
              restWindowHeight = cfg.map.minHeight;
            }
            mapContainer.style.height = restWindowHeight + 'px';
            updateSize();
          }
        })();
    }

    function reinit() {
        clearFeaturesOverlay();
        tokenSelection = [];
        if (map) {
            map.getLayers().clear();
        }
    }

    /**
     * Adds a geometry to the map.
     * @param geomId    ID of geometry
     * @param geometry  GeoJSON object
     */
    function addGeometry(geomId, geometry) {
        //console.log("addGeometry geomId=", geomId, "geometry=", geometry);

        var object = geometry;
        if (!object.crs) {
            // TODO perhaps force crs to always be stored.
            // for now, just manually assigning our "well-known" crs.
            object.crs = {
                type: 'name',
                properties: {'name': 'EPSG:4326'}
            };
        }

        var vectorSource = new ol.source.GeoJSON({
            projection: 'EPSG:3857',
            object: object
        });

        vectorSource.forEachFeature(function(feature) {
          //console.log("addGeometry: setting geomId=", geomId);
          feature.set('geomId', geomId);
        });

        var vectorLayer = new ol.layer.Vector({
            source: vectorSource,
            style:  styles.styleNormal
        });
        map.addLayer(vectorLayer);
        geoInfoById[geomId] = {layer: vectorLayer};
    }

    /**
     * Removes a geometry from the map.
     * @param geomId    ID of geometry
     */
    function removeGeometry(geomId) {
        console.log("removeGeometry geomId=", geomId);
        var info = geoInfoById[geomId];
        if (info && info.layer) {
            map.removeLayer(info.layer);
            delete geoInfoById[geomId];
        }
        if (editInfo.editingToken) {
            editInfo.editingToken = null;
            editInfo.geometryString = null;
        }
        clearFeaturesOverlay();
    }

    function getTokenSelection() {
        return tokenSelection;
    }

    function setTokenMouseEnter(tokenId) {
        updateStyleForMouseOver(tokenId, true);
    }

    function setTokenMouseLeave(tokenId) {
        updateStyleForMouseOver(tokenId, false);
    }

    function setTokenSelection(selectedTokens) {
        //console.log("******* setTokenSelection=", selectedTokens, "currentMode=", currentMode);
        if (currentMode !== "View") {
            leaveEditMode(currentMode);
        }

        tokenSelection = selectedTokens;
        updateStylesForSelection();

        if (currentMode !== "View") {
            if (tokenSelection.length === 1) {
                enterEditMode(currentMode);
            }
        }
    }

    function setMode(mode) {
        //console.log("setMode: currentMode=", currentMode, " setMode=", mode);
        if (currentMode === mode) {
            return true;
        }
        var ok = true;

        if (currentMode === "View") {
            if (!enterEditMode(mode)) {
                ok = false;
            }
        }
        else {
            leaveEditMode(currentMode);
            updateStylesForSelection();
            if (mode !== "View") {
                if (!enterEditMode(mode)) {
                    ok = false;
                }
            }
        }

        if (ok) {
            currentMode = mode;
        }
        return ok;
    }

    /**
     * Sets interaction according to given edit mode
     */
    function enterEditMode(mode) {
        if (tokenSelection.length != 1) {
            return false;
        }

        var token = tokenSelection[0];

        if (!startEditing(token)) {
            return false;
        }

        if (mode === "Move") {
            dragHandler.setInteraction();
        }
        else if (mode === "Modify") {
            modifyHandler.setInteraction();
        }
        else if (mode === "Delete") {
            deleteHandler.setInteraction();
        }
        else if (mode === "Add") {
            drawGeomId = token.id;
            drawHandler.setInteraction();
        }
        else throw new Error("unexpected mode='" + mode + "'");

        return true;
    }

    function leaveEditMode(mode) {
        endEditing();
        if (mode === "Move") {
            dragHandler.unsetInteraction();
        }
        else if (mode === "Modify") {
            modifyHandler.unsetInteraction();
        }
        else if (mode === "Delete") {
            deleteHandler.unsetInteraction();
        }
        else if (mode === "Add") {
            drawHandler.unsetInteraction();
        }
        else throw new Error("unexpected mode='" + mode + "'");
    }

    function updateStyleForMouseOver(tokenId, enter) {
        var info = geoInfoById[tokenId];
        if (info && info.layer) {
            if (enter) {
                if (info.saveStyle !== styles.styleSelected) {
                    info.saveStyle = info.layer.getStyle();
                    info.layer.setStyle(styles.styleMouseEntered);
                }
            }
            else {
                info.layer.setStyle(info.saveStyle ? info.saveStyle : styles.styleNormal);
            }
        }
    }

    function updateStylesForSelection() {
        var selectedGeomIds = _.map(tokenSelection, "id");
        //console.log("selectedGeomIds=", selectedGeomIds);
        _.each(geoInfoById, function(info, geomId) {
            if (_.contains(selectedGeomIds, geomId)) {
                info.layer.setStyle(info.saveStyle = styles.styleSelected);
            }
            else {
                info.layer.setStyle(info.saveStyle = styles.styleNormal);
            }
        });
    }

    function startEditing(token) {
        //console.log("startEditing token=", token);
        if (!token.geometry) {
            console.log("WARN: startEditing id=", token.id, " doesn't have geometry");
            return false;
        }
        var geomId = token.id;
        var info = geoInfoById[geomId];
        if (!info || !info.layer) {
            console.log("WARN: startEditing geomId=", geomId, "no such vector");
            return false;
        }
        //console.log("startEditing geomId=", geomId, "info=", info);

        if (editInfo.editingToken) {
            endEditing();
        }

        editInfo.editingToken = token;
        editInfo.geometryString = getGeometryString(info.layer);

        var rm = map.removeLayer(info.layer);
        if ( rm !== info.layer) {
            console.warn("removeLayer")
        }

        var source = info.layer.getSource();
        var features = source.getFeatures();
        addFeaturesToOverlay(features);
        return true;
    }

    function addFeaturesToOverlay(features) {
        //console.log("addFeaturesToOverlay", features);
        for (var ii = 0; ii < features.length; ii++) {
            var feature = features[ii];
            featureOverlay.addFeature(feature);
        }
        //console.log("---startEditing, overlayFeatures=", featureOverlay.getFeatures().getLength());
    }

    /**
     * Just broadcasts tokenGeometryUpdated but does not change current edit mode.
     */
    function changeDetected() {
        if (editInfo.editingToken) {
            var token = editInfo.editingToken;
            var vectorLayer = createLayerFromOverlay();
            updateTokenGeometryAndNotify(token, vectorLayer);
        }
    }

    function endEditing() {
        if (editInfo.editingToken) {
            var token = editInfo.editingToken;
            var vectorLayer = createLayerFromOverlay();
            map.addLayer(vectorLayer);
            updateTokenGeometryAndNotify(token, vectorLayer);
            geoInfoById[token.id].layer = vectorLayer;
            editInfo.editingToken = null;
            editInfo.geometryString = null;
        }
        clearFeaturesOverlay();
    }

    /**
     * Updates token.geometry and broadcasts tokenGeometryUpdated if the new
     * geometry is different from the one saved in editInfo.geometryString.
     */
    function updateTokenGeometryAndNotify(token, vectorLayer) {
        var geometryString = getGeometryString(vectorLayer);
        if (editInfo.geometryString !== geometryString) {
            token.geometry = angular.fromJson(geometryString);
            //console.log("---changeDetected token.geometry=", token.geometry);
            $rootScope.$broadcast("tokenGeometryUpdated", token.id, token.geometry);
        }
    }

    function getGeometryString(vectorLayer) {
        var features = vectorLayer.getSource().getFeatures();
        var jsonFormat = new ol.format.GeoJSON();
        return jsonFormat.writeFeatures(features, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        });
    }

    // returns new layer with features in overlay
    function createLayerFromOverlay() {
        var overlayFeatures = featureOverlay.getFeatures();
        //console.log("---createLayerFromOverlay, overlayFeatures=", overlayFeatures.getLength());

        var vectorSource = new ol.source.GeoJSON({
            projection: 'EPSG:3857',
            object: {
                type: 'FeatureCollection',
                crs: {
                    type: 'name',
                    properties: {'name': 'EPSG:4326'}
                }
                , features: []
            }
        });
        for(var ii = 0; ii < overlayFeatures.getLength(); ii++) {
            var feature = overlayFeatures.item(ii);
            vectorSource.addFeature(feature);
        }
        return new ol.layer.Vector({
            source: vectorSource,
            style:  styles.styleNormal
        });
    }

    function setCenter(ll) {
        view.setCenter(transform(ll));
    }

    function setZoom(z) {
        view.setZoom(z);
    }

    ////////////////////////////////////////////////////////////////////////
    // private

    function transform(ll) {
        return ol.proj.transform(ll, 'EPSG:4326', 'EPSG:3857');
    }

    function createGMap() {
        return new google.maps.Map(document.getElementById('gmap2'), {
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            disableDefaultUI: true,
            keyboardShortcuts: false,
            draggable: false,
            disableDoubleClickZoom: true,
            scrollwheel: false,
            streetViewControl: false
        });
    }

    function createView() {
        return new ol.View({
            maxZoom: 21  // "make sure the view doesn't go beyond the 22 zoom levels of Google Maps"
        });
    }

    function createFeatureOverlay() {
        featureOverlay = new ol.FeatureOverlay({
            style: styles.styleOverlay
        });
        featureOverlay.setMap(map);
    }

    /**
     * Called by the controller when the user selects a draw type.
     * @param type {ol.geom.GeometryType} draw type
     */
    function setDrawInteraction(type) {
        drawHandler.setDrawType(type);
    }

    /**
     * Callback for when a draw action (i.e., new feature) completes.
     */
    function featureAdded(feature) {
        //console.log("featureAdded drawGeomId=", drawGeomId, "feature=", feature);
        feature.set('geomId', drawGeomId);
        changeEnded();
    }

    /**
     * Common callback for when any edit action completes
     */
    function changeEnded() {
        leaveEditMode(currentMode);
        enterEditMode(currentMode);
    }

    function clearFeaturesOverlay() {
        if (featureOverlay) {
            var overlayFeatures = featureOverlay.getFeatures();
            if (overlayFeatures) {
                //console.log("!!!clearFeaturesOverlay, overlayFeatures=", overlayFeatures);
                overlayFeatures.clear();
            }
        }
    }

    function getStyles() {
        return {
            styleNormal: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.1)'}),
                stroke: new ol.style.Stroke({color: '#4deaf4', width: 3})
                ,image: new ol.style.Circle({
                    radius: 3,
                    fill: new ol.style.Fill({ color: '#4deaf4' })
                })
            })

            ,styleMouseEntered: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.1)'}),
                stroke: new ol.style.Stroke({color: '#4deaf4', width: 6})
                ,image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: '#4deaf4' })
                })
            })

            ,styleSelected: new ol.style.Style({
                fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.2)' }),
                stroke: new ol.style.Stroke({color: '#f2ea00', width: 4})
                ,image: new ol.style.Circle({
                    radius: 4,
                    fill: new ol.style.Fill({ color: '#f2ea00' })
                })
            })

            ,styleOverlay: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
                stroke: new ol.style.Stroke({ color: '#ffcc33', width: 5 }),
                image: new ol.style.Circle({
                    radius: 6,
                    fill: new ol.style.Fill({ color: '#ffcc33' })
                })
            })
        };
    }
}

})();
