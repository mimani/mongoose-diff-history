const omit = require('omit-deep');
const pick = require('lodash.pick');

// try to find an id property, otherwise just use the index in the array
const objectHash = (obj, idx) => obj._id || obj.id || `$$index: ${idx}`;
const diffPatcher = require('jsondiffpatch').create({ objectHash });

const History = require('./diffHistoryModel').model;

const isValidCb = cb => {
    return cb && typeof cb === 'function';
};

const saveDiffObject = (currentObject, original, updated, opts, metaData) => {
    const { __user: user, __reason: reason } = metaData || currentObject;

    const diff = diffPatcher.diff(
        JSON.parse(JSON.stringify(original)),
        JSON.parse(JSON.stringify(updated))
    );

    if (opts.omit) {
        omit(diff, opts.omit);
    }

    if (!diff || !Object.keys(diff).length) return;

    const collectionId = currentObject._id;
    const collectionName = currentObject.constructor.modelName;

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
    const updateParams = queryObject._update['$set'] || queryObject._update;
    const dbObject = pick(currentObject, Object.keys(updateParams));

    return saveDiffObject(currentObject, dbObject, updateParams, opts, queryObject.options);
};

const saveDiffs = (queryObject, opts) =>
    queryObject
        .find(queryObject._conditions)
        .cursor()
        .eachAsync(result => saveDiffHistory(queryObject, result, opts));

const getVersion = (model, id, version, cb) => {
    return model
        .findById(id)
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

const getHistories = (modelName, id, expandableFields, cb) => {
    const histories = [];
    return History.find({ collectionName: modelName, collectionId: id })
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
 * @param {string[]} [opts.omit] - Fields to omit from diffs (ex. ['a', 'b.c.d']).
 */
const plugin = function lastModifiedPlugin(schema, opts = {}) {
    if (opts.omit && !Array.isArray(opts.omit)) {
        delete opts.omit;
    }

    schema.pre('save', function (next) {
        if (this.isNew) return next();
        this.constructor
            .findOne({ _id: this._id })
            .then(original => saveDiffObject(this, original, this, opts))
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

    schema.pre('remove', function (next) {
        saveDiffObject(this, this, {}, opts)
            .then(() => next())
            .catch(next);
    });
};

module.exports = {
    plugin,
    getVersion,
    getHistories
};
