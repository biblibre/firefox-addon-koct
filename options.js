function saveOptions(e) {
    e.preventDefault();
    browser.storage.local.set({
        server: document.querySelector('#server').value,
        branchcode: document.querySelector('#branchcode').value,
        login: document.querySelector('#login').value,
        password: document.querySelector('#password').value
    });
}

function restoreOptions() {
    var keys = ['server', 'branchcode', 'login', 'password'];
    browser.storage.local.get(keys).then(function(result) {
        for (key in result) {
            document.querySelector('#' + key).value = result[key];
        }
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
