
function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        server: document.querySelector('#server').value,
        branchcode: document.querySelector('#branchcode').value,
        login: document.querySelector('#login').value,
        password: document.querySelector('#password').value,
        commitType: document.querySelector('input[name="commitType"]:checked').value
    }).then(function () {
        document.getElementById('saveConfigButton').textContent = browser.i18n.getMessage("options_save") + " ✓";
    });
}

function updateBranches() {
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

function testConfig() {
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
    params += "&nocookie=1";
    url += '?' + params;
    try {
        urlObject = new URL(url);
    }
    catch(error) {
        testResultError.innerText = browser.i18n.getMessage('configurationError') + browser.i18n.getMessage('malformedURI');
        testResultStatus.innerText = "";
        return;
    }
    xhr.open("GET", urlObject, true);
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

function restoreOptions() {
    var keys = ['server', 'branchcode', 'login', 'password'];
    browser.storage.local.get(keys).then(function(result) {
        for (var key in result) {
            document.querySelector('#' + key).value = result[key];
        }

        if (document.querySelector('#server').value.trim() != '' &&
            document.querySelector('#login').value != '' &&
            document.querySelector('#password').value != '') {
            testConfig();
        }
    });
    browser.storage.local.get("commitType").then(function(result) {
		var elements = document.getElementsByName('commitType');
		for (var i=0;i<elements.length;i++) {
		  if(elements[i].value == result["commitType"]) {
			elements[i].checked = true;
		  }
		}
	});
}

function localizeHtmlPage()
{
    //Localize by replacing __MSG_***__ meta tags
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++)
    {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1)
        {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH)
        {
            // No need for html escaping here: this is not user-generated content, only translation
            obj.innerHTML = valNewH;
        }
    }
}

localizeHtmlPage();

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
document.getElementById('testConfigButton').addEventListener('click', testConfig);
