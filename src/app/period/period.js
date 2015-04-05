(function() {
'use strict';

/**
 * Dispatches the Period form.
 * Allows to add new periods, remove a period, set the default period.
 */
angular.module('odssPlatimApp.period', [])
    .controller('PeriodCtrl', PeriodCtrl)
    .controller('PeriodInstanceCtrl', PeriodInstanceCtrl)
;

PeriodCtrl.$inject = ['$scope', '$modal', 'platimModel', 'timelineWidget', 'service', 'focus'];

function PeriodCtrl($scope, $modal, platimModel, timelineWidget, service, focus) {

    $scope.vm = {};
    $scope.$on('periodsRefreshed', periodsRefreshed);

    function periodsRefreshed() {
        $scope.vm.periods = _.values(platimModel.periods);
        _.each($scope.vm.periods, function(period) {
           period.start = moment(period.start).format("YYYY-MM-DD");
           period.end   = moment(period.end).  format("YYYY-MM-DD");
        });
        $scope.vm.selectedPeriodId = platimModel.selectedPeriodId;
        //console.log('on periodsRefreshed', $scope.vm.periods);
    }

    $scope.selectPeriod = function(period) {
        //console.log('selectPeriod:', period);
        if (platimModel.selectedPeriodId !== period._id) {
            service.setDefaultPeriodId(period._id, function() {
                periodsRefreshed();
                service.periodSelected();
            });
        }
        focus('focusTimeline');
    };

    function openModal(options) {
        var modalInstance = $modal.open({
            templateUrl: 'period/period.tpl.html',
            controller:  'PeriodInstanceCtrl',
            backdrop:    'static',
            resolve:     { options: function() { return options; } }
        });
        modalInstance.result.then(function (selectedPeriod) {
            //console.log('Period dialog accepted:', selectedPeriod);
            platimModel.selectedPeriodId = selectedPeriod._id;
            periodsRefreshed();
            service.periodSelected();
            focus('focusTimeline');
        }, function () {
            focus('focusTimeline');
        });
    }

    $scope.editPeriod = function(selectedPeriodId) {
        openModal({selectedPeriodId: selectedPeriodId});
    };

    $scope.createNewPeriod = function() {
        var createPeriod = {};
        var dr = timelineWidget.getVisibleChartRange();
        if (dr !== undefined) {
            createPeriod['start'] = moment(dr.start).toDate();
            createPeriod['end']   = moment(dr.end).toDate();
        }
        else {
            var now = moment(moment().format("YYYY-MM-DD"));
            createPeriod['start'] = now.toDate();
            createPeriod['end']   = now.clone().add(1, 'month').toDate();
        }
        console.log("createPeriod = ", angular.toJson(createPeriod));
        openModal({createPeriod: createPeriod});
    };
}

PeriodInstanceCtrl.$inject = ['$scope', '$modalInstance', 'options', 'platimModel', 'service', 'focus'];

function PeriodInstanceCtrl($scope, $modalInstance, options, platimModel, service, focus) {

    var selectedPeriod, info;
    if (options.selectedPeriodId) {
        selectedPeriod = platimModel.periods[options.selectedPeriodId];
        info = {
            selectedPeriod:  selectedPeriod
        };
    }
    else if (options.createPeriod) {
        info = {
            newName:  "",
            selectedPeriod: {
                start: options.createPeriod.start,
                end:   options.createPeriod.end
            }
        };

    }
    else {
        throw new Error("malformed options");
    }

    console.log("info:", info);

    $scope.info = info;
    $scope.master = angular.copy(info);

    $scope.change = function() {
        //console.log("change:", $scope.info.selectedPeriod);
    };

    $scope.set = function() {
        $scope.master = angular.copy($scope.info);
        $modalInstance.close($scope.master.selectedPeriod);
    };

    $scope.isCreating = function() {
        return !options.selectedPeriodId;
    };

    $scope.create = function() {
        //console.log("create:", $scope.info);
        var newPeriodInfo = {
            period:  $scope.info.newName,
            start: moment($scope.info.start).format("YYYY-MM-DD"),
            end:   moment($scope.info.end).  format("YYYY-MM-DD")
        };
        service.addPeriod(newPeriodInfo, function(selectedPeriod) {
            $modalInstance.close(selectedPeriod);
        });
    };

    $scope.delete = function() {
        //console.log("delete:", $scope.info.selectedPeriod);

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
        if (options.createPeriod) {
            return false;
        }
        var formSelectedPeriod   = $scope.info.selectedPeriod;
        var masterSelectedPeriod = $scope.master.selectedPeriod;
        return angular.equals(formSelectedPeriod._id, masterSelectedPeriod._id)
            && angular.equals(formSelectedPeriod.start, masterSelectedPeriod.start)
            && angular.equals(formSelectedPeriod.end, masterSelectedPeriod.end)
        ;
    };

    $scope.isInvalid = function() {
        return $scope.isCreating() &&
            ($scope.info.newName === undefined || $scope.info.newName.trim().length == 0
             || $scope.info.selectedPeriod.start === undefined || $scope.info.selectedPeriod.end === undefined
             || $scope.info.selectedPeriod.start.getTime() > $scope.info.selectedPeriod.end.getTime());
    };

    $scope.cannotDelete = function() {
        return $scope.isCreating()
            || $scope.info.selectedPeriod._id === platimModel.selectedPeriodId
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    focus("period_form_activation", 700, {select: true});
}

})();
