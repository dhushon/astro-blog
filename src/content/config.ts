import { defineCollection, z } from 'astro:content';

const wordpressLoader = () => {
  return {
    name: 'wordpress-loader',
    load: async ({ store, logger }) => {
      const baseUrl = process.env.WORDPRESS_API_URL || 'https://vdatacloud.com';
      const endpoint = `${baseUrl}/wp-json/wp/v2/posts`;
      
      let page = 1;
      let hasMore = true;

      logger.info('Fetching WordPress posts sequentially...');

      while (hasMore) {
        logger.info(`Fetching page ${page}...`);
        
        try {
          const res = await fetch(`${endpoint}?per_page=10&page=${page}`, {
            headers: {
              'User-Agent': 'curl/7.88.1',
              'Accept': 'application/json, text/plain, */*'
            }
          });
          
          if (!res.ok) {
            // WordPress returns 400 when page is out of bounds
            if (res.status === 400) {
              hasMore = false;
              break;
            }
            throw new Error(`Failed to fetch: ${res.statusText}`);
          }
          
          const posts = await res.json();
          
          if (!posts || posts.length === 0) {
            hasMore = false;
            break;
          }

          for (const post of posts) {
            store.set({
              id: post.id.toString(),
              data: {
                title: post.title?.rendered || 'Untitled',
                content: post.content?.rendered || '',
                slug: post.slug,
                date: post.date || new Date().toISOString(),
              }
            });
          }
          
          page++;
        } catch (error) {
          logger.error(`Error fetching WP data: ${error.message}`);
          hasMore = false;
        }
      }

      // Fallback values for empty loops/collection when live server is unreachable or blocked
      if (store.keys().length === 0) {
        logger.warn('No WordPress posts were loaded (likely due to Cloudflare challenge or network issues). Populating with fallback/mock posts for preview.');
        const fallbackPosts = [
          {
            id: 'fallback-1',
            title: 'Welcome to Astro Headless WordPress',
            content: '<p>This is a fallback post displayed because the live WordPress API is currently unreachable or protected by Cloudflare. When deployed to your production environment, make sure your build server\'s IP is whitelisted, or configure your API proxy/key.</p><p>Astro 5 decoupled content layers fetch data smoothly and securely.</p>',
            slug: 'welcome-astro-headless-wordpress',
            date: new Date().toISOString()
          },
          {
            id: 'fallback-2',
            title: 'Optimizing Headless Performance with Astro 5',
            content: '<p>Astro 5 introduces the Content Layer API, making headless sites incredibly fast. It fetches data at build time, meaning no slow database queries on client-side requests.</p>',
            slug: 'optimizing-headless-performance-astro-5',
            date: new Date(Date.now() - 86400000).toISOString()
          }
        ];
        for (const post of fallbackPosts) {
          store.set({
            id: post.id,
            data: {
              title: post.title,
              content: post.content,
              slug: post.slug,
              date: post.date,
            }
          });
        }
      }
    }
  };
};

export const collections = {
  blog: defineCollection({
    loader: wordpressLoader(),
    schema: z.object({
      title: z.string(),
      content: z.string(),
      slug: z.string(),
      date: z.string(),
    })
  })
};
