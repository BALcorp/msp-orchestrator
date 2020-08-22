const mspOrderUrl = "http://localhost:5000/msp-order";
const mspProductHousingUrl = "http://localhost:8050/msp-product-housing";

const express = require('express');
const apiRouter = express.Router();
const axios = require("axios");

// Utility function that encapsulate an async function within an express route.
function asyncToResp(fn) {
    return function(req, res, next) {
	  // fn is an alias/reference to an async function (returning data in Promise).
      fn(req, res, next)
      .then((data)=> { res.send(data) }) // return of a result converted in Json.
      .catch((err)=>{ 
	      res.status(500)
		      .json({errorCode:'500', message: 'Internal Server Error'})
	  });
    };
}
/*
Usage:
app.get("fin_url" , asyncToResp( 
	async  function(req, res,next) {
		...;
		var res1 = await appelAsync1(...);
		...;
		return dataObj; // will be automatically converted in json and sent back.
	})
);
*/

// URL with id=1: http://localhost:8054/msp-orchestrator/rest/api/private/bookings?id=1
apiRouter.route('/msp-orchestrator/rest/api/private/bookings').get(asyncToResp (
	async function(req, res,next) {
		try {
			const idBooking = parseInt(req.query.id);
			const bookingsByIdUrl = mspOrderUrl + "/rest/api/private/bookings/" + idBooking;
			let httpResponse = await axios.get(bookingsByIdUrl);
			let bookingsJson = httpResponse.data;
			let idProduct;
			let productsByIdUrl;
			let bookingJson;
			let productJson;
			for (let i in bookingsJson) {
				bookingJson = bookingsJson[i];
				idProduct = bookingJson.idProduct;
				productsByIdUrl = mspProductHousingUrl + "/rest/product-api/public/product/" + idProduct;
				httpResponse = await axios.get(productsByIdUrl);
				productJson = httpResponse.data;
				bookingJson.title = productJson.title;
				bookingJson.streetNumber = productJson.property.address.streetNumber;
				bookingJson.streetName = productJson.property.address.streetName;
				bookingJson.zipCode = productJson.property.address.city.zipCode;
				bookingJson.name = productJson.property.address.city.name;
			}
			return bookingsJson;
		} catch(ex) {
			throw new Error("echec")
		}
	})
);

exports.apiRouter = apiRouter;
