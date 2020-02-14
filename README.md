# HookeJs
An open source plagiarism detector and autocitation built in node.

## Installation
```
npm install hookejs
```

## Usage
```javascript
hooke = require('hookejs')
plagiarisedText = `In information theory, linguistics and computer science, the Levenshtein distance is a string metric for measuring the difference between two sequences`
citedText = hooke.autoCitation({text: plagiarisedText, replace: true})
console.log(citedText)
```


## Functions
- `match`:
Returns `Source` objects with a list of `Match` objects, which include the matched text start, end, a calculated score and a few more variables.

- `autoCitation`:
Returns the given text with citations (using the `match` function) or the replacements needed to make the citation and the bibliography (controlled by the `replace` parameter)

## Note
This package (for now) requires a google custom search api key and engine id, which can be accesed through function parameters or the G_API_KEY and G_ENGINE_ID enviroment variables. 
