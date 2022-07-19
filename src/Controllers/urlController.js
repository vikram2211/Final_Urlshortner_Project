const urlModel = require("../Models/urlModel");
const validUrl = require("valid-url");
const shortid = require("shortid");

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


        let urlCode = shortid.generate()

        let shortUrl = `http://localhost:3000/${urlCode}`

        let check = await urlModel.findOne({ urlCode: urlCode, shortUrl: shortUrl });
        if (check) {
            return res.status(409).send({ status: false, message: "Urlcode or shorturl already present", urlDetails: shortUrl })
        }

        let collection = {
            urlCode: urlCode,
            longUrl: longUrl,
            shortUrl: shortUrl
        }

        let urlDetails = await urlModel.create(collection)
        return res.status(201).send({ status: true, data: collection })

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
        let urlData = await urlModel.findOne({ urlCode: urlCode })
        if (!urlData) {
            return res.status(404).send({ status: false, message: "This code is not exist" })
        }
        return res.status(302).redirect(`${urlData.longUrl}`) 
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}
module.exports.createShortUrl = createShortUrl;
module.exports.getUrlDetails = getUrlDetails;