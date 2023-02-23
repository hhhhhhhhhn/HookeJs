# HookeJs

![](https://github.com/oekshido/HookeJs/workflows/Node.js%20CI/badge.svg)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

An open source plagiarism detector built in node.

## Installation

```
npm install hookejs
```

## Usage

For plagiarism detection:

```javascript
hooke = require("hookejs")
plagiarisedText = `Sherlock Holmes (/ˈʃɜːrlɒk ˈhoʊmz/ or /-ˈhoʊlmz/) is a fictional private detective created by British author Sir Arthur Conan Doyle. Referring to himself as a "consulting detective" in the stories, Holmes is known for his proficiency with observation, deduction, forensic science, and logical reasoning that borders on the fantastic, which he employs when investigating cases for a wide variety of clients, including Scotland Yard.`
hooke.matchPrint({text: plagiarisedText})
```

## Functions

-   `match`:
    Returns `Source` objects with a list of `Match` objects, which include the matched text start, end, a calculated score and a few more variables.

-   `matchPrint`: Prints `match` results in an understandable manner.

## Note

This package can a google custom search API key and engine id, which can be accessed through function parameters or the G_API_KEY and G_ENGINE_ID environment variables. If not provided, it will scrape the results (use at your own risk)
