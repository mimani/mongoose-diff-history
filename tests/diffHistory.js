const Promise = require('bluebird');
const expect = require('chai').expect;

const mongoose = require('mongoose');
const diffPatch = require('jsondiffpatch').create();

const diffHistory = require('../diffHistory');
const History = require('../diffHistoryModel').model;
const semver = require('semver');
mongoose.Promise = Promise;

const mongoVersion = parseInt(mongoose.version);
// const testTransaction = false; /* disable as most people don't have cluster */
let session = null;
console.log(`mongoVersion:${mongoose.version}`);
if (mongoVersion < 5) {
    mongoose.connect('mongodb://localhost:27017/tekpub_test', {
        useMongoClient: true
    });
} else {
    /*
     *  to test transaction need a mongoDBv4, and start with cluster, see below link.
     *  http://thecodebarbarian.com/introducing-run-rs-zero-config-mongodb-runner.html
     *  and remember to stop your original non cluster mongoDB
     *  also need to use mongoose version 5.2.9 or later
     */
    // const uri = (testTransaction) ? 'mongodb://localhost:27017,localhost:27018,localhost:27019/tekpub_test?replicaSet=rs' : 'mongodb://localhost:27017/tekpub_test';
    const uri = 'mongodb://localhost:27017/tekpub_test';
    const uriRS =
        'mongodb://localhost:27017,localhost:27018,localhost:27019/tekpub_test?replicaSet=rs';
    mongoose
        .connect(uriRS, { useNewUrlParser: true })
        .then(() => {
            console.log('MongoDB connected');
            mongoose.connection.db
                .admin()
                .serverInfo()
                .then(serverInfo => {
                    const dbVersion = serverInfo.version;
                    if (semver.gte(dbVersion, '4.0.0')) {
                        mongoose
                            .startSession()
                            .then(_session => {
                                try {
                                    _session.startTransaction();
                                    _session.abortTransaction();
                                    session = _session;
                                    console.log('session supported');
                                } catch (e) {
                                    console.log(`session not supported ${e}`);
                                }
                            })
                            .catch(e => {
                                console.log(`session not supported ${e}`);
                                session = null;
                            });
                    } else {
                        console.log(
                            'MongoDB version < 4.0.0 transaction not supported.'
                        );
                    }
                });
        })
        .catch(e => {
            console.warn(
                `Unable to connect in replca mode - falling back normal - ${e}`
            );
            mongoose
                .connect(uri, { useNewUrlParser: true })
                .then(() => {
                    console.log('MongoDB connected');
                })
                .catch(e1 => {
                    console.error(
                        'mongoose-diff-history connection error:',
                        e1
                    );
                });
        });
}

const sampleSchema1 = new mongoose.Schema({
    abc: { type: Date, default: Date.now() },
    def: String,
    ghi: Number,
    ignored: String
});
sampleSchema1.plugin(diffHistory.plugin, { omit: ['ignored'] });
const Sample1 = mongoose.model('samples', sampleSchema1);

const sampleSchemaWithArray = new mongoose.Schema({
    info: String,
    items: [],
    things: []
});

sampleSchemaWithArray.plugin(diffHistory.plugin);
const SampleArray = mongoose.model('samplesArray', sampleSchemaWithArray);

const pickSchema = new mongoose.Schema({
    def: String,
    ghi: Number,
    pickOnly: String
});
pickSchema.plugin(diffHistory.plugin, { pick: ['pickOnly'] });

const PickSchema = mongoose.model('picks', pickSchema);

const mandatorySchema = new mongoose.Schema({
    __user: String,
    __reason: String,
    someNumber: Number,
    someString: String
});
mandatorySchema.plugin(diffHistory.plugin, { required: ['user', 'reason'] });

const MandatorySchema = mongoose.model('mandatories', mandatorySchema);


const schemaWithTimestamps = new mongoose.Schema(
    {
      def: String
    },
    { timestamps: true }
  );
schemaWithTimestamps.plugin(diffHistory.plugin);
const TimestampsSchema = mongoose.model('timestamps', schemaWithTimestamps);

describe('diffHistory', function () {
    afterEach(function (done) {
        Promise.all([
            mongoose.connection.collections['samples'].remove({}),
            mongoose.connection.collections['picks'].remove({}),
            mongoose.connection.collections['samplesarrays'].remove({}),
            mongoose.connection.collections['histories'].remove({}),
            mongoose.connection.collections['mandatories'].remove({}),
            mongoose.connection.collections['timestamps'].remove({})
        ])
            .then(() => done())
            .catch(done);
    });

    describe('plugin: getVersion', function () {
        let sample1, sampleV1, sampleV2, sampleV3, sampleV4;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1
                .save()
                .then(sample => {
                    sampleV1 = sample.toObject();
                    sample.def = 'laer';
                    sample.__user = 'Mimani';
                    sample.__reason = 'to test it';
                    return sample.save();
                })
                .then(sample => {
                    sampleV2 = sample.toObject();
                    sample.ghi = 10;
                    return sample.save();
                })
                .then(sample => {
                    sampleV3 = sample.toObject();
                    sample.ghi = 100;
                    return sample.save();
                })
                .then(sample => {
                    sampleV4 = sample.toObject();
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 0', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 0, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample).to.deep.equal(sampleV1);
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 1', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 1, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample).to.deep.equal(sampleV2);
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 2', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 2, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample).to.deep.equal(sampleV3);
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 3', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 3, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample).to.deep.equal(sampleV4);
                    done();
                })
                .catch(done);
        });

        //TODO: this is test case when version is greater than created in DB, as of now returning the latest object for this case
        it('should return correct version for version 4', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 3, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample).to.deep.equal(sampleV4);
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 0 using callback', function (done) {
            diffHistory.getVersion(
                Sample1,
                sample1._id,
                0,
                (err, oldSample) => {
                    expect(err).to.be.null;
                    expect(oldSample).to.be.an('object');
                    expect(oldSample.toObject()).to.deep.equal(sampleV1);
                    done();
                }
            );
        });

        it('should return correct version for version 0 using callback and opts', function (done) {
            diffHistory.getVersion(
                Sample1,
                sample1._id,
                0,
                { lean: true },
                (err, oldSample) => {
                    expect(err).to.be.null;
                    expect(oldSample).to.be.an('object');
                    expect(oldSample).to.deep.equal(sampleV1);
                    done();
                }
            );
        });

        it('should return an error when calling without id', function (done) {
            diffHistory.getVersion(Sample1, '', 0, (err, oldSample) => {
                expect(oldSample).to.be.null;
                expect(err).to.be.an('object');
                expect(err.name).to.equal('CastError');
                expect(err.path).to.equal('_id');
                done();
            });
        });
    });

    describe('opt: omit', function () {
        let sample1, sampleV0, sampleV1, sampleV2;
        const ignoredFinal = 'i2';
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 't0', ignored: 'i0' });
            sample1
                .save()
                .then(sample => {
                    sampleV0 = sample.toObject();
                    sample.def = 't1';
                    sample.ignored = 'i1';
                    return sample.save();
                })
                .then(sample => {
                    sampleV1 = sample.toObject();
                    sample.def = 't2';
                    sample.ignored = ignoredFinal;
                    return sample.save();
                })
                .then(sample => {
                    sampleV2 = sample.toObject();
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 0, with unchanged omission', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 0, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample.def).to.equal(sampleV0.def);
                    expect(oldSample.ignored).to.equal(ignoredFinal);
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 1, with unchanged omission', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 1, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample.def).to.equal(sampleV1.def);
                    expect(oldSample.ignored).to.equal(ignoredFinal);
                    done();
                })
                .catch(done);
        });

        it('should return correct version for version 2, with unchanged omission', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 2, { lean: true })
                .then(oldSample => {
                    expect(oldSample).to.be.an('object');
                    expect(oldSample.def).to.equal(sampleV2.def);
                    expect(oldSample.ignored).to.equal(ignoredFinal);
                    done();
                })
                .catch(done);
        });
    });

    describe('opt: pick', function () {
        beforeEach(function (done) {
            let pickSample;
            pickSample = new PickSchema({
                def: 't0',
                ghi: 55,
                pickOnly: 'original'
            });
            pickSample
                .save()
                .then(pickCollection => {
                    pickCollection.__user = 'Gibran';
                    pickCollection.__reason = 'TestingPickOnly';
                    pickCollection.def = 'tryingToChangeThisWithNoHistoryForIt';
                    pickCollection.ghi = 21223;
                    pickCollection.pickOnly = 'changeThisOneOnly';
                    return pickCollection.save();
                })
                .then(() => done())
                .catch(done);
        });

        it('should only create stories with the picked field', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.pickOnly[0]).equal('original');
                expect(histories[0].diff.pickOnly[1]).equal(
                    'changeThisOneOnly'
                );
                expect(histories[0].diff).to.not.contain.key('ghi');
                expect(histories[0].diff).to.not.contain.key('def');
                done();
            });
        });
    });

    describe('plugin: pre save', function () {
        let sample1, firstSample;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1.__user = 'Frank';
            sample1.__reason = 'to create it';
            sample1
                .save()
                .then(sample => {
                    firstSample = sample.toObject();
                    sample.def = 'laer';
                    sample.__user = 'Mimani';
                    sample.__reason = 'to test it';
                    return sample.save();
                })
                .then(() => done())
                .catch(done);
        });

        it('should create a diff object when collection is saved', function (done) {
            History.find({ collectionId: sample1._id }, function (
                err,
                histories
            ) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.def[0]).equal('ipsum');
                expect(histories[0].diff.def[1]).equal('laer');
                expect(histories[0].user).equal('Mimani');
                expect(histories[0].reason).equal('to test it');
                expect(histories[0].createdAt).not.null;
                expect(histories[0].createdAt).not.undefined;
                expect(histories[0].updatedAt).not.null;
                expect(histories[0].updatedAt).not.undefined;
                expect(histories[0].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it('should return histories', function (done) {
            diffHistory
                .getHistories(Sample1.modelName, sample1._id, [])
                .then(historyAudits => {
                    expect(historyAudits.length).equal(1);
                    expect(historyAudits[0].comment).equal('modified def');
                    done();
                })
                .catch(done);
        });

        it('should return histories using callback', function (done) {
            diffHistory.getHistories(
                Sample1.modelName,
                sample1._id,
                [],
                (err, historyAudits) => {
                    expect(err).to.be.null;
                    expect(historyAudits.length).equal(1);
                    expect(historyAudits[0].comment).equal('modified def');
                    done();
                }
            );
        });

        it('should throw an error if trying to get histories without an id', function (done) {
            diffHistory.getHistories(
                Sample1.modelName,
                '',
                [],
                (err, historyAudits) => {
                    expect(historyAudits).to.be.null;
                    expect(err).to.be.an('object');
                    expect(err.name).to.equal('CastError');
                    expect(err.path).to.equal('collectionId');
                    done();
                }
            );
        });
    });

    describe('plugin: pre update', function () {
        let sample1, sample2;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1
                .save()
                .then(() => {
                    sample2 = new Sample1({ def: 'lorum', ghi: 456 });
                    return sample2.save();
                })
                .then(() =>
                    Sample1.update(
                        {},
                        { ghi: 1212 },
                        {
                            multi: true,
                            __user: 'Mimani',
                            __reason: 'Mimani updated'
                        }
                    )
                )
                .then(() => done())
                .catch(done);
        });

        it('should create a diff object when collections are updated via update', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(2);
                expect(histories[0].diff.ghi[0]).equal(123);
                expect(histories[0].diff.ghi[1]).equal(1212);
                expect(histories[0].user).equal('Mimani');
                expect(histories[0].reason).equal('Mimani updated');
                expect(histories[0].collectionName).equal(Sample1.modelName);
                expect(histories[1].diff.ghi[0]).equal(456);
                expect(histories[1].diff.ghi[1]).equal(1212);
                expect(histories[1].user).equal('Mimani');
                expect(histories[1].reason).equal('Mimani updated');
                expect(histories[1].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it('should return histories', function (done) {
            diffHistory
                .getHistories(Sample1.modelName, sample1._id, ['ghi'])
                .then(historyAudits => {
                    expect(historyAudits.length).equal(1);
                    expect(historyAudits[0].comment).equal(
                        'modified ghi from 123 to 1212'
                    );
                    done();
                })
                .catch(done);
        });
    });

    describe('plugin: preUpdate using $push for arrays', function () {
        let sampleArr;
        beforeEach(function (done) {
            sampleArr = new SampleArray({
                items: [{ type: 'one' }, { type: 'two' }],
                things: [{ number: 'one' }, { number: 'two' }]
            });
            sampleArr
                .save()
                .then(() =>
                    SampleArray.update(
                        { _id: sampleArr._id },
                        {
                            $push: {
                                items: { type: 'three' },
                                things: { number: 'three' }
                            },
                            $set: { info: 'something' }
                        },
                        {
                            multi: true,
                            __user: 'Gibran',
                            __reason: 'TestingPushArray'
                        }
                    )
                )
                .then(() => done())
                .catch(done);
        });

        it('should create a diff object when collections are updated via update', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.items['2'][0].type).equal('three');
                expect(histories[0].diff.things['2'][0].number).equal('three');
                expect(histories[0].diff.info[0]).equal('something');
                expect(histories[0].diff.items._t).equal('a');
                expect(histories[0].diff.things._t).equal('a');
                expect(histories[0].user).equal('Gibran');
                expect(histories[0].reason).equal('TestingPushArray');
                expect(histories[0].collectionName).equal(
                    SampleArray.modelName
                );
                done();
            });
        });

        it('should update the array correctly', function (done) {
            SampleArray.find({}, function (err, arrayCollections) {
                expect(err).to.null;
                expect(arrayCollections[0].items[0].type).equal('one');
                expect(arrayCollections[0].items[1].type).equal('two');
                expect(arrayCollections[0].items[2].type).equal('three');
                expect(arrayCollections[0].things[0].number).equal('one');
                expect(arrayCollections[0].things[1].number).equal('two');
                expect(arrayCollections[0].things[2].number).equal('three');
                done();
            });
        });
    });

    describe('plugin: pre findOneAndUpdate', function () {
        let sample1;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1
                .save()
                .then(() =>
                    Sample1.findOneAndUpdate(
                        { def: 'ipsum' },
                        { $set: { ghi: 323, def: 'hey  hye' } },
                        {
                            __user: 'Mimani',
                            __reason: 'Mimani updated this also',
                            upsert: true
                        }
                    )
                )
                .then(() => done())
                .catch(done);
        });

        it('should create a diff object when collections are updated via update (with upsert option)', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.ghi[0]).equal(123);
                expect(histories[0].diff.ghi[1]).equal(323);
                expect(histories[0].diff.def[0]).equal('ipsum');
                expect(histories[0].diff.def[1]).equal('hey  hye');
                expect(histories[0].reason).equal('Mimani updated this also');
                expect(histories[0].collectionName).equal(Sample1.modelName);
                expect(histories[0].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it('should return histories', function (done) {
            diffHistory
                .getHistories(Sample1.modelName, sample1._id, ['ghi'])
                .then(historyAudits => {
                    expect(historyAudits.length).equal(1);
                    expect(historyAudits[0].comment).equal(
                        'modified def, ghi from 123 to 323'
                    );
                    done();
                })
                .catch(done);
        });

        it('should not override lean option in original query', function (done) {
            Sample1.findOneAndUpdate(
                { def: 'hey  hye' },
                { ghi: 1234 },
                { lean: true }
            ).then(updatedObj => {
                expect(updatedObj).not.to.instanceOf(Sample1);
                done();
            }).catch(done);
        });

        it("should not fail if timestamps enabled", function (done) {
          const timestampModel = new TimestampsSchema({ def: "hello" });
          timestampModel.save().then(() =>
            TimestampsSchema.findOneAndUpdate(
              { def: "hello" },
              { def: "update hello" }
            )
              .then(() => done())
              .catch((e) => {
                done(e);
              })
          );
        });
    });

    describe('plugin: pre updateOne', function () {
        let sample1;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1
                .save()
                .then(() =>
                    Sample1.updateOne(
                        { def: 'ipsum' },
                        { ghi: 323, def: 'hey  hye' },
                        {
                            __user: 'Marcel',
                            __reason: 'Marcel updated using updateOne'
                        }
                    )
                )
                .then(() => done())
                .catch(done);
        });

        it('should create a diff object when collections are updated via updateOne', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.ghi[0]).equal(123);
                expect(histories[0].diff.ghi[1]).equal(323);
                expect(histories[0].diff.def[0]).equal('ipsum');
                expect(histories[0].diff.def[1]).equal('hey  hye');
                expect(histories[0].reason).equal(
                    'Marcel updated using updateOne'
                );
                expect(histories[0].collectionName).equal(Sample1.modelName);
                expect(histories[0].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it('should return histories', function (done) {
            diffHistory
                .getHistories(Sample1.modelName, sample1._id, ['ghi'])
                .then(historyAudits => {
                    expect(historyAudits.length).equal(1);
                    expect(historyAudits[0].comment).equal(
                        'modified def, ghi from 123 to 323'
                    );
                    done();
                })
                .catch(done);
        });
    });

    describe('plugin: post remove', function () {
        let sample1, sample2;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1
                .save()
                .then(() =>
                    Sample1.findOneAndUpdate(
                        { def: 'ipsum' },
                        { ghi: 323, def: 'hey  hye' },
                        {
                            __user: 'Mimani',
                            __reason: 'Mimani updated this also',
                            new: true
                        }
                    )
                )
                .then(updated => {
                    sample2 = JSON.parse(JSON.stringify(updated));
                    updated.__user = { name: 'Peter', role: 'developer' };
                    updated.__reason = 'As this was requested';
                    return updated.remove();
                })
                .then(() => done())
                .catch(done);
        });

        it('should create a diff object when collections are updated via update', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(2);
                expect(histories[0].diff.ghi[0]).equal(123);
                expect(histories[0].diff.ghi[1]).equal(323);
                expect(histories[0].diff.def[0]).equal('ipsum');
                expect(histories[0].diff.def[1]).equal('hey  hye');
                expect(histories[0].reason).equal('Mimani updated this also');
                expect(histories[0].collectionName).equal(Sample1.modelName);
                expect(histories[0].collectionName).equal(Sample1.modelName);
                expect(histories[1].diff).deep.equal(
                    diffPatch.diff(sample2, {})
                );
                expect(histories[1].reason).equal('As this was requested');
                expect(histories[1].user).deep.equal({
                    name: 'Peter',
                    role: 'developer'
                });
                expect(histories[1].collectionName).equal(Sample1.modelName);
                expect(histories[1].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it('should return simple diffs', function (done) {
            diffHistory
                .getDiffs(Sample1.modelName, sample1._id)
                .then(diffs => {
                    expect(diffs.length).to.equal(2);
                    expect(diffs[0]).to.be.an('object');
                    expect(diffs[0].diff).to.be.an('object');
                    expect(diffs[0].diff.def).to.be.an('array');
                    expect(diffs[0].diff.def.length).to.equal(2);
                    expect(diffs[0].diff.def[0]).to.equal('ipsum');
                    expect(diffs[0].diff.def[1]).to.equal('hey  hye');
                    expect(diffs[0].collectionName).to.equal('samples');
                    done();
                })
                .catch(done);
        });

        it('should return simple diffs with opts', function (done) {
            diffHistory
                .getDiffs(Sample1.modelName, sample1._id, {
                    select: 'diff user'
                })
                .then(diffs => {
                    expect(diffs.length).to.equal(2);
                    expect(diffs[0]).to.be.an('object');
                    expect(diffs[0].diff).to.be.an('object');
                    expect(diffs[0].diff.def).to.be.an('array');
                    expect(diffs[0].diff.def.length).to.equal(2);
                    expect(diffs[0].diff.def[0]).to.equal('ipsum');
                    expect(diffs[0].diff.def[1]).to.equal('hey  hye');
                    expect(diffs[0].collectionName).to.be.an('undefined');
                    done();
                })
                .catch(done);
        });

        it('should return simple diffs with callback and opts', function (done) {
            diffHistory.getDiffs(
                Sample1.modelName,
                sample1._id,
                { select: 'diff user' },
                (err, diffs) => {
                    expect(err).to.be.null;
                    expect(diffs.length).to.equal(2);
                    expect(diffs[0]).to.be.an('object');
                    expect(diffs[0].diff).to.be.an('object');
                    expect(diffs[0].diff.def).to.be.an('array');
                    expect(diffs[0].diff.def.length).to.equal(2);
                    expect(diffs[0].diff.def[0]).to.equal('ipsum');
                    expect(diffs[0].diff.def[1]).to.equal('hey  hye');
                    expect(diffs[0].collectionName).to.be.an('undefined');
                    done();
                }
            );
        });

        it('should return simple diffs with callback and no opts', function (done) {
            diffHistory.getDiffs(
                Sample1.modelName,
                sample1._id,
                (err, diffs) => {
                    expect(err).to.be.null;
                    expect(diffs.length).to.equal(2);
                    expect(diffs[0]).to.be.an('object');
                    expect(diffs[0].diff).to.be.an('object');
                    expect(diffs[0].diff.def).to.be.an('array');
                    expect(diffs[0].diff.def.length).to.equal(2);
                    expect(diffs[0].diff.def[0]).to.equal('ipsum');
                    expect(diffs[0].diff.def[1]).to.equal('hey  hye');
                    expect(diffs[0].collectionName).to.be.equal('samples');
                    done();
                }
            );
        });

        it('should return histories', function (done) {
            diffHistory
                .getHistories(Sample1.modelName, sample1._id, ['ghi'])
                .then(historyAudits => {
                    expect(historyAudits.length).equal(2);
                    expect(historyAudits[0].comment).equal(
                        'modified def, ghi from 123 to 323'
                    );
                    expect(historyAudits[1].comment).to.contain(
                        'ghi from 323 to 0'
                    );
                    expect(historyAudits[1].comment).to.contain('abc');
                    expect(historyAudits[1].comment).to.contain('def');
                    expect(historyAudits[1].changedAt).not.null;
                    expect(historyAudits[1].updatedAt).not.null;
                    done();
                })
                .catch(done);
        });

        it('should return histories without expandableFields', function (done) {
            diffHistory
                .getHistories(Sample1.modelName, sample1._id)
                .then(historyAudits => {
                    expect(historyAudits.length).equal(2);
                    expect(historyAudits[0].comment).equal('modified ghi, def');
                    /*
                        it seems the sequence for v4 mongoose and v5 mongoose is different
                        -modified abc, _id, def, ghi, __v
                        +modified abc, __v, ghi, def, _id
                    */
                    if (mongoVersion < 5) {
                        expect(historyAudits[1].comment).to.equal(
                            'modified abc, __v, ghi, def, _id'
                        );
                    } else {
                        expect(historyAudits[1].comment).to.equal(
                            'modified abc, _id, def, ghi, __v'
                        );
                    }
                    expect(historyAudits[1].changedAt).not.null;
                    expect(historyAudits[1].updatedAt).not.null;
                    done();
                })
                .catch(done);
        });

        it('should return histories without expandableFields and with callback', function (done) {
            diffHistory.getHistories(
                Sample1.modelName,
                sample1._id,
                (err, historyAudits) => {
                    expect(err).to.be.null;
                    expect(historyAudits.length).equal(2);
                    expect(historyAudits[0].comment).equal('modified ghi, def');
                    /*
                    it seems the sequence for v4 mongoose and v5 mongoose is different
                    -modified abc, _id, def, ghi, __v
                    +modified abc, __v, ghi, def, _id
                */
                    if (mongoVersion < 5) {
                        expect(historyAudits[1].comment).to.equal(
                            'modified abc, __v, ghi, def, _id'
                        );
                    } else {
                        expect(historyAudits[1].comment).to.equal(
                            'modified abc, _id, def, ghi, __v'
                        );
                    }
                    expect(historyAudits[1].changedAt).not.null;
                    expect(historyAudits[1].updatedAt).not.null;
                    done();
                }
            );
        });

        it('should get version after object is removed', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 1)
                .then(oldObject => {
                    expect(sample2).deep.equal(oldObject);
                    done();
                })
                .catch(done);
        });

        it('should get latest version after object is removed', function (done) {
            diffHistory
                .getVersion(Sample1, sample1._id, 2, { lean: true })
                .then(oldObject => {
                    expect({}).deep.equal(oldObject);
                    done();
                })
                .catch(done);
        });
    });

    describe('plugin: Bug: Wrong version', function () {
        let sample1, sample2;
        beforeEach(function (done) {
            sample1 = new Sample1({ def: 'ipsum', ghi: 123 });
            sample1
                .save()
                .then(() =>
                    Sample1.findOneAndUpdate(
                        { def: 'ipsum' },
                        { ghi: 323, def: 'hey  hye' },
                        {
                            __user: 'Mimani',
                            __reason: 'Mimani updated this also'
                        }
                    )
                )
                .then(() =>
                    Sample1.findOneAndUpdate(
                        { def: 'hey  hye' },
                        { ghi: 1212, def: 'hey  hye' },
                        {
                            __user: 'Mimani',
                            __reason: 'Mimani updated this also'
                        }
                    )
                )
                .then(() => {
                    sample2 = new Sample1({ def: 'lorum', ghi: 345 });
                    return sample2.save();
                })
                .then(() =>
                    Sample1.findOneAndUpdate(
                        { def: 'lorum' },
                        { ghi: 1919 },
                        {
                            __user: 'Mimani',
                            __reason: 'Mimani updated this also'
                        }
                    )
                )
                .then(() => done())
                .catch(done);
        });

        it('should assign correct version to diff history', function (done) {
            History.findOne({ collectionId: sample2._id }, function (
                err,
                history
            ) {
                expect(err).to.null;
                expect(history.version).equal(0);
                done();
            });
        });
    });

    describe('opt: requiredCheck', function () {
        beforeEach(function (done) {
            let mandatorySample;
            mandatorySample = new MandatorySchema({
                someNumber: 55,
                someString: 'string'
            });
            mandatorySample
                .save()
                .then(mandatoryCollection => {
                    mandatoryCollection.someString = 'ThisWillNotWork';
                    mandatoryCollection.someNumber = 99932;
                    return mandatoryCollection.save();
                })
                .then(() => done())
                .catch(done);
        });

        it('it should not create histories', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(0);
                done();
            });
        });
    });

    describe('opt: requiredValid fields', function () {
        beforeEach(function (done) {
            let mandatorySample;
            mandatorySample = new MandatorySchema({
                someNumber: 55,
                someString: 'string'
            });
            mandatorySample
                .save()
                .then(mandatoryCollection => {
                    mandatoryCollection.someString = 'ThisUpdateIsValid';
                    mandatoryCollection.__user = 'Gibran';
                    mandatoryCollection.__reason = 'TestingRequired';
                    return mandatoryCollection.save();
                })
                .then(() => done())
                .catch(done);
        });

        it('it should create histories', function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.someString[0]).equal('string');
                expect(histories[0].diff.someString[1]).equal(
                    'ThisUpdateIsValid'
                );
                expect(histories[0].user).equal('Gibran');
                expect(histories[0].reason).equal('TestingRequired');
                done();
            });
        });
    });

    /* transaction test should be at the bottom of the script so that have time for the session check*/
    describe('transaction', function () {
        before(function () {
            // check if session is available, if not skip all test.
            if (!session) {
                this.skip();
            }
        });
        afterEach(function (done) {
            Promise.all([mongoose.connection.collections['samples'].remove({})])
                .then(() => done())
                .catch(done);
        });
        describe('abort transaction with __session pass to history', function () {
            beforeEach(function (done) {
                session.startTransaction();
                Sample1.create([{ def: 'Test1', ghi: 1 }], { session: session })
                    .then(() =>
                        Sample1.create([{ def: 'Test2', ghi: 2 }], {
                            session: session
                        })
                    )
                    .then(() =>
                        Sample1.findOneAndUpdate(
                            { def: 'Test1' },
                            { $set: { ghi: 3 } },
                            {
                                __user: 'Mimani',
                                __reason: 'Mimani updated this also',
                                session: session,
                                __session: session
                            }
                        )
                    )
                    .then(() => session.abortTransaction())
                    .then(() => done())
                    .catch(done);
            });
            it('it should rollback all document with abortTransaction', function (done) {
                Sample1.find({}, function (err, doc) {
                    expect(err).to.null;
                    expect(doc.length).equal(0);
                    done();
                });
            });
            it('it should rollback histories with abortTransaction', function (done) {
                History.find({}, function (err, histories) {
                    expect(err).to.null;
                    expect(histories.length).equal(0);
                    done();
                });
            });
        });

        describe('test abort transaction without __session pass to history', function () {
            beforeEach(function (done) {
                session.startTransaction();
                Sample1.create([{ def: 'Test1', ghi: 1 }], { session: session })
                    .then(() =>
                        Sample1.create([{ def: 'Test2', ghi: 2 }], {
                            session: session
                        })
                    )
                    .then(() =>
                        Sample1.findOneAndUpdate(
                            { def: 'Test1' },
                            { $set: { ghi: 3 } },
                            {
                                __user: 'Mimani',
                                __reason: 'Mimani updated this also',
                                session: session /*, __session: session */
                            }
                        )
                    )
                    .then(() => session.abortTransaction())
                    .then(() => done())
                    .catch(done);
            });
            it('it should rollback all document with abortTransaction', function (done) {
                Sample1.find({}, function (err, doc) {
                    expect(err).to.null;
                    expect(doc.length).equal(0);
                    done();
                });
            });
            it('it should create histories even with abortTransaction called since no __session pass to history', function (done) {
                History.find({}, function (err, histories) {
                    expect(err).to.null;
                    expect(histories.length).equal(1);
                    expect(histories[0].diff.ghi[0]).equal(1);
                    expect(histories[0].diff.ghi[1]).equal(3);
                    expect(histories[0].reason).equal(
                        'Mimani updated this also'
                    );
                    expect(histories[0].collectionName).equal(
                        Sample1.modelName
                    );
                    expect(histories[0].collectionName).equal(
                        Sample1.modelName
                    );
                    done();
                });
            });
        });

        describe('test commit transaction with __session pass to history', function () {
            beforeEach(function (done) {
                session.startTransaction();
                Sample1.create([{ def: 'Test1', ghi: 1 }], { session: session })
                    .then(() =>
                        Sample1.create([{ def: 'Test2', ghi: 2 }], {
                            session: session
                        })
                    )
                    .then(() =>
                        Sample1.findOneAndUpdate(
                            { def: 'Test1' },
                            { $set: { ghi: 3 } },
                            {
                                __user: 'Mimani',
                                __reason: 'Mimani updated this also',
                                session: session,
                                __session: session
                            }
                        )
                    )
                    .then(() => session.commitTransaction())
                    .then(() => done())
                    .catch(done);
            });
            it('it should create document with commitTransaction', function (done) {
                Sample1.find({}, function (err, doc) {
                    expect(err).to.null;
                    expect(doc.length).equal(2);
                    done();
                });
            });
            it('it should create histories with commitTransaction', function (done) {
                History.find({}, function (err, histories) {
                    expect(err).to.null;
                    expect(histories.length).equal(1);
                    expect(histories[0].diff.ghi[0]).equal(1);
                    expect(histories[0].diff.ghi[1]).equal(3);
                    expect(histories[0].reason).equal(
                        'Mimani updated this also'
                    );
                    expect(histories[0].collectionName).equal(
                        Sample1.modelName
                    );
                    expect(histories[0].collectionName).equal(
                        Sample1.modelName
                    );
                    done();
                });
            });
        });
    });
});

describe('diffHistory Error', function () {
    it('should throw an error when given an omit option not string or array', function () {
        const errSchema = new mongoose.Schema({ a: String });
        expect(() =>
            errSchema.plugin(diffHistory.plugin, { omit: true })
        ).to.throw(
            TypeError,
            "opts.omit expects string or array, instead got 'boolean'"
        );
    });
});

describe('diffHistory URI Option', function () {
    it('should connect to DB at optional URI', function () {
        const testSchema = new mongoose.Schema({ a: String });
        testSchema.plugin(diffHistory.plugin, {
            uri: 'mongodb://localhost/customUri'
        });
        expect(mongoose.connections).to.be.an('array');
        expect(mongoose.connections.length).to.equal(1);
        expect(mongoose.connections[0].name).to.equal('customUri');
    });
});
