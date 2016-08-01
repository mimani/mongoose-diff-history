This is sample express REST application which demonstrates how `mongoose-diff-history` is used.


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

You can get the employee with following:


```
   Method: POST
   URL: http://localhost:3000/employeeId

```

Similarly, PUT can be used to update an created employee entry.

On updating an employee entry, you will see an entry created in history collection as well, which will have diff of update happened.
