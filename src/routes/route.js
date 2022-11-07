const express = require("express");
const router = express.Router();      //to create a new route to handle requests
const urlController = require("../Controllers/urlController")

router.post("/url/shorten",urlController.createShortUrl);
router.get("/:urlCode",urlController.getUrlDetails)




module.exports=router