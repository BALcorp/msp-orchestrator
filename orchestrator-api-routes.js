const mspProductUrl = "http://localhost:8050/msp-product-housing/rest/product-api";
const mspOrderUrl = "http://localhost:8051/msp-order/rest/booking-api";
const mspUsersUrl = "http://localhost:8052/msp-users/rest/user-api";
const mspAuthUrl = "http://localhost:8055/msp-auth/rest/auth-api";

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

// Function that removes booked products from a list a products.
function removeBookedProductsFromProducts(bookings, products) {
	let booking;
	let product;
	for (let i in bookings) {
		booking = bookings[i];
		for (let j in products) {
			product = products[j];
			if (product.idProduct === booking.idProduct) products.splice(j, 1);
		}
	}
}

// Function that replaces adds usernames to a product evaluations.
async function replaceUserIdByUsernameInProductEvaluations(product) {
	let evaluations = product.evaluations;
	let idUser;
	let userByIdUrl;
	let evaluation;
	let user;
	let httpResponse;
	for (let i in evaluations) {
		evaluation = evaluations[i];
		idUser = evaluation.idUser;
		userByIdUrl = mspUsersUrl + "/public/user/" + idUser;
		httpResponse = await axios.get(userByIdUrl);
		user = httpResponse.data;
		evaluation.username = user.username;
	}
}

// Function that performs the previous one on a list of products.
async function replaceUserIdByUsernameInAllProductsEvaluations(products) {
	let product;
	for (let i in products) {
		product = products[i];
		await replaceUserIdByUsernameInProductEvaluations(product)
	}
}

// Function that fetches all bookings with some product details, given the client Id.
// Example URL http://localhost:8054/msp-orchestrator/rest/orchestrator-api/private/bookings?userId=1
apiRouter.route('/msp-orchestrator/rest/orchestrator-api/private/bookings').get(asyncToResp (
	async function(req) {
		try {
			const idBooking = parseInt(req.query.userId);
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
				productByIdUrl = mspProductUrl + "/public/product/" + idProduct;
				httpResponse = await axios.get(productByIdUrl);
				product = httpResponse.data;
				booking.title = product.title;
				booking.address = product.property.address;
				booking.zipCode = product.property.zipCode;
			}
			return bookings;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

// Function that fetches all available products (not booked) within a given period.
// Example URL : http://localhost:8054/msp-orchestrator/rest/orchestrator-api/private/products/2020-08-01/2020-09-30
apiRouter.route('/msp-orchestrator/rest/orchestrator-api/private/products/:startDate/:endDate').get(asyncToResp (
	async function(req) {
		try {
			const startDate = req.params.startDate;
			const endDate = req.params.endDate;
			const bookingsByPeriodUrl = mspOrderUrl + "/private/bookings/" + startDate + "/" + endDate;
			let httpResponse = await axios.get(bookingsByPeriodUrl);
			const bookings = httpResponse.data;
			const allProductsUrl = mspProductUrl + "/public/product";
			httpResponse = await axios.get(allProductsUrl);
			let products = httpResponse.data;
			removeBookedProductsFromProducts(bookings, products);
			await replaceUserIdByUsernameInAllProductsEvaluations(products);
			return products;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);


// Method that fetches all available products (not booked) within a given period, which correspond to the will of the user (size, dailyrate min & max, number of guests....)
// Example URL : http://localhost:8054/msp-orchestrator/rest/orchestrator-api/public/products/2020-08-01/2020-09-30?guestNumber=2&zipCode=75001&size=120&dailyrateMin=1000&dailyrateMax=2000&petsAuthorized=true
apiRouter.route('/msp-orchestrator/rest/orchestrator-api/public/products/:startDate/:endDate').get(asyncToResp (
	async function(req, res, next) {
		try {
			var guestNumber = parseInt(req.query.guestNumber);
			console.log(guestNumber);
			var zipCode = parseInt(req.query.zipCode);
			console.log(zipCode);
			var size = parseInt(req.query.size);
			console.log(size);
			var dailyrateMin = parseFloat(req.query.dailyrateMin);
			console.log(dailyrateMin);
			var dailyrateMax = parseFloat(req.query.dailyrateMax);
			console.log(dailyrateMax);
			var petsAuthorized = req.query.petsAuthorized;
			console.log(petsAuthorized);
			const selectedProductsUrl = mspProductUrl + "/public/product?guestNumber="+guestNumber+"&zipCode="+zipCode+"&size="+size+"&dailyrateMin="+dailyrateMin+"&dailyrateMax="+dailyrateMax+"&petsAuthorized="+petsAuthorized;
			var httpResponse1 = await axios.get(selectedProductsUrl);
			let selectedProducts = httpResponse1.data;
			const startDate = req.params.startDate;
			const endDate = req.params.endDate;
			const bookingsByPeriodUrl = mspOrderUrl + "/private/bookings/" + startDate + "/" + endDate;
			let httpResponse2 = await axios.get(bookingsByPeriodUrl);
			const bookings = httpResponse2.data;
			removeBookedProductsFromProducts(bookings, selectedProducts);
			await replaceUserIdByUsernameInAllProductsEvaluations(selectedProducts);
			return selectedProducts;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

// Function that fetches a product with evaluations containing usernames instead of ids.
// Example URL http://localhost:8054/msp-orchestrator/rest/orchestrator-api/public/product?productId=1
apiRouter.route('/msp-orchestrator/rest/orchestrator-api/public/product').get(asyncToResp (
	async function(req) {
		try {
			const idProduct = parseInt(req.query.productId);
			const productByIdUrl = mspProductUrl + "/public/product/" + idProduct;
			let httpResponse = await axios.get(productByIdUrl);
			let product = httpResponse.data;
			await replaceUserIdByUsernameInProductEvaluations(product)
			return product;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

// Function that fetches all products with evaluations containing usernames instead of ids.
// Example URL http://localhost:8054/msp-orchestrator/rest/orchestrator-api/public/products
apiRouter.route('/msp-orchestrator/rest/orchestrator-api/public/products').get(asyncToResp (
	async function(req) {
		try {
			const productsByIdUrl = mspProductUrl + "/public/product/";
			let httpResponse = await axios.get(productsByIdUrl);
			let products = httpResponse.data;
			await replaceUserIdByUsernameInAllProductsEvaluations(products);
			return products;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

// User connection method.
// Needs a json like : {"username":"user","password":"pwd"}
// Example URL : http://localhost:8054/msp-orchestrator/rest/orchestrator-api/public/login
apiRouter.route('/msp-orchestrator/rest/orchestrator-api/public/login').post(asyncToResp (
	async function(req) {
		try {
			const username = req.body.username;
			const password = req.body.password;
			const authUrl = mspAuthUrl + "/public/login";

			let httpResponse1 = await axios.post(authUrl, {
				username: username,
				password: password
			});
			let authResp = httpResponse1.data;

			const usersUrl = mspUsersUrl + "/public/login/" + authResp.username;
			let httpResponse2 = await axios.get(usersUrl);
			let loginResp = httpResponse2.data;

			return loginResp;
		} catch(ex) {
			throw new Error("Failure")
		}
	})
);

exports.apiRouter = apiRouter;
