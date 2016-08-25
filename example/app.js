var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var config = require("./config");
var logger = require("morgan");
var fs = require("fs");
var Logger = require("./utils/logger.js");
var oneDay = 86400000;


// Local routes
var employees = require("./routes/employees");


var mongoose = require("mongoose");
mongoose.connect(config.mongo.path, function(err) {
    if(err) {
        Logger.error(err);
    } else {
        Logger.info("Mongo connection successful");
    }
});

var app = express();

// Access Logs
logger.token("id", function getId(req) {
  var idValue = "-";
  if (req.user && req.user.email) {
    idValue = req.user.email;
  } 
  return idValue;
});
var logDirectory = __dirname + "/log";
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
// setup the logger

app.use(require("express-request-logger").create(Logger, {}));


// view engine setup
app.set("view engine", "ejs");
app.set("NODE_ENV", process.env.NODE_ENV);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public"), { maxAge: oneDay}));


// app.use(cors());

// Local routes
//app.use("/", routes);
app.use("/employees", employees);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

//Error handler
if (app.get("NODE_ENV") === "localhost") {
    // development error handler
    // will print stacktrace
    app.use(function(err, req, res, next) {
        Logger.error(err.message);
        res.status(err.status || 500);
        res.render("error", {
          message: err.message,
          error: err
        });
    });
}
// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    Logger.error(err.message);
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: null
    });
});

module.exports = app;
