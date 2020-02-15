const {it, works} = require("itworksjs")
const hooke = require(".")

it("should return matches on a plagiraised text (Sherlock Holmes Wikipedia)", async ()=>{
    sources = await hooke.match({inputText: "Sherlock Holmes (/ˈʃɜːrlɒk ˈhoʊmz/ or /-ˈhoʊlmz/) is a fictional private detective created by British author Sir Arthur Conan Doyle. Referring to himself as a consulting detective in the stories, Holmes is known for his proficiency with observation, deduction, forensic science, and logical reasoning that borders on the fantastic, which he employs when investigating cases for a wide variety of clients, including Scotland Yard."})
    if(sources.length == 0){
        throw new Error("No matches found for the Sherlock Holmes wikipedia Test")
    }
})

it("should be able to find matches for autocitation", async ()=>{
    [replacements, bibliography] = await hooke.autoCitation({text: "Sherlock Holmes (/ˈʃɜːrlɒk ˈhoʊmz/ or /-ˈhoʊlmz/) is a fictional private detective created by British author Sir Arthur Conan Doyle. Referring to himself as a consulting detective in the stories, Holmes is known for his proficiency with observation, deduction, forensic science, and logical reasoning that borders on the fantastic, which he employs when investigating cases for a wide variety of clients, including Scotland Yard."})
    if(replacements.length == 0){
        throw new Error("No replacements for Sherlock Holmes autocitation")
    }else if(bibliography == "\n\n\nBibliography\n\n"){
        throw new Error("Bibliography not filled for autocitation")
    }
})

works()