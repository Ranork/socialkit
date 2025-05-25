![SocialKit Logo](logo.png)

# SocialKit - One API to rule them all your social media!

Social kit is a unified API infrastructure for social media built with **nodejs**. Also its a **npm package**.

https://www.npmjs.com/package/socialkit

<br>
<br>

## Available Social Media Clients

1. **[Bluesky](#1-bluesky)**: https://bsky.app/ *(made with @atproto/api)*
2. **[Reddit](#2-reddit)**: https://reddit.com/ *(made with official api/axios)*


## Installation

### Prerequisites
- Make sure you have Node.js and npm installed. [Node.js Installation](https://nodejs.org/)

### Installation Steps
1. Create a new directory
```bash
mkdir socialkit-project
cd socialkit-project
```

2. Install NPM
```bash
npm init -y
```

3. Install package:
```bash
npm install socialkit
```



## 1. Bluesky

### Creating the Bluesky client

First you need to call the client with your account details. Then you need to login.

```js
  import socialkit from 'socialkit'

  const bskyClient = new socialkit.BskyClient('username.bsky.social', 'your-password')
  await bskyClient.login()
```

The client constructor has 3 params:
1. The username
2. The password
3. Debug mode (default: false): It's a switch to open debug console logs.

**Note:** After this the client is ready to use. Do not forget to login first.

### Bluesky Client Methods
| Method                | Description                                                                                 | Parameters                                                                                    |
|-----------------------|---------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `login()`             | Logs in using the provided username and password.                                           | None                                                                                          |
| `getTimeline`         | Fetches a timeline of posts from the authenticated account.                                 | `type` (default: null), `limit` (default: 10), `includeSelf` (default: true)                  |
| `getProfile`          | Fetch detailed profile info for the given handle or the logged-in user.                     | `handle` (Optional)                                                                           |
| `getProfilePosts`     | Get posts from a specific profile or from the logged-in user.                               | `handle` (Optional), `type` (default: 'post'), `limit` (default: 10)                          |
| `getFollows`          | Get a list of users the current user is following.                                          | `handle` (Optional), `limit` (default: 100)                                                   |
| `getFollowers`        | Get a list of users following the current user.                                             | `handle` (Optional), `limit` (default: 100)                                                   |
| `getNonMutualFollows` | Get users you follow but who do NOT follow you back.                                        | `limit` (default: 100)                                                                        |
| `replyToPost`         | Reply to a specific post.                                                                   | `text`, `parentUri`                                                                           |
| `newPost`             | Creates a new post.                                                                         | `text`, `imageUrls` (default: [])                                                             |
| `likePost`            | Like a specific post.                                                                       | `uri`, `cid`                                                                                  |
| `parseFeedItem`       | Clean and normalize a feed item.                                                            | `item`                                                                                        |


**Note:** Handle is the username like "ranork.bsky.app"

<br>

## 2. Reddit

### Creating the Reddit client

First you need to call the client with your account details. Then you need to login.

```js
  import socialkit from 'socialkit'

  const redditClient = new socialkit.RedditClient('client-id', 'client-secret', 'your-username', 'your-password')
  await redditClient.login()
```

The client constructor has 3 params:
1. The client id from your app in reddit apps. (https://www.reddit.com/prefs/apps)
2. The client secret from your app in reddit apps. (https://www.reddit.com/prefs/apps)
3. The username
4. The password
5. Debug mode (default: false): It's a switch to open debug console logs.

**Note:** After this the client is ready to use. Do not forget to login first.

### Reddit Client Methods
| Method                | Description                                                                                     | Parameters                                                                                     |
|-----------------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| `login()`             | Logs in using the provided client credentials and Reddit username/password.                     | None                                                                                           |
| `getHomeFeed`         | Fetches the home feed for the logged-in user.                                                   | `limit` (default: 10), `sort` (default: 'best', options: 'best', 'hot', 'new')                 |
| `getSubredditFeed`    | Fetches posts from a specific subreddit with optional sorting.                                  | `subreddit` (required), `limit` (default: 10), `sort` (default: 'hot', options: 'hot', 'top', 'new', 'controversial') |
| `getUserProfile`      | Fetches the logged-in user's Reddit profile information.                                        | None                                                                                           |
| `parseFeedItem`       | Static method that normalizes and extracts information from a feed item.                | `item` (Reddit API post object)                                                               |



<br>
<br>

## Important Note
Use at your own discretion. Do not spam people with this. We discourage any stalkerware, bulk or automated messaging usage.

## Contact
For any questions or feedback about the project, please contact us through GitHub or emir@akatron.net

## Contributions
If you would like to contribute, please feel free to submit a pull request. We welcome any contributions!

## License
This project is licensed under the GNU General Public License v3.0. See the `LICENSE` file for more information.
