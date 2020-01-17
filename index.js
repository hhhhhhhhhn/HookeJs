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
    spaceIndices = [];
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
    words = [];
    indicesList = [];
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
    json = require('./stopwords.json');
    stopwords = json[language];
    regex = RegExp(json[language+"regex"][0], json[language+"regex"][1]); //All not allowed characters
    newWords = [];
    newIndicesList = [];
    len = words.length;
    for (i = 0; i < len; i++){
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
    words = snowball.stemword(words, language);
    shingles = [];
    shingledIndicesList = [];
    len = words.length - shingleSize + 1;
    for(var i = 0; i < len; i++){
        shingles.push(words.slice(i, i+shingleSize));
        shingledIndicesList.push([ indicesList[i][0] , indicesList[i + shingleSize - 1][1] ])
    };
    return [shingles, shingledIndicesList]
};
