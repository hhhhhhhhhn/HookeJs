const snowball = require("snowball-stemmers")
const inBrowser = typeof window != "undefined"

//// Request section

if (inBrowser) {
	/**
	 * Simple http request.
	 *
	 * In: "http://example.com", 60000
	 *
	 * Out: "<html><head><title>Example Domain</title>..."
	 */
	function get(url, timeout) {
		return new Promise((resolve, reject) => {
			var out = setTimeout(() => {
				reject("Request Timed Out")
			}, timeout)
			var req = new XMLHttpRequest()
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

	/**
	 * Simple http request.
	 *
	 * In: "http://example.com", 60000
	 *
	 * Out: "<html><head><title>Example Domain</title>..."
	 */
	function get(url, timeout) {
		return new Promise((resolve, reject) => {
			var out = setTimeout(() => {
				reject("Request Timed Out")
			}, timeout)
			var data = ""
			const handler = (res) => {
				res.on("data", (d) => {
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
 * Takes a string as input, outputs indices of spaces in the string. Also, replaces all whitespace characters with
 * spaces and adds spaces at the beggining and start so it can be separated more easily in the getWords function
 *
 * In: "Hello, my name is"
 *
 * Out: [-1, 6, 9, 14, 17]
 */
function findSpaces(text) {
	text = text
		.replace("\n", " ")
		.replace("\t", " ")
		.replace("\r", " ")
		.replace(".", " ")
	var spaceIndices = []
	var len = text.length
	for (var i = 0; i < len; i++) {
		if (text.charAt(i) == " ") {
			spaceIndices.push(i)
		}
	}
	spaceIndices.unshift(-1)
	spaceIndices.push(text.length)
	return spaceIndices
}

/**
 * Takes text and the output of the findSpaces function as inputs, outputs list of words and list of their indices
 * in the original string in formant [start, end]
 *
 * In: "Hello, my name is", [-1, 6, 9, 14, 17]
 *
 * Out: [   [ 'Hello,', 'my', 'name', 'is' ] ,
 * [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ]]   ]
 */
function getWords(text) {
	var spaceIndices = findSpaces(text)
	var words = []
	var indicesList = []
	var len = spaceIndices.length - 1 // One is substracted because the for
	for (var i = 0; i < len; i++) {
		// loop uses two elements
		if (spaceIndices[i + 1] - spaceIndices[i] > 1) {
			// Doesn't count two spaces in a row
			var wordStart = spaceIndices[i] + 1,
				wordEnd = spaceIndices[i + 1]
			words.push(text.slice(wordStart, wordEnd))
			indicesList.push([wordStart, wordEnd])
		}
	}
	return [words, indicesList]
}

/**
 * Leaves only allowed characters on each word and lowers it, and then removes the stopwords (from stopwords.json)
 *
 * In: [ 'Hello,', 'my', 'name', 'is', 'jazz' ] ,  [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ], [20,25]]
 *
 * Out: [ [ 'jazz' ], [ [ 20, 25 ] ] ]
 * (only jazz is not a stopword)
 */
function normalizeAndRemoveStopWords(words, indicesList, language = "english") {
	var json = require("./stopwords.json")
	var stopwords = json[language]
	var regex = RegExp(json[language + "regex"][0], json[language + "regex"][1]) // All non-allowed characters
	var newWords = []
	var newIndicesList = []
	var len = words.length
	for (var i = 0; i < len; i++) {
		words[i] = words[i].toLowerCase().replace(regex, "")
		if (!stopwords.includes(words[i])) {
			newWords.push(words[i])
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
function shingleAndStemmer(words, indicesList, shingleSize, stemmer) {
	var words = words.map(stemmer.stem)
	var shingles = []
	var shingledIndicesList = []
	var len = words.length - shingleSize + 1
	for (var i = 0; i < len; i++) {
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
function union(array1, array2) {
	var len = array2.length
	for (var i = 0; i < len; i++) {
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
function diff(array1, array2) {
	var output = []
	for (element of array1) {
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
function arraysEqual(array1, array2) {
	if (array1 == array2) {
		return true
	}
	if (array1.length != array2.length) {
		return false
	}
	var len = array1.length
	for (var i = 0; i < len; i++) {
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
	shingles1,
	shingles2,
	maximumGap = 3,
	minimumClusterSize = 1,
	returnMatches = false
) {
	var matches = []
	for (var i = 0; i < shingles1.length; i++) {
		for (var j = 0; j < shingles2.length; j++) {
			if (arraysEqual(shingles1[i], shingles2[j])) {
				matches.push([i, j])
			}
		}
	}
	//clustering
	var clusters = []
	for (var i = 0; i < matches.length; i++) {
		// For every matching point
		var inCluster = null // By default it is not in any cluster
		var clustersLen = clusters.length // (false == 0 so it's not used)
		for (var j = 0; j < clustersLen; j++) {
			// For each existing cluster
			var currentClusterLen = clusters[j].length
			for (var k = 0; k < currentClusterLen; k++) {
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
	var newClusters = []
	for (var i = 0; i < clusters.length; i++) {
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
function findClusterStartAndEnd(shingleStart, shingleEnd, shingledIndicesList) {
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
function includesSubstringFromArray(string, array) {
	for (var substring of array) {
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
function html2text(htmlCode) {
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
function getTitle(html) {
	if (typeof html != "string") {
		return ""
	}
	var a = RegExp("title(.*?)/title", "i")
	var b = RegExp(">(.*?)<", "i")
	try {
		return html.match(a)[0].match(b)[0].slice(1, -1)
	} catch {
		return ""
	}
}

/**
 * Searches the given query scraping google
 *
 * In: "Jazz"
 * Out: ["https://en.wikipedia.org/wiki/Jazz", ...]
 */
async function singleSearchScrape(query) {
	var ignore = [
		"google.com/preferences",
		"accounts.google",
		"google.com/webhp"
	]
	var url = new URL("https://www.google.com/search")
	url.searchParams.append("q", query)
	var response = await get(url.href, 60000)
	var anchorTags = response.match(/<a[\s]+([^>]+)>/gi)
	var urls = []
	for (var tag of anchorTags) {
		var link = tag.match(/".*?"/)[0]
		var start = link.slice(1, 5)
		link = link.slice(1, -1).split("&")[0]
		if (
			start == "http" &&
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
async function singleSearchApi(query, apikey, engineid) {
	var url = new URL("https://www.googleapis.com/customsearch/v1")
	url.searchParams.append("q", query)
	url.searchParams.append("key", apikey)
	url.searchParams.append("cx", engineid)
	var response = JSON.parse(await get(url.href, 60000))
	if (response != undefined && response.items != undefined) {
		var urls = []
		for (item of response.items) {
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
async function downloadWebsites(urls, justText = true, verbose = false) {
	var catchFunction = verbose ? console.log : () => {}
	var requests = []
	for (var i = 0; i < urls.length; i++) {
		requests.push(get(urls[i], 60000).catch(catchFunction))
	}
	var responses = await Promise.all(requests).catch(catchFunction)
	var htmls = responses.map((e) => {
		if (typeof e == "string") return e
		else return ""
	})

	if (!justText) {
		return htmls
	}
	var texts = []
	var titles = []

	for (var i = 0; i < htmls.length; i++) {
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
	constructor(source, matches, text, title) {
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
	constructor(cluster, source, sourceTitle) {
		this.cluster = cluster
		this.source = source
		this.sourceTitle = sourceTitle
	}

	/**
	 * Finds the start and end of the match, and gives it an overall score equals to the amount of matches squared
	 * divided by the end minus start of the cluster, or the length times density, or zero if it is len zero
	 */
	contextualize(inputShingledIndicesList, comparedShingledIndicesList) {
		var len = this.cluster.length
		this.inputShingleStart = this.inputShingleEnd = this.cluster[0][0]
		this.comparedShingleStart = this.comparedShingleEnd = this.cluster[0][1]
		for (var i = 1; i < len; i++) {
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
	findNearestPeriod(periodIndices, margin = 5) {
		for (var i = 0; i < periodIndices.length; i++) {
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
	language = "english",
	shingleSize = 2,
	apikey = process.env.G_API_KEY,
	engineid = process.env.G_ENGINE_ID,
	maximumGap = 3,
	minimumClusterSize = 5,
	verbose = false
} = {}) {
	const stemmer = snowball.newStemmer(language)
	var inputText = text
	var sources = []

	var [inputWords, inputIndicesList] = getWords(inputText)
	var [inputWords, inputIndicesList] = normalizeAndRemoveStopWords(
		inputWords,
		inputIndicesList,
		language
	)
	var [inputShingles, inputShingledIndicesList] = shingleAndStemmer(
		inputWords,
		inputIndicesList,
		shingleSize,
		stemmer
	)

	var limit = 32 //32 word limit on google search
	var len = Math.ceil(inputWords.length / limit)
	var searchQueries = []
	for (var i = 0; i < len; i++) {
		searchQueries.push(
			inputWords.slice(i * limit, (i + 1) * limit).join(" ")
		)
	}

	var usedUrls = []
	for (var query of searchQueries) {
		if (apikey && engineid) {
			try {
				var comparedUrls = await singleSearchApi(
					query,
					apikey,
					engineid
				)
			} catch {
				var comparedUrls = await singleSearchScrape(query)
			}
		} else {
			var comparedUrls = await singleSearchScrape(query)
		}

		var comparedUrls = diff(comparedUrls, usedUrls)
		var usedUrls = union(usedUrls, comparedUrls)

		var [comparedTexts, comparedTitles] = await downloadWebsites(
			comparedUrls,
			true,
			verbose
		).catch(console.log)
		for (var i = 0; i < comparedTexts.length; i++) {
			var [comparedWordsTemp, comparedIndicesListTemp] = getWords(
				comparedTexts[i]
			)

			var [
				comparedWordsTemp,
				comparedIndicesListTemp
			] = normalizeAndRemoveStopWords(
				comparedWordsTemp,
				comparedIndicesListTemp,
				language
			)

			var [
				comparedShinglesTemp,
				comparedShingledIndicesListTemp
			] = shingleAndStemmer(
				comparedWordsTemp,
				comparedIndicesListTemp,
				shingleSize,
				stemmer
			)

			var comparedClustersTemp = findUnionAndCluster(
				inputShingles,
				comparedShinglesTemp,
				maximumGap,
				minimumClusterSize
			)

			var matchesTemp = []
			for (var j = 0; j < comparedClustersTemp.length; j++) {
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
async function matchPrint({
	text = "",
	minScore = 5,
	language = "english",
	shingleSize = 2,
	apikey = process.env.G_API_KEY,
	engineid = process.env.G_ENGINE_ID,
	maximumGap = 3,
	minimumClusterSize = 5
} = {}) {
	var sources = await match({
		text: text,
		language: language,
		shingleSize: shingleSize,
		apiKey: apikey,
		engineid: engineid,
		maximumGap: maximumGap,
		minimumClusterSize: minimumClusterSize
	}).catch(console.log)
	console.log("\n\n\nComparison")
	for (source of sources) {
		for (var singleMatch of source.matches) {
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

/**
 * Auxiliary function which finds a which fraction of the smallest intervals is intersecting the bigger one.
 *
 * In: 3,5,0,4  i.e.  [3,5], [0,4]
 *
 * Out: 0.5
 */
function findIntervalUnionPercent(start1, end1, start2, end2) {
	if (start2 > end1 || start1 > end2) {
		return 0
	} else {
		return (
			(Math.min(end1, end2) - Math.max(start1, start2)) /
			Math.min(end1 - start1, end2 - start2)
		)
	}
}

/**
 * Auxuliary function similar to findSpaces, adapted to any character and without whitespace modification.
 *
 * In: "ABC.DFGH.IJ", ".", true
 *
 * Out: [ 3, 8, 11 ]
 *
 * In: "ABC.DFGH.IJ", ".", false
 *
 * Out: [ 3, 8 ]
 */
function findCharacterInText(text, character, setLastCharacter = true) {
	var indices = []
	for (var i = 0; i < text.length; i++) {
		if (text.charAt(i) == character) {
			indices.push(i)
		}
	}
	if (setLastCharacter) {
		indices.push(text.length)
	}
	return indices
}

function isSubstringUnique(string, substring) {
	return string.split(substring).length == 2
}

/**
 * Finds unique substring stopping in the given index.
 *
 * In: "abc.zbc.wcm.", 7, 2
 *
 * Out: "zbc"
 */
function findUniqueSubstring(text, replacementIndex, minimumSize = 10) {
	while (minimumSize < replacementIndex) {
		if (
			isSubstringUnique(
				text,
				text.slice(replacementIndex - minimumSize, replacementIndex)
			)
		) {
			//If slice is unique
			return text.slice(replacementIndex - minimumSize, replacementIndex)
		}
		minimumSize++
	}
	return text.slice(0, replacementIndex)
}

/**
 * Uses previous functions to automatically generate texts to be replaced and a bibliography based on the internet
 *
 * In: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in" +
 * "literature without prior coordination or asking for permission. More information. Hello there, this is not " +
 * "part of the match"
 *
 * Out: [
 * [ [ 'nformation', 'nformation[1]' ] ],
 *  '\n' +
 *      '\n' +
 *      '\n' +
 *      'Bibliography\n' +
 *      '\n' +
 *      '[1] Example Domain (n.d.). Retrieved from https://example.com/\n'
 *  ]
 *
 * In: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in " +
 * "literature without prior coordination or asking for permission. Hello there, this is not part of the match",true
 *
 * Out: `Example Domain This domain is for use in illustrative examples in documents. You may use this domain in
 * literature without prior coordination or asking for permission[1]. Hello there, this is not part of the match
 *
 *
 * Bibliography
 *
 * [1] Example Domain (n.d.). Retrieved from https://example.com/"`
 */
async function autoCitation({
	text = "",
	replace = false,
	language = "english",
	shingleSize = 2,
	apikey = process.env.G_API_KEY,
	engineid = process.env.G_ENGINE_ID,
	maximumGap = 3,
	minimumClusterSize = 5,
	percentToMerge = 0.6,
	verbose = false
} = {}) {
	var sources = await match({
		text: text,
		language: language,
		shingleSize: shingleSize,
		apiKey: apikey,
		engineid: engineid,
		maximumGap: maximumGap,
		minimumClusterSize: minimumClusterSize,
		verbose: verbose
	}).catch(console.log)

	var matches = []
	for (var i = 0; i < sources.length; i++) {
		Array.prototype.push.apply(matches, sources[i].matches)
	}
	var finalMatches = []
	for (var i = 0; i < matches.length; i++) {
		if (matches[i].score < 1) {
			willBeOnFinal = false
			continue
		}
		var willBeOnFinal = true
		for (var j = 0; j < matches.length; j++) {
			if (
				findIntervalUnionPercent(
					matches[i].inputShingleStart,
					matches[i].inputShingleEnd,
					matches[j].inputShingleStart,
					matches[j].inputShingleEnd
				) >= percentToMerge
			) {
				if (matches[i].score < matches[j].score && i != j) {
					willBeOnFinal = false
				} else if (matches[i].score == matches[j].score && i != j) {
					if (i < j) {
						willBeOnFinal = false
					}
				}
			}
		}
		if (willBeOnFinal) {
			finalMatches.push(matches[i])
		}
	}
	var periodIndices = findCharacterInText(text, ".")
	var bibliography = "\n\n\nBibliography\n\n"
	var replacements = {}
	var usedUrls = ["placeholder because people don't count from 0"]
	for (var fMatch of finalMatches) {
		var matchPeriodIndex = fMatch.findNearestPeriod(periodIndices)
		var replacement = findUniqueSubstring(text, matchPeriodIndex)
		if (!usedUrls.includes(finalMatches.source)) {
			replacements[replacement] = replacement + `[${usedUrls.length}]`
			bibliography +=
				`[${usedUrls.length}] ${fMatch.sourceTitle} (n.d.). Retrieved` +
				` from ${fMatch.source}\n`
			usedUrls.push(fMatch.source)
		} else {
			replacements[replacement] =
				replacement + `[${usedUrls.indexOf(fMatch.length)}]`
		}
	}
	if (!replace) {
		return [replacements, bibliography]
	}
	for (var [replacedText, replacement] of Object.entries(replacements)) {
		text = text.replace(replacedText, replacement)
	}
	return text + bibliography
}

if (!inBrowser) {
	module.exports = {match, autoCitation, matchPrint}
} else {
	window["hooke"] = {match, autoCitation, matchPrint}
}
