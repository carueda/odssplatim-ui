/*
 * Some misc utilities.
 * @author Carlos Rueda
 */

// TODO put these under a base namespace.

function strip(html) {
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent||tmp.innerText;
}


function parseDate(str) {
    var m = moment(str);
    return m.toDate();
}

function unparseDate(date) {
    if (date === undefined) {
        return undefined;
    }
    var m = moment(date);
    var f = m.format("YYYY-MM-DD HH:mm");
    //console.log("unparseDate " + date+ " => " + f);
    return f;
}

function tablify(obj, simple) {
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
