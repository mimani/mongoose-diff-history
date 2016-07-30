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
    before(function () {
        mongoose.connection.collections[ 'histories'].drop( function(err) {
            if(err) console.log('Error in collection dropped ', err);
            console.log('collection:histories dropped before test');
        });
        mongoose.connection.collections['samples'].drop( function(err) {
            if(err) console.log('Error in collection dropped ', err);
            console.log('collection:samples dropped before test');
        });
    });
    describe("plugin: pre save", function () {

        it("should create a diff object when collection is created", function (done) {
            sample1 = new Sample1({def: 'ipsum', ghi: 123});
            sample1.save(function (err, sample2) {
                expect(err).to.null;
                sample2.def = "laer";
                sample2.save(function (err, sample3) {
                    expect(err).to.null;
                    History.find({"collectionId" :sample3._id}, function (err, histories) {
                        expect(err).to.null;
                        expect(histories.length).equal(1);
                        expect(histories[0].diff.def[0]).equal('ipsum' );
                        expect(histories[0].diff.def[1]).equal('laer' );
                        expect(histories[0].collectionName).equal(Sample1.modelName);
                        done();
                        //expect(history.collectionId).equal(sample1._id);
                    });
                })
            });
        });

        it("should return histories", function (done) {
            Sample1.find({}, function (err, sample1) {
                expect(err).to.null;
                diffHistory.getHistories(Sample1.modelName, sample1[0]._id, [], function(err, historyAudits){
                    expect(err).to.null;
                    expect(historyAudits.length).equal(1);
                    expect(historyAudits[0].commment).equal('modified def');
                    done();
                })
            });
        });
    });
});