'use strict';

angular.module('odssPlatimApp.token', [])

    .factory('timelineWidget', ['service', function(service) {
        var tokenForm = {
            showForm: function(args) {
                console.log("showForm: args=", args);
                var token = args.tokenInfo;
                console.log("showForm: token=", token);
                service.editToken(token, args.row);
            }
        };
        var elm = document.getElementById("timelines");
        var timelineWidget = new TimelineWidget(elm, tokenForm);
        timelineWidget.draw();

        return timelineWidget;
    }])

    .controller('TimelineCtrl', ['$scope', '$modal', '$timeout', 'platimModel', 'service', 'timelineWidget',
        function ($scope, $modal, $timeout, platimModel, service, timelineWidget) {

            $scope.info = {
                token: undefined,
                row: undefined
            };
            $scope.$on('editToken', function(event, token, row) {
                console.log('editToken:', token);
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
                    var row = $scope.info.row;
                    console.log('Token dialog accepted:', token, "row=", row);

                    var platform = platimModel.byPlat[token.platform_id];

                    var ptoken = _.find(platform.tokens, function(t) {
                        return t.token_id === token.token_id
                    });

                    timelineWidget.data[row] = _.extend(token, {
                        state:         token.state,
                        description:   token.description,
                        start:         moment(token.start).toDate(),
                        end :          moment(token.end).toDate(),
                        content:       token.state
                    });
                    timelineWidget.updateStatusModified(row);
                    console.log('timelineWidget data[row]', timelineWidget.data[row]);

                    timelineWidget.redraw();

                }, function () {
                    console.log('Token dialog dismissed');
                });
            };

        }])

    .controller('TokenInstanceCtrl', ['$scope', '$modalInstance', 'info', 'service', 'timelineWidget',
        function ($scope, $modalInstance, info, service, timelineWidget) {

            $scope.master = angular.copy(info.token);
            $scope.token  = angular.copy(info.token);

            $scope.set = function() {
                $scope.master = angular.copy($scope.token);
                $modalInstance.close($scope.master);
            };

            $scope.delete = function() {
                console.log("delete:", info);
                if (info.token.token_id === undefined) {
                    // not in database; just remove token from timeline
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
        }])
;
