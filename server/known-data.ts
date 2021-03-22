import {SearchResult} from '../client/src/api';

const data = require('./results.json');

export const knownData = data as SearchResult[];
