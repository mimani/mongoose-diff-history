This is sample express REST application which demonstrates how `mongoose-diff-history` is used.


## Installation
Install all npm dependencies required
```
npm install
```

start the express server
```
npm test
```
Start a mongo server.

From the rest client you can create a employee entry, with following:
```
Method: POST
URL: http://localhost:3000/employees
Payload: {
         "name":"Saurabh",
         "email":"mimani.saurabh@gmail.com",
         "mobile":"123234123",
         "employeeId":"934934"
         }
```

## GET
You can get the employee with following:

```
Method: GET
URL: http://localhost:3000/:employeeId
Sample Payload
    {
        "_id": "579cc08545505db69239a776",
        "name": "Saurabh",
        "email": "saurabh.124@gmail.com",
        "mobile": "099999",
        "employeeId": "934934",
        "__v": 0
    }
```

I have written three APIs to update employees. These 3 APIs use three different mongoose methods to update the object.

## Save
Update the employee using `save` method, following is the API signature:

```
Method: PUT
URL: http://localhost:3000/:employeeId
Payload: {
     "email":"mimani.new@gmail.com",
     "mobile":"123234123",
     }
```

## Update
Update the employee using `update` method, following is the API signature:

```
Method: PUT
URL: http://localhost:3000/update/:employeeId
Payload: {
     "email":"mimani.new@gmail.com",
     "mobile":"123234123",
     }
```

## findOneAndUpdate
Update the employee using `update` method, following is the API signature:

```
Method: PUT
URL: http://localhost:3000/findOneAndUpdate/:employeeId
Payload: {
     "email":"mimani.new@gmail.com",
     "mobile":"123234123",
     }
```

On updating an employee entry, you will see an entry created in history collection as well, which will have diff between the earlier object and the updated object.

## Get Histories

You can get all the histories for a particular object using following API:

```
Method: GET
URL: http://localhost:3000/:employeeId/histories
Sample Response: [
                     {
                         "changedBy": "Mimani",
                         "changedAt": "2016-08-14T13:36:20.538Z",
                         "reason": "Mimani changed this",
                         "commment": "modified mobile from 9343476766 to 9343434766"
                     },
                     {
                         "changedBy": "Mimani",
                         "changedAt": "2016-08-14T13:37:09.645Z",
                         "reason": "Mimani changed this",
                         "commment": "modified email from mimani@fmail.com to saurabh@fmail.com"
                     }
                 ]
```
