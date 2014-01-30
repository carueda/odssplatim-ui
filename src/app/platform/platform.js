'use strict';

angular.module('odssPlatimApp.platform', [])

    .controller('PlatformCtrl', ['$scope', '$modal', 'platimModel', 'service',
        function ($scope, $modal, platimModel, service) {

            $scope.open = function () {

                $scope.platformOptions = platimModel.platformOptions;
                console.log("$scope.platformOptions:", $scope.platformOptions);

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
                    console.log('Platform dialog dismissed');
                });
            };

        }])

    .controller('PlatformInstanceCtrl', ['$scope', '$modalInstance', 'platformOptions',
        function ($scope, $modalInstance, platformOptions) {

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
                return !$scope.platformOptions.onlyWithTypes
                    || _.any(_.values($scope.platformOptions.selectedTypes));
            };

            $scope.isUnchanged = function() {
                if ($scope.platformOptions.onlyWithTypes !== $scope.master.onlyWithTypes) {
                    return false;
                }
                if ($scope.platformOptions.onlyWithTokens !== $scope.master.onlyWithTokens) {
                    return false;
                }
                if ($scope.platformOptions.onlyWithTypes === $scope.master.onlyWithTypes) {
                    return angular.equals($scope.platformOptions.selectedTypes, $scope.master.selectedTypes);
                }
                return true;
            };

            $scope.reset();

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }])
;
