** Will add to one PDF when all are received **

## Use Cases
### Use Case: Login
* Primary Actor: User —> Student, Tutor, Administrator
* Scope: Login and Validating user
* Level: User
* Brief: The user logs into the application.
* Stakeholders: Not sure…
* Postconditions: If successful the user gets logged into the application
* Preconditions: User has account
* Triggers: User wants to login
* Basic flow:
1.	The system requests that the user enter their Point Park email and password.
2.	The user enters their email and password.
3.	The system validates the entered email and password and logs the user into the application.
* Extensions: Depending on type of user, privileges limit what the user will do.
API:
{
“action”: “validate_user”,
“email”: “some_user”, 
“password”: “password”
}
=> 
{
“success”: true,
“message”: “user was logged in.”
} 
or 
{
“success”: false
}

### Use Case: Student Finds Tutor
* Primary Actor: User [Student]
* Scope: Tutor list of availability
* Level: Student Goal
* Brief:  Student selects course they need tutoring, student gets presented with list of available tutors and the days/hours of their availability.
* Stakeholders: Not sure…
* Postconditions: Student gets presented schedule of tutors given a course
* Preconditions: Login
* Triggers: Student request tutor in a given course
* Basic flow:
* 1.	Student enters a course code.
* 2.  Calendar gets generated with a list of tutors and open times slots.
* Extensions: 
API:
{
“action”: “find_tutor”,
“course_id”: “course_id” 
}
=> 
{
“success”: true,
“appointment_id” : “”, 
“tutor_id” : “”, “appointment_date” : “”,  “appointment_start” : “”,  “appointment_end” : “”
} 
or 
{
“success”: false
}

### Use Case: Student Student Confirms Appointment
* Primary Actor: User [Student]
* Scope:  Saves appointment with a selected tutor
* Level: Student Goal
* Brief:  Student selects a time and gets option to confirm appointment or go back.
* Stakeholders: Not sure…
* Postconditions: Appointment is saved
* Preconditions: Calendar gets presented
* Triggers: Student clicks on time
* Basic flow:
* 1. Student clicks on time they want.
* 2. Students gets redirected to confirmation page.
* 3. Can either confirm the appointment or go back and re schedule.
* Extensions: 
API:
{
“action”: “confirm_appointments”,
“student_id”:
“tutor_id”
“date”
“start_time”
“end_time”
“course_id”
}
=> 
{
“success”: true,
“message” : “Appointment saved with tutor at this date and time”
} 
or 
{
“success”: false
}

### Use Case: Tutor Views Appointments
* Primary Actor: User [Tutor]
* Scope:  View Calendar of appointments
* Level: Tutor Goal
* Brief: Tutor can view a calendar of appointments
* Stakeholders: Not sure…
* Postconditions: Calendar of appointments get generated
* Preconditions: Appointment gets saved, and must be a tutor 
* Triggers: Tutor clicks Appointments tab on nav bar.
* Basic flow:
* 1. Tutor clicks Appointments tab.
* 2. Calendar gets presented to user.
* Extensions: 
API:
{
“action”: “load_appointments”,
“user_id”:
}
=> 
{
“success”: true,
“description”: "CMPS 480”, “end”: "2019-03-11T12:00:00”, “start”: "2019-03-11T10:00:0”, “title”: “Student Name”
} 
or 
{
“success”: false
}

### Use Case: Tutor Saves schedule 
* Primary Actor: User [Tutor]
* Scope:  Save Schedule for a tutor 
* Level: Tutor Goal
* Brief: Tutor can create a calendar event to save their work schedule 
* Stakeholders: Not sure…
* Postconditions: Schedule for that day is saved
* Preconditions: Must be a tutor in the database
* Triggers: Tutor drags time on calendar
* Basic flow:
* 1. Tutor click on Create Schedule on nav bar.
* 2. Drags the time range on a given day.
* 3. Database stores that day.
* Extensions: 
API:
{
“action” : “save_schedule”,
“user_id”:
“date”:
“start” : “end”  :
}
=> {
“success”: true,
“message”: “Schedule saved for today”
}
or
{
“success”: false
}

