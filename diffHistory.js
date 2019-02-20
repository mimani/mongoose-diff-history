const omit = require('omit-deep');
const pick = require('lodash.pick');
const mongoose = require('mongoose');
const {assign} = require("power-assign");
const empty =  require("deep-empty-object");

// try to find an id property, otherwise just use the index in the array
const objectHash = (obj, idx) => obj._id || obj.id || `$$index: ${idx}`;
const diffPatcher = require('jsondiffpatch').create({ objectHash });

const History = require('./diffHistoryModel').model;

const isValidCb = cb => {
    return cb && typeof cb === 'function';
};

function saveDiffObject(currentObject, original, updated, opts, queryObject) {
    const { __user: user, __reason: reason } = queryObject && queryObject.options || currentObject;

    let diff = diffPatcher.diff(
        JSON.parse(JSON.stringify(original)),
        JSON.parse(JSON.stringify(updated))
    );

    if (opts.omit) {
        omit(diff, opts.omit, {cleanEmpty: true});
    }

    if (opts.pick){
        diff = pick(diff, opts.pick);
    }

    if (!diff || !Object.keys(diff).length || empty.all(diff)) {
      return;
    }

    const collectionId = currentObject._id;
    const collectionName = currentObject.constructor.modelName || queryObject.model.modelName;

    return History.findOne({ collectionId, collectionName })
        .sort('-version')
        .then(lastHistory => {
            const history = new History({
                collectionId,
                collectionName,
                diff,
                user,
                reason,
                version: lastHistory ? lastHistory.version + 1 : 0
            });
            return history.save();
        });
};

const saveDiffHistory = (queryObject, currentObject, opts) => {
  const update = JSON.parse(JSON.stringify(queryObject._update));
  /* eslint-disable security/detect-object-injection */
  const updateParams = Object.assign(...Object.keys(update).map(function(key) {
    if(typeof update[key] === "object") {
      return update[key];
    }
    return update;
  }));
  /* eslint-enable security/detect-object-injection */
  const dbObject = pick(currentObject, Object.keys(updateParams));
  return saveDiffObject(
    currentObject,
    dbObject,
    assign(dbObject, queryObject._update),
    opts,
    queryObject
  );
};

const saveDiffs = (queryObject, opts) =>
    queryObject
        .find(queryObject._conditions)
        .lean(false)
        .cursor()
        .eachAsync(result => saveDiffHistory(queryObject, result, opts));

const getVersion = (model, id, version, queryOpts, cb) => {
    if (typeof queryOpts === 'function') {
        cb = queryOpts;
        queryOpts = undefined;
    }

    return model
        .findById(id, null, queryOpts)
        .then(latest => {
            latest = latest || {};
            return History.find(
                {
                    collectionName: model.modelName,
                    collectionId: id,
                    version: { $gte: parseInt(version, 10) }
                },
                { diff: 1, version: 1 },
                { sort: '-version' }
            )
                .lean()
                .cursor()
                .eachAsync(history => {
                    diffPatcher.unpatch(latest, history.diff);
                })
                .then(() => {
                    if (isValidCb(cb)) return cb(null, latest);
                    return latest;
                });
        })
        .catch(err => {
            if (isValidCb(cb)) return cb(err, null);
            throw err;
        });
};

const getDiffs = (modelName, id, opts, cb) => {
    opts = opts || {};
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    return History.find({ collectionName: modelName, collectionId: id }, null, opts)
        .lean()
        .then(histories => {
            if (isValidCb(cb)) return cb(null, histories);
            return histories;
        })
        .catch(err => {
            if (isValidCb(cb)) return cb(err, null);
            throw err;
        });
};

const getHistories = (modelName, id, expandableFields, cb) => {
    expandableFields = expandableFields || [];
    if (typeof expandableFields === 'function') {
        cb = expandableFields;
        expandableFields = [];
    }

    const histories = [];

    return History.find({ collectionName: modelName, collectionId: id })
        .lean()
        .cursor()
        .eachAsync(history => {
            const changedValues = [];
            const changedFields = [];
            for (const key in history.diff) {
                if (history.diff.hasOwnProperty(key)) {
                    if (expandableFields.indexOf(key) > -1) {
                        const oldValue = history.diff[key][0];
                        const newValue = history.diff[key][1];
                        changedValues.push(key + ' from ' + oldValue + ' to ' + newValue);
                    } else {
                        changedFields.push(key);
                    }
                }
            }
            const comment = 'modified ' + changedFields.concat(changedValues).join(', ');
            histories.push({
                changedBy: history.user,
                changedAt: history.createdAt,
                updatedAt: history.updatedAt,
                reason: history.reason,
                comment: comment
            });
        })
        .then(() => {
            if (isValidCb(cb)) return cb(null, histories);
            return histories;
        })
        .catch(err => {
            if (isValidCb(cb)) return cb(err, null);
            throw err;
        });
};

/**
 * @param {Object} schema - Schema object passed by Mongoose Schema.plugin
 * @param {Object} [opts] - Options passed by Mongoose Schema.plugin
 * @param {string} [opts.uri] - URI for MongoDB (necessary, for instance, when not using mongoose.connect).
 * @param {string|string[]} [opts.omit] - fields to omit from diffs (ex. ['a', 'b.c.d']).
 */
const plugin = function lastModifiedPlugin(schema, opts = {}) {
    if (opts.uri) {
        const mongoVersion = parseInt(mongoose.version);
        if(mongoVersion < 5){
          mongoose.connect(opts.uri, { useMongoClient: true }).catch((e) => {
            console.error('mongoose-diff-history connection error:', e);
          });
        } else {
          mongoose.connect(opts.uri, { useNewUrlParser: true }).catch((e) => {
            console.error('mongoose-diff-history connection error:', e);
          });
        }
    }

    if (opts.omit && !Array.isArray(opts.omit)) {
        if (typeof opts.omit === 'string') {
            opts.omit = [opts.omit];
        } else {
            const errMsg = `opts.omit expects string or array, instead got '${typeof opts.omit}'`;
            throw new TypeError(errMsg);
        }
    }

    schema.pre('save', function (next) {
        if (this.isNew) return next();
        this.constructor
            .findOne({ _id: this._id })
            .then((original) => saveDiffObject(this, original, this.toObject({ depopulate: true }), opts))
            .then(() => next())
            .catch(next);
    });

    schema.pre('findOneAndUpdate', function (next) {
        saveDiffs(this, opts)
            .then(() => next())
            .catch(next);
    });

    schema.pre('update', function (next) {
        saveDiffs(this, opts)
            .then(() => next())
            .catch(next);
    });

    schema.pre('updateOne', function (next) {
        saveDiffs(this, opts)
            .then(() => next())
            .catch(next);
    });

    schema.pre('remove', function (next) {
        saveDiffObject(this, this, {}, opts)
            .then(() => next())
            .catch(next);
    });
};

module.exports = {
    plugin,
    getVersion,
    getDiffs,
    getHistories
};
