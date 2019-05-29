function initContract() {
	if (typeof web3 !== 'undefined') {
	  //
	  web3 = new Web3(web3.currentProvider);
	} else {
	  // set the provider you want from Web3.providers
	  // web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
	  web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/6b470392736544938431f9e3f710e25d"));
	}
	web3.eth.defaultAccount = web3.eth.accounts[0];
	var abi = [
		{
			"constant": false,
			"inputs": [
				{
					"name": "_data",
					"type": "bytes"
				}
			],
			"name": "sendData",
			"outputs": [],
			"payable": false,
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [
				{
					"name": "i",
					"type": "uint256"
				}
			],
			"name": "getDataAtIndex",
			"outputs": [
				{
					"name": "",
					"type": "bytes"
				}
			],
			"payable": false,
			"stateMutability": "view",
			"type": "function"
		},
		{
			"constant": true,
			"inputs": [],
			"name": "getDataLength",
			"outputs": [
				{
					"name": "",
					"type": "uint256"
				}
			],
			"payable": false,
			"stateMutability": "view",
			"type": "function"
		}
	];

	var FormTstContract = web3.eth.contract(abi);
	return FormTstContract.at('0xeb325d1871b63a2ff05339d8e9d222367459a829');
}