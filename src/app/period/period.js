'use strict';

/**
 * Dispatches the Period form.
 * Allows to add new periods, remove a period, set the default period.
 *
 * NOTE: not completely implemented. For example, there is no direct way for the
 * user to reset to the saved period info after applying a modification in the UI.
 */
angular.module('odssPlatimApp.period', [])

    .controller('PeriodCtrl', ['$scope', '$modal', '$timeout', 'platimModel', 'service',
        function ($scope, $modal, $timeout, platimModel, service) {

            $scope.open = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'period/period.tpl.html',
                    controller:  'PeriodInstanceCtrl',
                    backdrop:    'static'
                });

                modalInstance.result.then(function (selectedPeriod) {
                    console.log('Period dialog accepted:', selectedPeriod);
                    platimModel.selectedPeriodId = selectedPeriod._id;
                    service.periodSelected();
                }, function () {
                    console.log('Period dialog dismissed');
                });
            };

        }])

    .controller('PeriodInstanceCtrl', ['$scope', '$modalInstance', 'platimModel', 'service', 'timelineWidget',
        function ($scope, $modalInstance, platimModel, service, timelineWidget) {

            var periods_plus_create = platimModel.periods;
            periods_plus_create["--all tokens--"] = {
               _id:    "--all tokens--",
               period:   "Show all tokens",
               start:  undefined,
               end:    undefined
            };

            var dr = timelineWidget.getVisibleChartRange();
            periods_plus_create["--create period--"] = {
               _id:    "--create period--",
               period:   "--create period--",
               start:  moment(dr.start).toDate(),
               end:    moment(dr.end).toDate()
            };

            var selectedPeriod;
            if (platimModel.periods[platimModel.selectedPeriodId]) {
                selectedPeriod = platimModel.periods[platimModel.selectedPeriodId];
            }
            else {
                platimModel.selectedPeriodId = "--all tokens--";
                selectedPeriod = periods_plus_create[platimModel.selectedPeriodId];
            }

            var info = {
                periods:         _.values(periods_plus_create),
                selectedPeriod:  selectedPeriod,
                newName:         ""  // when creating a new period
            };
            console.log("info:", info);

            $scope.info = info;
            $scope.master = angular.copy(info);

            $scope.change = function() {
                console.log("change:", $scope.info.selectedPeriod);
            };

            $scope.set = function() {
                $scope.master = angular.copy($scope.info);
                $modalInstance.close($scope.master.selectedPeriod);
            };

            $scope.isCreating = function() {
                return $scope.info.selectedPeriod._id == "--create period--";
            };

            $scope.create = function() {
                console.log("create:", $scope.info);
                var newPeriodInfo = {
                    period:  $scope.info.newName,
                    start: moment($scope.info.selectedPeriod.start).format("YYYY-MM-DD"),
                    end:   moment($scope.info.selectedPeriod.end).  format("YYYY-MM-DD")
                };
                $modalInstance.dismiss('create period');
                service.addPeriod(newPeriodInfo, function() {
                    service.periodSelected();
                });
            };

            $scope.setDefault = function() {
                console.log("setDefault:", $scope.info.selectedPeriod);
                var _id = $scope.info.selectedPeriod._id;
                if ( _id === "--all tokens--") {
                    _id = undefined;
                }
                service.setDefaultPeriodId(_id);
                // and set this period, and close dialog:
                $scope.set();
            };

            $scope.delete = function() {
                console.log("delete:", $scope.info.selectedPeriod);

                var periodInfo = $scope.info.selectedPeriod;
                service.confirm({
                    title:     "Confirm deletion",
                    message:   "Period '" + periodInfo.period + "' will be deleted.",
                    ok:        function() {
                        $modalInstance.dismiss('delete period');
                        service.removePeriod(periodInfo._id);
                    }
                });
            };

            $scope.isUnchanged = function() {
                var formSelectedPeriod   = $scope.info.selectedPeriod;
                var masterSelectedPeriod = $scope.master.selectedPeriod;
                return angular.equals(formSelectedPeriod._id, masterSelectedPeriod._id)
                    && angular.equals(formSelectedPeriod.start, masterSelectedPeriod.start)
                    && angular.equals(formSelectedPeriod.end, masterSelectedPeriod.end)
                ;
            };

            $scope.isInvalid = function() {
                return $scope.isCreating() &&
                    ($scope.info.newName == ""
                     || $scope.info.selectedPeriod.start.getTime() > $scope.info.selectedPeriod.end.getTime());
            };

            $scope.cannotDelete = function() {
                return $scope.isCreating()
                    || $scope.info.selectedPeriod._id.indexOf("--") == 0
                    || $scope.info.selectedPeriod._id === platimModel.selectedPeriodId;
            };

            $scope.cancel = function () {
                $modalInstance.dismiss('cancel');
            };
        }])
;
