(function() {
'use strict';

angular.module('odssPlatimApp.olmap', ['odssPlatimApp.olmap.directives'])
    .controller('MapCtrl', MapCtrl)
    .factory('olmap', olmapFactory)
;

MapCtrl.$inject = ['olmap'];

function MapCtrl(olmap) {
    olmap.map.render(document.getElementById("olmap"));
}

olmapFactory.$inject = [];

function olmapFactory() {
    var layers = getBaseLayers();
    var graticule = setGraticule();
    var proj = new OpenLayers.Projection('EPSG:4326');
    var map = createMap();

    setCenter({ lon: -122.000, lat: 36.830 }, 11);
    setEditor(map);

    return {
        map:              map,
        setCenter:        setCenter,
        zoomForExtent:    zoomForExtent
    };

    function setCenter(lonlat, zoom) {
        map.setCenter(transform(lonlat), zoom);
}

    function transform(lonlat) {
        var ll = new OpenLayers.LonLat(lonlat.lon, lonlat.lat);
        ll.transform(proj, map.getProjectionObject());
        return ll;
    }

    function zoomForExtent(usrBounds) {
        var bounds = new OpenLayers.Bounds();
        bounds.extend(transform(usrBounds.leftBottom));
        bounds.extend(transform(usrBounds.rightTop));
        map.zoomToExtent(bounds);
    }

    function setGraticule() {
        return new OpenLayers.Control.Graticule({
            layerName: "Lon/Lat grid"
            ,displayInLayerSwitcher: true
            ,numPoints: 2
            ,labelled: true
            ,targetSize: 300  // "The maximum size of the grid in pixels on the map"?
            ,labelSymbolizer: {
                fontColor: "#000000"
                ,fontSize: "14px"
                ,fontWeight: "bold"
            }
        })
    }

    function createMap() {
        return new OpenLayers.Map({
            controls: [
                new OpenLayers.Control.PanZoom()
                ,new OpenLayers.Control.ScaleLine()
                ,new OpenLayers.Control.Navigation({documentDrag: true})
                ,new OpenLayers.Control.MousePosition({
                    displayProjection: proj,
                    emptyString:'',
                    formatOutput: function(ll) {
                        var lat = ll.lat, lon = ll.lon;
                        return lat.toFixed(4) + ", " + lon.toFixed(4);
                    }
                })
                ,new OpenLayers.Control.LayerSwitcher()
                ,graticule
            ],
            layers: layers

            ,eventListeners: {
                changebaselayer: function(event) {
                    graticule.labelSymbolizer.fontColor = event.layer.name.indexOf("Google") >= 0 ? "#00ff00" : "#000000";
                    graticule.update();
                }
                //,featureover: function(e) {
                //    e.feature.renderIntent = "select";
                //    e.feature.layer.drawFeature(e.feature);
                //    //console.log("pointer entered " + e.feature.id + " on " + e.feature.layer.name);
                //    //console.log("e.feature.attributes.name = " + e.feature.attributes.name);
                //},
                //featureout: function(e) {
                //    e.feature.renderIntent = "default";
                //    e.feature.layer.drawFeature(e.feature);
                //    //console.log("pointer left " + e.feature.id + " on " + e.feature.layer.name);
                //}
                //,featureclick: function(e) {
                //}
            }

        })
    }

    function setEditor(map) {
        // with built-in editing features in OpenLayers2 something like:
        //var pathsVector = new OpenLayers.Layer.Vector("Paths");
        //var editingControl = new OpenLayers.Control.EditingToolbar(pathsVector);
        //layers.push(pathsVector);
        // map.addControl(editingControl);
        // ... but I'm initially trying OLE (geops/ole):

        var editor = new OpenLayers.Editor(map, {
            activeControls: [
                'Navigation'
                ,'TransformFeature'
                ,'Separator'
                ,'DeleteFeature'
                ,'DragFeature'
                ,'SelectFeature'
                ,'Separator'
                ,'ModifyFeature'
                ,'UndoRedo'
                ,'SnappingSettings'
                ,'ParallelDrawing'
                ,'ContextMenu'
                ,'DownloadFeature'
                ,'CADTools'
                ,'DrawHole'
                ,'CleanFeature'
                ,'MergeFeature'
                ,'SplitFeature'
            ],
            featureTypes: ['regular', 'polygon', 'path', 'point', 'text']
        });
        editor.startEditMode();
    }
}

function getBaseLayers() {
    return [
        new OpenLayers.Layer.Google("Google Satellite", {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22})
        //,"Google Physical":  new OpenLayers.Layer.Google("Google Physical", {type: google.maps.MapTypeId.TERRAIN})
        ,new OpenLayers.Layer.XYZ('ESRI',
                    'http://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/${z}/${y}/${x}',
                    {sphericalMercator: true})
    ];
}

})();

/*
 * Hacked OpenLayers.Util.getFormattedLonLat:
 * Yes, this is a hack to get the grid labels shown in simple decimal degrees
 * as it seems OpenLayers.Control.Graticule (ie., OpenLayers.Util.getFormattedLonLat)
 * doesn't support such an option.
 */
OpenLayers.Util.getFormattedLonLat = function(coordinate, axis, dmsOption) {
    return Math.round(1000 * coordinate) / 1000;
};
