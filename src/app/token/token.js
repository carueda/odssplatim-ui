'use strict';

(function() {

angular.module('odssPlatimApp.token', ['odssPlatimApp.timelineWidget'])
    .controller('TimelineCtrl', TimelineCtrl)
    .controller('TokenInstanceCtrl', TokenInstanceCtrl)
;

TimelineCtrl.$inject = ['$scope', '$modal', '$timeout', 'platimModel', 'service', 'timelineWidget'];

function TimelineCtrl($scope, $modal, $timeout, platimModel, service, timelineWidget) {
    $scope.info = {
        token: undefined,
        row: undefined
    };
    $scope.$on('editToken', function(event, token, row) {
        //console.log('editToken:', token);
        $scope.$apply(function() {
            $scope.info.token = token;
            $scope.info.row = row;
            $scope.open();
        });
    });

    $scope.open = function () {

        var modalInstance = $modal.open({
            templateUrl: 'token/token.tpl.html',
            controller:  'TokenInstanceCtrl',
            backdrop:    'static',
            resolve: {
                info: function () {
                    return $scope.info;
                }
            }
        });

        modalInstance.result.then(function (token) {
            //console.log('Token dialog accepted:', token);

            var updatedToken = _.extend(token, {
                state:         token.state,
                description:   token.description,
                start:         moment(token.start).toDate(),
                end :          moment(token.end).toDate(),
                content:       token.state
            });
            if (odssplatimConfig.useVis) {
                timelineWidget.getDataSet().update(updatedToken);
                timelineWidget.updateStatusModified(updatedToken);
            }
            else {
                var row = $scope.info.row;
                timelineWidget.getData()[row] = updatedToken;
                timelineWidget.updateStatusModified(row);
                //console.log('updatedToken', updatedToken);
                timelineWidget.redraw();
            }


        }, function () {
            //console.log('Token dialog dismissed');
        });
    };
}

TokenInstanceCtrl.$inject = ['$scope', '$modalInstance', 'info', 'service', 'timelineWidget'];

function TokenInstanceCtrl($scope, $modalInstance, info, service, timelineWidget) {

    $scope.master = angular.copy(info.token);
    $scope.token  = angular.copy(info.token);

    $scope.set = function() {
        $scope.master = angular.copy($scope.token);
        $modalInstance.close($scope.master);
    };

    $scope.delete = function() {
        //console.log("delete:", info);
        if (info.token.token_id === undefined) {
            // not in database; just remove token from timeline
            if (odssplatimConfig.useVis)
                timelineWidget.removeToken(info.token);
            else
                timelineWidget.removeToken(info.token, info.row, info.row);
            timelineWidget.redraw();
            $modalInstance.dismiss('delete token');
            return;
        }

        service.confirm({
            title:     "Confirm deletion",
            message:   "Token '" + info.token.state+ "' will be deleted." +
                       "<br/><br/>" +
                       "(timeline: " + "'" + info.token.platform_name + "')",
            ok: function() {
                $modalInstance.dismiss('delete token');
                service.deleteToken(info.token, info.row, function(tokenInfo, index) {
                    timelineWidget.removeToken(tokenInfo, index, index);
                });
            }
        });
    };

    $scope.reset = function() {
        $scope.token = angular.copy($scope.master);
    };

    $scope.isValid = function() {
        return $scope.token.state !== "";
    };

    $scope.isUnchanged = function() {
        return angular.equals($scope.token, $scope.master);
    };

    $scope.reset();

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}

})();
