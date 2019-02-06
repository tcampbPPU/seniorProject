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
  menu.push({"page": ".", "label": "Home"}, {"page": "schedule", "label": "Find Tutor"}, {"page": "tutor_view", "label": "Appointments"});

  /* HIDDING the rest for now*/
  // menu.push({"page": ".", "label": "Home"}, {"page": "student_view", "label": "Find Tutor"}, {"page": "student_log", "label": "Student Log"}, {"page": "schedule", "label": "Schedule"}, {"page": "skills_specialties", "label": "Skills/Specialties"},{"page": "tutor_list", "label": "Tutors"}, {"page": "tutor_view", "label": "Appointments"});


   // if (isTutor) {
   //   menu.push({"page": "student_view", "label": "Find Tutor"}, {"page": "student_log", "label": "Student Log"}, {"page": "schedule", "label": "Schedule"}, {"page": "skills_specialties", "label": "Skills/Specialties"});
   //
   // }
   // else if (isAdmin) {
   //   menu.push({"page": "student_view", "label": "Find Tutor"}, {"page": "student_log", "label": "Student Log"}, {"page": "schedule", "label": "Schedule"}, {"page": "skills_specialties", "label": "Skills/Specialties"},{"page": "tutor_list", "label": "Tutors"});
   // }
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


app.get('/create_appointment', function(req, res) {
  res.render('create_appointment', {
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
  // Will use Microsoft Authentication
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
              // need to use id for loading tutor appointments later
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


// Presents user with a calendar view of avaible times given the course they entered
app.post("/find_tutor", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      // TODO: Need to cross check with appointment table to see if tutor already has appointment, don't want to show that to user
      // Also check with current date so we arent not returning schedule from weeks ago
      // var date = new Date(); date.setDate(date.getDate() - 7); console.log(date.toLocaleString());
      // Get user_id from req.session to match with a tutor

      var course = req.body.course_search;
      var q = "select course.course_code, course.course_name, user.id, user.first_name, user.last_name, schedule.date, schedule.start, schedule.end from course left join tutor_has_course on course.id = tutor_has_course.course_id left join user on tutor_has_course.user_id = user.id left join schedule on user.id = schedule.tutor_id where user.is_tutor = 1 and schedule.date > now() and course_code = ?";
      var values = [course];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success:false});
          }else {
            if (result.length != 0) {
              res.send({success:result});
            }
            else {
              res.send({success:false});
            }
          }
        });
      }catch (err) {
        console.log(err, " Error in find_tutor.post function");
      }
    }
  });
});

// Loads a tutors appointments on page load
app.post("/load_appointments", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "select appointment.date, appointment.start_time, appointment.end_time, appointment.location, user.first_name, user.last_name, course.course_code, course.course_name from appointment left join user on appointment.student_id = user.id left join tutor_has_course on user.course_id = tutor_has_course.course_id left join course on tutor_has_course.course_id = course.id where user.is_tutor != 1";
      var values = req.session.user_id; // q += and where user.id = ? // and appointment.date >= now()
      try {
        con.query(q, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success:false});
          }else {
            if (result.length != 0) {
              console.log(result);
              res.send({success:result});
            }
            else {
              res.send({success:false});
            }
          }
        });

      } catch (err) {
        console.log(err, " Error in find_tutor.post function");
      }
    }
  });
});


app.post("/confirm_appointments", function(req, res) {
  // To confirm_appointment after the student selects the time they want with tutor
    connect(function(con) {
      var errors = req.validationErrors();
      if (errors) {
        req.session.errors = errors;
        res.redirect(303, ".");
      }else {
        // need to look up tutor id
        var q_tutorID = "select user.id from user where is_tutor = 1"; // Need to use name in the search but, we will get there soon.
        con.query(q_tutorID, function (err, result, fields) {
          if (err) {
            console.log(err);
          }else {
            if (result.length != 0) {
              // now can use the id to insert into appointment
              var tutor_id = result[0].id
              var q_courseID = "select course.id from course where course.course_code = ?";
              var courseCode = req.body.course;
              con.query(q_courseID, [courseCode],  function (err, result2, fields) {
                if (err) {
                  console.log(err);
                }else {
                  if (result2.length != 0) {
                    // now can use the id to insert into appointment
                    var course_id = result2[0].id;
                    var q_insert = "insert into appointment (`student_id`, `tutor_id`, `date`, `start_time`, `end_time`, `is_completed`, `location`, `is_walkin`, `course_id`) values (?,?,?,?,?,?,?,?,?)";
                    // var values = [req.session.user_id, tutor_id, req.body.date, req.body.start_time, req.body.end_time, '0', 'Math Center', '0', course_id];
                    var values = ['7', tutor_id, '2019-02-09', '15:45:00', '16:00:00', '0', 'Math Center', '0', course_id];
                    con.query(q_insert, values, function(err, result3, fields) {
                      if (err) {
                        console.log(err);
                        res.send({success:false});
                      } else {
                        console.log(result3);
                        res.send({success:true});
                      }
                    });
                  }
                }
              });
            }
          }
        });



        // var q = "insert into appointment (`student_id`, `tutor_id`, `date`, `start_time`, `end_time`, `is_completed`, `location`, `is_walkin`, `course_id`) values ( ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        // var values = [req.body.user_id, req.body.first_name + req.body.first_name, req.body.start, req.body.end, 0 ,req.body.location, 0, req.body.description];
        // var values = ['4', '3', '2019-02-06', '13:00:00', '16:00:00', '0', 'Math Center', '0', 'CMPS 480']
        // left join out to user
        // left join out to appointment_has_course
        // left join out to course

      }

    });
});


app.post("/save_schedule", function(req, res) {
  // To be for saving a tutors schedule, currently doing it in sql

});


app.post("/student_log", function(req, res) {
  // connect(function(con) {
  //   var errors = req.validationErrors();
  //   if (errors) {
  //     req.session.errors = errors;
  //     res.redirect(303, ".");
  //   }else {
  //     var fName = req.body.first_name;
  //     var lName = req.body.last_name;
  //     var subj = req.body.subject;
  //     var date = req.body.date;
  //     var location = req.body.location;
  //     var tutor = req.body.tutor;
  //     console.log(fName, lName, subj, date, location, tutor);
  //     try {
  //       // con.query(q, values, function (err, result, fields) {
  //         // show list of previous appointments give search critera
  //       // });
  //
  //     } catch (err) {
  //       console.log(err, " Error in student_log.post function");
  //
  //     }
  //   }
  //
  //
  // });
  result = {student_id:"001", first_name:"First", last_name:"Last", date:"mm/dd/yyyy", time_in:"11:00", time_out:"14:00", duration:"3", subject:"CMPS 480", location:"Mat Center", tutor:"Tanner Campbell"};
  res.send({success:result});
});


app.post("/tutor_list", function(req, res) {
  // connect(function(con) {
  //   var errors = req.validationErrors();
  //   if (errors) {
  //     req.session.errors = errors;
  //     res.redirect(303, ".");
  //   }else {
  //     var fName = req.body.first_name;
  //     var lName = req.body.last_name;
  //     var subj = req.body.subject;
  //     console.log(fName, lName, subj);
  //     try {
  //     } catch (err) {
  //         console.log(err, " Error in tutor_list.post function");
  //
  //     }
  //
  //   }
  // });
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
