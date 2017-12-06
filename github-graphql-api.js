"use strict";

const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

const fetch = require('node-fetch');

const API_URL = 'https://api.github.com/graphql';
const API_TOKEN = 'd3e2852dfe86a557d54198ff345361eb33f5bd4f';

module.exports.fetchOnePage = fetchOnePage;
module.exports.fetchAllRepoNames = fetchAllRepoNames;

async function fetchOnePage(queryString, variablesString) {
    return fetch(API_URL, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${API_TOKEN}`
        },
        body: JSON.stringify({ query: queryString, variables: variablesString })
    })
    .then(response => response.json())
    .then(data => data)
    .catch((e) => {
        console.log(e)
    });
}


async function fetchAllRepoNames(owner) {
    const queryString = `query o1($owner: String!, $endCursor: String) {
  organization(login: $owner) {
    repositories(first: 100, after: $endCursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
      edges {
        node {
          name
        }
      }
    }
  }
}
`;

    let numPages = 0;
    let allRepoNames = [];

    let hasNextPage = null;
    let endCursor = null;
    do {
        let variablesObject = { owner: owner, endCursor: endCursor };
        let variablesString = JSON.stringify(variablesObject);
        let data = await fetchOnePage(queryString, variablesString);

        numPages += 1;
        allRepoNames.push(...data.data.organization.repositories.edges);
        let pageInfo = data.data.organization.repositories.pageInfo;
        hasNextPage = pageInfo.hasNextPage;
        endCursor = pageInfo.endCursor;
    } while (hasNextPage);

    allRepoNames = allRepoNames.map((element) => element.node.name);

    return allRepoNames;
}


// TODO: unused: big repos cause too many calls
async function fetchAllPulls(owner, repo) {
    const queryString = `
    query p1 ($owner:String!, $repo:String!, $after:String) {
        repository(owner:$owner, name:$repo) {
        pullRequests (first:100, after:$after) {
          pageInfo {
            hasNextPage
            endCursor
                }
          totalCount
          edges {
            node {
              number
              title
              url
              author {
                login
              }
              createdAt
              updatedAt
              closed
              mergedAt
              timeline(last: 1) {
                totalCount
              }
            }
          }
        }
      }
    }`;

    let numPages = 0;
    let allPulls = [];

    let hasNextPage = null;
    let endCursor = null;
    do {
        let variablesObject = { owner: owner, repo: repo, after: endCursor };
        let variablesString = JSON.stringify(variablesObject);

        let pulls = await fetchOnePage(queryString, variablesString);
        console.log(++numPages);
        console.log(pulls);
        allPulls.push(...pulls.data.repository.pullRequests.edges);

        let pageInfo = pulls.data.repository.pullRequests.pageInfo;
        hasNextPage = pageInfo.hasNextPage;
        endCursor = pageInfo.endCursor;
    } while (hasNextPage);

    return allPulls;
}
