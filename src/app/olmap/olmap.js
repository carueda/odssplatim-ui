(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives', 'odssPlatimApp.olmap.ext'])
    .controller('MapCtrl', MapCtrl)
    .factory('olMap', olMap)
;

MapCtrl.$inject = ['$scope', 'olMap'];

function MapCtrl($scope, olMap) {
    olMap.insertMap();

    var vm = {
        mode: {
            modeList: [
                {
                    name: "View",
                    tooltip: "View-only mode"
                },
                {
                    name: "Move",
                    tooltip: "Move selected geometry"
                },
                {
                    name: "Modify",
                    tooltip: "Modify selected geometry"
                },
                {
                    name: "Delete",
                    tooltip: "<div style='width: 140px'>Shift-click on the particular geometry to be deleted</div>"
                },
                {
                    name: "Add",    tooltip: "Add geometry to selected token"
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
            selectedType: "Polygon"
        }
    };
    $scope.vm = vm;

    $scope.$watch('vm.mode.selectedMode', function(mode, prevMode) {
        if (!olMap.setMode(mode)) {
            vm.mode.selectedMode = prevMode;
        }
    });

    $scope.$watch('vm.draw.selectedType', olMap.setDrawInteraction);

    $scope.$on("tokenMouseOver", function(e, tokenId, enter) {
        olMap.setTokenMouseOver(tokenId, enter);
    });

    $scope.$on("tokenSelection", function(e, selected) {
        vm.viewOnly = selected.length != 1;
        olMap.setTokenSelection(selected);
    });

    $scope.$on("refreshStarting", function() {
        //console.log("=== on refreshStarting");
        olMap.reinit();
        vm.mode.selectedMode = "View";
        vm.viewOnly = olMap.getTokenSelection().length != 1;
    });
}

olMap.$inject = ['$rootScope', 'olExt'];

function olMap($rootScope, olExt) {
    var styles = getStyles();

    var gmap, view;
    var map, featureOverlay;
    var drawInteraction, modifyInteraction, deleteInteraction, dragInteraction;
    var geoInfoById = {};

    var currentMode = "View";

    // draw type when drawInteraction is enabled
    var drawType = "Polygon";

    var tokenSelection = [];
    var editInfo = {
        editingToken: null
    };

    return {
        insertMap:           insertMap
        ,reinit:             reinit
        ,addGeometry:        addGeometry
        ,getTokenSelection:  getTokenSelection
        ,setTokenMouseOver:  setTokenMouseOver
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

        setCenter([-122.23, 36.83]);
        setZoom(10);

        olMapDiv.parentNode.removeChild(olMapDiv);
        gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(olMapDiv);

        createFeatureOverlay();

        createDragInteraction();
        createModifyInteraction();

        function syncMapMove() {
            //console.log('syncMapMove', view.getCenter());
            var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
            gmap.setCenter(new google.maps.LatLng(center[1], center[0]));
        }
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
        //console.warn("addGeometry geomId=", geomId, "geometry=", geometry);

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

        var vectorLayer = new ol.layer.Vector({
            source: vectorSource,
            style:  styles.styleNormal
        });
        map.addLayer(vectorLayer);
        geoInfoById[geomId] = {layer: vectorLayer};
    }

    function getTokenSelection() {
        return tokenSelection;
    }

    function setTokenMouseOver(tokenId, enter) {
        //console.log("setTokenMouseOver tokenId=", tokenId, "enter=", enter);
        updateStyleForMouseOver(tokenId, enter);
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
        console.log("setMode: currentMode=", currentMode, " setMode=", mode);
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

    function enterEditMode(mode) {
        if (tokenSelection.length != 1) {
            return false;
        }

        if (!startEditing(tokenSelection[0])) {
            return false;
        }

        if (mode === "Move") {
            //createDragInteraction();
            console.log("enterEditMode: adding dragInteraction");
            map.addInteraction(dragInteraction);
        }
        else if (mode === "Modify") {
            console.log("enterEditMode: adding modifyInteraction");
            map.addInteraction(modifyInteraction);
        }
        else if (mode === "Delete") {
            setDeleteInteraction();
        }
        else if (mode === "Add") {
            setDrawInteraction(drawType, "Add");
        }
        else throw new Error("unexpected mode='" + mode + "'");

        return true;
    }

    function leaveEditMode(mode) {
        endEditing();
        if (mode === "Move") {
            //console.log("leaveEditMode: removing dragInteraction=", dragInteraction);
            map.removeInteraction(dragInteraction);
        }
        else if (mode === "Modify") {
            //console.log("leaveEditMode: removing modifyInteraction=", modifyInteraction);
            map.removeInteraction(modifyInteraction);
        }
        else if (mode === "Delete") {
            //console.log("leaveEditMode: removing deleteInteraction=", deleteInteraction);
            map.removeInteraction(deleteInteraction);
        }
        else if (mode === "Add") {
            console.log("leaveEditMode: removing drawInteraction=", drawInteraction);
            map.removeInteraction(drawInteraction);
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
        var selectedGeomIds = _.map(tokenSelection, "token_id");
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
        if (!token.geometry) {
            console.log("WARN: startEditing token_id=", token.token_id, " doesn't have geometry");
            return false;
        }
        var geomId = token.token_id;
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
        console.log("---startEditing, overlayFeatures=", featureOverlay.getFeatures().getLength());
    }

    function endEditing() {
        if (editInfo.editingToken) {
            var token = editInfo.editingToken;
            editInfo.editingToken = null;
            var vectorLayer = createLayerFromOverlay();
            geoInfoById[token.token_id].layer = vectorLayer;
            map.addLayer(vectorLayer);

            // update token.geometry and notify:
            var features = vectorLayer.getSource().getFeatures();
            var jsonFormat = new ol.format.GeoJSON();
            var geometryString = jsonFormat.writeFeatures(features, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            });
            token.geometry = angular.fromJson(geometryString);
            console.warn("---endEditing token.geometry=", token.geometry);
            $rootScope.$broadcast("tokenGeometryUpdated", token.token_id, token.geometry);
        }
        clearFeaturesOverlay();
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
        // "The features are not added to a regular vector layer/source,
        // but to a feature overlay which holds a collection of features.
        // This collection is passed to the modify and also the draw
        // interaction, so that both can add or modify features."
        featureOverlay = new ol.FeatureOverlay({
            style: styles.styleOverlay
        });
        featureOverlay.setMap(map);
    }

    function createModifyInteraction() {
        modifyInteraction = new ol.interaction.Modify({
            features: featureOverlay.getFeatures(),
            // "the SHIFT key must be pressed to delete vertices, so
            // that new vertices can be drawn at the same position
            // of existing vertices"
            deleteCondition: function(event) {
                return ol.events.condition.shiftKeyOnly(event) &&
                    ol.events.condition.singleClick(event);
            }
        });
    }

    /**
     * Sets a Select interaction with pointerMove condition for immediate visual
     * feedback about the particular feature that would be removed;
     * Actual deletion triggered by shift-clicking on the selected feature.
     */
    function setDeleteInteraction() {
        console.log("setDeleteInteraction");
        if (deleteInteraction) {
            map.removeInteraction(deleteInteraction);
        }
        deleteInteraction = new ol.interaction.Select({
            layers: [featureOverlay],
            condition: ol.events.condition.pointerMove,
            style: styles.styleDelete
        });
        map.addInteraction(deleteInteraction);

        var selectedFeature = null;
        var clickKey = null;

        deleteInteraction.getFeatures().on('add', function() {
            var interactionFeatures = deleteInteraction.getFeatures();
            if (interactionFeatures.getLength() === 1) {
                selectedFeature = interactionFeatures.item(0);
                addMapClickListener();
            }
        });

        deleteInteraction.getFeatures().on('remove', function() {
            selectedFeature = null;
            removeMapClickListener();
        });


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
            console.log("deleteFeature", feature);
            var overlayFeatures = featureOverlay.getFeatures();
            overlayFeatures.remove(feature);
            leaveEditMode(currentMode);
            enterEditMode(currentMode);
        }
    }

    function createDragInteraction() {
        dragInteraction = olExt.createDragInteraction(featureOverlay.getFeatures(), changeEnded);
    }

    /**
     * @param type {ol.geom.GeometryType}
     */
    function createDrawInteraction(type) {
        console.log("createDrawInteraction type=", type);
        drawInteraction = new ol.interaction.Draw({
            features: featureOverlay.getFeatures(),
            type: type
        });

        drawInteraction.on('drawend', changeEnded);
    }

    /**
     * @param type {ol.geom.GeometryType}
     */
    function setDrawInteraction(type, nextMode) {
        if (!type) throw new Error("setDrawInteraction: type required");
        console.log("setDrawInteraction type=", type);
        drawType = type;
        if (drawInteraction) {
            map.removeInteraction(drawInteraction);
        }
        createDrawInteraction(type);
        if (currentMode === "Add" || nextMode === "Add") {
            map.addInteraction(drawInteraction);
        }
    }

    /**
     * Common callback for when any edit action completes
     * @param evt
     */
    function changeEnded(evt) {
        //console.log("changeEnded evt=", evt, "tokenSelection[0]=", tokenSelection[0]);

        // the mechanism to reflect the change is just leave-and-reenter the current mode:
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

            ,styleDelete: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
                stroke: new ol.style.Stroke({ color: '#ff2222', width: 5 }),
                image: new ol.style.Circle({
                    radius: 8,
                    fill: new ol.style.Fill({ color: '#ff2222' })
                })
            })
        };
    }
}

})();
