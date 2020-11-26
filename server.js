const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const moment = require('moment');

const app = express();

const User = require('./models/User');
const Exercise = require('./models/Exercise');

dotenv.config({
  path: './config.env',
});

mongoose
  .connect(process.env.MD, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB successfully connected');
  });

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

//Create a new User
app.post('/api/exercise/new-user', async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.json({
      error: 'No name provided',
    });
  }

  const checkUser = await User.findOne({ username });
  if (checkUser) {
    return res.send('Username already taken');
  } else {
    const user = await User.create({ username, log: [] });

    res.json({
      username: user.username,
      id: user.id,
    });
  }
});

app.get('/api/exercise/users', async (req, res) => {
  const userList = {};

  await User.find({}, (err, users) => {
    users.forEach((user) => {
      userList[(user.username, user.id)] = user;
    });
  });

  res.json(userList);
});

app.post('/api/exercise/add', async (req, res) => {
  let exercise;
  const user = await User.findById(req.body.userId);
  if (!user) {
    return res.send('No user exists with that id');
  }

  const { description, duration, date } = req.body;

  if (date) {
    exercise = await Exercise.create({
      description,
      duration,
      date,
    });
  } else {
    exercise = await Exercise.create({
      description,
      duration,
      date: moment().format('YYYY-MM-DD'),
    });
  }

  await user.exerciseLog.push(exercise);
  await user.save();

  res.json({
    user,
  });
});

app.get('/api/exercise/log', async (req, res) => {
  let userLog;
  const user = await User.findById(req.query.userId);
  if (!user) {
    return res.send('No user exists with that id');
  }

  const { from, to, limitQuery } = req.query;

  await User.findOne({ username: user.username })
    .populate('exerciseLog')
    .then((data) => {
      userLog = data.exerciseLog;

      if (from && to) {
        userLog = userLog.filter((exercise) =>
          moment(exercise.date).isBetween(from, to, null, [])
        );
      }

      if (limitQuery) {
        userLog = userLog.slice(0, limitQuery);
      }

      userLog = userLog.reduce((acc, exercise) => {
        acc.push({
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toISOString().split('T')[0],
        });
        return acc;
      }, []);
    });

  res.json({
    id: user.id,
    username: user.username,
    log: userLog,
    count: user.exerciseLog.length,
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || 'Internal Server Error';
  }
  res.status(errCode).type('txt').send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
