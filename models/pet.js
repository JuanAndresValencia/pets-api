const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  animal: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model('Pet', schema)