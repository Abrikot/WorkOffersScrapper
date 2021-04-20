const fs = require('fs');

const ignoredCompaniesFile = 'ignoredCompanies.json';
const maxOffersPerCompany = 10;

function getIgnoredCompanies() {
    const ignoredCompanies = JSON.parse(fs.readFileSync(ignoredCompaniesFile, 'utf-8') || '[]');
    return ignoredCompanies;
}

function writeIgnoredCompanies(ignoredCompanies) {
    fs.writeFileSync(ignoredCompaniesFile, JSON.stringify(ignoredCompanies, null, 2));
}

function groupBy (xs, key) {
    return xs.reduce(function (rv, x) {
        (rv[x[key].toLowerCase()] = rv[x[key].toLowerCase()] || []).push(x);
        return rv;
    }, {});
};

async function getAllOffers(website, query) {
    const offers = [];

    let startIndex = 0;
    let totalNumber;
    do {
        const data = await website.getChunkOfData(query, startIndex);
        if (totalNumber === undefined) {
            totalNumber = website.getTotalNumberOfOffers(data);
        }
        const newOffers = website.getOffersInChunk(data);
        offers.push(...newOffers);
        startIndex += newOffers.length;
        console.log(startIndex, 'of', totalNumber);
    } while (startIndex < totalNumber)

    return offers;
}

function filterOffers(website, offers) {
    const groupedOffers = groupBy(offers, 'firm');
    const ignoredCompanies = getIgnoredCompanies();
    for (const [firm, offers] of Object.entries(groupedOffers)) {
        if (offers.length >= maxOffersPerCompany && !ignoredCompanies.includes(firm.toLowerCase())) {
            ignoredCompanies.push(firm.toLowerCase());
        }
    }
    writeIgnoredCompanies(ignoredCompanies);

    const ignoredOffers = offers.filter(offer => !ignoredCompanies.includes(offer.firm.toLowerCase()));

    const specificFilter = website.filterOffers || (offers => offers);
    return specificFilter(ignoredOffers);
}

async function getFilteredOffers(website, query) {
    const offers = await getAllOffers(website, query);
    const formattedOffers = offers.map(website.formatOffer);
    const filteredOffers = filterOffers(website, formattedOffers);
    const offersCount = filteredOffers.length;
    console.log(`Found ${offersCount} offers`);

    return filteredOffers;
}

exports.getIgnoredCompanies = getIgnoredCompanies;
exports.writeIgnoredCompanies = writeIgnoredCompanies;
exports.groupBy = groupBy;
exports.getFilteredOffers = getFilteredOffers;