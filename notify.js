var express = require('express');
var credentials = require('./credentials.js');
var mysql = require('mysql');
var app = express();
const accountSid = credentials.accountSid;
const authToken = credentials.authToken;
const client = require('twilio')(accountSid, authToken);

// MYSQL Connection function
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


// Finds appointment
function findAppts() {
  connect(function(con) {
    try {
      //var q = "SELECT * FROM appointment left join user on  appointment.student_id = user.id WHERE start_time between TIME(NOW()) and DATE_ADD(TIME(NOW()), INTERVAL 1 HOUR)";
      var q = "SELECT * FROM appointment left join user on  appointment.student_id = user.id WHERE 1=1 and Date('2019-04-14') = appointment.date and Time(start_time) between TIME('23:00:00') and DATE_ADD(TIME('23:00:00'), INTERVAL 30 minute)";
      con.query(q, function (err, result, fields) {
        if (err) {
          console.log(err);
        }else {
          for (i in result) {
            console.log(result[i]['phone']);
            client.messages
              .create({
                 body: "Upcoming Appointment in 30 minutes", // with (name) + at (time)
                 from: '+14845099246',
                 to: '+1'+ result[i]['phone']
              })
            .then(message => console.log(message.sid + " Message sent on: " + message.dateCreated));
          }
        }
      });
    }catch(err){
      console.log(err, " Error");
    }
  });
}

findAppts()
