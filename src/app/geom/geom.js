(function() {
  'use strict';

  angular.module('odssPlatimApp.geom', ['ui.grid', 'ui.grid.edit'])
      .controller('GeomController', GeomController)
      .controller('GeomInstanceController', GeomInstanceController)
  ;

  GeomController.$inject = ['$scope', '$modal', 'olMap'];

  function GeomController($scope, $modal, olMap) {

    $scope.$on('evtViewOrEditGeometry', function(ngEvt, edit, item, feature) {
      //console.log('evtViewOrEditGeometry: edit=', edit, 'item=', item, 'feature=', feature);
      $scope.$apply(function() {
        openDialog(edit, item, feature);
      });
    });

    function openDialog(edit, item, feature) {
      var modalInstance = $modal.open({
        templateUrl: 'geom/geom.tpl.html',
        controller:  'GeomInstanceController',
        backdrop:    'static',
        resolve: {
          info: function () {
            return {edit: edit, item: item, feature: feature}
          }
        }
      });

      modalInstance.result.then(function(feature) {
        olMap.notifyExternalChange(item, feature);
      });
    }

  }

  GeomInstanceController.$inject = ['$scope', '$modalInstance', 'info'];

  function GeomInstanceController($scope, $modalInstance, info) {

    $scope.edit = info.edit;
    $scope.item = info.item;
    var feature = info.feature;

    var geometry = feature.getGeometry();

    //console.log("feature.getGeometry()=", geometry);

    $scope.geomName = '';
    var originalData = getOriginalData();

    $scope.gridOptions = {
      data: angular.copy(originalData)
      ,showGridFooter:     false
      ,enableFiltering:    false
      ,enableSorting:      false
      ,enableColumnMenus:  false
      //,rowHeight:          40
    };

    $scope.gridOptions.columnDefs = [
      { name: 'id',        enableCellEdit: false, displayName: '', width: 40 },
      { name: 'longitude', enableCellEdit: $scope.edit, type: 'number'},
      { name: 'latitude',  enableCellEdit: $scope.edit, type: 'number'}
    ];

    $scope.reset = function() {
      $scope.gridOptions.data = angular.copy(originalData);
    };

    $scope.set = function() {
      $modalInstance.close(updateFeature());
    };

    $scope.isUnchanged = function() {
      return angular.equals(originalData, $scope.gridOptions.data);
    };

    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };

    function getOriginalData() {
      var data = [];
      var coordinates = geometry.getCoordinates();
      //console.log("coordinates=", coordinates);

      if (geometry instanceof ol.geom.Polygon) {
        $scope.geomName = 'Polygon';
        _.each(coordinates, function(coordinates2) {
          _.each(coordinates2, addCoordinate);
        });
        // remove very last entry as it's the same as the first one:
        data.pop();
      }
      else if (geometry instanceof ol.geom.LineString) {
        $scope.geomName = 'LineString';
        _.each(coordinates, addCoordinate);
      }
      else if (geometry instanceof ol.geom.Point) {
        $scope.geomName = 'Point';
        addCoordinate(coordinates);
      }
      else {
        throw 'unexpected geometry type: ' + geometry;
      }
      return data;

      function addCoordinate(c) {
        // convert to lat/lon
        var ll = ol.proj.transform(c, 'EPSG:3857', 'EPSG:4326');
        data.push({
          id:        data.length + 1,
          longitude: ll[0],
          latitude:  ll[1]
        });
      }
    }

    function updateFeature() {
      var data = $scope.gridOptions.data;

      var coordinates;

      if (geometry instanceof ol.geom.Polygon) {
        coordinates = [[]];
        _.each(data, function(row) {
          coordinates[0].push(convert([row.longitude, row.latitude]));
        });
        // and push a copy of the first entry to get a valid polygon:
        coordinates[0].push(_.clone(coordinates[0][0]));
      }
      else if (geometry instanceof ol.geom.LineString) {
        coordinates = [];
        _.each(data, function(row) {
          coordinates.push(convert([row.longitude, row.latitude]));
        });
      }
      else if (geometry instanceof ol.geom.Point) {
        var row = data[0];
        coordinates = convert([row.longitude, row.latitude]);
      }
      else {
        throw 'unexpected geometry type: ' + geometry;
      }

      geometry.setCoordinates(coordinates);
      return feature;

      function convert(ll) {  // convert from lat/lon
        return ol.proj.transform(ll, 'EPSG:4326', 'EPSG:3857');
      }
    }
  }

})();
