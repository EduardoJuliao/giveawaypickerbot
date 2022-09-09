import { TwitterApi } from "twitter-api-v2";
import * as fs from "fs";
import  promptSync  from 'prompt-sync';

const prompt = promptSync();

const tweetId = prompt("What is the tweet id: ");
const tweetHandleToFollow = prompt('What is the twitter account to follow (without @): ');

const rawKeyData = fs.readFileSync("keys.json");
const keyData = JSON.parse(rawKeyData);

const twitterClient = new TwitterApi(keyData.bearer);
const readOnlyClient = twitterClient.readOnly;

let usersThatLikedTweet = [];
let paginationToken;
let userGiveAwayId = 1;

function between(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

console.log(`Getting users that liked tweet '${tweetId}'`);

do {
  let likesInTweet;

  if (paginationToken)
    likesInTweet = await readOnlyClient.v2.get(
      `tweets/${tweetId}/liking_users?pagination_token=${paginationToken}&max_results=100`
    );
  else
    likesInTweet = await readOnlyClient.v2.get(
      `tweets/${tweetId}/liking_users?max_results=100`
    );

  if (likesInTweet.data) {
    const userNames = likesInTweet.data.map((u) => {
      return {
        username: u.username,
        index: userGiveAwayId++,
      };
    });

    usersThatLikedTweet.push(...userNames);
  }

  paginationToken = likesInTweet.meta.next_token;
} while (paginationToken != undefined);

console.log(`Finished getting users that liked tweet '${tweetId}'`);

fs.writeFileSync("./results.json", JSON.stringify(usersThatLikedTweet), {
  encoding: "utf8",
  flag: "w",
});

let winner;

console.log('Searching for winner!');

do {
  const index = between(1, usersThatLikedTweet.length);
  const user = usersThatLikedTweet[index];

  const userMetadata = await readOnlyClient.v1.get(
    `friendships/show.json?source_screen_name=${user.username}&target_screen_name=${tweetHandleToFollow}`
  );

  if (userMetadata.relationship.source.following) winner = user;
} while (winner === undefined);

console.log(winner);
