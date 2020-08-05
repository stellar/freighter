module.exports = {
  title: "Lyra Documentation",
  url: "https://lyra-docs.netlify.app",
  baseUrl: "/",
  onBrokenLinks: "throw",
  favicon: "./images/logo.png",
  organizationName: "@stellar", // Usually your GitHub org/user name.
  projectName: "lyraDocs", // Usually your repo name.
  themeConfig: {
    navbar: {
      title: "Lyra Documentation",
      logo: {
        alt: "Lyra Logo",
        src: "./images/logo.png",
      },
      items: [
        {
          href: "https://github.com/stellar/lyra/tree/master/docs",
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
          editUrl: "https://github.com/stellar/lyra/tree/master/docs/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      },
    ],
  ],
};
