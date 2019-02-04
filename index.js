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

// generates random string of characters
var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
            .toString('hex') // converts to hexadecimal format
            .slice(0,length);   // returns required number of characters
};

var sha512 = function(password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return {
      password:password,
      salt:salt,
      passwordHash:value
    };
};


function getMenu(req) {
  var menu = [];
  var isAdmin = req.session.is_admin;
  var isTutor = req.session.is_tutor;

   menu.push({"page": ".", "label": "Home"});

   if (isTutor) {
     menu.push({"page": "student_view", "label": "Find Tutor"}, {"page": "student_log", "label": "Student Log"}, {"page": "schedule", "label": "Schedule"}, {"page": "skills_specialties", "label": "Skills/Specialties"});

   }
   else if (isAdmin) {
     menu.push({"page": "student_view", "label": "Find Tutor"}, {"page": "student_log", "label": "Student Log"}, {"page": "schedule", "label": "Schedule"}, {"page": "skills_specialties", "label": "Skills/Specialties"},{"page": "tutor_list", "label": "Tutors"});
   }
  return menu;
};




// Renders Login page, prompts user to login with PPU email / password
app.get('/', function(req, res) {
  if(req.session.user_id) {
    res.redirect(303,'student_view');
  }else {
    res.render('login', {
       menu: getMenu(req),
       login: req.session.user_id ? req.session.user_id : false,
       user_name: req.session.user_first_name,
    });
  }
});


// Redirect for student
app.get('/student_view', function(req, res) {
  res.render('student_view', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

// Redirect for tutor, tutor can still be student so have to have option to switch back and fourth
app.get('/tutor_view', function(req, res) {
  res.render('tutor_view', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

// Redirect for admin, Gives full access to see all tutors as well as students. Also gives additional features
app.get('/admin_view', function(req, res) {
  res.render('admin_view', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

app.get('/student_log', function(req, res) {
  res.render('student_log', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

app.get('/schedule', function(req, res) {
  res.render('schedule', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

app.get('/skills_specialties', function(req, res) {
  res.render('skills_specialties', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

app.get('/tutor_list', function(req, res) {
  res.render('tutor_list', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

app.get("/logout", function(req, res) {
  delete req.session.user_id;
  delete req.session.is_admin;
  delete req.session.is_tutor;
  delete req.session.user_first_name;
  res.redirect(303, ".");
});


app.post("/login", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var user = req.body.user;
      var password = req.body.pwd;
      var q  ="SELECT * FROM user WHERE email = ?";
      var values = [user];
      try {
        con.query(q, values, function (err, result, fields) {
          if (result[0]) {
            var salt = result[0].salt;
            var passwordData = sha512(password, salt);
            if (result[0].password === passwordData.passwordHash) {
              req.session.user_id = result[0].id;
              req.session.is_admin = result[0].is_admin;
              req.session.is_admin = result[0].is_tutor;
              req.session.user_first_name = result[0].first_name;
              req.session.cookie.maxAge = 9000000;
              res.send({success:true});
            }

          }
        });
      }catch (err) {
        console.log(err, " Error in login.post function");
      }
    }
  });
});


app.post("/find_tutor", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var sql = "select `first_name`, `last_name`, `start`, `end` from schedule left join user on schedule.tutor_id = user.id left join course on user.course_id = course.id where user.is_tutor = 1";
      for (var property in req.body) {
        var value = req.body[property];
        if (value !== "") {
          if (property === 'time_range') {
            var timeRange = value.split(',');
            var time1 = timeRange[0];
            var time2 = timeRange[1];
            sql += " AND"
            sql += " " + property + " BETWEEN " + time1 + " AND " + time2;
          }
          else if (property === 'days_selected') {
            sql += " AND"
            sql += " " + property + " IN (" + value + ")";
          }else {
            sql += " AND"
            sql += " " + property + " = " + value;
          }
        }
      }
      sql += ';'
      console.log(sql);
      // console.log(centerLocal, courseCode, timeRange, days);
      try {
        // con.query(q, values, function (err, result, fields) {
          // find tutor given a specfic Search

        // });

      }catch (err) {
        console.log(err, " Error in find_tutor.post function");

      }

    }
  });
});

app.post("/student_log", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var fName = req.body.first_name;
      var lName = req.body.last_name;
      var subj = req.body.subject;
      var date = req.body.date;
      var location = req.body.location;
      var tutor = req.body.tutor;
      console.log(fName, lName, subj, date, location, tutor);
      try {
        // con.query(q, values, function (err, result, fields) {
          // show list of previous appointments give search critera
        // });

      } catch (err) {
        console.log(err, " Error in student_log.post function");

      }
    }


  });
});


app.post("/tutor_list", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var fName = req.body.first_name;
      var lName = req.body.last_name;
      var subj = req.body.subject;
      console.log(fName, lName, subj);
      try {
        // con.query(q, values, function (err, result, fields) {
          // show list of tutors given search criteria


        // });
      } catch (err) {
          console.log(err, " Error in tutor_list.post function");

      }

    }


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
