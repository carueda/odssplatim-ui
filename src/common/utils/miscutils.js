/*
 * Some misc utilities.
 */
var odssplatimUtil = (function() {
    'use strict';

    return {
        strip: function(html) {
            var tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent||tmp.innerText;
        }

        ,parseDate: function(str) {
            return moment(str).toDate();
        }

        ,unparseDate: function(date) {
            if (date === undefined) {
                return undefined;
            }
            return moment(date).format("YYYY-MM-DD HH:mm");
        }

        ,tablify: function tablify(obj, simple) {
            simple = simple === undefined || simple;

            function escape(s) {
                return s === undefined || s === null ? s :
                    s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            }

            if (obj === null) {
                return null;
            }
            if (typeof obj === "string") {
                return escape(obj);
            }
            if (typeof obj === "function") {
                return "function";
            }
            if (typeof obj !== "object") {
                return escape(JSON.stringify(obj));
                //return obj;
            }

            var result = '<table>';  // assuming there are own properties

            var own = 0;
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    own += 1;
                    (function(key) {
                        result +=
                            '<tr>' +
                            '<td style="vertical-align:middle">' +
                            '<b>' +key+ '</b>:' +
                            '</td>';

                        if (!simple) {
                            result +=
                                '<td style="vertical-align:top; border:1pt solid #d9d9d9">' +
                                escape(JSON.stringify(obj[key])) +
                                '</td>';
                        }
                        result +=
                            '<td style="vertical-align:top; border:1pt solid #d9d9d9">' +
                            tablify(obj[key]) +
                            '</td>' +
                            '</tr>';
                    })(key);
                }
            }
            if (own == 0) {
                // no own properties
                return escape(JSON.stringify(obj));
            }

            result += '</table>';
            return result;
        }
    }

})();
