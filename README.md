# HookeJs
An open source plagiarism detector and autocitation built in node.

## Installation
```
npm install hookejs
```

## Usage
For auto-citation:
```javascript
hooke = require('hookejs')
plagiarisedText = `In information theory, linguistics and computer science, the Levenshtein distance is a string metric for measuring the difference between two sequences`
citedText = hooke.autoCitation({text: plagiarisedText, replace: true})
console.log(citedText)
```
For plagiarism detection:
```javascript
hooke = require('hookejs')
plagiarisedText = `Sherlock Holmes (/ˈʃɜːrlɒk ˈhoʊmz/ or /-ˈhoʊlmz/) is a fictional private detective created by British author Sir Arthur Conan Doyle. Referring to himself as a "consulting detective" in the stories, Holmes is known for his proficiency with observation, deduction, forensic science, and logical reasoning that borders on the fantastic, which he employs when investigating cases for a wide variety of clients, including Scotland Yard.`
hooke.matchPrint({text:plagiarisedText})
```


## Functions
- `match`:
Returns `Source` objects with a list of `Match` objects, which include the matched text start, end, a calculated score and a few more variables.

- `matchPrint`: Prints `match` results in an understandable manner.

- `autoCitation`:
Returns the given text with citations (using the `match` function) or the replacements needed to make the citation and the bibliography (controlled by the `replace` parameter)

## Note
This package can a google custom search api key and engine id, which can be accesed through function parameters or the G_API_KEY and G_ENGINE_ID enviroment variables. If not provided, it will scrape the results (use at your own risk)
