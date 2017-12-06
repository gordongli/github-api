'use strict';

const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

const githubRestApi = require('./github-rest-api');
const githubGraphqlApi = require('./github-graphql-api');


async function main() {

    let owner = 'twitter';
    let resourceTypes = ['commits', 'issues', 'pulls'];
    let trimmed = true;
    let token = 'd3e2852dfe86a557d54198ff345361eb33f5bd4f';

    const ownerDirPath = `./data/${owner}`;
    if (!fs.existsSync(ownerDirPath)){
        fs.mkdirSync(ownerDirPath);
    }

    let promises = [];
    let repos = await githubGraphqlApi.fetchAllRepoNames(owner);
    // let repos = ['pants'];
    for (const repo of repos) {
    // for (const repo of repos) {
        for (const resourceType of resourceTypes) {
            const repoDirPath = `${ownerDirPath}/${repo}`;
            if (!fs.existsSync(repoDirPath)){
                fs.mkdirSync(repoDirPath);
            }
            const resourceFilePath = `./data/${owner}/${repo}/${resourceType}.json`;
            // promises.push(

            // delay API calls by awaiting to avoid API abuse detection
            await
                githubRestApi.fetchRepoResourceList(owner, repo, resourceType, token, trimmed)
                    .then((resourceList) => {
                        return writeFileAsync(resourceFilePath, JSON.stringify(resourceList), {encoding: 'utf8'});
                    })
                    .catch((err) => {
                        console.log(err);
                    })
            // );
        }
    }
    try {
        // await Promise.all(promises);
        // console.log(`Fetched ${resourceTypes} data for ${owner}'s ${repos.length} repos`);
    } catch (err) {
        console.log(err);
    }
}

try {
    main();
}
catch (err) {
    console.log(err);
}
