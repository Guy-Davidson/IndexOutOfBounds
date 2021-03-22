import express from 'express';
import bodyParser = require('body-parser');
import { Ticket } from '../client/src/api';


/*
  Super Search Description:
    I considered three option for the super search.
    One is to link a data base that can SELECT the data with speed,
    but I don't know if we're allowed to or if you will be able to use it, so I neglected that Idea.

    second was to use the fastest algorithm for string search like: Knuth–Morris–Pratt algorithm
    or Boyer–Moore string-search algorithm, I've looked into them but found out that there already
    perfectly implmented, so using them is a matter of a simple import.

    Lastly I've decided to implement my own searching algorithm.
    The algorithm that I've choose is a Search Tree - Hash combination.
    Every Node is a character, and while building the DB, if we reach a word end,
    The Node will save the matching Ticket ID.

    the Tree depth is O(|W|), while each search in a Node for the right char is O(1),
    so the total for building the Tree is: O(n) where n is the size of the DB,
    and fetching the matching ticket id's is O(|W|), and filtering the tickets
    is W.C O(n), but because the client is likly to ask for a small number of results,
    we will probaly finish much faster.
*/

interface Dictionary<T> {
    [Key: string]: T;
}

export type Node = {
  letter: string,
  childNodes: Dictionary<Node>,
  matchingID: string[],
}

export function initTree(db: Ticket[]){
  let root: Node = {letter: 'root', childNodes: {}, matchingID: []};
  db.forEach((t: Ticket) => {
    t.title.split(' ').forEach(word => insertWord(toLowerCaseLetters(word), t.id, root));
    t.content.split(' ').forEach(word => insertWord(toLowerCaseLetters(word), t.id, root));
  })
  return root;
}

function insertWord(word: string, id: string, root: Node){
  if(!word.length){
    return;
  }

  let char = word.charAt(0);
  if(root.childNodes && root.childNodes[char]){
    if(word.length === 1 && !root.childNodes[char].matchingID.includes(id)){
      root.childNodes[char].matchingID.push(id);
    } else{
      insertWord(word.slice(1, word.length), id, root.childNodes[char]);
    }
  }
  else {
    let newNode: Node = {letter: char, childNodes: {}, matchingID: []}
    root.childNodes[char] = newNode;
    if(word.length === 1){
      newNode.matchingID.push(id);
    } else {
      insertWord(word.slice(1, word.length), id, newNode)
    }
  }
}

export function search(word: string, root: Node, result: string[]){
  let char = word.charAt(0);
  if(root.childNodes[char]){
    if(word.length === 1){
      root.childNodes[char].matchingID.forEach( id => result.push(id))
    } else {
      search(word.slice(1, word.length), root.childNodes[char], result);
    }
  }
  return result;
}


export function toLowerCaseLetters(str: string) {
  let result: string = "";
  for(let i = 0; i < str.length; i++){
    let char = str.charAt(i);
    if(/[a-z]/.test(char)){
      result += char;
    } else if(/[A-Z]/.test(char)){
      result += char.toLowerCase();
    }
  }
  return result;
}
