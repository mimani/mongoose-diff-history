var config = {
    localConfig: {
        mongo: {
            path: "mongodb://127.0.0.1:27017/example"
        }
    },
    stagingConfig: {
        mongo: {
            path: "mongodb://127.0.0.1:27017/example"
        }
    },
    remoteConfig: {
        mongo: {
            path: "mongodb://127.0.0.1:27017/example"
        }
    },
    testConfig: {
        mongo: {
            path: "mongodb://127.0.0.1:27017/example"
        }
    }
};
if(process.env.NODE_ENV === "production"){
    module.exports = config.remoteConfig;
}
else if(process.env.NODE_ENV === "localhost")
{
    module.exports = config.localConfig;
}
else if(process.env.NODE_ENV === "staging")
{
    module.exports = config.stagingConfig;
}
else if(process.env.NODE_ENV === "test"){
    module.exports = config.testConfig;
}else {
    console.error("Proper node enviornment not set");
}

module.exports.secret = "C40A99EQJLPS2I5HM3SJ";
