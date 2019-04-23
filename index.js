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
  if (!req.session.user_id) {
    menu.push({"page": ".", "label": "Login"});
  }
  else {
    menu.pop();
    if (req.session.user_id) {
      menu.push({"page": "schedule", "label": "Find Tutor"}, {"page": "tutor_view", "label": "Appointments"});
    }
    if (req.session.is_tutor) {
      menu.push({"page": "save_schedule", "label": "Create Schedule"});
    }
    if (req.session.is_admin) {
      menu.push({"page": "add_tutor", "label": "Add Tutor"});
    }
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

// preferences pages, user can sign up for notifications
app.get('/preferences', function(req, res) {
  res.render('preferences', {
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


app.get('/view_appointment', function(req, res) {
  res.render('view_appointment', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name,
    tutor: req.session.is_tutor
  });
});


app.get('/modify_schedule', function(req, res) {
  if(req.session.is_tutor) {
    res.render('modify_schedule', {
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


app.get('/tutor_view', function(req, res) {
  res.render('tutor_view', {
    menu: getMenu(req),
    login: req.session.user_id ? req.session.user_id : false,
    user_name: req.session.user_first_name,
    tutor: req.session.is_tutor
  });
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


// Allows tutor to create schedule
app.get('/add_tutor', function(req, res) {
  if(req.session.is_tutor) {
    res.render('add_tutor', {
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
      var q  = "SELECT * FROM user WHERE email = ?";
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
      var query = "select schedule.id as schedule_id, schedule.tutor_id, CAST(schedule.date AS char) as date, schedule.start as start, schedule.end as end, course.id as course_id from schedule left outer join tutor_has_course on schedule.tutor_id = tutor_has_course.user_id left outer join course on tutor_has_course.course_id = course.id where schedule.date >= curdate() and course.course_code = ? order by schedule.date, schedule.start limit 1";
      var value = [course];
      try {
        con.query(query, value, function (err, schedule_result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            if (schedule_result.length != 0) {
              var dates_to_search = []; // Gathers our dates for 2nd query
              var result1 = []; // hold our results
              for (var i = 0; i < schedule_result.length; i++) {
                dates_to_search.push(
                  schedule_result[i].date
                );
              }
              // select all the appoints given our dates
              //var appts_query = "select appointment.id as appointment_id, appointment.tutor_id, DATE_ADD(CAST( appointment.date AS char), INTERVAL 1 DAY) as date, appointment.start_time as start, appointment.end_time as end from appointment  where appointment.date in (?) order by appointment.date";
              var appts_query = "select appointment.id as appointment_id, appointment.tutor_id, CAST(appointment.date AS char) as date, appointment.start_time as start, appointment.end_time as end from appointment where appointment.date in (?) order by appointment.date";
              try {
                con.query(appts_query, [dates_to_search], function(err, appts_result, fields) {
                  if (err) {
                    console.log(err);
                    res.send({success: false});
                  }else {
                    // check if no return
                    var result = buildOutput(schedule_result, appts_result);
                    console.log(result);
                    res.send({success: result});
                  }
                });
              }catch (err) {
                console.log(err, "Error return scedule back");
              }
            }else {
              res.send({success: false});
            }
          }
        });
      }catch (err) {
        console.log(err, "Error return schedule back");
      }
    }
  });
});


function buildOutput(schedule, appt) {
  // sort by date, start time
  appt = _.sortBy(appt, ['date', 'start']);


  // store output
  var data = [];

  // TODO:
  // ... loop over schedule to show more than 1 date occurance

  // Schedule date
  var schedDate = schedule[0].date;//.slice(0, 11);
  // console.log(schedDate);

  // Schedule time in MS
  var startDatetimeMS = new Date(schedDate +"T"+ schedule[0].start).getTime();

  // Assign the start of the schedule to the last_end_time
  // start of tutor shift, converted into MS
  var last_end_time = startDatetimeMS;

  // end of tutor shift, converted into MS
  var schedule_end_time = new Date(schedDate +"T"+ schedule[0].end).getTime();

  var cur_moment = new Date().getTime();

  // loop over appoitments
  for (var i = 0; i < appt.length; i++) {

    // appointment Dates
    var apptDate = appt[i].date.slice(0, 11);


    // each appointment start time in MS
     var apptStartTimeMS = new Date(apptDate +"T"+ appt[i].start).getTime();

    // each appointment end time in MS
     var apptEndTimeMS = new Date(apptDate +"T"+ appt[i].end).getTime();

    for (var j = 0; j < (apptStartTimeMS - last_end_time) / 1800000; j++) {
      var intervalStart = last_end_time + j * 1800000;

      // console.log("start", msToTime(intervalStart));
      var intervalEnd = last_end_time + (j + 1) * 1800000;
      // console.log("end", msToTime(intervalEnd));

      if (intervalStart >= cur_moment) {
        data.push({
          schedule_id: schedule[0].schedule_id,
          tutor_id: schedule[0].tutor_id,
          course_id: schedule[0].course_id,
          date: schedule[0].date,
          start: msToTime(intervalStart),
          end: msToTime(intervalEnd)
        });
      }
      // Assign the appt_end to last_end_time

    }
    last_end_time = apptEndTimeMS;
  }

// Need to add time invervals until the end of the shift
  for (var j = 0; j < (schedule_end_time - last_end_time) / 1800000; j++) {
    var intervalStart = last_end_time + j * 1800000;

    var intervalEnd = last_end_time + (j + 1) * 1800000;
		if (intervalStart >= cur_moment) {
      data.push({
        schedule_id: schedule[0].schedule_id,
        tutor_id: schedule[0].tutor_id,
        course_id: schedule[0].course_id,
        date: schedule[0].date,
        start: msToTime(intervalStart),
        end: msToTime(intervalEnd)
      });
   }

  }
  // print output
  return data;
}


// Loads a tutors appointments on page load
app.post("/load_appointments", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      if (req.session.is_tutor == 0) {
        // query for student
        var q = "select appointment.id as appointment_id,appointment.date, appointment.start_time, appointment.end_time, appointment.location, appointment.notes, user.first_name, user.last_name, course.course_code from appointment left outer join user on appointment.tutor_id = user.id left join course on appointment.course_id = course.id  where appointment.student_id = ?";
      }else {
        // query for tutor
        var q = "select appointment.id as appointment_id, appointment.date, appointment.start_time, appointment.end_time, appointment.location, user.first_name, user.last_name, course.course_code from appointment left outer join user on appointment.student_id = user.id left join course on appointment.course_id = course.id  where appointment.tutor_id = ?";
        // var q = "select appointment.id as appointment_id, appointment.date, appointment.start_time, appointment.end_time, appointment.location, user.first_name, user.last_name, course.course_code from appointment left outer join user on appointment.student_id = user.id left join tutor_has_course on appointment.tutor_id = tutor_has_course.user_id left join course on tutor_has_course.course_id = course.id where appointment.tutor_id = ?";
      }
      var values = [req.session.user_id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            if (result.length != 0) {
              res.send({success: result});
            }
            else {
              res.send({success: false});
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
      var notes = req.body.notes;
      var q = "insert into appointment (`student_id`, `tutor_id`, `date`, `start_time`, `end_time`, `is_completed`, `location`, `is_walkin`, `course_id`, `notes`) values (?,?,?,?,?,?,?,?,?,?)";
      var values = [req.session.user_id, tutor_id, date, start, end, '0', 'Math Center', '0', course_id, notes];
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
        console.log(err, "Error app.post.confirm_appointments");
      }
    }
  });
});



app.post("/view_appts_more_detail", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      if (req.session.is_tutor == 0) {
        // query for student
        var q = "select appointment.id, appointment.date, appointment.start_time, appointment.end_time, appointment.notes, appointment.tutor_notes, user.first_name, user.last_name, course.course_code, course.course_name from appointment left join user on appointment.tutor_id = user.id left join course on appointment.course_id = course.id where appointment.id = ?";
      }else {
        // query for tutor
        var q = "select appointment.id, appointment.date, appointment.start_time, appointment.end_time, appointment.notes, appointment.tutor_notes, user.first_name, user.last_name, course.course_code, course.course_name from appointment left join user on appointment.student_id = user.id left join course on appointment.course_id = course.id where appointment.id = ?";
      }
      var values = [req.body.appointment_id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            res.send({success: result});
          }
        });
      }catch (err) {
        console.log(err, "Error app.post.view_appts_more_detail");
      }
    }
  });
});



app.post("/update_tutor_note", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "UPDATE appointment SET tutor_notes = ? WHERE id = ?";
      var values = [req.body.note, req.body.id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            res.send({success: true});
          }
        });
      }catch (err) {
        console.log(err, "Error app.post.view_appts_more_detail");
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
      var values = [req.body.user_id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            res.send({success: result});
          }
        });
      } catch (err) {
        console.log(err, " Error in load_schedule.post function");
      }
    }
  });
});

app.post("/render_schedule", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "select * from schedule where id = ?";
      var values = [req.body.schedule_id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            res.send({success: result});
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

      var start = req.body.start_time;
      var end = req.body.end_time;
      var id = req.body.id;

      var q = "UPDATE schedule SET schedule.start = ?, schedule.end = ? WHERE schedule.id = ?";
      var values = [start, end, id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success:false});
          }else {
            console.log(result);
            res.send({success: true});
          }
        });
      }catch (err) {
        console.log(err, " Error in upadate.post function");
      }
    }
  });
});


// Course ID Lookup function
/*
function findCourseID(course_code) {
  var id;
  connect(function(con) {
    var q = "select id from course where course_code = ?"
    try {
      con.query(q, [course_code], function (err, result, fields) {
        id = result[0].id;
      });
    }catch(err) {
      console.log(err, " Error finding course ID.");
    }
  });
  return id;
}

// console.log("Finding Course ID ", findCourseID("CMPS 480"));
*/


/*
app.post("/save_schedule", function(req, res) {
  connect(function(con) {
      var errors = req.validationErrors();
      if (errors) {
        req.session.errors = errors;
        res.redirect(303, ".");
      }else {
        var q = "insert into schedule (schedule.tutor_id, schedule.date, schedule.start, schedule.end) values (?, ?, ?, ?)";
        var tutor_id = req.session.user_id;
        var date = req.body.date;
        var start_time = req.body.start;
        var end_time = req.body.end;
        var values = [tutor_id, date, start_time, end_time];
        try {
          // insert into schedule
          con.query(q, values, function (err, result, fields) {
            if (err) {
              console.log(err);
              res.send({success: false});
            }else {
              var course = req.body.course;
              var find_q = "select id from course where course_code = ?";
              try {
                // Course ID lookup given a course code
                con.query(find_q, [course], function (err, courseResult, fields) {
                  if (err) {
                    console.log(err);
                    res.send({success: false});
                  }else {
                    // update tutor has course

                    var id = courseResult[0].id;
                    console.log(id);
                    var course_q = "INSERT INTO tutor_has_course (user_id, course_id) VALUES (?, ?)";
                    var course_Vals = [req.session.user_id, id];
                    try {
                      con.query(course_q, course_Vals, function (err, result2, fields) {
                        if (err) {
                          console.log(err);
                          res.send({success: false});
                        }else {
                          console.log(result2);
                          res.send({success: true});
                        }
                      });
                    }catch(err) {
                      console.log(err, " Error inserting into tutor_has_course.");
                    }
                  }
                });
              }catch (err) {
                console.log(err, " Error Finding Course");
              }
            }
          });
        }catch (err) {
          console.log(err, " Error entering schedule");
        }
      }
  });
});
*/


// Handles Saving the Tutors schedule
app.post("/save_schedule", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "insert into schedule (schedule.tutor_id, schedule.date, schedule.start, schedule.end) values (?, ?, ?, ?)";
      var tutor_id = req.session.user_id;
      var date = req.body.date;
      var start_time = req.body.start;
      var end_time = req.body.end;
      var course = req.body.course;
      var values = [tutor_id, date, start_time, end_time];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            // need to update course info...
            console.log(result);
            res.send({success: true});
          }
        });
      }catch (err) {
        console.log(err, " Error in upadate.post function");
      }
    }
  });
});


app.post("/cancel_appointment", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var q = "DELETE from appointment where id = ?";
      var values = [req.body.id];
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
        console.log(err, " Error in cancel_appointment.post function");
      }
    }
  });
});

//render phone number on preferences pages

app.post("/render_phoneNum", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var user_id = req.body.user_id;
      var q = "select phone from user where phone is not null and id = ?";
      var values = [user_id];
      try {
        con.query(q, values, function (err, result, fields) {
          if (err) {
            console.log(err);
            res.send({success: false});
          }else {
            res.send({success: result});
          }
        });
      }catch(err) {
        console.log(err, " Error getting existing phone number");
      }
    }
  });
})

app.post("/save_phone", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var phone = req.body.phone_num;
      // phone = phone.replace(/-/g, "");
      var user_id = req.session.user_id;
      var q = "UPDATE user SET phone = ? WHERE id = ?;"
      var values = [phone, user_id];
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
        console.log(err, " Error in save_phone.post function");
      }
    }
  });
});

app.post("/add_tutor", function(req, res) {
  connect(function(con) {
    var errors = req.validationErrors();
    if (errors) {
      req.session.errors = errors;
      res.redirect(303, ".");
    }else {
      var ppu_id = req.body.ppu_id;
      var q = 'UPDATE user SET is_tutor = 1 WHERE ppu_id = ?';
      var values = [ppu_id];
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
        console.log(err, " Error in save_phone.post function");
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


function msToTime(duration) {
  duration = duration - 14400000;
  var seconds = parseInt((duration / 1000) % 60);
  var minutes = parseInt((duration / (1000 * 60)) % 60);
  var hours = parseInt((duration / ( 1000 * 60 *60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

  function ConvertTimeformat(time) {
  var format = "24";
  var hours = Number(time.match(/^(\d+)/)[1]);
  var minutes = Number(time.match(/:(\d+)/)[1]);
  var AMPM = time.match(/\s(.*)$/)[1];
  if (AMPM == "PM" && hours < 12) hours = hours + 12;
  if (AMPM == "AM" && hours == 12) hours = hours - 12;
  var sHours = hours.toString();
  var sMinutes = minutes.toString();
  if (hours < 10) sHours = "0" + sHours;
  if (minutes < 10) sMinutes = "0" + sMinutes;
    return sHours + ":" + sMinutes;
  }
