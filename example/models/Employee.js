var mongoose = require("mongoose");
var config = require("../config");

var EmployeeSchema = new mongoose.Schema({
    name: {type: String},
    dateOfBirth: {type: Date},
    email: {type: String},
    mobile: {type: String},
    designation: {type: String},
    employeeId: {type: String},
});

var diffHistory = require("mongoose-diff-history/diffHistory").plugin;
EmployeeSchema.plugin(diffHistory);

var Employee = mongoose.model("Employee", EmployeeSchema);
module.exports = Employee;





