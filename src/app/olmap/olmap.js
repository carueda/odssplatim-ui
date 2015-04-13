(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives'])
    .controller('MapCtrl', MapCtrl)
    .factory('olMap', olMap)
;

MapCtrl.$inject = ['$scope', 'olMap'];

function MapCtrl($scope, olMap) {
    olMap.insertMap();

    var vm = {
        viewOnly: true,
        editMode: false,
        draw: {
            typeList: [
                {name: "Polygon", value: ol.geom.GeometryType.POLYGON},
                {name: "LineString", value: ol.geom.GeometryType.LINE_STRING},
                {name: "Point", value: ol.geom.GeometryType.POINT},
                {name: "(no)", value: ""}
            ],
            selectedType: ""
        }
    };
    $scope.vm = vm;
    $scope.$watch('vm.editMode', function(editMode) {
        olMap.setEditMode(editMode);
        if (!editMode) {
            vm.draw.selectedType = "";
        }
        olMap.setDrawType(vm.draw.selectedType);
    });
    $scope.$watch('vm.draw.selectedType', olMap.setDrawType);

    $scope.$on("tokenSelection", function(e, selected) {
        vm.viewOnly = selected.length != 1;
        if (vm.viewOnly) {
            olMap.setEditMode(false);
            vm.editMode = false;
            vm.draw.selectedType = "";
            olMap.setDrawType(vm.draw.selectedType);
        }
        olMap.setTokenSelection(selected);
    });
}

olMap.$inject = ['$rootScope'];

function olMap($rootScope) {
    var styles = getStyles();

    var gmap, view, vectorLayer;
    var map, draw, modify, featureOverlay;
    var vectorsByGeomId = {};

    var tokenSelection = [];
    var editInfo = {
        editingToken: null
    };

    return {
        insertMap:           insertMap
        ,reinit:             reinit
        ,addGeometry:        addGeometry
        ,setTokenSelection:  tokenSelectionUpdated
        ,setCenter:          setCenter
        ,setZoom:            setZoom
        ,setEditMode:        setEditMode
        ,setDrawType:        setDrawType
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
            }).extend([new ol.interaction.DragPan({kinetic: null})]),
            target: olMapDiv,
            view: view
        });

        view.on('change:center', function() {
            //console.log('change:center', view.getCenter());
            var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
            gmap.setCenter(new google.maps.LatLng(center[1], center[0]));
        });
        view.on('change:resolution', function() {
            //console.log("change:resolution", view.getZoom());
            gmap.setZoom(view.getZoom());
        });
        // TODO handle size change.

        setCenter([-122.0, 36.83]);
        setZoom(10);

        olMapDiv.parentNode.removeChild(olMapDiv);
        gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(olMapDiv);

        createFeatureOverlay();
        createModifyInteraction();
    }

    function reinit() {
        clearFeaturesOverlay();
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
            // for now, just manually assigning out "well-knwon crs.
            object.crs = {
                type: 'name',
                properties: {'name': 'EPSG:4326'}
            };
        }

        var vectorSource = new ol.source.GeoJSON({
            projection: 'EPSG:3857',
            object: object
        });

        vectorLayer = new ol.layer.Vector({
            source: vectorSource,
            style:  styles.styleNormal
        });
        map.addLayer(vectorLayer);
        vectorsByGeomId[geomId] = vectorLayer;
    }

    function tokenSelectionUpdated(selectedTokens) {
        console.log("******* tokenSelectionUpdated=", selectedTokens);

        if (editInfo.editingToken) {
            endEditing();
        }

        tokenSelection = selectedTokens;
        updateStylesForSelection();
    }

    function updateStylesForSelection() {
        var selectedGeomIds = _.map(tokenSelection, "token_id");
        console.log("selectedGeomIds=", selectedGeomIds);
        _.each(vectorsByGeomId, function(vectorLayer, geomId) {
            if (_.contains(selectedGeomIds, geomId)) {
                vectorLayer.setStyle(styles.styleSelected);
            }
            else {
                vectorLayer.setStyle(styles.styleNormal);
            }
        });
    }

    function setEditMode(editMode) {
        console.log("******* setEditMode=", editMode);
        if (editMode) {
            if (editInfo.editingToken) {
                return;
            }
            map.addInteraction(modify);

            clearFeaturesOverlay();

            // TODO for now not handling multiple selection for editing
            if (tokenSelection.length == 1) {
                startEditing(tokenSelection[0]);
            }
            else if (tokenSelection.length > 1) {
                console.log("tokenSelectionUpdated: No multiple selection handled for editing");
            }

        }
        else {
            if (!editInfo.editingToken) {
                return;
            }
            map.removeInteraction(modify);

            endEditing();
            //setDrawType(null); // no draw type

            updateStylesForSelection();
        }
    }

    function startEditing(token) {
        if (!token.geometry) {
            console.log("WARN: startEditing token_id=", token.token_id, " doesn't have geometry");
            return;
        }
        var geomId = token.token_id;
        var vectorLayer = vectorsByGeomId[geomId];
        if (!vectorLayer) {
            console.log("WARN: startEditing geomId=", geomId, "no such vector");
            return;
        }
        console.log("startEditing geomId=", geomId, "vectorLayer=", vectorLayer);

        if (editInfo.editingToken) {
            endEditing();
        }

        editInfo.editingToken = token;

        var rm = map.removeLayer(vectorLayer);
        if ( rm !== vectorLayer) {
            console.warn("removeLayer")
        }

        var source = vectorLayer.getSource();
        var features = source.getFeatures();
        addFeaturesToOverlay(features);
    }

    function addFeaturesToOverlay(features) {
        console.warn("addFeaturesToOverlay", features);
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
            var vectorLayer = updateLayer();
            vectorsByGeomId[token.token_id] = vectorLayer;
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

        // returns new layer with features in overlay
        function updateLayer() {
            var overlayFeatures = featureOverlay.getFeatures();
            console.log("---updateLayer, overlayFeatures=", overlayFeatures.getLength());

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
            vectorLayer = new ol.layer.Vector({
                source: vectorSource,
                style:  styles.styleNormal
            });
            return vectorLayer;
        }
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
        modify = new ol.interaction.Modify({
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

    function clearFeaturesOverlay() {
        if (featureOverlay) {
            var overlayFeatures = featureOverlay.getFeatures();
            if (overlayFeatures) {
                console.log("!!!clearFeaturesOverlay, overlayFeatures=", overlayFeatures);
                overlayFeatures.clear();
            }
        }
    }

    /**
     * @param type {ol.geom.GeometryType} or falsy to disable
     */
    function setDrawType(type) {
        //console.log("setDrawType=", type);
        if (draw) {
            map.removeInteraction(draw);
            draw = null;
        }
        if (type) {
            draw = new ol.interaction.Draw({
                features: featureOverlay.getFeatures(),
                type: type
            });
            map.addInteraction(draw);
        }
    }

    function getStyles() {
        return {
            styleNormal: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.1)'}),
                stroke: new ol.style.Stroke({color: '#319FD3', width: 2})
            })

            ,styleSelected: new ol.style.Style({
                fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.2)' }),
                //fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.4)'}),
                stroke: new ol.style.Stroke({color: '#ffcc33', width: 2})
            })

            ,styleOverlay: new ol.style.Style({
                fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.3)' }),
                stroke: new ol.style.Stroke({ color: '#ff0000', width: 2 }),
                //stroke: new ol.style.Stroke({ color: '#ffcc33', width: 2 }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({ color: '#ffcc33' })
                })
            })
        };
    }
}

})();
