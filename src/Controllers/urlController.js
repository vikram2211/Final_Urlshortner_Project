const urlModel = require("../Models/urlModel");
const validUrl = require("valid-url");
const shortid = require("shortid");
const redis = require("redis");

const { promisify } = require("util");
const { Console } = require("console");

//Connect to redis
const redisClient = redis.createClient(
    19067,
    "redis-19067.c8.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("vBN8o7RXMm5W6j0WsBJEGd5VxqMs7P39", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

// redis-19067.c8.us-east-1-2.ec2.cloud.redislabs.com:19067

//1. connect to the server
//2. use the commands :

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
        if (!validUrl.isUri(longUrl)) {
            return res.status(400).send({ status: false, message: "Please provide a valid Url" })
        }
        //Searching in Redis server
        let urlCode;
        let redis = await GET_ASYNC(`${longUrl}`)
        let cachUrl = JSON.parse(redis)
        if (cachUrl) {
            urlCode = cachUrl.urlCode;
            let shortUrl = `http://localhost:3000/${urlCode}`
            return res.status(409).send({ status: false, message: "long Url already present in  redis server", urlDetails: shortUrl })

        }
        //search in db
        let url = await urlModel.findOne({ longUrl: longUrl }).select({ urlCode: 1, longUrl: 1, shortUrl: 1, _id: 0 })

        if (url) {
            urlCode = url.urlCode
            let shortUrl = `http://localhost:3000/${urlCode}`
            await SET_ASYNC(`${longUrl}`, JSON.stringify(url))//set in redis server
            return res.status(409).send({ status: false, message: "long url already present in DB ", urlDetails: shortUrl })

        }

        else {
            urlCode = shortid.generate()
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
                redisClient.expireat(key, parseInt((+new Date)/1000) + 86400);
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