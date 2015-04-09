(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives'])
    .controller('MapCtrl', MapCtrl)
    .factory('olmap', olmapFactory)
;

MapCtrl.$inject = ['olmap'];

function MapCtrl(olmap) {
    olmap.insertMap();
}

olmapFactory.$inject = [];

function olmapFactory() {

    var gmap = createGMap();
    var view = createView();
    var layers = createLayers();

    return {
        insertMap:   insertMap
        ,setCenter:  setCenter
        ,setZoom:    setZoom
    };

    function insertMap() {
        var olMapDiv = document.getElementById('omap2');
        var map = new ol.Map({
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
        var vector = new ol.layer.Vector({
            source: new ol.source.GeoJSON({
                url: 'olmap/data/countries.geojson',
                projection: 'EPSG:3857'
            }),
            style: new ol.style.Style({
                //fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0.6)'}),
                stroke: new ol.style.Stroke({ color: '#319FD3', width: 1})
            })
        });
        return [vector]
    }
}

})();
