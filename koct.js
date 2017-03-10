document.addEventListener('DOMContentLoaded', function() {
    var keys = ['server', 'branchcode', 'login', 'password'];
    browser.storage.local.get(keys).then(function(result) {
        for (var key in result) {
            var message = document.createElement('div');
            if (!result[key]) {
                message.innerHTML = 'Missing ' + key;
            } else {
                message.innerHTML = key + ': ' + result[key];
            }
            document.querySelector('#messages').appendChild(message);
        }

        var settingsLink = document.createElement('a');
        settingsLink.innerHTML = 'Go to settings page';
        settingsLink.href = '#';
        document.querySelector('#messages').appendChild(settingsLink);
        settingsLink.addEventListener('click', function() {
            browser.runtime.openOptionsPage();
        });
    });

});

document.querySelector('#checkout-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Checkout');
});

document.querySelector('#checkin-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Checkin');
});

document.querySelector('#send-to-koha').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Sent to Koha');
});

document.querySelector('#apply-directly').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Applied directly');
});

document.querySelector('#erase').addEventListener('click', function(e) {
    e.preventDefault();
    alert('Erased');
});
