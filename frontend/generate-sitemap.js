const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

const links = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/about', changefreq: 'weekly', priority: 0.8 },
  { url: '/contact', changefreq: 'monthly', priority: 0.7 },
  // Add more URLs as needed
];

const generateSitemap = async () => {
  const stream = new SitemapStream({ hostname: 'https://wecinema.co' });
  const writeStream = createWriteStream('src/assets/public/sitemap.xml');

  streamToPromise(links.map(link => stream.write(link)))
    .then(() => stream.end())
    .then(() => {
      console.log('Sitemap created successfully!');
    });

  stream.pipe(writeStream);
};

generateSitemap();
