
const Bard = require("bard-ai");

async function main() {
  let myBard = new Bard("cgjMrMtQgEYtr3RbLdjd9bPnRq5l6cmHJSv8fBZrKk_RQ6z_n0CV_h9N1LegzF7Aon9NYg.");

  console.log(await myBard.ask("Hello, world!"));
}

main(); // Call the async function


