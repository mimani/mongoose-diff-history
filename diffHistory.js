var History = require("./diffHistoryModel");
var async = require("async");
var jsondiffpatch = require("./node_modules/jsondiffpatch/src/main").create();

var saveDiffs = function(self, next) {
    var queryObject = self;
    queryObject.find(queryObject._conditions, function (err, results) {
        if (err) {
            err.message = "Mongo Error :" + err.message;
            return next();
        }
        async.eachSeries(results, function (result, callback) {
            if (err) {
                err.message = "Mongo Error :" + err.message;
                return next();
            }
            saveDiffHistory(queryObject, result, callback);
        }, function done() {
            return next();
        });
    });
};

var saveDiffHistory = function(queryObject, currentObject, callback) {
    currentObject.constructor.findOne({_id: currentObject._id}, function (err, selfObject) {
        if(selfObject){

            var dbObject = {}, updateParams;
            updateParams = queryObject._update["$set"] ? queryObject._update["$set"] : queryObject._update;
            Object.keys(updateParams).forEach(function(key) {
                dbObject[key] = selfObject[key];
            });
            saveDiffObject(currentObject, dbObject, updateParams, queryObject.options.__user, queryObject.options.__reason, function(){
                callback();
            });
        }
    });
};

var saveDiffObject = function(currentObject, original, updated, user, reason, callback){
    var diff = jsondiffpatch.diff(JSON.parse(JSON.stringify(original)),
        JSON.parse(JSON.stringify(updated)));
    if (diff) {
        History.findOne().sort("-version").exec(function (err, lastHistory) {
            if (err) {
                err.message = "Mongo Error :" + err.message;
                return callback();
            }
            var history = new History({
                collectionName: currentObject.constructor.modelName,
                collectionId: currentObject._id,
                diff: diff,
                user: user,
                reason: reason,
                version: lastHistory.version + 1
            });
            saveHistoryObject(history, callback);
        });
    }
    else{
        callback();
    }
};

var saveHistoryObject = function (history, callback){
    history.save(function (err) {
        if (err) {
            err.message = "Mongo Error :" + err.message;
        }
        callback();
    });
};

var getVersion = function (modelName, id, version, callback) {
    History.find({collectionName: modelName, collectionId: id, version: {$lte : parseInt(version, 10)}}, function (err, histories) {
        if (err) {
            console.error(err);
            return callback(err, null);
        }
        var object;
        async.each(histories, function(history, eachCallback){
            if(history.version === 0){
                object = history.diff;
            }
            else{
                jsondiffpatch.patch(object, history.diff);
            }
            eachCallback();
        }, function(err){
            if (err) {
                console.error(err);
                return callback(err, null);
            }
            callback(null, object);
        })
    });
};

var getHistories = function (modelName, id, exapndableFields, callback) {
    History.find({collectionName: modelName, collectionId: id, version:  { $gt: 0}}, function (err, histories) {
        if (err) {
            console.error(err);
            return callback(err, null);
        }
        async.map(histories, function (history, mapCallback) {
            var changedValues = [];
            var changedFields = [];
            for (var key in history.diff) {
                if (history.diff.hasOwnProperty(key)) {

                    if (exapndableFields.indexOf(key) > -1) {
                        //var oldDate = new Date(history.diff[key][0]);
                        //var newDate = new Date(history.diff[key][1]);
                        //if (oldDate != "Invalid Date" && newDate != "Invalid Date") {
                        //    oldValue = oldDate.getFullYear() + "-" + (oldDate.getMonth() + 1) + "-" + oldDate.getDate();
                        //    newValue = newDate.getFullYear() + "-" + (newDate.getMonth() + 1) + "-" + newDate.getDate();
                        //}
                        //else {
                        oldValue = history.diff[key][0];
                        newValue = history.diff[key][1];
                        //}
                        changedValues.push(key + " from " + oldValue + " to " + newValue);
                    }
                    else {
                        changedFields.push(key);
                    }
                }
            }
            var comment = "modified " + changedFields.concat(changedValues).join(", ");
            return mapCallback(null, {
                changedBy: history.user,
                changedAt: history.created_at,
                reason: history.reason,
                commment: comment
            })
        }, function (err, output) {
            if (err) {
                Logger.error(err);
                return callback(err, null);
            }
            return callback(null, output);
        });
    });
};

var plugin = function lastModifiedPlugin(schema, options) {

    schema.pre("save", function (next) {
        var self = this;
        if(self.isNew) {

            if(!self.constructor.modelName){
                // Don't write history record when the modelName is unknown. This happens for example when using Mongoose insertMany.
                next();
            }

            var history = new History({
                collectionName: self.constructor.modelName,
                collectionId: self._id,
                diff: self,
                user: self.__user,
                reason: self.__reason,
                version: 0
            });
            saveHistoryObject(history, next);
        }else{
            self.constructor.findOne({_id: self._id}, function (err, original) {
                saveDiffObject(self, original, self, self.__user, self.__reason, function(){
                    next();
                });
            });
        }
    });

    schema.pre("findOneAndUpdate", function (next) {
        saveDiffs(this, next);
    });

    schema.pre("update", function (next) {
        saveDiffs(this, next);
    });

    schema.pre("remove", function(next) {
        saveDiffObject(this, this, {}, this.__user, this.__reason, function(){
            next();
        })
    });
};

module.exports.plugin = plugin;
module.exports.getHistories = getHistories;
module.exports.getVersion = getVersion;
