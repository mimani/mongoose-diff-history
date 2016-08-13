var History = require('./diffHistoryModel');
var async = require('async');

var plugin = function lastModifiedPlugin(schema, options) {
    var jsondiffpatch = require('./node_modules/jsondiffpatch/src/main').create();
    //var jsondiffpatch = require('DiffPatcher').create();

    schema.pre('save', function (next) {
        var self = this;
        if(self.isNew) {next();return;}
        self.constructor.findOne({_id: self._id}, function (err, launch) {
            var diff = jsondiffpatch.diff(JSON.parse(JSON.stringify(launch)), JSON.parse(JSON.stringify(self)));
            if (diff) {
                var history = new History({
                    collectionName: self.constructor.modelName,
                    collectionId: self._id,
                    diff: diff,
                    user: self.__user,
                    reason: self.__reason,
                });
                history.save(function(err){
                    if(err)
                    {
                        console.log("Error in saving history: ", err)
                    }
                    next();
                });
            }
            else{
                next()
            }
        });
    });

};

var getHistories = function (modelName, id, exapndableFields, callback) {
    History.find({collectionName: modelName, collectionId: id}, function (err, historys) {
        if (err) {
            console.error(err);
            return callback(err, null);
        }
        async.map(historys, function (history, mapCallback) {
            var changedValues = [];
            var changedFields = [];
            for (var key in history.diff) {
                if (history.diff.hasOwnProperty(key)) {

                    if (exapndableFields.indexOf(key) > -1) {
                        oldDate = new Date(history.diff[key][0])
                        newDate = new Date(history.diff[key][1])
                        if (oldDate != 'Invalid Date' && newDate != 'Invalid Date') {
                            oldValue = oldDate.getFullYear() + '-' + (oldDate.getMonth() + 1) + '-' + oldDate.getDate();
                            newValue = newDate.getFullYear() + '-' + (newDate.getMonth() + 1) + '-' + newDate.getDate();

                        }
                        else {
                            oldValue = history.diff[key][0];
                            newValue = history.diff[key][1];
                        }
                        changedValues.push(key + " from " + oldValue + " to " + newValue);
                    }
                    else {
                        changedFields.push(key);
                    }
                }
            }
            var comment = 'modified ' + changedFields.concat(changedValues).join(', ');
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

module.exports.plugin = plugin;
module.exports.getHistories = getHistories;