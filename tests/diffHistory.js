var expect = require("chai").expect;
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/tekpub_test');
var diffHistory = require('../diffHistory');
var History = require('../diffHistoryModel');

var sampleSchema1 = new mongoose.Schema(
    {
        abc: {type: Date, default: Date.now()},
        def: {type: String},
        ghi: {type: Number}
    });
sampleSchema1.plugin(diffHistory.plugin);
var Sample1 = mongoose.model('samples', sampleSchema1);

describe("diffHistory", function () {
    beforeEach(function () {
        mongoose.connection.collections['histories'].drop(function (err) {
            if (err) console.log('Error in collection dropped ', err);
            else console.log('collection:histories dropped before test');
        });
        mongoose.connection.collections['samples'].drop(function (err) {
            if (err) console.log('Error in collection dropped ', err);
            else console.log('collection:samples dropped before test');
        });
    });

    describe("plugin: pre save", function () {
        var sample1;
        beforeEach(function (done) {
            sample1 = new Sample1({def: 'ipsum', ghi: 123});
            sample1.save(function (err, sample2) {
                expect(err).to.null;
                sample2.def = "laer";
                sample2.__user = "Mimani";
                sample2.__reason = "to test it";
                sample2.save(function (err, sample3) {
                    expect(err).to.null;
                    done();
                })
            });
        });

        it("should create a diff object when collection is saved", function (done) {
            History.find({"collectionId": sample1._id}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.def[0]).equal('ipsum');
                expect(histories[0].diff.def[1]).equal('laer');
                expect(histories[0].user).equal('Mimani');
                expect(histories[0].reason).equal('to test it');
                expect(histories[0].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it("should return histories", function (done) {
            diffHistory.getHistories(Sample1.modelName, sample1._id, [], function (err, historyAudits) {
                expect(err).to.null;
                expect(historyAudits.length).equal(1);
                expect(historyAudits[0].commment).equal('modified def');
                done();
            })
        });
    });

    describe("plugin: pre update", function () {
        var sample1;
        beforeEach(function (done) {
            sample1 = new Sample1({def: 'ipsum', ghi: 123});
            sample1.save(function (err, sample1) {
                sample2 = new Sample1({def: 'lorum', ghi: 456});
                sample2.save(function (err, sample2) {
                    expect(err).to.null;
                    Sample1.update({}, {ghi: 1212}, {multi: true, __user: "Mimani", __reason: "Mimani updated" }, function (err, result) {
                        expect(err).to.null;
                        done();
                    })
                })
            })
        });

        it("should create a diff object when collections are updated via update", function (done) {
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

        it("should return histories", function (done) {
            diffHistory.getHistories(Sample1.modelName, sample1._id, ["ghi"], function (err, historyAudits) {
                expect(err).to.null;
                expect(historyAudits.length).equal(1);
                expect(historyAudits[0].commment).equal('modified ghi from 123 to 1212');
                done();
            })
        });
    });

    describe("plugin: pre findOneAndUpdate", function () {
        var sample1;
        beforeEach(function (done) {
            sample1 = new Sample1({def: 'ipsum', ghi: 123});
            sample1.save(function (err, savedSample) {
                Sample1.findOneAndUpdate({def: 'ipsum'}, {ghi: 323, def: "hey  hye"}, {__user: "Mimani", __reason: "Mimani updated this also" }, function (err, updated) {
                    expect(err).to.null;
                    done();
                })
            })
        });

        it("should create a diff object when collections are updated via update", function (done) {
            History.find({}, function (err, histories) {
                expect(err).to.null;
                expect(histories.length).equal(1);
                expect(histories[0].diff.ghi[0]).equal(123);
                expect(histories[0].diff.ghi[1]).equal(323);
                expect(histories[0].diff.def[0]).equal('ipsum');
                expect(histories[0].diff.def[1]).equal("hey  hye");
                expect(histories[0].reason).equal('Mimani updated this also');
                expect(histories[0].collectionName).equal(Sample1.modelName);
                expect(histories[0].collectionName).equal(Sample1.modelName);
                done();
            });
        });

        it("should return histories", function (done) {
            diffHistory.getHistories(Sample1.modelName, sample1._id, ["ghi"], function (err, historyAudits) {
                expect(err).to.null;
                expect(historyAudits.length).equal(1);
                expect(historyAudits[0].commment).equal('modified def, ghi from 123 to 323');
                done();
            })
        });
    });

});
