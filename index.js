require("dotenv").config()
const fs = require("node:fs")
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const app = express()

// Basic Configuration
const port = process.env.PORT || 3000
let state = {
	links: [],
}

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
			} else {
				// state json file doesnt exist, create it
				data.save()
			}
		}
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
app.post("/api/shorturl/", bodyParser.urlencoded({extended: false}), function (req, res) {
	if (req.body.url) {
		// short link found

    state.links.push({ original_url: req.body.url })
    const urlId = state.links.length - 1
    data.save()
    res.json({original_url: req.body.url, short_url: urlId})
	} else {
		res.json({ error: "No short URL found for the given input" })
	}
	
})

// load/init state data
data.load()

// start app
app.listen(port, function () {
	console.log(`Listening on port ${port}`)
})
