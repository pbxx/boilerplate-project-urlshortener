require("dotenv").config()
const fs = require("node:fs")
const url = require("node:url")
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const app = express()

// Basic Configuration
const options = {
	// port to run the application on
	port: process.env.PORT || 3000,
	// tld update interval in minutes
	tldInterval: process.env.TLD_INTERVAL || 12 * 60,
}
let state = {
	links: [],
}
async function init() {
	const data = {
		save() {
			fs.writeFileSync(process.cwd() + "/data/state.json", JSON.stringify(state))
		},
		load() {
			if (!fs.existsSync(process.cwd() + "/data")) {
				// create the data folder if it doesn't exist
				fs.mkdirSync(process.cwd() + "/data")
				// create json file with current state data
				data.save()
			} else {
				// data folder exists, load data json file if it exists
				if (fs.existsSync(process.cwd() + "/data/state.json")) {
					state = JSON.parse(fs.readFileSync(process.cwd() + "/data/state.json").toString())
					return true
				} else {
					// state json file doesnt exist, create it
					data.save()
				}
			}
		},
	}

	const utils = {
		getTLD(urlObj) {
			const split = urlObj.hostname.split(".")
			const tld = split[split.length - 1]
			return tld.toUpperCase()
		},
		async getLatestTLDs() {
			// fetch latest acceptable TLDs
			let list = (await (await fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt")).text()).split("\n")
			// remove first line from tlds
			list.shift()
			const iat = Math.floor(Date.now() / 1000)
			state["validTLDs"] = { list, iat }
			// console.log(validTLDs)
			data.save()
			return
		},
	}

	app.use(cors())

	app.use("/public", express.static(`${process.cwd()}/public`))

	app.get("/", function (req, res) {
		res.sendFile(process.cwd() + "/views/index.html")
	})

	// Your first API endpoint
	app.get("/api/shorturl/:urlId", function (req, res) {
		if (req.params.urlId && state.links[parseInt(req.params.urlId)]) {
			// short link found
			res.redirect(state.links[parseInt(req.params.urlId)].original_url)
		} else {
			res.json({ error: "No short URL found for the given input" })
		}
	})
	app.post("/api/shorturl/", bodyParser.urlencoded({ extended: false }), async function (req, res) {
		if (req.body.url) {
			try {
				// check if TLD is valid
				const parsedUrl = new URL(req.body.url)
				// check if validTLDs are expired
				const nowTime = Math.floor(Date.now() / 1000)
				if (!state.validTLDs || (state.validTLDs.iat && state.validTLDs.iat > nowTime + options.tldInterval * 60)) {
					// validTLDs are expired, get fresh
          console.log("Getting fresh TLDs, current list is either not present or expired")
					await utils.getLatestTLDs()
				}
				// check if requested tld is in valid tlds
				if (state.validTLDs.list.includes(utils.getTLD(parsedUrl)) === true) {
					// create shortlink
					state.links.push({ original_url: parsedUrl.toString() })
					const urlId = state.links.length - 1
					data.save()
					res.json({ original_url: parsedUrl.toString(), short_url: urlId })
				} else {
					res.json({ error: "invalid url" })
				}
			} catch (error) {
				console.error(error)
				res.json({ error: "invalid url" })
			}
		} else {
			res.json({ error: "No short URL found for the given input" })
		}
	})

	// load/init state data
	data.load()

	// start app
	app.listen(options.port, function () {
		console.log(`Listening on port ${options.port}`)
	})
}

init()
