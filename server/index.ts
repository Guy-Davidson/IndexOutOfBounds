import express from 'express';
import bodyParser = require('body-parser');
import { tempData } from './temp-data';
import { knownData } from './known-data';
import { hugeData } from './huge-data';
import { serverAPIPort, APIPath } from '@fed-exam/config';
import { SearchResult, Answer, Ticket, SORT_DATE, SORT_TITLE, SORT_EMAIL, SORT_DESC, PAGE_SIZE,
  DATE_VERB_AFTER, DATE_VERB_BEFORE, EMAIL_VERB, SEARCH_BY_LABEL_DEFAULT, DID_YOU_MEAN_ID, } from '../client/src/api';
import * as searchTree from './searchTree';
import * as autoCorrect from './autoCorrect';
const fs = require('fs');
const wordlist = require('wordlist-english');
const englishWords = wordlist['english'];
const writeDataJSON = './data1.json';

console.log('starting server', { serverAPIPort, APIPath }); 

const app = express();

//Global veriables:
let db:Ticket[] = [...tempData];
db.push(...(hugeData.slice(0, (hugeData.length) * 0.01)));
let dbBaseLength = db.length;
console.log(`Database is of size: ${db.length}`);

//write sorted tickets list:
let sortedDB: Ticket[] = [...db];
sortedDB.sort((t1: Ticket, t2: Ticket) => t1.id.localeCompare(t2.id));


interface Dictionary<T> {
    [Key: string]: T;
}

let root: searchTree.Node = {letter: 'root', childNodes: {}, matchingID: []};
initSearchTree(db)

let labelDic:Dictionary<string[]> = {};
initLabelDic();

let englishWordsDic:Dictionary<boolean> = {};
initEnglishWordsDic();

let searchResultsDic: Dictionary<string[]> = {};
initSearchResultsDic();

app.use(bodyParser.json());

app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  next();
});

app.patch(APIPath + '/:ticketID', (req, res) => {
  let found = false;
  let newTicket: Ticket = req.body.ticket;
  let ticketID: string = req.params.ticketID;
  db.forEach((t:Ticket, idx: number) => {
     if(t.id.localeCompare(ticketID) === 0){
       found = true;
       newTicket.title ? db[idx].title = newTicket.title : null;
       newTicket.answers.length ? db[idx].answers = newTicket.answers : null;
       (newTicket.isStared !== undefined) ? db[idx].isStared = newTicket.isStared : null;
     }
   })

   if(dbBaseLength <= db.length && found){
     fs.writeFile(writeDataJSON, JSON.stringify(db), (err:any) =>{
        if(err){
       console.log(err)
       res.json({ok:false});
       return;
        }
        res.json({ok:true});
        return;
     })
   } else {
     res.status(404).json({ok:false});
     return;
   }
})

app.get(APIPath, (req, res) => {

  let searchByLabel: string = "";
  let getLabels: boolean = false;
  let superSearch: boolean = false;
  let sortBy: number = 0;
  let date: string = "";
  let dateVerb: string = "";
  let from: string = "";
  let title: string = "";
  let paginatedData: Ticket[] = [];
  let didYouMeanTicket: Ticket = {
    id: DID_YOU_MEAN_ID,
    title: "You should try:",
    content: "",
    creationTime: 0,
    userEmail: "Help Center",
    labels: [],
    answers: [],
  }


  // @ts-ignore
  getLabels = req.query.getLabels || false;

  if(getLabels){
    res.send((Object.keys(labelDic)));
    return;
  }


  // @ts-ignore
  searchByLabel = req.query.searchByLabel || "";
  // @ts-ignore
  sortBy = +req.query.sortBy;
  // @ts-ignore
  date = req.query.date || "";
  // @ts-ignore
  dateVerb = req.query.dateVerb || "";
  // @ts-ignore
  from = req.query.from || "";
  // @ts-ignore
  title = req.query.title || "";
  // @ts-ignore
  superSearch = (req.query.superSearch == 'true');
  // @ts-ignore
  const page: number = req.query.page || 1;

  if(title){
    let splitTitle: string[] = title.split(' ');
    splitTitle.forEach((word: string) => {
      word = searchTree.toLowerCaseLetters(word);
      if(englishWordsDic[word] !== undefined){
        if(searchResultsDic[word]) {
          console.log(`Used known data to find: ${word}`);
          resultsToTickets(paginatedData, sortedDB, searchResultsDic[word], page * PAGE_SIZE)
        } else {
          console.log(`Used search tree to find: ${word}`);
          superSearch ? superFind(paginatedData, word, page) : paginatedData = boringFind(paginatedData, word, dateVerb)
        }
      } else {
        console.log(`Used did you mean to find: ${word}`);
        let didYouMeanResults: string[] = autoCorrect.didYouMean(word);
        if(didYouMeanResults.length){
          editDidYouMeanTicket(didYouMeanResults, didYouMeanTicket);
        }
      }
    });
  } else {
    paginatedData = db;
  }

  //not inplace because of filter()
  paginatedData = findByLabel(paginatedData, searchByLabel)

  paginatedData = specialFilter(paginatedData, dateVerb, date, from);

  //inplace change to paginatedData
  sortData(paginatedData, sortBy);

  addDidYouMeanTicket(paginatedData, didYouMeanTicket);

  res.send(paginatedData.slice(0, page * PAGE_SIZE));
  return;
});

function initSearchTree(db: Ticket[]) {
  let testRoot: searchTree.Node = searchTree.initTree(db);
  if(testRoot){
    root = testRoot;
  }
}

function initLabelDic() {
 db.forEach((t:Ticket) => {
    if(t.labels){
      t.labels.forEach((label:string) => {
        if(labelDic[label]){
          labelDic[label].push(t.id);
        }else {
          labelDic[label] = [t.id];
        }
      });
    }
  });
}

function initSearchResultsDic() {
  knownData.forEach((sr:SearchResult) => {
    let results: string[];
    if(!sr.result.length && englishWordsDic[sr.search] !== undefined){
      searchResultsDic[sr.search] = [];
    } else {
      sr.result.forEach((id: string) => {
        if(searchResultsDic[sr.search]){
          searchResultsDic[sr.search].push(id);
        } else {
          searchResultsDic[sr.search] = [id];
        }
      })
    }
  })
}

function initEnglishWordsDic() {
  englishWords.forEach((word:string) => {
    englishWordsDic[word] = true;
  })
  englishWordsDic['wix'] = true;
  englishWordsDic['corvid'] = true;
}

function superFind(paginatedData: Ticket[], word: string, page: number){
  let searchResults: string[] = [...searchTree.search(word, root, [])];
  searchResultsDic[word] = searchResults;
  let newSearchResult: SearchResult = {search:word, result:searchResults};
  knownData.push(newSearchResult);
  fs.writeFile('./results1.json', JSON.stringify(knownData), (err:any) => {
     if(err){
    console.log(err)
     }
  })

  resultsToTickets(paginatedData, sortedDB, searchResults, page * PAGE_SIZE)
}

function boringFind(paginatedData: Ticket[], word: string, dateVerb:string){
  let filterArr: Ticket[] = [];
  filterArr = db.filter((t) => {
      let cleanData: string[] = [];
      (t.title + ' ' +  t.content).split(' ').forEach((source: string) => {
        cleanData.push(searchTree.toLowerCaseLetters(source))
      });
      return cleanData.includes(searchTree.toLowerCaseLetters(word));
  });

  filterArr.forEach((t1: Ticket) => {
    let isNewTicket = true;
      paginatedData.forEach((t2: Ticket) => {
        if(t1.id === t2.id) {
          isNewTicket = false;
        }
      })
      isNewTicket ? paginatedData.push(t1) : null
    });

    return paginatedData;
  }

function editDidYouMeanTicket(didYouMeanResults: string[], didYouMeanTicket: Ticket){
  didYouMeanResults.forEach((word: string) => {
      if(!didYouMeanTicket.content.includes(word)){
        didYouMeanTicket.content += (word + ', ')
        didYouMeanTicket.creationTime = Date.now();
      }
  })
  return;
}

function addDidYouMeanTicket(paginatedData: Ticket[], didYouMeanTicket: Ticket){
  if(didYouMeanTicket.content.localeCompare("") !== 0){
    didYouMeanTicket.content = didYouMeanTicket.content.slice(0, didYouMeanTicket.content.length - 2);
    paginatedData.unshift(didYouMeanTicket)
  }
}

function findByLabel(paginatedData: Ticket[], searchByLabel: string){
  if(searchByLabel === SEARCH_BY_LABEL_DEFAULT) return paginatedData;


  paginatedData = paginatedData.filter((t: Ticket) => {
    return labelDic[searchByLabel].includes(t.id);
  });


  return paginatedData
}

function specialFilter(paginatedData: Ticket[], dateVerb: string, date: string, from: string){
  if(date){
    if(dateVerb === DATE_VERB_AFTER){
      paginatedData = paginatedData.filter((t: Ticket) => {
        return t.creationTime >= Date.parse(date)
      })
    }else if(dateVerb === DATE_VERB_BEFORE){
      paginatedData = paginatedData.filter((t: Ticket) => {
        return t.creationTime <= Date.parse(date)
      });
    }
  }else if(dateVerb === EMAIL_VERB && from){
    paginatedData = paginatedData.filter((t: Ticket) => {
      return t.userEmail === from;
    });
  }
  return paginatedData;
}

function sortData(paginatedData: Ticket[], sortBy: number){
  if(sortBy === SORT_DATE){
    paginatedData.sort((t1: Ticket, t2: Ticket) => t1.creationTime - t2.creationTime);
  }else if(sortBy === SORT_TITLE){
      paginatedData.sort((t1: Ticket, t2: Ticket) => t1.title.localeCompare(t2.title));
  }else if(sortBy === SORT_EMAIL){
      paginatedData.sort((t1: Ticket, t2: Ticket) => t1.userEmail.localeCompare(t2.userEmail));
  }else if(sortBy === SORT_DATE + SORT_DESC){
      paginatedData.sort((t1: Ticket, t2: Ticket) => t2.creationTime - t1.creationTime);
  }else if(sortBy === SORT_TITLE + SORT_DESC){
      paginatedData.sort((t1: Ticket, t2: Ticket) => t2.title.localeCompare(t1.title));
  }else if(sortBy === SORT_EMAIL + SORT_DESC){
      paginatedData.sort((t1: Ticket, t2: Ticket) => t2.userEmail.localeCompare(t1.userEmail));
  }
}

function resultsToTickets(paginatedData:Ticket[], sortedDB: Ticket[], searchResults: string[], limitResults: number = Infinity){
  if(searchResults.length === 0){
    paginatedData = [];
  }else {
    //binary search id's inside the sorted tickets data:
    searchResults.sort((id1: string, id2: string) => id1.localeCompare(id2));
    searchMatchingId(paginatedData, sortedDB, searchResults, limitResults);
  }
}

//global searching info object:
let leftAndRight = {l:0, r:Infinity};

function searchMatchingId(paginatedData:Ticket[], sortedDB: Ticket[], searchResults: string[], limitResults: number) {
  leftAndRight = {l:0, r:sortedDB.length - 1};
  searchResults.forEach((id: string) => {
    let foundTicket: Ticket = binarySearch(sortedDB, id, leftAndRight.l, leftAndRight.r);
    if(!paginatedData.includes(foundTicket)){
      paginatedData.push(foundTicket);
      limitResults--;
      if(limitResults <= 0){
        return;
      }
    }
  })
}

function binarySearch (sortedDB: Ticket[], id: string, l:number, r:number):Ticket {
  if (r < l){
    console.log('unexpected error in super search!')
  }

  let m = Math.floor((l + r) / 2);
  if(sortedDB[m].id.localeCompare(id) === 0){
    leftAndRight.l = m + 1;
    return sortedDB[m];
  }
  if(sortedDB[m].id.localeCompare(id) === -1){
    return binarySearch(sortedDB, id, m + 1, r)
  } else {
    return binarySearch(sortedDB, id, l, m - 1)
  }
}

app.listen(serverAPIPort);
console.log('server running', serverAPIPort)
