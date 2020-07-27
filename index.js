const express = require('express')
const bodyParser = require('body-parser')
var cors = require('cors')
const app = express()
const port = process.env.PORT || 8000;
const mid = "seruML28171716354210";
const mkey = "0q4WHdaceattByC!";
app.use(cors())
app.use(bodyParser())
app.get('/initialize', (req, res) => {
    
	const oid = req.query.oid;
	const cid = req.query.cid;
	const amount = req.query.amount
    
	const https = require('https');
	/*
	* import checksum generation utility
	* You can get this utility from https://developer.paytm.com/docs/checksum/
	*/
	const PaytmChecksum = require('./PaytmChecksum');

	var paytmParams = {};

	paytmParams.body = {
		"requestType"   : "Payment",
		"mid"           : mid,
		"websiteName"   : "WEBSTAGING",
		"orderId"       : oid,
		"callbackUrl"   : "http://localhost:8000/verify",
		"txnAmount"     : {
			"value"     : amount,
			"currency"  : "INR",
		},
		"userInfo"      : {
			"custId"    : cid,
		},
	};

	/*
	* Generate checksum by parameters we have in body
	* Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
	*/
	PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(function(checksum){

		paytmParams.head = {
			"signature"	: checksum
		};

		var post_data = JSON.stringify(paytmParams);

		var options = {

			/* for Staging */
			hostname: 'securegw-stage.paytm.in',

			/* for Production */
			// hostname: 'securegw.paytm.in',

			port: 443,
			path: '/theia/api/v1/initiateTransaction?mid='+mid+'&orderId='+oid,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': post_data.length
			}
		};

		var response = "";
		var post_req = https.request(options, function(post_res) {
			post_res.on('data', function (chunk) {
				response += chunk;
			});

			post_res.on('end', function(){
				response = JSON.parse(response)
				console.log('Response: ', response);
				if(response.body.resultInfo.resultStatus == 'S')
				{
					var data = {
						status:response.body.resultInfo.resultStatus,
						txnToken:response.body.txnToken,
						signature:response.head.signature,
					}
					console.log(data);
					res.send(data);
				}
				else{
					var data = {
						status:response.body.resultInfo.resultStatus
					}
					res.send(data);
				}
			});
		});

		post_req.write(post_data);
		post_req.end();
	});
        
})

app.post('/verify',(request,res)=>{
	// console.log(request)
	var PaytmChecksum = require("./PaytmChecksum");
	console.log(request.body)
	paytmChecksum = request.body.CHECKSUMHASH;
	delete request.body.CHECKSUMHASH;

	var isVerifySignature = PaytmChecksum.verifySignature(request.body, mkey, paytmChecksum);
	if (isVerifySignature) {
		console.log("Checksum Matched");
		const https = require('https');
		const PaytmChecksum = require('./PaytmChecksum');

		/* initialize an object */
		var paytmParams = {};

		/* body parameters */
		paytmParams.body = {

			"mid" : mid,
			"orderId" : request.body.ORDERID,
		};

		PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(function(checksum){
			/* head parameters */
			paytmParams.head = {

				"signature"	: checksum
			};

			/* prepare JSON string for request */
			var post_data = JSON.stringify(paytmParams);

			var options = {

				/* for Staging */
				hostname: 'securegw-stage.paytm.in',

				/* for Production */
				// hostname: 'securegw.paytm.in',

				port: 443,
				path: '/v3/order/status',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': post_data.length
				}
			};

			// Set up the request
			var response = "";
			var post_req = https.request(options, function(post_res) {
				post_res.on('data', function (chunk) {
					response += chunk;
				});

				post_res.on('end', function(){
					console.log('Response: ', response);
					response = JSON.parse(response);
					if(response.body.resultInfo.resultStatus === "TXN_SUCCESS")
					{
						res.redirect("http://localhost:3000/#/ordered")
					}
					else{
						res.redirect("http://localhost:3000/")
					}
				});
			});

			// post the data
			post_req.write(post_data);
			post_req.end();
		});

        
				
	} else {
		console.log("Checksum Mismatched");
		res.redirect("http://localhost:3000")
	}
})
app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))