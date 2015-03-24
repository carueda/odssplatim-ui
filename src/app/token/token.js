'use strict';

(function() {

angular.module('odssPlatimApp.token', ['odssPlatimApp.timelineWidget'])
    .controller('TimelineCtrl', TimelineCtrl)
    .controller('TokenInstanceCtrl', TokenInstanceCtrl)
;

TimelineCtrl.$inject = ['$scope', '$modal', '$timeout', 'platimModel', 'service', 'timelineWidget', 'status', 'focus'];

function TimelineCtrl($scope, $modal, $timeout, platimModel, service, timelineWidget, status, focus) {
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
            timelineWidget.getDataSet().update(updatedToken);
            timelineWidget.updateStatusModified(updatedToken);
            focus('focusTimeline');

        }, function () {
            focus('focusTimeline');
        });
    };

    focus('focusTimeline');

    $scope.keyPressed = function($event) {
        var chr = String.fromCharCode($event.charCode).toLowerCase();

        if (chr === 'c') {  // copy selected token
            var selection = timelineWidget.getSelection();
            if (selection.length == 1) {
                var selectedItem = timelineWidget.getItemById(selection[0]);
                if (selectedItem) {
                    var copiedItem = angular.copy(selectedItem);
                    timelineWidget.setCopiedToken(copiedItem);
                    var str = copiedItem.content || copiedItem.title || "";
                    if (str) str = "'" + str + "'";
                    showMessage("Token " + str + " copied");
                }
            }
            else {
                showMessage("Select a token to copy" +
                    (selection.length > 1 ? " (" + selection.length + " selected)" : ""));
            }
        }
        else if (chr === '!') {  // clear copy of token for addition
            timelineWidget.setCopiedToken(undefined);
            showMessage("Cleared token copy for addition");
        }
    };

    $scope.click = function($event) {
        focus('focusTimeline');
    };

    function showMessage(msg) {
        var actId = status.messages.add(msg);
        setTimeout(function() {
            status.messages.remove(actId);
            $scope.$digest();
        }, 0);
    }
}

TokenInstanceCtrl.$inject = ['$rootScope', '$scope', '$modalInstance', 'info', 'service', 'timelineWidget', 'focus'];

function TokenInstanceCtrl($rootScope, $scope, $modalInstance, info, service, timelineWidget, focus) {

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
            timelineWidget.removeToken(info.token);
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
                    $rootScope.$broadcast('tokenDeleted');
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

    focus("token_form_activation", 700, {select: true});
}

})();
