// Add any outside files here...
var express = require('express');
var expressValidator = require('express-validator');
var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');
var handlebars = require('express-handlebars').create({defaultLayout: "main"});
var credentials = require('./credentials.js');
var moment = require('moment');
var async = require("async");
var _ = require('lodash');
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

/*
Not storing users Passwords

var genRandomString = function(length) {
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
*/


function getMenu(req) {
  var menu = [];
  menu.push({"page": ".", "label": "Home"});

  if (req.session.user_id) {
    menu.push({"page": "schedule", "label": "Find Tutor"});
  }
  if (req.session.is_admin || req.session.is_tutor) {
    menu.push({"page": "tutor_view", "label": "Appointments"}, {"page": "save_schedule", "label": "Create Schedule"});
  }

  return menu;
};


// Renders Login page, prompts user to login with PPU email / password
app.get('/', function(req, res) {
  if(req.session.user_id) {
    res.redirect(303,'schedule');
  }else {
    res.render('login', {
       menu: getMenu(req),
       login: req.session.user_id ? req.session.user_id : false,
       user_name: req.session.user_first_name,
    });
  }
});


// Allows student to find a tutor given a course code
app.get('/schedule', function(req, res) {
  res.render('schedule', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});


// Confirmation page
app.get('/create_appointment', function(req, res) {
  res.render('create_appointment', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

// Page that shows the appointments to a tutor
app.get('/tutor_view', function(req, res) {
  if(req.session.is_tutor) {
    res.render('tutor_view', {
       menu: getMenu(req),
       admin: req.session.is_admin,
       tutor: req.session.is_tutor,
       login: req.session.user_id ? req.session.user_id : false,
       user_name: req.session.user_first_name,
     });
  }else {
    res.redirect(303, ".");
  }
});

// Allows tutor to create schedule
app.get('/save_schedule', function(req, res) {
  if(req.session.is_tutor) {
    res.render('save_schedule', {
       menu: getMenu(req),
       admin: req.session.is_admin,
       tutor: req.session.is_tutor,
       login: req.session.user_id ? req.session.user_id : false,
       user_name: req.session.user_first_name,
     });
  }else {
    res.redirect(303, ".");
  }
});


/*
// Not being used

app.get('/student_view', function(req, res) {
  res.render('student_view', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});

app.get('/tutor_view', function(req, res) {
  res.render('tutor_view', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name
  });
});


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

*/

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
            req.session.user_id = result[0].id;
            req.session.is_admin = result[0].is_admin;
            req.session.is_tutor = result[0].is_tutor;
            req.session.user_first_name = result[0].first_name;
            req.session.cookie.maxAge = 9000000;
            res.send({success: true});
          }else {
              res.send({success: false});
              console.log("Email not found");
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
      var course = req.body.course_search;
      var query = "select schedule.id as schedule_id, schedule.tutor_id, schedule.date as date, schedule.start as start, schedule.end as end from schedule left outer join tutor_has_course on schedule.tutor_id = tutor_has_course.user_id left outer join course on tutor_has_course.course_id = course.id where schedule.date >= now() order by schedule.date, schedule.start and course.course_code = ?";
      var value = [course];
      try {
        con.query(query, value, function (err, schedule_result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            if (schedule_result) {
              var dates_to_search = []; // Gathers our dates for 2nd query
              var result1 = []; // hold our results
              for (var i = 0; i < schedule_result.length; i++) {
                dates_to_search.push(formatDate(schedule_result[i].date.toString().slice(0,16)));

                result1.push({
                  schedule_id: schedule_result[i].schedule_id,
                  tutor_id: schedule_result[i].tutor_id,
                  date: formatDate(schedule_result[i].date.toString().slice(0,16)),
                  start: schedule_result[i].start,
                  end: schedule_result[i].end
                });

              }
              // select all the appoints given our dates
              var appts_query = "select appointment.id as appointment_id, appointment.tutor_id, appointment.date as date, appointment.start_time as start, appointment.end_time as end from appointment  where appointment.date in (?) order by appointment.date";
              con.query(appts_query, [dates_to_search], function(err, appts_result, fields) {
                var result2 = [];
                for (var i = 0; i < appts_result.length; i++) {
                  result2.push({
                    appointment_id: appts_result[i].appointment_id,
                    tutor_id: appts_result[i].tutor_id,
                    date: formatDate(appts_result[i].date.toString().slice(0,16)),
                    start: appts_result[i].start,
                    end: appts_result[i].end
                  });
                }

                var matches = result1.filter(function(obj1) {
                    return result2.some(function(obj2) {
                      return obj1.tutor_id === obj2.tutor_id && obj1.date === obj2.date;
                    });
                  });

                var appts = _.sortBy(appts_result, ['date', 'start']);

                var dataToSend = [];
                var idx = 0;
                var schedule = matches;
                var last_end_time = schedule[idx].start;

                if (idx <= schedule.length - 1) {
                  for (var i = 0; i < appts.length; i++) {
                    if (appts[i].tutor_id == schedule[idx].tutor_id) { // result2[i].date == schedule[idx].date &&
                      if (last_end_time != appts[i].start) {
                        dataToSend.push({
                          date: appts[i].date,
                          start: last_end_time,
                          end: appts[i].start
                        });
                      }
                    }
                    else if (appts[i].date != schedule[idx].date) {
                      idx = idx + 1;
                    }
                    last_end_time = appts[i].end;
                  }
                }
                console.log(dataToSend);
                // res.send({success: dataToSend});
              });
            }else {
              res.send({success: false});
            }
          }
        });
      }catch (err) {
        console.log(err, "Error return scedule back");
      }
    }
  });
});




// Presents user with a calendar view of avaible times given the course they entered
/*
app.post("/find_tutor", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var course = req.body.course_search;
      var q = "select appointment.id as appointment_id, appointment.tutor_id, appointment.date as appointment_date, appointment.start_time as appointment_start, appointment.end_time as appointment_end, schedule.id as schedule_id, schedule.date as schedule_date, schedule.start as schedule_start, schedule.end as schedule_end from appointment left outer join user on appointment.tutor_id = user.id and user.is_tutor = 1 left join schedule on user.id = schedule.tutor_id and appointment.date = schedule.date left join tutor_has_course on user.id = tutor_has_course.user_id left join course on tutor_has_course.course_id = course.id where schedule.date >= now() order by schedule.date, appointment.start_time and course.course_code = ?";

      var values = [course];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            // res.send({success:false});
          }else {
            if (result.length != 0) {
              var appts = [];
              // // TODO: create new loop that checks if the is the schjedule id we are gettting appointments for
              for (var i = 0; i < result.length; i++) {
                if (result[i].schedule_date.valueOf() === result[i].appointment_date.valueOf()) {
                  if (result[i].appointment_start >=  result[i].schedule_start && result[i].appointment_start <= result[i].schedule_end) {
                    appts.push({
                      schedule_id: result[i].schedule_id,
                      date: result[i].appointment_date,
                      start_time: result[i].appointment_start,
                      end_time: result[i].appointment_end
                    });
                  }
                }
              }

              // make sure appts is sorted by start time
              // appts = JSON.stringify(appts);
              appts = appts.sort(function (a, b) {
                  return ('' + a.start_time).localeCompare('' + b.start_time);
              });
              console.log(result, appts);


              // NEED TO DO individually by date
              // ...
              // appts contains all start and end time within a given schedule id
              // ...
              var dataToSend = [];
              var schedule = result[0];
              var last_end_time = schedule.schedule_start;
              var schedule_end_time = schedule.schedule_end;
              var appt_end = appts.length - 1;
              for (var i = 0; i < appts.length; i++) {
                if (appts[i].schedule_id == result[i].schedule_id) {
                  if (last_end_time != appts[i].start_time) {
                    // console.log(last_end_time, appts[i].start_time);
                    dataToSend.push({date: appts[i].date, start: last_end_time, end: appts[i].start_time});
                    // still need to get the last appointment end to scheduled end
                    // there is time between the last appt and this appt
                    // put that time on the calendar
                    // ...
                  }
                last_end_time = appts[i].end_time;
              }

              }
              // This is our last apptment end time to our schedule_end_time
              dataToSend.push({date:appts[appt_end].date ,start: appts[appt_end].end_time, end: schedule_end_time})
              // console.log(dataToSend);
              // res.send({success:dataToSend});
              // console.log(result[0]);
              // start with start time of schedule and compare to first start time of appt
              // continue looking for open slots after appt_end, need to get the next appt start time
              // ...
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
*/



// Loads a tutors appointments on page load
app.post("/load_appointments", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "select appointment.date, appointment.start_time, appointment.end_time, appointment.location, user.first_name, user.last_name, course.course_code, course.course_name from appointment left outer join user on appointment.student_id = user.id left join tutor_has_course on user.course_id = tutor_has_course.course_id left join course on tutor_has_course.course_id = course.id where appointment.tutor_id = ?";
      var values = [req.session.user_id]; // q += and where user.id = ? // and appointment.date >= now()
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


// Confirms appoint between tutor and student
app.post("/confirm_appointments", function(req, res) {
  // To confirm_appointment after the student selects the time they want with tutor
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var schedule_id = req.body.schedule_id;
      var tutor_id = req.body.tutor_id;
      var course_id = req.body.course_id;
      var date = req.body.date;
      var start = req.body.start;
      var end = req.body.end;
      var q = "insert into appointment (`student_id`, `tutor_id`, `date`, `start_time`, `end_time`, `is_completed`, `location`, `is_walkin`, `course_id`) values (?,?,?,?,?,?,?,?,?)";
      var values = [req.session.user_id, tutor_id, date, start, end, '0', 'Math Center', '0', course_id];
      // var values = ['9', tutor_id, date, start, end, '0', 'Math Center', '0', course_id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            console.log(result);
            res.send({success: true});
          }
        });
      }catch (err) {
        console.log(err, "Error while trying to save appointment -> app.post.confirm_appointments");
      }
    }

  });
});

// Handles loading the tutors schedule calendar
app.post("/load_schedule", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "select * from schedule where tutor_id = ?";
      var values = [req.session.user_id]; // q += and where user.id = ? // and appointment.date >= now()
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

      } catch (err) {
        console.log(err, " Error in load_schedule.post function");
      }
    }
  });
});



// Handles updating the tutors scedule
app.post("/update_schedule", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "UPDATE schedule SET schedule.start = ?, schedule.end = ? WHERE schedule.tutor_id = ? and schedule.id = ?";
      var values = [req.body.start, req.body.end, req.body.tutor_id, req.body.schedule_id];
      try {
        // con.query(q, [values], function (err, result, fields) {
        //   if (err) {
        //     console.log(err);
        //     res.send({success:false});
        //   }else {
        //
        //   }
        // });

      }catch (err) {
        console.log(err, " Error in upadate.post function");
      }
    }
  });
});

// Handles Saving the Tutors schedule
app.post("/save_schedule", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "insert into schedule (schedule.tutor_id, schedule.date, schedule.start, schedule.end) values (?, ?, ?, ?)";
      var values = [req.session.user_id, req.body.date, req.body.start, req.body.end];
      try {
        con.query(q, [values], function (err, result, fields) {
          if (err) {
            console.log(err);
            // res.send({success: false});
          }else {
            // result
          }
        });
      }catch (err) {
        console.log(err, " Error in upadate.post function");
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

// Helpers functions Are below:
function formatDate(date) {
  var d = new Date(date);
  var month = '' + (d.getMonth() + 1);
  var day = '' + d.getDate();
  var year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}
