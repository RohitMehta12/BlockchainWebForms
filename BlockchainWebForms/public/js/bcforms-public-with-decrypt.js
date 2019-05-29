(function( $ ) {
	'use strict';

	console.log('bcforms');

	var bcforms_pub = window.bcforms_pub;

	if (!bcforms_pub) {
		return;
	}

	importKey(bcforms_pub)
	.then(function(publicKey){

		$(function() {
			var $submitButton = $('input.wpcf7-submit[type="submit"]');

			if (!$submitButton.length) {
				return;
			}

			var FormTst = initContract();

			$submitButton.click(function(e) {
				e.stopPropagation();
				e.preventDefault();
				setTimeout(function() {sendBCFormData(FormTst, publicKey)}, 1);
				return false;
			});

			$(".wpcf7-form").on('submit', function(e) {
				e.stopPropagation();
				e.preventDefault();
				console.log('e');
				return false;
			})
		});
	})






	function sendBCFormData(FormTst, publicKey) {
		var dataS = buildDataToSend();
		console.log(dataS);
		// testing


		encryptString(dataS, publicKey)
		.then(function(encrypted){
		    // returns an ArrayBuffer containing the encrypted data
		    var encArr = new Uint8Array(encrypted);
		    var dataS = convertArrayBufferViewtoString(encArr);

		    encArr = convertStringToArrayBufferView(dataS);


		    importDecryptKey(window.bcforms_pk)
		    .then(function(private_key_object) {

				var decrypt_promise = null;
				var decrypted_data = null;

				decrypt_data();

				function decrypt_data()
				{
				    decrypt_promise = crypto.subtle.decrypt({name: "RSA-OAEP"}, private_key_object, encArr);

				    decrypt_promise.then(
				        function(result){
				            decrypted_data = new Uint8Array(result);
				            console.log('decrypted to', convertArrayBufferViewtoString(decrypted_data));
				        },
				        function(e){
				            console.log(e.message);
				        }
				    );
				}

		    });



		});


		return;



		// end testing





		// encryptString(dataS, publicKey)
		// .then(function(encrypted){
		    //returns an ArrayBuffer containing the encrypted data
		    // var encArr = new Uint8Array(encrypted);
		    // var dataS = convertArrayBufferViewtoString(encArr);

			// estimate gas required
			FormTst.sendData.estimateGas(dataS, {from: web3.eth.defaultAccount}, function(e, gasAmount) {
				if (!e) {
					web3.eth.getGasPrice(function(e, gasPrice){
						if (!e) {
							console.log('gasPrice', gasPrice)
							sendData(dataS, gasAmount, gasPrice)
						} else {
							console.log(e);
						}
					});
				} else {
					console.log(e);
				}
			});
		// })

		function buildDataToSend() {
			var fields = $('.wpcf7-form :input[type!=hidden][type!=submit]').serializeArray()
			var data = {};
			jQuery.each( fields, function(i, field) {
				set(data, field.name, field.value)
			})

			return JSON.stringify(data);
		}

		//todo check gasAmount as it may be different at run time
		function sendData(dataS, gasAmount, gasPrice) {
		    FormTst.sendData(dataS, {gas: gasAmount, gasPrice: gasPrice}, function(error, result) {
			    if(!error) {

			    	$('input.wpcf7-submit[type="submit"]').replaceWith("<a href='https://ropsten.etherscan.io/tx/" + result + "' target='_blank'>Data sent to blockchain. See transaction</a>")

			        console.log(JSON.stringify(result));
			    }
			    else
			        console.error(error);
			})
		}

		// https://stackoverflow.com/questions/18936915/dynamically-set-property-of-nested-object
		function set(obj, path, value) {
		    var schema = obj;  // a moving reference to internal objects within obj
		    var pList = path.split('.');
		    var len = pList.length;
		    for(var i = 0; i < len-1; i++) {
		        var elem = pList[i];
		        if( !schema[elem] ) schema[elem] = {}
		        schema = schema[elem];
		    }

		    schema[pList[len-1]] = value;
		}
	};


	function importKey(pubJwk) {
		return window.crypto.subtle.importKey(
		    "jwk", //can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
		    pubJwk
		    ,
		    {   //these are the algorithm options
		        name: "RSA-OAEP",
		        hash: {name: "SHA-256"}, //can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
		    },
		    false, //whether the key is extractable (i.e. can be used in exportKey)
		    ["encrypt"] //"encrypt" or "wrapKey" for public key import or
		                //"decrypt" or "unwrapKey" for private key imports
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function importDecryptKey(keyJwk) {
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


	function encryptString(str, publicKey) {
		var data = convertStringToArrayBufferView(str);

		return window.crypto.subtle.encrypt(
		    {
		        name: "RSA-OAEP",
		        //label: Uint8Array([...]) //optional
		    },
		    publicKey, //from generateKey or importKey above
		    data //ArrayBuffer of data you want to encrypt
		)
		.catch(function(err){
		    console.error(err);
		});
	}


	function convertStringToArrayBufferView(str)
	{
	    var bytes = new Uint8Array(str.length);
	    for (var iii = 0; iii < str.length; iii++)
	    {
	        bytes[iii] = str.charCodeAt(iii);
	    }

	    return bytes;
	}

	function convertArrayBufferViewtoString(buffer)
	{
	    var str = "";
	    for (var iii = 0; iii < buffer.byteLength; iii++)
	    {
	        str += String.fromCharCode(buffer[iii]);
	    }

	    return str;
	}

})( jQuery );
