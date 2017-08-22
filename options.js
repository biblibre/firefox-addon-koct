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

function restoreOptions() {
    var keys = ['server', 'branchcode', 'login', 'password'];
    browser.storage.local.get(keys).then(function(result) {
        for (var key in result) {
            document.querySelector('#' + key).value = result[key];
        }
    });
    browser.storage.local.get("commitType").then(function(result) {
		var elements = document.getElementsByName('commitType');
		console.log(result);
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
            obj.innerHTML = valNewH;
        }
    }
}

localizeHtmlPage();

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
