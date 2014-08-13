(function() {
'use strict';

angular.module('odssPlatimApp.platform', [])
    .controller('PlatformCtrl', PlatformCtrl)
    .controller('PlatformInstanceCtrl', PlatformInstanceCtrl)
;

PlatformCtrl.$inject = ['$scope', '$modal', 'platimModel', 'service'];

function PlatformCtrl($scope, $modal, platimModel, service) {
    $scope.open = function () {

        $scope.platformOptions = platimModel.platformOptions;
        //console.log("$scope.platformOptions:", $scope.platformOptions);

        var modalInstance = $modal.open({
            templateUrl: 'platform/platform.tpl.html',
            controller: 'PlatformInstanceCtrl',
            resolve: {
                platformOptions: function () {
                    return $scope.platformOptions;
                }
            }
        });

        modalInstance.result.then(function (platformOptions) {
            platimModel.platformOptions = $scope.platformOptions = platformOptions;
            service.platformOptionsUpdated();
        }, function () {
            //console.log('Platform dialog dismissed');
        });
    };
}

PlatformInstanceCtrl.$inject = ['$scope', '$modalInstance', 'platformOptions', 'focus'];

function PlatformInstanceCtrl($scope, $modalInstance, platformOptions, focus) {

    $scope.master          = angular.copy(platformOptions);
    $scope.platformOptions = angular.copy(platformOptions);

    $scope.set = function() {
        $scope.master = angular.copy($scope.platformOptions);
        $modalInstance.close($scope.master);
    };

    $scope.reset = function() {
        $scope.platformOptions = angular.copy($scope.master);
    };

    $scope.isValid = function() {
        return true;
    };

    $scope.isUnchanged = function() {
        return _.isEqual($scope.platformOptions.selectedPlatforms, $scope.master.selectedPlatforms);
    };

    $scope.reset();

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    focus("platform_form_activation");
}

})();
