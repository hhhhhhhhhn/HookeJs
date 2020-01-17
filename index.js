var snowball = require('node-snowball');

function findSpaces(text) {
    /**
     * Takes a string as input, outputs indices of spaces in the string. Also, replaces all whitespace characters with spaces
     * and adds spaces at the beggining and start so it can be separated more easily in the getWords function
     * 
     * In: "Hello, my name is"
     * Out: [-1, 6, 9, 14, 17]
     */
    text = text.replace("\n", " ").replace("\t", " ").replace("\r", " ")
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

function normalizeAndremoveStopWords(words, indicesList, language = "english"){
    /**
     * Leaves only allowed characters on each word and lowers it, and then removes the stopwords (from stopwords.json)
     * 
     * In: [ 'Hello,', 'my', 'name', 'is', 'jazz' ] ,  [[ 0, 6 ], [ 7, 9 ], [ 10, 14 ], [ 15, 17 ], [20,25]]
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

function extendExcludingUnion(array1, array2){
    /**
     * Auxiliary function which unites two arrays, skipping duplicates
     * In: [1,2,4,5,7] , [3,4,5,6,7,8]
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

function findUnionAndCluster(shingles1, shingles2, maximumGap, minimumClusterSize){
    /**
     * Finds the points matching in both shingle sets, then finds the clusters in which they are close togather (a match)
     */
    var matches = [];
    var len1 = shingles1.length;
    var len2 = shingles2.length;
    for(var i = 0; i < len1; i++){
        for(var j = 0; j < len2; j++){
            if(shingles1[i] == shingles2[j]){
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
                        clusters[inCluster] = extendExcludingUnion(clusters[inCluster], clusters[j]) // Make the cluster its in the union between both
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
    return newClusters
};
