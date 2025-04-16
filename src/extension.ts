// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { execSync } from 'child_process';
import path = require('path');
import * as os from 'os';




// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
let myStatusBarItem: vscode.StatusBarItem;
// define global variables
declare global {
	var doc_words:number; // the word count of the whole tex document
	var sel_words:number;  // the selection word count
	var label:any;         // text will be showed in the status bar 
	var  isShow:boolean;
	var scrollTimer:any;
	var timeout:number;
	var tmpfile:any;
}

export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "latex-wordcount" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	// let disposable = vscode.commands.registerCommand('latex-wordcount.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from latex-wordcount!');
	// });

	

	// context.subscriptions.push(disposable);
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,100);
	myStatusBarItem.command = "latex-wordcount.label";
	myStatusBarItem.text="texwords";
	myStatusBarItem.show();




	// get configuration from vscode config
	const key:string="latex-wordcount.label"
	globalThis.label=vscode.workspace.getConfiguration().get(key);
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(()=>{
		globalThis.label=vscode.workspace.getConfiguration().get(key);
	}));

	const key2="latex-wordcount.selectTimeOut";
	globalThis.timeout=vscode.workspace.getConfiguration().get<number>(key2,500);
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(()=>{
		globalThis.timeout=vscode.workspace.getConfiguration().get<number>(key2,500);
	}));


	// globalThis.tmpdir=os.tmpdir();
	globalThis.tmpfile=path.join(os.tmpdir(),"_selection.tex")

	globalThis.sel_words=0;
	globalThis.doc_words=0;
	
	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(getDocWords));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(SelectionChange));
	

	// detecte the language on openfile and changeTab
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(getDocWords));
	// context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(getDocWords));
	// checkDocLanguage();
	getDocWords();

}

// check the language and return true only if language is tex or latex.
function checkDocLanguage():void{
	let language=vscode.window.activeTextEditor?.document.languageId;
	console.log("lan:"+language);
	if (language=="latex" || language=='tex'){
		globalThis.isShow=true;
	}else{
		globalThis.isShow=false;
	}
}


function showItem():void{
	let txt="";
	txt=`${globalThis.label}：${globalThis.sel_words}/${globalThis.doc_words}`;
	// if (globalThis.doc_words=0){
	// 	txt=`${globalThis.label}：0`;
	// }


	// if (globalThis.sel_words>0 && globalThis.doc_words>0){
	// 	txt=`${globalThis.label}：${globalThis.sel_words}/${globalThis.doc_words}`;
	// }else if(globalThis.sel_words<=0 && globalThis.doc_words>0){
	// 	txt=`${globalThis.label}：${globalThis.doc_words}`;
	// }
	// else if(globalThis.sel_words>0 &&  globalThis.doc_words<=0){
	// 	txt=`${globalThis.label}：${globalThis.sel_words}`;
	// }else{
	// 	txt=`${globalThis.label}：0`;
	// }

	// if (txt==''){
	// 	myStatusBarItem.hide()
	// }else{
	// 	myStatusBarItem.text=txt;
	// 	myStatusBarItem.show()
	// }
	myStatusBarItem.text=txt;
	myStatusBarItem.show()
	
}


function getDocWords():void{
	checkDocLanguage();
	// just work for latex and tex
	if (!globalThis.isShow){
		myStatusBarItem.hide();
		return
	}
	let editor=vscode.window.activeTextEditor;
	let doc=editor?.document.fileName;
	let cmdOutputBrief = 'texcount -brief -nosubs -sum  '+doc;

	// Store output of texcount to a string
	let reg=/(\d+):\s*File:.*/;
	let texOut = execSync(cmdOutputBrief).toString();
	let regRet=reg.exec(texOut)
	if (regRet!=null){
		let doc_words=regRet[1];
		globalThis.doc_words=Number(doc_words);
		
	}
	showItem();
	
}

function SelectionChange():void{
	checkDocLanguage();
	if (!globalThis.isShow){
		myStatusBarItem.hide();
		return
	}

	try{
		clearTimeout(globalThis.scrollTimer);
		globalThis.scrollTimer = setTimeout(getSelectionWords,globalThis.timeout);
		console.log("selection finished");
	}catch(error){
		console.log("selection Change Error",error);
	}
	

}


function getSelectionWords():void{
	if (!globalThis.isShow){
		myStatusBarItem.hide();
		return
	}
	const editor=vscode.window.activeTextEditor;
	if (editor==null) return;
	let Selection=editor.selection;
	if(Selection.isEmpty){
		globalThis.sel_words=0;
		showItem();
		return;
	}
	let text=editor.document.getText(Selection);
	console.log(text);
	globalThis.tmpfile
	// fs.writeFileSync('__selection.tex',text,{'flag':'w+'});
	// let cmdOutputBrief = 'texcount -brief -nosubs -sum  __selection.tex';
	fs.writeFileSync(globalThis.tmpfile,text,{'flag':'w+'});
	let cmdOutputBrief = 'texcount -brief -nosubs -sum  '+ globalThis.tmpfile;
	// Store output of texcount to a string
	let reg=/(\d+):\s*File:.*/;
	let texOut = execSync(cmdOutputBrief).toString();
	try{
		let words=reg.exec(texOut);
		if (words){
			var _ws=String(words[1]);
			globalThis.sel_words=Number(_ws);
			showItem();
		}
	}catch(error){
		console.log(error);
	}
	
}

// this method is called when your extension is deactivated
export function deactivate() {
	if (myStatusBarItem){
		myStatusBarItem.hide();
		myStatusBarItem.dispose();
	}
}
