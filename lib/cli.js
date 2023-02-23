#!/usr/bin/env node
import readline from "readline"
import hooke from "."

const helpMessage = `Usage: hooke [parameter]=[value] [parameter]=[value]...

Parameters:
    minScore=<number>            Minimum score needed to print any match.        (Default: 5)
    language=<string>            Language to use in the preprocessing.           (Default: english)
    shingleSize=<number>         Size of shingle to be used.                     (Default: 2)
    apikey=<string>              Google custom search API key.                   (Default: G_API_KEY enviroment variable or none)
    engineid=<string>            Google custom search engine id.                 (Default: G_ENGINE_ID enviroment variable or none)
    maximumGap=<number>          Maximum gap between elements in the same match. (Default: 3)
    minimumClusterSize=<number>  Minimum size of match to be printed             (Default: 3)
`

if (process.argv.includes("help")) {
	console.log(helpMessage)
	process.exit()
}

const version = require("./package.json").version

process.stdout.write(`Thank you for using Hooke v${version}!\n`)
process.stdout.write(`Type the text to be checked. When done, press Ctrl + X\n`)
process.stdout.write(`Press Ctrl + C to exit\n\n>`)

readline.emitKeypressEvents(process.stdin)
process.stdin.setRawMode(true)

var writing = true
var text = ""

function parseArguments() {
	var options = {}
	try {
		for (var arg of process.argv.slice(2)) {
			var [param, val] = arg.split("=")
			if (!isNaN(Number(val))) val = Number(val)
			options[param] = val
		}
	} catch {
		console.log(helpMessage)
		process.exit()
	}
	return options
}

const options = parseArguments()

process.stdin.on("keypress", async (str, key) => {
	if (key.name == "c" && key.ctrl) process.exit()
	else if (writing && key.name == "x" && key.ctrl) {
		writing = false
		process.stdout.write("\n\nPlease Wait...")
		await hooke.matchPrint({...options, text: text})
		process.stdout.write("\n\n>")
		writing = true
	} else if (writing && ["\n", "\r"].includes(key.sequence)) {
		process.stdout.write("\n")
		text += "\n"
	} else if (writing && key.sequence == "\b") {
		process.stdout.write("\b \b")
		text = text.slice(0, -1)
	} else if (writing) {
		try {
			process.stdout.write(str)
			text += str
		} catch {}
	}
})
