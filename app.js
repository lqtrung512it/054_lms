'use strict';

const path = require('path');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const app = express();
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const port = 5500;


app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(multer().none());

async function getDBConnection() {
    const db = await sqlite.open({
        filename: '054_lms.sqlite3',
        driver: sqlite3.Database
    });
    return db;
}

//Annoucements
app.get('/api/announcements', async (req, res) => {
    try {
        let db = await getDBConnection();
        let results = await db.all('SELECT * FROM annoucement')
        res.json(results);
        await db.close();
    } catch (e) {
        console.log(e);
    }
});

//Register
app.post('/api/register', async (req, res) => {
    try {
        let db = await getDBConnection();
        let result = {
            status: true,
            message: ""
        }

        let username = req.body.username;
        let check = await db.get('SELECT Username FROM account WHERE Username = ?', username);

        if (username == '') {
            result.status = false;
            result.message = "Please enter these field!";
        }

        if (check) {
            result.status = false;
            result.message = "Username is existed!";
        }

        if (result.status) {
            let name = req.body.fullname;
            let email = req.body.email;
            let password = req.body.password;
            let hash = await bcrypt.hash(password, 10);
            await db.run('INSERT INTO account (Username, Password, Name, Email) VALUES (?, ?, ?, ?)', username, hash, name, email);
            result.message = "Sign up successfully!"
        }

        res.json(result);
        await db.close();
    } catch (e) {
        console.log(e);
    }
});


app.post('/api/login', async (req, res) => {
    try {
        let db = await getDBConnection();
        let result = {
            status: true,
            message: ""
        }

        let username = req.body.username;
        let password = req.body.password;
        let user = await db.get('SELECT Username, Password FROM account WHERE Username = ?', username);

        if (user) {
            let validPass = await bcrypt.compare(password, user.Password);
            if (validPass) {
                result.message = "Valid username and password!";
                res.cookie('user-name', username, {
                    expires: new Date(Date.now() + 8 * 3600000)
                });
            } else {
                result.status = false;
                result.message = "Wrong pass!";
            }
        } else {
            result.status = false;
            result.message = "User not found!";
        }

        res.json(result);
        await db.close();
    } catch (e) {
        console.log(e);
    }
})

app.post('/api/logout', async (req, res) => {
    res.clearCookie('user-name');
    res.redirect('/index.html');
})


app.get('/api/all/courses', async (req, res) => {
    try {
        let db = await getDBConnection();
        let cookie = req.headers.cookie;
        let cookieRegex = cookie.match(/user-name=[0-9a-zA-Z]*/);
        let username = cookieRegex[0].match(/[0-9a-zA-Z]*$/)[0];
        
        let checkUser = await db.all(`SELECT UserID FROM account WHERE Username = ?`, username);
        let userID = checkUser[0]['UserID']

        
        let results = await db.all(`SELECT CourseName, CourseID FROM course WHERE CourseID NOT IN
                                        (SELECT CourseID FROM enrollment WHERE enrollment.UserID = ${userID})   
                                    `);

        res.json(results);

        await db.close();
    } catch (e) {
        console.log(e);
    }
})

app.get('/api/my/courses', async (req, res) => {
    try {
        let db = await getDBConnection();
        let cookie = req.headers.cookie;
        let cookieRegex = cookie.match(/user-name=[0-9a-zA-Z]*/);
        let username = cookieRegex[0].match(/[0-9a-zA-Z]*$/)[0];

        let checkUser = await db.all(`SELECT UserID FROM account WHERE Username = ?`, username);
        let userID = checkUser[0]['UserID']

        let results = await db.all(`SELECT CourseName, CourseID FROM course WHERE CourseID IN
                                        (SELECT CourseID FROM enrollment WHERE enrollment.UserID = ${userID})   
                                    `);

        res.json(results);

        await db.close();
    } catch (e) {
        console.log(e);
    }
})

app.post('/api/enroll', async (req, res) => {
    try {
        let db = await getDBConnection();
        let cookie = req.headers.cookie;
        let cookieRegex = cookie.match(/user-name=[0-9a-zA-Z]*/);
        let username = cookieRegex[0].match(/[0-9a-zA-Z]*$/)[0];

        let checkUser = await db.all(`SELECT UserID FROM account WHERE Username = ?`,username);
        let userID = checkUser[0]['UserID']

        let courseID = req.body.courseID;

        await db.run(`INSERT INTO enrollment (UserID, CourseID) VALUES (${userID}, ${courseID})`);
        res.json('enroll successfully');

        await db.close();
    } catch (e) {
        console.log(e);
    }
})

app.post('/api/unenroll', async (req, res) => {
    try {
        let db = await getDBConnection();
        let cookie = req.headers.cookie;
        let cookieRegex = cookie.match(/user-name=[0-9a-zA-Z]*/);
        let username = cookieRegex[0].match(/[0-9a-zA-Z]*$/)[0];
        

        let checkUser = await db.all(`SELECT UserID FROM account WHERE Username = ?`,username);
        
        let userID = checkUser[0]['UserID']

        let courseID = req.body.courseID;

        await db.run(`DELETE FROM enrollment WHERE UserID = ${userID} AND CourseID = ${courseID}`);
        res.json('unenroll successfully');

        await db.close();
    } catch (e) {
        console.log(e);
    }
})


app.get('/api/course/:courseid/quizes', async(req, res) => {
    try {
        let db = await getDBConnection();
        let courseID = req.params.courseid;

        res.cookie('course-id', courseID, {
            expires: new Date(Date.now() + 0.5 * 3600000)
        });

        let results = await db.all(`SELECT QuizID, QuizName FROM quiz WHERE CourseID = ${courseID}`);

        let courseName = await db.get(`SELECT CourseName FROM course WHERE CourseID = ${courseID}`);
        res.json(results.concat(courseName));
    
        await db.close();
    } catch(e) {
        console.log(e);
    }
})


app.post('/api/course/:courseid/doquiz/:quizid', async(req, res) => {
    try {
        let db = await getDBConnection();
        let courseID = req.params.courseid;
        let quizID = req.params.quizid;

        res.cookie('course-id', courseID, {
            expires: new Date(Date.now() + 0.5 * 3600000)
        });

        res.cookie('quiz-id', quizID, {
            expires: new Date(Date.now() + 0.5 * 3600000)
        });

        let courseName = await db.all(`SELECT CourseName FROM course WHERE CourseID = ${courseID}`);
        let quizName = await db.all(`SELECT QuizName FROM quiz WHERE QuizID = ${quizID}`);
        let heading = courseName.concat(quizName);

        let results = await db.all(`SELECT * FROM question WHERE QuizID = ${quizID}`);
        results.forEach(row => {
            row.QuestionData = JSON.parse(row.QuestionData);
            row.QuestionText = row.QuestionData.text;
            row.QuestionChoices = row.QuestionData.choices;
            row.QuestionCorrect = row.QuestionData.correct;
            delete row.QuestionData;
        })
        
        res.json(heading.concat(results));
    
        await db.close();
    } catch(e) {
        console.log(e);
    }
    }
)

app.listen(port, () => {
    console.log("Server is running");
});
