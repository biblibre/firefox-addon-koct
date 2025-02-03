var open = window.indexedDB.open('koct');
var configOK = false;
var commitType;

const LOCAL = 0;
const SENT_OK = 1;
const SENT_KO = -1;

// Create the schema
open.onupgradeneeded = function () {
    var db = open.result;
    var store = db.createObjectStore("offlinecirc", { keyPath: "id", autoIncrement: true });
};

// Display data
open.onsuccess = function () {
    updateTable();
}

open.onerror = function (event) {
    showMessage("Unable to open database: " + open.error + " Error code: " + event.target.errorCode);
}

document.addEventListener('DOMContentLoaded', function () {
    var keys = ['server', 'branchcode', 'login', 'password', 'commitType', 'version'];
    browser.storage.local.get(keys).then(onConfigSuccess, onConfigError);
});

function onConfigSuccess(result) {
    var i = 0;
    var messages = document.querySelector('#messages');
    for (var key in result) {
        if (result[key]) {
            i++;
        }
    }
    commitType = result['commitType'];
    if (commitType == "apply") document.getElementById("send-to-koha").innerText = browser.i18n.getMessage("applyToKoha");
    if (commitType == "send") document.getElementById("send-to-koha").innerText = browser.i18n.getMessage("sendToKoha");
    if (i == 0) {
        var message = document.createElement('span');
        message.innerText = browser.i18n.getMessage("notConfiguredMessage");
        messages.appendChild(message);
    } else if (i < 5) {
        var message = document.createElement('span');
        message.innerText = browser.i18n.getMessage("missingParameters", 5 - i);
        messages.appendChild(message);
    } else {
        document.getElementById("send-to-koha").disabled = false;
        document.getElementById('issue_patron_barcode').focus();
        configOK = true;
    }

    if (i < 5) {
        var settingsLink = document.createElement('a');
        settingsLink.innerText = browser.i18n.getMessage('settingsPage');
        settingsLink.href = '#';
        document.querySelector('#messages').appendChild(settingsLink);
        settingsLink.addEventListener('click', function () {
            browser.runtime.openOptionsPage();
        });
    }
}

function onConfigError(error) {
    console.log("error");
    console.log(error);
}

document.querySelector('#checkout-form button[type="submit"]').addEventListener('click', function (e) {
    e.preventDefault();
    if (document.getElementById('issue_patron_barcode').value != '' &&
        document.getElementById('issue_item_barcode').value != '') {
        save("issue");
    } else if (document.getElementById('issue_patron_barcode').value != '') {
        document.getElementById('issue_item_barcode').focus();
    }
});

document.querySelector('#checkin-form button[type="submit"]').addEventListener('click', function (e) {
    e.preventDefault();
    if (document.getElementById('return_item_barcode').value != '') {
        save("return");
    }
});

document.querySelector('#send-to-koha').addEventListener('click', function (e) {
    e.preventDefault();
    if (commitType == "apply") commit();
    if (commitType == "send") commit(true);
});

document.querySelector('#erase').addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm(browser.i18n.getMessage('clearConfirmation'))) {
        clear();
    }
});

document.querySelector('#erase-processed').addEventListener('click', function (e) {
    e.preventDefault();
    clearProcessed();
});

document.querySelector('#export').addEventListener('click', function (e) {
    e.preventDefault();
    exportData();
});

document.querySelector('#open-configuration').addEventListener('click', function (e) {
    e.preventDefault();
    browser.runtime.openOptionsPage();
});


document.querySelector('#clear-cardnumber').addEventListener('click', function (e) {
    e.preventDefault();
    document.getElementById('issue_patron_barcode').value = '';
    document.getElementById('issue_patron_barcode').focus();
});

function exportData() {
    var open = indexedDB.open('koct');
    open.onsuccess = function () {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readonly");
        var store = tx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function (evt) {
            var results = request.result;
            if (results) {
                var content = "Version=1.0\tGenerator=koct-firefox\tGeneratorVersion=0.1\r\n";
                for (var i = 0; i < results.length; i++) {
                    var circ = results[i];
                    content += circ.timestamp + "\t";
                    content += circ.action + "\t";
                    switch (circ.action) {
                        case 'issue':
                            content += circ.patronbarcode + "\t";
                            content += circ.itembarcode + "\t";
                            break;
                        case 'return':
                            content += circ.itembarcode + "\t";
                            break;
                    }
                    content += "\r\n";
                }
                var blob = new Blob([content], { type: 'text/csv' });
                objectURL = URL.createObjectURL(blob);
                var currentDate = new Date();
                var twoDigitMonth = ((currentDate.getMonth() + 1) >= 10) ? (currentDate.getMonth() + 1) : '0' + (currentDate.getMonth() + 1);
                var twoDigitDate = ((currentDate.getDate()) >= 10) ? (currentDate.getDate()) : '0' + (currentDate.getDate());
                var twoDigitHours = ((currentDate.getHours()) >= 10) ? (currentDate.getHours()) : '0' + (currentDate.getHours());
                var twoDigitMinutes = ((currentDate.getMinutes()) >= 10) ? (currentDate.getMinutes()) : '0' + (currentDate.getMinutes());
                var createdDateTo = currentDate.getFullYear() + "-" + twoDigitMonth + "-" + twoDigitDate + "-" + twoDigitHours + "-" + twoDigitMinutes;
                browser.downloads.download({ url: objectURL, filename: createdDateTo + ".koc" });
            }
        }
    }
}

function save(type) {
    var utcTimestamp = new Date().getTime();
    var currentDate = new Date(utcTimestamp).toISOString().slice(0, 19).replace('T', ' ');
    switch (type) {
        case 'issue':
            var open = indexedDB.open('koct');

            open.onsuccess = function () {
                var db = open.result;
                var tx = db.transaction("offlinecirc", "readwrite");
                var store = tx.objectStore("offlinecirc");
                var patronbarcode = document.getElementById('issue_patron_barcode').value;
                var itembarcode = document.getElementById('issue_item_barcode').value;
                store.add({ timestamp: currentDate, action: "issue", patronbarcode: patronbarcode, itembarcode: itembarcode, status: LOCAL });
                document.getElementById('issue_item_barcode').value = '';
                document.getElementById('issue_item_barcode').focus();
            };

            break;
        case 'return':
            var open = indexedDB.open('koct');

            open.onsuccess = function () {
                var db = open.result;
                var tx = db.transaction("offlinecirc", "readwrite");
                var store = tx.objectStore("offlinecirc");
                var patronbarcode = document.getElementById('issue_patron_barcode').value;
                var itembarcode = document.getElementById('return_item_barcode').value;
                store.add({ timestamp: currentDate, action: "return", patronbarcode: '', itembarcode: itembarcode, status: LOCAL });
                document.getElementById('return_item_barcode').value = '';
                document.getElementById('return_item_barcode').focus();
            };

            break;
    }
    updateTable();
}

function updateTable() {
    var open = indexedDB.open('koct');
    open.onsuccess = function () {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readonly");
        var store = tx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function (evt) {
            var results = request.result;
            if (results) {
                var tttbody = document.getElementById('transactions_table_tbody');
                tttbody.innerHTML = '';
                for (var i = results.length - 1; i >= 0; i--) {
                    var circ = results[i];
                    var statusDisplay;
                    var statusErrorMessage;
                    switch (circ.status) {
                        case LOCAL:
                            statusDisplay = browser.i18n.getMessage("Local");
                            break;
                        case SENT_OK:
                            statusDisplay = '<span class="ok">' + browser.i18n.getMessage("Sent") + '</span>';
                            break;
                        case SENT_KO:
                            statusErrorMessage = browser.i18n.getMessage(circ.statusMessage) ? browser.i18n.getMessage(circ.statusMessage) : circ.statusMessage;
                            statusDisplay = '<span class="ko">' + browser.i18n.getMessage("Error") + ': <span id="statusErrorMessage' + i + '"></span></span>';
                            break;
                    }

                    var content = '<tr><td id="timestamp' + i + '"></td>';
                    content += '<td id="action' + i + '"></td>';
                    content += '<td id="patronbarcode' + i + '"></td>';
                    content += '<td id="itembarcode' + i + '"></td>';

                    // statusDiplay is a non user-generated string (see previous switch)
                    content += "<td>" + statusDisplay + "</td></tr>";
                    tttbody.innerHTML += content;

                    // Now we fill our placeholders with innerText
                    document.getElementById('timestamp' + i).innerText = circ.timestamp;
                    document.getElementById('action' + i).innerText = browser.i18n.getMessage(circ.action);
                    document.getElementById('patronbarcode' + i).innerText = circ.patronbarcode;
                    document.getElementById('itembarcode' + i).innerText = circ.itembarcode;
                    if (document.getElementById('statusErrorMessage' + i)) {
                        document.getElementById('statusErrorMessage' + i).innerText = statusErrorMessage;
                    }
                }
            }
        };
    };

}

function clear() {
    var open = indexedDB.open('koct');
    open.onsuccess = function () {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readwrite");
        var store = tx.objectStore("offlinecirc");
        var request = store.clear();
    };
    updateTable();
}

function clearProcessed() {
    var open = indexedDB.open('koct');
    open.onsuccess = function () {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readwrite");
        var store = tx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function (evt) {
            var results = request.result;
            if (results) {
                for (var i = 0; i < results.length; i++) {
                    var circ = results[i];
                    if (circ.status == SENT_OK) {
                        var deleteRequest = store.delete(circ.id);
                    }
                }
            }
        };
    };
    updateTable();
}


/**
 * Promise which returns a valid csrf token if credentials are correct
 * @returns 
 */
async function getCSRFToken() {
    var keys = ['server', 'login', 'password'];
    let config = await browser.storage.local.get(keys);

    // preflight to get cookie and csrf token
    let authUrl = config["server"] + "/cgi-bin/koha/svc/authentication";
    let preAuthResponse = await fetch(authUrl);
    let csrfToken = preAuthResponse.headers.get("csrf-token");
    let preAuthResponseText = await preAuthResponse.text();

    // check if session is already valid
    if (preAuthResponseText.indexOf('<status>ok') > -1) {
        // session is already valid, we can use token
        return Promise.resolve(csrfToken);
    }

    const params = { method: "POST", credentials: "include" };
    let payload = {
        login_userid: config["login"],
        login_password: config["password"],
    }
    params.headers = {
        'csrf-token': csrfToken,
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    params.body = new URLSearchParams(payload);

    try {
        let authResponse = await fetch(authUrl, params);
        let authResponseText = await authResponse.text();
        //console.log("getCSRFToken preauth: " + authResponseText);

        if (authResponseText.indexOf('<status>ok') > -1) {
            return Promise.resolve(authResponse.headers.get("csrf-token"));
        }

    } catch (error) {
        console.log(error);
    }
    return Promise.reject("error getting csrf token");
}

async function commit(pending) {

    if (configOK != true) {
        alert(browser.i18n.getMessage('configurationNeededAlert'));;
        return;
    }

    browser.storage.local.get('version').then(async function (version) {
        if (version == 'withoutCSRF') {
            commitWithoutCSRF(pending);
        } else {
            commitWithCSRF(pending);
        }
    });
}

async function commitWithoutCSRF(pending) {
    var open = indexedDB.open('koct');
    open.onsuccess = function() {
        var db = open.result;
        var readTx = db.transaction("offlinecirc", "readonly");
        var store = readTx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function(evt) {
            var keys = ['server', 'branchcode', 'login', 'password'];
            browser.storage.local.get(keys).then(function(config) {

            var url = config['server'] + "/cgi-bin/koha/svc/authentication";
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            var params = "login_userid="      + config['login'];
            params    += "&login_password="   + config['password'];
            xhr.send(params);
            csrfToken = xhr.getResponseHeader('Csrf-token');
            cookie = xhr.getResponseHeader('Set-Cookie');

            xhr.open("POST", url, false);
            xhr.send(params);
            //console.log(xhr.getResponseHeader('Csrf-token'));

//                csrfToken = authenticate(config["server"], config["login"], config["password"]);

                var url = config["server"] + "/cgi-bin/koha/offline_circ/service.pl";
                var results = request.result;

                for (var i = 0; i < results.length; i++) {
                    showMessage(browser.i18n.getMessage("processingMessage") + " (" + (i + 1) + "/" + results.length + ")");
                    var circ = results[i];
                    if (circ.status != SENT_OK) {
                        var params = "userid="      + config["login"];
                        params    += "&password="   + config["password"];
                        params    += "&branchcode=" + config["branchcode"];
                        params    += "&pending="    + pending;
                        params    += "&action="     + circ.action;
                        params    += "&timestamp="  + circ.timestamp;
                        params    += circ.patronbarcode ? "&cardnumber=" + circ.patronbarcode : "";
                        params    += "&barcode="    + circ.itembarcode;
                      //  params    += "&nocookie=1";

                        var xhr = new XMLHttpRequest();
                        xhr.open("POST", url, false);
                        xhr.withCredentials = true;
                        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
                        xhr.setRequestHeader('Cookie', cookie);
                        xhr.setRequestHeader("Csrf-token", csrfToken);
                        //req.setRequestHeader("Content-length", params.length);
                        xhr.send(params);
                        //req.setRequestHeader("Connection", "close");
                        if ( xhr.status == 200 ) {
                            // console.log("200: " + xhr.responseText);
                            // Since Koha sends a 200 even if there is a problem (authentication failed for instance),
                            // we have to check the output
                            if (xhr.responseText == "Added." || xhr.responseText == "Success.") {
                                circ.status = SENT_OK;
                            } else {
                                circ.status = SENT_KO;
                                circ.statusMessage = xhr.responseText;
                            }
                        } else {
                            console.error(xhr.statusText);
                            circ.status = SENT_KO;
                            circ.statusMessage = xhr.statusText;
                        }
                    }

                }
                var writeTx = db.transaction("offlinecirc", "readwrite");
                var writeStore = writeTx.objectStore("offlinecirc");
                for (var i = 0; i < results.length; i++) {
                    var circ = results[i];
                    if (circ.status != LOCAL) {
                        var updateRequest = writeStore.put(circ);
                    }
                }
                writeTx.oncomplete = function() {
                    showMessage(browser.i18n.getMessage("transactionCompletedMessage"));
                    updateTable();
                }

            });
        };
    };
}

async function commitWithCSRF(pending) {

    let authenticatedToken;
    try {
        authenticatedToken = await getCSRFToken();
    } catch (error) {
        console.log(error)
        // happens when credentials are not correct
        return alert(browser.i18n.getMessage('configurationNeededAlert'))
    }

    var open = indexedDB.open('koct');
    open.onsuccess = function () {
        var db = open.result;
        var readTx = db.transaction("offlinecirc", "readonly");
        var store = readTx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function (evt) {
            var keys = ['server', 'branchcode', 'login', 'password'];
            browser.storage.local.get(keys).then(async function (config) {

                var url = config["server"] + "/cgi-bin/koha/offline_circ/service.pl";
                var results = request.result;

                for (var i = 0; i < results.length; i++) {
                    showMessage(browser.i18n.getMessage("processingMessage") + " (" + (i + 1) + "/" + results.length + ")");
                    var circ = results[i];
                    if (circ.status != SENT_OK) {

                        let payload = {
                            userid: config["login"],
                            login_userid: config["login"],
                            branchcode: config["branchcode"],
                            pending: pending,
                            action: circ.action,
                            timestamp: circ.timestamp,
                            barcode: circ.itembarcode
                        }
                        if (circ.patronbarcode) {
                            payload.cardnumber = circ.patronbarcode
                        }

                        const params = {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                'csrf-token': authenticatedToken,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: new URLSearchParams(
                                payload
                            )
                        }

                        try {
                            let response = await fetch(url, params);

                            if (response.ok) {
                                // 2XX
                                let responseText = await response.text();
                                if (responseText == "Added." || responseText == "Success.") {
                                    circ.status = SENT_OK;
                                } else {
                                    circ.status = SENT_KO;
                                    circ.statusMessage = responseText;
                                }
                            } else {
                                // 4XX
                                circ.status = SENT_KO;
                                circ.statusMessage = response.statusText;
                            }

                        } catch (error) {
                            circ.status = SENT_KO;
                            circ.statusMessage = "internalServerError";
                        }
                    }

                }
                var writeTx = db.transaction("offlinecirc", "readwrite");
                var writeStore = writeTx.objectStore("offlinecirc");
                for (var i = 0; i < results.length; i++) {
                    var circ = results[i];
                    if (circ.status != LOCAL) {
                        var updateRequest = writeStore.put(circ);
                    }
                }
                writeTx.oncomplete = function () {
                    showMessage(browser.i18n.getMessage("transactionCompletedMessage"));
                    updateTable();
                }

            });
        };
    };
}

function showMessage(message) {
    document.getElementById("current_status").innerText = browser.i18n.getMessage("currentStatusMessage") + ": " + message + ".";
}

