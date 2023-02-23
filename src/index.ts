// @ts-ignore
const snowball = require("snowball-stemmers")
import data from "./stopwords.json"
const inBrowser = typeof window != "undefined"

type Language = "english" | "spanish"
const english: Language = "english"

let get: (url: string, timeoutMs: number) => Promise<string>

//// Request section
if (inBrowser) {
	get = (url: string, timeoutMs: number) => {
		return new Promise((resolve, reject) => {
			let out = setTimeout(() => {
				reject("Request Timed Out")
			}, timeoutMs)
			let req = new XMLHttpRequest()
			req.open("GET", url)
			req.send()
			req.onload = () => {
				if (req.status == 200) {
					clearTimeout(out)
					resolve(req.response)
				} else {
					reject(req.response)
				}
			}
		})
	}
} else {
	const http = require("http")
	const https = require("https")

	get = (url: string, timeoutMs: number) => {
		return new Promise((resolve, reject) => {
			let out = setTimeout(() => {
				reject("Request Timed Out")
			}, timeoutMs)
			let data = ""
			const handler = (res: any) => {
				res.on("data", (d: string) => {
					data += d
				})
				res.on("end", () => {
					clearTimeout(out)
					resolve(data)
				})
				res.on("error", () => {
					reject(data)
				})
			}
			const options = {
				headers: {
					"user-agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
						"AppleWebKit/537.36 (KHTML, like Gecko) " +
						"Chrome/83.0.4103.97 Safari/537.36",
					connection: "keep-alive"
				}
			}
			if (url.slice(0, 5) == "https") https.get(url, options, handler)
			else http.get(url, options, handler)
		})
	}
}

//// Comparison section

/**
 * Takes text and the output of the findSpaces function as inputs, outputs list of words and list of their indices
 * in the original string in formant [start, end]
 *
 * In: "Hello, my name is", [-1, 6, 9, 14, 17]
 *
 * Out: [   [ 'Hello,', 'my', 'name', 'is' ] ,
 * [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ]]   ]
 */
function getWords(text: string, language = english): [string[], number[][]] {
	let regex = new RegExp(
		data[language].wordregex[0],
		data[language].wordregex[1]
	)
	let words: string[] = []
	let indices: number[][] = []
	Array.from(text.matchAll(regex)).forEach((match) => {
		words.push(match[0])
		indices.push([match.index || 0, (match.index || 0) + match.length])
	})
	return [words, indices]
}

/**
 * Leaves only allowed characters on each word and lowers it, and then removes the stopwords (from stopwords.json)
 *
 * In: [ 'Hello,', 'my', 'name', 'is', 'jazz' ] ,  [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ], [20,25]]
 *
 * Out: [ [ 'jazz' ], [ [ 20, 25 ] ] ]
 * (only jazz is not a stopword)
 */
function normalizeAndRemoveStopWords(
	words: string[],
	indicesList: number[][],
	language = english
): [string[], number[][]] {
	let stopwords = data[language].stopwords
	let spaces = RegExp(
		data[language].spaceregex[0],
		data[language].spaceregex[1]
	) // All non-allowed characters

	let newWords = []
	let newIndicesList = []

	for (let i = 0; i < words.length; i++) {
		let word = words[i].toLowerCase().replace(spaces, "")
		if (!stopwords.includes(word)) {
			newWords.push(word)
			newIndicesList.push(indicesList[i])
		}
	}
	return [newWords, newIndicesList]
}

/**
 * Stems the words (turns to root form) and optionally shingles them
 *
 * Read more:
 * https://en.wikipedia.org/wiki/Stemming
 * https://en.wikipedia.org/wiki/W-shingling
 *
 * In: ["like", "jazz", "my", "jazzy", "feeling"] , [[1,2], [3,4], [5,6], [7,8], [9,10]] , 2 , "english"
 *
 * Out: [ [  [ 'like', 'jazz' ],[ 'jazz', 'my' ],[ 'my', 'jazzi' ],[ 'jazzi', 'feel' ] ],
 * [ [ 1, 4 ], [ 3, 6 ], [ 5, 8 ], [ 7, 10 ] ]]
 */
function shingleAndStemmer(
	words: string[],
	indicesList: number[][],
	shingleSize: number,
	stemmer: (_: string) => string
): [string[][], number[][]] {
	words = words.map(stemmer)
	let shingles: string[][] = []
	let shingledIndicesList: number[][] = []
	let len = words.length - shingleSize + 1
	for (let i = 0; i < len; i++) {
		shingles.push(words.slice(i, i + shingleSize))
		shingledIndicesList.push([
			indicesList[i][0],
			indicesList[i + shingleSize - 1][1]
		])
	}
	return [shingles, shingledIndicesList]
}

/**
 * Auxiliary function which unites two arrays, skipping duplicates
 *
 * In: [1,2,4,5,7] , [3,4,5,6,7,8]
 *
 * Out: [1,2,4,5,7,3,6,8]
 */
function union<T>(array1: T[], array2: T[]): T[] {
	let len = array2.length
	for (let i = 0; i < len; i++) {
		if (!array1.includes(array2[i])) {
			array1.push(array2[i])
		}
	}
	return array1
}

/**
 * Auxiliary function which finds the difference of two arrays (based on the first one)
 *
 * In: [1,2,3,4,9], [2,4,7,8]
 *
 * Out: [1,3,9]
 */
function diff<T>(array1: T[], array2: T[]): T[] {
	let output = []
	for (let element of array1) {
		if (!array2.includes(element)) output.push(element)
	}
	return output
}

/**
 * Auxiliary function which checks if the elements of both arrays are equal. If they are not arrays just checks if
 * they are equal.
 *
 * In: [1,2,3,4], [2,4,3,1]
 * Out: false
 *
 * In: [1,2,3,4], [1,2,3,4]
 * Out: true
 *
 * In: [[1]], [[1]]
 * Out: false // because they are different entities and this function isn't recursive
 */
function arraysEqual<T>(array1: T[], array2: T[]): boolean {
	if (array1 == array2) {
		return true
	}
	if (array1.length != array2.length) {
		return false
	}
	let len = array1.length
	for (let i = 0; i < len; i++) {
		if (array1[i] != array2[i]) {
			return false
		}
	}
	return true
}

/**
 * Finds the points matching in both shingle sets, then finds the clusters in which they are close together
 * (a match)
 *
 * In: [["a"],["b"],["c"],["d"]], [["x"],["c"],["d"],["y"]], 2, 1
 * Out: [ [ [ 2, 1 ], [ 3, 2 ] ] ]
 *
 * Meaning there was one cluster, consisting of the indices 2 and 3 ("b" and "c") of the first array, and indices 1
 * and 2 of the second array (also "b" and "c")
 *
 * The returnMatches argument return the matches without any cluster done to them
 */
function findUnionAndCluster(
	shingles1: string[][],
	shingles2: string[][],
	maximumGap = 3,
	minimumClusterSize = 1,
	returnMatches = false
): number[][][] | [number[][][], number[][]] {
	let matches: number[][] = []
	for (let i = 0; i < shingles1.length; i++) {
		for (let j = 0; j < shingles2.length; j++) {
			if (arraysEqual(shingles1[i], shingles2[j])) {
				matches.push([i, j])
			}
		}
	}
	//clustering
	let clusters: number[][][] = []
	for (let i = 0; i < matches.length; i++) {
		// For every matching point
		let inCluster = null // By default it is not in any cluster
		let clustersLen = clusters.length // (false == 0 so it's not used)
		for (let j = 0; j < clustersLen; j++) {
			// For each existing cluster
			let currentClusterLen = clusters[j].length
			for (let k = 0; k < currentClusterLen; k++) {
				// For each point in that cluster
				if (
					Math.max(
						Math.abs(matches[i][0] - clusters[j][k][0]), // If Chebyshev distance is small enough
						Math.abs(matches[i][1] - clusters[j][k][1])
					) <= maximumGap
				) {
					// to be in the same cluster
					if (inCluster == null) {
						// If it isn't in any cluster
						clusters[j].push(matches[i]) // Add it to the cluster
						inCluster = j // Mark that it is in that cluster
					} else if (inCluster != j) {
						// Else if it already is in a cluster
						//and that cluster isn't the one it's in
						clusters[inCluster] = union(
							clusters[inCluster], //Merge both clusters
							clusters[j]
						)
						clusters[j] = []
						break
					}
				}
			}
		}
		if (inCluster == null) {
			// If after checking in al clusters it
			clusters.push([matches[i]]) // isn't in any, create a cluster with just itseld
		}
	}
	//Removing all clusters smaller than the minimum distance
	let newClusters = []
	for (let i = 0; i < clusters.length; i++) {
		if (clusters[i].length >= minimumClusterSize) {
			newClusters.push(clusters[i])
		}
	}
	if (returnMatches) {
		return [newClusters, matches]
	}
	return newClusters
}

/**
 * Returns the indices of matches based on the original text.
 *
 * In: 0,2, [[1,4],[5,7],[8,9],[12,15]]
 * Out: [1, 9]
 */
function findClusterStartAndEnd(
	shingleStart: number,
	shingleEnd: number,
	shingledIndicesList: number[][]
): number[] {
	return [
		shingledIndicesList[shingleStart][0],
		shingledIndicesList[shingleEnd][1]
	]
}

//// Search section

/**
 * Checks if any element in a list contains a substring of the given string
 *
 * In: "hello there", ["xyz", "thi", "re"]
 * Out: true
 */
function includesSubstringFromArray(string: string, array: string[]): boolean {
	for (let substring of array) {
		if (string.includes(substring)) return true
	}
	return false
}

/**
 * Auxiliary function to convert html to plain text
 *
 * Modified from EpokK @
 *https://stackoverflow.com/questions/15180173/convert-html-to-plain-text-in-js-without-browser-environment/15180206
 *
 * In: "<html><head><title>Example Domain</title>..."
 *
 * Out:
 *Example Domain
 *
 *Example Domain
 *This domain is for use in illustrative examples in documents. You may use this
 *domain in literature without prior coordination or asking for permission.
 *
 *More information...
 */
function html2text(htmlCode: string): string {
	htmlCode = String(htmlCode)
		.replace(/<style([\s\S]*?)<\/style>/gi, "")
		.replace(/<script([\s\S]*?)<\/script>/gi, "")
		.replace(/<[^>]+>/gi, " ")
	return htmlCode
}

/**
 * Gets contents inside title tag in html.
 *
 * In: "<head> ... <title >HookeJs/index.js at master · oekshido/HookeJs</title> ... "
 *
 * Out: HookeJs/index.js at master · oekshido/HookeJs
 */
function getTitle(html: string) {
	if (typeof html != "string") {
		return ""
	}
	let a = RegExp("title(.*?)/title", "i")
	let b = RegExp(">(.*?)<", "i")
	return html.match(a)?.[0].match(b)?.[0].slice(1, -1) || ""
}

/**
 * Searches the given query scraping google
 *
 * In: "Jazz"
 * Out: ["https://en.wikipedia.org/wiki/Jazz", ...]
 */
async function singleSearchScrape(query: string) {
	let ignore = [
		"google.com/preferences",
		"accounts.google",
		"google.com/webhp",
		"google.com/"
	]
	let url = new URL("https://www.google.com/search")
	url.searchParams.append("q", query)
	let response = await get(url.href, 60000)
	let anchorTags = response.match(/<a[\s]+([^>]+)>/gi) || []
	let urls: string[] = []
	for (let tag of anchorTags) {
		let link = tag.match(/".*?"/)?.[0] || ""
		let start = link.slice(1, 5)
		link = link.slice(1, -1).split("&")[0]
		if (
			start == "http" &&
			link != "" &&
			!includesSubstringFromArray(link, ignore) &&
			!urls.includes(link)
		) {
			urls.push(link)
		}
	}
	return urls
}

/**
 * Searches the given query using the custom search engine api
 *
 * In: "Jazz"
 *
 * Out: ["https://en.wikipedia.org/wiki/Jazz", ...]
 */
async function singleSearchApi(
	query: string,
	apikey: string,
	engineid: string
) {
	let url = new URL("https://www.googleapis.com/customsearch/v1")
	url.searchParams.append("q", query)
	url.searchParams.append("key", apikey)
	url.searchParams.append("cx", engineid)
	let response = JSON.parse(await get(url.href, 60000))
	if (response != undefined && response.items != undefined) {
		let urls = []
		for (let item of response.items) {
			urls.push(item.link)
		}
		return urls
	} else {
		return []
	}
}

/**
 * Downloads text of the urls given, or returns html if justText is false.
 *
 * In: ["http://example.com/", ...]
 * Out: ["Example Domain\n ...", ...]
 */
async function downloadWebsites(
	urls: string[],
	justText = true,
	verbose = false
) {
	let catchFunction = verbose ? console.log : () => {}
	let requests = []
	for (let i = 0; i < urls.length; i++) {
		requests.push(get(urls[i], 60000))
	}
	let responses = (await Promise.all(requests).catch(catchFunction)) || []
	let htmls = responses.map((e) => {
		if (typeof e == "string") return e
		else return ""
	})

	if (!justText) {
		return htmls
	}
	let texts = []
	let titles = []

	for (let i = 0; i < htmls.length; i++) {
		texts.push(html2text(htmls[i]))
		titles.push(getTitle(htmls[i]))
	}
	return [texts, titles]
}

//// Use section

/**
 * Class which represents a source, with the variable being source(its url), matches(array of class Match), and the
 * text
 */
class Source {
	source: string
	matches: Match[]
	text: string
	title: string
	constructor(source: string, matches: Match[], text: string, title: string) {
		this.source = source
		this.matches = matches
		this.text = text
		this.title = title
	}
}

/**
 * Represents a specific cluster, with extra funcionality
 */
class Match {
	cluster: number[][]
	source: string // TODO: Change this to "url"
	sourceTitle: string
	inputShingleStart: number = 0
	inputShingleEnd: number = 0
	comparedShingleStart: number = 0
	comparedShingleEnd: number = 0
	inputStart: number = 0
	inputEnd: number = 0
	comparedStart: number = 0
	comparedEnd: number = 0
	score: number = 0
	constructor(cluster: number[][], url: string, sourceTitle: string) {
		this.cluster = cluster
		this.source = url
		this.sourceTitle = sourceTitle
	}

	/**
	 * Finds the start and end of the match, and gives it an overall score equals to the amount of matches squared
	 * divided by the end minus start of the cluster, or the length times density, or zero if it is len zero
	 */
	contextualize(
		inputShingledIndicesList: number[][],
		comparedShingledIndicesList: number[][]
	) {
		let len = this.cluster.length
		this.inputShingleStart = this.inputShingleEnd = this.cluster[0][0]
		this.comparedShingleStart = this.comparedShingleEnd = this.cluster[0][1]
		for (let i = 1; i < len; i++) {
			if (this.cluster[i][0] < this.inputShingleStart) {
				this.inputShingleStart = this.cluster[i][0]
			} else if (this.cluster[i][0] > this.inputShingleEnd) {
				this.inputShingleEnd = this.cluster[i][0]
			}
			if (this.cluster[i][1] < this.comparedShingleStart) {
				this.comparedShingleStart = this.cluster[i][1]
			} else if (this.cluster[i][1] > this.comparedShingleEnd) {
				this.comparedShingleEnd = this.cluster[i][1]
			}
		}

		;[this.inputStart, this.inputEnd] = findClusterStartAndEnd(
			this.inputShingleStart,
			this.inputShingleEnd,
			inputShingledIndicesList
		)
		;[this.comparedStart, this.comparedEnd] = findClusterStartAndEnd(
			this.comparedShingleStart,
			this.comparedShingleEnd,
			comparedShingledIndicesList
		)

		if (this.inputShingleEnd - this.inputShingleStart > 1) {
			this.score =
				(this.cluster.length * this.cluster.length) /
				(this.inputShingleEnd - this.inputShingleStart)
		} else {
			this.score = 0
		}
	}

	/**
	 * Returns given the period indices the nearest period after it
	 */
	findNearestPeriod(periodIndices: number[], margin = 5): number | undefined {
		for (let i = 0; i < periodIndices.length; i++) {
			if (periodIndices[i] >= this.inputEnd - margin) {
				return periodIndices[i]
			}
		}
	}
}

/**
 * Takes th input text and searches the internet for similar texts, and finds matches between them.
 *
 * In: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in " +
 * "literature without prior coordination or asking for permission. More information..."
 *
 * Out: [Source{source: "http://www.example.com", matches = [Match{...}, ...], text = "Example Domain Example ..."},
 *  ...]
 */
async function match({
	text = "",
	language = english,
	shingleSize = 2,
	apikey = process.env.G_API_KEY || "",
	engineid = process.env.G_ENGINE_ID || "",
	maximumGap = 3,
	minimumClusterSize = 5,
	verbose = false
} = {}): Promise<Source[]> {
	const stemmer = snowball.newStemmer(language).stem
	let inputText = text
	let sources = []

	let [inputWords, inputIndicesList] = getWords(inputText)
	;[inputWords, inputIndicesList] = normalizeAndRemoveStopWords(
		inputWords,
		inputIndicesList,
		language
	)
	let [inputShingles, inputShingledIndicesList] = shingleAndStemmer(
		inputWords,
		inputIndicesList,
		shingleSize,
		stemmer
	)

	let limit = 32 //32 word limit on google search
	let len = Math.ceil(inputWords.length / limit)
	let searchQueries = []
	for (let i = 0; i < len; i++) {
		searchQueries.push(
			inputWords.slice(i * limit, (i + 1) * limit).join(" ")
		)
	}

	let usedUrls: string[] = [] // Urls that have already have been used.
	for (let query of searchQueries) {
		let comparedUrls: string[]
		if (apikey && engineid) {
			try {
				comparedUrls = await singleSearchApi(query, apikey, engineid)
			} catch {
				comparedUrls = await singleSearchScrape(query)
			}
		} else {
			comparedUrls = await singleSearchScrape(query)
		}

		comparedUrls = diff(comparedUrls, usedUrls) // New urls
		usedUrls = union(usedUrls, comparedUrls)

		let [comparedTexts, comparedTitles] = (await downloadWebsites(
			comparedUrls,
			true,
			verbose
		).catch(console.log)) || [[], []]
		for (let i = 0; i < comparedTexts.length; i++) {
			let [comparedWordsTemp, comparedIndicesListTemp] = getWords(
				comparedTexts[i]
			)

			;[comparedWordsTemp, comparedIndicesListTemp] =
				normalizeAndRemoveStopWords(
					comparedWordsTemp,
					comparedIndicesListTemp,
					language
				)

			let [comparedShinglesTemp, comparedShingledIndicesListTemp] =
				shingleAndStemmer(
					comparedWordsTemp,
					comparedIndicesListTemp,
					shingleSize,
					stemmer
				)

			let comparedClustersTemp = findUnionAndCluster(
				inputShingles,
				comparedShinglesTemp,
				maximumGap,
				minimumClusterSize
			) as number[][][]

			let matchesTemp = []
			for (let j = 0; j < comparedClustersTemp.length; j++) {
				matchesTemp.push(
					new Match(
						comparedClustersTemp[j],
						comparedUrls[i],
						comparedTitles[i]
					)
				)
				matchesTemp[j].contextualize(
					inputShingledIndicesList,
					comparedShingledIndicesListTemp
				)
			}

			sources.push(
				new Source(
					comparedUrls[i],
					matchesTemp,
					comparedTexts[i],
					comparedTitles[i]
				)
			)
		}
	}

	return sources
}

/**
 * Runs the match function and prints it
 */
async function matchPrint(matchArgs: Parameters<typeof match>, minScore = 5) {
	let text = matchArgs[0]?.text || ""
	let sources = (await match(matchArgs[0]).catch(console.log)) || []
	console.log("\n\n\nComparison")
	for (let source of sources) {
		for (let singleMatch of source.matches) {
			if (singleMatch.score >= minScore) {
				console.log(`\n\n\nFROM ${source.source}\n\n`)
				console.log(
					`ORIGINAL: ${text.slice(
						singleMatch.inputStart,
						singleMatch.inputEnd
					)}\n\n`
				)
				console.log(
					`COMPARED: ${source.text.slice(
						singleMatch.comparedStart,
						singleMatch.comparedEnd
					)}\n\n`
				)
				console.log(`SCORE: ${singleMatch.score}`)
			}
		}
	}
}

if (!inBrowser) {
	module.exports = {match, matchPrint}
} else {
	// @ts-ignore
	window.hooke = {match, matchPrint}
}
