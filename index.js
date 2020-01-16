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
    spaceIndices.unshift(-1)
    spaceIndices.push(text.length)
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
    words = []
    indicesList = []
    var len = spaceIndices.length - 1; //One is substracted because the for loop uses two elements
    for (var i = 0; i < len; i++) {
        if (spaceIndices[i + 1] - spaceIndices[i] > 1) {    //Doesn't count two spaces in a row
            var wordStart = spaceIndices[i] + 1, wordEnd = spaceIndices[i+1];
            words.push(text.slice(wordStart, wordEnd))
            indicesList.push([wordStart, wordEnd])
        }
    }
    return [words, indicesList]
};

function removeStopWords(words, language = "english"){
    
}