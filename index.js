//// Comparison section

var snowball = require('node-snowball');

function findSpaces(text) {
    /**
     * Takes a string as input, outputs indices of spaces in the string. Also, replaces all whitespace characters with spaces
     * and adds spaces at the beggining and start so it can be separated more easily in the getWords function
     * 
     * In: "Hello, my name is"
     * 
     * Out: [-1, 6, 9, 14, 17]
     */
    text = text.replace("\n", " ").replace("\t", " ").replace("\r", " ").replace(".", " ")
    var spaceIndices = [];
    var len = text.length;
    for (var i = 0; i < len; i++){
        if(text.charAt(i) == " "){
            spaceIndices.push(i);
        }
    }
    spaceIndices.unshift(-1);
    spaceIndices.push(text.length);
    return spaceIndices
};

function getWords(text, spaceIndices) {
    /**
     * Takes text and the output of the findSpaces function as inputs,
     * outputs list of words and list of their indices in the original string in formant [start, end]
     * 
     * In: "Hello, my name is", [-1, 6, 9, 14, 17]
     * 
     * Out: [   [ 'Hello,', 'my', 'name', 'is' ] ,
     * [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ]]   ]
     */
    var words = [];
    var indicesList = [];
    var len = spaceIndices.length - 1; //One is substracted because the for loop uses two elements
    for (var i = 0; i < len; i++) {
        if (spaceIndices[i + 1] - spaceIndices[i] > 1) {    //Doesn't count two spaces in a row
            var wordStart = spaceIndices[i] + 1, wordEnd = spaceIndices[i+1];
            words.push(text.slice(wordStart, wordEnd));
            indicesList.push([wordStart, wordEnd]);
        };
    };
    return [words, indicesList]
};

function normalizeAndRemoveStopWords(words, indicesList, language = "english"){
    /**
     * Leaves only allowed characters on each word and lowers it, and then removes the stopwords (from stopwords.json)
     * 
     * In: [ 'Hello,', 'my', 'name', 'is', 'jazz' ] ,  [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ], [20,25]]
     * 
     * Out: [ [ 'jazz' ], [ [ 20, 25 ] ] ]
     * (only jazz is not a stopword)
     */
    var json = require('./stopwords.json');
    var stopwords = json[language];
    var regex = RegExp(json[language+"regex"][0], json[language+"regex"][1]); //All not allowed characters
    var newWords = [];
    var newIndicesList = [];
    var len = words.length;
    for (var i = 0; i < len; i++){
        words[i] = words[i].toLowerCase().replace(regex, "");
        if (!stopwords.includes(words[i])){
            newWords.push(words[i]);
            newIndicesList.push(indicesList[i]);
        };
    };
    return [newWords, newIndicesList]
};

function shingleAndStemmer(words, indicesList, shingleSize = 1, language = "english"){
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
    var words = snowball.stemword(words, language);
    var shingles = [];
    var shingledIndicesList = [];
    var len = words.length - shingleSize + 1;
    for(var i = 0; i < len; i++){
        shingles.push(words.slice(i, i+shingleSize));
        shingledIndicesList.push([ indicesList[i][0] , indicesList[i + shingleSize - 1][1] ])
    };
    return [shingles, shingledIndicesList]
};

function union(array1, array2){
    /**
     * Auxiliary function which unites two arrays, skipping duplicates
     * 
     * In: [1,2,4,5,7] , [3,4,5,6,7,8]
     * 
     * Out: [1,2,4,5,7,3,6,8]
     */
    var len = array2.length
    for(var i = 0; i < len; i++){
        if(!array1.includes(array2[i])){
            array1.push(array2[i])
        };
    };
    return array1
};

function diff(array1, array2){
    /**
     * Auxiliary function which finds the difference of two arrays (based on the first one)
     * 
     * In: [1,2,3,4,9], [2,4,7,8]
     * 
     * Out: [1,3,9]
     */
    var output = []
    for(element of array1){
        if(!array2.includes(element)) output.push(element)
    }
    return output
}

function arraysEqual(array1, array2){
    /**
     * Auxiliary function which checks if the elements of both arrays are equal. If they are not arrays just checks if they are equal
     * 
     * In: [1,2,3,4], [2,4,3,1]
     * Out: false
     * 
     * In: [1,2,3,4], [1,2,3,4]
     * Out: true
     * 
     * In: [[1]], [[1]]
     * Out: false // because they are different entities and this function isn't recursive
     * 
     * In: 4,
     */
    if(array1 == array2){
        return true
    }
    if(array1.length != array2.length){
        return false
    };
    var len = array1.length;
    for(var i = 0; i < len; i++){
        if(array1[i] != array2[i]){
            return false
        };
    };
    return true;
};

function findUnionAndCluster(shingles1, shingles2, maximumGap = 3, minimumClusterSize = 1, returnMatches = false){
    /**
     * Finds the points matching in both shingle sets, then finds the clusters in which they are close togather (a match)
     * 
     * In: [["a"],["b"],["c"],["d"]], [["x"],["c"],["d"],["y"]], 2, 1
     * Out: [ [ [ 2, 1 ], [ 3, 2 ] ] ]    //Meaning there was one cluster, consisting of the indices 2 and 3 ("b" and "c") of the first array, and
     *                                    //indices 1 and 2 of the second array (also "b" and "c")
     * 
     * The returnMatches argument return the matches without any cluster done to them
     */
    var matches = [];
    var len1 = shingles1.length;
    var len2 = shingles2.length;
    for(var i = 0; i < len1; i++){
        for(var j = 0; j < len2; j++){
            if(arraysEqual(shingles1[i], shingles2[j])){
                matches.push([i,j])
            };
        };
    };
    //clustering
    var clusters = [];
    var len = matches.length;
    for(var i = 0; i < len; i++){    // For every matching point
        var inCluster = null;           // By default it is not in any cluster (It is null instead of false because false = 0 and 0 is a possible index)
        var clustersLen = clusters.length;
        for(var j = 0; j < clustersLen; j++){ // For each existing cluster
            var currentClusterLen = clusters[j].length;
            for(var k = 0; k < currentClusterLen; k++){ // For each point in that cluster
                if (Math.max( Math.abs(matches[i][0] - clusters[j][k][0]), Math.abs(matches[i][1] - clusters[j][k][1]) ) <= maximumGap){
                // if Chebyshev distance is small enough to be in the same cluster https://en.wikipedia.org/wiki/Chebyshev_distance
                    if (inCluster == null){          // if it isn't in any cluster
                        clusters[j].push(matches[i]);      // Add it to the cluster
                        inCluster = j                      // Mark that it is in that cluster
                    } else if (inCluster != j){        // if it already is in a cluster and that cluster isn't the on it's in
                        clusters[inCluster] = union(clusters[inCluster], clusters[j]) // Make the cluster its in the union between both
                        clusters[j] = []                //Empty the other one (This with the last line merges both clusters)
                    };
                };
            };
        };
        if (inCluster == null){      // If after checking in al clusters it isn't in one
            clusters.push([matches[i]]) // Create a cluster with just itself
        }
    };
    //Removing all clusters smaller than the minimum distance
    var newClusters = [];
    var len = clusters.length;
    for (var i = 0; i < len; i++){
        if (clusters[i].length >= minimumClusterSize){
            newClusters.push(clusters[i])
        };
    };
    if(returnMatches){
        return [newClusters, matches]
    }
    return newClusters
};

function findClusterStartAndEndRelativeToShingles(cluster){
    /**
     * Gets the beggining and end of both sources of a cluster in format [[startSource1, endSource1],[startSource2, endSource2]]
     * In: [[3,5],[4,5],[2,7]]
     * Out: [ [ 2, 4 ], [ 5, 7 ] ]
     */
    var len = cluster.length;
    var startSource1, endSource1, startSource2, endSource2;
    startSource1 = endSource1 = cluster[0][0];
    startSource2 = endSource2 = cluster[0][1];
    for(var i = 1; i < len; i++){
        if(cluster[i][0] < startSource1){
            startSource1 = cluster[i][0]
        }else if(cluster[i][0] > endSource1){
            endSource1 = cluster[i][0]
        };
        if(cluster[i][1] < startSource2){
            startSource2 = cluster[i][1]
        }else if(cluster[i][1] > endSource2){
            endSource2 = cluster[i][1]
        };
    };
    return [[startSource1, endSource1],[startSource2, endSource2]]
};

function findClusterStartAndEnd(shingleStart, shingleEnd, shingledIndicesList){
    /**
     * Returns the indices of matches based on the original text.
     * In: 0,2, [[1,4],[5,7],[8,9],[12,15]]
     * Out: [1, 9]
     */
    return [shingledIndicesList[shingleStart][0], shingledIndicesList[shingleEnd][1]]
};

//// Search section

const {google} = require('googleapis');
const customsearch = google.customsearch('v1');
const axios = require("axios");
const cheerio = require("cheerio")

function includesSubstringFromArray(string, array){
    /** Checks if a list contains a substring of the given string
     * 
     * In: "hello there", ["xyz", "thi", "re"]
     * 
     * Out: true
     */
    for(var substring of array){
        if(string.includes(substring)) return true
    }
    return false
}


function html2text(htmlCode){
    /**
     * Auxiliary function to convert html to plain text
     * 
     * Modified from EpokK @ https://stackoverflow.com/questions/15180173/convert-html-to-plain-text-in-js-without-browser-environment/15180206
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
    htmlCode = String(htmlCode)
    htmlCode = htmlCode.replace(/<style([\s\S]*?)<\/style>/gi, '');
    htmlCode = htmlCode.replace(/<script([\s\S]*?)<\/script>/gi, '');
    htmlCode = htmlCode.replace(/<[^>]+>/ig, ' ');
    return htmlCode
}

function getTitle(html){
    /** Gets contents inside title tag in html.
     * 
     * In: "<head> ... <title >HookeJs/index.js at master · oekshido/HookeJs</title> ... "
     * 
     * Out: HookeJs/index.js at master · oekshido/HookeJs
     */
    if(typeof html != typeof "string"){
        return ""
    }
    a = RegExp("title(.*?)/title","i")
    b =  RegExp(">(.*?)<","i")
    try{
        return html.match(a)[0].match(b)[0].slice(1,-1)
    }catch{
        return ""
    }
}

async function singleSearchScrape(query){
    /**Searches the given query scraping google
     * 
     * In: "Jazz"
     * 
     * Out: ["https://en.wikipedia.org/wiki/Jazz", ...]
     */
    headers = {
        "accept":"*/*",
        "accept-encoding": "identity;q=1, *;q=0",
        "accept-language": "en,es-CL;q=0.9,es;q=0.8",
        "range": "bytes=0-",
        "sec-fetch-site": "cross-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Mobile Safari/537.36"
    }
    ignore = [
        "google.com/preferences",
        "accounts.google"
    ]
    url = new URL("https://www.google.com/search")
    url.searchParams.append("q", query)
    response = await axios.get(url.href, {timeout: 60000})
    $ = cheerio.load(response.data)
    urls = []
    $('a').each( function () {
        var link = $(this).attr('href')
        if(link.slice(0,7) == "/url?q=" && !includesSubstringFromArray(link, ignore)){
            urls.push(link.slice(7).split("&")[0])
        }
     })
    return urls
}

async function singleSearchApi(query, apikey, engineid){
    /**Searches the given query using the custom search engine api
     * 
     * In: "Jazz"
     * 
     * Out: ["https://en.wikipedia.org/wiki/Jazz", ...]
     */
    var response = await customsearch.cse.list({cx: engineid, q: query, auth: apikey})
    if (response.data != undefined && response.data.items != undefined){
        var urls = []
        for(item of response.data.items){
            urls.push(item.link)
        }
        return urls

    }else{
        return []
    }
}

async function downloadWebsites(urls, justText = true){
    /**
     * Downloads text of the urls given, or returns html if justText is false.
     * 
     * In: ["http://example.com/", ...]
     * Out: ["Example Domain\n ...", ...]
     */
    var requests = [];
    for(var i = 0; i < urls.length; i++){
        requests.push(axios.get(urls[i], {timeout:60000}).catch(console.log))
    };
    var responses = await Promise.all(requests).catch(console.log);
    var htmls = [];

    for(var i = 0; i < responses.length; i++){
        if(responses[i] != undefined){
            htmls.push(responses[i].data)
        }else{
            htmls.push("")
        };
    };
    if(!justText){
        return htmls
    };
    var texts = []
    var titles = []

    for(var i = 0; i < htmls.length; i++){
        texts.push(html2text(htmls[i]))
        titles.push(getTitle(htmls[i]))
    };
    return [texts, titles]
}

//// Use section

class Source{
    /**
     * Class which represents a source, with the variable being source(its url), matches(array of class Match), and the text
     */
    constructor(source, matches, text, title){
        this.source = source;
        this.matches = matches;
        this.text = text;
        this.title = title;
    }
}

class Match{
    /**
     * Represents a specific cluster, with extra funcionality
     */
    constructor(cluster, source, sourceTitle){
        this.cluster = cluster;
        this.source = source;
        this.sourceTitle = sourceTitle;
    }
    contextualize(inputShingledIndicesList, comparedShingledIndicesList){
        /**
         * Finds the start and end of the match, and gives it an overall score equals to the amount of matches squared divided by the end minus start
         * of the cluster, or the length times density, or zero if it is len zero
         */
        [[this.inputShingleStart, this.inputShingleEnd],[this.comparedShingleStart, this.comparedShingleEnd]] = findClusterStartAndEndRelativeToShingles(this.cluster);
        [this.inputStart, this.inputEnd] = findClusterStartAndEnd(this.inputShingleStart, this.inputShingleEnd, inputShingledIndicesList);
        [this.comparedStart, this.comparedEnd] = findClusterStartAndEnd(this.comparedShingleStart, this.comparedShingleEnd, comparedShingledIndicesList);
        this.score = ((this.inputShingleEnd - this.inputShingleStart) > 1) ? (this.cluster.length * this.cluster.length) / (this.inputShingleEnd - this.inputShingleStart) : 0;
    }
    findNearestPeriod(periodIndices, margin = 5){
        /**
         * Returns given the period indices the nearest period after it
         */
        for(var i = 0; i < periodIndices.length; i++){
            if(periodIndices[i] >= this.inputEnd - margin){
                return periodIndices[i]
            }
        }
    }
}

async function match({text="", language="english", shingleSize = 2, apikey=process.env.G_API_KEY, engineid=process.env.G_ENGINE_ID, maximumGap=3, minimumClusterSize=5}={}){
    /**
     * Takes th input text and searches the internet for similar texts, and finds matches between them.
     * In: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission. More information..."
     * Out: [Source{source: "http://www.example.com", matches = [Match{...}, ...], text = "Example Domain Example ..."}, ...]
     */
    var inputText = text
    var sources = []

    var [inputWords, inputIndicesList] = getWords(inputText, findSpaces(inputText));
    var [inputWords, inputIndicesList] = normalizeAndRemoveStopWords(inputWords, inputIndicesList, language="english");
    var [inputShingles, inputShingledIndicesList] = shingleAndStemmer(inputWords, inputIndicesList, shingleSize, language);

    var limit = 32  //32 word limit on google search
    var len = Math.ceil(inputWords.length/limit)
    var searchQueries = []
    for(var i = 0; i < len; i++){
        searchQueries.push( inputWords.slice(i*limit, (i+1)*limit).join(" ") )
    }

    var usedUrls = []
    for(var query of searchQueries){
        if(apikey && engineid){
            try {
                var comparedUrls = await singleSearchApi(query, apikey, engineid)
            } catch {
                var comparedUrls = await singleSearchScrape(query)
            }
        }else{
            var comparedUrls = await singleSearchScrape(query)
        }

        comparedUrls = diff(comparedUrls, usedUrls)
        usedUrls = union(usedUrls, comparedUrls)

        var [comparedTexts, comparedTitles] = await downloadWebsites(comparedUrls, true).catch(console.log);
        for(var i = 0; i < comparedTexts.length; i++){
            var [comparedWordsTemp, comparedIndicesListTemp] = getWords(comparedTexts[i], findSpaces(comparedTexts[i]));
            var [comparedWordsTemp, comparedIndicesListTemp] = normalizeAndRemoveStopWords(comparedWordsTemp, comparedIndicesListTemp, language);
            var [comparedShinglesTemp, comparedShingledIndicesListTemp] = shingleAndStemmer(comparedWordsTemp, comparedIndicesListTemp, shingleSize, language);
            var comparedClustersTemp = findUnionAndCluster(inputShingles, comparedShinglesTemp, maximumGap ,minimumClusterSize);
            var matchesTemp = [];
            for(var j = 0; j < comparedClustersTemp.length; j++){
                matchesTemp.push(new Match(comparedClustersTemp[j], comparedUrls[i], comparedTitles[i]));
                matchesTemp[j].contextualize(inputShingledIndicesList, comparedShingledIndicesListTemp)
            }
            sources.push(new Source(comparedUrls[i], matchesTemp, comparedTexts[i], comparedTitles[i]))
        }
    }
    return sources
}

async function matchPrint({text="",minScore=5, language="english", shingleSize = 2, apikey=process.env.G_API_KEY, engineid=process.env.G_ENGINE_ID, maximumGap=3, minimumClusterSize=5}={}){
    /**
     * Runs thr match function and prints it
     */
    var sources = await match({text:text, language:language, shingleSize:shingleSize, apiKey:apikey, engineid:engineid, maximumGap:maximumGap, minimumClusterSize:minimumClusterSize}).catch(console.log);
    console.log("\n\n\nComparison")
    for(source of sources){
        for(match of source.matches){
            if(match.score >= minScore){
                console.log(`\n\n\nFROM ${source.source}\n`)
                console.log(`ORIGINAL: ${text.slice(match.inputStart, match.inputEnd)}\n\n`)
                console.log(`COMPARED: ${source.text.slice(match.comparedStart, match.comparedEnd)}`)
                console.log(`SCORE: ${match.score}`)
            }
        }
    }
}

function findIntervalUnionPercent(start1, end1, start2, end2){
    /**
     * Auxiliary function which finds a which fraction of the smallest intervals is intersecting the bigger one.
     * 
     * In: 3,5,0,4  i.e.  [3,5], [0,4]
     * 
     * Out: 0.5
     */
    if(start2 > end1 || start1 > end2){
        return 0
    }else{
        return (Math.min(end1, end2) - Math.max(start1, start2)) / Math.min(end1 - start1, end2 -  start2)
    };
}

function findCharacterInText(text, character, setLastCharacter = true){
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
    var indices = []
    for(var i = 0; i < text.length; i++){
        if(text.charAt(i) == character){
            indices.push(i)
        }
    };
    if(setLastCharacter){
        indices.push(text.length)
    };
    return indices
}

function isSubstringUnique(string, substring){
    return (string.split(substring).length) == 2
}

function findUniqueSubstring(text, replacementIndex, minimumSize = 10){
    /**
     * Finds unique substring stopping in the given index.
     * 
     * In: "abc.zbc.wcm.", 7, 2
     * 
     * Out: "zbc"
    */
    while(minimumSize < replacementIndex){
        if (isSubstringUnique(text, text.slice(replacementIndex - minimumSize, replacementIndex))){     //If slice is unique
            return text.slice(replacementIndex - minimumSize, replacementIndex)
        }
        minimumSize++
    }
    return text.slice(0, replacementIndex)
}

async function autoCitation({text="", replace = false, language="english", shingleSize = 2, apikey=process.env.G_API_KEY, engineid=process.env.G_ENGINE_ID, maximumGap=3, minimumClusterSize=5, percentToMerge = 0.6}={}){
    /**
     * Uses previous functions to automatically generate texts to be replaced and a bibliography based on the internet
     * 
     * In: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission. More information. Hello there, this is not part of the match"
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
     * In: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission. Hello there, this is not part of the match", true
     * 
     * Out: "Example Domain This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission[1]. Hello there, this is not part of the match
     *
     *
     * Bibliography
     *
     * [1] Example Domain (n.d.). Retrieved from https://example.com/"
     */
    var sources = await match({text:text, language:language, shingleSize:shingleSize, apiKey:apikey, engineid:engineid, maximumGap:maximumGap, minimumClusterSize:minimumClusterSize}).catch(console.log);
    var matches = []
    for(var i = 0; i < sources.length; i++){
        Array.prototype.push.apply(matches, sources[i].matches)
    }
    var finalMatches = []
    for(var i = 0; i < matches.length; i++){
        if(matches[i].score < 1){
            willBeOnFinal = false;
            continue
        }
        var willBeOnFinal = true;
        for(var j = 0; j < matches.length; j++){
            if (findIntervalUnionPercent(matches[i].inputShingleStart, matches[i].inputShingleEnd, matches[j].inputShingleStart, matches[j].inputShingleEnd) >= percentToMerge){
                if(matches[i].score < matches[j].score && i!=j){
                    willBeOnFinal = false
                }else if(matches[i].score == matches[j].score && i!=j){
                    if(i < j){
                        willBeOnFinal = false
                    }
                }
            }
        }
        if(willBeOnFinal){
            finalMatches.push(matches[i])
        }
    }
    var periodIndices = findCharacterInText(text, ".")
    var bibliography = "\n\n\nBibliography\n\n"
    var replacements = {}
    var usedUrls = ["placeholder because people don't count from 0"]
    for(var i = 0; i < finalMatches.length; i++){
        var matchPeriodIndex = finalMatches[i].findNearestPeriod(periodIndices)
        var replacement = findUniqueSubstring(text, matchPeriodIndex)
        if(!usedUrls.includes(finalMatches.source)){
            replacements[replacement] = replacement + `[${usedUrls.length}]`
            bibliography += `[${usedUrls.length}] ${finalMatches[i].sourceTitle} (n.d.). Retrieved from ${finalMatches[i].source}\n`
            usedUrls.push(finalMatches[i].source)
        }else{
            replacements[replacement] = replacement + `[${usedUrls.indexOf(finalMatches[i].length)}]`
        }
    }
    if(!replace){
        return [replacements, bibliography]
    }
    for(var [replacedText, replacement] of Object.entries(replacements)){
        text = text.replace(replacedText, replacement)
    }
    return text + bibliography
};

module.exports = {match, autoCitation, matchPrint}