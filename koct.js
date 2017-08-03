var open = window.indexedDB.open('koct');
var configOK = false;
var commitType;

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
        var message = document.createElement('div');
        if (!result[key]) {
            message.innerHTML = 'Missing ' + key;
        } else {
            if (key != "password") {
                message.innerHTML = key + ': ' + result[key];
            } else {
                message.innerHTML = "password: ***";
            }
            i++;
        }
        messages.appendChild(message);
    }
    commitType = result['commitType'];
    if (commitType == "apply") document.getElementById("send-to-koha").innerHTML = browser.i18n.getMessage("Apply to koha");
    if (commitType == "send") document.getElementById("send-to-koha").innerHTML = browser.i18n.getMessage("Send to koha");
    if (i == 0) {
        var message = document.createElement('span');
        message.innerHTML = browser.i18n.getMessage("notConfiguredMessage");
        messages.appendChild(message);
    } else if (i < 5) {
        var message = document.createElement('span');
        message.innerHTML = browser.i18n.getMessage("missingParameters", 5 - i);
        messages.appendChild(message);
    } else {
        configOK = true;
    }

    var settingsLink = document.createElement('a');
    settingsLink.innerHTML = browser.i18n.getMessage('settings page');
    settingsLink.href = '#';
    document.querySelector('#messages').appendChild(settingsLink);
    settingsLink.addEventListener('click', function() {
        browser.runtime.openOptionsPage();
    });
}

function onConfigError(error) {
    console.log("error");
    console.log(error);
}

document.querySelector('#checkout-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    save("issue");
});

document.querySelector('#checkin-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    save("return");
});

document.querySelector('#send-to-koha').addEventListener('click', function(e) {
    e.preventDefault();
    if (commitType == "apply") commit();
    if (commitType == "send") commit(true);
});

document.querySelector('#erase').addEventListener('click', function(e) {
    e.preventDefault();
    clear();
});

document.querySelector('#erase-processed').addEventListener('click', function(e) {
    e.preventDefault();
    clearProcessed();
});

document.querySelector('#clear-cardnumber').addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('issue_patron_barcode').value = '';
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
                store.add({timestamp: currentDate, action: "issue", patronbarcode: patronbarcode, itembarcode: itembarcode, status: "Local."});
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
                store.add({timestamp: currentDate, action: "return", patronbarcode: '', itembarcode: itembarcode, status: "Local."});
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
            var tttbody = document.getElementById('transactions_table_tbody');
            tttbody.innerHTML = '';
            for (var i = 0; i < results.length; i++) {
                var circ = results[i];
                var content = "<tr><td>" + circ.timestamp + "</td>";
                content += "<td>" + circ.action + "</td>";
                content += "<td>" + circ.patronbarcode + "</td>";
                content += "<td>" + circ.itembarcode + "</td>";
                content += "<td>" + circ.status + "</td></tr>";
                tttbody.innerHTML += content;
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
        for (var i = 0; i < results.length; i++) {
            var circ = results[i];
            if (circ.status === "Added." || circ.status === "Success.") {
                var deleteRequest = store.delete(circ.id);
            }
        }
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
                    showMessage("Processing... (" + (i + 1) + "/" + results.length + ")");
                    var circ = results[i];
                    if (circ.status !== "Added." && circ.status !== "Success.") {
                        var params = "userid="      + config["login"];
                        params    += "&password="   + config["password"];
                        params    += "&branchcode=" + config["branchcode"];
                        params    += "&pending="    + pending;
                        params    += "&action="     + circ.action;
                        params    += "&timestamp="  + circ.timestamp;
                        params    += circ.patronbarcode ? "&cardnumber=" + circ.patronbarcode : "";
                        params    += "&barcode="    + circ.itembarcode;

                        var xhr = new XMLHttpRequest();
                        xhr.open("POST", url, false);
                        xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
                        //req.setRequestHeader("Content-length", params.length);
                        xhr.send(params);
                        //req.setRequestHeader("Connection", "close");
                        if ( xhr.status == 200 ) {
                            console.log("200: " + xhr.responseText);
                            circ.status = xhr.responseText;
                        } else {
                            console.error(xhr.statusText);
                            circ.status = browser.i18n.getMessage("Error: ") + xhr.statusText;
                        }
                    }

                }
                var writeTx = db.transaction("offlinecirc", "readwrite");
                var writeStore = writeTx.objectStore("offlinecirc");
                for (var i = 0; i < results.length; i++) {
                    var circ = results[i];
                    if (circ.status !== "Local.") {
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
    document.getElementById("current_status").innerHTML = browser.i18n.getMessage("currentStatusMessage") + " " + message + ".";
}

