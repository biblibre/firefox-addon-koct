function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        server: document.querySelector('#server').value,
        branchcode: document.querySelector('#branchcode').value,
        login: document.querySelector('#login').value,
        password: document.querySelector('#password').value,
        commitType: document.querySelector('input[name="commitType"]:checked').value
    });
}

function updateBranches() {
    var xhr = new XMLHttpRequest();
    var url = document.querySelector('#server').value + "/api/v1/libraries";
    xhr.open("GET", url, true);
    xhr.onload = function(e) {
        if (xhr.readyState == 4) {
            if (xhr.status === 200) {
                var branches = JSON.parse(xhr.responseText);
                if (branches) {
                    var branchSelect = '<select id="branchcode">';
                    var branchFound = 0;
                    for (var key in branches) {
                        var branch = branches[key];
                        branchSelect += '<option value="' + branch.branchcode + '"';
                        var branchcode = document.getElementById('branchcode');
                        if (branch.branchcode == branchcode.value) {
                            branchSelect += ' selected="selected"';
                            branchFound = 1;
                        }
                        branchSelect += '">' + branch.branchname + ' [' + branch.branchcode + ']' + '</option>';
                    }
                    branchSelect += '</select>';
                    if (branchFound == 0) {
                        branchSelect += ' <span style="color:red">' + browser.i18n.getMessage("wrongBranchcode") + '</span>';
                    }
                    branchcodesdiv.innerHTML = branchSelect;
                }
            }
        }
    };
    xhr.timeout = 10000;
    xhr.send(null);
}

function testConfig() {
    testResultStatus.innerText = browser.i18n.getMessage("Testing...");
    testResultOk.innerText = "";
    testResultError.innerText = "";
    var xhr = new XMLHttpRequest();
    var url = document.querySelector('#server').value + "/cgi-bin/koha/offline_circ/service.pl";
    var params = "userid=" + document.querySelector('#login').value;
    params += "&password=" + document.querySelector('#password').value;
    params += "&nocookie=1";
    url += '?' + params;
    xhr.open("GET", url, true);
    xhr.onload = function(e) {
        if (xhr.readyState == 4) {
            if (xhr.status === 200) {
              // For older koha versions where status is 200 even when authentication failed
              if (xhr.responseText == "Authentication failed.") {
                  testResultError.innerText = browser.i18n.getMessage("Configuration error: ") + browser.i18n.getMessage("Authentication failed.");
              } else {
                  testResultOk.innerText = browser.i18n.getMessage('Configuration ok');
                  updateBranches();
              }
            } else {
              testResultError.innerText = browser.i18n.getMessage('Configuration error: ') + xhr.status + " " + xhr.statusText + " " + xhr.responseText;
            }
        }
        testResultStatus.innerText = "";
    };
    xhr.onerror = function (e) {
      testResultError.innerText = browser.i18n.getMessage('Configuration error: ') + browser.i18n.getMessage('host not found');
      testResultStatus.innerText = "";
    };
    xhr.ontimeout = function () {
      testResultError.innerText = browser.i18n.getMessage('Configuration error: ') + browser.i18n.getMessage('timeout');
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
