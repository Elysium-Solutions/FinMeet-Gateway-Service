const config = require("./config/config.js");

const express = require("express");
const cors = require("cors");
var engines = require('consolidate');
const session = require('express-session')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const FileStore = require('session-file-store')(session);
const uuid = require('uuid').v4
const fetch = require('node-fetch');
var $ = require('jquery');
const axios = require('axios')
console.log('load')
const db = require("./models");
console.log('load2')

const User = db.users;
const Op = db.Sequelize.Op;
db.sequelize.sync();

db.sequelize.authenticate().then(() => {
    console.log('Connected');
    db.sequelize.sync();
    User.sync({
        alter: true
    })
}).catch((err) => {
    console.log(err);
});

const app = express();
app.use(express.json()); // to support JSON-encoded bodies
app.use(express.urlencoded({
    extended: true
})); // to support URL-encoded bodies


var corsOptions = {
    origin: "http://localhost:3001"
};

app.use(cors(corsOptions));

app.set('views', __dirname + '/views');
app.engine('html', engines.mustache);
app.set('view engine', 'html');

// // drop the table if it already exists
// db.sequelize.sync({ force: true }).then(() => {
//   console.log("Drop and re-sync db.");
// });


passport.use(new LocalStrategy({
        usernameField: 'email'
    },
    async (email, password, done) => {
        console.log('Inside local strategy callback')
        let temp_user = await User.findOne({
            where: {
                email: email
            }
        });
        if (temp_user) {
            if (email === temp_user.email && password === temp_user.password) {
                console.log('Local strategy returned true');
                return done(null, temp_user);
            }
        }
        return null, null;
    }
));

passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. User id is save to the session file store here')
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    console.log('Inside deserializeUser callback')
    console.log(`The user id passport saved in the session file store is: ${id}`)
    var user = await User.findByPk(id);
    if (user == null) user = false;
    done(null, user);
});

app.use(session({
    genid: (request) => {
        console.log('Inside session middleware genid function')
        console.log(`Request object sessionID from client: ${request.sessionID}`)
        return uuid() // use UUIDs for session IDs
    },
    store: new FileStore(),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', function (request, response) {
    if (request.isAuthenticated()) {
        response.redirect('/');
    }
    response.render('login.html', {
        root: __dirname
    });
});


app.post('/login',
    // passport.authenticate('local'),
    function (request, response, next) {
        passport.authenticate('local', (err, user, info) => {
            console.log('Inside passport.authenticate() callback');
            console.log(`req.session.passport: ${JSON.stringify(request.session.passport)}`)
            console.log(`req.user: ${JSON.stringify(request.user)}`)
            request.login(user, (err) => {
                console.log('Inside req.login() callback')
                console.log(`req.session.passport: ${JSON.stringify(request.session.passport)}`)
                console.log(`req.user: ${JSON.stringify(request.user)}`)
                response.redirect('/');
            })
        })(request, response, next);
    });


app.get('/signup', function (request, response) {
    if (request.isAuthenticated()) {
        response.redirect('/');
    }
    response.render('signup.html', {
        root: __dirname
    });
});

// birthday "1970-06-12"
// phone "6108063000"
app.post('/signup', async function (request, response, next) {
    console.log('Signup Get Request Made')
    var email = request.body.email;
    var password = request.body.password;
    let temp_users = await User.findAll({
        where: {
            email: email
        }
    });
    console.log(temp_users);
    console.log(temp_users.length);
    if (!(temp_users.length > 0)) {
        console.log('Create New User');
        const new_user_data = {
            firstname: request.body.firstname,
            lastname: request.body.lastname,
            email: request.body.email,
            password: request.body.password
        };
        console.log(new_user_data);
        const new_user = await User.create(new_user_data)
        console.log('save new user');
        console.log(new_user.id);
        var auth_service_response = await fetch(config.FIN_SERVICE_ADDRESS + '/client/add_client', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'User_Code': new_user.id.toString()
            })
        });
        response.redirect('/');
    } else {
        response.redirect('/signup');
    }
});

app.post('/api/set_access_token', async function (request, response, next) {
    if (request.isAuthenticated()) {
        Public_Token = request.body.public_token;
        Access_Token_Ref_Code = request.body.access_token_ref_code;
        console.log(Access_Token_Ref_Code);
        console.log(config.FIN_SERVICE_ADDRESS + '/client/set_plaid_access_token');
        req = await axios.post(config.FIN_SERVICE_ADDRESS + '/client/set_plaid_access_token', {
            'Public_Token': Public_Token,
            'Access_Token_Ref_Code': Access_Token_Ref_Code,
            'User_Code': request.user.id.toString()
        });
        response.json({
            access_token_ref_code: req.Access_Token_Ref_Code,
            access_token: req.Access_Token,
            item_id: req.Item_Id,
            error: null,
        });
        response.send();
    } else {
        response.send();
    }
});


// app.post('/api/set_access_token', async function (request, response, next) {
//     if (request.isAuthenticated()) {
//         Public_Token = request.body.public_token;
//         Access_Token_Ref_Code = request.body.access_token_ref_code;
//         console.log(Access_Token_Ref_Code);
//         console.log(config.FIN_SERVICE_ADDRESS + '/client/set_plaid_access_token');
//         $.ajax({
//             url: config.FIN_SERVICE_ADDRESS + '/client/set_plaid_access_token',
//             method: 'post',
//             dataType: 'json',
//             headers: {
//                 'User_Code': request.user.id.toString()
//             },
//             data: {
//                 'Public_Token': Public_Token,
//                 'Access_Token_Ref_Code': Access_Token_Ref_Code
//             },
//             success: function (response) {
//                 if (response.msg == 'success') {
//                     alert('task added successfully');
//                     console.log(response);
//                     response.json({
//                         access_token_ref_code: response.Access_Token_Ref_Code,
//                         access_token: response.Access_Token,
//                         item_id: response.Item_Id,
//                         error: null,
//                     });
//                     response.send();
//                 } else {
//                     response.send();
//                 }
//             },
//             error: function (response) {
//                 alert('server error occured');
//                 response.send();
//             }
//         });
//     } else {
//         response.send();
//     }
// });


// var data = await fetch(config.FIN_SERVICE_ADDRESS + '/client/set_plaid_access_token', {
//     method: 'post',
//     headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//         'User_Code': request.user.id.toString()
//       },
//     body: {
//         Public_Token: Public_Token,
//         Access_Token_Ref_Code: Access_Token_Ref_Code
//     }
// });
//     console.log(data);
//     data = data.json;
//     console.log(data);
//     response.json({
//         access_token_ref_code: data.Access_Token_Ref_Code,
//         access_token: data.Access_Token,
//         item_id: data.Item_Id,
//         error: null,
//     });
//     response.send();
// } else {
//     response.send();
// }


app.get('/', async function (request, response, next) {
    if (request.isAuthenticated()) {
        console.log(request.user);
        console.log(request);
        console.log(config.FIN_SERVICE_ADDRESS + '/client/user_code_get');
        response.sendFile('./views/index.html', {
            root: __dirname
        });
    } else {
        response.redirect('/login');
    }
});

app.post('/api/create_link_token', async function (request, response, next) {
    console.log('create_link_token');
    if (request.isAuthenticated()) {
        var auth_service_response = await fetch(config.FIN_SERVICE_ADDRESS + '/client/get_plaid_link_token', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User_Code': request.user.id.toString()
            }
        });
        console.log(auth_service_response);
        console.log('-----------------');
        console.log(auth_service_response.body);
        console.log('-----------------');
        console.log(auth_service_response.headers);
        console.log(auth_service_response.headers.keys());
        console.log(auth_service_response.headers.get('Plaid_Link_Token'));
        console.log(auth_service_response.headers.get('Access_Token_Ref_Code'));
        response.send(JSON.stringify({
            'link_token': auth_service_response.headers.get('Plaid_Link_Token'),
            'access_token_ref_code': auth_service_response.headers.get('Access_Token_Ref_Code'),
        }));
    } else {
        response.send('404');
    }
});

// This is an endpoint defined for the OAuth flow to redirect to.
app.get('/oauth-response.html', async function (request, response, next) {
    var auth_service_response = await fetch(config.FIN_SERVICE_ADDRESS + '/client/user_code_get', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.body)
    });
    console.log(auth_service_response);
    response.sendFile('./views/oauth-response.html', {
        root: __dirname
    });
});

app.get('/logout', function (request, response) {
    if (request.isAuthenticated()) {
        request.logout();
    }
    response.redirect('/login');
});

// set port, listen for requests
app.listen(3000, () => {
    console.log(`Server is running on port ${3000}.`);
});