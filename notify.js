const accountSid = 'AC4f432e5139b7d103e342c5f4eb48edab';
const authToken = '26e8c635e9611ed3f62ac1b053e63be4';
const client = require('twilio')(accountSid, authToken);
var express = require('express');
var credentials = require('./credentials.js');
var mysql = require('mysql');
var app = express();

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
      var q = "SELECT * FROM appointment left join user on  appointment.student_id = user.id WHERE start_time between TIME(NOW()) and DATE_ADD(TIME(NOW()), INTERVAL 1 HOUR)";
      con.query(q, function (err, result, fields) {
        if (err) {
          console.log(err);
        }else {
          console.log(result);
        }
      });
    }catch(err){
      console.log(err, " Error");
    }
  });
}

// findAppts()


// Sends texts
function sendTxt(phone, message) {
  client.messages
    .create({
       body: message, // with (name) + at (time)
       from: '+14845099246',
       to: phone
    })
  .then(message => console.log(message.sid + " Message sent on: " + message.dateCreated));
}

sendTxt('+16107501827', 'test')


// Query DB to get the time

// Feed that time into select appt statement and notify the people
