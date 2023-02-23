const {it, works, functions} = require("itworksjs")
const hooke = require("./index.js")
const snowball = require("snowball-stemmers")

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
	if (!!urls.length == false) {
		throw new Error("Couldn't scrape google")
	}
})

it("should return matches on a plagiraised text (Sherlock Holmes Wikipedia)", async () => {
	var sources = await hooke.match({
		text: "Sherlock Holmes (/ˈʃɜːrlɒk ˈhoʊmz/ or /-ˈhoʊlmz/) is a fictional private detective created by British author Sir Arthur Conan Doyle. Referring to himself as a consulting detective in the stories, Holmes is known for his proficiency with observation, deduction, forensic science, and logical reasoning that borders on the fantastic, which he employs when investigating cases for a wide variety of clients, including Scotland Yard."
	})
	if (sources.length == 0) {
		throw new Error(
			"No matches found for the Sherlock Holmes wikipedia Test"
		)
	}
	if (
		!sources
			.map((e) => e.source)
			.includes("https://en.wikipedia.org/wiki/Sherlock_Holmes")
	) {
		throw new Error("Sherlock Holmes Wikipedia Test did not find Wikipedia")
	}
})

it("should return matches on a plagiraised text (Sherlock Holmes Wikipedia) (scrape)", async () => {
	var sources = await hooke.match({
		text: "Sherlock Holmes (/ˈʃɜːrlɒk ˈhoʊmz/ or /-ˈhoʊlmz/) is a fictional private detective created by British author Sir Arthur Conan Doyle. Referring to himself as a consulting detective in the stories, Holmes is known for his proficiency with observation, deduction, forensic science, and logical reasoning that borders on the fantastic, which he employs when investigating cases for a wide variety of clients, including Scotland Yard.",
		apikey: null,
		engineid: null
	})
	if (sources.length == 0) {
		throw new Error(
			"No matches found for the Sherlock Holmes wikipedia Test"
		)
	}
	if (
		!sources
			.map((e) => e.source)
			.includes("https://en.wikipedia.org/wiki/Sherlock_Holmes")
	) {
		throw new Error("Sherlock Holmes Wikipedia Test did not find Wikipedia")
	}
})

works()
