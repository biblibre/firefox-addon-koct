
function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        server: document.querySelector('#server').value,
        branchcode: document.querySelector('#branchcode').value,
        login: document.querySelector('#login').value,
        password: document.querySelector('#password').value,
        version: document.querySelector('input[name="version"]:checked').value,
        commitType: document.querySelector('input[name="commitType"]:checked').value
    }).then(function () {
        document.getElementById('saveConfigButton').textContent = browser.i18n.getMessage("options_save") + " ✓";
    });
}

async function updateBranches() {
    if (document.querySelector('input[name="version"]:checked').value == 'withoutCSRF') {
        updateBranchesWithoutCSRF();
    } else {
        updateBranchesWithCSRF();
    }
}

async function updateBranchesWithoutCSRF() {

    // TODO: Check if it works when logged-in, that could be acceptable

    var xhr = new XMLHttpRequest();
    var url = document.querySelector('#server').value.trim() + "/api/v1/libraries";
    xhr.open("GET", url, true);
    xhr.onload = function(e) {
        if (xhr.readyState == 4) {
            if (xhr.status === 200) {
                var branches = JSON.parse(xhr.responseText);
                if (branches) {
                    var branchSelect = '<select id="branchcode">';
                    var branchFound = 0;
                    var i = 0;
                    for (var key in branches) {
                        var branch = branches[key];
                        branchSelect += '<option id="branchOption' + i + '" value=""';
                        var branchcode = document.getElementById('branchcode');
                        if (branch.library_id == branchcode.value) {
                            branchSelect += ' selected="selected"';
                            branchFound = 1;
                        }
                        branchSelect += '></option>';
                        i++;
                    }
                    branchSelect += '</select>';
                    if (branchFound == 0 && branchcode.value != '') {
                        branchSelect += ' <span style="color:red">' + browser.i18n.getMessage("wrongBranchcode") + '</span>';
                    }
                    // branchSelect is a non user-generated string
                    branchcodesdiv.innerHTML = branchSelect;

                    // Now we fill our placeholders with text
                    i = 0;
                    for (var key in branches) {
                        var branch = branches[key];
                        var selectoption = document.getElementById('branchOption' + i);
                        selectoption.value = branch.library_id;
                        selectoption.text = branch.name +  ' [' + branch.library_id + ']';
                        i++;
                    }

                }
            }
        }
    };
    xhr.timeout = 10000;
    xhr.send(null);
}

async function updateBranchesWithCSRF() {
    var url = document.querySelector('#server').value.trim() + "/api/v1/libraries";

    try {
        let response = await fetch(url);
        let branches = await response.json();
        if (branches) {
            var branchSelect = '<select id="branchcode">';
            var branchFound = 0;
            var i = 0;
            for (var key in branches) {
                var branch = branches[key];
                branchSelect += '<option id="branchOption' + i + '" value=""';
                var branchcode = document.getElementById('branchcode');
                if (branch.library_id == branchcode.value) {
                    branchSelect += ' selected="selected"';
                    branchFound = 1;
                }
                branchSelect += '></option>';
                i++;
            }
            branchSelect += '</select>';
            if (branchFound == 0 && branchcode.value != '') {
                branchSelect += ' <span style="color:red">' + browser.i18n.getMessage("wrongBranchcode") + '</span>';
            }
            // branchSelect is a non user-generated string
            branchcodesdiv.innerHTML = branchSelect;

            // Now we fill our placeholders with text
            i = 0;
            for (var key in branches) {
                var branch = branches[key];
                var selectoption = document.getElementById('branchOption' + i);
                selectoption.value = branch.library_id;
                selectoption.text = branch.name + ' [' + branch.library_id + ']';
                i++;
            }

        }
    } catch (error) {

    }
}

async function testConfig() {
    if (document.querySelector('input[name="version"]:checked').value == 'withoutCSRF') {
        testConfigWithoutCSRF();
    } else {
        testConfigWithCSRF();
    }
}

async function testConfigWithoutCSRF() {
    testResultStatus.innerText = browser.i18n.getMessage("testing");
    testResultOk.innerText = "";
    testResultError.innerText = "";
    var xhr = new XMLHttpRequest();
    var serverURL = new URL(document.querySelector('#server').value.trim());
    serverURL = serverURL.origin;
    document.querySelector('#server').value = serverURL;

    var url = serverURL + "/cgi-bin/koha/offline_circ/service.pl";
    var params = "userid=" + document.querySelector('#login').value;
    params += "&password=" + document.querySelector('#password').value;
//    params += "&nocookie=1";
    try {
        urlObject = new URL(url);
    }
    catch(error) {
        testResultError.innerText = browser.i18n.getMessage('configurationError') + browser.i18n.getMessage('malformedURI');
        testResultStatus.innerText = "";
        return;
    }
    xhr.open("POST", urlObject, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.send(params);
    xhr.onload = function(e) {
        if (xhr.readyState == 4) {
            if (xhr.status === 200) {
              // For older koha versions where status is 200 even when authentication failed
              if (xhr.responseText == "Authentication failed.") {
                  testResultError.innerText = browser.i18n.getMessage("configurationError") + browser.i18n.getMessage("authenticationFailed");
              } else {
                  testResultOk.innerText = browser.i18n.getMessage('configurationOk');
                  updateBranches();
              }
            } else {
              testResultError.innerText = browser.i18n.getMessage('configurationError') + xhr.status + " " + xhr.statusText + " " + xhr.responseText;
            }
        }
        testResultStatus.innerText = "";
    };
    xhr.onerror = function (e) {
      testResultError.innerText = browser.i18n.getMessage('configurationError') + browser.i18n.getMessage('hostNotFound');
      testResultStatus.innerText = "";
    };
    xhr.ontimeout = function () {
      testResultError.innerText = browser.i18n.getMessage('configurationError') + browser.i18n.getMessage('timeout');
      testResultStatus.innerText = "";
    };
    xhr.timeout = 10000;
    xhr.send(null);

}

async function testConfigWithCSRF() {

    testResultStatus.innerText = browser.i18n.getMessage("testing");
    testResultOk.innerText = "";
    testResultError.innerText = "";
    var serverURL = new URL(document.querySelector('#server').value.trim());
    serverURL = serverURL.origin;
    document.querySelector('#server').value = serverURL;

    // preflight to get cookie and csrf token
    let authUrl = serverURL + "/cgi-bin/koha/svc/authentication";
    let preAuthResponse = await fetch(authUrl);
    let csrfToken = preAuthResponse.headers.get("csrf-token");
    
    let params = {
        method: "POST",
        credentials: "include",
        headers: {
            'csrf-token': csrfToken,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            login_userid: document.querySelector('#login').value,
            login_password: document.querySelector('#password').value,
        })
    };

    try {
        let authResponse = await fetch(authUrl, params);
        if (authResponse.ok) {

            testResultStatus.innerText = "";
            let content = await authResponse.text();
            
            if (content.indexOf('<status>ok') > -1) {
                testResultOk.innerText = browser.i18n.getMessage('configurationOk');
                updateBranches();
            } else {
                testResultError.innerText = browser.i18n.getMessage("configurationError") + browser.i18n.getMessage("authenticationFailed");
            }
        } else {
            testResultError.innerText = authResponse.statusText;
        }

    } catch (error) {
        console.log(error)
    }
}


function restoreOptions() {
    var keys = ['server', 'branchcode', 'login', 'password'];
    browser.storage.local.get(keys).then(function (result) {
        for (var key in result) {
            document.querySelector('#' + key).value = result[key];
        }

        if (document.querySelector('#server').value.trim() != '' &&
            document.querySelector('#login').value != '' &&
            document.querySelector('#password').value != '') {
            testConfig();
        }
    });
    var keys = ['commitType', 'version'];
    browser.storage.local.get(keys).then(function (result) {
        for (var key in result) {
            var elements = document.getElementsByName(key);
            for (var i = 0; i < elements.length; i++) {
                if (elements[i].value == result[key]) {
                    elements[i].checked = true;
                }
            }
        }
    });
}

function localizeHtmlPage() {
    //Localize by replacing __MSG_***__ meta tags
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++) {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function (match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if (valNewH != valStrH) {
            // No need for html escaping here: this is not user-generated content, only translation
            obj.innerHTML = valNewH;
        }
    }
}

localizeHtmlPage();

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
document.getElementById('testConfigButton').addEventListener('click', testConfig);
