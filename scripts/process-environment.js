// This script read from node env and updates the environment.prod.ts and index.html before angular cli take part in.

const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const envDict = process.env;
const envFileTemplatePath = path.join(__dirname, '../src/environments/_environment.prod.ts');
const envFilePath = path.join(__dirname, '../src/environments/environment.prod.ts');
const envFileTemplate = fs.readFileSync(envFileTemplatePath, {encoding: 'utf-8'});
console.log('Updating environment.prod.ts');
const compiledEnvFileTemplate = _.template(envFileTemplate);
fs.writeFileSync(envFilePath, compiledEnvFileTemplate(envDict), {encoding: 'utf-8'});

const indexTemplatePath = path.join(__dirname, 'src/_index.html');
const indexTemplate = fs.readFileSync(indexTemplatePath, {encoding: 'utf-8'});
console.log('Updating index.html');
const compiledIndexTemplate = _.template(indexTemplate);
fs.writeFileSync(path.join(__dirname, '../src/index.prod.html'), compiledIndexTemplate(envDict), {encoding: 'utf-8'});

console.log('Prod files generated!');
