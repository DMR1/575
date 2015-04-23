var express = require('express');
var router = express.Router();
var moment = require('moment');
var unirest = require('unirest');

module.exports = router;

// =========================================================
// =
// =   SET UP MONGODB AND MONGOOSE
// =

// MongoDB is a JavaScript-oriented database.
// http://docs.mongodb.org/manual/core/crud-introduction/

// --> In Cloud9, you need to start MongoDB before running your app by typing 
// ./mongod 
// at the terminal ("bash" window). But you only need to do that once per workspace. 
// MongoDB should run forever after that.

// Mongoose makes it easy to access MongoDB using a pattern of "models".
// http://mongoosejs.com

// Use Mongoose to connect to the MongoDB database. We'll call our
// database "networks". It will be created automatically if it doesn't already exist.

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI || ('mongodb://' + process.env.IP + '/networks'));




// =========================================================
// =
// =   DEFINE OUR DATA MODELS
// =

// Define the data structure of a Pangram model
// Allowed data types (Number, String, Date...): http://mongoosejs.com/docs/schematypes.html

var PangramSchema = new mongoose.Schema({
  line1_5: {type: String, required: true},
  line2_7: {type: String, required: true},
  line3_5: {type: String, required: true},
});

// Special method of every pangram to return the total character count

PangramSchema.methods.character_count = function() {
  // Should we exclude spaces and punctuation from this?
  return this.line1_5.length + this.line2_7.length + this.line3_5.length;
}

// Special validation to ensure the pangram has all 26 letters

PangramSchema.path('line2_7').validate(function(value) {
  // value will be line2_7 but doesn't really matter
  // From http://rosettacode.org/wiki/Pangram_checker#JavaScript
  var s = ((this.line1_5 || '') + (this.line2_7 || '') + (this.line3_5 || '')).toLowerCase();
  // sorted by frequency ascending (http://en.wikipedia.org/wiki/Letter_frequency)
  var letters = "zqxjkvbpygfwmucldrhsnioate";
  var is_pangram = true;
  for (var i = 0; i < 26; i++) {
    if (s.indexOf(letters.charAt(i)) == -1) {
      is_pangram = false;
      break;
    }
  }
  return is_pangram;
}, 'Not a pangram!');

// Special validations to ensure the haiku has the correct syllables

PangramSchema.path('line1_5').validate(function(value, callback) {
  validate_syllables(value, 5, callback);
}, "Line 1 doesn't have 5 syllables.");

PangramSchema.path('line2_7').validate(function(value, callback) {
  validate_syllables(value, 7, callback);
}, "Line 2 doesn't have 7 syllables.");

PangramSchema.path('line3_5').validate(function(value, callback) {
  validate_syllables(value, 5, callback);
}, "Line 3 doesn't have 5 syllables.");

function validate_syllables(value, required_syllables, callback) {
  unirest.get("http://rhymebrain.com/talk")
    .query({function: 'getWordInfo', word: value})
    .end(function(result) {
      var data = result.body;
      var syllables = parseInt(data.syllables);
      callback(syllables == required_syllables);
    });
}

var Pangram = mongoose.model('Pangram', PangramSchema);





// =========================================================
// =
// =   WEB ROUTES
// =


// HOME PAGE
// /
// Shows _all_ the phrases

router.get('/', function(request, response, toss) {
  
  // When the server receives a request for "/", this code runs

  // Find all the Shape records in the database
  Pangram.find().sort({_id: -1}).exec(function(err, pangrams) {
    // This code will run once the database find is complete.
    // pangrams will contain a list (array) of all the pangrams that were found.
    // err will contain errors if any.

    // If there's an error, tell Express to do its default behavior, which is show the error page.
    if (err) return toss(err);
    
    // Error message and existing input are passed from the redirect from /create if there were validation errors
    response.locals.error = request.query.error;
    response.locals.line1_5 = request.query.line1_5;
    response.locals.line2_7 = request.query.line2_7;
    response.locals.line3_5 = request.query.line3_5;

    // The list of pangrams will be passed to the template.
    response.locals.pangrams = pangrams;
    
    // layout tells template to wrap itself in the "layout" template (located in the "views" folder).
    response.locals.layout = 'layout';

    // Render the "home" template (located in the "views" folder).
    response.render('home');

  });
  
});




// CREATE PAGE
// /create?line1_5=abc&line2_7=def&line3_5=ghi
// Normally you get to this page by clicking "Submit" on the home page, but
// you could also enter a URL like the above directly into your browser.

router.get('/create', function(request, response, toss) {
  
  // When the server receives a request for "/create", this code runs
  
  // Make a new Pangram in memory, with the parameters that come from the URL 
  // and store it in the pangram variable
  var pangram = new Pangram({
    line1_5: request.query.line1_5,
    line2_7: request.query.line2_7,
    line3_5: request.query.line3_5,
  });
  
  // Now save it to the database
  pangram.save(function(err) {
    // This code runs once the database save is complete

    // An err here can be due to validations
    if (err) {
      // Figure out an error message and redirect to home, passing the error message to display
      var errors = [];
      if (err.errors.line1_5) {
        errors.push(err.errors.line1_5.message);
      }
      if (err.errors.line2_7) {
        errors.push(err.errors.line2_7.message);
      }
      if (err.errors.line3_5) {
        errors.push(err.errors.line3_5.message);
      }
      errors = errors.join(' ');
      response.redirect('/?error=' + errors + 
        '&line1_5=' + request.query.line1_5 +
        '&line2_7=' + request.query.line2_7 +
        '&line3_5=' + request.query.line3_5);
    }
    else {
      // Otherwise just redirect to home
      response.redirect('/');  
    }

  });
  
});



// ABOUT PAGE
// /about

router.get('/about', function(request, response) {

  // When the server receives a request for "/about", this code runs

  response.locals.layout = 'layout';
  response.render('about');
  
});
