var open = window.indexedDB.open('koct');

// Create the schema
open.onupgradeneeded = function() {
    var db = open.result;
    var store = db.createObjectStore("offlinecirc", {autoIncrement:true});
};

// Display data
open.onsuccess = function() {
    updateTable();
}

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
    commit(true);
});

document.querySelector('#apply-directly').addEventListener('click', function(e) {
    e.preventDefault();
    commit();
});

document.querySelector('#erase').addEventListener('click', function(e) {
    e.preventDefault();
    clear();
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
				store.add({timestamp: currentDate, action: "issue", patronbarcode: patronbarcode, itembarcode: itembarcode, status: "Local"});
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
				store.add({timestamp: currentDate, action: "return", patronbarcode: '', itembarcode: itembarcode, status: "Local"});
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

function commit( pending ) {
	var open = indexedDB.open('koct');
	open.onsuccess = function() {
		var db = open.result;
		var tx = db.transaction("offlinecirc", "readonly");
		var store = tx.objectStore("offlinecirc");
		//TODO: Add only local elements
		var request = store.getAll();
		request.onsuccess = function(evt) {
			var keys = ['server', 'branchcode', 'login', 'password'];
			var prefs;
			browser.storage.local.get(keys).then(function(config) {

				var url = config["server"] + "/cgi-bin/koha/offline_circ/service.pl";
				results = request.result;
				for (var i = 0; i < results.length; i++) {
					var circ = results[i];
					var params = "userid="      + config["login"];
					params    += "&password="   + config["password"];
					params    += "&branchcode=" + config["branchcode"];
					params    += "&pending="    + pending;
					params    += "&action="     + circ.action;
					params    += "&timestamp="  + circ.timestamp;
					params    += circ.patronbarcode ? "&cardnumber=" + circ.patronbarcode : "";
					params    += "&barcode="    + circ.itembarcode;

                    //FIXME: Only the first call makes it to Koha
					var req = new XMLHttpRequest();
					req.open("POST", url, false);
					req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
					//req.setRequestHeader("Content-length", params.length);
					req.send(params);
					//req.setRequestHeader("Connection", "close");


					if ( req.status == 200 ) {
						//dbConn.executeSimpleSQL("UPDATE offlinecirc SET status='"+req.responseText+"' WHERE timestamp='"+statement.row.timestamp+"'");
						console.log("200" + req.responseText);
						updateTable();
					}

				}
			});
		};
    };
}

