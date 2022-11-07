const urlModel = require("../Models/urlModel");

const validUrl = require("valid-url");   //for validating the Url.

const shortid = require("shortid");    //used to create short non-sequential url-friendly unique ids.

const redis = require("redis");        //redis is an in-memory database that stores data in the server memory.

const validator = require("validator")

const { promisify } = require("util");                     //dont know this



//Connect to redis

const redisClient = redis.createClient(
    12272,                                                       //port
"redis-12272.c8.us-east-1-2.ec2.cloud.redislabs.com",        //host-name
    { no_ready_check: true }                                     
);
redisClient.auth("mptB0GL4fxcT433K9ntTS5PaZbffLhE2", function (err) {        //password to authenticate
    if (err) throw err;                                                      //failed to connect
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");                                     //successful
});


//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


let isValid = function (value) {
    if (typeof value == "undefined" || value == null) return false;
    if (typeof value === "string" && value.trim().length == 0) return false;
    if (typeof value === "string") return true;
    return false;
};


const createShortUrl = async function (req, res) {
    try {
        const data = req.body;
        const longUrl = data.longUrl;

        if (!Object.keys(data).length) {
            return res.status(400).send({ status: false, message: "Please give some data to add " })
        }

        if (!isValid(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide long Url " })
        }
        if (!validUrl.isWebUri(longUrl)) {                               //checks for web link http/https is must
            return res.status(400).send({ status: false, message: "Please provide a valid Url" })
        }
        if(!validator.isURL(longUrl)){                                   //checks syntax or is there any fault in url
            return res.status(400).send({status:false,message:"Please provide a valid longurl"})
        }

        //Searching in Redis server

        let urlCode;
        let redis = await GET_ASYNC(`${longUrl}`)  
        let cachUrl = JSON.parse(redis)

        if (cachUrl) {
            urlCode = cachUrl.urlCode;
            let shortUrl = `http://localhost:3000/${urlCode}`
            return res.status(200).send({ status: true, message: "long Url already present in  redis server", urlDetails: shortUrl })

        }
        //search in db  
        let url = await urlModel.findOne({ longUrl: longUrl }).select({ urlCode: 1, longUrl: 1, shortUrl: 1, _id: 0 })

        if (url) {
            urlCode = url.urlCode
            let shortUrl = `http://localhost:3000/${urlCode}`
            await SET_ASYNC(`${longUrl}`, JSON.stringify(url))                //set in redis server
            redisClient.expireat(longUrl, parseInt((Date.now())/1000) + 30);
            return res.status(200).send({ status: true, message: "long url already present in DB ", urlDetails: shortUrl })

        }

        else {
            urlCode = shortid.generate()       //creating urlCode
        }

        let shortUrl = `http://localhost:3000/${urlCode}`

        let collection = {
            urlCode: urlCode,
            longUrl: longUrl,
            shortUrl: shortUrl
        }

        let urlDetails = await urlModel.create(collection)
        let result = {
            urlCode: urlDetails.urlCode,
            longUrl: urlDetails.longUrl,
            shortUrl: urlDetails.shortUrl
        }
        await SET_ASYNC(`${longUrl}`, JSON.stringify(result))
        redisClient.expireat(longUrl, parseInt((Date.now())/1000) + 30);
        return res.status(201).send({ status: true, data: result })

    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



const getUrlDetails = async function (req, res) {
    try {
        let params = req.params;

        let urlCode = params.urlCode;

        if (!Object.keys(params).length) {
            return res.status(400).send({ status: false, message: "Please enter someData" })
        }
        let cachUrl = await GET_ASYNC(`${urlCode}`)
        redisClient.expireat(urlCode, parseInt((Date.now())/1000) + 30);
        let parseData = JSON.parse(cachUrl)
        if (cachUrl) {
            console.log("Redirect from Redis server")
            return res.status(302).redirect(`${parseData.longUrl}`)
        }
        else {
            let urlData = await urlModel.findOne({ urlCode: urlCode })
            if (!urlData) {
                return res.status(404).send({ status: false, message: "This  url-code is not exist" })
            }
            else {
                await SET_ASYNC(`${urlCode}`, JSON.stringify(urlData))
                console.log("Redirect from DB")
                return res.status(302).redirect(`${urlData.longUrl}`)

            }
        }
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}
module.exports.createShortUrl = createShortUrl;
module.exports.getUrlDetails = getUrlDetails;