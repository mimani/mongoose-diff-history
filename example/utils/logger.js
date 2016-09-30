var winston = require("winston");
winston.emitErrs = true;
var path = require("path");
var filename = "";
if(process.env.NODE_ENV === "localhost"){
    filename = path.join(__dirname, "..", "/log/example.log");
}else if(process.env.NODE_ENV === "test"){
    filename = path.join(__dirname, "..", "/log-test/example.log");
}else{
    filename = "/var/log/example/example.log";
}
var logger = new winston.Logger({
    transports: [
        new (winston.transports.File)({
            level: "info",
            filename: filename,
            json: true,
            maxsize: 5242880, //5MB
            maxFiles: 100,
            colorize: true
        }),
        new (winston.transports.Console)({
            level: "debug",
            json: false,
            colorize: true,
            prettyPrint: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};