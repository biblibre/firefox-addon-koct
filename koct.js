updateTable();

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
    save("issue");
});

document.querySelector('#checkin-form button[type="submit"]').addEventListener('click', function(e) {
    e.preventDefault();
    save("return");
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

function save(type) {

    switch (type) {
        case 'issue': 
			var open = indexedDB.open('koct');

			// Create the schema
			open.onupgradeneeded = function() {
				var db = open.result;
				var store = db.createObjectStore("offlinecirc", {autoIncrement:true});
			};

			open.onsuccess = function() {
				var db = open.result;
				var tx = db.transaction("offlinecirc", "readwrite");
				var store = tx.objectStore("offlinecirc");
				var patronbarcode = document.getElementById('issue_patron_barcode').value;
				var itembarcode = document.getElementById('issue_item_barcode').value;
				store.add({timestamp: "1", action: "issue", patronbarcode: patronbarcode, itembarcode: itembarcode, status: "status"});
				document.getElementById('issue_item_barcode').value = '';
				document.getElementById('issue_item_barcode').focus();
			};
			
        break;
        case 'return':
			var open = indexedDB.open('koct');

			// Create the schema
			open.onupgradeneeded = function() {
				var db = open.result;
				var store = db.createObjectStore("offlinecirc", {autoIncrement:true});
			};

			open.onsuccess = function() {
				var db = open.result;
				var tx = db.transaction("offlinecirc", "readwrite");
				var store = tx.objectStore("offlinecirc");
				var patronbarcode = document.getElementById('issue_patron_barcode').value;
				var itembarcode = document.getElementById('return_item_barcode').value;
				store.add({timestamp: "1", action: "return", patronbarcode: null, itembarcode: itembarcode, status: "status"});
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
			results = request.result;
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
