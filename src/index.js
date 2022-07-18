const express = require('express');
const app = express();
const mongoose = require('mongoose');

const bodyparser = require('body-parser');
const route = require('./routes/route');

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));

mongoose.connect("mongodb+srv://Suman-1432:Suman1432@cluster0.bkkfmpr.mongodb.net/group14Database", {useNewUrlParser: true})
.then(() => console.log("mongoDB is connected"))
.catch(err => console.log(err))

app.use('/', route)

app.use((req,res,next)=>{
    res.status(404).send({status:false, msg:`Not found ${req.url}`})
    next()
})


app.listen(process.env.PORT || 3000, function () {
    console.log('Express is running on port ' + (process.env.PORT || 3000))
});