const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    name: { type: String },
    dateOfBirth: { type: Date },
    email: { type: String },
    mobile: { type: String },
    designation: { type: String },
    employeeId: { type: String }
});

const diffHistory = require('mongoose-diff-history/diffHistory').plugin;
EmployeeSchema.plugin(diffHistory, { name: 'EmployeeHistory' });

const Employee = mongoose.model('Employee', EmployeeSchema);
module.exports = Employee;
