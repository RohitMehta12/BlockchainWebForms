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

		encryptString(dataS, publicKey)
		.then(function(encArr){
			console.log(encArr);
		    //https://stackoverflow.com/a/50868366
		    // const toHexString = buffer => buffer.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

			function buf2hex(buffer) { // buffer is an ArrayBuffer
			  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
			}

		    var dataS = buf2hex(encArr.buffer);
		    console.log('0x' + dataS )
		    // console.log('0x' + toHexString(new Uint8Array(encArr)));

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
		});

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

	async function encryptString(data, rsaPublicKey) {
		var key = await generateAESKey();
		var iv = generateIV();
		var jwkKey = await exportAESKey(key);
		var ivAndKey = concatTypedArrays(iv, new Uint8Array(str2ab(jwkKey.k)));
		// encrypted Key and IV
		var encKey = await cryptAESKeyWitRSA(ivAndKey, rsaPublicKey);
		var encAB = await cryptAESData(str2ab(data), key, iv);
		// encrpted data
		var encData = new Uint8Array(encAB);
console.log(encData);
		return concatTypedArrays( new Uint8Array(encKey), encData);
	}


	function generateIV() {
		return window.crypto.getRandomValues(new Uint8Array(16));
	}

	function generateAESKey() {
		return window.crypto.subtle.generateKey(
		    {
		        name: "AES-CBC",
		        length: 256, //can be  128, 192, or 256
		    },
		    true, //whether the key is extractable (i.e. can be used in exportKey)
		    ["encrypt", "decrypt"] //can be "encrypt", "decrypt", "wrapKey", or "unwrapKey"
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function exportAESKey(key) {
		return window.crypto.subtle.exportKey(
		    "jwk", //can be "jwk" or "raw"
		    key //extractable must be true
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function cryptAESData(data, key, iv) {
		return window.crypto.subtle.encrypt(
		    {
		        name: "AES-CBC",
		        //Don't re-use initialization vectors!
		        //Always generate a new iv every time your encrypt!
		        iv: iv,
		    },
		    key, //from generateKey or importKey above
		    data //ArrayBuffer of data you want to encrypt
		)
		.catch(function(err){
		    console.error(err);
		});
	}

	function cryptAESKeyWitRSA(key, rsaPublicKey) {
		return window.crypto.subtle.encrypt(
		    {
		        name: "RSA-OAEP",
		        //label: Uint8Array([...]) //optional
		    },
		    rsaPublicKey, //from generateKey or importKey above
		    key //ArrayBuffer of data you want to encrypt
		)
		.catch(function(err){
			console.error('encrypt error')
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

	// https://stackoverflow.com/questions/33702838/how-to-append-bytes-multi-bytes-and-buffer-to-arraybuffer-in-javascript
	// to use http://2ality.com/2015/10/concatenating-typed-arrays.html
	function concatTypedArrays(a, b) { // a, b TypedArray of same type
	    var c = new (a.constructor)(a.length + b.length);
	    c.set(a, 0);
	    c.set(b, a.length);
	    return c;
	}



})( jQuery );
