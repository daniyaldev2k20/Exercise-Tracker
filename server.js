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
  .connect(process.env.DB, {
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
  const defaultDate = moment().format('YYYY-MM-DD');

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
      date: defaultDate,
    });
  }

  await user.exerciseLog.push(exercise);
  await user.save();

  res.json({
    user,
  });
});

app.get('/api/exercise/log', async (req, res) => {
  const user = await User.findById(req.query.userId);
  let userLogs;

  if (!user) {
    return res.send('No user exists with that id');
  }

  const { fromDate, toDate, limitQuery } = req.query;

  if(fromDate && toDate && limitQuery){
    userLogs = await User.findOne({username: user.username}).populate({
      path: 'exerciseLog',
      match: { 'date': { $gte: fromDate, $lte: toDate }},
      options: { sort: { date: -1 }, limit: limitQuery },
    })
  } else if(limitQuery){
     userLogs = await User.findOne({username: user.username}).populate({
      path: 'exerciseLog',
      options: { sort: { date: -1 }, limit: limitQuery },
    })
  } else {
     userLogs = await User.findOne({username: user.username}).populate({ path: 'exerciseLog' })
  }

  res.json({
    id: user._id,
    username: user.username,
    userLogs,
    count: userLogs.length
  })

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
