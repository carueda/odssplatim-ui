(function() {
'use strict';

/**
 * Controllers for the period dropdown and the period form.
 * Allows to select the default period; add a new period,
 * and update/remove a period.
 */
angular.module('odssPlatimApp.period', ['odssPlatimApp.period.directives', 'odssPlatimApp.period.services'])

    .controller('PeriodCtrl', PeriodCtrl)
    .controller('PeriodInstanceCtrl', PeriodInstanceCtrl)
;

PeriodCtrl.$inject = ['$scope', '$modal', 'platimModel', 'timelineWidget', 'periods', 'focus'];

function PeriodCtrl($scope, $modal, platimModel, timelineWidget, periods, focus) {

    $scope.vm = {};
    $scope.$on('periodsRefreshed', periodsRefreshed);

    function periodsRefreshed() {
        $scope.vm.periods = _.values(platimModel.periods);
        _.each($scope.vm.periods, function(period) {
           period.start = moment(period.start).format("YYYY-MM-DD");
           period.end   = moment(period.end).  format("YYYY-MM-DD");
        });
        $scope.vm.selectedPeriodId = platimModel.selectedPeriodId;
        $scope.vm.selectedPeriod   = platimModel.periods[platimModel.selectedPeriodId];
        //console.log('on periodsRefreshed', $scope.vm.periods);
    }

    // selects the given period as the default
    $scope.selectPeriod = function(period) {
        //console.log('selectPeriod:', period);
        if (platimModel.selectedPeriodId !== period._id) {
            periods.setDefaultPeriodId(period._id, function(error) {
                if (!error) {
                    periodsRefreshed();
                    periods.periodSelected();
                }
            });
        }
        else {
            // no change in selected period, but adjust window in case visible range has changed
            periods.periodSelected();
        }
        focus('focusTimeline');
    };

    function openModal(period) {
        var modalInstance = $modal.open({
            templateUrl: 'period/period.tpl.html',
            controller:  'PeriodInstanceCtrl',
            backdrop:    'static',
            resolve:     { period: function() { return period; } }
        });
        modalInstance.result.then(function(period) {
            //console.log('Period dialog accepted:', period);
            if (period) {
                // modal closed with a period means to select that period:
                $scope.selectPeriod(period);
            }
            else {
                // to reflect any update or removal
                periodsRefreshed();
            }
            focus('focusTimeline');
        }, function () {
            focus('focusTimeline');
        });
    }

    $scope.editPeriod = function(period) {
        openModal({
            _id:      period._id,
            period:   period.period,
            start:    moment(period.start).toDate(),
            end:      moment(period.end).toDate()
        });
    };

    $scope.createNewPeriod = function() {
        var start, end;
        var dr = timelineWidget.getVisibleChartRange();
        if (dr !== undefined) {
            start = moment(dr.start).toDate();
            end   = moment(dr.end).toDate();
        }
        else {
            var now = moment(moment().format("YYYY-MM-DD"));
            start = now.toDate();
            end   = now.clone().add(1, 'month').toDate();
        }

        var period = {period: "", start: start, end: end};
        //console.log("createPeriod = ", angular.toJson(period));
        openModal(period);
    };

    $scope.dropdownToggled = function(open) {
        if (!open) {
            focus('focusTimeline');
        }
    };
}

PeriodInstanceCtrl.$inject = ['$scope', '$modalInstance', 'period', 'platimModel', 'periods', 'focus', 'utl'];

function PeriodInstanceCtrl($scope, $modalInstance, period, platimModel, periods, focus, utl) {
    //console.log("period:", period);

    $scope.info = period;
    $scope.master = angular.copy($scope.info);

    $scope.isCreating = function() {
        return !$scope.info._id;
    };

    $scope.create = function() {
        //console.log("create:", $scope.info);
        var newPeriodInfo = {
            period:  $scope.info.period,
            start: moment($scope.info.start).format("YYYY-MM-DD"),
            end:   moment($scope.info.end).  format("YYYY-MM-DD")
        };
        periods.addPeriod(newPeriodInfo, function(error, createdPeriod) {
            // note, even if error is defined, we close the modal possibly with an
            // undefined argument, but the effect would be ok in any case.
            $modalInstance.close(createdPeriod);
        });
    };

    $scope.update = function() {
        //console.log("update:", $scope.info);
        var periodInfo = {
            _id:     $scope.info._id,
            period:  $scope.info.period,
            start:   moment($scope.info.start).format("YYYY-MM-DD"),
            end:     moment($scope.info.end).  format("YYYY-MM-DD")
        };
        periods.updatePeriod(periodInfo, function() {
            // just close the modal (no change in selected period)
            $modalInstance.close();
        });
    };

    $scope.remove = function() {
        //console.log("remove:", $scope.info);

        var periodInfo = $scope.info;
        utl.confirm({
            title:     "Confirm deletion",
            message:   "Period '" + periodInfo.period + "' will be deleted.",
            ok:        function() {
                periods.removePeriod(periodInfo._id, function() {
                    $modalInstance.close();
                });
            }
        });
    };

    $scope.isUnchanged = function() {
        if ($scope.isCreating()) {
            return false;
        }
        var formSelectedPeriod   = $scope.info;
        var masterSelectedPeriod = $scope.master;
        return angular.equals(formSelectedPeriod._id, masterSelectedPeriod._id)
            && angular.equals(formSelectedPeriod.period, masterSelectedPeriod.period)
            && angular.equals(formSelectedPeriod.start, masterSelectedPeriod.start)
            && angular.equals(formSelectedPeriod.end, masterSelectedPeriod.end)
        ;
    };

    $scope.isInvalid = function() {
        return $scope.info.period === undefined || $scope.info.period.trim().length == 0
             || $scope.info.start === undefined || $scope.info.end === undefined
             || $scope.info.start.getTime() > $scope.info.end.getTime();
    };

    $scope.canDelete = function() {
        return !$scope.isCreating()
            && $scope.info._id !== platimModel.selectedPeriodId
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };

    focus("period_form_activation", 700, {select: true});
}

})();
