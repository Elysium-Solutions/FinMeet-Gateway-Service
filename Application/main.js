/* eslint-disable func-names */

'use strict';

require('dotenv').config();

var path = require('path');
var nunjucks = require('nunjucks');
var express = require('express');
const fetch = require('node-fetch');

const APP_PORT = process.env.APP_PORT || 4000;
const FIN_SERVICE_ADDRESS = process.env.FIN_SERVICE_ADDRESS || 8000;
const AUTH_SERVICE_ADDRESS = process.env.AUTH_SERVICE_ADDRESS || 8000;

var app = express();
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded( {extended: true} )); // to support URL-encoded bodies

nunjucks.configure(path.join(__dirname, 'views'), {
  autoescape: true,
  express: app,
  watch: true
});

// app

app.use(express.static(__dirname));

app.use(function(req, res, next) {
  res.locals.user = 'hello';
  next();
});


app.get('/login', function(req, res) {
  res.render('login.html');
});


app.post('/login', async function(request, response, next) {
  console.log('Login Get Request Made')
  var email = request.body.email;
  var password = request.body.password;
  console.log(request);
  console.log(email);
  console.log(password);
  console.log(request.headers.cookie);
  console.log(AUTH_SERVICE_ADDRESS+'/client/login');
  var auth_service_response = await fetch(AUTH_SERVICE_ADDRESS+'/client/login', {
    method : 'POST',
    headers:{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      withCredentials:true,
      cookie:request.headers.cookie
    },
    body:JSON.stringify(request.body)
  });
  console.log(auth_service_response);
  if (auth_service_response.status == 200) {
    request.redirect([202,], '/')
  } else {
    request.redirect([202,], '/login')
  }

});


app.get('/signup', function(req, res) {
  res.render('signup.html');
});

// birthday "1970-06-12"
// phone "6108063000"
app.post('/signup', async function(request, response, next) {
  console.log('Login Get Request Made')
  var email = request.body.email;
  var password = request.body.password;
  console.log(email);
  console.log(password);
  console.log(request.headers);
  console.log(request.body);
  console.log(AUTH_SERVICE_ADDRESS+'/client/signup');
  var auth_service_response = await fetch(AUTH_SERVICE_ADDRESS+'/client/signup', {
    method : 'POST',
    headers:{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      cookie:request.headers.cookie
    },
    body:JSON.stringify(request.body)
  });
  console.log(auth_service_response);
  if (auth_service_response.status == 200) {
    request.redirect([200,], '/')
  } else {
    request.redirect([200,], '/login')
  }

});

app.post('/api/create_link_token', function(request, response, next) {
  // todo get user code
  var user_code = null;
  var data = fetch(FIN_SERVICE_ADDRESS+'/client/get_plaid_link_token', {
    method : 'POST',
    body : {
      User_Code: user_code
    }
  }).then(function (response){
    return response;
  })
  data = data.json;
  response.json({
    link_token : data.Plaid_Link_Token,
    access_token_ref_code : data.Access_Token_Ref_Code
  })
});

app.post('/api/set_access_token', function (request, response, next) {
  // todo get user code
  var user_code = null;
  Public_Token = request.body.public_token;
  Access_Token_Ref_Code = request.body.access_token_ref_code;
  var data = fetch(FIN_SERVICE_ADDRESS+'/client/set_plaid_access_token', {
    method : 'POST',
    body : {
      User_Code: user_code,
      Public_Token: Public_Token,
      Access_Token_Ref_Code: Access_Token_Ref_Code
    }
  }).then(function (response){
    return response;
  })
  data = data.json;
  response.json({
    access_token_ref_code: data.Access_Token_Ref_Code,
    access_token: data.Access_Token,
    item_id: data.Item_Id,
    error: null,
  });
});

app.get('/', async function (request, response, next) {
  console.log(request);
  var auth_service_response = await fetch(AUTH_SERVICE_ADDRESS+'/client/user_code_get', {
    method : 'POST',
    headers:{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      cookie:request.headers.cookie
    },
    body:JSON.stringify(request.body)
  });
  console.log(auth_service_response);
  response.sendFile('./views/index.html', { root: __dirname });
});

// This is an endpoint defined for the OAuth flow to redirect to.
app.get('/oauth-response.html', async function (request, response, next) {
  var auth_service_response = await fetch(AUTH_SERVICE_ADDRESS+'/client/user_code_get', {
    method : 'POST',
    headers:{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      cookie:request.headers.cookie
    },
    body:JSON.stringify(request.body)
  });
  console.log(auth_service_response);
  response.sendFile('./views/oauth-response.html', { root: __dirname });
});


app.listen(APP_PORT, function() {
  console.log('Express server running on http://localhost:'+APP_PORT);
});
