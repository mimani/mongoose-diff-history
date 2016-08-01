var express = require('express');
var router = express.Router();
var async = require('async');
var config = require('../config');
var ESAPI = require('node-esapi');
var Logger = require('../utils/logger.js');
var VError = require('verror');

var mongoose = require('mongoose');
var Employee = require('../models/Employee.js');


/* GET /employees/1234 */
router.get('/:employeeId', function (req, res, next) {
    console.log("req.params.employeeId ", req.params.employeeId);
    Employee.find({employeeId: req.params.employeeId}).exec(function (err, employeeResult) {
        if (err) {
            return next(err)
        }
        res.json(employeeResult[0]);
    });
});


/* POST /employees */
router.post('/', function (req, res, next) {
    Employee.create(req.body, function (err, createOutput) {
        if (err) return next(err);
        res.json(createOutput);
    });
});


router.put('/:employeeId', function (req, res, next) {

        Employee.find({employeeId: req.params.employeeId}, function (errFind, postFind) {
            if (errFind) {
                res.sendStatus(500);
                return next(errFind);
            }
            if (postFind && Array.isArray(postFind) && postFind.length > 0) {
                var employee = postFind[0];
                for (var key in req.body) {
                    employee[key] = req.body[key]
                }
                employee.save(function (err) {
                    if (err) {
                        Logger.error("Employee update error for employeeId: " + req.params.employeeId);
                        return next(err);
                    }
                    res.json(employee);

                });
            } else {
                res.sendStatus(404);
                return next("Employee Not Found");

            }
        });
    }
);

/* DELETE /employees/:employeeId */
router.delete('/:employeeId', function (req, res, next) {

    Employee.remove({employeeId: req.params.employeeId}, function (err, post) {
        if (err) return next(err);
        var response = {
            'employee_id': req.params.employeeId,
            'entry_deleted': post.result.n
        };
        res.json(response);
    });
});

module.exports = router;
