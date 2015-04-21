var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session')


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// app.use(bodyParser());
app.use(cookieParser());
// app.use(session());


// app.get('/',
// function(req, res) {

//   res.render('login');
// });

// app.get('/create',
// function(req, res) {
//   res.render('index');
// });

app.get('/links',
function(req, res) {
  if (req.cookies.authorized){
    res.render('index');
    Links.reset().fetch().then(function(links) {
      console.log(links.models);
      res.send(200, links.models);
    })
  }
  else{
    res.redirect('/login');
    res.send();
  };
});

// app.get('/links',
// function(req, res) {
//   Links.reset().fetch().then(function(links) {
//     console.log(links.models);
//     res.send(200, links.models);
//   });
// });

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/', function(req, res){
  util.restrict(req, res, function(){
    res.render('index');
  })
})

app.get('/login', function(req, res){
  res.render('login');
})

app.post('/login', function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username, password: password}).fetch().then(function(found){
    if (found){
      //direct user to main index file;
      res.cookie('authorized', true);
      res.redirect('/');
      res.send();
    }
    else{
      res.redirect('/login');
      res.send();
      //redirect user to login page
    }
  })

  // new Link({ url: uri }).fetch().then(function(found) {
  //   if (found) {
  //     res.send(200, found.attributes);
  //   } else {
  //     util.getUrlTitle(uri, function(err, title) {
  //       if (err) {
  //         console.log('Error reading URL heading: ', err);
  //         return res.send(404);
  //       }

  //       var link = new Link({
  //         url: uri,
  //         title: title,
  //         base_url: req.headers.origin
  //       });

  //       link.save().then(function(newLink) {
  //         Links.add(newLink);
  //         res.send(200, newLink);
  //       });
  //     });
  //   }
  // });



})

app.get('/signup', function(req, res){
  res.render('signup');
})

app.post('/signup', function(req, res){
  var username = req.body.username;
  var password = req.body.password;


  var user = new User({
    username: username,
    password: password
  })

  user.save().then(function(newUser){
    Users.add(newUser);
    res.cookie('authorized', true);
    res.redirect('/');
    res.send(200,newUser);
  })

})

app.get('/create', function(req, res) {
  util.restrict(req, res, function(){
    res.render('index');
  })
});

app.get('/links', function(req, res) {
  util.restrict(req, res, function(){
    res.render('index');
  })
});

// app.get('/', function(req, res){
//   //if cookie is true{
//     if(req.session.user){
//       res.render('index');
//       next();
//     } else{
//       res.render('login');
//     }
//   // }
//   //else {
//   // }
// })


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);




