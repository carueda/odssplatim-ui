(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives'])
    .controller('MapCtrl', MapCtrl)
    .factory('olmap', olmapFactory)
;

MapCtrl.$inject = ['$scope', 'olmap'];

function MapCtrl($scope, olmap) {
    olmap.insertMap();

    $scope.mv = {
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
    $scope.$watch('mv.draw.selectedType', function(type) {
        olmap.setDrawType(type);
    });
    $scope.$watch('mv.editMode', function(editMode) {
        olmap.setEditMode(editMode);
        if (editMode) {
            olmap.setDrawType($scope.mv.draw.selectedType);
        }
    });
}

olmapFactory.$inject = [];

function olmapFactory() {

    var gmap = createGMap();
    var view = createView();
    var layers = createLayers();
    var map, draw, modify, featureOverlay;

    return {
        insertMap:   insertMap
        ,setCenter:  setCenter
        ,setZoom:    setZoom
        ,setEditMode:  setEditMode
        ,setDrawType:  setDrawType
    };

    function insertMap() {
        var olMapDiv = document.getElementById('omap2');
        map = new ol.Map({
            layers: layers,
            interactions: ol.interaction.defaults({
                altShiftDragRotate: false,
                dragPan: false,
                rotate: false
            }).extend([new ol.interaction.DragPan({kinetic: null})]),
            target: olMapDiv,
            view: view
        });

        view.on('change:center', function() {
            var center = ol.proj.transform(view.getCenter(), 'EPSG:3857', 'EPSG:4326');
            gmap.setCenter(new google.maps.LatLng(center[1], center[0]));
        });
        view.on('change:resolution', function() {
            //console.log("change:resolution", view.getZoom());
            gmap.setZoom(view.getZoom());
        });

        setCenter([-122.0, 36.83]);
        setZoom(10);

        olMapDiv.parentNode.removeChild(olMapDiv);
        gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(olMapDiv);

        prepareEditing();
    }

    function setCenter(ll) {
        view.setCenter(ol.proj.transform(ll, 'EPSG:4326', 'EPSG:3857'));
    }

    function setZoom(z) {
        view.setZoom(z);
    }

    ////////////////////////////////////////////////////////////////////////
    // private

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
            // make sure the view doesn't go beyond the 22 zoom levels of Google Maps
            maxZoom: 21
        })
    }

    function createLayers() {
        return [];
        //var vector = new ol.layer.Vector({
        //    source: new ol.source.GeoJSON({
        //        url: 'olmap/data/countries.geojson',
        //        projection: 'EPSG:3857'
        //    }),
        //    style: new ol.style.Style({
        //        //fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.6)'}),
        //        stroke: new ol.style.Stroke({ color: '#319FD3', width: 1})
        //    })
        //});
        //return [vector]
    }

    function prepareEditing() {
        // The features are not added to a regular vector layer/source,
        // but to a feature overlay which holds a collection of features.
        // This collection is passed to the modify and also the draw
        // interaction, so that both can add or modify features.
        featureOverlay = new ol.FeatureOverlay({
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 2
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: '#ffcc33'
                    })
                })
            })
        });
        featureOverlay.setMap(map);

    }

    function setEditMode(editMode) {
        if (modify) {
            map.removeInteraction(modify);
            modify = null;
        }
        if (editMode) {
            modify = new ol.interaction.Modify({
                features: featureOverlay.getFeatures(),
                // the SHIFT key must be pressed to delete vertices, so
                // that new vertices can be drawn at the same position
                // of existing vertices
                deleteCondition: function(event) {
                    return ol.events.condition.shiftKeyOnly(event) &&
                        ol.events.condition.singleClick(event);
                }
            });
            map.addInteraction(modify);
        }
        else {
            setDrawType(null); // no draw type
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

}

})();
