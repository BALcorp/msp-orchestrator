const mspOrderUrl = "http://localhost:5000/msp-order/rest/api";
const mspProductHousingUrl = "http://localhost:8050/msp-product-housing/rest/product-api";

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
	async  function(req, res, next) {
		...;
		var res1 = await appelAsync1(...);
		...;
		return dataObj; // will be automatically converted in json and sent back.
	})
);
*/

// Method that fetches all bookings with some product details, given the client Id.
// Example URL http://localhost:8054/msp-orchestrator/rest/api/private/bookings?clientId=1
apiRouter.route('/msp-orchestrator/rest/api/private/bookings').get(asyncToResp (
	async function(req) {
		try {
			const idBooking = parseInt(req.query.clientId);
			const bookingsByIdUrl = mspOrderUrl + "/private/bookings/" + idBooking;
			let httpResponse = await axios.get(bookingsByIdUrl);
			let bookings = httpResponse.data;
			let idProduct;
			let productByIdUrl;
			let booking;
			let product;
			for (let i in bookings) {
				booking = bookings[i];
				idProduct = booking.idProduct;
				productByIdUrl = mspProductHousingUrl + "/public/product/" + idProduct;
				httpResponse = await axios.get(productByIdUrl);
				product = httpResponse.data;
				booking.title = product.title;
				booking.streetNumber = product.property.address.streetNumber;
				booking.streetName = product.property.address.streetName;
				booking.zipCode = product.property.address.city.zipCode;
				booking.cityName = product.property.address.city.name;
			}
			return bookings;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

// Method that fetches all available products (not booked) within a given period.
// Example URL : http://localhost:8054/msp-orchestrator/rest/api/private/bookings/2020-08-01/2020-09-30
apiRouter.route('/msp-orchestrator/rest/api/private/bookings/:startDate/:endDate').get(asyncToResp (
	async function(req) {
		try {
			const startDate = req.params.startDate;
			const endDate = req.params.endDate;
			const bookingsByPeriodUrl = mspOrderUrl + "/private/bookings/" + startDate + "/" + endDate;
			let httpResponse = await axios.get(bookingsByPeriodUrl);
			const bookings = httpResponse.data;
			const allProductsUrl = mspProductHousingUrl + "/public/product";
			httpResponse = await axios.get(allProductsUrl);
			const products = httpResponse.data;
			let idProduct;
			let productByIdUrl;
			let booking;
			let bookedProduct;
			let product;
			for (let i in bookings) {
				booking = bookings[i];
				idProduct = booking.idProduct;
				productByIdUrl = mspProductHousingUrl + "/public/product/" + idProduct;
				httpResponse = await axios.get(productByIdUrl);
				bookedProduct = httpResponse.data;
				for (let j in products) {
					product = products[j];
					if (product.idProduct === bookedProduct.idProduct) products.splice(j, 1);
				}
			}
			return products;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

exports.apiRouter = apiRouter;
