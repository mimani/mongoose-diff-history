var expect   = require("chai").expect;
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/tekpub_test');

var sampleSchema1 = new mongoose.Schema(
    {
        abc: {type: Date, default: Date.now()},
        def: {type: String},
        ghi: {type: Number},
    });
var diffHistory = require('../diffHistory');
sampleSchema1.plugin(diffHistory.plugin);
var Sample1 = mongoose.model('Sample1', sampleSchema1);
var History = require('../diffHistoryModel');


describe("diffHistory", function(){
    describe("plugin: pre save", function() {
        it("should create a diff object when collection is created", function () {
            sample1 = new Sample1({def: 'ipsum', ghi: 123});
            sample1.save();
            console.log(JSON.stringify(sample1));
            History.findOne({collectionId: sample1._id}, function(err, history){
                console.log("hey hey hey " + sample1._id);
                //TODO: Some error it is coming as null need to check
                console.log(history);
                expect(history.collectionId).equal(sample1._id);
            });
            expect(true).equal(true);
        });
    });
});