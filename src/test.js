const {it, works, functions} = require("itworksjs")
const hooke = require("./index")
const snowball = require("snowball-stemmers")

const fs = require("fs")
const log = (...data) => {
	fs.write(1, data.map(e => String(e)).join(" ") + "\n", ()=>{})
}

var {shingleAndStemmer, normalizeAndRemoveStopWords, singleSearchScrape} =
	functions([
		"shingleAndStemmer",
		"normalizeAndRemoveStopWords",
		"singleSearchScrape",
	]).from("./lib/index.js")

it("should remove stopwords and normalize", () => {
	var [words, indicesList] = normalizeAndRemoveStopWords(
		["Hello,", "my", "name", "is", "jazz"],
		[
			[0, 6],
			[7, 9],
			[10, 14],
			[15, 17],
			[20, 25]
		],
		"english"
	)
	if (words.length != 1 || words[0] != "jazz") {
		throw new Error("Unable to remove stopwords")
	}
	if (indicesList[0][0] != 20 || indicesList[0][1] != 25) {
		throw new Error("Indices don't match words")
	}
})

it("should stem and shingle", () => {
	const stemmer = snowball.newStemmer("english").stem
	var [shingles, shingleIndicesList] = shingleAndStemmer(
		["like", "jazz", "my", "jazzy", "feeling"],
		[
			[1, 2],
			[3, 4],
			[5, 6],
			[7, 8],
			[9, 10]
		],
		2,
		stemmer
	)
	if (shingles.length != 4) {
		throw new Error("Wrong shingle amount")
	}
	if (shingles[0].length != 2) {
		throw new Error("Wrong shingle length")
	}
	if (shingles[3][1] != "feel") {
		throw new Error("Stemming error")
	}
})

it("should stem and shingle in spanish", () => {
	const stemmer = snowball.newStemmer("spanish").stem
	var [shingles, shingleIndicesList] = shingleAndStemmer(
		["hola", "camine", "caerse"],
		[
			[0, 0],
			[1, 1],
			[2, 2]
		],
		2,
		stemmer
	)
	if (shingles.length != 2) {
		throw new Error("Wrong shingle amount")
	}
	if (shingles[0].length != 2) {
		throw new Error("Wrong shingle length")
	}
	if (shingles[0][1] != "camin") {
		throw new Error("Stemming error")
	}
})

it("should scrape google", async () => {
	var urls = await singleSearchScrape("Jazz")
	if (urls.length == 0) {
		throw new Error("Couldn't scrape google")
	}
})

it("should return matches on a plagiraised text (RNN) (scrape)", async () => {
	var sources = await hooke.match({
		text: "There’s something magical about Recurrent Neural Networks (RNNs). I still remember when I trained my first recurrent network for Image Captioning. Within a few dozen minutes of training my first baby model (with rather arbitrarily-chosen hyperparameters) started to generate very nice looking descriptions of images that were on the edge of making sense",
		apikey: null,
		engineid: null
	})
	if (sources.length == 0) {
		throw new Error(
			"No matches found for the RNNs Test"
		)
	}
	log("\n[", sources.map(e => e.source).join(", "), "]\n")
	if (
		!sources
			.map((e) => e.source)
			.includes("http://karpathy.github.io/2015/05/21/rnn-effectiveness/")
	) {
		throw new Error("RNN test did not find article")
	}
})

works()
