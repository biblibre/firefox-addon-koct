var open = window.indexedDB.open('koct');
var configOK = false;
var commitType;

const LOCAL = 0;
const SENT_OK = 1;
const SENT_KO = -1;

function escapeHTML(str) { return str.replace(/[&"'<>]/g, (m) => ({ "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" })[m]); }

// Create the schema
open.onupgradeneeded = function() {
    var db = open.result;
    var store = db.createObjectStore("offlinecirc", {keyPath: "id", autoIncrement:true});
};

// Display data
open.onsuccess = function() {
    updateTable();
}

document.addEventListener('DOMContentLoaded', function() {
    var keys = ['server', 'branchcode', 'login', 'password', 'commitType'];
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
    if (commitType == "apply") document.getElementById("send-to-koha").innerHTML = escapeHTML(browser.i18n.getMessage("Apply to koha"));
    if (commitType == "send") document.getElementById("send-to-koha").innerHTML = escapeHTML(browser.i18n.getMessage("Send to koha"));
    if (i == 0) {
        var message = document.createElement('span');
        message.innerHTML = escapeHTML(browser.i18n.getMessage("notConfiguredMessage"));
        messages.appendChild(message);
    } else if (i < 5) {
        var message = document.createElement('span');
        message.innerHTML = escapeHTML(browser.i18n.getMessage("missingParameters", 5 - i));
        messages.appendChild(message);
    } else {
        document.getElementById("send-to-koha").disabled = false;
        document.getElementById('issue_patron_barcode').focus();
        configOK = true;
    }

    if (i < 5) {
        var settingsLink = document.createElement('a');
        settingsLink.innerHTML = escapeHTML(browser.i18n.getMessage('settings page'));
        settingsLink.href = '#';
        document.querySelector('#messages').appendChild(settingsLink);
        settingsLink.addEventListener('click', function() {
            browser.runtime.openOptionsPage();
        });
    }
}

function onConfigError(error) {
    console.log("error");
    console.log(error);
}

document.querySelector('#checkout-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    if (document.getElementById('issue_patron_barcode').value != '' &&
        document.getElementById('issue_item_barcode').value != '') {
        save("issue");
    } else if (document.getElementById('issue_patron_barcode').value != '') {
        document.getElementById('issue_item_barcode').focus();
    }
});

document.querySelector('#checkin-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    if (document.getElementById('return_item_barcode').value != '') {
        save("return");
    }
});

document.querySelector('#send-to-koha').addEventListener('click', function(e) {
    e.preventDefault();
    if (commitType == "apply") commit();
    if (commitType == "send") commit(true);
});

document.querySelector('#erase').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm(browser.i18n.getMessage('clearConfirmation'))) {
        clear();
    }
});

document.querySelector('#erase-processed').addEventListener('click', function(e) {
    e.preventDefault();
    clearProcessed();
});

document.querySelector('#clear-cardnumber').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('issue_patron_barcode').value = '';
    document.getElementById('issue_patron_barcode').focus();
});



function save(type) {
    var currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    switch (type) {
        case 'issue':
            var open = indexedDB.open('koct');

            open.onsuccess = function() {
                var db = open.result;
                var tx = db.transaction("offlinecirc", "readwrite");
                var store = tx.objectStore("offlinecirc");
                var patronbarcode = document.getElementById('issue_patron_barcode').value;
                var itembarcode = document.getElementById('issue_item_barcode').value;
                store.add({timestamp: currentDate, action: "issue", patronbarcode: patronbarcode, itembarcode: itembarcode, status: LOCAL});
                document.getElementById('issue_item_barcode').value = '';
                document.getElementById('issue_item_barcode').focus();
            };

        break;
        case 'return':
            var open = indexedDB.open('koct');

            open.onsuccess = function() {
                var db = open.result;
                var tx = db.transaction("offlinecirc", "readwrite");
                var store = tx.objectStore("offlinecirc");
                var patronbarcode = document.getElementById('issue_patron_barcode').value;
                var itembarcode = document.getElementById('return_item_barcode').value;
                store.add({timestamp: currentDate, action: "return", patronbarcode: '', itembarcode: itembarcode, status: LOCAL});
                document.getElementById('return_item_barcode').value = '';
                document.getElementById('return_item_barcode').focus();
            };

        break;
    }
    updateTable();
}

function updateTable() {
    var open = indexedDB.open('koct');
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readonly");
        var store = tx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function(evt) {
            var results = request.result;
            if (results) {
                var tttbody = document.getElementById('transactions_table_tbody');
                tttbody.innerHTML = '';
                for (var i = 0; i < results.length; i++) {
                    var circ = results[i];
                    var statusDisplay;

                    switch (circ.status) {
                        case LOCAL:
                            statusDisplay = escapeHTML(browser.i18n.getMessage("Local"));
                            break;
                        case SENT_OK:
                            statusDisplay = '<span class="ok">' + escapeHTML(browser.i18n.getMessage("Sent")) + '</span>';
                            break;
                        case SENT_KO:
                            var statusErrorMessage = browser.i18n.getMessage(circ.statusMessage) ? browser.i18n.getMessage(circ.statusMessage) : circ.statusMessage;
                            statusDisplay = '<span class="ko">' + escapeHTML(browser.i18n.getMessage("Error") + ": " + statusErrorMessage) + '</span>';
                            break;
                    }

                    var content = "<tr><td>" + circ.timestamp + "</td>";
                    content += "<td>" + escapeHTML(browser.i18n.getMessage(circ.action)) + "</td>";
                    content += "<td>" + escapeHTML(circ.patronbarcode) + "</td>";
                    content += "<td>" + escapeHTML(circ.itembarcode) + "</td>";
                    // escapeHTML is not needed here: content was previously escaped
                    content += "<td>" + statusDisplay + "</td></tr>";

                    // All content was previously html escaped
                    tttbody.innerHTML += content;
                }
            }
        };
    };

}

function clear() {
    var open = indexedDB.open('koct');
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readwrite");
        var store = tx.objectStore("offlinecirc");
        var request = store.clear();
    };
    updateTable();
}

function clearProcessed() {
    var open = indexedDB.open('koct');
    open.onsuccess = function() {
        var db = open.result;
        var tx = db.transaction("offlinecirc", "readwrite");
        var store = tx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function(evt) {
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

function commit( pending ) {
    if (configOK != true) {
        alert(browser.i18n.getMessage('configurationNeededAlert'));;
        return;
    }
    var open = indexedDB.open('koct');
    open.onsuccess = function() {
        var db = open.result;
        var readTx = db.transaction("offlinecirc", "readonly");
        var store = readTx.objectStore("offlinecirc");
        var request = store.getAll();
        request.onsuccess = function(evt) {
            var keys = ['server', 'branchcode', 'login', 'password'];
            browser.storage.local.get(keys).then(function(config) {

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
                        params    += "&nocookie=1";

                        var xhr = new XMLHttpRequest();
                        xhr.open("POST", url, false);
                        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
                        //req.setRequestHeader("Content-length", params.length);
                        xhr.send(params);
                        //req.setRequestHeader("Connection", "close");
                        if ( xhr.status == 200 ) {
                            console.log("200: " + xhr.responseText);
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

function showMessage(message) {
    document.getElementById("current_status").innerHTML = escapeHTML(browser.i18n.getMessage("currentStatusMessage")) + ": " + message + ".";
}

