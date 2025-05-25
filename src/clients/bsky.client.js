import { AtpAgent } from '@atproto/api'



export default class BskyClient {

  /**
   * Creates a new instance of BskyClient.
   * @param {string} username The username of the account to log in to.
   * @param {string} password The password of the account to log in to.
   * @constructor
  */
  constructor(username, password, debug = false) {
    this.username = username;
    this.password = password;
    this.agent = new AtpAgent({ service: 'https://bsky.social' });

    this.debug = debug
  }

  /**
   * Logs in to the Bsky account associated with this client.
   * @throws If the login fails for any reason (e.g. bad username/password).
   */
  async login() {
    await this.agent.login({ identifier: this.username, password: this.password })
    if (this.debug) console.log(`Logged in as ${this.username}`)
  }

  
  //-- Reads
  
  //* Posts

  /**
   * Fetches a timeline of posts from the authenticated account.
   * @param {string} [type=null] - If specified, only posts of this type will be returned.
   * @param {number} [limit=10] - The maximum number of posts to return.
   * @param {boolean} [includeSelf=true] - If false, posts from the authenticated account will be excluded.
   * @returns {object[]} An array of posts.
   */
  async getTimeline(type = null, limit = 10, includeSelf = true) {
    if (!this.agent.session?.did) {
      throw new Error("You must be logged in to use getTimeline()");
    }

    const selfDid = this.agent.session.did;
    let posts = [];
    let cursor = undefined;

    while (posts.length < limit) {
      if (this.debug) console.log(`Fetching timeline page (cursor: ${cursor || '-'})`);

      const { data } = await this.agent.getTimeline({ cursor });
      const feed = data.feed || [];
      cursor = data.cursor;

      for (const item of feed) {
        const parsed = BskyClient.parseFeedItem(item);

        if (
          parsed &&
          (!type || parsed.type === type) &&
          (includeSelf || parsed.root.post.author?.did !== selfDid)
        ) {
          posts.push(parsed);
          if (posts.length >= limit) break;
        }
      }

      if (!cursor || feed.length === 0) break;
    }

    return posts;
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
      if (this.debug) console.log(`Fetching page with cursor ${cursor || '-'} found posts ${posts.length}`);
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

  //* Users

  /**
   * Get profile information for a user.
   * @param {string} handle - (Optional) The handle or DID of the user. Defaults to the logged-in user.
   * @returns {object} Profile information of the user.
   */
  async getProfile(handle) {
    const actor = handle || this.agent.session?.did;
    if (!actor) throw new Error('No handle or logged-in user found.');

    if (this.debug) console.log(`Fetching profile for ${actor}`);

    const { data } = await this.agent.getProfile({ actor });

    return {
      did: data.did,
      handle: data.handle,
      displayName: data.displayName,
      description: data.description,
      avatar: data.avatar,
      banner: data.banner,
      followersCount: data.followersCount,
      followsCount: data.followsCount,
      postsCount: data.postsCount,
      webUrl: `https://bsky.app/profile/${data.handle}`,
    };
  }


  /**
   * Search for users by query string.
   * @param {string} query - The search term (e.g., username, display name).
   * @param {number} limit - Max number of results to return.
   * @returns {object[]} Array of user profiles.
   */
  async searchUsers(query, limit = 10) {
    const { data } = await this.agent.searchActors({ term: query, limit });
      const results = (data.actors || []).map((actor) => ({
      ...actor,
      webUrl: `https://bsky.app/profile/${actor.handle}`,
    }));

    return results;
  }


  /**
   * Get a list of users the current user is following.
   * @param {number} limit - Maximum number of follows to fetch. Defaults to 100.
   * @returns {object[]} List of followed users.
   */
  async getFollows(handle, limit = 100) {
    const actor = handle || this.agent.session?.did;
    if (!actor) throw new Error('No handle or logged-in user found.');

    let follows = [];
    let cursor = undefined;

    while (follows.length < limit) {
      if (this.debug) console.log(`Fetching follows (cursor: ${cursor || '-'})`);

      const { data } = await this.agent.getFollows({
        actor,
        cursor,
      });
      
      for (const follow of data.follows || []) {
        const profile = await this.agent.getProfile({ actor: follow.did });
        follow.followsMe = !!profile.data.viewer?.followedBy;
      }

      follows.push(...(data.follows || []));
      cursor = data.cursor;

      if (!cursor || data.follows?.length === 0) break;
    }

    return follows.slice(0, limit);
  }

  /**
   * Get a list of users following the current user.
   * @param {string} handle - (Optional) The handle or DID of the user. Defaults to logged-in user.
   * @param {number} limit - Maximum number of followers to fetch. Defaults to 100.
   * @returns {object[]} List of followers.
   */
  async getFollowers(handle, limit = 100) {
    const actor = handle || this.agent.session?.did;
    if (!actor) throw new Error('No handle or logged-in user found.');

    let followers = [];
    let cursor = undefined;

    while (followers.length < limit) {
      if (this.debug) console.log(`Fetching followers (cursor: ${cursor || '-'})`);

      const { data } = await this.agent.getFollowers({
        actor,
        cursor,
      });

      for (const follower of data.followers || []) {
        const profile = await this.agent.getProfile({ actor: follower.did });
        follower.iFollow = !!profile.data.viewer?.following;
      }

      followers.push(...(data.followers || []));
      cursor = data.cursor;

      if (!cursor || data.followers?.length === 0) break;
    }

    return followers.slice(0, limit);
  }

  /**
   * Get users you follow but who do NOT follow you back.
   * @param {number} limit - Max number of non-mutuals to return.
   * @returns {object[]} List of one-sided follows (not following you back).
   */
  async getNonMutualFollows(limit = 100) {
    const actor = this.agent.session?.did;
    if (!actor) throw new Error('Not logged in.');

    const nonMutuals = [];
    let cursor = undefined;

    while (nonMutuals.length < limit) {
      if (this.debug) console.log(`Checking follows (cursor: ${cursor || '-'})`);

      const { data } = await this.agent.getFollows({ actor, cursor });
      const follows = data.follows || [];

      if (follows.length === 0) break;
      cursor = data.cursor;

      // Paralel olarak profile bilgilerini al
      const checks = await Promise.all(
        follows.map(async (user) => {
          try {
            const { data: profile } = await this.agent.getProfile({ actor: user.did });
            const followsMe = !!profile.viewer?.followedBy;
            return followsMe ? null : { ...user, followsMe: false };
          } catch (err) {
            if (this.debug) console.warn(`Error fetching profile for ${user.did}`, err);
            return null;
          }
        })
      );

      for (const result of checks) {
        if (result) {
          nonMutuals.push(result);
          if (nonMutuals.length >= limit) break;
        }
      }

      if (!cursor) break; // daha fazla sayfa yoksa çık
    }

    return nonMutuals;
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

  /**
   * Creates a new post.
   * @param {string} text - The content of the post.
   * @param {string[]} [imageUrls] - Optional array of image URLs.
   * @returns {object} Result of the post operation.
   */
  async newPost(text, imageUrls = []) {
    if (!this.agent.session?.did) throw new Error('Not logged in.');

    const postRecord = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
    };

    // Image embed desteği (isteğe bağlı)
    if (imageUrls.length > 0) {
      const embeds = await Promise.all(
        imageUrls.map(async (url) => {
          const { data } = await this.agent.uploadBlob({ encoding: 'image/jpeg', data: await fetch(url).then(r => r.arrayBuffer()) });
          return {
            alt: 'Image',
            image: data.blob,
          };
        })
      );

      postRecord.embed = {
        $type: 'app.bsky.embed.images',
        images: embeds,
      };
    }

    const result = await this.agent.post(postRecord);
    return result;
  }

  /**
   * Likes a specific post.
   * @param {string} uri - The URI of the post to like.
   * @param {string} cid - The CID of the post to like.
   * @returns {object} Result of the like operation.
   */
  async likePost(uri, cid) {
    if (!this.agent.session?.did) throw new Error('Not logged in.');

    const likeRecord = {
      $type: 'app.bsky.feed.like',
      subject: { uri, cid },
      createdAt: new Date().toISOString(),
    };

    const result = await this.agent.post(likeRecord);
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
      cid: post.cid || '',
      url: webUrl,
      replyTo: replyContent,
      images,
      externals,
    };
  }

}