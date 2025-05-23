import axios from "axios";
import QueryString from "qs";


export default class RedditClient {
  /**
   * Creates a new instance of RedditClient.
   * @param {string} client_id - The client ID for Reddit API authentication.
   * @param {string} client_secret - The client secret for Reddit API authentication.
   * @param {string} username - The Reddit username for authentication.
   * @param {string} password - The Reddit password for authentication.
   * @param {boolean} [debug=false] - Enables debug mode for logging operations.
   */
  constructor(client_id, client_secret, username, password, debug = false) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.username = username;
    this.password = password;
    this.debug = debug
  }

  /**
   * Logs in to the Reddit account associated with this client.
   * @throws If the login fails for any reason (e.g. bad username/password).
   */
  async login() {
    const auth = Buffer.from(`${this.client_id}:${this.client_secret}`).toString('base64');
    const data = QueryString.stringify({
      grant_type: 'password',
      username: this.username,
      password: this.password,
    });

    const res = await axios.post('https://www.reddit.com/api/v1/access_token', data, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'socialkit/1.1.0 by ' + this.username
      },
    });

    this.token = res.data.access_token;

    // Axios instance oluştur
    this.axios = axios.create({
      baseURL: 'https://oauth.reddit.com/',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'User-Agent': 'socialkit/1.1.0 by ' + this.username
      },
    });

    if (this.debug) console.log(`Logged in as ${this.username}`)

  }


  //-- Reads

  /**
   * Fetches the home feed of the logged-in user.
   * @param {number} [limit=10] - The maximum number of posts to return.
   * @param {string} [sort='best'] - The sort order of the feed. Must be one of 'best', 'hot', or 'new'.
   * @returns {object[]} An array of posts.
   */
  async getHomeFeed(limit = 10, sort = 'best') {
    if (!['best', 'hot', 'new'].includes(sort)) throw new Error('Invalid sort, available values: best, hot, new');

    const res = await this.axios.get(`/${sort}?limit=${limit}`);
    return res.data.data.children.map(r => RedditClient.parseFeedItem(r));
  }

  /**
   * Fetches the feed of a given subreddit.
   * @param {string} subreddit - The name of the subreddit to fetch.
   * @param {number} [limit=10] - The maximum number of posts to return.
   * @param {string} [sort='hot'] - The sort order of the feed. Must be one of 'top', 'hot', 'new', or 'controversial'.
   * @returns {object[]} An array of posts.
   */
  async getSubredditFeed(subreddit, limit = 10, sort='hot') {
    if (!['top', 'hot', 'new', 'controversial'].includes(sort)) throw new Error('Invalid sort, available values: top, hot, new, controversial');

    const res = await this.axios.get(`/r/${subreddit}/hot?limit=${limit}`);
    return res.data.data.children.map(r => RedditClient.parseFeedItem(r));
  }

  /**
   * Fetches the profile information of the logged-in Reddit user.
   * @returns {object} An object containing user profile details such as:
   * - `id`: The unique identifier of the user.
   * - `name`: The username.
   * - `title`: The title of the user's subreddit.
   * - `description`: The public description of the user's subreddit.
   * - `commentKarma`: The user's comment karma score.
   * - `postKarma`: The user's post karma score.
   * - `karma`: The total karma score.
   * - `createdAt`: The date when the user account was created.
   * - `dayAge`: The age of the account in days.
   * - `isGold`: A boolean indicating if the user is a Reddit Gold member.
   * - `verified`: A boolean indicating if the user is verified.
   * - `icon`: The URL of the user's icon image.
   * - `banner`: The URL of the user's subreddit banner image.
   * - `url`: The URL to the user's subreddit.
   */

  async getUserProfile() {
    const res = await this.axios.get('/api/v1/me');
    const data = res.data
    return {
      id: data.id,
      name: data.name,
      title: data.subreddit.title,
      description: data.subreddit.public_description,
      commentKarma: data.comment_karma,
      postKarma: data.link_karma,
      karma: data.total_karma,
      createdAt: new Date(data.created_utc * 1000),
      dayAge: Math.floor((Date.now() - new Date(data.created_utc * 1000).getTime()) / (1000 * 60 * 60 * 24)),
      isGold: data.is_gold,
      verified: data.verified,
      icon: data.icon_img,
      banner: data.subreddit.banner_img,
      url: "https://reddit.com" + data.subreddit.url
    };
  }


  //-- Utils

  /**
   * Parses a Reddit feed item and extracts relevant post information.
   * @param {object} item - A Reddit feed item containing post data.
   * @returns {object} An object containing parsed post details, including:
   * - `id`: The unique identifier of the post.
   * - `url`: The URL of the post.
   * - `subreddit`: The name of the subreddit where the post was made.
   * - `subredditId`: The unique identifier of the subreddit.
   * - `author`: The username of the post author.
   * - `authorId`: The unique identifier of the author.
   * - `title`: The title of the post.
   * - `text`: The body text of the post.
   * - `comments`: The number of comments on the post.
   * - `upvotes`: The number of upvotes the post received.
   * - `downvotes`: The number of downvotes the post received.
   * - `score`: The overall score of the post.
   * - `createdAt`: The date and time when the post was created.
   */
  static parseFeedItem(item) {
    let post = item.data;

    return {
      id: post.name,
      url: post.url,

      subreddit: post.subreddit,
      subredditId: post.subreddit_id,

      author: post.author,
      authorId: post.author_fullname,

      title: post.title,
      text: post.selftext,
      comments: post.num_comments,
      upvotes: post.ups,
      downvotes: post.downs,
      score: post.score,

      createdAt: new Date(post.created_utc * 1000),
    }
  }

}