
// Put imports here that you wish to use for script blocks in event sheets, e.g.:

// import * as myModule from "./mymodule.js";

// Then you can use 'myModule' in script blocks in event sheets.

const scriptsInEvents = {

	async EventSheet2_Event20_Act1(runtime, localVars)
	{
		localStorage.clear();
		console.log("Clear.");
		
	}
};

globalThis.C3.JavaScriptInEvents = scriptsInEvents;
