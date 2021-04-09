const express = require('express');
const router = express.Router();
const Logger = require('../utils/logger.js');
const Employee = require('../models/Employee.js');

/* GET /employees/1234 */
router.get('/:employeeId', function (req, res, next) {
    Employee.find({ employeeId: req.params.employeeId }).exec(function (
        err,
        employeeResult
    ) {
        if (err) {
            return next(err);
        }
        res.json(employeeResult[0] ? employeeResult[0] : {});
    });
});

/*
POST /employees
    Sample Payload:
    {
        "name":"Saurabh",
        "email":"mimani.saurabh@gmail.com",
        "mobile":"123234123",
        "employeeId":"934934"
    }
*/
router.post('/', function (req, res, next) {
    Employee.create(req.body, function (err, createOutput) {
        if (err) {
            return next(err);
        }
        res.json(createOutput);
    });
});

/*
PUT /employees/update/:employeeId
    Sample Payload:
    {
        "name":"Saurabh",
        "email":"mimani.saurabh@gmail.com",
        "mobile":"123234123",
        "employeeId":"934934"
    }
*/
router.put('/update/:employeeId', function (req, res, next) {
    Employee.update(
        { employeeId: req.params.employeeId },
        req.body,
        {
            new: true,
            __user: { name: 'Mimani', role: 'admin' },
            __reason: 'Mimani updated'
        },
        function (errFind, updatedEmp) {
            if (errFind) {
                res.sendStatus(500);
                return next(errFind);
            }
            return res.json(updatedEmp);
        }
    );
});

/*
 PUT /employees/:employeeId
     Sample Payload:
     {
         "name":"Saurabh",
         "email":"mimani.saurabh@gmail.com",
         "mobile":"123234123",
         "employeeId":"934934"
     }
 */
router.put('/:employeeId', function (req, res, next) {
    Employee.find({ employeeId: req.params.employeeId }, function (
        errFind,
        postFind
    ) {
        if (errFind) {
            res.sendStatus(500);
            return next(errFind);
        }
        if (postFind && Array.isArray(postFind) && postFind.length > 0) {
            const employee = postFind[0];
            for (const key in req.body) {
                employee[key] = req.body[key];
            }
            employee.__user = 'Mimani';
            employee.__reason = req.body.reason
                ? req.body.reason
                : 'Mimani changed this';
            employee.save(function (err) {
                if (err) {
                    Logger.error(
                        'Employee update error for employeeId: ' +
                            req.params.employeeId
                    );
                    return next(err);
                }
                res.json(employee);
            });
        } else {
            res.sendStatus(404);
            return next('Employee Not Found');
        }
    });
});

/*
 PUT /employees/findOneAndUpdate/:employeeId
     Sample Payload:
     {
         "name":"Saurabh",
         "email":"mimani.saurabh@gmail.com",
         "mobile":"123234123",
         "employeeId":"934934"
     }
 */
router.put('/findOneAndUpdate/:employeeId', function (req, res, next) {
    Employee.findOneAndUpdate(
        { employeeId: req.params.employeeId },
        req.body,
        {
            new: true,
            __user: 'Mimani',
            __reason: 'Mimani updated'
        },
        function (errFind, updatedEmp) {
            if (errFind) {
                res.sendStatus(500);
                return next(errFind);
            }
            return res.json(updatedEmp);
        }
    );
});

router.get('/:employeeId/version/:version', function (req, res, next) {
    Employee.find({ employeeId: req.params.employeeId }).exec(function (
        err,
        employeeResult
    ) {
        if (err || !employeeResult || !employeeResult[0]) {
            return next(err);
        }
        Employee.getVersion(
            employeeResult[0]._id,
            req.params.version,
            function (err, oldEmployee) {
                if (err) {
                    return next(err);
                }
                res.json(oldEmployee);
            }
        );
    });
});

router.get('/:id/versionbyObjectId/:version', function (req, res, next) {
    Employee.getVersion(req.params.id, req.params.version, function (
        err,
        oldEmployee
    ) {
        if (err) {
            return next(err);
        }
        res.json(oldEmployee);
    });
});

router.get('/:employeeId/histories', function (req, res, next) {
    Employee.find({ employeeId: req.params.employeeId }).exec(function (
        err,
        employeeResult
    ) {
        if (err || !employeeResult || !employeeResult[0]) {
            return next(err);
        }
        Employee.getHistories(
            'Employee',
            employeeResult[0]._id,
            ['mobile'],
            function (err, histories) {
                if (err) {
                    return next(err);
                }
                res.json(histories);
            }
        );
    });
});

/* DELETE /employees/:employeeId */
router.delete('/:employeeId', function (req, res, next) {
    Employee.findOne({ employeeId: req.params.employeeId }, function (
        err,
        employee
    ) {
        if (err || !employee) {
            return next(err);
        }
        employee.remove(function (err) {
            if (err) {
                return next(err);
            }
            const response = {
                employeeId: req.params.employeeId,
                entryDeleted: true
            };
            res.json(response);
        });
    });
});

module.exports = router;
