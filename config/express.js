var express = require('express')
  , cors = require('cors')
  , fs = require('fs')
  , bodyParser = require('body-parser')
  , compress = require('compression')
  , methodOverride = require('method-override')
  , error = require('./middlewares/error')
  , passport = require('passport')
  , mongoose = require('mongoose');

module.exports = function(app, config) {
  var env = process.env.NODE_ENV || 'development';
  app.locals.ENV = env;
  app.locals.ENV_DEVELOPMENT = env == 'development';

  if (env === 'development') {
    app.use(function (req, res, next) {
      app.use(cors());

      // intercept OPTIONS method
      if ('OPTIONS' == req.method) {
        res.sendStatus(200);
      }
      else {
        next();
      }
    });
  }

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(compress());
  app.use(error());

  // Passport
  app.use(passport.initialize());
  require('./passport')(passport);

  if (env === 'development') {
    app.use('/', express.static(config.root + '/public/app', {redirect: false}));
    app.use('/bower_components', express.static(config.root + '/public/bower_components', {redirect: false}));
  }
  else {
    app.use('/', express.static(config.root + '/public/dist', {
      redirect: false,
      setHeaders: (res, path) => {
        if (/.*\.(css|js|png|jpg)/.test(path)) res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }));
  }

  app.get('/health', function(req, res) {
    res.set('Content-Type', 'text/plain')
    res.send('app=1\ndb=' + mongoose.connection.readyState)
  })

  app.use(methodOverride());

  var controllers = fs.readdirSync(config.root + '/app/controllers').filter(function(f) {
    return f.endsWith('.js')
  });
  controllers.forEach(function (controller) {
    require(config.root + '/app/controllers/' + controller)(app, passport);
  });

  app.use(function (req, res, next) {
    res.redirect('/');
  });

  app.use(function (err, req, res, next) {
    return res.makeError(err.status || 500, err.message, err);
  });

  app.enable('trust proxy');
};
