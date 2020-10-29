module.exports = {
  title: "Freighter Documentation",
  url: "https://freighter-docs.netlify.app",
  baseUrl: "/",
  onBrokenLinks: "throw",
  favicon: "./images/logo.png",
  organizationName: "@stellar",
  projectName: "freighterDocs",
  themeConfig: {
    navbar: {
      title: "Freighter Documentation",
      logo: {
        alt: "Freighter Logo",
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
