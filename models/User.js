const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  exerciseLog: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }],
});

userSchema.pre(/^find/, function (next) {
  this.select('-__v');
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
