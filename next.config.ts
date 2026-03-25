import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:locale(en|es|zh|pt|ru|fr|de|ja|ko|it|hi|id|th|vi|tr|tl|pl|nl|sv|cs|ar|uk|he|ro|el|hu|fi|da|ms|bn|no|sk|sr|hr|bg|fa|ur|lt|af|ca)',
        destination: '/',
        permanent: true,
      },
      {
        source: '/:locale(en|es|zh|pt|ru|fr|de|ja|ko|it|hi|id|th|vi|tr|tl|pl|nl|sv|cs|ar|uk|he|ro|el|hu|fi|da|ms|bn|no|sk|sr|hr|bg|fa|ur|lt|af|ca)/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
