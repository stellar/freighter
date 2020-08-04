module.exports = {
  title: "Lyra Documentation",
  url: "https://lyradocs.netlify.com",
  baseUrl: "/",
  onBrokenLinks: "throw",
  favicon: "img/favicon.ico",
  organizationName: "@stellar", // Usually your GitHub org/user name.
  projectName: "lyraDocs", // Usually your repo name.
  themeConfig: {
    navbar: {
      title: "Lyra Documentation",
      logo: {
        alt: "Lyra Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          href: "https://github.com/@stellar/lyra/docs",
          label: "GitHub",
          position: "left",
        },
      ],
    },
  },
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          // It is recommended to set document id as docs home page (`docs/` path).
          homePageId: "docs/gettingStarted",
          sidebarPath: require.resolve("./sidebars.js"),
          // Please change this to your repo.
          editUrl: "https://github.com/stellar/lyra/docs/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
