'use strict';

const fetch = require('node-fetch');
const queryString = require('querystring');
const parseLinkHeader = require('parse-link-header');

module.exports.fetchRepoResourceList = fetchRepoResourceList;
module.exports.trimmedRepoResource = trimmedRepoResource;

async function fetchRepoResourceList(owner, repo, resourceType, token, trimmed) {
    const GITHUB_API_URL = 'https://api.github.com';
    const headers = {'Authorization': 'token ' + token};

    const params = {'per_page': 100};
    if (resourceType === 'issues' || resourceType === 'pulls') {
        params['state'] = 'all'
    }
    const resourceList = [];
    let links = null;
    do {
        let fullUrl = links ? links['next']['url'] :
            `${GITHUB_API_URL}/repos/${owner}/${repo}/${resourceType}?${queryString.encode(params)}`;
        console.log(fullUrl);
        let response = await fetch(fullUrl, {method: 'get', headers});

        if (response.status === 200) {
            let resourceSublist = await response.json();
            if (resourceSublist && resourceSublist.length > 0) {
                if (resourceType === 'issues') {
                    resourceSublist = resourceSublist.filter((issue) => !issue.pull_request)
                }
                if (trimmed) {
                    resourceSublist = resourceSublist.map((resource) => trimmedRepoResource(resourceType, resource))
                }
                resourceList.push(...resourceSublist);
            }
            // if (resourceType === 'issues') {
            //     resourceSublist = resourceSublist.filter((issue) => !issue.pull_request)
            // }
            // if (trimmed) {
            //     resourceSublist = resourceSublist.map((resource) => trimmedRepoResource(resourceType, resource))
            // }
            // resourceList.push(...resourceSublist);
            links = response.headers._headers.link ? parseLinkHeader(response.headers._headers.link[0]) : {};
            // console.log(links);
        } else {
            let error = await response.json();
            throw new Error(JSON.stringify(error));
        }
    } while (links.next);

    console.info(`Fetched all ${resourceList.length} ${owner}/${repo} ${resourceType}`);
    return resourceList;
}

function trimmedRepoResource(resourceType, resource) {
    let t = null; // trimmed object
    const o = resource; // original object

    if (resourceType === 'commits') {
        // const {sha, commit: {author, committer, message}, html_url} = o;
        const {sha, commit: {author, message}, html_url} = o;
        const title = message.split(/\n+/)[0]
        t = {
                sha,
                // commit: { author, committer, title },
                commit: { author, title },
                html_url
        };

        if (o.author) {
            t.author = {
                login: o.author.login,
                html_url: o.author.html_url
            };
        }

        // for (const person of ['author', 'committer']) {
        // for (const person of ['author']) {
        //     if (o[person]) {
        //         t[person] = {}
        //         for (const field of ['login', 'html_url']) {
        //             t[person][field] = o[person][field];
        //         }
        //     }
        // }

        // ALTERNATE COMMITS FORMAT TO AVOID NESTING
        // const {sha, commit: {author, committer, message}, html_url} = o;
        // t = {sha, title: message.split("\n")[0], html_url, author, committer};
        // for (const person of ['author', 'committer']) {
        //     if (o[person]) {
        //         for (const field of ['login', 'html_url']) {
        //             t[person][field] = o[person][field];
        //         }
        //     }
        // }
    }

    if (resourceType === 'issues' || resourceType === 'pulls') {
        const { html_url, number, title, state, created_at, updated_at, closed_at } = o;
        t = { html_url, number, title, state, created_at, updated_at, closed_at };

        if (resourceType === 'issues') {
            t.comments = o.comments;
        }
        if (resourceType === 'pulls') {
            t.merged_at = o.merged_at;
            // t.period_to_merge = o.merged_at ? Date.parse(o.merged_at) - Date.parse(o.created_at) : null;
        }
        // t.period_to_close = o.closed_at ? Date.parse(o.closed_at) - Date.parse(o.created_at) : null;
        // t.period_to_close = o.closed_at ?
        //     Date.parse(o.closed_at) - Date.parse(o.created_at) :
        //     Date.now() - Date.parse(o.created_at);

        if (o.user) {
            t.user = { login: o.user.login, html_url: o.user.html_url };
        }
    }

    return t ? t : o; // if didn't trim, return original
}