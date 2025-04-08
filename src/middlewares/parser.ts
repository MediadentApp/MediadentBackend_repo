import express from 'express';

const parser = express();
parser.use(express.json());
// parser.use(express.urlencoded({ extended: true }));

export default parser;
