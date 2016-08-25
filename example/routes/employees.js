var express = require("express");
var router = express.Router();
var Logger = require("../utils/logger.js");
var Employee = require("../models/Employee.js");
var diffHistory = require("mongoose-diff-history/diffHistory");

/* GET /employees/1234 */
router.get("/:employeeId", function (req, res, next) {
    Employee.find({employeeId: req.params.employeeId}).exec(function (err, employeeResult) {
        if (err) {
            return next(err);
        }
        res.json(employeeResult[0] ? employeeResult[0] : {});
    });
});


/* POST /employees */
router.post("/", function (req, res, next) {
    Employee.create(req.body, function (err, createOutput) {
        if (err){ return next(err);}
        res.json(createOutput);
    });
});

router.put("/update/:employeeId", function (req, res, next) {
        Employee.update({employeeId: req.params.employeeId}, req.body, {
            new: true,
            __user: {name: "Mimani", role: "admin"},
            __reason: "Mimani updated"
        }, function (errFind, updatedEmp) {
            if (errFind) {
                res.sendStatus(500);
                return next(errFind);
            }
            return res.json(updatedEmp);
        });
    }
);

router.put("/:employeeId", function (req, res, next) {
        Employee.find({employeeId: req.params.employeeId}, function (errFind, postFind) {
            if (errFind) {
                res.sendStatus(500);
                return next(errFind);
            }
            if (postFind && Array.isArray(postFind) && postFind.length > 0) {
                var employee = postFind[0];
                for (var key in req.body) {
                    employee[key] = req.body[key];
                }
                employee.__user = "Mimani";
                employee.__reason = req.body.reason ? req.body.reason : "Mimani changed this";
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

router.put("/findOneAndUpdate/:employeeId", function (req, res, next) {
        Employee.findOneAndUpdate({employeeId: req.params.employeeId}, req.body, {
            new: true,
            __user: "Mimani",
            __reason: "Mimani updated"
        }, function (errFind, updatedEmp) {
            if (errFind) {
                res.sendStatus(500);
                return next(errFind);
            }
            return res.json(updatedEmp);
        });
    }
);

router.get("/:employeeId/version/:version", function (req, res, next) {
    Employee.find({employeeId: req.params.employeeId}).exec(function (err, employeeResult) {
        if (err || !employeeResult || !employeeResult[0]) {
            return next(err)
        }
        diffHistory.getVersion(Employee, employeeResult[0]._id, req.params.version, function (err, oldEmployee) {
            if (err){ return next(err);}
            res.json(oldEmployee);
        });
    })
});

router.get("/:id/versionbyObjectId/:version", function (req, res, next) {
    diffHistory.getVersion(Employee, req.params.id, req.params.version, function (err, oldEmployee) {
        if (err){ return next(err);}
        res.json(oldEmployee);
    })
});

router.get("/:employeeId/histories", function (req, res, next) {
    Employee.find({employeeId: req.params.employeeId}).exec(function (err, employeeResult) {
        if (err || !employeeResult || !employeeResult[0]) {
            return next(err)
        }
        diffHistory.getHistories("Employee", employeeResult[0]._id, ["mobile"], function (err, histories) {
            if (err){ return next(err);}
            res.json(histories);
        })
    })
});

/* DELETE /employees/:employeeId */
router.delete("/:employeeId", function (req, res, next) {
    Employee.findOne({employeeId: req.params.employeeId}, function (err, employee) {
        if (err || !employee){ return next(err);}
        employee.remove(function(err){
            if (err){ return next(err);}
            var response = {
                "employeeId": req.params.employeeId,
                "entryDeleted": true
            };
            res.json(response);
        })
    });
});

module.exports = router;
