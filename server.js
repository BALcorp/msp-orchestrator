var express = require('express');
var orchestratorApiRoutes = require('./orchestrator-api-routes');
var bodyParser = require('body-parser');
var app = express();


app.use(function(req, res, next) {
res.header("Access-Control-Allow-Origin", "*");
//ou avec "www.xyz.com" à la place de "*" en production
res.header("Access-Control-Allow-Methods",
           "POST, GET, PUT, DELETE, OPTIONS"); //default: GET, ...
res.header("Access-Control-Allow-Headers",
"Origin, X-Requested-With, Content-Type, Accept");
next();
});


//support parsing of JSON post data
var jsonParser = bodyParser.json() ;
app.use(jsonParser);

//les routes en /html/... seront gérées par express
//par de simples renvois des fichiers statiques du répertoire "./html"
app.use('/html', express.static(__dirname+"/html"));


app.get('/', function(req , res , next) {
res.redirect('html/index.html');
});

app.use(orchestratorApiRoutes.apiRouter);

app.listen(8054 , function () {
console.log("http://localhost:8054");
});