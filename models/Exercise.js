const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  description: {
    type: String,
  },
  duration: {
    type: Number,
  },
  date: {
    type: String,
  },
});

exerciseSchema.pre(/^find/, function (next) {
  this.select('-__v');
  next();
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
