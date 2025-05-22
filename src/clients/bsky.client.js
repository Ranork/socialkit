import { AtpAgent } from '@atproto/api'



export default class BskyClient {

  /**
   * Creates a new instance of BskyClient.
   * @param {string} username The username of the account to log in to.
   * @param {string} password The password of the account to log in to.
   * @param {string} service The URL of the Bluesky service to use. Defaults to 'https://bsky.social'.
   * @constructor
  */
  constructor(username, password, service = 'https://bsky.social') {
    this.username = username;
    this.password = password;
    this.service = service;
    this.agent = new AtpAgent({ service })
  }

  async login() {
    await this.agent.login({ identifier: this.username, password: this.password })
  }

  
  //-- Reads

  async getTimeline(type) {
    const { data } = await this.agent.getTimeline();
    const feed = data.feed || [];
    
    const cleaned = [];
    for (const item of feed) {
      const parsed = BskyClient.parseFeedItem(item);
      if (parsed) cleaned.push(parsed);
    }

    return cleaned;
  }

  /**
   * Get posts from a specific profile or from the logged-in user.
   * @param {string} handle - (Optional) The handle (username) of the profile to fetch posts from.
   * @param {string} type - (Optional) The type of posts to fetch. Defaults to 'post'.
   * @param {number} limit - (Optional) The maximum number of posts to fetch. Defaults to 10.
   * @returns {object[]} An array of posts.
  */
  async getProfilePosts(handle, type = 'post', limit = 10) {
  const actor = handle || this.agent.session?.did;
  if (!actor) throw new Error('No handle or logged-in user found.');

  let posts = [];
  let cursor = undefined;

  while (posts.length < limit) {
    const { data } = await this.agent.getAuthorFeed({
      actor,
      cursor,
    });

    const feed = data.feed || [];
    cursor = data.cursor;

    // parse + filtrele
    for (const item of feed) {
      const parsed = BskyClient.parseFeedItem(item);
      if (parsed && parsed.type === type) {
        posts.push(parsed);
        if (posts.length >= limit) break;
      }
    }

    // Eğer daha fazla sayfa yoksa çık
    if (!cursor || feed.length === 0) break;
  }

  return posts;
}


  //-- Events

  /**
   * Reply to a specific post.
   * @param {string} text The reply text to send.
   * @param {string} parentUri The URI of the post being replied to.
  */
  async replyToPost(text, parentUri) {
    // Önce reply atacağımız postun cid'sini öğrenmemiz gerekiyor
    const { data } = await this.agent.getPostThread({ uri: parentUri });
    const parent = data.thread?.post;

    if (!parent) { throw new Error('Parent post not found'); }

    const replyRecord = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
      reply: {
        root: {
          cid: parent.cid,
          uri: parent.uri,
        },
        parent: {
          cid: parent.cid,
          uri: parent.uri,
        },
      },
    };

    const result = await this.agent.post(replyRecord);
    return result;
  }


  //-- Utils 

  /**
   * Clean and normalize a feed item.
   * @param {object} item - A single item from a Bluesky feed.
   * @returns {object|null} - Cleaned post object, or null if invalid.
  */
  static parseFeedItem(item) {
    const post = item.post;
    if (!post) return null;

    const replyPost = item.reply?.parent;

    let type = 'post';
    if (item.reason?.$type === 'app.bsky.feed.defs#reasonRepost') {
      type = 'repost';
    } else if (post?.record?.reply?.parent) {
      type = 'reply';
    } else if (
      post?.embed?.$type === 'app.bsky.embed.record#view' ||
      post?.embed?.$type === 'app.bsky.embed.recordWithMedia#view'
    ) {
      type = 'quote';
    }

    const replyContent = replyPost
      ? {
          handle: replyPost.author?.handle || '',
          displayName: replyPost.author?.displayName || '',
          text: replyPost.record?.text || '',
          createdAt: replyPost.record?.createdAt || '',
          uri: replyPost.uri || '',
        }
      : null;

    let embed = post.embed;
    let images = [];
    let externals = [];

    if (embed?.$type === 'app.bsky.embed.images#view') {
      images = embed.images || [];
    } else if (embed?.$type === 'app.bsky.embed.external#view') {
      externals.push(embed.external?.uri);
    } else if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
      const media = embed.media;
      if (media?.$type === 'app.bsky.embed.images#view') {
        images = media.images || [];
      }
      if (media?.$type === 'app.bsky.embed.external#view') {
        externals.push(media.external?.uri);
      }
    }

    const uri = post.uri || '';
    const rkey = uri.split('/').pop();
    const handle = post.author?.handle || '';
    const createdAt = post.record?.createdAt || '';
    const webUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

    return {
      root: item,
      type,
      handle,
      displayName: post.author?.displayName || '',
      avatar: post.author?.avatar || '',
      text: post.record?.text || '',
      createdAt,
      date: createdAt ? new Date(createdAt) : null,
      uri: post.uri || '',
      url: webUrl,
      replyTo: replyContent,
      images,
      externals,
    };
  }

}