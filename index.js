// Add any outside files here...
var express = require('express');
var expressValidator = require('express-validator');
var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');
var handlebars = require('express-handlebars').create({defaultLayout: "main"});
var credentials = require('./credentials.js');
var app = express();


// Allows for handlebars file extension
app.engine("handlebars", handlebars.engine);
app.set("view engine", "handlebars");

// Sets port for application to run on
app.set('port', process.env.PORT || credentials.port || 3000);


// Authentication
app.use(function(req, res, next) {
  if (!credentials.authentication || req.get("X-Authentication-Key") === credentials.authentication.key) {
    next();
  }
  else {
    res.status(401);
    res.setHeader("content-type", "text/plain");
    res.send("401 Unauthorized");
  }
});

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
 });

app.use(require('body-parser').urlencoded({extended: true}));
app.use(expressValidator());
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
 resave: false,
 saveUninitialized: false,
 secret: credentials.cookieSecret
}));

/* DB Connection
 * USE connect(function(con){}); inside POST to call DB
*/
function connect(cb) {
  try {
    var con = mysql.createConnection({
      host: credentials.host,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database
    });
  }
  catch (e) {
    console.log("ERROR: connect: mysql.createConnection(): " + e);
  }
  con.connect(function(err) {
    if (err) {
      console.log("ERROR: connect: con.connect(): " + err);
    }
    else {
      try {
        cb(con);
      }
      catch(e) {
        console.log("ERROR: connect: cb(con): " + e);
      }
      // close connection after 60 seconds
      setTimeout(function() {
        try {
          con.end();
        }
        catch (e) {
          console.log("ERROR: connect: con.end(): " + e);
        }
      }, 60 * 1000);
    }
  });
}

// To show current user specific nav tools. Will add privileges later...
function getMenu(req) {
  var menu = [];
  menu.push({"page": ".", "label": "Home"}, {"page": "student_view", "label": "Student/Tutor-Toggle"}, {"page": "student_log", "label": "Student Log"}, {"page": "schedule", "label": "Schedule"}, {"page": "skills_specialties", "label": "Skills/Specialties"});
  return menu;
};

// Renders Login page, prompts user to login with PPU email / password
app.get('/', function(req, res) {
  res.render('login', {
    menu: getMenu(req)
  });
});

// Redirect for student
app.get('/student_view', function(req, res) {
  res.render('student_view', {
    menu: getMenu(req)
  });
});

// Redirect for tutor, tutor can still be student so have to have option to switch back and fourth
app.get('/tutor_view', function(req, res) {
  res.render('tutor_view', {
    menu: getMenu(req)
  });
});

// Redirect for admin, Gives full access to see all tutors as well as students. Also gives additional features
app.get('/admin_view', function(req, res) {
  res.render('admin_view', {
    menu: getMenu(req)
  });
});

app.get('/student_log', function(req, res) {
  res.render('student_log', {
    menu: getMenu(req)
  });
});

app.get('/schedule', function(req, res) {
  res.render('schedule', {
    menu: getMenu(req)
  });
});

app.get('/skills_specialties', function(req, res) {
  res.render('skills_specialties', {
    menu: getMenu(req)
  });
});





//custom 404 page
app.use(function(req, res) {
  res.status(404);
  res.render("404");
});

//custom 500 page
app.use(function(err, req, res, next) {
  console.log(err.stack);
  res.status(500);
  res.render("500");
});

app.listen(app.get('port'), function() {
  console.log("listening on http://localhost:" + app.get("port") + "; press Ctrl-C to terminate.");
});
