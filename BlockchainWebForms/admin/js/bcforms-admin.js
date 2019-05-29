(function( $ ) {
	'use strict';

	/**
	 * All of the code for your admin-facing JavaScript source
	 * should reside in this file.
	 *
	 * Note: It has been assumed you will write jQuery code here, so the
	 * $ function reference has been prepared for usage within the scope
	 * of this function.
	 *
	 * This enables you to define handlers, for when the DOM is ready:
	 *
	 * $(function() {
	 *
	 * });
	 *
	 * When the window is loaded:
	 *
	 * $( window ).load(function() {
	 *
	 * });
	 *
	 * ...and/or other possibilities.
	 *
	 * Ideally, it is not considered best practise to attach more than a
	 * single DOM-ready or window-load handler for a particular page.
	 * Although scripts in the WordPress core, Plugins and Themes may be
	 * practising this, we should strive to set a better example in our own work.
	 */

	$(function() {

		if (window.bc_forms_pk) {
			importKey(bc_forms_pk)
			.then(function(privateKey){
				showEntries(privateKey);
			});
		}

		var $keysForm = $('#keysGenerationForm');
		var $submitButton = $keysForm.find('#submit');

		$keysForm.on('submit', function(e) {
			e.preventDefault();
			var form = this;

			$submitButton.attr('disabled', 'disabled');
			$submitButton.val('Generating...');

			generateKeys(function() {
				$keysForm.off('submit');

				$submitButton.removeAttr('disabled');
				$submitButton.val('Save');
			});
			return false;
		});

		function generateKeys(onGeneratedKeys) {

			if (!window.crypto.subtle) {
				alert('Cryptography needs https to work!');
			}

			window.crypto.subtle.generateKey(
				{
					name: "RSA-OAEP",
					modulusLength: 2048, //can be 1024, 2048, or 4096
					publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
					hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
				},
				true, //whether the key is extractable (i.e. can be used in exportKey)
				["encrypt", "decrypt"] //must be ["encrypt", "decrypt"] or ["wrapKey", "unwrapKey"]
			)
			.then(function(key){
				//returns a keypair object

				exportKey(key.privateKey).then(function(keydata){
					$('#bcforms_pk').val(JSON.stringify(keydata));

					exportKey(key.publicKey).then(function(keydata){
						$('#bcforms_pub').val(JSON.stringify(keydata));
						onGeneratedKeys();
					})
				})
			})
			.catch(function(err){
				console.error(err);
			});
		}

		function exportKey(key) {
			return window.crypto.subtle.exportKey(
				"jwk",
				key
			)
			.catch(function(err){
				console.error(err);
			});
		}
	});

	function showEntries(privateKey) {

		var FormTst = initContract();
		var entries = [];
		FormTst.getDataLength(function(error, resultsCount){
		    if(!error) {
		    	var resultsCountNumber = resultsCount.toNumber();
		    	var addedCounter = 0;
		    	console.log(resultsCountNumber);

			    if (resultsCountNumber > 0) {
			    	for (var i = resultsCountNumber - 1; i >= 0; i--) {
			    		(function(i) {
				    		FormTst.getDataAtIndex(i ,function(error, entry) {
				    			entry = web3.toAscii(entry);
				    			console.log(i, entry);
				    			try {
				    				entries[resultsCountNumber - 1 - i] = JSON.parse(entry);

									addedCounter++;
					    			if (addedCounter == resultsCountNumber) {
					    				console.log(entries);
										var jsonHtmlTable = ConvertJsonToTable(entries, 'jsonTable', null, 'Download');
									    $("#bcdata").html(jsonHtmlTable);
					    			}

								} catch(e) {
										// addedCounter++;
									// entries[resultsCountNumber - 1 - i] = {"your-name": "N/A", "your-email": "N/A", "your-subject": "N/A", "your-message": "N/A"}
					    			decryptString(entry, privateKey)
									.then(function(decrypted){
										if (!decrypted) {
											addedCounter++;
											entries[resultsCountNumber - 1 - i] = {"your-name": "N/A", "your-email": "N/A", "your-subject": "N/A", "your-message": "N/A"};
											return;
										}

									    //returns an ArrayBuffer containing the decrypted data
									    var entry = ab2str(decrypted);
										console.log('decrypted', i, entry, decrypted);
						    			addedCounter++;
						    			entries[resultsCountNumber - 1 - i] = JSON.parse(entry);

						    			if (addedCounter == resultsCountNumber) {
											var jsonHtmlTable = ConvertJsonToTable(entries, 'jsonTable', null, 'Download');
										    $("#bcdata").html(jsonHtmlTable);
						    			}
									})
								}
				    		});
			    		})(i);
			    	}
			    }
		    } else {
		        console.error(error);
		    }
		});
	}



	function importKey(keyJwk) {
		return window.crypto.subtle.importKey(
		    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
		    keyJwk
		    ,
		    {   //these are the algorithm options
		        name: "RSA-OAEP",
		        modulusLength: 2048,
		        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
				hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
		    },
		    true, //whether the key is extractable (i.e. can be used in exportKey)
		    ["decrypt"] //"encrypt" or "wrapKey" for public key import or
		                //"decrypt" or "unwrapKey" for private key imports
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function decryptString(str, privateKey) {
		// var data = convertStringToArrayBufferView(str);
		const fromHexString = hexString => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
		var data  = new Uint8Array(fromHexString(str));
		console.log(data);
		return parseData(data, privateKey);
	}


	//data is Uint8Array
	async function parseData(data, pk) {
		var ivKeyEnc = data.slice(0, 256);
		var ivKey = await decryptRSA(ivKeyEnc, pk);
		ivKey = new Uint8Array(ivKey);
		var aesKey = await importAESKey(ab2str(ivKey.slice(16).buffer));
		var iv = ivKey.slice(0,16);
		var secretArr = await decryptAES(data.slice(256), aesKey, iv);
		return secretArr;
	}

	function decryptRSA(arr, privateKey) {
		return window.crypto.subtle.decrypt(
		    {
		        name: "RSA-OAEP",
		    },
		    privateKey, //from generateKey or importKey above
		    arr //ArrayBuffer of the data
		)
		.catch(function(err){
			// console.error('decrypt error for str', str);
		    console.error(err);
		});
	}

	function importRSAKey(prviateRSAKeyJwk) {
		return window.crypto.subtle.importKey(
		    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
		    prviateRSAKeyJwk
		    ,
		    {   //these are the algorithm options
		        name: "RSA-OAEP",
		        modulusLength: 2048,
		        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
				hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
		    },
		    true, //whether the key is extractable (i.e. can be used in exportKey)
		    ["decrypt"]
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function importAESKey(key) {
		return window.crypto.subtle.importKey(
		    "jwk", //can be "jwk" or "raw"
		    {   //this is an example jwk key, "raw" would be an ArrayBuffer
		        kty: "oct",
		        k: key,
		        alg: "A256CBC",
		        ext: true,
		    },
		    {   //this is the algorithm options
		        name: "AES-CBC",
		    },
		    false, //whether the key is extractable (i.e. can be used in exportKey)
		    ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function decryptAES(arr, key, iv) {
		return window.crypto.subtle.decrypt(
		    {
		        name: "AES-CBC",
		        iv: iv
		    },
		    key,
		    arr
		)
		.catch(function(err){
		    console.error(err);
		});
	}





	// aux
	function ab2str(buf) {
		var dataView = new DataView(buf);
        // The TextDecoder interface is documented at http://encoding.spec.whatwg.org/#interface-textdecoder
        var decoder = new TextDecoder('utf-8');
        return decoder.decode(dataView);
	}
	function str2ab(str) {
		var encoder = new TextEncoder();
		return encoder.encode(str);
	}

})( jQuery );
