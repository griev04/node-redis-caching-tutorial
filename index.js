require('dotenv').config();
const express = require('express');
const request = require('superagent');
const PORT = process.env.PORT;

// REDIS setup
const redis = require('redis');
const REDIS_PORT = process.env.REDIS_PORT;
const cache = redis.createClient(REDIS_PORT);

const app = express();

function respond(org, numberOfRepos) {
    return `Organization "${org}" has ${numberOfRepos} public repositories.`;
}

function getNumberOfRepos(req, res, next) {
    const org = req.query.org;
    request.get(`https://api.github.com/orgs/${org}/repos`, function (err, response) {
        if (err) throw err;

        // response.body contains an array of public repositories
        let repoNumber = response.body.length;

        // Redis caching (with or without expire)
        cache.setex(org, 10, repoNumber);

        res.send(respond(org, repoNumber));
    });
};


// middleware cache function
function cachedData(req, res, next) {
    const org = req.query.org;
    cache.get(org, function(err, data) {
        if (err) throw err;

        if (data != null) {
            res.send(respond(org, data));
        } else {
            next();
        }
    });
}


// add middleware function to the handler
app.get('/repos', cachedData, getNumberOfRepos);

app.listen(PORT, function () {
    console.log('app listening on port', PORT);
});