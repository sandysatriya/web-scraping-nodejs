const cheerio = require("cheerio");
const rp = require("request-promise");
const fs = require('fs');

const siteUrl = "https://www.bankmega.com/promolainnya.php";

let allPromoByCategory = {};
let categories = [];

const getPromo = async (subcat = 1, page = 1) => {
    url = `${siteUrl}?subcat=${subcat}&page=${page}`;
    console.log(`request to url ${url}`);

    const options = {
        uri: url,
        transform: function (body) {
            return cheerio.load(body)
        }
    }

    try {
        const $ = await rp(options)

        const totalCategory = $('#subcatpromo').find('img').length;
        const subcatTitle = $('#subcatpromo').find('img')

        if (subcat === 1 && page === 1) {
            for (let index = 0; index < subcatTitle.length; index++) {
                const title = subcatTitle[index]['attribs']['title'];
                categories.push(title);
                allPromoByCategory[title] = [];
            }
        }

        const imagePromo = $('#imgClass');
        if (imagePromo.length > 0) {
            const arrDetailsPromise = [];
            imagePromo.each((i, img) => {
                let optionsDetail = {
                    uri: `https://www.bankmega.com/${img.parent.attribs.href}`,
                    transform: function (body) {
                        return cheerio.load(body);
                    }
                }
                arrDetailsPromise.push(rp(optionsDetail));
            });

            await Promise.all(arrDetailsPromise)
                .then(details => {
                    details.map(detail => {
                        const title = detail(".titleinside h3").text();
                        const area = detail(".area b").text();
                        const periode = detail(".periode b").eq(0).text() + detail(".periode b").eq(1).text();
                        const imgUrl = detail(".keteranganinside img").attr("src");

                        allPromoByCategory[categories[subcat - 1]].push({
                            title,
                            area,
                            periode,
                            imgUrl
                        });

                        // console.log(allPromoByCategory)
                    });
                })
                .catch(errFetchDetail => {
                    console.log({
                        errFetchDetail
                    });
                });

            page++;
            return getPromo(subcat, page);
        } else if (subcat < totalCategory) {
            console.log("==== Next Category ====");
            subcat++;
            return getPromo(subcat, 1);
        } else {
            console.log(allPromoByCategory);
            const dataSaved = JSON.stringify(allPromoByCategory, null, 1);
            fs.writeFile("solution.json", dataSaved, () => {
                console.log("Data Saved to solution.json");
            });
            console.log("*** Scraping is done ***");
        }
    } catch (error) {
        return error;
    }
}


getPromo()
    .then(promos => {
        console.log(promos);
    })
    .catch(err => {
        console.log(err);
    });