const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  domain: {
  name: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
},

  hosting: {
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
  },
});

module.exports = mongoose.model('Domain', domainSchema);
