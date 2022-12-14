const process = require("process");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { DownloaderHelper } = require("node-downloader-helper");

(async () => {
  process.stdout.write("\r Opening Browser.");
  const browser = await puppeteer.launch({
    headless: true,
  }); // default is true, keep it that way unless you want to see what the browser is doing yourself
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);

  page.setViewport({
    width: 1366,
    height: 768,
  });
  //visit url
  process.stdout.write("\r Visiting Website..");
  await page.goto("https://asia-en.onepiece-cardgame.com/cardlist/?series=");

  process.stdout.write("\r Loading All Cards...");
  page.waitForSelector(".resultCol"); //waits for div holder with all cards to load

  //get cards
  const obj = await page.evaluate(() => {
    //Split text of Color and Type into an array
    const SplitTextIntoArr = (card, elClass) => {
      let colorArr = [];
      card
        .querySelector(elClass)
        .innerHTML.split(">")[2]
        .split("/")
        .forEach((item) => {
          colorArr.push(item);
        });
      return colorArr;
    };

    //looping through all the cards
    let cardObj = { Cards: [{}] };
    document.querySelectorAll(".modalCol").forEach((card, i) => {
      //need for image saving purposes
      let cardImageName = card
        .querySelector("img")
        .getAttribute("src")
        .split("/")[4];

      //writing the json
      cardObj["Cards"][i] = {
        number: card.querySelector(".infoCol span:first-child").textContent,
        rarity: card.querySelector(".infoCol span:nth-child(2)").textContent,
        role: card.querySelector(".infoCol span:last-child").textContent,
        name: card.querySelector(".cardName").textContent,
        cost: card.querySelector(".cost").innerHTML.split(">")[2],
        attribute:
          card.querySelector(".attribute i").textContent == ""
            ? "-"
            : card.querySelector(".attribute i").textContent,
        power: card.querySelector(".power").innerHTML.split(">")[2],
        counter: card.querySelector(".counter").innerHTML.split(">")[2],
        color: card
          .querySelector(".color")
          .innerHTML.split(">")[2]
          .includes("/")
          ? SplitTextIntoArr(card, ".color")
          : card.querySelector(".color").innerHTML.split(">")[2],
        type: card
          .querySelector(".feature")
          .innerHTML.split(">")[2]
          .includes("/")
          ? SplitTextIntoArr(card, ".feature")
          : card.querySelector(".feature").innerHTML.split(">")[2],
        effect: card.querySelector(".text").innerHTML.split(">")[2],
        set: card.querySelector(".getInfo").innerHTML.split(">")[2],
        image_name: cardImageName,
      };
    });
    console.log(cardObj);

    return cardObj;
  });
  //console.log(obj[0]);
  process.stdout.write(`\r Saving to card.json...`);
  const cardData = JSON.stringify(obj);
  fs.writeFileSync("card.json", cardData);

  process.stdout.write(`\r Downloading images to the img folder...`);
  //#########SAVE IMAGES
  const getCardImages = await page.$$eval(".modalOpen img", (allImg) =>
    allImg.map((img) => img.src)
  );

  getCardImages.map((cardImage) => {
    let name = path.basename(cardImage);
    let dl = new DownloaderHelper(cardImage, path.join(__dirname, "/img"), {
      fileName: name,
      override: true,
      timeout: 3500,
      resumeIfFileExists: true,
      removeOnStop: false,
      removeOnFail: false,
    });
    dl.on("end", () => console.log(`${name} saved`));
    dl.on("error", (err) => console.log("Download Failed", err));
    dl.start().catch((err) => console.error(err));
  });

  await browser.close();
})();
